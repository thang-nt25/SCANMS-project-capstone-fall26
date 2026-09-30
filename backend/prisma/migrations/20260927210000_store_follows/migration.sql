CREATE TABLE "store_follows" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "store_follows_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "store_follows_store_id_user_id_key" ON "store_follows"("store_id", "user_id");
CREATE INDEX "store_follows_user_id_idx" ON "store_follows"("user_id");
ALTER TABLE "store_follows" ADD CONSTRAINT "store_follows_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "store_follows" ADD CONSTRAINT "store_follows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
