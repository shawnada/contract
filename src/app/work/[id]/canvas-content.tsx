"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X } from "lucide-react";
import Editor, {
  Command,
  EditorZone,
  ElementType,
  IElement,
  IEditorOption,
} from "@hufe921/canvas-editor";
import docxPlugin from "@hufe921/canvas-editor-plugin-docx";
import "./CanvasEditor.css";
import debounce from "lodash.debounce";
import { updateDoc } from "./action";
import {
  getComments,
  createCommentInDb,
  updateComment,
  deleteComment,
} from "./comment-action";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getStandards } from "../api/standards";
import { useEditorContext } from "./editor-context";

interface Standard {
  id: string;
  title: string;
  user?: {
    name: string;
  };
}

// 编辑器配置
export const options: IEditorOption = {
  margins: [100, 100, 100, 100],
  // 水印
  watermark: {
    data: "ZLSOFT",
    size: 80,
  },
  // 页码
  pageNumber: {
    format: "第{pageNo}页/共{pageCount}页",
  },
  // 占位符
  placeholder: {
    data: "请输入正文",
  },
  // 提示
  zone: {
    tipDisabled: false,
  },
  // 遮罩层
  maskMargin: [160, 160, 160, 160],
  // 新增页面边框配置
  pageBorder: {
    color: "#CCCCCC", // 默认边框颜色
    lineWidth: 1, // 默认边框宽度
    padding: [10, 10, 10, 10], // 默认内边距
  },
};

// 批注接口
interface IComment {
  groupId: string;
  content: string;
  additionalContent?: string;
  riskLevel?: "高" | "中" | "低";
  userName: string;
  rangeText: string;
  createdDate: string;
}

// 防抖保存批注内容
const saveComment = debounce(
  (
    groupId: string,
    docId: string,
    data: {
      content?: string;
      additionalContent?: string;
      riskLevel?: string;
    },
  ) => {
    updateComment(groupId, docId, data);
  },
  1000,
);

