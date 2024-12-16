'use server'

import { db } from '@/db/db'
import { getUserInfo } from '@/lib/session'

export async function getStandards() {
  try {
    const standards = await db.standard.findMany({
      select: {
        id: true,
        title: true,
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })
    return standards
  } catch (error) {
    console.error('Error fetching standards:', error)
    return []
  }
}
