'use client'

import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Trash2 } from 'lucide-react'
import { createStandard, deleteStandard } from './[id]/action'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface Standard {
  id: string
  title: string
  updatedAt: Date
}

export default function StandardList({ standards }: { standards: Standard[] }) {
  const router = useRouter()
  const params = useParams()
  const currentId = params.id as string

  const handleCreate = async () => {
    const standard = await createStandard()
    router.push(`/rules/${standard.id}`)
  }

  const handleDelete = async (standardId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const result = await deleteStandard(standardId)
    if (result.success) {
      if (standardId === currentId) {
        router.push('/rules')
      }
    }
  }

  return (
    <div className="w-60 border-r flex flex-col">
      <div className="p-2 border-b">
        <Button onClick={handleCreate} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          新建标准
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {standards.map((standard) => (
            <div
              key={standard.id}
              className={`p-2 rounded cursor-pointer hover:bg-gray-100 ${
                currentId === standard.id ? 'bg-gray-100' : ''
              } group flex justify-between items-start`}
              onClick={() => router.push(`/rules/${standard.id}`)}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{standard.title}</div>
                <div className="text-xs text-gray-500">
                  {new Date(standard.updatedAt).toLocaleString()}
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确认删除标准？</AlertDialogTitle>
                    <AlertDialogDescription>
                      此操作将删除该标准及其所有规则，且无法恢复。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
                      取消
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(e) => handleDelete(standard.id, e)}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      删除
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
