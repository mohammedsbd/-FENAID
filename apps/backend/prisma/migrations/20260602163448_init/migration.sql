-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('SUPER_ADMIN', 'CASE_WORKER');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED');

-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('EMPLOYED', 'UNEMPLOYED', 'SELF_EMPLOYED');

-- CreateEnum
CREATE TYPE "FinancialBracket" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ParentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'UNDER_REVIEW');

-- CreateEnum
CREATE TYPE "DisabilityType" AS ENUM ('PHYSICAL', 'INTELLECTUAL', 'MULTIPLE');

-- CreateEnum
CREATE TYPE "SeverityLevel" AS ENUM ('MILD', 'MODERATE', 'SEVERE');

-- CreateEnum
CREATE TYPE "SchoolEnrollmentStatus" AS ENUM ('ENROLLED', 'NOT_ENROLLED', 'GRADUATED');

-- CreateEnum
CREATE TYPE "CommunicationAbility" AS ENUM ('VERBAL', 'NON_VERBAL', 'ASSISTED');

-- CreateEnum
CREATE TYPE "ChildStatus" AS ENUM ('ACTIVE', 'GRADUATED', 'TRANSFERRED', 'INACTIVE', 'DECEASED');

-- CreateEnum
CREATE TYPE "ServiceTargetType" AS ENUM ('PARENT', 'CHILD');

-- CreateEnum
CREATE TYPE "ServiceFrequency" AS ENUM ('ONE_TIME', 'WEEKLY', 'MONTHLY', 'ONGOING');

-- CreateEnum
CREATE TYPE "ServiceDeliveryMethod" AS ENUM ('ON_SITE', 'HOME_VISIT', 'REFERRAL');

-- CreateEnum
CREATE TYPE "ServiceAssignmentStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FundAllocationStatus" AS ENUM ('ALLOCATED', 'DISBURSED', 'PARTIALLY_DISBURSED');

-- CreateEnum
CREATE TYPE "DonorType" AS ENUM ('INDIVIDUAL', 'ORGANIZATION', 'ANONYMOUS');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'ACHIEVED', 'REGRESSED');

