-- Normalize legacy free-text education levels on Parent to the canonical enum values
-- used by the parent registration form (parent-drawer).
UPDATE "Parent"
SET "educationLevel" = 'DIPLOMA'
WHERE "educationLevel" = 'Diploma';

UPDATE "Parent"
SET "educationLevel" = 'SECONDARY'
WHERE "educationLevel" = 'Secondary school';
