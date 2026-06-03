/*
  Warnings:

  - A unique constraint covering the columns `[idTag]` on the table `Child` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[idTag]` on the table `Parent` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "userAgent" TEXT;

-- AlterTable
ALTER TABLE "Child" ADD COLUMN     "idTag" TEXT;

-- AlterTable
ALTER TABLE "Parent" ADD COLUMN     "idTag" TEXT;

-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "notificationPreferences" JSONB,
ADD COLUMN     "passwordUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "photoUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Child_idTag_key" ON "Child"("idTag");

-- CreateIndex
CREATE UNIQUE INDEX "Parent_idTag_key" ON "Parent"("idTag");

-- CreateIndex
CREATE INDEX "Parent_fullName_idx" ON "Parent"("fullName");

-- CreateIndex
CREATE INDEX "Session_tokenId_idx" ON "Session"("tokenId");
