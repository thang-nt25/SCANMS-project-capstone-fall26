-- User.avatarUrl already exists in schema.prisma and the shared development DB,
-- but older migrations did not create it. Keep clean database rebuilds reproducible.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" TEXT;

-- The platform was added in application code without a matching historical migration.
ALTER TYPE "LiveSessionPlatform" ADD VALUE IF NOT EXISTS 'SCANMS';
ALTER TYPE "ReferralLinkStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
ALTER TYPE "OrderSourcePlatform" ADD VALUE IF NOT EXISTS 'LAZADA';
ALTER TYPE "OrderSourcePlatform" ADD VALUE IF NOT EXISTS 'TIKI';
