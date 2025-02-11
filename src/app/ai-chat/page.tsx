"use client";

import { useState, useRef, useEffect } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface MessageSegment {
  type: "think" | "content" | "title" | "list";
  text: string;
}

export default function AIChatPage() {
  // 初始包含系统提示
  const [messages, setMessages] = useState<Message[]>([
    { role: "system", content: "你是一个擅长分析和解决问题的咨询领域专家" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  // 用于自动滚动到底部
  const bottomRef = useRef<HTMLDivElement>(null);
  const [drawioLoading, setDrawioLoading] = useState(true);
  const [drawioError, setDrawioError] = useState<string | null>(null);

  // 每次 messages 更新时滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    // 记录用户输入到对话历史中
    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      // 发送当前完整对话上下文
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.body) {
        throw new Error("Streaming response is not available.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let resultText = "";

      // 读取流数据并逐步更新
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        resultText += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          // 如果最后一条消息是 assistant，则更新该条，否则追加新消息
          if (
            updated.length > 0 &&
            updated[updated.length - 1].role === "assistant"
          ) {
            updated[updated.length - 1].content = resultText;
          } else {
            updated.push({ role: "assistant", content: resultText });
          }
          return updated;
        });
      }
    } catch (err: any) {
      console.error("Request failed:", err);
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Error: " + err.message },
      ]);
    }
    setLoading(false);
  };

  const parseMessage = (content: string): MessageSegment[] => {
    const segments: MessageSegment[] = [];

    // 解析 <think> 标签
    const thinkMatch = content.match(/<think>(.*?)<\/think>/s);
    if (thinkMatch) {
      segments.push({ type: "think", text: thinkMatch[1].trim() });
      content = content.replace(thinkMatch[0], "");
    }

    // 解析标题（以 ### 开头的行）
    content.split("\n").forEach((line) => {
      if (line.startsWith("### ")) {
        segments.push({ type: "title", text: line.replace("### ", "") });
      } else if (line.startsWith("- ")) {
        segments.push({ type: "list", text: line.substring(2) });
      } else if (line.trim()) {
        segments.push({ type: "content", text: line });
      }
    });

    return segments;
  };

  const MessageContent = ({ content }: { content: string }) => {
    const segments = parseMessage(content);

    return (
      <div className="message-content">
        {segments.map((segment, index) => {
          switch (segment.type) {
            case "think":
              return (
                <div
                  key={index}
                  className="think-segment"
                  style={{
                    backgroundColor: "#f5f5f5",
                    padding: "12px",
                    margin: "8px 0",
                    borderLeft: "4px solid #9e9e9e",
                    fontFamily: "Georgia, serif",
                    fontSize: "0.95em",
                    color: "#666",
                  }}
                >
                  <div
                    style={{
                      fontStyle: "italic",
                      marginBottom: "4px",
                      color: "#888",
                    }}
                  >
                    思考过程:
                  </div>
                  {segment.text}
                </div>
              );

            case "title":
              return (
                <h3
                  key={index}
                  style={{
                    fontSize: "1.2em",
                    fontWeight: "bold",
                    margin: "16px 0 8px 0",
                    color: "#2c3e50",
                  }}
                >
                  {segment.text}
                </h3>
              );

            case "list":
              return (
                <div
                  key={index}
                  style={{
                    margin: "4px 0",
                    paddingLeft: "20px",
                    position: "relative",
                  }}
                >
                  <span style={{ position: "absolute", left: "8px" }}>•</span>
                  {segment.text}
                </div>
              );

            default:
              return (
                <p
                  key={index}
                  style={{
                    margin: "8px 0",
                    lineHeight: "1.5",
                  }}
                >
                  {segment.text}
                </p>
              );
          }
        })}
      </div>
    );
  };

  // 处理与 draw.io 的通信
  useEffect(() => {
    const handleDrawioMessage = (evt: MessageEvent) => {
      if (evt.data.length > 0) {
        try {
          const msg = JSON.parse(evt.data);
          console.log("Received message from draw.io:", msg);

          // 处理初始化完成事件
          if (msg.event === "init") {
            console.log("draw.io initialized");
            const iframe =
              document.querySelector<HTMLIFrameElement>("#drawioFrame");
            if (iframe?.contentWindow) {
              iframe.contentWindow.postMessage(
                JSON.stringify({
                  action: "load",
                  autosave: 1,
                  noSaveBtn: 1,
                  modified: false,
                }),
                "*",
              );
            }
          }

          // 处理加载完成事件
          if (msg.event === "load") {
            console.log("Diagram loaded");
            setDrawioLoading(false);
          }
        } catch (e) {
          console.error("Error processing draw.io message:", e);
        }
      }
    };

    window.addEventListener("message", handleDrawioMessage);
    return () => window.removeEventListener("message", handleDrawioMessage);
  }, []);

  const handleIframeLoad = () => {
    console.log("iframe loaded successfully");
  };

  const handleIframeError = (
    e: React.SyntheticEvent<HTMLIFrameElement, Event>,
  ) => {
    console.error("iframe loading error:", e);
    setDrawioLoading(false);
    setDrawioError("加载绘图工具失败，请检查服务是否可用");
  };

  // 构建完整的 draw.io URL
  const drawioUrl = new URL(`${process.env.NEXT_PUBLIC_DRAWIO_URL}`);
  const params = {
    embed: "1",
    proto: "json",
    spin: "1",
    lang: "zh",
    noExitBtn: "1",
    libraries: "1",
    saveAndExit: "0",
    chrome: "1",
    toolbar: "1",
    layers: "1",
    nav: "1",
    tags: "1",
    border: "0",
    zoom: "1",
    math: "1",
    height: "100%",
    width: "100%",
  };

  Object.entries(params).forEach(([key, value]) => {
    drawioUrl.searchParams.set(key, value);
  });

  return (
    <ResizablePanelGroup direction="horizontal" className="min-h-screen">
      {/* 左侧 draw.io 面板 */}
      <ResizablePanel defaultSize={75} minSize={40}>
        <div className="relative h-screen">
          {drawioLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-2">加载中...</p>
              </div>
            </div>
          )}

          {drawioError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center text-red-500 p-4">
                <p>{drawioError}</p>
                <button
                  onClick={() => {
                    setDrawioLoading(true);
                    setDrawioError(null);
                    const iframe =
                      document.querySelector<HTMLIFrameElement>("#drawioFrame");
                    if (iframe) {
                      iframe.src = drawioUrl.toString();
                    }
                  }}
                  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  重试
                </button>
              </div>
            </div>
          )}

          <iframe
            id="drawioFrame"
            src={drawioUrl.toString()}
            className="w-full h-full border-0"
            style={{
              minHeight: "100vh",
              backgroundColor: "#ffffff",
            }}
            frameBorder="0"
            allowFullScreen
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            allow="fullscreen; clipboard-read; clipboard-write"
          />
        </div>
      </ResizablePanel>

      {/* 拖动手柄 */}
      <ResizableHandle withHandle />

      {/* 右侧主对话区域 */}
      <ResizablePanel defaultSize={25} minSize={25}>
        <div className="flex flex-col h-screen p-4">
          <h1 className="text-2xl font-bold mb-4">DeepSeek R1 聊天</h1>

          {/* 对话展示区域 */}
          <div
            className="flex-1 border border-gray-200 rounded-lg p-4 mb-4 overflow-y-auto"
            style={{ height: "calc(100vh - 200px)" }}
          >
            {messages
              .filter((msg) => msg.role !== "system")
              .map((msg, index) => (
                <div
                  key={index}
                  style={{
                    marginBottom: "0.5rem",
                    textAlign: msg.role === "user" ? "right" : "left",
                  }}
                >
                  <div
                    style={{
                      display: "inline-block",
                      backgroundColor: msg.role === "user" ? "#DCF8C6" : "#FFF",
                      border: "1px solid #ccc",
                      borderRadius: "8px",
                      padding: "0.5rem",
                      maxWidth: "80%",
                      wordWrap: "break-word",
                    }}
                  >
                    <strong>{msg.role === "user" ? "你" : "AI"}</strong>:{" "}
                    {msg.role === "assistant" ? (
                      <MessageContent content={msg.content} />
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}
            {loading && (
              <div style={{ textAlign: "left", marginBottom: "0.5rem" }}>
                AI 正在输入...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* 输入区域 */}
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="请输入消息..."
              className="flex-1 p-2 border border-gray-300 rounded-lg resize-none"
              style={{ height: "100px" }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!loading && input.trim()) {
                    handleSend();
                  }
                }
              }}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
            >
              发送
            </button>
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
