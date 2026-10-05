ALTER TABLE "live_shopping_sessions"
ADD COLUMN "external_channels" JSONB NOT NULL DEFAULT '[]'::jsonb;
