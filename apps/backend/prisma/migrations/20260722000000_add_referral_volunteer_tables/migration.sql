-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'CONTACTED', 'COMPLETED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'REFERRAL_MADE';

-- AlterEnum
ALTER TYPE "PermissionModule" ADD VALUE 'VOLUNTEERS';
ALTER TYPE "PermissionModule" ADD VALUE 'REFERRALS';

-- CreateTable
CREATE TABLE "Volunteer" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "serviceTypes" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Volunteer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VolunteerService" (
    "id" TEXT NOT NULL,
    "volunteerId" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "childId" TEXT,
    "description" TEXT,
    "serviceDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VolunteerService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "parentId" TEXT,
    "childId" TEXT,
    "referredTo" TEXT NOT NULL,
    "referralReason" TEXT NOT NULL,
    "referralDate" TIMESTAMP(3) NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "outcome" TEXT,
    "followUpDate" TIMESTAMP(3),
    "referredById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Volunteer_email_key" ON "Volunteer"("email");

-- CreateIndex
CREATE INDEX "Volunteer_fullName_idx" ON "Volunteer"("fullName");

-- CreateIndex
CREATE INDEX "Volunteer_email_idx" ON "Volunteer"("email");

-- CreateIndex
CREATE INDEX "VolunteerService_volunteerId_idx" ON "VolunteerService"("volunteerId");

-- CreateIndex
CREATE INDEX "VolunteerService_childId_idx" ON "VolunteerService"("childId");

-- CreateIndex
CREATE INDEX "Referral_parentId_idx" ON "Referral"("parentId");

-- CreateIndex
CREATE INDEX "Referral_childId_idx" ON "Referral"("childId");

-- CreateIndex
CREATE INDEX "Referral_referredById_idx" ON "Referral"("referredById");

-- CreateIndex
CREATE INDEX "Referral_status_idx" ON "Referral"("status");

-- CreateIndex
CREATE INDEX "Referral_referralDate_idx" ON "Referral"("referralDate");

-- CreateIndex
CREATE INDEX "Referral_referredById_status_idx" ON "Referral"("referredById", "status");

-- AddForeignKey
ALTER TABLE "VolunteerService" ADD CONSTRAINT "VolunteerService_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "Volunteer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VolunteerService" ADD CONSTRAINT "VolunteerService_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
