import { getUserInfo } from "@/lib/session";
import { db } from "@/db/db";
import StandardList from "./standard-list";

export default async function RulesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUserInfo();
  if (!user || !user.id) return null;

  const standards = await db.standard.findMany({
    include: {
      user: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="flex h-[calc(100vh-46px)]">
      <StandardList standards={standards} />
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
