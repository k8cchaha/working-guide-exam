CREATE TYPE "ExamStatus" AS ENUM ('ACTIVE', 'PUBLISHED');

CREATE TABLE "Exam" (
    "id" TEXT NOT NULL,
    "passingScore" INTEGER NOT NULL,
    "status" "ExamStatus" NOT NULL DEFAULT 'ACTIVE',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "autoScore" INTEGER NOT NULL DEFAULT 0,
    "manualScore" INTEGER,
    "totalScore" INTEGER,
    "avatarId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Member_examId_name_key" ON "Member"("examId", "name");
CREATE UNIQUE INDEX "Submission_memberId_key" ON "Submission"("memberId");

ALTER TABLE "Member" ADD CONSTRAINT "Member_examId_fkey"
    FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Submission" ADD CONSTRAINT "Submission_memberId_fkey"
    FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Submission" ADD CONSTRAINT "Submission_examId_fkey"
    FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
