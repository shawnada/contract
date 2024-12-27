import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      console.error("No file provided in request");
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    console.log("Received file:", {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    // 创建新的 FormData 来转发文件
    const forwardFormData = new FormData();
    forwardFormData.append("file", file);

    console.log("Forwarding request to conversion API...");

    // 通过服务器端转发请求到目标 API
    const response = await fetch(
      "https://zsk.zlsoft.com/api/documentdata/convertfile?outputtype=html",
      {
        method: "POST",
        body: forwardFormData,
      },
    );

    console.log("Conversion API response:", {
      status: response.status,
      statusText: response.statusText,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Conversion API error:", {
        status: response.status,
        statusText: response.statusText,
        errorText,
      });
      throw new Error(`API responded with status: ${response.status}`);
    }

    const htmlContent = await response.text();
    console.log(
      "Successfully converted document, HTML length:",
      htmlContent.length,
    );

    // 返回转换后的 HTML 内容
    return new Response(htmlContent, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  } catch (error) {
    console.error("Document conversion failed:", {
      error,
      message: error.message,
      stack: error.stack,
    });

    return Response.json(
      {
        error: "Failed to convert document",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
