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
