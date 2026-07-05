-- Menambah nilai DINSOS ke enum UserRole. Ada di schema.prisma tapi belum ada
-- di enum database (kemungkinan enum lama pakai PEMDA). Idempotent.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'UserRole' AND e.enumlabel = 'DINSOS'
    ) THEN
        ALTER TYPE "UserRole" ADD VALUE 'DINSOS';
    END IF;
END$$;