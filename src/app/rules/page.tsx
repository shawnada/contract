import { redirect } from 'next/navigation'
import { getUserInfo } from '@/lib/session'

export default async function RulesPage() {
  const user = await getUserInfo()
  if (!user || !user.id) {
    redirect('/login')
  }

  // 直接显示标准列表页面
  return null
}
