-- CreateTable
CREATE TABLE "RabCheck" (
    "id" TEXT NOT NULL,
    "campaignDraftId" TEXT,
    "items" TEXT NOT NULL,
    "totalAmount" BIGINT NOT NULL,
    "targetAmount" BIGINT NOT NULL,
    "score" INTEGER NOT NULL,
    "reasonable" BOOLEAN NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RabCheck_pkey" PRIMARY KEY ("id")
);
