import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserInfo } from "@/lib/session";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getUserInfo();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 验证评论所有权
    const comment = await prisma.comment.findUnique({
      where: { id: params.id },
      select: { userId: true },
    });

    if (!comment || comment.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const updatedComment = await prisma.comment.update({
      where: { id: params.id },
      data: body,
    });

    return NextResponse.json(updatedComment);
  } catch (error) {
    console.error("Failed to update comment:", error);
    return NextResponse.json(
      { error: "Failed to update comment" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    // 验证用户权限
    const user = await getUserInfo();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 确保用户只能删除自己的批注
    const comment = await prisma.comment.findUnique({
      where: { id: params.id },
      select: { userId: true },
    });

    if (!comment || comment.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.log("开始删除批注:", params.id);
    const deletedComment = await prisma.comment.delete({
      where: { id: params.id },
    });
    console.log("批注删除成功:", deletedComment);

    return NextResponse.json(deletedComment);
  } catch (error) {
    console.error("删除批注失败:", error);
    return NextResponse.json(
      { error: "Failed to delete comment", details: error.message },
      { status: 500 },
    );
  }
}
