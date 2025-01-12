-- 确保 Session 表存在并且结构正确
CREATE TABLE IF NOT EXISTS "Session" (
  "id" TEXT NOT NULL,
  "sessionToken" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Session_sessionToken_key" UNIQUE ("sessionToken")
);

-- 确保有正确的外键约束
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" 
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 创建索引提高查询性能
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId"); 