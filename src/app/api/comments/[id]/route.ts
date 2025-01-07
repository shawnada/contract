import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
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
    console.log("开始删除批注:", params.id);
    const comment = await prisma.comment.delete({
      where: { id: params.id },
    });
    console.log("批注删除成功:", comment);

    return NextResponse.json(comment);
  } catch (error) {
    console.error("删除批注失败:", error);
    return NextResponse.json(
      { error: "Failed to delete comment", details: error.message },
      { status: 500 },
    );
  }
}
