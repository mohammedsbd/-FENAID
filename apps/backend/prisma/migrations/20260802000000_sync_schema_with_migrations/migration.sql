-- NOTE: "SystemSetting" is intentionally NOT touched here even though it is
-- no longer declared in schema.prisma. The settings module (src/settings)
-- still reads/writes it via raw SQL, so dropping it would break that feature.
--
-- Statements are written defensively (IF EXISTS / IF NOT EXISTS) because
-- schema.prisma had drifted ahead of migration history via ad-hoc `db push`
-- runs, so state varies between environments that ran `db push` and fresh
-- databases built purely from migration history.

-- DropForeignKey
ALTER TABLE "Child" DROP CONSTRAINT IF EXISTS "Child_parentId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "Child_fullName_idx";

-- DropIndex
DROP INDEX IF EXISTS "Child_parentId_idx";

-- AlterTable
ALTER TABLE "Child" DROP COLUMN IF EXISTS "parentId";

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "notificationKey" TEXT,
ADD COLUMN IF NOT EXISTS "params" JSONB;

-- CreateTable
CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "IdempotencyRecord" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PasswordResetToken_staffId_idx" ON "PasswordResetToken"("staffId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "IdempotencyRecord_key_key" ON "IdempotencyRecord"("key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IdempotencyRecord_createdAt_idx" ON "IdempotencyRecord"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Appointment_staffId_status_scheduledAt_idx" ON "Appointment"("staffId", "status", "scheduledAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Appointment_type_scheduledAt_idx" ON "Appointment"("type", "scheduledAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Appointment_parentId_scheduledAt_idx" ON "Appointment"("parentId", "scheduledAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Appointment_childId_scheduledAt_idx" ON "Appointment"("childId", "scheduledAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_entity_entityId_createdAt_idx" ON "AuditLog"("entity", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_staffId_action_createdAt_idx" ON "AuditLog"("staffId", "action", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Child_assignedStaffId_createdAt_idx" ON "Child"("assignedStaffId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Child_disabilityType_severityLevel_status_idx" ON "Child"("disabilityType", "severityLevel", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Document_parentId_category_idx" ON "Document"("parentId", "category");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Document_childId_category_idx" ON "Document"("childId", "category");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Document_category_idx" ON "Document"("category");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FundAllocation_parentId_status_idx" ON "FundAllocation"("parentId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Notification_staffId_isRead_idx" ON "Notification"("staffId", "isRead");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Notification_entityType_entityId_idx" ON "Notification"("entityType", "entityId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Parent_phone_idx" ON "Parent"("phone");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Parent_email_idx" ON "Parent"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Parent_city_subcity_status_idx" ON "Parent"("city", "subcity", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Parent_assignedStaffId_createdAt_idx" ON "Parent"("assignedStaffId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ServiceAssignment_parentId_status_idx" ON "ServiceAssignment"("parentId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ServiceAssignment_childId_status_idx" ON "ServiceAssignment"("childId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ServiceAssignment_assignedStaffId_status_endDate_idx" ON "ServiceAssignment"("assignedStaffId", "status", "endDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Session_tokenId_revokedAt_idx" ON "Session"("tokenId", "revokedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Session_staffId_expiresAt_revokedAt_idx" ON "Session"("staffId", "expiresAt", "revokedAt");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
