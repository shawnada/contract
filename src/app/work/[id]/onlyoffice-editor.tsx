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
                console.log(
                  "Document is ready, starting comment mapping process...",
                );

                try {
                  // 定义等待编辑器初始化的函数
                  const waitForEditor = async (
                    retries = 0,
                    maxRetries = 10,
                    delay = 1000,
                  ): Promise<boolean> => {
                    if (editorRef.current?.connector) {
                      console.log("Editor and connector are ready");
                      return true;
                    }

                    if (retries >= maxRetries) {
                      console.log(
                        `Editor not ready after ${maxRetries} attempts`,
                        {
                          hasEditor: !!editorRef.current,
                          hasConnector: !!editorRef.current?.connector,
                        },
                      );
                      return false;
                    }

                    console.log(
                      `Waiting for editor initialization (${retries + 1}/${maxRetries})`,
                    );
                    await new Promise((resolve) => setTimeout(resolve, delay));
                    return waitForEditor(retries + 1, maxRetries, delay);
                  };

                  // 等待编辑器初始化
                  const isEditorReady = await waitForEditor();
                  if (!isEditorReady) {
                    throw new Error(
                      "Editor failed to initialize after retries",
                    );
                  }

                  let mappedCount = 0;

                  // 获取数据库批注
                  console.log("Fetching database comments...");
                  const response = await fetch(
                    `/api/comments?documentId=${id}`,
                  );
                  if (!response.ok) {
                    throw new Error("Failed to fetch comments");
                  }
                  const dbComments = await response.json();
                  console.log("Database comments:", {
                    count: dbComments.length,
                    comments: dbComments,
                  });

                  // 定义获取批注的函数
                  const tryGetComments = async () => {
                    try {
                      if (!editorRef.current?.connector) {
                        throw new Error("Editor connector not available");
                      }

                      return await new Promise((resolve, reject) => {
                        console.log("Executing GetAllComments method...");
                        editorRef.current.connector.executeMethod(
                          "GetAllComments",
                          [],
                          async (docComments: any[]) => {
                            try {
                              // 获取数据库批注列表
                              const dbResponse = await fetch(
                                `/api/comments?documentId=${id}`,
                              );
                              const dbComments = await dbResponse.json();

                              // 打印两边的批注顺序对比
                              console.log("Comments order comparison:");
                              console.log(
                                "Database comments order:",
                                dbComments.map((c) => ({
                                  id: c.id,
                                  guid: c.guid,
                                  content: c.content.substring(0, 50) + "...",
                                  createdAt: c.createdAt,
                                })),
                              );

                              console.log(
                                "Document comments order:",
                                docComments.map((c, index) => {
                                  const data =
                                    typeof c.Data === "object"
                                      ? c.Data
                                      : JSON.parse(c.Data || "{}");

                                  let guid = null;
                                  if (data.Text) {
                                    const match = data.Text.match(
                                      /\u200B\[GUID:(.*?)\]\u200B/,
                                    );
                                    if (match) guid = match[1];
                                  }

                                  return {
                                    index,
                                    id: c.Id,
                                    guid,
                                    text: data.Text
                                      ? data.Text.substring(0, 50) + "..."
                                      : "N/A",
                                  };
                                }),
                              );

                              // 继续原有的解析逻辑
                              if (!docComments?.length) {
                                resolve([]);
                                return;
                              }

                              const parsedComments = docComments
                                .map((comment) => {
                                  try {
                                    const data =
                                      typeof comment.Data === "object"
                                        ? comment.Data
                                        : JSON.parse(comment.Data || "{}");

                                    let guid = null;
                                    if (data.Text) {
                                      const match = data.Text.match(
                                        /\u200B\[GUID:(.*?)\]\u200B/,
                                      );
                                      if (match) guid = match[1];
                                    }

                                    return {
                                      id: comment.Id,
                                      guid,
                                      data,
                                    };
                                  } catch (error) {
                                    console.error(
                                      "Failed to parse comment:",
                                      error,
                                    );
                                    return null;
                                  }
                                })
                                .filter(Boolean);

                              resolve(parsedComments);
                            } catch (error) {
                              console.error(
                                "Error in comment processing:",
                                error,
                              );
                              reject(error);
                            }
                          },
                        );
                      });
                    } catch (error) {
                      console.error("Error getting comments:", error);
                      throw error;
                    }
                  };

                  // 获取文档批注
                  console.log("Getting document comments...");
                  const docComments = await tryGetComments();

                  if (docComments.length > 0) {
                    console.log("Document comments retrieved:", {
                      count: docComments.length,
                      comments: docComments,
                    });

                    // 匹配批注
                    for (const dbComment of dbComments) {
                      console.log("Processing database comment:", {
                        id: dbComment.id,
                        guid: dbComment.guid,
                        content: dbComment.content,
                        documentCommentId: dbComment.documentCommentId,
                      });

                      const matchingDocComment = docComments.find(
                        (docComment) => {
                          const matches = docComment.guid === dbComment.guid;
                          console.log("Comparing GUIDs:", {
                            dbGuid: dbComment.guid,
                            docGuid: docComment.guid,
                            matches,
                          });
                          return matches;
                        },
                      );

                      if (matchingDocComment) {
                        try {
                          const updateResponse = await fetch(
                            `/api/comments/${dbComment.id}`,
                            {
                              method: "PATCH",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                documentCommentId: matchingDocComment.id,
                                isLocated: true,
                              }),
                            },
                          );

                          if (updateResponse.ok) {
                            const updatedComment = await updateResponse.json();
                            if (
                              updatedComment.documentCommentId ===
                              matchingDocComment.id
                            ) {
                              console.log(
                                "Comment mapping successfully verified:",
                                {
                                  dbCommentId: dbComment.id,
                                  documentCommentId:
                                    updatedComment.documentCommentId,
                                  isLocated: updatedComment.isLocated,
                                },
                              );

                              mappedCount++;
                              console.log(
                                `Successfully mapped ${mappedCount}/${dbComments.length} comments`,
                              );

                              // 测试跳转
                              console.log(
                                "Testing jump to comment:",
                                updatedComment.documentCommentId,
                              );
                              editorRef.current.connector.executeMethod(
                                "MoveToComment",
                                [updatedComment.documentCommentId],
                                (result: any) => {
                                  console.log(
                                    "Jump to comment result:",
                                    result,
                                  );
                                },
                              );
                            } else {
                              console.error(
                                "Comment mapping verification failed:",
                                {
                                  expected: matchingDocComment.id,
                                  actual: updatedComment.documentCommentId,
                                },
                              );
                            }
                          } else {
                            console.error("Failed to update comment:", {
                              status: updateResponse.status,
                              statusText: updateResponse.statusText,
                            });
                          }
                        } catch (error) {
                          console.error(
                            "Failed to update comment mapping:",
                            error,
                          );
                        }
                      } else {
                        console.log("No matching document comment found for:", {
                          dbCommentId: dbComment.id,
                          dbCommentGuid: dbComment.guid,
                        });
                      }
                    }

                    console.log(
                      `Comment mapping completed: ${mappedCount}/${dbComments.length} comments mapped`,
                    );
                  }
                } catch (error) {
                  console.error("Error in comment mapping process:", error);
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
