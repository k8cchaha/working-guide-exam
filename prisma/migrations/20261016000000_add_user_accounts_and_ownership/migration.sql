CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

ALTER TABLE "Exam" ADD COLUMN "ownerKey" TEXT;
ALTER TABLE "SavedList" ADD COLUMN "ownerKey" TEXT;
ALTER TABLE "QuestionBank" ADD COLUMN "ownerKey" TEXT;

UPDATE "Exam" SET "ownerKey" = 'admin:' || "adminUsername";
UPDATE "SavedList" SET "ownerKey" = 'admin:' || "adminUsername";
UPDATE "QuestionBank" SET "ownerKey" = 'admin:' || "adminUsername";

ALTER TABLE "Exam" ALTER COLUMN "ownerKey" SET NOT NULL;
ALTER TABLE "SavedList" ALTER COLUMN "ownerKey" SET NOT NULL;
ALTER TABLE "QuestionBank" ALTER COLUMN "ownerKey" SET NOT NULL;

CREATE INDEX "Exam_ownerKey_idx" ON "Exam"("ownerKey");
CREATE UNIQUE INDEX "SavedList_ownerKey_name_key" ON "SavedList"("ownerKey", "name");
CREATE UNIQUE INDEX "QuestionBank_ownerKey_name_key" ON "QuestionBank"("ownerKey", "name");

DROP INDEX "SavedList_adminUsername_name_key";
DROP INDEX "QuestionBank_adminUsername_name_key";
