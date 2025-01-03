"use client";

import { Button } from "@/components/ui/button";
import { FileUp } from "lucide-react";
import { useState } from "react";
import { updateDoc } from "@/app/work/[id]/action";

const ALLOWED_TYPES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/msword", // .doc
  "application/pdf", // .pdf
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function ImportDocButton({ id }: { id: string }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      alert("只支持 DOC、DOCX 和 PDF 格式的文件");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      alert("文件大小不能超过 10MB");
      return;
    }

    try {
      setIsLoading(true);

      // 1. 先将文件上传到我们自己的服务器
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("docId", id);
      uploadFormData.append("filename", file.name);

      const saveResponse = await fetch("/api/documents/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!saveResponse.ok) {
        throw new Error("上传文件失败");
      }

      const saveData = await saveResponse.json();

      // 2. 使用 OnlyOffice 打开上传的文件
      await updateDoc(id, {
        content: saveData.url,
        version: saveData.version,
      });

      // 3. 刷新页面以显示新内容
      window.location.reload();
    } catch (error) {
      console.error("导入文件失败:", error);
      alert(error.message || "导入文件失败");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      disabled={isLoading}
      onClick={() => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".doc,.docx,.pdf";
        input.onchange = (e) => handleImport(e as any);
        input.click();
      }}
    >
      <FileUp className="h-4 w-4" />
    </Button>
  );
}
