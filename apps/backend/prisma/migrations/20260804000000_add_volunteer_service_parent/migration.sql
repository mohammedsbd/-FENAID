-- Allow a volunteer service to target a parent as well as a child.
-- Both stay nullable: when neither is set the service is a general one.
ALTER TABLE "VolunteerService" ADD COLUMN "parentId" TEXT;

-- CreateIndex
CREATE INDEX "VolunteerService_parentId_idx" ON "VolunteerService"("parentId");

-- AddForeignKey
ALTER TABLE "VolunteerService" ADD CONSTRAINT "VolunteerService_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
