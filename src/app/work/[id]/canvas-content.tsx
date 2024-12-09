'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import Editor, {
  Command,
  EditorZone,
  ElementType,
  IElement,
  IEditorOption,
} from '@hufe921/canvas-editor'
import docxPlugin from '@hufe921/canvas-editor-plugin-docx'
import './CanvasEditor.css'
import debounce from 'lodash.debounce'
import { updateDoc } from './action'
import {
  getComments,
  createCommentInDb,
  updateComment,
  deleteComment,
} from './comment-action'

// 编辑器配置
export const options: IEditorOption = {
  margins: [100, 100, 100, 100],
  // 水印
  watermark: {
    data: 'ZLSOFT',
    size: 80,
  },
  // 页码
  pageNumber: {
    format: '第{pageNo}页/共{pageCount}页',
  },
  // 占位符
  placeholder: {
    data: '请输入正文',
  },
  // 提示
  zone: {
    tipDisabled: false,
  },
  // 遮罩层
  maskMargin: [160, 160, 160, 160],
  // 新增页面边框配置
  pageBorder: {
    color: '#CCCCCC', // 默认边框颜色
    lineWidth: 1, // 默认边框宽度
    padding: [10, 10, 10, 10], // 默认内边距
  },
}

// 批注接口
interface IComment {
  groupId: string
  content: string
  additionalContent?: string
  riskLevel?: '高' | '中' | '低'
  userName: string
  rangeText: string
  createdDate: string
}

// 防抖保存批注内容
const saveComment = debounce(
  (
    groupId: string,
    docId: string,
    data: {
      content?: string
      additionalContent?: string
      riskLevel?: string
    }
  ) => {
    updateComment(groupId, docId, data)
  },
  1000
)

