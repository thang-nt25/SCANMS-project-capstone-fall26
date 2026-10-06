ALTER TABLE "live_shopping_sessions" ADD COLUMN "governance" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "stores" ADD COLUMN "live_restriction_until" TIMESTAMPTZ(6), ADD COLUMN "live_cooperation_blocked" BOOLEAN NOT NULL DEFAULT false;
