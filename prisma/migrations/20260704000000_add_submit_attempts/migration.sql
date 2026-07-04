-- Fix #3: retry counter untuk fallback §8.2 (2-3x submit ulang -> eskalasi Dinsos)
ALTER TABLE "Milestone" ADD COLUMN "submitAttempts" INTEGER NOT NULL DEFAULT 0;
