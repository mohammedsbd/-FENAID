CREATE TABLE IF NOT EXISTS "SystemSetting" (
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

CREATE INDEX IF NOT EXISTS "SystemSetting_updatedById_idx" ON "SystemSetting"("updatedById");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SystemSetting_updatedById_fkey'
  ) THEN
    ALTER TABLE "SystemSetting"
      ADD CONSTRAINT "SystemSetting_updatedById_fkey"
      FOREIGN KEY ("updatedById") REFERENCES "Staff"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "SystemSetting" ("key", "value")
VALUES ('calendar', '{"calendarSystem":"GREGORIAN"}'::jsonb)
ON CONFLICT ("key") DO NOTHING;