// 首先添加 UUID 生成函数
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function CanvasEditor({
  id,
  content,
}: {
  id: string;
  content: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { editorRef } = useEditorContext();
  const [commentList, setCommentList] = useState<IComment[]>([]);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [canEditComment, setCanEditComment] = useState(true);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [selectedStandard, setSelectedStandard] = useState<string>("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewProgress, setReviewProgress] = useState<{
    current: number;
    total: number;
    currentRule?: string;
  }>({ current: 0, total: 0 });
  const [reviewLogs, setReviewLogs] = useState<
    Array<{
      type: "info" | "warn" | "error";
      message: string;
      timestamp: string;
    }>
  >([]);

  // 新增一个 ref 来处理点击事件
  const commentEditRef = useRef<{
    isEditing: boolean;
    clickTimeout: NodeJS.Timeout | null;
  }>({
    isEditing: false,
    clickTimeout: null,
  });

  // 更新防抖保存函数
  const saveContent = debounce((id: string, content: any) => {
    try {
      // 处理 canvas-editor ��回的复杂数据结构
      const contentToSave = JSON.stringify(content.data || content);

      console.log("保存内容:", {
        id,
        contentLength: contentToSave.length,
        contentPreview: contentToSave.slice(0, 100) + "...",
        mainContent:
          content.data?.main?.map((item: any) => item.value).join("") ||
          content.main?.map((item: any) => item.value).join("") ||
          "",
      });

      updateDoc(id, { content: contentToSave });
    } catch (error) {
      console.error("保存内容发生错误:", error);
    }
  }, 1000);

  // 1. 首先定义所有回调函数
  const createComment = useCallback(
    async (params: {
      groupId: string;
      content?: string;
      additionalContent?: string;
      riskLevel?: "高" | "中" | "低";
      userName: string;
      rangeText: string;
      autoExpand?: boolean;
    }) => {
      await createCommentInDb(id, {
        groupId: params.groupId,
        content: params.content || "",
        additionalContent: params.additionalContent,
        riskLevel: params.riskLevel,
        userName: params.userName,
        rangeText: params.rangeText,
      });

      const newComment: IComment = {
        groupId: params.groupId,
        content: params.content || "",
        additionalContent: params.additionalContent,
        riskLevel: params.riskLevel,
        userName: params.userName,
        rangeText: params.rangeText,
        createdDate: new Date().toLocaleString(),
      };

      setCommentList((prev) => [...prev, newComment]);
      if (params.autoExpand) {
        setActiveCommentId(newComment.groupId);
        setEditingCommentId(newComment.groupId);
      }
    },
    [id],
  );

  const handleAddComment = useCallback(
    (command: Command) => {
      const groupId = command.executeSetGroup();
      if (!groupId) return;

      createComment({
        groupId,
        userName: "User",
        rangeText: command.getRangeText(),
        autoExpand: true,
      });
    },
    [createComment],
  );

  const handleImportDocx = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".docx";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          (editorRef.current?.command as any).executeImportDocx({
            arrayBuffer: arrayBuffer,
          });
        } catch (error) {
          console.error("Error importing DOCX:", error);
          alert("导入Word文档失败");
        }
      }
    };
    input.click();
  }, [editorRef]);

  const handleExportDocx = useCallback(() => {
    try {
      (editorRef.current?.command as any).executeExportDocx({
        fileName: `document_${new Date().toISOString().replace(/:/g, "-")}.docx`,
      });
    } catch (error) {
      console.error("Error exporting DOCX:", error);
      alert("导出Word文档失败");
    }
  }, [editorRef]);

  // 2. 然后是 useEffect
  useEffect(() => {
    if (containerRef.current) {
      const initializeEditor = () => {
        try {
          // 检查容器尺寸
          if (!containerRef.current?.offsetWidth) {
            console.warn("Container not ready, retrying...");
            setTimeout(initializeEditor, 100); // 如果容器未准备好，100ms后重试
            return;
          }

          // 尝试解析初始内容
          let initialData: {
            header?: IElement[];
            main?: IElement[];
            footer?: IElement[];
          } = {};
          try {
            initialData = content
              ? JSON.parse(content)
              : {
                  header: [{ value: "", size: 15 }],
                  main: [{ value: "", size: 16 }],
                  footer: [{ value: "", size: 12 }],
                };
          } catch (error) {
            console.error("解析初始内容失败", error);
            initialData = {
              header: [{ value: "", size: 15 }],
              main: [{ value: "", size: 16 }],
              footer: [{ value: "", size: 12 }],
            };
          }

          // 确保每个部分都有默认值
          const editorData = {
            header: initialData.header || [{ value: "", size: 15 }],
            main: initialData.main || [{ value: "", size: 16 }],
            footer: initialData.footer || [{ value: "", size: 12 }],
          };

          // 检查现有的编辑器实例
          if (editorRef.current) {
            editorRef.current.destroy();
            editorRef.current = null;
          }

          const editor = new Editor(containerRef.current, editorData, options);
          editor.use(docxPlugin);
          editorRef.current = editor;

          // 增加详细的内容变化日志
          editor.listener.contentChange = () => {
            if (!editor || !editor.command) return;

            console.log("内容发生变化");
            const currentContent = editor.command.getValue();
            saveContent(id, currentContent);
          };

          // 注册右键菜单
          editor.register.contextMenuList([
            {
              name: "批注",
              when: (payload) => {
                return (
                  !payload.isReadonly &&
                  payload.editorHasSelection &&
                  payload.zone === EditorZone.MAIN
                );
              },
              callback: (command: Command) => {
                handleAddComment(command);
              },
            },
            {
              name: "导入Word",
              when: (payload) => {
                return !payload.isReadonly;
              },
              callback: () => {
                handleImportDocx();
              },
            },
            {
              name: "导出Word",
              when: (payload) => {
                return !payload.isReadonly;
              },
              callback: () => {
                handleExportDocx();
              },
            },
          ]);
        } catch (error) {
          console.error("Editor initialization failed:", error);
          // 可以在这里添加用户提示
          alert("编辑器初始化失败，请刷新页面重试");
        }
      };

      // 启动初始化流程
      initializeEditor();
    }

    return () => {
      if (editorRef.current) {
        try {
          editorRef.current.destroy();
        } catch (error) {
          console.error("Error destroying editor:", error);
        }
        editorRef.current = null;
      }
    };
  }, [
    content,
    id,
    editorRef,
    handleAddComment,
    handleExportDocx,
    handleImportDocx,
    saveContent,
  ]);

  // 在组件加载时获取批注
  useEffect(() => {
    async function fetchComments() {
      const comments = await getComments(id);
      setCommentList(
        comments.map(
          (comment: {
            groupId: string;
            content: string;
            additionalContent?: string;
            riskLevel?: string;
            userName: string;
            rangeText: string;
            createdDate: Date;
          }) => ({
            ...comment,
            createdDate: comment.createdDate.toLocaleString(),
          }),
        ),
      );
    }
    fetchComments();
  }, [id]);

  // 定位到批注
  const handleLocateComment = (groupId: string) => {
    // 如果是手动创建的批注（没有高亮），则不执行定位
    if (groupId.startsWith("manual-")) {
      console.log("This is a non-highlighted comment, skipping location");
      return;
    }

    try {
      const comment = commentList.find((c) => c.groupId === groupId);
      if (comment?.groupId) {
        editorRef.current?.command.executeLocationGroup(comment.groupId);
      }
    } catch (error) {
      console.error("Error locating comment:", error);
    }
  };

  // 修改删除批注的方法
  const handleDeleteComment = async (groupId: string) => {
    try {
      // 直接使用 groupId 删除编辑器中的高亮
      editorRef.current?.command.executeDeleteGroup(groupId);

      const result = await deleteComment(groupId, id);
      if (result.success) {
        setCommentList((prev) => prev.filter((c) => c.groupId !== groupId));
      } else {
        console.error("Failed to delete comment:", result.error);
      }
    } catch (error) {
      console.error("Error in handleDeleteComment:", error);
    }
  };

  // 修改更新批注的方法
  const handleUpdateComment = async (
    groupId: string,
    field: "content" | "additionalContent" | "riskLevel",
    newContent: string,
  ) => {
    // 立即更新 UI
    setCommentList((prev) =>
      prev.map((comment) =>
        comment.groupId === groupId
          ? {
              ...comment,
              [field]: newContent,
            }
          : comment,
      ),
    );

    // 防抖保存到数据库
    saveComment(groupId, id, {
      [field]: newContent,
    });
  };

  // 修改 textarea 的 onBlur 处理
  const handleCommentBlur = (groupId: string) => {
    // 清除之前的延时器
    if (commentEditRef.current.clickTimeout) {
      clearTimeout(commentEditRef.current.clickTimeout);
    }

    // 添加新的延时器
    commentEditRef.current.clickTimeout = setTimeout(() => {
      // 只有在非编辑状态下才退出
      if (!commentEditRef.current.isEditing) {
        setEditingCommentId(null);
      }
      commentEditRef.current.isEditing = false;
      commentEditRef.current.clickTimeout = null;
    }, 200);
  };

  // 修改点击进入编辑状态的方法
  const handleStartEditComment = (groupId: string, e: React.MouseEvent) => {
    // 阻止事件冒泡
    e.stopPropagation();

    // 清除之前的延时器
    if (commentEditRef.current.clickTimeout) {
      clearTimeout(commentEditRef.current.clickTimeout);
    }

    // 设置编辑状态
    setEditingCommentId(groupId);
    commentEditRef.current.isEditing = true;
  };

  // 修改点击事件处理
  const handleCommentItemClick = (groupId: string) => {
    // 果正在编辑，不进行定位
    if (commentEditRef.current.isEditing) return;

    handleLocateComment(groupId);
    setActiveCommentId(groupId);
  };

  const handleSearchAndHighlight = async (standardId: string) => {
    setIsReviewing(true);
    try {
      // 1. 先检查 editorRef.current 是否存在
      const editor = editorRef.current;
      if (!editor) {
        console.error("Editor not initialized");
        return;
      }

      // 2. 获取富文本全文
      const fullText = editor.command.getValue().data;
      if (!fullText) {
        console.warn("No text content in editor");
        return;
      }
      const mainText =
        fullText.main?.map((item: any) => item.value).join("") || "";
      console.log("Editor Content:", { mainText });

      // 3. 获取选中标准的所有规则
      const response = await fetch(`/api/rules?standardId=${standardId}`);
      const rules = await response.json();

      // 设置进度初始值
      setReviewProgress({
        current: 0,
        total: rules.length,
        currentRule: rules[0]?.category,
      });

      // 逐条规则进行审核
      for (const [index, rule] of rules.entries()) {
        setReviewProgress({
          current: index + 1,
          total: rules.length,
          currentRule: rule.category,
        });

        console.group(`正在审核规则: ${rule.category}`);
        console.log("当前规则详情:", rule);

        let isValidResponse = false;
        let retryCount = 0;
        const MAX_RETRIES = 3;

        while (!isValidResponse && retryCount < MAX_RETRIES) {
          const aiResponse = await fetch("/api/strict-review", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              rule,
              mainText,
            }),
          });

          console.log("API Response status:", aiResponse.status);
          const responseData = await aiResponse.json();
          console.log("API Response data:", responseData);

          if (!aiResponse.ok) {
            throw new Error(
              responseData.error || "Strict review request failed",
            );
          }

          const { result: responseText } = responseData;
          console.log("AI 原始响应:", responseText);

          try {
            const cleanedResponseText = responseText
              .replace(/^```json\s*/, "")
              .replace(/```$/, "")
              .trim();
            const riskData = JSON.parse(cleanedResponseText);

            // 打印解析后的风险数据
            console.log("解析后的风险数据:", {
              ruleId: rule.id,
              riskCount: riskData.length,
              risks: riskData,
            });

            // 检查每个风险项
            for (const item of riskData) {
              if (item.是否找到风险 === "否") {
                console.log("未找到风险，跳过当前规则");
                isValidResponse = true;
                break;
              }

              if (item.是否找到风险 === "是") {
                if (item.是否符合要求 === "是") {
                  try {
                    const keyword = item.原文;
                    addLog("info", `尝试定位关键词: ${keyword}`);

                    // 使用编辑器的命令查找和高亮文本
                    const command = editor.command as any;
                    const rangeList = command.getKeywordRangeList(keyword);

                    if (Array.isArray(rangeList) && rangeList.length > 0) {
                      addLog("info", `找到 ${rangeList.length} 处匹配文本`);

                      // 找到匹配的文本，创建高亮批注
                      for (const [rangeIndex, range] of rangeList.entries()) {
                        try {
                          addLog(
                            "info",
                            `处理第 ${rangeIndex + 1}/${rangeList.length} 处匹配`,
                          );

                          range.startIndex -= 1;
                          command.executeReplaceRange(range);
                          const groupId = command.executeSetGroup();

                          if (groupId) {
                            addLog("info", "创建批注成功");
                            await createComment({
                              groupId,
                              content: `${item.风险提示}${
                                item.主要增加哪方的风险
                                  ? `\n主要增加${item.主要增加哪方的风险}的风险`
                                  : ""
                              }`,
                              additionalContent: item.修改建议,
                              riskLevel: item.风险等级 as "高" | "中" | "低",
                              userName: "System",
                              rangeText: keyword,
                              autoExpand: false,
                            });
                          } else {
                            addLog("warn", "未能获取到 groupId");
                          }
                        } catch (error) {
                          addLog("error", `创建高亮批注失败: ${error.message}`);
                        }
                      }
                    } else {
                      // 如果找不到匹配的文本，创建不带高亮的普通批注
                      addLog("warn", `未找到匹配文本: "${keyword}"`);
                      try {
                        const manualGroupId = generateUUID();
                        addLog("info", "创建普通批注");

                        await createComment({
                          groupId: manualGroupId,
                          content: `${item.风险提示}${
                            item.主要增加哪方的风险
                              ? `\n主要增加${item.主要增加哪方的风险}的风险`
                              : ""
                          }`,
                          additionalContent: item.修改建议,
                          riskLevel: item.风险等级 as "高" | "中" | "低",
                          userName: "System",
                          rangeText: `原文："${keyword}"（未找到原文，请手动定位）`,
                          autoExpand: false,
                        });
                        addLog("info", "普通批注创建成功");
                      } catch (error) {
                        addLog("error", `创建普通批注失败: ${error.message}`);
                      }
                    }
                    isValidResponse = true;
                  } catch (error) {
                    addLog("error", `处理风险项失败: ${error.message}`);
                  }
                } else {
                  console.log("审核结果不符合要求，原因:", item.不符合原因);
                  console.log("重试第", retryCount + 1, "次");
                  retryCount++;
                  break;
                }
              }
            }
          } catch (parseError) {
            console.error("JSON解析错误:", {
              error: parseError,
              responseText: responseText,
            });
            retryCount++;
          }
        }

        if (retryCount >= MAX_RETRIES) {
          console.warn(`规则 ${rule.category} 达到最大重试次数，跳过`);
        }

        console.groupEnd();
      }
    } catch (error) {
      console.error("Error in handleSearchAndHighlight:", error);
      // 显示错误提示
      alert("自动审核失败，请稍后重试");
    } finally {
      setIsReviewing(false);
    }
  };

  const handleStrictReview = async (standardId: string) => {
    setIsReviewing(true);
    const editor = editorRef.current;
    if (!editor) {
      console.warn("Editor not initialized");
      setIsReviewing(false);
      return;
    }

    try {
      // 获取富文本全文
      const fullText = editor.command.getValue().data;
      if (!fullText) {
        console.warn("No text content in editor");
        setIsReviewing(false);
        return;
      }
      const mainText =
        fullText.main?.map((item: any) => item.value).join("") || "";

      // 打印文档内容
      console.log(`待审核的文档内容 (总长度: ${mainText.length} 字符):`);
      console.log(mainText);
      console.log("----------------------------------------");

      // 获取选中的规则
      const response = await fetch(`/api/rules?standardId=${standardId}`);
      const rules = await response.json();

      // 设置进度初始值
      setReviewProgress({
        current: 0,
        total: rules.length,
        currentRule: rules[0]?.category,
      });

      // 逐条规则进行审核
      for (const [index, rule] of rules.entries()) {
        setReviewProgress({
          current: index + 1,
          total: rules.length,
          currentRule: rule.category,
        });

        console.group(`正在审核规则: ${rule.category}`);
        console.log("当前规则详情:", rule);

        let isValidResponse = false;
        let retryCount = 0;
        const MAX_RETRIES = 3;

        while (!isValidResponse && retryCount < MAX_RETRIES) {
          const aiResponse = await fetch("/api/strict-review", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              rule,
              mainText,
            }),
          });

          console.log("API Response status:", aiResponse.status);
          const responseData = await aiResponse.json();
          console.log("API Response data:", responseData);

          if (!aiResponse.ok) {
            throw new Error(
              responseData.error || "Strict review request failed",
            );
          }

          const { result: responseText } = responseData;
          console.log("AI 原始响应:", responseText);

          try {
            const cleanedResponseText = responseText
              .replace(/^```json\s*/, "")
              .replace(/```$/, "")
              .trim();
            const riskData = JSON.parse(cleanedResponseText);

            // 打印解析后的风险数据概览
            console.group(`规则 ${rule.category} 的风险数据处理`);
            console.log("找到风险项数量:", riskData.length);

            // 检查每个风险项
            for (const [index, item] of riskData.entries()) {
              console.group(`处理第 ${index + 1}/${riskData.length} 个风险项`);
              console.log("风险项详情:", item);

              if (item.是否找到风险 === "否") {
                console.log("未找到风险，跳过当前规则");
                console.groupEnd();
                isValidResponse = true;
                break;
              }

              if (item.是否找到风险 === "是") {
                if (item.是否符合要求 === "是") {
                  try {
                    const keyword = item.原文;
                    addLog("info", `尝试定位关键词: ${keyword}`);

                    // 使用编辑器的命令查找和高亮文本
                    const command = editor.command as any;
                    const rangeList = command.getKeywordRangeList(keyword);

                    if (Array.isArray(rangeList) && rangeList.length > 0) {
                      addLog("info", `找到 ${rangeList.length} 处匹配文本`);

                      // 找到匹配的文本，创建高亮批注
                      for (const [rangeIndex, range] of rangeList.entries()) {
                        try {
                          addLog(
                            "info",
                            `处理第 ${rangeIndex + 1}/${rangeList.length} 处匹配`,
                          );

                          range.startIndex -= 1;
                          command.executeReplaceRange(range);
                          const groupId = command.executeSetGroup();

                          if (groupId) {
                            addLog("info", "创建批注成功");
                            await createComment({
                              groupId,
                              content: `${item.风险提示}${
                                item.主要增加哪方的风险
                                  ? `\n主要增加${item.主要增加哪方的风险}的风险`
                                  : ""
                              }`,
                              additionalContent: item.修改建议,
                              riskLevel: item.风险等级 as "高" | "中" | "低",
                              userName: "System",
                              rangeText: keyword,
                              autoExpand: false,
                            });
                          } else {
                            addLog("warn", "未能获取到 groupId");
                          }
                        } catch (error) {
                          addLog("error", `创建高亮批注失败: ${error.message}`);
                        }
                      }
                    } else {
                      // 如果找不到匹配的文本，创建不带高亮的普通批注
                      addLog("warn", `未找到匹配文本: "${keyword}"`);
                      try {
                        const manualGroupId = generateUUID();
                        addLog("info", "创建普通批注");

                        await createComment({
                          groupId: manualGroupId,
                          content: `${item.风险提示}${
                            item.主要增加哪方的风险
                              ? `\n主要增加${item.主要增加哪方的风险}的风险`
                              : ""
                          }`,
                          additionalContent: item.修改建议,
                          riskLevel: item.风险等级 as "高" | "中" | "低",
                          userName: "System",
                          rangeText: `原文："${keyword}"（未找到原文，请手动定位）`,
                          autoExpand: false,
                        });
                        addLog("info", "普通批注创建成功");
                      } catch (error) {
                        addLog("error", `创建普通批注失败: ${error.message}`);
                      }
                    }
                    isValidResponse = true;
                  } catch (error) {
                    addLog("error", `处理风险项失败: ${error.message}`);
                  }
                } else {
                  console.warn("审核结果不符合要求，原因:", item.不符合原因);
                  console.log("重试第", retryCount + 1, "次");
                  retryCount++;
                }
              }
              console.groupEnd(); // 结束当前风险项的分组
            }
            console.groupEnd(); // 结束当前规则的分组
          } catch (parseError) {
            console.error("JSON解析错误:", {
              error: parseError,
              responseText: responseText,
            });
            retryCount++;
          }
        }

        if (retryCount >= MAX_RETRIES) {
          console.warn(`规则 ${rule.category} 达到最大重试次数，跳过`);
        }

        console.groupEnd();
      }
    } catch (error) {
      console.error("Review error details:", error);
      alert("审核失败：" + (error.message || "请稍后重试"));
    } finally {
      setIsReviewing(false);
      setReviewProgress({ current: 0, total: 0 });
    }
  };

  const addLog = useCallback(
    (type: "info" | "warn" | "error", message: string) => {
      setReviewLogs((prev) => [
        ...prev,
        {
          type,
          message,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    },
    [],
  );

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

  return (
    <div className="canvas-editor-container">
      <div className="canvas-editor" ref={containerRef}></div>
      <div className="comment">
        <div className="comment-header">
          <div className="flex gap-2 mb-4 items-center">
            <Select
              value={selectedStandard}
              onValueChange={setSelectedStandard}
              className="w-[200px]"
            >
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
              onClick={async () => {
                if (!selectedStandard) {
                  console.warn("No standard selected");
                  return;
                }
                await handleStrictReview(selectedStandard);
              }}
              className="bg-primary text-white hover:bg-primary/90"
              disabled={!selectedStandard || isReviewing}
            >
              {isReviewing ? "审核中..." : "严格审核"}
            </Button>
            <Button
              onClick={async () => {
                if (!selectedStandard) {
                  console.warn("No standard selected");
                  return;
                }
                await handleSearchAndHighlight(selectedStandard);
              }}
              className="bg-primary text-white hover:bg-primary/90"
              disabled={!selectedStandard || isReviewing}
            >
              {isReviewing ? "审核中..." : "测试用"}
            </Button>
          </div>
          <div className="text-sm text-gray-500 mb-2">
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
          <div className="mt-2 p-2 bg-gray-50 rounded-md h-32 overflow-auto text-sm">
            {reviewLogs.length === 0 ? (
              <div className="text-gray-400 text-center py-2">
                暂无审核日志...
              </div>
            ) : (
              reviewLogs.map((log, index) => (
                <div
                  key={index}
                  className={`mb-1 ${
                    log.type === "error"
                      ? "text-red-600"
                      : log.type === "warn"
                        ? "text-yellow-600"
                        : "text-gray-600"
                  }`}
                >
                  <span className="text-gray-400 mr-2">[{log.timestamp}]</span>
                  {log.message}
                </div>
              ))
            )}
          </div>
        </div>
        <div className="comment-list">
          {commentList.map((comment) => (
            <div
              key={comment.groupId}
              data-risk={comment.riskLevel}
              className={`comment-item ${activeCommentId === comment.groupId ? "active" : ""}`}
              onClick={() => handleCommentItemClick(comment.groupId)}
            >
              <div className="comment-item__header">
                <span className="comment-item__header-name">
                  {comment.userName}
                </span>
                <span className="comment-item__header-date">
                  {comment.createdDate}
                </span>
                <button
                  className="comment-item__delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteComment(comment.groupId);
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="comment-item__range">
                原文：{comment.rangeText}
              </div>

              {editingCommentId === comment.groupId ? (
                <>
                  <div className="comment-item__label">险等级</div>
                  <select
                    className="comment-item__select"
                    value={comment.riskLevel || ""}
                    onChange={(e) =>
                      handleUpdateComment(
                        comment.groupId,
                        "riskLevel",
                        e.target.value,
                      )
                    }
                    onFocus={() => {
                      commentEditRef.current.isEditing = true;
                    }}
                  >
                    <option value="">请选择风险等级</option>
                    <option value="高">高</option>
                    <option value="中">中</option>
                    <option value="低">低</option>
                  </select>

                  <div className="comment-item__label">风险提示</div>
                  <textarea
                    className="comment-item__content-edit"
                    placeholder="请输入风险提示"
                    rows={2}
                    value={comment.content}
                    onChange={(e) =>
                      handleUpdateComment(
                        comment.groupId,
                        "content",
                        e.target.value,
                      )
                    }
                    onBlur={() => handleCommentBlur(comment.groupId)}
                    onFocus={() => {
                      commentEditRef.current.isEditing = true;
                    }}
                    autoFocus
                  />
                  <div className="comment-item__label mt-2">修改建议</div>
                  <textarea
                    className="comment-item__content-edit mt-2"
                    placeholder="请输入修改建议"
                    rows={2}
                    value={comment.additionalContent || ""}
                    onChange={(e) =>
                      handleUpdateComment(
                        comment.groupId,
                        "additionalContent",
                        e.target.value,
                      )
                    }
                    onBlur={() => handleCommentBlur(comment.groupId)}
                    onFocus={() => {
                      commentEditRef.current.isEditing = true;
                    }}
                  />
                </>
              ) : (
                <div
                  className="comment-item__content"
                  onClick={(e) => handleStartEditComment(comment.groupId, e)}
                >
                  {comment.content ? (
                    <div>
                      {comment.riskLevel && (
                        <div className="text-sm">
                          风险等级：
                          <span
                            className={`risk-level risk-level-${comment.riskLevel}`}
                          >
                            {comment.riskLevel}
                          </span>
                        </div>
                      )}
                      <div>风险提示：{comment.content}</div>
                      {comment.additionalContent && (
                        <div className="text-sm text-gray-500 mt-1">
                          修改建议：{comment.additionalContent}
                        </div>
                      )}
                    </div>
                  ) : (
                    "点击添加批注"
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
