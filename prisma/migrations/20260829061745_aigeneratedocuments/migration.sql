-- CreateTable
CREATE TABLE "AiGeneratedDocuments" (
    "id" TEXT NOT NULL,
    "userGithubId" TEXT NOT NULL,
    "repoUrl" TEXT NOT NULL,
    "description" TEXT,
    "documentation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiGeneratedDocuments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiGeneratedDocuments_repoUrl_idx" ON "AiGeneratedDocuments"("repoUrl");
