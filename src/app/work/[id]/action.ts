'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/db/db'
import { getUserInfo } from '@/lib/session'

export async function getDoc(id: string) {
  const user = await getUserInfo()
  if (!user || !user.id) return null

  try {
    const doc = await db.doc.findUnique({
      where: { id, userId: user.id },
    })
    return doc
  } catch (ex) {
    return null
  }
}

export async function updateDoc(
  id: string,
  data: { title?: string; content?: string }
) {
  const user = await getUserInfo()
  if (!user || !user.id) return null

  try {
    console.log('尝试更新文档:', {
      id,
      userId: user.id,
      contentType: typeof data.content,
      contentLength: data.content ? data.content.length : 0,
    })

    const result = await db.doc.update({
      where: { id, userId: user.id },
      data,
    })

    console.log('文档更新成功')

    // 重新验证路径，清空缓存
    revalidatePath(`/work/${id}`)

    return result
  } catch (ex) {
    console.error('更新文档失败:', ex)
    throw ex
  }
}
