"use client";

import { createContext, useContext, useRef } from "react";
import type Editor from "@hufe921/canvas-editor";

interface EditorContextType {
  editorRef: React.MutableRefObject<Editor | null>;
}

const EditorContext = createContext<EditorContextType | null>(null);

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const editorRef = useRef<Editor | null>(null);

  return (
    <EditorContext.Provider value={{ editorRef }}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditorContext() {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error("useEditorContext must be used within EditorProvider");
  }
  return context;
}
