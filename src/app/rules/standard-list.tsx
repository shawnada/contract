'use client'

import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus } from 'lucide-react'
import { createStandard } from './[id]/action'

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
              }`}
              onClick={() => router.push(`/rules/${standard.id}`)}
            >
              <div className="font-medium truncate">{standard.title}</div>
              <div className="text-xs text-gray-500">
                {new Date(standard.updatedAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
