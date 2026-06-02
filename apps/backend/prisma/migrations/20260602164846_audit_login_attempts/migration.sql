-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_staffId_fkey";

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "staffId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
