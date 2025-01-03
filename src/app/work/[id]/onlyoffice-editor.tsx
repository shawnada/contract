"use client";

import { useEffect, useRef } from "react";
import { updateDoc, getDoc } from "./action";

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
  const editorRef = useRef<any>(null);
  const isCreatingRef = useRef(false);

  useEffect(() => {
    async function initEditor() {
      if (typeof (window as any).DocsAPI === "undefined") {
        console.warn("OnlyOffice API not loaded");
        return;
      }

      try {
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
          const config = {
            document: {
              fileType: "docx",
              key: `${id}_${latestVersion}`,
              title: "Document.docx",
              url: `${window.location.origin}${documentUrl}`,
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
              callbackUrl: `${window.location.origin}/api/callback?docId=${id}`,
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
              onRequestClose: () => {
                console.log("Document closed");
              },
              onSave: async () => {
                console.log("Document saved");
              },
              onRequestSaveAs: (event: any) => {
                console.log("Save as requested:", event);
                return true;
              },
              onRequestInsertImage: (event: any) => {
                console.log("Insert image requested:", event);
                return true;
              },
              onRequestCompareFile: () => {
                return true;
              },
              onRequestHistory: () => {
                return true;
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

          editorRef.current = editor;

          const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (editor && editor.editorIsModified) {
              e.preventDefault();
              e.returnValue = "";
            }
          };

          window.addEventListener("beforeunload", handleBeforeUnload);

          return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
            if (editorRef.current) {
              editorRef.current.destroyEditor();
            }
          };
        }
      } catch (error) {
        console.error("Error initializing editor:", error);
      }
    }

    initEditor();
  }, [id, content, version]);

  return <div id="onlyoffice-editor" className="h-full w-full" />;
}
