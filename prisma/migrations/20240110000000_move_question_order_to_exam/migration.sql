ALTER TABLE "QuestionBank" DROP COLUMN "questionOrder";

ALTER TABLE "Exam" ADD COLUMN "questionOrder" TEXT NOT NULL DEFAULT 'random';
