"use server";

import { db } from "@/db/db";
import { revalidatePath } from "next/cache";
import { getUserInfo } from "@/lib/session";

export async function updateRule(ruleId: string, data: { principle?: string }) {
  try {
    const user = await getUserInfo();
    if (!user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // 验证规则所有权
    const rule = await db.rule.findUnique({
      where: { id: ruleId },
      include: { standard: true },
    });

    if (!rule) {
      return { success: false, error: "Rule not found" };
    }

    // 检查是否是创建者或管理员
    if (rule.standard.userId !== user.id && !isAdmin(user.email || "")) {
      return {
        success: false,
        error: "Unauthorized: Only the creator can update this rule",
      };
    }

    // 更新规则
    const updatedRule = await db.rule.update({
      where: { id: ruleId },
      data,
    });

    // 重新验证路径以更新UI
    revalidatePath(`/rules/${rule.standardId}`);

    return { success: true, data: updatedRule };
  } catch (error) {
    console.error("Error updating rule:", error);
    return { success: false, error: error.message };
  }
}
