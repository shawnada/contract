import { Sparkles, CornerDownLeft, MoveUpRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AIIsland() {
  return (
    <div
      className="
        absolute bottom-10 w-[900px] left-1/2 ml-[-450px] 
        rounded-3xl p-4 pl-6 shadow-muted-foreground shadow-lg
        border-muted-foreground bg-secondary-foreground text-secondary 
        flex items-center justify-start
      "
    >
      <Sparkles size={24} />
      <div className="flex-auto flex items-center justify-start">
        <Input
          placeholder="请输入 AI 指令，如：根据标题写大纲"
          className="text-base bg-inherit border-none focus-visible:ring-offset-0 focus-visible:ring-0"
        />
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-inherit hover:text-muted-foreground"
        >
          <CornerDownLeft size={24} />
        </Button>
      </div>
      <div className="ml-6 opacity-50">
        <Button
          variant="ghost"
          className="p-2 hover:bg-inherit hover:text-muted-foreground"
        >
          续写
          <MoveUpRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          className="p-2 hover:bg-inherit hover:text-muted-foreground"
        >
          头脑风暴
          <MoveUpRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          className="p-2 hover:bg-inherit hover:text-muted-foreground"
        >
          总结
          <MoveUpRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          className="p-2 hover:bg-inherit hover:text-muted-foreground"
        >
          更多...
        </Button>
      </div>
    </div>
  );
}
