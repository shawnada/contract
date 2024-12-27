import { db } from "@/db/db";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserInfo } from "@/lib/session";

export default async function Work() {
  let pathname = "/work/0";

  const user = await getUserInfo();
  if (user && user.id) {
    const firstDoc = await db.doc.findFirst({
      where: { userId: user.id },
      orderBy: {
        updatedAt: "desc",
      },
    });
    if (firstDoc != null) pathname = `/work/${firstDoc?.id}`; // 找到第一篇文档，然后跳转过去
  }

  redirect(pathname);

  return (
    <Wrapper>
      <Link href={pathname} className="underline">
        跳转到 {pathname}
      </Link>
    </Wrapper>
  );
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
