"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
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

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1>AI 聊天</h1>
      {/* 对话展示区域 */}
      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: "8px",
          padding: "1rem",
          height: "60vh",
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
                {msg.content}
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
        <input
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
          }}
        >
          发送
        </button>
      </div>
    </div>
  );
}
