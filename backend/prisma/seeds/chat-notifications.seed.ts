import { chatNotificationPreview } from '../../src/modules/chat/chat-notification';
import { assertSeed } from './seed.helpers';
import type { SeedDataset } from './seed.types';

/** Match ChatService's durable message/notification identity and read contract. */
export function buildChatNotifications(data: SeedDataset): void {
  const stores = new Map(data.stores.map((store) => [store.id, store]));
  const conversations = new Map(data.conversations.map((row) => [row.id, row]));
  for (const message of data.messages) {
    const conversation = conversations.get(message.conversationId);
    assertSeed(conversation, 'chat notification conversation missing');
    const store = stores.get(conversation.storeId);
    assertSeed(store, 'chat notification store missing');
    const fromShop = message.senderId === store.ownerId;
    const recipientId = fromShop
      ? conversation.customerId || conversation.collaboratorId
      : store.ownerId;
    assertSeed(
      recipientId && recipientId !== message.senderId,
      'chat notification recipient missing',
    );
    data.notifications.push({
      id: message.id,
      userId: recipientId,
      type: 'CHAT_MESSAGE',
      title: fromShop
        ? `${store.name}: Tin nhắn mới`.slice(0, 255)
        : 'Bạn có tin nhắn mới',
      message: chatNotificationPreview(
        message.messageText,
        message.mediaType ?? undefined,
      ),
      isRead: message.isRead ?? false,
      createdAt: message.createdAt,
      data: {
        conversationId: conversation.id,
        storeId: store.id,
        senderId: message.senderId,
        messageId: message.id,
        actionUrl: fromShop
          ? `/chat?conversationId=${conversation.id}`
          : conversation.customerId
            ? `/merchant/customer-messages?conversationId=${conversation.id}`
            : `/merchant/kol-hub?tab=messages&conversationId=${conversation.id}`,
      },
    });
  }
}
