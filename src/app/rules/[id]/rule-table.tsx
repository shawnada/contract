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
import { Plus, Trash2 } from 'lucide-react'
import debounce from 'lodash.debounce'
import { createRule, updateRule, deleteRule } from './action'

interface Rule {
  id: string
  category: string
  level: string
  principle: string
  clause: string
  submitter: string
}

// 防抖保存规则
const saveRule = debounce(
  (id: string, standardId: string, data: { [key: string]: string }) => {
    updateRule(id, standardId, data)
  },
  1000
)

export default function RuleTable({
  rules,
  standardId,
  userName,
}: {
  rules: Rule[]
  standardId: string
  userName: string
}) {
  const [data, setData] = useState(rules)

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

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">风险分类</TableHead>
            <TableHead className="w-[100px]">风险等级</TableHead>
            <TableHead className="w-[400px]">审核原则</TableHead>
            <TableHead>标准条款</TableHead>
            <TableHead className="w-[100px]">提交人</TableHead>
            <TableHead className="w-[100px]">操作</TableHead>
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
      <Button onClick={addRow} className="mt-4">
        <Plus className="h-4 w-4 mr-2" />
        新增规则
      </Button>
    </div>
  )
}