-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('SHORT_TERM', 'LONG_TERM');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('THERAPY', 'ASSESSMENT', 'WORKSHOP', 'FUND_DISBURSEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'EXCUSED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PROGRESS_OVERDUE', 'DOCUMENT_EXPIRY', 'SERVICE_EXPIRY', 'FUND_REMINDER', 'GENERAL');

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parent" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "photoUrl" TEXT,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" TEXT NOT NULL,
    "nationalId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "subcity" TEXT NOT NULL,
    "woreda" TEXT NOT NULL,
    "maritalStatus" "MaritalStatus" NOT NULL,
    "employmentStatus" "EmploymentStatus" NOT NULL,
    "financialBracket" "FinancialBracket" NOT NULL,
    "educationLevel" TEXT NOT NULL,
    "numberOfDependents" INTEGER NOT NULL,
    "referralSource" TEXT NOT NULL,
    "status" "ParentStatus" NOT NULL,
    "internalNotes" TEXT,
    "assignedStaffId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Child" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "photoUrl" TEXT,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" TEXT NOT NULL,
    "disabilityType" "DisabilityType" NOT NULL,
    "disabilityCategory" TEXT NOT NULL,
    "severityLevel" "SeverityLevel" NOT NULL,
    "medicalHistory" TEXT,
    "medications" TEXT,
    "schoolEnrollmentStatus" "SchoolEnrollmentStatus" NOT NULL,
    "communicationAbility" "CommunicationAbility" NOT NULL,
    "status" "ChildStatus" NOT NULL,
    "internalNotes" TEXT,
    "parentId" TEXT NOT NULL,
    "assignedStaffId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Child_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "targetType" "ServiceTargetType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceAssignment" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "targetType" "ServiceTargetType" NOT NULL,
    "parentId" TEXT,
    "childId" TEXT,
    "assignedStaffId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "frequency" "ServiceFrequency" NOT NULL,
    "deliveryMethod" "ServiceDeliveryMethod" NOT NULL,
    "status" "ServiceAssignmentStatus" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundAllocation" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "allocatedById" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ETB',
    "purpose" TEXT NOT NULL,
    "allocationDate" TIMESTAMP(3) NOT NULL,
    "status" "FundAllocationStatus" NOT NULL,
    "receiptUrl" TEXT,
    "parentAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Donation" (
    "id" TEXT NOT NULL,
    "donorName" TEXT NOT NULL,
    "donorContact" TEXT,
    "donorType" "DonorType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ETB',
    "donationDate" TIMESTAMP(3) NOT NULL,
    "purpose" TEXT,
    "isRestricted" BOOLEAN NOT NULL DEFAULT false,
    "restrictedToChildId" TEXT,
    "restrictedToServiceId" TEXT,
    "receivedById" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressNote" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgressNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "MilestoneStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "GoalType" NOT NULL,
    "achievedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "childId" TEXT,
    "parentId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "type" "AppointmentType" NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" TEXT,
    "status" "AppointmentStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "parentId" TEXT,
    "childId" TEXT,
    "status" "AttendanceStatus" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "uploadedById" TEXT NOT NULL,
    "parentId" TEXT,
    "childId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "type" "NotificationType" NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Staff_email_key" ON "Staff"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Parent_nationalId_key" ON "Parent"("nationalId");

-- CreateIndex
CREATE INDEX "Parent_assignedStaffId_idx" ON "Parent"("assignedStaffId");

-- CreateIndex
CREATE INDEX "Parent_status_idx" ON "Parent"("status");

-- CreateIndex
CREATE INDEX "Child_parentId_idx" ON "Child"("parentId");

-- CreateIndex
CREATE INDEX "Child_assignedStaffId_idx" ON "Child"("assignedStaffId");

-- CreateIndex
CREATE INDEX "Child_status_idx" ON "Child"("status");

-- CreateIndex
CREATE INDEX "Service_targetType_idx" ON "Service"("targetType");

-- CreateIndex
CREATE INDEX "Service_isActive_idx" ON "Service"("isActive");

-- CreateIndex
CREATE INDEX "ServiceAssignment_serviceId_idx" ON "ServiceAssignment"("serviceId");

-- CreateIndex
CREATE INDEX "ServiceAssignment_parentId_idx" ON "ServiceAssignment"("parentId");

-- CreateIndex
CREATE INDEX "ServiceAssignment_childId_idx" ON "ServiceAssignment"("childId");

-- CreateIndex
CREATE INDEX "ServiceAssignment_assignedStaffId_idx" ON "ServiceAssignment"("assignedStaffId");

-- CreateIndex
CREATE INDEX "ServiceAssignment_status_idx" ON "ServiceAssignment"("status");

-- CreateIndex
CREATE INDEX "FundAllocation_parentId_idx" ON "FundAllocation"("parentId");

-- CreateIndex
CREATE INDEX "FundAllocation_allocatedById_idx" ON "FundAllocation"("allocatedById");

-- CreateIndex
CREATE INDEX "FundAllocation_status_idx" ON "FundAllocation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Donation_receiptNumber_key" ON "Donation"("receiptNumber");

-- CreateIndex
CREATE INDEX "Donation_restrictedToChildId_idx" ON "Donation"("restrictedToChildId");

-- CreateIndex
CREATE INDEX "Donation_restrictedToServiceId_idx" ON "Donation"("restrictedToServiceId");

-- CreateIndex
CREATE INDEX "Donation_receivedById_idx" ON "Donation"("receivedById");

-- CreateIndex
CREATE INDEX "ProgressNote_childId_idx" ON "ProgressNote"("childId");

-- CreateIndex
CREATE INDEX "ProgressNote_staffId_idx" ON "ProgressNote"("staffId");

-- CreateIndex
CREATE INDEX "Milestone_childId_idx" ON "Milestone"("childId");

-- CreateIndex
CREATE INDEX "Milestone_status_idx" ON "Milestone"("status");

-- CreateIndex
CREATE INDEX "Goal_childId_idx" ON "Goal"("childId");

-- CreateIndex
CREATE INDEX "Goal_staffId_idx" ON "Goal"("staffId");

-- CreateIndex
CREATE INDEX "Goal_type_idx" ON "Goal"("type");

-- CreateIndex
CREATE INDEX "Appointment_staffId_idx" ON "Appointment"("staffId");

-- CreateIndex
CREATE INDEX "Appointment_childId_idx" ON "Appointment"("childId");

-- CreateIndex
CREATE INDEX "Appointment_parentId_idx" ON "Appointment"("parentId");

-- CreateIndex
CREATE INDEX "Appointment_scheduledAt_idx" ON "Appointment"("scheduledAt");

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");

-- CreateIndex
CREATE INDEX "AttendanceRecord_appointmentId_idx" ON "AttendanceRecord"("appointmentId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_parentId_idx" ON "AttendanceRecord"("parentId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_childId_idx" ON "AttendanceRecord"("childId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_status_idx" ON "AttendanceRecord"("status");

-- CreateIndex
CREATE INDEX "Document_uploadedById_idx" ON "Document"("uploadedById");

-- CreateIndex
CREATE INDEX "Document_parentId_idx" ON "Document"("parentId");

-- CreateIndex
CREATE INDEX "Document_childId_idx" ON "Document"("childId");

-- CreateIndex
CREATE INDEX "Document_expiresAt_idx" ON "Document"("expiresAt");

-- CreateIndex
CREATE INDEX "Notification_staffId_idx" ON "Notification"("staffId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "AuditLog_staffId_idx" ON "AuditLog"("staffId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Parent" ADD CONSTRAINT "Parent_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Child" ADD CONSTRAINT "Child_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Child" ADD CONSTRAINT "Child_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAssignment" ADD CONSTRAINT "ServiceAssignment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAssignment" ADD CONSTRAINT "ServiceAssignment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAssignment" ADD CONSTRAINT "ServiceAssignment_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAssignment" ADD CONSTRAINT "ServiceAssignment_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundAllocation" ADD CONSTRAINT "FundAllocation_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundAllocation" ADD CONSTRAINT "FundAllocation_allocatedById_fkey" FOREIGN KEY ("allocatedById") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_restrictedToChildId_fkey" FOREIGN KEY ("restrictedToChildId") REFERENCES "Child"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_restrictedToServiceId_fkey" FOREIGN KEY ("restrictedToServiceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressNote" ADD CONSTRAINT "ProgressNote_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressNote" ADD CONSTRAINT "ProgressNote_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
