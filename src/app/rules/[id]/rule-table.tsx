"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Download, Upload, ArrowUpDown } from "lucide-react";
import debounce from "lodash.debounce";
import { createRule, updateRule, deleteRule } from "./action";
import * as XLSX from "xlsx";

interface Rule {
  id: string;
  category: string;
  level: string;
  principle: string;
  clause: string;
  submitter: string;
  createdAt: string;
}

// 防抖保存规则
const saveRule = debounce(
  (id: string, standardId: string, data: { [key: string]: string }) => {
    updateRule(id, standardId, data);
  },
  1000,
);

type SortField = "category" | "level" | "submitter" | "createdAt";
type SortOrder = "asc" | "desc";

export default function RuleTable({
  rules,
  standardId,
  userName,
  standardTitle,
}: {
  rules: Rule[];
  standardId: string;
  userName: string;
  standardTitle: string;
}) {
  const [data, setData] = useState<Rule[]>(rules);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [isDeleting, setIsDeleting] = useState(false);
  const mounted = useRef(true);

  // 使用 useEffect 处理组件的挂载状态
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // 使用 useEffect 更新数据，并确保组件仍然挂载
  useEffect(() => {
    if (mounted.current) {
      setData(rules);
    }
  }, [rules]);

  // 排序函数
  const sortData = (field: SortField) => {
    if (field === sortField) {
      // 如果点击的是当前排序字段，则切换排序顺序
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // 如果点击的是新字段，则设置为该字段降序
      setSortField(field);
      setSortOrder("desc");
    }

    const sortedData = [...data].sort((a, b) => {
      let compareA = a[field];
      let compareB = b[field];

      if (sortOrder === "asc") {
        [compareA, compareB] = [compareB, compareA];
      }

      if (compareA < compareB) return -1;
      if (compareA > compareB) return 1;
      return 0;
    });

    setData(sortedData);
  };

  // 渲染排序按钮
  const renderSortButton = (field: SortField, label: string) => {
    return (
      <div
        className="flex items-center cursor-pointer"
        onClick={() => sortData(field)}
      >
        {label}
        <ArrowUpDown className="ml-1 h-4 w-4" />
        {sortField === field && (
          <span className="ml-1 text-xs">
            {sortOrder === "asc" ? "↑" : "↓"}
          </span>
        )}
      </div>
    );
  };

  // 修改数据更新处理函数
  const handleChange = useCallback(
    async (id: string, field: string, value: string) => {
      if (!mounted.current) return;

      try {
        setData((prev) =>
          prev.map((rule) =>
            rule.id === id
              ? {
                  ...rule,
                  [field]: value,
                }
              : rule,
          ),
        );

        await saveRule(id, standardId, { [field]: value });
      } catch (error) {
        console.error("更新规则失败:", error);
        if (mounted.current) {
          // 如果保存失败，回滚 UI 更新
          setData((prev) => [...prev]);
        }
      }
    },
    [standardId],
  );

  const addRow = async () => {
    const newRule = await createRule(standardId, {
      category: "",
      level: "",
      principle: "",
      clause: "",
      submitter: userName,
    });
    setData([...data, newRule]);
  };

  // 修改删除处理函数
  const handleDelete = useCallback(
    async (id: string) => {
      if (!mounted.current) return;

      try {
        setIsDeleting(true);
        await deleteRule(id, standardId);

        if (mounted.current) {
          setData((prev) => prev.filter((rule) => rule.id !== id));
        }
      } catch (error) {
        console.error("删除规则失败:", error);
        if (mounted.current) {
          alert("删除失败，请重试");
        }
      } finally {
        if (mounted.current) {
          setIsDeleting(false);
        }
      }
    },
    [standardId],
  );

  const handleExport = () => {
    const exportData = data.map((rule) => ({
      风险分类: rule.category,
      风险等级: rule.level,
      审核原则: rule.principle,
      标准条款: rule.clause,
      提交人: rule.submitter,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "审核规则");
    XLSX.writeFile(wb, `${standardTitle || "审核规则"}.xlsx`);
  };

  // 修改导入处理函数
  const handleImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!mounted.current) return;

      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            if (!mounted.current) return;

            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            // 批量创建规则
            for (const item of jsonData) {
              if (!mounted.current) break;

              const newRule = await createRule(standardId, {
                category: item["风险分类"]?.toString() || "",
                level: item["风险等级"]?.toString() || "",
                principle: item["审核原则"]?.toString() || "",
                clause: item["标准条款"]?.toString() || "",
                submitter: item["提交人"]?.toString() || userName,
              });

              if (mounted.current) {
                setData((prev) => [...prev, newRule]);
              }
            }
          } catch (error) {
            console.error("处理导入数据失败:", error);
            if (mounted.current) {
              alert("导入失败，请检查文件格式");
            }
          }
        };
        reader.readAsArrayBuffer(file);
      } catch (error) {
        console.error("读取文件失败:", error);
        if (mounted.current) {
          alert("读取文件失败，请重试");
        }
      } finally {
        e.target.value = "";
      }
    },
    [standardId, userName],
  );

  return (
    <ErrorBoundary fallback={<div>加载失败，请刷新页面重试</div>}>
      <div className="flex flex-col h-[calc(100vh-200px)]">
        <div className="mb-4 flex items-center justify-between">
          <Button onClick={addRow}>
            <Plus className="h-4 w-4 mr-2" />
            新增规则
          </Button>

          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImport}
              className="hidden"
              id="excel-import"
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById("excel-import")?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              导入Excel
            </Button>

            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              导出Excel
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px] sticky top-0 bg-background">
                  {renderSortButton("category", "风险分类")}
                </TableHead>
                <TableHead className="w-[100px] sticky top-0 bg-background">
                  {renderSortButton("level", "风险等级")}
                </TableHead>
                <TableHead className="w-[400px] sticky top-0 bg-background">
                  审核原则
                </TableHead>
                <TableHead className="sticky top-0 bg-background">
                  标准条款
                </TableHead>
                <TableHead className="w-[100px] sticky top-0 bg-background">
                  {renderSortButton("submitter", "提交人")}
                </TableHead>
                <TableHead className="w-[100px] sticky top-0 bg-background">
                  操作
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <input
                      className="w-full border rounded px-2 py-1"
                      value={rule.category}
                      onChange={(e) =>
                        handleChange(rule.id, "category", e.target.value)
                      }
                      placeholder="请输入分类"
                    />
                  </TableCell>
                  <TableCell>
                    <select
                      className="w-full border rounded px-2 py-1"
                      value={rule.level}
                      onChange={(e) =>
                        handleChange(rule.id, "level", e.target.value)
                      }
                    >
                      <option value="">请选择等级</option>
                      <option value="高">高</option>
                      <option value="中">中</option>
                      <option value="低">低</option>
                    </select>
                  </TableCell>
                  <TableCell>
                    <textarea
                      rows={3}
                      className="w-full border rounded px-2 py-1"
                      value={rule.principle}
                      onChange={(e) =>
                        handleChange(rule.id, "principle", e.target.value)
                      }
                      placeholder="请输入原则"
                      style={{ resize: "vertical", minHeight: "80px" }}
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      className="w-full border rounded px-2 py-1"
                      value={rule.clause}
                      onChange={(e) =>
                        handleChange(rule.id, "clause", e.target.value)
                      }
                      placeholder="请输入条款"
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      className="w-full border rounded px-2 py-1"
                      value={rule.submitter}
                      onChange={(e) =>
                        handleChange(rule.id, "submitter", e.target.value)
                      }
                      placeholder={userName || "请输入提交人"}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(rule.id)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </ErrorBoundary>
  );
}

// 错误边界组件
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error in RuleTable:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
