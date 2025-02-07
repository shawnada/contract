import { NextResponse } from "next/server";
import OpenAI from "openai";

// 使用新接口的配置：baseURL 与新Key
const openai = new OpenAI({
  baseURL: "https://api.deepinfra.com/v1/openai",
  apiKey: "p5sA6ShHKZc4L3lSzM0v92aNIju6p6RY",
});

export async function POST(request: Request) {
  console.log("Received /api/ai-chat request");
  try {
    // 从请求体中获取 messages 数组，并取最近5轮对话（5轮=10条消息），如果有系统提示则保留
    const { messages } = await request.json();
    let recentMessages: any[] = [];
    if (messages.length > 0 && messages[0].role === "system") {
      const systemMsg = messages[0];
      const conversation = messages.slice(1);
      recentMessages = [systemMsg, ...conversation.slice(-10)];
    } else {
      recentMessages = messages.slice(-10);
    }
    console.log("Using recentMessages:", recentMessages);

    // 请求时设置 stream: true
    const completion = await openai.chat.completions.create({
      messages: recentMessages,
      model: "deepseek-ai/DeepSeek-R1",
      stream: true,
    });
    console.log("DeepInfra API streaming call started.");

    // 构建流式响应，提取每个 chunk 中的文本
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 遍历流式返回的每个 chunk
          for await (const chunk of completion) {
            let content = "";
            if (typeof chunk === "object" && chunk !== null) {
              // 如果返回的是标准流式数据，尝试从 delta 或 message 中提取文本
              if (chunk.choices && chunk.choices[0]) {
                const choice = chunk.choices[0];
                if (choice.delta && choice.delta.content) {
                  content = choice.delta.content;
                } else if (choice.message && choice.message.content) {
                  content = choice.message.content;
                }
              }
            } else {
              content = chunk.toString();
            }
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
          controller.close();
        } catch (err) {
          console.error("Error during streaming:", err);
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain" },
    });
  } catch (error: any) {
    console.error("OpenAI API error:", error);
    return NextResponse.json(
      { error: "API request failed", details: error.message },
      { status: 500 },
    );
  }
}
