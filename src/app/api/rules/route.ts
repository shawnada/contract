import { NextRequest } from "next/server";
import { db } from "@/db/db";
import { getUserInfo } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserInfo();
    if (!user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const standardId = searchParams.get("standardId");

    if (!standardId) {
      return Response.json(
        { error: "Standard ID is required" },
        { status: 400 },
      );
    }

    const rules = await db.rule.findMany({
      where: {
        standardId,
      },
      select: {
        id: true,
        category: true,
        level: true,
        principle: true,
        clause: true,
      },
    });

    return Response.json(rules);
  } catch (error) {
    console.error("Error fetching rules:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
