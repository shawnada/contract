import { db } from '@/db/db'
import { redirect } from 'next/navigation'
import { getUserInfo } from '@/lib/session'

export default async function RulesPage() {
  const user = await getUserInfo()
  if (!user || !user.id) {
    redirect('/login')
  }

  // 获取第一个标准，如果没有则创建一个
  let standard = await db.standard.findFirst({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
  })

  // 如果没有标准，创建一个新标准
  if (!standard) {
    standard = await db.standard.create({
      data: {
        title: '未命名标准',
        userId: user.id,
      },
    })
  }

  // 重定向到标准详情页
  redirect(`/rules/${standard.id}`)
}
