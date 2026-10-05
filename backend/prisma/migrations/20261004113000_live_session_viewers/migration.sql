CREATE TABLE "live_session_viewers" (
  "session_id" UUID NOT NULL,
  "client_id" VARCHAR(100) NOT NULL,
  "first_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "left_at" TIMESTAMPTZ(6),
  CONSTRAINT "live_session_viewers_pkey" PRIMARY KEY ("session_id", "client_id"),
  CONSTRAINT "live_session_viewers_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "live_shopping_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "live_session_viewers_session_id_last_seen_at_idx" ON "live_session_viewers"("session_id", "last_seen_at");
