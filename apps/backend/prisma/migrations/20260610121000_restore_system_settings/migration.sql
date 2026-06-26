-- Restore SystemSetting table used by SettingsService raw SQL endpoints.
-- A previous split-name migration dropped this table, which causes /settings/system
-- to return 500 at runtime.
CREATE TABLE IF NOT EXISTS "SystemSetting" (
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updatedById" TEXT,
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
      FOREIGN KEY ("updatedById") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "SystemSetting" ("key", "value")
VALUES ('calendar', '{"calendarSystem":"GREGORIAN"}'::jsonb)
ON CONFLICT ("key") DO NOTHING;
