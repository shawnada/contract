/*
  Warnings:

  - You are about to drop the column `uuid` on the `Comment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Comment" DROP COLUMN "uuid",
ADD COLUMN     "guid" TEXT;
