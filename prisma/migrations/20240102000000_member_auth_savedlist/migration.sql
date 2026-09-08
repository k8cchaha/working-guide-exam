ALTER TABLE "Exam" ADD COLUMN "adminUsername" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Exam" ADD COLUMN "authMode" TEXT NOT NULL DEFAULT 'NAME_ONLY';

ALTER TABLE "Member" ADD COLUMN "password" TEXT;

CREATE TABLE "SavedList" (
    "id" TEXT NOT NULL,
    "adminUsername" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "authMode" TEXT NOT NULL DEFAULT 'NAME_ONLY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavedList_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SavedList_adminUsername_name_key" ON "SavedList"("adminUsername", "name");

CREATE TABLE "SavedListMember" (
    "id" TEXT NOT NULL,
    "savedListId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT,
    CONSTRAINT "SavedListMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SavedListMember_savedListId_name_key" ON "SavedListMember"("savedListId", "name");

ALTER TABLE "SavedListMember" ADD CONSTRAINT "SavedListMember_savedListId_fkey"
    FOREIGN KEY ("savedListId") REFERENCES "SavedList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
