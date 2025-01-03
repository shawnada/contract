import { createReadStream, statSync } from "fs";
import { join } from "path";
import { NextRequest } from "next/server";
import { getUserInfo } from "@/lib/session";
import { headers } from "next/headers";

const BASE_STORAGE_PATH = process.env.STORAGE_PATH;

if (!BASE_STORAGE_PATH) {
  throw new Error("STORAGE_PATH environment variable is not set");
}

// 简单的令牌生成函数
function generateToken(userId: string, fileName: string): string {
  // 在实际应用中应该使用更安全的方法
  return Buffer.from(`${userId}:${fileName}`).toString("base64");
}

// 验证令牌
function verifyToken(token: string, userId: string, fileName: string): boolean {
  try {
    const expectedToken = generateToken(userId, fileName);
    return token === expectedToken;
  } catch {
    return false;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string; fileName: string } },
) {
  console.log("Document request:", params);

  try {
    const filePath = join(BASE_STORAGE_PATH, params.userId, params.fileName);
    console.log("Serving document from:", filePath);

    // 检查文件是否存在
    try {
      const stats = statSync(filePath);
      if (!stats.isFile()) {
        throw new Error("Not a file");
      }
    } catch (error) {
      console.error("File not found:", filePath);
      return Response.json({ error: "File not found" }, { status: 404 });
    }

    const stream = createReadStream(filePath);

    // 添加 CORS 和其他必要的头信息
    const headers = {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `inline; filename="${params.fileName}"`,
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Cache-Control": "no-cache",
    };

    return new Response(stream as any, { headers });
  } catch (error) {
    console.error("Error serving document:", error);
    return Response.json(
      { error: "Failed to serve document" },
      { status: 500 },
    );
  }
}

// 添加 OPTIONS 处理
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
