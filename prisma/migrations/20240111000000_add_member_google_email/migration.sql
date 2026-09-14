ALTER TABLE "Member" ADD COLUMN "googleEmail" TEXT;

CREATE UNIQUE INDEX "Member_examId_googleEmail_key" ON "Member"("examId", "googleEmail");
