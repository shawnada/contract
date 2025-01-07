/*
  Warnings:

  - You are about to drop the column `docId` on the `Comment` table. All the data in the column will be lost.
  - You are about to drop the column `position` on the `Comment` table. All the data in the column will be lost.
  - Added the required column `documentId` to the `Comment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rangeText` to the `Comment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userName` to the `Comment` table without a default value. This is not possible if the table is not empty.
  - Made the column `riskLevel` on table `Comment` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_docId_fkey";

-- DropIndex
DROP INDEX "Comment_docId_idx";

-- AlterTable
ALTER TABLE "Comment" DROP COLUMN "docId",
DROP COLUMN "position",
ADD COLUMN     "additionalContent" TEXT,
ADD COLUMN     "documentCommentId" TEXT,
ADD COLUMN     "documentId" TEXT NOT NULL,
ADD COLUMN     "isLocated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rangeText" TEXT NOT NULL,
ADD COLUMN     "userName" TEXT NOT NULL,
ALTER COLUMN "riskLevel" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Comment_documentId_idx" ON "Comment"("documentId");

-- CreateIndex
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Doc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
