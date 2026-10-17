import { ForbiddenException } from '@nestjs/common';
import { ChatService } from '../chat.service';
import { chatNotificationPreview } from '../chat-notification';

describe('Persistent chat notifications', () => {
  const conversationId = '9c090066-5f86-4a5f-a99c-f39dc55b3fa0';
  const messageId = '79291c55-93bd-43de-82d8-0d46cb701910';
  const conversation = {
    id: conversationId,
    storeId: 'store',
    customerId: 'customer',
    collaboratorId: null,
    store: { ownerId: 'owner', name: 'Shop thử nghiệm' },
  };
  let service: ChatService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      chatMessage: {
        create: jest.fn(),
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([{ id: messageId }]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      conversation: { update: jest.fn() },
      notification: { create: jest.fn(), updateMany: jest.fn() },
      $transaction: jest
        .fn()
        .mockImplementation((operations) =>
          typeof operations === 'function'
            ? operations(prisma)
            : Promise.resolve([{ id: messageId }]),
        ),
    };
    service = new ChatService(prisma, {} as never);
    jest
      .spyOn(service, 'getConversationById')
      .mockResolvedValue(conversation as never);
  });

  it('atomically saves a shop reply and notification for only its customer', async () => {
    await service.saveMessage(
      conversationId,
      'owner',
      'Shop đã nhận thông tin',
      undefined,
      undefined,
      undefined,
      messageId,
    );
    expect(prisma.$transaction.mock.calls[0][0]).toHaveLength(3);
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: messageId,
        userId: 'customer',
        type: 'CHAT_MESSAGE',
        title: 'Shop thử nghiệm: Tin nhắn mới',
        data: expect.objectContaining({
          conversationId,
          messageId,
          actionUrl: `/chat?conversationId=${conversationId}`,
        }),
      }),
    });
  });

  it('routes customer messages to the owner customer inbox', async () => {
    await service.saveMessage(conversationId, 'customer', 'Xin tư vấn');
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'owner',
        data: expect.objectContaining({
          actionUrl: `/merchant/customer-messages?conversationId=${conversationId}`,
        }),
      }),
    });
  });

  it('does not insert another notification for a retried message ID', async () => {
    prisma.chatMessage.findUnique.mockResolvedValue({
      id: messageId,
      conversationId,
      senderId: 'owner',
    });
    await service.saveMessage(
      conversationId,
      'owner',
      'Retry',
      undefined,
      undefined,
      undefined,
      messageId,
    );
    expect(prisma.notification.create).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('checks membership before reading/reusing an existing message ID', async () => {
    jest
      .spyOn(service, 'getConversationById')
      .mockRejectedValue(new ForbiddenException());
    await expect(
      service.saveMessage(conversationId, 'intruder', 'Hello'),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.chatMessage.create).not.toHaveBeenCalled();
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it('marks only the snapshot of incoming messages and matching owned notifications read', async () => {
    expect(await service.markRead(conversationId, 'customer')).toEqual({
      count: 1,
    });
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: [messageId] },
        userId: 'customer',
        type: 'CHAT_MESSAGE',
        isRead: false,
      },
      data: { isRead: true },
    });
    expect(prisma.chatMessage.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: [messageId] },
        conversationId,
        senderId: { not: 'customer' },
      },
      data: { isRead: true },
    });
  });

  it('does not mark a new notification read if there were no unread messages', async () => {
    prisma.chatMessage.findMany.mockResolvedValue([]);
    expect(await service.markRead(conversationId, 'customer')).toEqual({
      count: 0,
    });
    expect(prisma.notification.updateMany).not.toHaveBeenCalled();
  });

  it('propagates transaction failures rather than claiming the message was saved', async () => {
    prisma.$transaction.mockRejectedValue(new Error('transaction rolled back'));
    await expect(
      service.saveMessage(conversationId, 'owner', 'Hello'),
    ).rejects.toThrow('transaction rolled back');
  });

  it('uses readable previews for product cards, attachments and long messages', () => {
    expect(
      chatNotificationPreview(
        JSON.stringify({
          type: 'PRODUCT_INQUIRY',
          message: 'Cho tôi hỏi sản phẩm',
        }),
      ),
    ).toBe('Cho tôi hỏi sản phẩm');
    expect(
      chatNotificationPreview(JSON.stringify({ type: 'COUPON_VOUCHER' })),
    ).toBe('Đã gửi mã giảm giá');
    expect(chatNotificationPreview('', 'IMAGE')).toBe('Đã gửi hình ảnh');
    expect(chatNotificationPreview('', 'VIDEO')).toBe('Đã gửi video');
    expect(chatNotificationPreview('a'.repeat(300))).toHaveLength(200);
  });
});
