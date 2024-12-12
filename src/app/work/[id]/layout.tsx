import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import WorkNav from '@/components/WorkNav'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Home, Book, LogOut, Trash2, Users } from 'lucide-react'
import UserSettingButton from '@/components/user-setting-button'
import SignOutButton from '@/components/sign-out-button'
import Link from 'next/link'

export default function Layout({
  params,
  children,
  directory, // parallel route
}: Readonly<{
  params: { id: string }
  children: React.ReactNode
  directory: React.ReactNode
}>) {
  const { id = '0' } = params

  return (
    <ResizablePanelGroup direction="horizontal" className="h-screen">
      <ResizablePanel defaultSize={15}>
        <div className="flex flex-col h-screen bg-muted text-muted-foreground p-2">
          <div>
            <UserSettingButton />
            <Link href="/" className="w-full">
              <Button className="w-full justify-start px-2" variant="ghost">
                <Home className="h-4 w-4" />
                &nbsp;&nbsp;主页
              </Button>
            </Link>
            <Link
              href="/rules"
              className="w-full"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="w-full justify-start px-2" variant="ghost">
                <Book className="h-4 w-4" />
                &nbsp;&nbsp;标准设置
              </Button>
            </Link>
            {/* <Button className="w-full justify-start px-2" variant="ghost">
              <Users className="h-4 w-4" />
              &nbsp;&nbsp;协同文档
            </Button> */}
          </div>
          <Separator className="my-4" />
          <ScrollArea className="flex-auto">{directory}</ScrollArea>
          <Separator className="my-4" />
          <div>
            <Button className="w-full justify-start px-2" variant="ghost">
              <Trash2 className="h-4 w-4" />
              &nbsp;&nbsp;回收站
            </Button>
            <SignOutButton
              className="w-full justify-start px-2 "
              variant="ghost"
            >
              <LogOut className="h-4 w-4" />
              &nbsp;&nbsp;退出登录
            </SignOutButton>
          </div>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={85}>
        <div className="h-screen flex flex-col relative">
          {/* <WorkNav workId={id} /> */}

          <div className="flex-1">{children}</div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
