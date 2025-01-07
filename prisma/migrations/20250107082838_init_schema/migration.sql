/*
  Warnings:

  - A unique constraint covering the columns `[guid]` on the table `Comment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `guid` to the `Comment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "guid" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Comment_guid_key" ON "Comment"("guid");
