import { redirect } from "next/navigation";
import { getUserInfo } from "@/lib/session";

export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getUserInfo();
  if (user == null) {
    redirect("/user-info");
    return null;
  }

  return <>{children}</>;
}
