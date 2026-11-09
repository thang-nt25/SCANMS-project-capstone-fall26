import test from "node:test";
import assert from "node:assert/strict";
import {
  ConversationSchema,
  DealSchema,
  MessageSchema,
} from "../src/types/contracts";
test("message history retains backend quote and read receipt while accepting older messages", () => {
  const original = { id: "m1", conversationId: "c", senderId: "partner", messageText: "Delivery details", createdAt: "2026-11-05T00:00:00Z" };
  assert.equal(MessageSchema.parse(original).isRead, undefined);
  const reply = MessageSchema.parse({ ...original, id: "m2", isRead: true, replyToId: "m1", replyTo: { ...original, sender: { fullName: "Partner" } } });
  assert.equal(reply.isRead, true);
  assert.equal(reply.replyTo?.id, "m1");
  assert.equal(reply.replyTo?.messageText, "Delivery details");
});
test("message history retains per-user reaction summaries", () => {
  const value = MessageSchema.parse({ id: "m", conversationId: "c", senderId: "u", createdAt: "2026-11-05T00:00:00Z", reactions: [{ emoji: "👍", count: 2, mine: true }] });
  assert.deepEqual(value.reactions, [{ emoji: "👍", count: 2, mine: true }]);
  assert.equal(MessageSchema.safeParse({ ...value, reactions: [{ emoji: "👍", count: -1, mine: true }] }).success, false);
});
test("conversation previews do not require IDs that the backend intentionally omits", () => {
  const value = ConversationSchema.parse({
    id: "conversation",
    store: { id: "store", name: "Shop" },
    chatMessages: [
      {
        senderId: "sender",
        messageText: "Hello",
        createdAt: "2026-11-02T00:00:00Z",
        mediaType: null,
        mediaName: null,
      },
    ],
  });
  assert.equal(value.chatMessages?.[0].messageText, "Hello");
  // Full history / realtime must still carry stable IDs for deduplication.
  assert.equal(MessageSchema.safeParse(value.chatMessages?.[0]).success, false);
});
test("admin exception queue accepts its intentionally minimal product/store projections", () => {
  const value = DealSchema.parse({
    id: "deal",
    status: "PENDING_ADMIN_APPROVAL",
    proposedCommissionRate: "20",
    product: { title: "Test product" },
    store: { name: "Test Shop" },
    collaborator: { fullName: "Test KOC" },
  });
  assert.equal(value.store?.name, "Test Shop");
});
