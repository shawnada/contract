'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Trash2, Download, Upload, ArrowUpDown } from 'lucide-react'
import debounce from 'lodash.debounce'
import { createRule, updateRule, deleteRule } from './action'
import * as XLSX from 'xlsx'

interface Rule {
  id: string
  category: string
  level: string
  principle: string
  clause: string
  submitter: string
  createdAt: string
}

// 防抖保存规则
const saveRule = debounce(
  (id: string, standardId: string, data: { [key: string]: string }) => {
    updateRule(id, standardId, data)
  },
  1000
)

type SortField = 'category' | 'level' | 'submitter' | 'createdAt'
type SortOrder = 'asc' | 'desc'

export default function RuleTable({
  rules,
  standardId,
  userName,
  standardTitle,
}: {
  rules: Rule[]
  standardId: string
  userName: string
  standardTitle: string
}) {
  const [data, setData] = useState(rules)
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // 排序函数
  const sortData = (field: SortField) => {
    if (field === sortField) {
      // 如果点击的是当前排序字段，则切换排序顺序
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      // 如果点击的是新字段，则设置为该字段降序
      setSortField(field)
      setSortOrder('desc')
    }

    const sortedData = [...data].sort((a, b) => {
      let compareA = a[field]
      let compareB = b[field]

      if (sortOrder === 'asc') {
        ;[compareA, compareB] = [compareB, compareA]
      }

      if (compareA < compareB) return -1
      if (compareA > compareB) return 1
      return 0
    })

    setData(sortedData)
  }

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
            {sortOrder === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    )
  }

  const handleChange = (id: string, field: string, value: string) => {
    // 立即更新 UI
    setData((prev) =>
      prev.map((rule) =>
        rule.id === id
          ? {
              ...rule,
              [field]: value,
            }
          : rule
      )
    )

    // 防抖保存到数据库
    saveRule(id, standardId, { [field]: value })
  }

  const addRow = async () => {
    const newRule = await createRule(standardId, {
      category: '',
      level: '',
      principle: '',
      clause: '',
      submitter: userName,
    })
    setData([...data, newRule])
  }

  const handleDelete = async (id: string) => {
    await deleteRule(id, standardId)
    setData((prev) => prev.filter((rule) => rule.id !== id))
  }

  const handleExport = () => {
    const exportData = data.map((rule) => ({
      风险分类: rule.category,
      风险等级: rule.level,
      审核原则: rule.principle,
      标准条款: rule.clause,
      提交人: rule.submitter,
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '审核规则')
    XLSX.writeFile(wb, `${standardTitle || '审核规则'}.xlsx`)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      const data = e.target?.result
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      // 转换并创建新规则
      for (const item of jsonData) {
        const newRule = await createRule(standardId, {
          category: item['风险分类']?.toString() || '',
          level: item['风险等级']?.toString() || '',
          principle: item['审核原则']?.toString() || '',
          clause: item['标准条款']?.toString() || '',
          submitter: item['提交人']?.toString() || userName,
        })
        setData((prev) => [...prev, newRule])
      }
    }
    reader.readAsArrayBuffer(file)
    // 清空 input 的值，允许重复导入同一个文件
    e.target.value = ''
  }

  return (
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
            onClick={() => document.getElementById('excel-import')?.click()}
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
                {renderSortButton('category', '风险分类')}
              </TableHead>
              <TableHead className="w-[100px] sticky top-0 bg-background">
                {renderSortButton('level', '风险等级')}
              </TableHead>
              <TableHead className="w-[400px] sticky top-0 bg-background">
                审核原则
              </TableHead>
              <TableHead className="sticky top-0 bg-background">
                标准条款
              </TableHead>
              <TableHead className="w-[100px] sticky top-0 bg-background">
                {renderSortButton('submitter', '提交人')}
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
                      handleChange(rule.id, 'category', e.target.value)
                    }
                    placeholder="请输入分类"
                  />
                </TableCell>
                <TableCell>
                  <select
                    className="w-full border rounded px-2 py-1"
                    value={rule.level}
                    onChange={(e) =>
                      handleChange(rule.id, 'level', e.target.value)
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
                      handleChange(rule.id, 'principle', e.target.value)
                    }
                    placeholder="请输入原则"
                    style={{ resize: 'vertical', minHeight: '80px' }}
                  />
                </TableCell>
                <TableCell>
                  <input
                    className="w-full border rounded px-2 py-1"
                    value={rule.clause}
                    onChange={(e) =>
                      handleChange(rule.id, 'clause', e.target.value)
                    }
                    placeholder="请输入条款"
                  />
                </TableCell>
                <TableCell>
                  <input
                    className="w-full border rounded px-2 py-1"
                    value={rule.submitter}
                    onChange={(e) =>
                      handleChange(rule.id, 'submitter', e.target.value)
                    }
                    placeholder={userName || '请输入提交人'}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(rule.id)}
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
  )
}
