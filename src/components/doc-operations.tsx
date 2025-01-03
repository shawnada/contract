"use client";

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteDoc } from "@/app/work/[id]/action";
import { useRouter } from "next/navigation";

// 导出删除函数供其他组件使用
export async function handleDocDelete(id: string) {
  if (!confirm("确定要删除这个文档吗？")) {
    return false;
  }

  try {
    await deleteDoc(id);
    return true;
  } catch (error) {
    console.error("Error deleting document:", error);
    alert("删除文档失败");
    return false;
  }
}

export function DeleteButton({ id }: { id: string }) {
  const router = useRouter();

  const handleDelete = async () => {
    const success = await handleDocDelete(id);
    if (success) {
      router.refresh();
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleDelete}
      className="h-8 w-8"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
