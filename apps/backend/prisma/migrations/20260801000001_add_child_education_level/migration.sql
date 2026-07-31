-- Add optional education level to Child so children can be filtered by
-- education level data in the Data Query feature, mirroring Parent.
ALTER TABLE "Child" ADD COLUMN "educationLevel" TEXT;

-- Backfill from parent education level where a child's parent has one.
UPDATE "Child" AS c
SET "educationLevel" = p."educationLevel"
FROM "ChildParent" AS cp
JOIN "Parent" AS p ON p."id" = cp."parentId"
WHERE cp."childId" = c."id"
  AND c."educationLevel" IS NULL
  AND p."educationLevel" IS NOT NULL;