export default function CanvasEditor({
  id,
  content,
}: {
  id: string
  content: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<Editor | null>(null)
  const [commentList, setCommentList] = useState<IComment[]>([])
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [canEditComment, setCanEditComment] = useState(true)

  // 新增一个 ref 来处理点击事件
  const commentEditRef = useRef<{
    isEditing: boolean
    clickTimeout: NodeJS.Timeout | null
  }>({
    isEditing: false,
    clickTimeout: null,
  })

  // 更新防抖保存函数
  const saveContent = debounce((id: string, content: any) => {
    try {
      // 处理 canvas-editor 返回的复杂数据结构
      const contentToSave = JSON.stringify(content.data || content)

      console.log('保存内容:', {
        id,
        contentLength: contentToSave.length,
        contentPreview: contentToSave.slice(0, 100) + '...',
        mainContent:
          content.data?.main?.map((item: any) => item.value).join('') ||
          content.main?.map((item: any) => item.value).join('') ||
          '',
      })

      updateDoc(id, { content: contentToSave })
    } catch (error) {
      console.error('保存内容时发生错误:', error)
    }
  }, 1000)

  useEffect(() => {
    if (containerRef.current) {
      // 尝试解析初始内容
      let initialData: {
        header?: IElement[]
        main?: IElement[]
        footer?: IElement[]
      } = {}
      try {
        initialData = content
          ? JSON.parse(content)
          : {
              header: [{ value: '', size: 15 }],
              main: [{ value: '', size: 16 }],
              footer: [{ value: '', size: 12 }],
            }
      } catch (error) {
        console.error('解析初始内容失败', error)
        initialData = {
          header: [{ value: '', size: 15 }],
          main: [{ value: '', size: 16 }],
          footer: [{ value: '', size: 12 }],
        }
      }

      // 确保每个部分都有默认值
      const editorData = {
        header: initialData.header || [{ value: '', size: 15 }],
        main: initialData.main || [{ value: '', size: 16 }],
        footer: initialData.footer || [{ value: '', size: 12 }],
      }

      const editor = new Editor(containerRef.current, editorData, options)

      // Use the docx plugin
      editor.use(docxPlugin)

      editorRef.current = editor

      // 增加详细的内容变化日志
      editor.listener.contentChange = () => {
        console.log('内容发生变化')

        // 安全地获取当前内容
        const currentContent = editor.command.getValue()
        console.log(
          '当前主内容:',
          currentContent.data?.main?.map((item: any) => item.value).join('') ||
            ''
        )

        saveContent(id, currentContent)
      }

      // 注册右键菜单 - 添加批注、导入导出Word
      editor.register.contextMenuList([
        {
          name: '批注',
          when: (payload) => {
            return (
              !payload.isReadonly &&
              payload.editorHasSelection &&
              payload.zone === EditorZone.MAIN
            )
          },
          callback: (command: Command) => {
            handleAddComment(command)
          },
        },
        {
          name: '导入Word',
          when: (payload) => {
            return !payload.isReadonly
          },
          callback: () => {
            handleImportDocx()
          },
        },
        {
          name: '导出Word',
          when: (payload) => {
            return !payload.isReadonly
          },
          callback: () => {
            handleExportDocx()
          },
        },
      ])
    }

    return () => {
      editorRef.current?.destroy()
    }
  }, [content, id])

  // 在组件加载时获取批注
  useEffect(() => {
    async function fetchComments() {
      const comments = await getComments(id)
      setCommentList(
        comments.map(
          (comment: {
            groupId: string
            content: string
            additionalContent?: string
            riskLevel?: string
            userName: string
            rangeText: string
            createdDate: Date
          }) => ({
            ...comment,
            createdDate: comment.createdDate.toLocaleString(),
          })
        )
      )
    }
    fetchComments()
  }, [id])

  // 修改创建批注的方法
  const createComment = async (params: {
    groupId: string
    content?: string
    additionalContent?: string
    riskLevel?: '高' | '中' | '低'
    userName: string
    rangeText: string
    autoExpand?: boolean
  }) => {
    // 先创建到数据库
    await createCommentInDb(id, {
      groupId: params.groupId,
      content: params.content || '',
      additionalContent: params.additionalContent,
      riskLevel: params.riskLevel,
      userName: params.userName,
      rangeText: params.rangeText,
    })

    const newComment: IComment = {
      groupId: params.groupId,
      content: params.content || '',
      additionalContent: params.additionalContent,
      riskLevel: params.riskLevel,
      userName: params.userName,
      rangeText: params.rangeText,
      createdDate: new Date().toLocaleString(),
    }

    setCommentList((prev) => [...prev, newComment])
    if (params.autoExpand) {
      setActiveCommentId(newComment.groupId)
      setEditingCommentId(newComment.groupId)
    }
  }

  // 右键菜单添加批注
  const handleAddComment = (command: Command) => {
    const groupId = command.executeSetGroup()
    if (!groupId) return

    createComment({
      groupId,
      userName: 'User',
      rangeText: command.getRangeText(),
      autoExpand: true,
    })
  }

  // 导入Word文档
  const handleImportDocx = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.docx'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        try {
          const arrayBuffer = await file.arrayBuffer()
          // 使用类型断言调用插方法
          ;(editorRef.current?.command as any).executeImportDocx({
            arrayBuffer: arrayBuffer,
          })
        } catch (error) {
          console.error('Error importing DOCX:', error)
          alert('导入Word文档失败')
        }
      }
    }
    input.click()
  }

  // 导出Word文档
  const handleExportDocx = () => {
    try {
      ;(editorRef.current?.command as any).executeExportDocx({
        fileName: `document_${new Date().toISOString().replace(/:/g, '-')}.docx`,
      })
    } catch (error) {
      console.error('Error exporting DOCX:', error)
      alert('导出Word文档失败')
    }
  }

  // 定位到批注
  const handleLocateComment = (groupId: string) => {
    console.log('Locating comment with ID:', groupId)

    try {
      const comment = commentList.find((c) => c.groupId === groupId)
      if (comment?.groupId) {
        editorRef.current?.command.executeLocationGroup(comment.groupId)
        console.log(
          'Location method called successfully with groupId:',
          comment.groupId
        )
      } else {
        console.error('No groupId found for comment:', groupId)
      }
    } catch (error) {
      console.error('Error locating group:', error)
    }
  }

  // 修改删除批注的方法
  const handleDeleteComment = async (groupId: string) => {
    try {
      // 直接使用 groupId 删除编辑器中的高亮
      editorRef.current?.command.executeDeleteGroup(groupId)

      const result = await deleteComment(groupId, id)
      if (result.success) {
        setCommentList((prev) => prev.filter((c) => c.groupId !== groupId))
      } else {
        console.error('Failed to delete comment:', result.error)
      }
    } catch (error) {
      console.error('Error in handleDeleteComment:', error)
    }
  }

  // 修改更新批注的方法
  const handleUpdateComment = async (
    groupId: string,
    field: 'content' | 'additionalContent' | 'riskLevel',
    newContent: string
  ) => {
    // 立即更新 UI
    setCommentList((prev) =>
      prev.map((comment) =>
        comment.groupId === groupId
          ? {
              ...comment,
              [field]: newContent,
            }
          : comment
      )
    )

    // 防抖保存到数据库
    saveComment(groupId, id, {
      [field]: newContent,
    })
  }

  // 修改 textarea 的 onBlur 处理
  const handleCommentBlur = (groupId: string) => {
    // 清除之前的延时器
    if (commentEditRef.current.clickTimeout) {
      clearTimeout(commentEditRef.current.clickTimeout)
    }

    // 添加新的延时器
    commentEditRef.current.clickTimeout = setTimeout(() => {
      // 只有在非编辑状态下才退出
      if (!commentEditRef.current.isEditing) {
        setEditingCommentId(null)
      }
      commentEditRef.current.isEditing = false
      commentEditRef.current.clickTimeout = null
    }, 200)
  }

  // 修改点击进入编辑状态的方法
  const handleStartEditComment = (groupId: string, e: React.MouseEvent) => {
    // 阻止事件冒泡
    e.stopPropagation()

    // 清除之前的延时器
    if (commentEditRef.current.clickTimeout) {
      clearTimeout(commentEditRef.current.clickTimeout)
    }

    // 设置编辑状态
    setEditingCommentId(groupId)
    commentEditRef.current.isEditing = true
  }

  // 修改点击事件处理
  const handleCommentItemClick = (groupId: string) => {
    // 果正在编辑，不进行定位
    if (commentEditRef.current.isEditing) return

    handleLocateComment(groupId)
    setActiveCommentId(groupId)
  }

  // 搜索高亮添加批注
  const handleSearchAndHighlight = () => {
    const riskData = [
      {
        原文: '派人协助落实系统实施的基础设施所需的条件',
        风险等级: '高',
        风险提示: '违约金过高，超过',
        修改建议: '违约金为造成损失的30%',
      },
      {
        原文: '同时向乙方开具税率3%的等额技术服务增值税专用发票',
        风险等级: '中',
        风险提示: '表述不清晰',
        修改建议: '需要更详细地说明具体情况',
      },
    ]

    // 1. 先检查 editorRef.current 是否存在
    const editor = editorRef.current
    if (!editor) {
      console.error('Editor not initialized')
      return
    }

    // 2. 遍历所有风险数据
    riskData.forEach((item) => {
      try {
        const keyword = item.原文
        // 3. 使用类型断言并确保 command 存在
        const command = editor.command as any
        const rangeList = command.getKeywordRangeList(keyword)

        // 4. 确保 rangeList 存在且是数
        if (Array.isArray(rangeList) && rangeList.length > 0) {
          rangeList.forEach((range: any) => {
            try {
              // 5. 调整范围并创建批注
              range.startIndex -= 1
              command.executeReplaceRange(range)
              const groupId = command.executeSetGroup()

              if (groupId) {
                createComment({
                  groupId,
                  content: item.风险提示,
                  additionalContent: item.修改建议,
                  riskLevel: item.风险等级 as '高' | '中' | '低',
                  userName: 'System',
                  rangeText: keyword,
                  autoExpand: false,
                })
              }
            } catch (error) {
              console.error('Error processing range:', error)
            }
          })
        } else {
          console.warn(`No matches found for keyword: ${keyword}`)
        }
      } catch (error) {
        console.error('Error processing risk data item:', error)
      }
    })
  }

  return (
    <div className="canvas-editor-container">
      {/* 添加搜索按钮 */}
      <div className="absolute top-2 right-2 z-10">
        <button
          onClick={handleSearchAndHighlight}
          className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
        >
          搜索并高亮
        </button>
      </div>

      <div className="canvas-editor">
        <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
      </div>

      {/* 批注侧边栏 */}
      <div className="comment">
        {commentList.map((comment) => (
          <div
            key={comment.groupId}
            data-risk={comment.riskLevel}
            className={`comment-item ${activeCommentId === comment.groupId ? 'active' : ''}`}
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
                  e.stopPropagation()
                  handleDeleteComment(comment.groupId)
                }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="comment-item__range">原文：{comment.rangeText}</div>

            {editingCommentId === comment.groupId ? (
              <>
                <div className="comment-item__label">险等级</div>
                <select
                  className="comment-item__select"
                  value={comment.riskLevel || ''}
                  onChange={(e) =>
                    handleUpdateComment(
                      comment.groupId,
                      'riskLevel',
                      e.target.value
                    )
                  }
                  onFocus={() => {
                    commentEditRef.current.isEditing = true
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
                      'content',
                      e.target.value
                    )
                  }
                  onBlur={() => handleCommentBlur(comment.groupId)}
                  onFocus={() => {
                    commentEditRef.current.isEditing = true
                  }}
                  autoFocus
                />
                <div className="comment-item__label mt-2">修改建议</div>
                <textarea
                  className="comment-item__content-edit mt-2"
                  placeholder="请输入修改建议"
                  rows={2}
                  value={comment.additionalContent || ''}
                  onChange={(e) =>
                    handleUpdateComment(
                      comment.groupId,
                      'additionalContent',
                      e.target.value
                    )
                  }
                  onBlur={() => handleCommentBlur(comment.groupId)}
                  onFocus={() => {
                    commentEditRef.current.isEditing = true
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
                  '点击添加批注'
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
