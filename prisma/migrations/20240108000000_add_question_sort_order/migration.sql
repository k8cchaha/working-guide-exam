ALTER TABLE "Question" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Set initial sortOrder values based on createdAt order within each bank
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "bankId" ORDER BY "createdAt" ASC) - 1 AS rn
  FROM "Question"
)
UPDATE "Question"
SET "sortOrder" = ranked.rn
FROM ranked
WHERE "Question".id = ranked.id;
