"use client";

import Link from "next/link";
import { FileText, Ellipsis, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { handleDocDelete } from "@/components/doc-operations";
import { useRouter } from "next/navigation";

interface IProps {
  id: string;
  title: string;
  isCurrent: boolean;
}

export default function Item(props: IProps) {
  const { id, title, isCurrent } = props;
  const router = useRouter();

  const handleDelete = async () => {
    const success = await handleDocDelete(id);
    if (success) {
      router.refresh();
    }
  };

  return (
    <div
      className={cn(
        "flex justify-between w-full p-2 cursor-pointer hover:text-secondary-foreground group",
        isCurrent ? "bg-card" : "hover:bg-card",
      )}
    >
      <Link href={`/work/${id}`} className="inline-flex items-center">
        <FileText className="h-4 w-4" />
        &nbsp;{title || "<无标题>"}
      </Link>

      <div className="inline-flex items-center invisible group-hover:visible">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Ellipsis className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem className="cursor-pointer" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
              &nbsp;删除
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>其他操作</DropdownMenuItem>
            <DropdownMenuItem>其他操作</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
