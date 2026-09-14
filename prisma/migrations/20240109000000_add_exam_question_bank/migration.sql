ALTER TABLE "Exam" ADD COLUMN "questionBankId" TEXT;

ALTER TABLE "Exam" ADD CONSTRAINT "Exam_questionBankId_fkey"
  FOREIGN KEY ("questionBankId") REFERENCES "QuestionBank"("id") ON DELETE SET NULL ON UPDATE CASCADE;
