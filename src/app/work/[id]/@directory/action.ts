'use server'

import { db } from '@/db/db'
import { redirect } from 'next/navigation'
import { getUserInfo } from '@/lib/session'

export async function create() {
  const user = await getUserInfo()
  if (!user || !user.id) return

  const newDoc = await db.doc.create({
    data: {
      title: '新建审核 ' + Date.now().toString().slice(-4),
      content: '',
      userId: user.id,
    },
  })
  redirect(`/work/${newDoc.id}`)
}

export async function getDocList() {
  const user = await getUserInfo()
  if (user == null) return []

  const list = db.doc.findMany({
    select: {
      id: true,
      title: true,
    },
    where: {
      userId: user.id || '',
    },
    orderBy: {
      id: 'asc',
    },
  })
  return list || []
}

export async function del(id: string) {
  const user = await getUserInfo()
  if (!user || !user.id) return

  // 删除
  await db.doc.delete({
    where: {
      id,
      userId: user.id,
    },
  })

  const list = await getDocList()
  const idList = list.map((doc) => doc.id)
  const otherId = idList.find((id) => id !== id)

  redirect(`/work/${otherId}`) // 删除以后，定位到其他文档
}
