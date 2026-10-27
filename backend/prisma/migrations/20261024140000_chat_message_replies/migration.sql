ALTER TABLE "chat_messages" ADD COLUMN "reply_to_id" UUID;

CREATE INDEX "idx_fk_chat_messages_reply" ON "chat_messages"("reply_to_id");

ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_reply_to_id_fkey"
  FOREIGN KEY ("reply_to_id") REFERENCES "chat_messages"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;
