-- Menambah enum CampaignCategory + kolom category, latitude, longitude ke tabel
-- Campaign. Field ini ada di schema.prisma tapi belum ada di migration init.
-- Idempotent agar aman di DB lokal (yang mungkin sudah punya via db push) & production.

-- Enum CampaignCategory (buat hanya jika belum ada)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CampaignCategory') THEN
        CREATE TYPE "CampaignCategory" AS ENUM ('PEMBANGUNAN', 'PENGADAAN_BARANG', 'ALAT_KESEHATAN', 'REKONSTRUKSI');
    END IF;
END$$;

-- Kolom baru di Campaign
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "category" "CampaignCategory";
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;

-- Kolom baru di Milestone (amount, latitude, longitude) yang ada di schema
-- tapi belum ada di migration init.
ALTER TABLE "Milestone" ADD COLUMN IF NOT EXISTS "amount" BIGINT;
ALTER TABLE "Milestone" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "Milestone" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;