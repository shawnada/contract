import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getUserInfo } from '@/lib/session'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { UserProfileForm } from './user-profile-form'

export default async function UserSettingButton() {
  const user = await getUserInfo()
  if (user == null) return null
  const { id, name, image, email } = user

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full justify-start px-2 " variant="ghost">
          <UserAvatar />
          &nbsp;&nbsp;账户/设置
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>修改用户信息</DialogTitle>
          <DialogDescription asChild>
            <UserProfileForm
              name={name || ''}
              avatar={image || ''}
              email={email || ''}
            />
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}

async function UserAvatar() {
  const user = await getUserInfo()
  let { name, image, email } = user || {}
  if (!name) name = email

  return (
    <Avatar className="h-7 w-7 border">
      <AvatarImage src={image || ''} alt={name || ''} />
      <AvatarFallback>{name?.slice(0, 1)}</AvatarFallback>
    </Avatar>
  )
}
