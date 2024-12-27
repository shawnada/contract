"use server";

import { db } from "@/db/db";
import { revalidatePath } from "next/cache";
import { getUserInfo } from "@/lib/session";

// 添加管理员检查函数
function isAdmin(email: string): boolean {
  return email === "jx@zlsoft.com";
}

export async function getStandard(id: string) {
  try {
    const user = await getUserInfo();
    if (!user?.id) return null;

    const standard = await db.standard.findUnique({
      where: {
        id,
      },
      include: {
        rules: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    return standard;
  } catch (error) {
    console.error("Error fetching standard:", error);
    return null;
  }
}

export async function createStandard() {
  const user = await getUserInfo();
  if (!user?.id) throw new Error("Unauthorized");

  const standard = await db.standard.create({
    data: {
      title: "未命名标准",
      userId: user.id,
    },
  });
  revalidatePath("/rules");
  return standard;
}

export async function updateStandard(id: string, data: { title?: string }) {
  const user = await getUserInfo();
  if (!user?.id) throw new Error("Unauthorized");

  const standard = await db.standard.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!standard) {
    throw new Error("Standard not found");
  }

  // 检查是否是创建者或管理员
  if (standard.userId !== user.id && !isAdmin(user.email || "")) {
    throw new Error("Only the creator can update this standard");
  }

  const updatedStandard = await db.standard.update({
    where: { id },
    data,
  });
  revalidatePath("/rules");
  return updatedStandard;
}

export async function createRule(
  standardId: string,
  data: {
    category: string;
    level: string;
    principle: string;
    clause: string;
    submitter: string;
  },
) {
  const rule = await db.rule.create({
    data: {
      ...data,
      standardId,
    },
    select: {
      id: true,
      category: true,
      level: true,
      principle: true,
      clause: true,
      submitter: true,
      createdAt: true,
    },
  });
  revalidatePath(`/rules/${standardId}`);
  return rule;
}

export async function updateRule(
  id: string,
  standardId: string,
  data: {
    category?: string;
    level?: string;
    principle?: string;
    clause?: string;
    submitter?: string;
  },
) {
  const rule = await db.rule.update({
    where: { id },
    data,
  });
  revalidatePath(`/rules/${standardId}`);
  return rule;
}

export async function deleteRule(id: string, standardId: string) {
  await db.rule.delete({
    where: { id },
  });
  revalidatePath(`/rules/${standardId}`);
}

export async function deleteStandard(id: string) {
  try {
    const user = await getUserInfo();
    if (!user?.id) throw new Error("Unauthorized");

    const standard = await db.standard.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!standard) {
      return { success: false, error: "Standard not found" };
    }

    // 检查是否是创建者或管理员
    if (standard.userId !== user.id && !isAdmin(user.email || "")) {
      return {
        success: false,
        error: "Unauthorized: Only the creator can delete this standard",
      };
    }

    await db.standard.delete({
      where: { id },
    });

    revalidatePath("/rules");
    return { success: true };
  } catch (error) {
    console.error("Error deleting standard:", error);
    return { success: false, error: error.message };
  }
}
