-- Add source tagging so live/manual records can be separated from seeded test data.
ALTER TABLE "Offer"
ADD COLUMN IF NOT EXISTS "isSeed" BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill the known seeded offer so it stays hidden from the live dashboard.
UPDATE "Offer"
SET "isSeed" = TRUE
WHERE "title" = 'Arsenal welcome offer'
  AND "bookmakerId" = (
    SELECT id
    FROM "Bookmaker"
    WHERE name = 'Coral'
    LIMIT 1
  );
