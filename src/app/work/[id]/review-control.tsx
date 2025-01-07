"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { getStandards } from "../api/standards";
import { useEditorContext } from "./editor-context";
import "./review-control.css";
import { X } from "lucide-react";

interface Standard {
  id: string;
  title: string;
  user?: {
    name: string;
  };
}

interface ReviewControlProps {
  docId: string;
}

interface Comment {
  id: string;
  content: string;
  additionalContent?: string;
  riskLevel: string;
  userName: string;
  rangeText: string;
  createdAt: Date;
  isEditing?: boolean;
  documentCommentId?: string;
  isLocated: boolean;
}

export default function ReviewControl({ docId }: ReviewControlProps) {
  const { editorRef } = useEditorContext();
  const [standards, setStandards] = useState<Standard[]>([]);
  const [selectedStandard, setSelectedStandard] = useState<string>("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewProgress, setReviewProgress] = useState<{
    current: number;
    total: number;
    currentRule?: string;
  }>({ current: 0, total: 0 });
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    // 获取标准列表
    const fetchStandards = async () => {
      const data = await getStandards();
      setStandards(data);
      if (data.length > 0) {
        setSelectedStandard(data[0].id);
      }
    };
    fetchStandards();
  }, []);

  useEffect(() => {
    console.log("批注列表已更新:", comments);
  }, [comments]);

  // 加载已有的批注
  useEffect(() => {
    let isMounted = true; // 添加组件挂载状态检查

    const loadComments = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/comments?documentId=${docId}`);
        if (!response.ok) throw new Error("Failed to fetch comments");
        const data = await response.json();
        console.log("获取到批注数据:", data);

        // 检查组件是否仍然挂载
        if (isMounted) {
          setComments(data);
          console.log("批注数据设置完成, 数量:", data.length);
        }
      } catch (error) {
        console.error("加载批注失败:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    console.log("开始加载批注, docId:", docId);
    loadComments();

    // 清理函数
    return () => {
      isMounted = false;
    };
  }, [docId]); // 只在 docId 变化时重新加载

  // 添加一个监听 comments 变化的 effect 用于调试
  useEffect(() => {
    console.log("comments 状态已更新:", {
      length: comments.length,
      comments: comments,
    });
  }, [comments]);

  const addCommentToDocument = async (text: string, comment: Comment) => {
    if (!editorRef.current?.connector) {
      console.error("Editor connector not initialized");
      return;
    }

    const comStr =
      `风险等级：${comment.riskLevel}\n` +
      `风险提示：${comment.content}\n` +
      `修改建议：${comment.additionalContent || "无"}`;

    (window as any).Asc = {
      scope: {
        searchText: text,
        comStr: comStr,
      },
    };

    return new Promise((resolve, reject) => {
      editorRef.current.connector.callCommand(
        function () {
          try {
            var oDocument = Api.GetDocument();
            var searchResults = oDocument.Search(Asc.scope.searchText);

            if (!searchResults || searchResults.length === 0) {
              console.warn("Text not found:", Asc.scope.searchText);
              return { error: 1, msg: "未找到匹配文本" };
            }

            var oRange = searchResults[0];
            var oComments = Api.AddComment(
              oRange,
              Asc.scope.comStr,
              "AI审核",
              "ai-review",
            );

            return {
              error: 0,
              data: oComments.Comment.Id,
              msg: "批注添加成功",
            };
          } catch (error) {
            console.error("添加批注时出错:", error);
            return { error: 1, msg: error.message };
          }
        },
        function (result) {
          if (result.error === 0) {
            console.log("成功添加文档批注:", result.data);
            resolve(result.data);
          } else {
            console.error("添加文档批注失败:", result.msg);
            reject(new Error(result.msg));
          }
        },
      );
    });
  };

  const jumpToDocumentComment = (documentCommentId: string) => {
    if (!editorRef.current?.connector) {
      console.error("Editor connector not initialized");
      return;
    }

    try {
      // 使用 executeMethod 跳转到批注
      editorRef.current.connector.executeMethod(
        "MoveToComment",
        [documentCommentId],
        (result: any) => {
          console.log("跳转到批注结果:", result);
        },
      );
    } catch (error) {
      console.error("跳转到批注位置时出错:", error);
    }
  };

  const createComment = async (result: any) => {
    const newComment: Comment = {
      id: crypto.randomUUID(),
      content: result.风险提示,
      additionalContent: result.修改建议,
      riskLevel: result.风险等级,
      userName: "AI审核",
      rangeText: result.原文,
      createdAt: new Date(),
      isLocated: false,
    };

    try {
      // 先在文档中添加批注
      const documentCommentId = await addCommentToDocument(
        result.原文,
        newComment,
      );
      newComment.documentCommentId = documentCommentId;
      newComment.isLocated = true;

      // 保存到数据库
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: docId,
          comment: newComment,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save comment");
      }

      const savedComment = await response.json();

      // 更新状态
      setComments((prevComments) => [...prevComments, savedComment]);
    } catch (error) {
      console.error("创建批注失败:", error);
      // 即使保存失败，也添加到列表中（但标记为未定位）
      setComments((prevComments) => [...prevComments, newComment]);
    }

    return newComment;
  };

  const handleStrictReview = async () => {
    console.log("开始审核，选中的标准ID:", selectedStandard);

    if (!selectedStandard) {
      console.warn("No standard selected");
      return;
    }

    setIsReviewing(true);
    try {
      console.log("正在获取文档内容...");
      const docEditor = editorRef.current;
      console.log("编辑器实例状态:", {
        exists: !!docEditor,
        type: typeof docEditor,
        hasConnector: !!docEditor?.connector,
        hasCallCommand: !!docEditor?.callCommand,
        methods: docEditor ? Object.keys(docEditor) : [],
      });

      if (!docEditor || !docEditor.connector) {
        throw new Error("Editor or connector not initialized");
      }

      // 使用 connector 调用命令获取文档内容
      const mainText = await new Promise((resolve, reject) => {
        try {
          docEditor.connector.callCommand(
            function () {
              try {
                console.log("开始执行文档内容获取...");
                console.log("Api 对象:", typeof Api, Api ? "可用" : "不可用");

                var oDocument = Api.GetDocument();
                console.log("获取到文档对象:", oDocument ? "成功" : "失败");

                if (!oDocument) {
                  throw new Error("Failed to get document object");
                }

                var content = [];
                var eleCount = oDocument.GetElementsCount();

                console.log("文档元素总数:", eleCount);

                // 遍历并记录每个元素的信息
                for (var i = 0; i < eleCount; i++) {
                  try {
                    var ele = oDocument.GetElement(i);
                    var classType = ele.GetClassType();
                    var text = "";

                    try {
                      text = ele.GetText ? ele.GetText() : "";
                    } catch (textError) {
                      console.warn(`获取元素 ${i} 文本失败:`, textError);
                    }

                    console.log(`元素 ${i + 1}:`, {
                      type: classType,
                      hasText: !!ele.GetText,
                      text: text,
                      length: text.length,
                    });

                    if (classType === "paragraph") {
                      content.push(text);
                    }
                  } catch (elementError) {
                    console.warn(`处理元素 ${i} 时出错:`, elementError);
                  }
                }

                var fullText = content.join("\n");
                console.log("成功合并文本");
                return fullText;
              } catch (innerError) {
                console.error("文档内容获取过程出错:", innerError);
                throw innerError;
              }
            },
            function (data, error) {
              console.log("callCommand 回调被触发");
              if (error) {
                console.error("callCommand 回调报错:", error);
                reject(error);
                return;
              }

              console.log("回调收到的文档内容:", {
                type: typeof data,
                length: data?.length || 0,
                preview: data ? data.substring(0, 200) + "..." : "无内容",
              });
              resolve(data || "");
            },
          );
        } catch (error) {
          console.error("执行 callCommand 时发生错误:", error);
          reject(error);
        }
      });

      if (!mainText) {
        console.warn("No document content received");
        throw new Error("Failed to get document content");
      }

      console.log("最终获取到的文档内容:", {
        length: mainText.length,
        preview: mainText.substring(0, 200) + "...",
        fullContent: mainText,
      });

      // 获取标准详情
      console.log("正在获取标准详情...");
      const standardResponse = await fetch(
        `/api/rules?standardId=${selectedStandard}`,
      );
      if (!standardResponse.ok) {
        throw new Error("Failed to fetch rules");
      }
      const rules = await standardResponse.json();
      console.log("获取到规则列表:", rules);

      if (!Array.isArray(rules) || rules.length === 0) {
        throw new Error("No rules found for this standard");
      }

      // 开始逐条规则审核
      console.log(`开始审核 ${rules.length} 条规则...`);
      for (const [index, rule] of rules.entries()) {
        try {
          console.log(`正在审核第 ${index + 1}/${rules.length} 条规则:`, {
            category: rule.category,
            rule: rule,
          });

          setReviewProgress({
            current: index + 1,
            total: rules.length,
            currentRule: rule.category,
          });

          // 调用 AI 审核
          console.log("发送审核请求到 AI...", {
            rule: rule,
            textLength: mainText.length,
          });

          const aiResponse = await fetch("/api/strict-review", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rule, mainText }),
          });

          if (!aiResponse.ok) {
            console.error("AI 审核请求失败:", {
              status: aiResponse.status,
              statusText: aiResponse.statusText,
            });
            throw new Error(
              `AI review failed with status ${aiResponse.status}`,
            );
          }

          const response = await aiResponse.json();
          console.log("收到原始 AI 响应:", response);

          // 解析 JSON 字符串
          let result;
          try {
            // 检查是否是包含 result 字段的对象
            if (response.result) {
              result = JSON.parse(response.result);
              console.log("解析后的 AI 响应:", result);
            } else {
              // 如果直接是数组
              result = response;
            }
          } catch (parseError) {
            console.error("解析 AI 响应失败:", parseError);
            throw new Error("Failed to parse AI response");
          }

          // 处理返回的结果数组
          if (Array.isArray(result)) {
            console.log("开始处理 AI 返回结果:", result);
            for (const item of result) {
              if (item.是否找到风险 === "是") {
                console.log("发现风险项:", item);
                await createComment(item); // 使用 await 等待批注创建完成
              }
            }
          } else {
            console.warn("AI 返回结果不是数组:", result);
          }

          // 继续处理下一条规则
        } catch (ruleError) {
          console.error(`规则 ${rule.category} 审核失败:`, ruleError);
          continue;
        }
      }

      console.log("所有规则审核完成");
    } catch (error) {
      console.error("审核过程出错:", {
        error: error,
        message: error.message,
        stack: error.stack,
      });
      alert(`审核失败：${error.message || "请稍后重试"}`);
    } finally {
      console.log("审核流程结束");
      setIsReviewing(false);
    }
  };

  const handleEditComment = async (
    commentId: string,
    field: "content" | "additionalContent",
    value: string,
  ) => {
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) throw new Error("Failed to update comment");

      setComments((prevComments) =>
        prevComments.map((comment) =>
          comment.id === commentId ? { ...comment, [field]: value } : comment,
        ),
      );
    } catch (error) {
      console.error("Failed to update comment:", error);
    }
  };

  const toggleEditing = (commentId: string) => {
    setComments(
      comments.map((comment) =>
        comment.id === commentId
          ? { ...comment, isEditing: !comment.isEditing }
          : comment,
      ),
    );
  };

  const handleDeleteComment = async (
    commentId: string,
    documentCommentId?: string,
  ) => {
    if (!confirm("确定要删除这条批注吗？")) {
      return;
    }

    try {
      // 1. 删除 OnlyOffice 中的批注
      if (documentCommentId && editorRef.current?.connector) {
        try {
          await new Promise((resolve, reject) => {
            console.log("开始删除文档批注:", documentCommentId);
            editorRef.current.connector.executeMethod(
              "RemoveComments",
              [[documentCommentId]],
              (result: any) => {
                console.log("删除文档批注结果:", result);
                // 即使结果是 undefined 也认为是成功的
                if (result === true || result === undefined) {
                  resolve(true);
                } else {
                  reject(new Error(`Failed to remove comment: ${result}`));
                }
              },
            );
          });
          console.log("文档批注删除成功");
        } catch (error) {
          console.error("删除文档批注失败:", error);
          // 继续执行，不要因为文档批注删除失败而中断整个流程
        }
      }

      // 2. 删除数据库中的批注
      console.log("开始删除数据库批注:", commentId);
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(
          `Failed to delete comment from database: ${response.statusText}`,
        );
      }

      const deletedComment = await response.json();
      console.log("数据库批注删除成功:", deletedComment);

      // 3. 更新状态，移除已删除的批注
      setComments((prevComments) => {
        const newComments = prevComments.filter(
          (comment) => comment.id !== commentId,
        );
        console.log("更新批注列表:", {
          before: prevComments.length,
          after: newComments.length,
        });
        return newComments;
      });

      console.log("批注删除流程完成");
    } catch (error) {
      console.error("删除批注失败:", error);
      alert(`删除批注失败: ${error.message}`);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-none space-y-4">
        <div className="flex gap-2 items-center">
          <Select value={selectedStandard} onValueChange={setSelectedStandard}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="选择审核标准" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {standards.map((standard) => (
                <SelectItem key={standard.id} value={standard.id}>
                  {standard.title}{" "}
                  {standard.user?.name ? `(${standard.user.name})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={handleStrictReview}
            className="bg-primary text-white hover:bg-primary/90"
            disabled={!selectedStandard || isReviewing}
          >
            {isReviewing ? "审核中..." : "严格审核"}
          </Button>
        </div>

        {/* 进度条 */}
        <div className="text-sm text-gray-500">
          {isReviewing ? (
            <>
              正在审核 ({reviewProgress.current}/{reviewProgress.total}):
              {reviewProgress.currentRule}
            </>
          ) : (
            "等待开始审核..."
          )}
          <div className="w-full bg-gray-200 h-2 rounded-full mt-1">
            <div
              className="bg-primary h-full rounded-full transition-all"
              style={{
                width: isReviewing
                  ? `${(reviewProgress.current / reviewProgress.total) * 100}%`
                  : "0%",
              }}
            />
          </div>
        </div>
      </div>

      {/* 批注列表容器 */}
      <div className="flex-1 overflow-hidden">
        <div className="comment-list">
          {isLoading ? (
            <div className="empty-state">加载中...</div>
          ) : comments.length === 0 ? (
            <div className="empty-state">暂无批注</div>
          ) : (
            <>
              <div className="comment-count">共 {comments.length} 条批注</div>
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="comment-item"
                  data-risk={comment.riskLevel}
                  onClick={() =>
                    comment.documentCommentId &&
                    jumpToDocumentComment(comment.documentCommentId)
                  }
                  style={{
                    cursor: comment.documentCommentId ? "pointer" : "default",
                    position: "relative",
                  }}
                >
                  <div className="comment-item__header">
                    <span className="comment-item__header-name">
                      {comment.userName}
                    </span>
                    <div className="comment-item__header-right">
                      <span className="comment-item__header-date">
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                      <span
                        className={`location-status ${comment.isLocated ? "located" : "unlocated"}`}
                      >
                        {comment.isLocated ? "已定位" : "未定位"}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation(); // 防止触发跳转
                          handleDeleteComment(
                            comment.id,
                            comment.documentCommentId,
                          );
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* 原文 */}
                  <div className="comment-item__range">{comment.rangeText}</div>

                  {/* 风险等级 */}
                  <div className={`risk-level risk-level-${comment.riskLevel}`}>
                    风险等级：{comment.riskLevel}
                  </div>

                  <div className="comment-item__content">
                    {/* 风险提示 */}
                    <div className="comment-item__label">风险提示</div>
                    {comment.isEditing ? (
                      <textarea
                        className="comment-item__content-edit"
                        value={comment.content}
                        onChange={(e) =>
                          handleEditComment(
                            comment.id,
                            "content",
                            e.target.value,
                          )
                        }
                        onBlur={() => toggleEditing(comment.id)}
                      />
                    ) : (
                      <div
                        className="comment-item__content"
                        onClick={() => toggleEditing(comment.id)}
                      >
                        {comment.content}
                      </div>
                    )}

                    {/* 修改建议 */}
                    {comment.additionalContent && (
                      <>
                        <div className="comment-item__label mt-2">修改建议</div>
                        {comment.isEditing ? (
                          <textarea
                            className="comment-item__content-edit mt-2"
                            value={comment.additionalContent}
                            onChange={(e) =>
                              handleEditComment(
                                comment.id,
                                "additionalContent",
                                e.target.value,
                              )
                            }
                            onBlur={() => toggleEditing(comment.id)}
                          />
                        ) : (
                          <div
                            className="comment-item__content"
                            onClick={() => toggleEditing(comment.id)}
                          >
                            {comment.additionalContent}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
