import Logo from "./Logo";
import ChangeTheme from "./ChangeTheme";
import { Button } from "./ui/button";
import { Forward, Star } from "lucide-react";
import Link from "next/link";

interface IProps {
  workId?: string;
}

export default function WorkNav(props: IProps) {
  const { workId } = props;

  return (
    <div className="h-[46px] flex text-secondary-foreground my-1 mx-3 bg-ground pb-1 border-b">
      <div className="text-start inline-flex items-center">
        <Logo />
        <div className="pl-4">
          <span className="text-sm leading-8 text-muted-foreground">
            {/* shadcn-ui 有 breadcrumb 组件，到时看是否用上 */}
            <Link href="/work/0">文档1</Link>
          </span>
        </div>
      </div>
      <div className="flex-1 text-end">
        {/* 后续再拆分组件 */}
        <div className="inline-flex items-center">
          {/* <Button variant="ghost">
            <Star className="h-4 w-4" />
            &nbsp;收藏
          </Button> */}
          <ChangeTheme />
        </div>
      </div>
    </div>
  );
}
