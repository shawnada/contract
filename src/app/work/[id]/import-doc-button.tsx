'use client'

import { Button } from '@/components/ui/button'
import { FileUp } from 'lucide-react'
import { useState } from 'react'
import { updateDoc } from './action'
import { useEditorContext } from './editor-context'

export default function ImportDocButton({ id }: { id: string }) {
  const [isLoading, setIsLoading] = useState(false)
  const { editorRef } = useEditorContext()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsLoading(true)
      console.log('开始导入文件:', file.name)

      const formData = new FormData()
      formData.append('file', file)

      console.log('准备发送请求到转换接口...')

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

      // 使用 canvas-editor 的 API 插入 HTML
      if (editorRef.current?.command) {
        console.log('Editor instance found:', editorRef.current)
        try {
          editorRef.current.command.executeSetHTML({
            header: '',
            main: htmlContent,
            footer: '',
          })
          console.log('HTML content set successfully')

          // 保存到数据库
          await updateDoc(id, {
            content: JSON.stringify({
              header: [{ value: '', size: 15 }],
              main: [{ value: htmlContent, size: 16 }],
              footer: [{ value: '', size: 12 }],
            }),
          })

          console.log('文档更新成功')
        } catch (error) {
          console.error('Error setting HTML content:', error)
          throw error
        }
      } else {
        console.error('Editor instance details:', {
          editorRef: editorRef,
          current: editorRef.current,
          hasCommand: editorRef.current?.command,
        })
        throw new Error('编辑器实例未找到')
      }
    } catch (error) {
      console.error('导入文档失败，详细错误:', error)
      alert('导入文档失败，请重试')
    } finally {
      setIsLoading(false)
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
