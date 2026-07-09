-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('PAID', 'UNPAID');

-- AlterTable
ALTER TABLE "Parent" ADD COLUMN     "membershipFee" DECIMAL(12,2),
ADD COLUMN     "membershipStatus" "MembershipStatus" NOT NULL DEFAULT 'UNPAID';

-- CreateIndex
CREATE INDEX "Parent_membershipStatus_idx" ON "Parent"("membershipStatus");
