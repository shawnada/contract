import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Home, Book, LogOut, Trash2, Users } from "lucide-react";
import UserSettingButton from "@/components/user-setting-button";
import SignOutButton from "@/components/sign-out-button";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ReviewControl from "./review-control";
import { EditorProvider } from "./editor-context";

export default function Layout({
  params,
  children,
  directory,
}: Readonly<{
  params: { id: string };
  children: React.ReactNode;
  directory: React.ReactNode;
}>) {
  const { id = "0" } = params;

  return (
    <EditorProvider>
      <ResizablePanelGroup direction="horizontal" className="min-h-screen">
        <ResizablePanel defaultSize={15} minSize={10}>
          <div className="flex flex-col h-full bg-muted text-muted-foreground p-2">
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
                className="w-full justify-start px-2"
                variant="ghost"
              >
                <LogOut className="h-4 w-4" />
                &nbsp;&nbsp;退出登录
              </SignOutButton>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={60} minSize={30}>
          <div className="h-full flex flex-col">
            <div className="flex-1">{children}</div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={25} minSize={15}>
          <div className="h-full bg-muted/30 p-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <h2 className="text-lg font-semibold">审核控制</h2>

                <ReviewControl docId={id} />
              </div>

              <div className="space-y-2">
                <div className="bg-card p-4 rounded-lg"></div>
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </EditorProvider>
  );
}
