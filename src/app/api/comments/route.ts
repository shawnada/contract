import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserInfo } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const user = await getUserInfo();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { documentId, comment } = body;

    if (!documentId || !comment) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (!comment.guid) {
      return NextResponse.json({ error: "GUID is required" }, { status: 400 });
    }

    const savedComment = await prisma.comment.create({
      data: {
        guid: comment.guid,
        content: comment.content,
        additionalContent: comment.additionalContent,
        riskLevel: comment.riskLevel,
        userName: comment.userName,
        rangeText: comment.rangeText,
        documentCommentId: comment.documentCommentId,
        isLocated: comment.isLocated,
        documentId: documentId,
        userId: user.id,
      },
    });

    return NextResponse.json(savedComment);
  } catch (error) {
    console.error("Failed to create comment:", error);
    return NextResponse.json(
      { error: "Failed to create comment", details: error.message },
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

    try {
      const comments = await prisma.comment.findMany({
        where: { documentId },
        orderBy: { createdAt: "desc" },
      });

      console.log("查询到批注数量:", comments.length);
      return NextResponse.json(comments);
    } catch (dbError) {
      console.error("数据库查询失败:", dbError);
      return NextResponse.json(
        { error: "Database query failed", details: dbError.message },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("查询批注失败:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments", details: error.message },
      { status: 500 },
    );
  }
}
