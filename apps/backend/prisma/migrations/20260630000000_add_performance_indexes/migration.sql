-- Add performance indexes for Staff
CREATE INDEX IF NOT EXISTS "Staff_role_isActive_idx" ON "Staff"("role", "isActive");
CREATE INDEX IF NOT EXISTS "Staff_createdAt_idx" ON "Staff"("createdAt");

-- Add performance indexes for Parent
CREATE INDEX IF NOT EXISTS "Parent_createdAt_idx" ON "Parent"("createdAt");
CREATE INDEX IF NOT EXISTS "Parent_assignedStaffId_status_idx" ON "Parent"("assignedStaffId", "status");
CREATE INDEX IF NOT EXISTS "Parent_financialBracket_idx" ON "Parent"("financialBracket");

-- Add performance indexes for Child
CREATE INDEX IF NOT EXISTS "Child_createdAt_idx" ON "Child"("createdAt");
CREATE INDEX IF NOT EXISTS "Child_assignedStaffId_status_idx" ON "Child"("assignedStaffId", "status");
CREATE INDEX IF NOT EXISTS "Child_disabilityType_idx" ON "Child"("disabilityType");
CREATE INDEX IF NOT EXISTS "Child_severityLevel_idx" ON "Child"("severityLevel");
CREATE INDEX IF NOT EXISTS "Child_dateOfBirth_idx" ON "Child"("dateOfBirth");

-- Add performance indexes for Service
CREATE INDEX IF NOT EXISTS "Service_name_idx" ON "Service"("name");

-- Add performance indexes for ServiceAssignment
CREATE INDEX IF NOT EXISTS "ServiceAssignment_assignedStaffId_status_idx" ON "ServiceAssignment"("assignedStaffId", "status");
CREATE INDEX IF NOT EXISTS "ServiceAssignment_status_endDate_idx" ON "ServiceAssignment"("status", "endDate");
CREATE INDEX IF NOT EXISTS "ServiceAssignment_createdAt_idx" ON "ServiceAssignment"("createdAt");

-- Add performance indexes for FundAllocation
CREATE INDEX IF NOT EXISTS "FundAllocation_status_createdAt_idx" ON "FundAllocation"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "FundAllocation_status_allocationDate_idx" ON "FundAllocation"("status", "allocationDate");
CREATE INDEX IF NOT EXISTS "FundAllocation_allocationDate_idx" ON "FundAllocation"("allocationDate");

-- Add performance indexes for Donation
CREATE INDEX IF NOT EXISTS "Donation_donationDate_idx" ON "Donation"("donationDate");
CREATE INDEX IF NOT EXISTS "Donation_donorType_idx" ON "Donation"("donorType");

-- Add performance indexes for ProgressNote
CREATE INDEX IF NOT EXISTS "ProgressNote_childId_createdAt_idx" ON "ProgressNote"("childId", "createdAt");

-- Add performance indexes for Milestone
CREATE INDEX IF NOT EXISTS "Milestone_childId_createdAt_idx" ON "Milestone"("childId", "createdAt");

-- Add performance indexes for Goal
CREATE INDEX IF NOT EXISTS "Goal_childId_createdAt_idx" ON "Goal"("childId", "createdAt");

-- Add performance indexes for Appointment
CREATE INDEX IF NOT EXISTS "Appointment_staffId_scheduledAt_idx" ON "Appointment"("staffId", "scheduledAt");
CREATE INDEX IF NOT EXISTS "Appointment_status_scheduledAt_idx" ON "Appointment"("status", "scheduledAt");

-- Add performance indexes for Document
CREATE INDEX IF NOT EXISTS "Document_createdAt_idx" ON "Document"("createdAt");

-- Add performance indexes for Notification
CREATE INDEX IF NOT EXISTS "Notification_staffId_isRead_createdAt_idx" ON "Notification"("staffId", "isRead", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_staffId_type_entityType_entityId_isRead_idx" ON "Notification"("staffId", "type", "entityType", "entityId", "isRead");

-- Add performance indexes for AuditLog
CREATE INDEX IF NOT EXISTS "AuditLog_staffId_createdAt_idx" ON "AuditLog"("staffId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- Add performance indexes for Session
CREATE INDEX IF NOT EXISTS "Session_staffId_revokedAt_idx" ON "Session"("staffId", "revokedAt");

-- Add performance indexes for SavedQuery
CREATE INDEX IF NOT EXISTS "SavedQuery_dataSubject_idx" ON "SavedQuery"("dataSubject");
