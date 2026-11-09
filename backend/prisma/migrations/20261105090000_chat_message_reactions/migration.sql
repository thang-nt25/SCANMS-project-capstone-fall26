CREATE TABLE IF NOT EXISTS "chat_message_reactions" (
  "message_id" UUID NOT NULL REFERENCES "chat_messages"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "emoji" VARCHAR(16) NOT NULL,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_message_reactions_pkey" PRIMARY KEY ("message_id", "user_id"),
  CONSTRAINT "chat_message_reactions_emoji_check" CHECK ("emoji" IN ('👍', '❤️', '😂', '😮', '😢', '🙏'))
);
CREATE INDEX IF NOT EXISTS "idx_chat_message_reactions_user" ON "chat_message_reactions"("user_id");
