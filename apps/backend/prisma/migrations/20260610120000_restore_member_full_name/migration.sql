-- Restore denormalized fullName fields used for searching, sorting, display, and exports.
-- The split name fields remain the source components; application code should keep
-- fullName in sync when creating/updating parents and children.

ALTER TABLE "Parent" ADD COLUMN IF NOT EXISTS "fullName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Child" ADD COLUMN IF NOT EXISTS "fullName" TEXT NOT NULL DEFAULT '';

UPDATE "Parent"
SET "fullName" = COALESCE(NULLIF(TRIM(CONCAT_WS(' ', NULLIF("firstName", ''), NULLIF("fatherName", ''), NULLIF("grandfatherName", ''))), ''), 'Unknown')
WHERE "fullName" = '';

UPDATE "Child"
SET "fullName" = COALESCE(NULLIF(TRIM(CONCAT_WS(' ', NULLIF("firstName", ''), NULLIF("fatherName", ''), NULLIF("grandfatherName", ''))), ''), 'Unknown')
WHERE "fullName" = '';


CREATE INDEX IF NOT EXISTS "Parent_fullName_idx" ON "Parent"("fullName");
CREATE INDEX IF NOT EXISTS "Child_fullName_idx" ON "Child"("fullName");
