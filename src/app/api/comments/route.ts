import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { documentId, comment } = body;

    const savedComment = await prisma.comment.create({
      data: {
        content: comment.content,
        additionalContent: comment.additionalContent,
        riskLevel: comment.riskLevel,
        userName: comment.userName,
        rangeText: comment.rangeText,
        documentCommentId: comment.documentCommentId,
        isLocated: comment.isLocated,
        documentId: documentId,
        userId: "cm5g5e9sa0000mmzyb5dt4m4f",
      },
    });

    return NextResponse.json(savedComment);
  } catch (error) {
    console.error("Failed to create comment:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 },
      );
    }

    console.log("正在查询文档批注, documentId:", documentId);

    const comments = await prisma.comment.findMany({
      where: { documentId },
      orderBy: { createdAt: "desc" },
    });

    console.log("查询到批注数量:", comments.length);

    return NextResponse.json(comments);
  } catch (error) {
    console.error("查询批注失败:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 },
    );
  }
}
