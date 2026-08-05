-- AlterTable
ALTER TABLE "Volunteer" ADD COLUMN "isOrganization" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Volunteer" ADD COLUMN "organizationName" TEXT;
ALTER TABLE "Volunteer" ADD COLUMN "organizationLocation" TEXT;
ALTER TABLE "Volunteer" ADD COLUMN "organizationPhone" TEXT;
ALTER TABLE "Volunteer" ALTER COLUMN "firstName" DROP NOT NULL;
ALTER TABLE "Volunteer" ALTER COLUMN "lastName" DROP NOT NULL;
ALTER TABLE "Volunteer" ALTER COLUMN "phone" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Volunteer_organizationName_idx" ON "Volunteer"("organizationName");
