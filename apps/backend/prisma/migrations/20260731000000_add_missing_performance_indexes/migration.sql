-- Add missing indexes for query performance

-- ChildParent: queries joining from Child side
CREATE INDEX IF NOT EXISTS "ChildParent_childId_idx" ON "ChildParent"("childId");

-- FundAllocation: parent profile queries sorted by allocationDate or createdAt
CREATE INDEX IF NOT EXISTS "FundAllocation_parentId_allocationDate_idx" ON "FundAllocation"("parentId", "allocationDate");
CREATE INDEX IF NOT EXISTS "FundAllocation_parentId_createdAt_idx" ON "FundAllocation"("parentId", "createdAt");

-- Document: parent/child profile queries sorted by createdAt
CREATE INDEX IF NOT EXISTS "Document_parentId_createdAt_idx" ON "Document"("parentId", "createdAt");
CREATE INDEX IF NOT EXISTS "Document_childId_createdAt_idx" ON "Document"("childId", "createdAt");

-- Referral: parent/child profile queries sorted by referralDate
CREATE INDEX IF NOT EXISTS "Referral_parentId_referralDate_idx" ON "Referral"("parentId", "referralDate");
CREATE INDEX IF NOT EXISTS "Referral_childId_referralDate_idx" ON "Referral"("childId", "referralDate");

-- ServiceAssignment: parent/child profile queries sorted by startDate
CREATE INDEX IF NOT EXISTS "ServiceAssignment_parentId_startDate_idx" ON "ServiceAssignment"("parentId", "startDate");
CREATE INDEX IF NOT EXISTS "ServiceAssignment_childId_startDate_idx" ON "ServiceAssignment"("childId", "startDate");

-- Notification: "all notifications" query sorted by createdAt
CREATE INDEX IF NOT EXISTS "Notification_staffId_createdAt_idx" ON "Notification"("staffId", "createdAt");

-- Goal: staff viewing goals sorted by createdAt
CREATE INDEX IF NOT EXISTS "Goal_staffId_createdAt_idx" ON "Goal"("staffId", "createdAt");
