import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

const BASE_STORAGE_PATH = process.env.STORAGE_PATH;

if (!BASE_STORAGE_PATH) {
  throw new Error("STORAGE_PATH environment variable is not set");
}

export async function POST(req: NextRequest) {
  try {
    console.log("Received callback request");
    const data = await req.json();
    console.log("Callback data:", data);

    // 处理文件转换回调
    if (data.type === "convert") {
      const docId = data.docId;
      const fileUrl = data.url;

      // 更新数据库中的文档内容
      await prisma.doc.update({
        where: { id: docId },
        data: {
          content: fileUrl,
          version: { increment: 1 },
        },
      });

      return Response.json({ success: true });
    }

    // 从URL参数获取文档ID
    const searchParams = req.nextUrl.searchParams;
    const docId = searchParams.get("docId");

    if (!docId) {
      console.error("Document ID not provided");
      return Response.json({ error: "Document ID required" }, { status: 400 });
    }

    // 获取文档信息
    const doc = await prisma.doc.findUnique({
      where: { id: docId },
      select: { userId: true, fileKey: true, version: true },
    });

    if (!doc) {
      console.error("Document not found");
      return Response.json({ error: "Document not found" }, { status: 404 });
    }

    // 处理OnlyOffice的回调
    switch (data.status) {
      case 0: // 文档编辑中
        console.log("Document being edited");
        break;
      case 1: // 文档准备保存
        console.log("Document ready to save");
        break;
      case 2: // 文档保存状态
        try {
          // 从URL下载文档内容
          const response = await fetch(data.url);
          if (!response.ok) {
            throw new Error("Failed to download document content");
          }
          const content = await response.arrayBuffer();

          // 使用文档的fileKey构建文件名
          const fileName = `${doc.fileKey}.docx`;
          const filePath = join(BASE_STORAGE_PATH, doc.userId, fileName);

          console.log("Saving document to:", filePath);
          await writeFile(filePath, Buffer.from(content));

          // 更新文档版本
          const newVersion = doc.version + 1;
          await prisma.doc.update({
            where: { id: docId },
            data: { version: newVersion },
          });

          console.log(
            `Document saved successfully. New version: ${newVersion}`,
          );
        } catch (error) {
          console.error("Error saving document:", error);
          return Response.json({ error: 1 }, { status: 500 });
        }
        break;
      case 3: // 文档保存出错
        console.error("Document save error:", data);
        break;
      case 4: // 文档正在关闭，没有改动
        console.log("Document closed without changes");
        break;
      default:
        console.log("Unknown status:", data.status);
    }

    return Response.json({ error: 0 });
  } catch (error) {
    console.error("Callback error:", error);
    return Response.json({ error: 1 }, { status: 500 });
  }
}
