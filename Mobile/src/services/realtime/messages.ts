import type { Message } from "../../types/contracts";
/** Reconnect/history pages may contain the same persisted message more than once. */
export function mergeMessages(
  pages: Message[][],
  conversationId: string,
): Message[] {
  const byId = new Map<string, Message>();
  for (const message of pages.flat())
    if (message.conversationId === conversationId)
      byId.set(message.id, message);
  return [...byId.values()].sort(
    (a, b) =>
      a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  );
}
