'use client'

import { Input } from '@/components/ui/input'
import { useState } from 'react'
import debounce from 'lodash.debounce'
import { updateDoc } from './action'
import ImportDocButton from './import-doc-button'

const saveTitle = debounce((id: string, title: string) => {
  updateDoc(id, { title })
}, 1000)

export default function Title(props: { id: string; title: string }) {
  const [title, setTitle] = useState(props.title || '')

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newTitle = e.target.value
    setTitle(newTitle)
    saveTitle(props.id, newTitle)
  }

  return (
    <div className="mb-8 flex items-center gap-4">
      <div className="max-w-[200px] ml-40">
        <Input
          placeholder="请输入标题..."
          value={title}
          onChange={handleChange}
          className="border-none p-0 text-xl font-bold focus-visible:ring-transparent"
        />
      </div>
      <ImportDocButton id={props.id} />
    </div>
  )
}
