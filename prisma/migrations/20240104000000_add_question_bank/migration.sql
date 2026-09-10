-- Create QuestionBank table
CREATE TABLE "QuestionBank" (
    "id" TEXT NOT NULL,
    "adminUsername" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuestionBank_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QuestionBank_adminUsername_name_key" ON "QuestionBank"("adminUsername", "name");

-- Migrate existing questions: create one default bank per admin
INSERT INTO "QuestionBank" ("id", "adminUsername", "name", "isShared", "createdAt")
SELECT gen_random_uuid()::text, "adminUsername", '預設題庫', false, NOW()
FROM (SELECT DISTINCT "adminUsername" FROM "Question") AS admins;

-- Add bankId column (nullable first)
ALTER TABLE "Question" ADD COLUMN "bankId" TEXT;

-- Assign existing questions to their admin's default bank
UPDATE "Question" q
SET "bankId" = b.id
FROM "QuestionBank" b
WHERE b."adminUsername" = q."adminUsername";

-- Make bankId NOT NULL and add FK
ALTER TABLE "Question" ALTER COLUMN "bankId" SET NOT NULL;
ALTER TABLE "Question" ADD CONSTRAINT "Question_bankId_fkey"
    FOREIGN KEY ("bankId") REFERENCES "QuestionBank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Remove old columns
ALTER TABLE "Question" DROP COLUMN "adminUsername";
ALTER TABLE "Question" DROP COLUMN "isShared";
