-- Add soft-delete columns
ALTER TABLE "Parent" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Child" ADD COLUMN "deletedAt" TIMESTAMP(3);
