CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "adminUsername" TEXT NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "type" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 3,
    "isBonus" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "gradingHint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);
