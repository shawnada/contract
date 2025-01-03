import { unlink } from "fs/promises";
import { join } from "path";
import { NextRequest } from "next/server";
import { getUserInfo } from "@/lib/session";
import prisma from "@/lib/prisma";

const BASE_STORAGE_PATH = process.env.STORAGE_PATH;

if (!BASE_STORAGE_PATH) {
  throw new Error("STORAGE_PATH environment variable is not set");
}

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();

    // 获取当前用户信息
    const user = await getUserInfo();
    if (!user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 获取文档信息
    const doc = await prisma.doc.findUnique({
      where: { id },
      select: { userId: true, fileKey: true },
    });

    // 验证文档所有权
    if (!doc || doc.userId !== user.id) {
      return Response.json({ error: "Document not found" }, { status: 404 });
    }

    // 如果有文件，删除物理文件
    if (doc.fileKey) {
      const filePath = join(BASE_STORAGE_PATH, user.id, `${doc.fileKey}.docx`);
      try {
        await unlink(filePath);
        console.log("Physical file deleted:", filePath);
      } catch (error) {
        console.error("Error deleting physical file:", error);
        // 继续执行，即使文件删除失败
      }
    }

    // 删除数据库记录
    await prisma.doc.delete({
      where: { id },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting document:", error);
    return Response.json(
      { error: "Failed to delete document" },
      { status: 500 },
    );
  }
}
