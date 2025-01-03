import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getUserInfo } from "@/lib/session";

const BASE_STORAGE_PATH = process.env.STORAGE_PATH;
const ONLYOFFICE_API_URL = process.env.NEXT_PUBLIC_ONLYOFFICE_API_URL;

if (!BASE_STORAGE_PATH) {
  throw new Error("STORAGE_PATH environment variable is not set");
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserInfo();
    if (!user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const docId = formData.get("docId") as string;
    const filename = formData.get("filename") as string;

    if (!file || !docId) {
      return Response.json(
        { error: "File and document ID are required" },
        { status: 400 },
      );
    }

    // 验证文档所有权
    const doc = await prisma.doc.findUnique({
      where: { id: docId },
      select: { userId: true, version: true, fileKey: true },
    });

    if (!doc || doc.userId !== user.id) {
      return Response.json({ error: "Document not found" }, { status: 404 });
    }

    // 创建用户文件夹
    const userFolderPath = join(BASE_STORAGE_PATH, user.id);
    await mkdir(userFolderPath, { recursive: true });

    // 如果存在旧文件，先删除
    if (doc.fileKey) {
      const oldFilePath = join(userFolderPath, `${doc.fileKey}.docx`);
      try {
        await unlink(oldFilePath);
        console.log(`Deleted old file: ${oldFilePath}`);
      } catch (error) {
        console.warn(`Failed to delete old file: ${oldFilePath}`, error);
        // 继续执行，不要因为删除旧文件失败而中断
      }
    }

    // 生成新的文件名
    const timestamp = Date.now();
    const fileKey = `${timestamp}`;
    const fileName = `${fileKey}.docx`;
    const filePath = join(userFolderPath, fileName);

    // 如果是 doc 或 pdf，先转换为 docx
    if (filename.endsWith(".doc") || filename.endsWith(".pdf")) {
      try {
        // 先保存原始文件
        const buffer = Buffer.from(await file.arrayBuffer());
        const tempPath = join(userFolderPath, `temp_${filename}`);
        await writeFile(tempPath, buffer);

        // 调用 OnlyOffice 转换服务
        const convertFormData = new FormData();
        convertFormData.append("file", new Blob([buffer]), filename);

        const convertResponse = await fetch(
          `${ONLYOFFICE_API_URL}/ConvertService.ashx`,
          {
            method: "POST",
            body: convertFormData,
          },
        );

        if (!convertResponse.ok) {
          throw new Error("文件转换失败");
        }

        const convertedContent = await convertResponse.arrayBuffer();
        await writeFile(filePath, Buffer.from(convertedContent));
      } catch (error) {
        console.error("文件转换失败:", error);
        throw new Error("文件转换失败");
      }
    } else {
      // 如果是 docx，直接保存
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);
    }

    // 更新数据库
    const newVersion = doc.version + 1;
    await prisma.doc.update({
      where: { id: docId },
      data: {
        fileKey,
        content: `/api/documents/${user.id}/${fileName}`,
        version: newVersion,
      },
    });

    return Response.json({
      url: `/api/documents/${user.id}/${fileName}`,
      version: newVersion,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }
}
