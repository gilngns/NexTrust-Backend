-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'FOUNDATION', 'PEMDA', 'DONOR');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'FUNDED', 'VALIDATED', 'ADVANCE_PAID', 'MILESTONE_SUBMITTED', 'FROZEN', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DonationStatus" AS ENUM ('PENDING', 'PAID', 'DEPOSITED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'SUBMITTED', 'EVALUATING', 'APPROVED', 'REJECTED', 'RELEASED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'FOUNDATION',
    "custodialAddress" TEXT,
    "encryptedKey" TEXT,
    "bankName" TEXT,
    "bankAccountNo" TEXT,
    "bankHolder" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "onChainId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "rabCID" TEXT,
    "targetAmount" BIGINT NOT NULL,
    "advanceAmount" BIGINT NOT NULL,
    "milestoneAmount" BIGINT NOT NULL,
    "totalMilestones" INTEGER NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "txHashCreate" TEXT,
    "foundationId" TEXT NOT NULL,
    "beneficiary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Donation" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "donorName" TEXT,
    "donorAddress" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "status" "DonationStatus" NOT NULL DEFAULT 'PENDING',
    "orderId" TEXT NOT NULL,
    "qrisUrl" TEXT,
    "paidAt" TIMESTAMP(3),
    "txHashDeposit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "title" TEXT,
    "evidenceCID" TEXT,
    "metadataHash" TEXT,
    "aiScore" INTEGER,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "txHashSubmit" TEXT,
    "txHashOracle" TEXT,
    "txHashRelease" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "foundationId" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "bankName" TEXT,
    "bankAccountNo" TEXT,
    "payoutRef" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_custodialAddress_key" ON "User"("custodialAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_onChainId_key" ON "Campaign"("onChainId");

-- CreateIndex
CREATE UNIQUE INDEX "Donation_orderId_key" ON "Donation"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Milestone_campaignId_index_key" ON "Milestone"("campaignId", "index");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_foundationId_fkey" FOREIGN KEY ("foundationId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_foundationId_fkey" FOREIGN KEY ("foundationId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
