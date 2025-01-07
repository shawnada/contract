"use client";

import { useEffect, useRef } from "react";
import { updateDoc, getDoc } from "./action";
import { useEditorContext } from "./editor-context";

interface OnlyOfficeEditorProps {
  id: string;
  content: string;
  version: number;
}

export default function OnlyOfficeEditor({
  id,
  content,
  version,
}: OnlyOfficeEditorProps) {
  const { editorRef } = useEditorContext();
  const isCreatingRef = useRef(false);
  const connectorRef = useRef<any>(null);

  useEffect(() => {
    async function initEditor() {
      console.log("Starting editor initialization...");

      // 等待 DocsAPI 加载
      const waitForDocsAPI = async (retries = 0, maxRetries = 10) => {
        if (retries >= maxRetries) {
          throw new Error("DocsAPI failed to load");
        }

        if (typeof (window as any).DocsAPI === "undefined") {
          console.log(
            `Waiting for DocsAPI (attempt ${retries + 1}/${maxRetries})...`,
          );
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return waitForDocsAPI(retries + 1, maxRetries);
        }

        return true;
      };

      try {
        await waitForDocsAPI();
        console.log("DocsAPI loaded successfully");

        const latestDoc = await getDoc(id);
        const latestVersion = latestDoc?.version || version;

        let documentUrl = content;

        if (!content && !isCreatingRef.current) {
          isCreatingRef.current = true;

          const response = await fetch(`/api/documents/create?id=${id}`, {
            method: "POST",
          });

          if (!response.ok) {
            throw new Error("Failed to create document");
          }

          const data = await response.json();
          console.log("Created document:", data);
          documentUrl = data.url;

          await updateDoc(id, { content: documentUrl });
        }

        if (documentUrl) {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

          if (!baseUrl) {
            throw new Error("NEXT_PUBLIC_APP_URL is not configured");
          }

          const config = {
            document: {
              fileType: "docx",
              key: `${id}_${latestVersion}`,
              title: "Document.docx",
              url: documentUrl.startsWith("http")
                ? documentUrl
                : `${baseUrl}${documentUrl}`,
              permissions: {
                download: true,
                edit: true,
                review: true,
                print: true,
                comment: true,
                modifyFilter: true,
                modifyContentControl: true,
                fillForms: true,
                copy: true,
              },
            },
            documentType: "word",
            editorConfig: {
              callbackUrl: `${baseUrl}/api/callback?docId=${id}`,
              lang: "zh-CN",
              mode: "edit",
              user: {
                id: "1",
                name: "User",
              },
              customization: {
                autosave: false,
                forcesave: true,
                chat: false,
                comments: false,
                compactToolbar: false,
                feedback: false,
                help: false,
                toolbarNoTabs: true,
                hideRightMenu: true,
                hideNotes: true,
                customer: {
                  name: "",
                  logo: "",
                  logoDark: "",
                  mail: "",
                  www: "",
                  info: "",
                },
                logo: {
                  visible: false,
                },
                loaderLogo: "",
                toolbarHideFileName: true,
                features: {
                  spellcheck: false,
                },
              },
              coEditing: {
                mode: "fast",
                fastEditing: true,
              },
            },
            events: {
              onAppReady: () => {
                console.log("OnlyOffice editor is ready");
                try {
                  if (editorRef.current) {
                    connectorRef.current = editorRef.current.createConnector();
                    console.log("Connector created:", connectorRef.current);

                    editorRef.current.connector = connectorRef.current;
                    editorRef.current.callCommand = function (
                      command,
                      callback,
                    ) {
                      if (!connectorRef.current) {
                        console.error("Connector not initialized");
                        return;
                      }
                      return connectorRef.current.callCommand(
                        command,
                        callback,
                      );
                    };

                    console.log("Editor methods after setup:", {
                      hasConnector: !!editorRef.current.connector,
                      hasCallCommand: !!editorRef.current.callCommand,
                      methods: Object.keys(editorRef.current),
                    });
                  }
                } catch (error) {
                  console.error("Error initializing connector:", error);
                }
              },
              onDocumentReady: async () => {
                console.log("Document is ready");
                if (connectorRef.current) {
                  try {
                    // 1. 获取数据库中的批注
                    const response = await fetch(
                      `/api/comments?documentId=${id}`,
                    );
                    if (!response.ok) {
                      throw new Error("Failed to fetch comments");
                    }
                    const dbComments = await response.json();

                    // 2. 使用 executeMethod 获取文档中的所有批注
                    editorRef.current.connector.executeMethod(
                      "GetAllComments",
                      [],
                      async (docComments: any[]) => {
                        // 详细打印文档批注结构
                        console.log(
                          "Document comments full structure:",
                          docComments?.map((c) => ({
                            id: c.Id,
                            data:
                              typeof c.Data === "object"
                                ? JSON.stringify(c.Data)
                                : c.Data,
                            text: c.Text,
                            quote: c.QuoteText,
                            allProps: Object.keys(c),
                            fullData: c,
                          })),
                        );

                        // 3. 遍历数据库批注，根据内容匹配文档批注
                        for (const dbComment of dbComments) {
                          const matchingDocComment = docComments?.find(
                            (docComment) => {
                              try {
                                // 解析 Data 对象
                                const data =
                                  typeof docComment.Data === "object"
                                    ? docComment.Data
                                    : JSON.parse(docComment.Data);

                                // 获取批注文本内容
                                const commentText = data.Text || "";

                                // 检查批注内容是否匹配
                                return commentText.includes(dbComment.content);
                              } catch (error) {
                                console.error(
                                  "Error parsing comment data:",
                                  error,
                                );
                                return false;
                              }
                            },
                          );

                          if (matchingDocComment) {
                            // 4. 更新数据库中的 documentCommentId
                            try {
                              const updateResponse = await fetch(
                                `/api/comments/${dbComment.id}`,
                                {
                                  method: "PATCH",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    documentCommentId: matchingDocComment.Id,
                                    isLocated: true,
                                  }),
                                },
                              );

                              if (updateResponse.ok) {
                                console.log("Updated comment mapping:", {
                                  dbComment,
                                  matchingDocComment,
                                  dbCommentId: dbComment.id,
                                  newDocumentCommentId: matchingDocComment.Id,
                                });
                              }
                            } catch (error) {
                              console.error(
                                "Failed to update comment mapping:",
                                error,
                              );
                            }
                          } else {
                            // 如果找不到匹配的文档批注，标记为未定位
                            await fetch(`/api/comments/${dbComment.id}`, {
                              method: "PATCH",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                documentCommentId: null,
                                isLocated: false,
                              }),
                            });
                          }
                        }
                      },
                    );
                  } catch (error) {
                    console.error("Error in document ready handler:", error);
                  }
                }
              },
              onDocumentStateChange: async (event: any) => {
                console.log("Document state changed:", event);
                if (event.type === "save") {
                  const updatedDoc = await getDoc(id);
                  if (updatedDoc && updatedDoc.version !== latestVersion) {
                    window.location.reload();
                  }
                }
              },
              onError: (event: any) => {
                console.error("OnlyOffice error:", event);
              },
            },
            height: "100%",
            width: "100%",
            type: "desktop",
            token: `${id}_${latestVersion}`,
          };

          console.log("Initializing editor with config:", config);

          if (editorRef.current) {
            editorRef.current.destroyEditor();
          }

          const editor = new (window as any).DocsAPI.DocEditor(
            "onlyoffice-editor",
            config,
          );

          // 等待编辑器实例准备就绪
          await new Promise<void>((resolve) => {
            const checkReady = () => {
              if (editor && typeof editor.destroyEditor === "function") {
                console.log("Editor instance is ready");
                resolve();
              } else {
                console.log("Waiting for editor to be ready...");
                setTimeout(checkReady, 500);
              }
            };
            checkReady();
          });

          console.log("Editor instance created:", editor);
          editorRef.current = editor;
          console.log("Editor instance set to ref:", editorRef.current);
        }
      } catch (error) {
        console.error("Error initializing editor:", error);
      }
    }

    initEditor();

    return () => {
      if (editorRef.current) {
        if (connectorRef.current) {
          connectorRef.current = null;
        }
        console.log("Cleaning up editor instance");
        editorRef.current.destroyEditor();
        editorRef.current = null;
      }
    };
  }, [id, content, version]);

  return (
    <div
      id="onlyoffice-editor"
      className="h-full w-full border border-[#e5e7eb] rounded-md overflow-hidden"
    />
  );
}
