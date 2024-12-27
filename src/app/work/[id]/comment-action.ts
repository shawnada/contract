"use server";

import { db } from "@/db/db";
import { revalidatePath } from "next/cache";

// 获取文档的所有批注
export async function getComments(docId: string) {
  const comments = await db.comment.findMany({
    where: { docId },
    orderBy: { createdDate: "asc" },
  });
  return comments;
}

// 创建批注
export async function createCommentInDb(
  docId: string,
  data: {
    groupId: string;
    content: string;
    additionalContent?: string;
    riskLevel?: string;
    userName: string;
    rangeText: string;
  },
) {
  const comment = await db.comment.create({
    data: {
      ...data,
      docId,
    },
  });
  revalidatePath(`/work/${docId}`);
  return comment;
}

// 更新批注
export async function updateComment(
  groupId: string,
  docId: string,
  data: {
    content?: string;
    additionalContent?: string;
    riskLevel?: string;
  },
) {
  const comment = await db.comment.update({
    where: { groupId },
    data,
  });
  revalidatePath(`/work/${docId}`);
  return comment;
}

// 删除批注
export async function deleteComment(
  groupId: string,
  docId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.comment.delete({
      where: { groupId },
    });
    revalidatePath(`/work/${docId}`);
    return { success: true };
  } catch (error) {
    if (error.code === "P2025") {
      console.log("Comment already deleted");
      return { success: true };
    }
    console.error("Error deleting comment:", error);
    return { success: false, error: "Failed to delete comment" };
  }
}
