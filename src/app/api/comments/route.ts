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
    const { documentId, comment, comments } = body;

    console.log("收到创建评论请求:", {
      documentId,
      hasComment: !!comment,
      hasComments: !!comments,
      commentsLength: comments?.length,
    });

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 },
      );
    }

    // 处理批量评论
    if (comments && Array.isArray(comments)) {
      try {
        console.log("开始批量创建评论, 数据:", comments);

        // 验证评论数据并确保 guid 唯一
        const validComments = comments.map((comment, index) => ({
          guid: `${comment.guid}_${index}`, // 确保每个评论的 guid 唯一
          content: comment.content,
          additionalContent: comment.additionalContent,
          riskLevel: comment.riskLevel,
          userName: comment.userName,
          rangeText: comment.rangeText,
          documentCommentId: comment.documentCommentId,
          isLocated: comment.isLocated,
          documentId,
          userId: user.id,
        }));

        // 使用事务来处理批量创建
        const createdComments = await prisma.$transaction(
          validComments.map((commentData) =>
            prisma.comment.create({
              data: commentData,
            }),
          ),
        );

        console.log("批量创建评论成功:", {
          count: createdComments.length,
          comments: createdComments,
        });

        return NextResponse.json(createdComments);
      } catch (createError) {
        console.error("批量创建评论失败:", {
          error: createError,
          stack: createError.stack,
          details: createError.message,
        });

        // 如果是唯一约束错误，返回更具体的错误信息
        if (createError.code === "P2002") {
          return NextResponse.json(
            {
              error: "Duplicate comment",
              details: "Some comments already exist",
            },
            { status: 409 }, // 使用 409 Conflict 状态码
          );
        }

        return NextResponse.json(
          {
            error: "Failed to create comments",
            details: createError.message,
          },
          { status: 500 },
        );
      }
    }

    // 处理单个评论
    if (comment) {
      try {
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
            documentId,
            userId: user.id,
          },
        });
        return NextResponse.json(savedComment);
      } catch (createError) {
        console.error("单个评论创建失败:", {
          error: createError,
          data: comment,
        });
        throw createError;
      }
    }

    return NextResponse.json(
      { error: "Comment data is required" },
      { status: 400 },
    );
  } catch (error) {
    console.error("评论创建过程出错:", {
      error,
      stack: error.stack,
      message: error.message,
    });
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
