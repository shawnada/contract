import 'server-only' // 标记只在服务端使用（客户端组件引入会报错）
import { auth } from 'auth'
import { cache } from 'react'

async function getUserInfoFn() {
  const session = await auth()

  if (!session?.user) {
    return null
  }

  return session.user // 格式如 { id, name, email, image }
}

export const getUserInfo = cache(getUserInfoFn)
