-- Split Volunteer fullName into firstName and lastName
-- Step 1: Add nullable columns
ALTER TABLE "Volunteer" ADD COLUMN "firstName" TEXT;
ALTER TABLE "Volunteer" ADD COLUMN "lastName" TEXT;

-- Step 2: Migrate existing data (split on first space)
UPDATE "Volunteer"
SET
  "firstName" = SPLIT_PART("fullName", ' ', 1),
  "lastName" = SUBSTRING("fullName" FROM LENGTH(SPLIT_PART("fullName", ' ', 1)) + 2);

-- Handle single-word names: move fullName to firstName
UPDATE "Volunteer"
SET "firstName" = "fullName", "lastName" = ''
WHERE "lastName" IS NULL;

-- Step 3: Make columns NOT NULL
ALTER TABLE "Volunteer" ALTER COLUMN "firstName" SET NOT NULL;
ALTER TABLE "Volunteer" ALTER COLUMN "lastName" SET NOT NULL;

-- Step 4: Drop old column and index
DROP INDEX IF EXISTS "Volunteer_fullName_idx";
ALTER TABLE "Volunteer" DROP COLUMN "fullName";

-- Step 5: Create new indexes
CREATE INDEX "Volunteer_firstName_idx" ON "Volunteer"("firstName");
CREATE INDEX "Volunteer_lastName_idx" ON "Volunteer"("lastName");
