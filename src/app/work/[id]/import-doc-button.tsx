'use client'

import { Button } from '@/components/ui/button'
import { FileUp } from 'lucide-react'
import { useState } from 'react'
import { updateDoc } from './action'

export default function ImportDocButton({ id }: { id: string }) {
  const [isLoading, setIsLoading] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsLoading(true)
      console.log('开始导入文件:', file.name)

      // 创建 FormData
      const formData = new FormData()
      formData.append('file', file)

      console.log('准备发送请求到转换接口...')

      // 调用本地 API 路由
      const response = await fetch('/api/convert-doc', {
        method: 'POST',
        body: formData,
      })

      console.log('接口响应状态:', response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('接口返回错误:', errorData)
        throw new Error(errorData.error || '转换失败')
      }

      // 获取转换后的HTML内容
      const htmlContent = await response.text()
      console.log('成功获取转换后的HTML内容，长度:', htmlContent.length)

      // 将HTML内容转换为编辑器需要的格式
      const content = {
        header: [{ value: '', size: 15 }],
        main: [{ value: htmlContent, size: 16 }],
        footer: [{ value: '', size: 12 }],
      }

      console.log('准备更新文档内容...')

      // 更新文档内容
      await updateDoc(id, { content: JSON.stringify(content) })

      console.log('文档更新成功，准备刷新页面')

      // 刷新页面以显示新内容
      window.location.reload()
    } catch (error) {
      console.error('导入文档失败，详细错误:', error)
      alert('导入文档失败，请重试')
    } finally {
      setIsLoading(false)
      // 清空 input 的值，允许重复导入同一个文件
      e.target.value = ''
    }
  }

  return (
    <div>
      <input
        type="file"
        id="file-upload"
        accept=".doc,.docx"
        onChange={handleFileChange}
        className="hidden"
      />
      <label htmlFor="file-upload">
        <Button
          variant="outline"
          disabled={isLoading}
          className="cursor-pointer"
          asChild
        >
          <span>
            <FileUp className="h-4 w-4 mr-2" />
            {isLoading ? '导入中...' : '导入文档'}
          </span>
        </Button>
      </label>
    </div>
  )
}
