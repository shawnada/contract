import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserInfo } from "@/lib/session";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getUserInfo();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ruleId = params.id;
    const data = await request.json();

    // 验证规则所有权
    const rule = await prisma.rule.findUnique({
      where: { id: ruleId },
      include: { standard: true },
    });

    if (!rule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    if (rule.standard.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 更新规则
    const updatedRule = await prisma.rule.update({
      where: { id: ruleId },
      data: {
        principle: data.principle,
      },
      include: {
        standard: true,
      },
    });

    return NextResponse.json(updatedRule);
  } catch (error) {
    console.error("Error updating rule:", error);
    return NextResponse.json(
      { error: "Failed to update rule" },
      { status: 500 },
    );
  }
}
