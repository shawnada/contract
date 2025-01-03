"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { unlink } from "fs/promises";
import { join } from "path";

const BASE_STORAGE_PATH = process.env.STORAGE_PATH;

export async function updateDoc(
  id: string,
  data: { content?: string; title?: string; version?: number },
) {
  try {
    // 如果要更新版本，先获取当前版本
    if (data.version) {
      const currentDoc = await prisma.doc.findUnique({
        where: { id },
        select: { version: true },
      });

      // 只有当新版本大于当前版本时才更新
      if (currentDoc && data.version <= currentDoc.version) {
        console.log(
          "Version not updated - new version is not greater than current",
        );
        return currentDoc;
      }
    }

    const result = await prisma.doc.update({
      where: { id },
      data,
    });

    // 重新验证所有相关路径
    revalidatePath(`/work/${id}`);
    revalidatePath("/");
    revalidatePath(`/api/documents/${result.userId}/${result.fileKey}`);

    return result;
  } catch (error) {
    console.error("Error updating document:", error);
    throw error;
  }
}

export async function getDoc(id: string) {
  try {
    return await prisma.doc.findUnique({
      where: { id },
    });
  } catch (error) {
    console.error("Error fetching document:", error);
    return null;
  }
}

export async function deleteDoc(id: string) {
  try {
    // 获取文档信息
    const doc = await prisma.doc.findUnique({
      where: { id },
      select: { userId: true, fileKey: true },
    });

    if (!doc) {
      throw new Error("Document not found");
    }

    // 如果有文件，删除物理文件
    if (doc.fileKey) {
      const filePath = join(
        BASE_STORAGE_PATH!,
        doc.userId,
        `${doc.fileKey}.docx`,
      );
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

    // 重新验证路径
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Error deleting document:", error);
    throw error;
  }
}
