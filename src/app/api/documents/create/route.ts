import { writeFile, mkdir, readFile } from "fs/promises";
import { join } from "path";
import { NextRequest } from "next/server";
import { getUserInfo } from "@/lib/session";
import prisma from "@/lib/prisma";

const BASE_STORAGE_PATH = process.env.STORAGE_PATH;
const TEMPLATE_PATH = process.env.TEMPLATE_PATH;

if (!BASE_STORAGE_PATH || !TEMPLATE_PATH) {
  throw new Error("Required environment variables are not set");
}

export async function POST(req: NextRequest) {
  try {
    // 获取当前用户信息
    const user = await getUserInfo();
    if (!user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 获取要更新的文档信息
    const docId = req.nextUrl.searchParams.get("id");
    if (!docId) {
      return Response.json(
        { error: "Document ID is required" },
        { status: 400 },
      );
    }

    // 验证文档所有权
    const existingDoc = await prisma.doc.findUnique({
      where: { id: docId },
      select: { userId: true },
    });

    if (!existingDoc || existingDoc.userId !== user.id) {
      return Response.json({ error: "Document not found" }, { status: 404 });
    }

    // 创建用户专属文件夹（如果不存在）
    const userFolderPath = join(BASE_STORAGE_PATH, user.id);
    await mkdir(userFolderPath, { recursive: true });

    // 生成文件名 (使用时间戳确保唯一性)
    const timestamp = Date.now();
    const fileKey = `${timestamp}`;
    const fileName = `${fileKey}.docx`;
    const filePath = join(userFolderPath, fileName);

    // 读取模板文件并复制到新文件
    const templateContent = await readFile(TEMPLATE_PATH);
    await writeFile(filePath, templateContent);

    // 更新数据库记录
    const doc = await prisma.doc.update({
      where: { id: docId },
      data: {
        fileKey,
        content: `/api/documents/${user.id}/${fileName}`,
      },
    });

    console.log("Created document:", {
      userId: user.id,
      docId,
      filePath,
      fileUrl: doc.content,
      fileKey: doc.fileKey,
    });

    // 返回文件信息
    return Response.json({
      success: true,
      filePath,
      fileName,
      url: doc.content,
    });
  } catch (error) {
    console.error("Error creating document:", error);
    return Response.json(
      { error: "Failed to create document" },
      { status: 500 },
    );
  }
}
