'use server'

import { db } from '@/db/db'
import { revalidatePath } from 'next/cache'
import { getUserInfo } from '@/lib/session'

export async function getStandard(id: string) {
  try {
    const user = await getUserInfo()
    if (!user?.id) return null

    const standard = await db.standard.findUnique({
      where: {
        id,
        userId: user.id,
      },
      include: {
        rules: true,
      },
    })

    return standard
  } catch (error) {
    console.error('Error fetching standard:', error)
    return null
  }
}

export async function createStandard() {
  const user = await getUserInfo()
  if (!user?.id) throw new Error('Unauthorized')

  const standard = await db.standard.create({
    data: {
      title: '未命名标准',
      userId: user.id,
    },
  })
  revalidatePath('/rules')
  return standard
}

export async function updateStandard(id: string, data: { title?: string }) {
  const user = await getUserInfo()
  if (!user?.id) throw new Error('Unauthorized')

  const standard = await db.standard.update({
    where: { id, userId: user.id },
    data,
  })
  revalidatePath('/rules')
  return standard
}

export async function createRule(
  standardId: string,
  data: {
    category: string
    level: string
    principle: string
    clause: string
    submitter: string
  }
) {
  const rule = await db.rule.create({
    data: {
      ...data,
      standardId,
    },
    select: {
      id: true,
      category: true,
      level: true,
      principle: true,
      clause: true,
      submitter: true,
      createdAt: true,
    },
  })
  revalidatePath(`/rules/${standardId}`)
  return rule
}

export async function updateRule(
  id: string,
  standardId: string,
  data: {
    category?: string
    level?: string
    principle?: string
    clause?: string
    submitter?: string
  }
) {
  const rule = await db.rule.update({
    where: { id },
    data,
  })
  revalidatePath(`/rules/${standardId}`)
  return rule
}

export async function deleteRule(id: string, standardId: string) {
  await db.rule.delete({
    where: { id },
  })
  revalidatePath(`/rules/${standardId}`)
}

export async function deleteStandard(id: string) {
  try {
    const user = await getUserInfo()
    if (!user?.id) throw new Error('Unauthorized')

    // 删除标准及其关联的所有规则
    await db.standard.delete({
      where: {
        id,
        userId: user.id, // 确保只能删除自己的标准
      },
    })

    revalidatePath('/rules')
    return { success: true }
  } catch (error) {
    console.error('Error deleting standard:', error)
    return { success: false }
  }
}
