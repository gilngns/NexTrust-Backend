-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN "totalRaised" DECIMAL(30,0) NOT NULL DEFAULT 0;
ALTER TABLE "Campaign" ADD COLUMN "donorCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Campaign" ADD COLUMN "escrowBalance" DECIMAL(30,0) NOT NULL DEFAULT 0;
ALTER TABLE "Campaign" ADD COLUMN "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Campaign_status_createdAt_idx" ON "Campaign"("status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Campaign_category_status_idx" ON "Campaign"("category", "status");
