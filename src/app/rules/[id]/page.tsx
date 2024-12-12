import { getStandard } from './action'
import Title from './title'
import RuleTable from './rule-table'
import { redirect } from 'next/navigation'
import { getUserInfo } from '@/lib/session'

export default async function StandardPage({
  params,
}: {
  params: { id: string }
}) {
  // 检查用户登录状态
  const user = await getUserInfo()
  if (!user || !user.id) {
    redirect('/login')
  }

  // 获取标准
  const standard = await getStandard(params.id)

  // 如果标准不存在，重定向到 rules 首页
  if (!standard) {
    redirect('/rules')
  }

  return (
    <div className="p-4 max-w-[1200px] mx-auto">
      <Title id={params.id} title={standard.title} />
      <div className="mt-4">
        <RuleTable
          rules={standard.rules}
          standardId={params.id}
          userName={user.name || ''}
        />
      </div>
    </div>
  )
}
