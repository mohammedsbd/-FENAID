-- AlterTable
ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "canExportIdentified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE IF NOT EXISTS "SavedQuery" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "isOrgWide" BOOLEAN NOT NULL DEFAULT false,
    "filters" JSONB NOT NULL,
    "columns" JSONB NOT NULL,
    "dataSubject" TEXT NOT NULL,
    "sortBy" TEXT,
    "sortDir" TEXT,
    "lastRunAt" TIMESTAMP(3),
    "lastRunCount" INTEGER,
    "isScheduled" BOOLEAN NOT NULL DEFAULT false,
    "scheduleFrequency" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedQuery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DataExportLog" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "savedQueryId" TEXT,
    "queryFilters" JSONB NOT NULL,
    "queryColumns" JSONB NOT NULL,
    "dataSubject" TEXT NOT NULL,
    "recordCount" INTEGER NOT NULL,
    "exportFormat" TEXT NOT NULL,
    "anonymized" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataExportLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SavedQuery_createdById_idx" ON "SavedQuery"("createdById");
CREATE INDEX IF NOT EXISTS "SavedQuery_isOrgWide_idx" ON "SavedQuery"("isOrgWide");
CREATE INDEX IF NOT EXISTS "DataExportLog_staffId_idx" ON "DataExportLog"("staffId");
CREATE INDEX IF NOT EXISTS "DataExportLog_savedQueryId_idx" ON "DataExportLog"("savedQueryId");
CREATE INDEX IF NOT EXISTS "DataExportLog_createdAt_idx" ON "DataExportLog"("createdAt");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SavedQuery_createdById_fkey') THEN
    ALTER TABLE "SavedQuery" ADD CONSTRAINT "SavedQuery_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DataExportLog_staffId_fkey') THEN
    ALTER TABLE "DataExportLog" ADD CONSTRAINT "DataExportLog_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
