import test from "node:test";
import assert from "node:assert/strict";
import {
  ConversationSchema,
  DealSchema,
  MessageSchema,
} from "../src/types/contracts";
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
