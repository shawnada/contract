import prisma from "./prisma";

export async function cleanupExpiredSessions() {
  try {
    const result = await prisma.session.deleteMany({
      where: {
        expires: {
          lt: new Date(),
        },
      },
    });
    console.log(`Cleaned up ${result.count} expired sessions`);
  } catch (error) {
    console.error("Failed to cleanup sessions:", error);
  }
}
