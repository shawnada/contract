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
import { toast } from "react-hot-toast";

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
  guid: string;
  content: string;
  additionalContent?: string;
  riskLevel: string;
  userName: string;
  rangeText: string;
  documentCommentId?: string;
  isLocated: boolean;
  createdAt: Date;
}

// 添加 UUID 生成函数
function generateUUID() {
  // 检查是否支持 crypto.randomUUID()
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // 降级方案：手动生成 UUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
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
  const [isAiReviewing, setIsAiReviewing] = useState(false);
  const [isRuleReviewing, setIsRuleReviewing] = useState(false);

  // 移动 parseAIResponse 到组件内部
  const parseAIResponse = async (response: any): Promise<any[]> => {
    let result;
    try {
      // 检查是否是包含 result 字段的对象
      if (response.result) {
        // 清理 markdown 代码块标记和非法字符
        const cleanedResult = response.result
          .replace(/```json\n?/g, "") // 移除开始的 ```json
          .replace(/```\n?/g, "") // 移除结束的 ```
          .trim(); // 移除多余的空白

        console.log("清理后的结果:", cleanedResult);

        try {
          // 首先尝试直接解析
          result = JSON.parse(cleanedResult);
        } catch (firstError) {
          try {
            // 如果直接解析失败，尝试预处理 JSON 字符串
            const preprocessed = cleanedResult
              .replace(/\t/g, " ") // 将制表符替换为空格
              .replace(/\r?\n/g, "\\n") // 处理换行符
              .replace(/\s+/g, " ") // 合并多个空格
              .replace(/\\/g, "\\\\") // 处理反斜杠
              .replace(/\\\\n/g, "\\n") // 修复双重转义的换行符
              .replace(/\\"/g, '\\"') // 处理引号
              .trim();

            result = JSON.parse(preprocessed);
          } catch (secondError) {
            // 如果还是失败，尝试最后的方案
            try {
              // 使用 eval 作为最后的手段（注意：这可能有安全风险）
              const evalResult = eval("(" + cleanedResult + ")");
              if (Array.isArray(evalResult)) {
                result = evalResult;
              } else {
                throw new Error("Eval result is not an array");
              }
            } catch (evalError) {
              console.error("所有解析方法都失败:", {
                firstError,
                secondError,
                evalError,
                cleanedResult,
              });
              throw evalError;
            }
          }
        }
      } else {
        // 如果直接是数组
        result = response;
      }

      if (!Array.isArray(result)) {
        console.warn("解析结果不是数组:", result);
        return [];
      }

      return result;
    } catch (error) {
      console.error("解析 AI 响应失败:", error);
      throw new Error("Failed to parse AI response");
    }
  };

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
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to fetch comments: ${response.status} ${errorText}`,
          );
        }
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

  const addCommentToDocument = async (text: string, commentContent: string) => {
    if (!editorRef.current?.connector) {
      console.error("Editor connector not initialized");
      return;
    }

    // 使用 Asc.scope 传递参数
    (window as any).Asc = {
      scope: {
        searchText: text,
        commentContent: commentContent,
      },
    };

    return new Promise((resolve, reject) => {
      editorRef.current.connector.callCommand(
        function () {
          try {
            var oDocument = Api.GetDocument();

            // 第一步：尝试精确匹配
            var searchResults = oDocument.Search(Asc.scope.searchText);
            if (searchResults && searchResults.length > 0) {
              console.log(
                "精确匹配成功，找到",
                searchResults.length,
                "处匹配位置",
              );
            }

            // 如果精确匹配失败，使用优化的搜索策略
            if (!searchResults || searchResults.length === 0) {
              console.log("精确匹配失败，启动优化搜索策略");

              // 1. 清理和规范化文本
              var normalizedText = Asc.scope.searchText
                .replace(/\s+/g, " ") // 将多个空白字符替换为单个空格
                .trim();

              // 2. 按不同分隔符分割文本
              var segments = [
                ...normalizedText.split(/\s+/), // 按空格分割
                ...normalizedText.split(/[,，.。;；]/), // 按标点符号分割
                ...(normalizedText.match(/[\u4e00-\u9fa5]+/g) || []), // 提取连续汉字
                ...(normalizedText.match(/\d+/g) || []), // 提取连续数字
              ]
                .filter(Boolean) // 移除空值
                .map((s) => s.trim()) // 清理首尾空格
                .filter((s) => s.length > 1); // 过滤掉单字符

              // 3. 按长度降序排序
              segments.sort((a, b) => b.length - a.length);

              console.log("搜索片段:", segments);

              // 4. 尝试搜索最长的片段
              for (var i = 0; i < segments.length; i++) {
                var segment = segments[i];
                if (segment.length < 2) continue; // 跳过过短的片段

                searchResults = oDocument.Search(segment);
                if (searchResults && searchResults.length > 0) {
                  console.log("找到匹配片段:", {
                    segment: segment,
                    originalText: Asc.scope.searchText,
                    matchCount: searchResults.length,
                    matchPositions: searchResults.map(
                      (result: any, index: number) => ({
                        position: index + 1,
                        text: result.GetText(),
                      }),
                    ),
                  });
                  break;
                }
              }

              // 5. 如果还是没找到，尝试更激进的匹配策略
              if (!searchResults || searchResults.length === 0) {
                // 移除所有非中文字符后尝试匹配
                var chineseOnly =
                  normalizedText.match(/[\u4e00-\u9fa5]+/g) || [];
                for (var chinese of chineseOnly) {
                  if (chinese.length < 2) continue;
                  searchResults = oDocument.Search(chinese);
                  if (searchResults && searchResults.length > 0) {
                    console.log("通过中文内容匹配成功:", {
                      text: chinese,
                      matchCount: searchResults.length,
                      matchPositions: searchResults.map(
                        (result: any, index: number) => ({
                          position: index + 1,
                          text: result.GetText(),
                        }),
                      ),
                    });
                    break;
                  }
                }
              }
            }

            if (!searchResults || searchResults.length === 0) {
              console.warn("所有搜索策略均失败:", {
                originalText: Asc.scope.searchText,
              });
              return { error: 1, msg: "未找到匹配文本" };
            }

            // 为每个匹配位置添加批注
            const commentIds = [];
            for (var i = 0; i < searchResults.length; i++) {
              var oRange = searchResults[i];
              var oComments = Api.AddComment(
                oRange,
                Asc.scope.commentContent,
                "AI审核",
                "ai-review",
              );
              commentIds.push(oComments.Comment.Id);
            }

            return {
              error: 0,
              data: commentIds,
              msg: `成功添加 ${commentIds.length} 条批注`,
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

  const createComment = async ({
    groupId,
    content,
    additionalContent,
    riskLevel,
    userName,
    rangeText,
    autoExpand = false,
  }: {
    groupId?: string;
    content: string;
    additionalContent?: string;
    riskLevel: "高" | "中" | "低";
    userName: string;
    rangeText: string;
    autoExpand?: boolean;
  }) => {
    try {
      const commentGroupId = generateUUID();
      const newComment: Comment = {
        id: generateUUID(),
        guid: commentGroupId,
        content,
        additionalContent,
        riskLevel,
        userName,
        rangeText,
        createdAt: new Date(),
        isLocated: false,
      };

      try {
        const commentContent =
          `\u200B[GUID:${commentGroupId}]\u200B` +
          `风险等级：${newComment.riskLevel}\n` +
          `风险提示：${newComment.content}\n` +
          `修改建议：${newComment.additionalContent || "无"}`;

        // 获取所有匹配位置的批注 ID
        const documentCommentIds = await addCommentToDocument(
          newComment.rangeText,
          commentContent,
        );

        // 如果是数组，说明有多个匹配位置
        if (Array.isArray(documentCommentIds)) {
          // 为每个匹配位置创建一个批注记录
          const comments = documentCommentIds.map((documentCommentId) => ({
            ...newComment,
            id: generateUUID(), // 每个批注都需要新的 ID
            documentCommentId,
            isLocated: true,
          }));

          try {
            // 批量保存到数据库
            const response = await fetch("/api/comments", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                documentId: docId,
                comments, // 发送批注数组
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              // 如果是重复评论错误，我们可以继续处理
              if (response.status === 409) {
                console.warn("部分评论可能已存在:", errorData);
                // 可以选择继续处理或者提示用户
              } else {
                throw new Error(
                  `Failed to save comments: ${errorData.details || response.statusText}`,
                );
              }
            }

            const savedComments = await response.json();
            setComments((prevComments) => [...prevComments, ...savedComments]);

            return {
              groupId: commentGroupId,
              commentIds: savedComments.map((c: Comment) => c.id),
            };
          } catch (error) {
            // 如果保存失败，删除已添加的文档批注
            if (editorRef.current?.connector) {
              try {
                await new Promise((resolve) => {
                  editorRef.current.connector.executeMethod(
                    "RemoveComments",
                    [documentCommentIds],
                    resolve,
                  );
                });
              } catch (removeError) {
                console.error(
                  "Failed to remove document comments:",
                  removeError,
                );
              }
            }
            throw error;
          }
        }
      } catch (error) {
        console.error("创建批注失败:", error);
        setComments((prevComments) => [...prevComments, newComment]);
      }
    } catch (error) {
      console.error("创建批注失败:", error);
      throw error;
    }
  };

  const handleStrictReview = async () => {
    try {
      setIsReviewing(true);

      // 获取文档内容
      const mainText = await new Promise((resolve, reject) => {
        try {
          if (!editorRef.current?.connector) {
            reject(new Error("Editor connector not initialized"));
            return;
          }

          // 使用 Asc.scope 来存储和传递数据
          (window as any).Asc = {
            scope: {
              tableContents: [], // 存储表格内容
              paragraphContent: [], // 存储段落内容
              fullContent: "", // 存储最终合并的内容
            },
          };

          // 先获取表格内容
          editorRef.current.connector.callCommand(
            function () {
              try {
                var oDocument = Api.GetDocument();
                var aTables = oDocument.GetAllTables();

                // 遍历所有表格
                if (aTables && aTables.length > 0) {
                  for (
                    var tableIndex = 0;
                    tableIndex < aTables.length;
                    tableIndex++
                  ) {
                    try {
                      var table = aTables[tableIndex];
                      var tableContent = [];
                      var rowsCount = table.GetRowsCount();

                      for (var row = 0; row < rowsCount; row++) {
                        var rowContent = [];
                        var currentRow = table.GetRow(row);
                        var cellsCount = currentRow.GetCellsCount();

                        for (var cell = 0; cell < cellsCount; cell++) {
                          try {
                            var currentCell = currentRow.GetCell(cell);
                            var paragraphs = currentCell
                              .GetContent()
                              .GetAllParagraphs();
                            var cellText = "";

                            for (var p = 0; p < paragraphs.length; p++) {
                              cellText += paragraphs[p].GetText() + " ";
                            }

                            rowContent.push(cellText.trim());
                          } catch (cellError) {
                            rowContent.push("");
                          }
                        }

                        tableContent.push(rowContent.join("\t")); // 使用制表符分隔单元格
                      }

                      // 使用 Asc.scope 存储表格内容
                      Asc.scope.tableContents.push(
                        `表格${tableIndex + 1}：\n${tableContent.join("\n")}\n`,
                      );
                    } catch (tableError) {
                      console.error(
                        `处理表格 ${tableIndex + 1} 时出错:`,
                        tableError,
                      );
                    }
                  }
                }

                // 获取段落内容
                var eleCount = oDocument.GetElementsCount();
                for (var i = 0; i < eleCount; i++) {
                  try {
                    var ele = oDocument.GetElement(i);
                    if (ele.GetClassType() === "paragraph") {
                      var text = ele.GetText ? ele.GetText() : "";
                      if (text.trim()) {
                        Asc.scope.paragraphContent.push(text);
                      }
                    }
                  } catch (elementError) {
                    console.warn(`处理元素 ${i} 时出错:`, elementError);
                  }
                }

                // 合并所有内容
                Asc.scope.fullContent = [
                  ...Asc.scope.paragraphContent,
                  "", // 添加空行分隔
                  "表格内容：",
                  ...Asc.scope.tableContents,
                ].join("\n");

                return Asc.scope.fullContent;
              } catch (error) {
                console.error("获取文档内容时出错:", error);
                return "";
              }
            },
            function (result) {
              if (!result) {
                reject(new Error("Failed to get document content"));
                return;
              }
              resolve(result);
            },
          );
        } catch (error) {
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

          // 处理返回的结果
          const result = await parseAIResponse(response);
          if (Array.isArray(result)) {
            console.log("开始处理 AI 返回结果:", result);
            for (const item of result) {
              if (item.是否找到风险 === "是") {
                console.log("发现风险项:", item);
                await createComment({
                  content: `${item.风险提示}${
                    item.主要增加哪方的风险
                      ? `\n主要增加${item.主要增加哪方的风险}的风险`
                      : ""
                  }`,
                  additionalContent: item.修改建议,
                  riskLevel: item.风险等级 as "高" | "中" | "低",
                  userName: "System",
                  rangeText: item.原文,
                  autoExpand: false,
                });
                console.log("批注创建成功");
              }
            }
          }

          // 继续处理下一条规则
        } catch (ruleError) {
          console.error(`规则 ${rule.category} 审核失败:`, ruleError);
          continue;
        }
      }

      console.log("所有规则审核完成");
    } catch (error) {
      console.error("审核过程出错:", error);
      alert(`审核失败：${error.message || "请稍后重试"}`);
    } finally {
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

  const handleAiReview = async () => {
    if (!selectedStandard) return;

    setIsAiReviewing(true);
    try {
      const mainText = await getDocumentContent();
      const standard = standards.find((s) => s.id === selectedStandard);
      if (!standard) return;

      // 获取规则列表
      const rules = await getRules(standard.id);
      if (!rules || rules.length === 0) {
        toast.error("未找到审核规则");
        return;
      }

      // 设置进度信息
      setReviewProgress({
        current: 0,
        total: rules.length,
        currentRule: "",
      });

      // 逐条审核规则
      for (let i = 0; i < rules.length; i++) {
        const rule = rules[i];
        setReviewProgress({
          current: i + 1,
          total: rules.length,
          currentRule: rule.title || "",
        });

        try {
          const response = await fetch("/api/ai-review", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rule, mainText }),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await parseAIResponse(await response.json());
          if (Array.isArray(result)) {
            for (const item of result) {
              if (item.是否找到风险 === "是" && item.原文) {
                console.log("发现风险项:", item);
                await createComment({
                  content: `${item.风险提示}${
                    item.主要增加哪方的风险
                      ? `\n主要增加${item.主要增加哪方的风险}的风险`
                      : ""
                  }`,
                  additionalContent: item.修改建议,
                  riskLevel: item.风险等级 as "高" | "中" | "低",
                  userName: "System",
                  rangeText: item.原文,
                  autoExpand: false,
                });
                console.log("批注创建成功");
              }
            }
          }
        } catch (error) {
          console.error("规则审核失败:", error);
          toast.error(`规则 "${rule.title}" 审核失败`);
        }
      }

      toast.success("审核完成");
    } catch (error) {
      console.error("审核过程出错:", error);
      toast.error("审核过程出错");
    } finally {
      setIsAiReviewing(false);
      setReviewProgress({
        current: 0,
        total: 0,
        currentRule: "",
      });
    }
  };

  const getDocumentContent = async () => {
    return new Promise((resolve, reject) => {
      try {
        if (!editorRef.current?.connector) {
          reject(new Error("Editor connector not initialized"));
          return;
        }

        // 使用 Asc.scope 来存储和传递数据
        (window as any).Asc = {
          scope: {
            tableContents: [], // 存储表格内容
            paragraphContent: [], // 存储段落内容
            fullContent: "", // 存储最终合并的内容
          },
        };

        // 获取文档内容
        editorRef.current.connector.callCommand(
          function () {
            try {
              var oDocument = Api.GetDocument();
              var aTables = oDocument.GetAllTables();

              // 遍历所有表格
              if (aTables && aTables.length > 0) {
                for (
                  var tableIndex = 0;
                  tableIndex < aTables.length;
                  tableIndex++
                ) {
                  try {
                    var table = aTables[tableIndex];
                    var tableContent = [];
                    var rowsCount = table.GetRowsCount();

                    for (var row = 0; row < rowsCount; row++) {
                      var rowContent = [];
                      var currentRow = table.GetRow(row);
                      var cellsCount = currentRow.GetCellsCount();

                      for (var cell = 0; cell < cellsCount; cell++) {
                        try {
                          var currentCell = currentRow.GetCell(cell);
                          var paragraphs = currentCell
                            .GetContent()
                            .GetAllParagraphs();
                          var cellText = "";

                          for (var p = 0; p < paragraphs.length; p++) {
                            cellText += paragraphs[p].GetText() + " ";
                          }

                          rowContent.push(cellText.trim());
                        } catch (cellError) {
                          rowContent.push("");
                        }
                      }

                      tableContent.push(rowContent.join("\t")); // 使用制表符分隔单元格
                    }

                    // 使用 Asc.scope 存储表格内容
                    Asc.scope.tableContents.push(
                      `表格${tableIndex + 1}：\n${tableContent.join("\n")}\n`,
                    );
                  } catch (tableError) {
                    console.error(
                      `处理表格 ${tableIndex + 1} 时出错:`,
                      tableError,
                    );
                  }
                }
              }

              // 获取段落内容
              var eleCount = oDocument.GetElementsCount();
              for (var i = 0; i < eleCount; i++) {
                try {
                  var ele = oDocument.GetElement(i);
                  if (ele.GetClassType() === "paragraph") {
                    var text = ele.GetText ? ele.GetText() : "";
                    if (text.trim()) {
                      Asc.scope.paragraphContent.push(text);
                    }
                  }
                } catch (elementError) {
                  console.warn(`处理元素 ${i} 时出错:`, elementError);
                }
              }

              // 合并所有内容
              Asc.scope.fullContent = [
                ...Asc.scope.paragraphContent,
                "", // 添加空行分隔
                "表格内容：",
                ...Asc.scope.tableContents,
              ].join("\n");

              return Asc.scope.fullContent;
            } catch (error) {
              console.error("获取文档内容时出错:", error);
              return "";
            }
          },
          function (result) {
            if (!result) {
              reject(new Error("Failed to get document content"));
              return;
            }
            resolve(result);
          },
        );
      } catch (error) {
        reject(error);
      }
    });
  };

  const getRules = async (standardId: string) => {
    const response = await fetch(`/api/rules?standardId=${standardId}`);
    if (!response.ok) {
      throw new Error("Failed to fetch rules");
    }
    return response.json();
  };

  const handleRuleReview = async () => {
    if (!selectedStandard) return;

    setIsRuleReviewing(true);
    try {
      const mainText = await getDocumentContent();
      const standard = standards.find((s) => s.id === selectedStandard);
      if (!standard) return;

      const rules = await getRules(standard.id);
      if (!rules || rules.length === 0) {
        toast.error("未找到审核规则");
        return;
      }

      // 设置进度信息
      setReviewProgress({
        current: 0,
        total: rules.length,
        currentRule: "",
      });

      // 逐条审核规则
      for (let i = 0; i < rules.length; i++) {
        const rule = rules[i];
        setReviewProgress({
          current: i + 1,
          total: rules.length,
          currentRule: rule.title || "",
        });

        try {
          const response = await fetch("/api/rule-review", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rule, mainText }),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await parseAIResponse(await response.json());
          if (Array.isArray(result)) {
            for (const item of result) {
              if (item.是否找到风险 === "是" && item.原文) {
                console.log("发现风险项:", item);
                await createComment({
                  content: `${item.风险提示}${
                    item.主要增加哪方的风险
                      ? `\n主要增加${item.主要增加哪方的风险}的风险`
                      : ""
                  }`,
                  additionalContent: item.修改建议,
                  riskLevel: item.风险等级 as "高" | "中" | "低",
                  userName: "System",
                  rangeText: item.原文,
                  autoExpand: false,
                });
                console.log("批注创建成功");
              }
            }
          }
        } catch (error) {
          console.error("规则审核失败:", error);
          toast.error(`规则 "${rule.title}" 审核失败`);
        }
      }

      toast.success("审核完成");
    } catch (error) {
      console.error("审核过程出错:", error);
      toast.error("审核过程出错");
    } finally {
      setIsRuleReviewing(false);
      setReviewProgress({
        current: 0,
        total: 0,
        currentRule: "",
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-none space-y-4">
        <div className="flex flex-col gap-4">
          <div className="w-full">
            <Select
              value={selectedStandard}
              onValueChange={setSelectedStandard}
            >
              <SelectTrigger className="w-full">
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
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleStrictReview}
              className="bg-primary text-white hover:bg-primary/90"
              disabled={!selectedStandard || isReviewing}
            >
              {isReviewing ? "审核中..." : "合同审核"}
            </Button>

            <Button
              onClick={handleAiReview}
              className="bg-primary text-white hover:bg-primary/90"
              disabled={!selectedStandard || isAiReviewing}
            >
              {isAiReviewing ? "审核中..." : "病历质控测试"}
            </Button>

            <Button
              onClick={handleRuleReview}
              className="bg-primary text-white hover:bg-primary/90"
              disabled={!selectedStandard || isRuleReviewing}
            >
              {isRuleReviewing ? "规则提炼中..." : "规则提炼"}
            </Button>
          </div>
        </div>

        {/* 进度条 */}
        <div className="text-sm text-gray-500">
          {isReviewing || isAiReviewing ? (
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
                width:
                  isReviewing || isAiReviewing
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
