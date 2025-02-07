"use client";

import { useState, useRef, useEffect } from "react";

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

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1>AI 聊天</h1>
      {/* 对话展示区域 */}
      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: "8px",
          padding: "1rem",
          height: "75vh",
          overflowY: "auto",
          marginBottom: "1rem",
          background: "#f9f9f9",
        }}
      >
        {messages
          .filter((msg) => msg.role !== "system") // 可选择是否显示系统提示
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
      <div style={{ display: "flex" }}>
        <textarea
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="请输入消息..."
          style={{
            flex: 1,
            padding: "0.5rem",
            fontSize: "1rem",
            border: "1px solid #ccc",
            borderRadius: "4px",
            resize: "none",
            height: "100px",
            minHeight: "80px",
            maxHeight: "200px",
            overflowY: "auto",
            lineHeight: "1.5",
            fontFamily: "inherit",
          }}
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
          style={{
            padding: "0.5rem 1rem",
            fontSize: "1rem",
            marginLeft: "0.5rem",
            border: "none",
            borderRadius: "4px",
            backgroundColor: "#0070f3",
            color: "#fff",
            cursor: "pointer",
            alignSelf: "flex-end",
            height: "40px",
          }}
        >
          发送
        </button>
      </div>
    </div>
  );
}
