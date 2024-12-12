'use server'

import { db } from '@/db/db'
import { getUserInfo } from '@/lib/session'

export async function getStandards() {
  const user = await getUserInfo()
  if (!user?.id) return []

  try {
    const standards = await db.standard.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        title: true,
      },
      orderBy: { updatedAt: 'desc' },
    })
    return standards
  } catch (error) {
    console.error('Error fetching standards:', error)
    return []
  }
}
