import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "./prisma";

export const authConfig = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  // 添加错误处理
  events: {
    async error(error) {
      console.error("NextAuth error:", error);
    },
  },
  debug: process.env.NODE_ENV === "development",
};
