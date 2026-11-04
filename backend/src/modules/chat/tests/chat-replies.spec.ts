import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ChatService } from '../chat.service';
import { ChatGateway } from '../chat.gateway';

describe('Quoted message replies', () => {
  const conversationId = 'd4e5f6a1-b2c3-4d4e-8f5a-6b7c8d9e0f1a';
  const originalId = 'a7b8c9d0-e1f2-4a3b-8c4d-5e6f7a8b9c0d';
  const messageId = '79291c55-93bd-43de-82d8-0d46cb701910';
  const conversation = { id: conversationId, customerId: 'customer', store: { name: 'Shop', ownerId: 'owner' } };
  let prisma: any, service: ChatService;
  beforeEach(() => {
    prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ enabled: true }]),
      chatMessage: {
        findFirst: jest.fn().mockResolvedValue({ id: originalId, messageText: 'Khách hỏi phân loại' }),
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: messageId, replyToId: originalId }),
      },
      conversation: { update: jest.fn() },
      notification: { create: jest.fn() },
      $transaction: jest.fn().mockImplementation(operations => Promise.all(operations)),
    };
    service = new ChatService(prisma, {} as any);
    jest.spyOn(service, 'getConversationById').mockResolvedValue(conversation as any);
  });
  const save = (id = originalId) => service.saveMessage(conversationId, 'owner', 'Shop trả lời', undefined, undefined, undefined, messageId, id);

  it('persists a reference resolved from the same conversation and returns sender/content of the original', async () => {
    await save();
    expect(prisma.chatMessage.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: originalId, conversationId } }));
    expect(prisma.chatMessage.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ replyToId: originalId, messageText: 'Shop trả lời' }),
      select: expect.objectContaining({ replyToId: true, replyTo: { select: expect.objectContaining({ id: true, messageText: true, sender: { select: { id: true, fullName: true, role: true } } }) } }),
    }));
  });
  it('rejects a missing or foreign conversation parent before creating anything', async () => {
    prisma.chatMessage.findFirst.mockResolvedValue(null);
    await expect(save()).rejects.toThrow(BadRequestException);
    expect(prisma.chatMessage.create).not.toHaveBeenCalled();
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });
  it('rejects malformed references at the service boundary', async () => {
    await expect(save('not-an-id')).rejects.toThrow(BadRequestException);
    expect(prisma.chatMessage.create).not.toHaveBeenCalled();
  });
  it('does not let customers or Shops quote internal commission cards into customer chat', async () => {
    prisma.chatMessage.findFirst.mockResolvedValue({ id: originalId, messageText: JSON.stringify({ type: 'EXCLUSIVE_DEAL_PROPOSAL', proposedCommissionRate: 35 }) });
    await expect(save()).rejects.toThrow(ForbiddenException);
    await expect(service.getMessage(conversationId, 'customer', originalId)).rejects.toThrow(ForbiddenException);
  });
  it('retries are idempotent even when the original was later removed', async () => {
    prisma.chatMessage.findUnique.mockResolvedValue({ id: messageId, conversationId, senderId: 'owner', replyToId: null });
    await expect(save()).resolves.toMatchObject({ id: messageId });
    expect(prisma.chatMessage.create).not.toHaveBeenCalled();
    expect(prisma.chatMessage.findFirst).not.toHaveBeenCalled();
  });
  it('history and explorer load a single level of quoted content', async () => {
    await service.getMessages(conversationId, 'owner');
    await service.exploreMessages(conversationId, 'owner', {});
    for (const [args] of prisma.chatMessage.findMany.mock.calls) {
      expect(args.select.replyTo.select).toMatchObject({ id: true, messageText: true });
      expect(args.select.replyTo.select.replyTo).toBeUndefined();
    }
  });
  it('fetching an old quoted message checks conversation membership and message scope', async () => {
    await service.getMessage(conversationId, 'owner', originalId);
    expect(prisma.chatMessage.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: originalId, conversationId } }));
    prisma.chatMessage.findFirst.mockResolvedValue(null);
    await expect(service.getMessage(conversationId, 'owner', originalId)).rejects.toThrow(NotFoundException);
    jest.spyOn(service, 'getConversationById').mockRejectedValue(new ForbiddenException());
    prisma.chatMessage.findFirst.mockClear();
    await expect(service.getMessage(conversationId, 'intruder', originalId)).rejects.toThrow(ForbiddenException);
    expect(prisma.chatMessage.findFirst).not.toHaveBeenCalled();
  });
  it('keeps plain chat working on a database that has not applied the optional migration', async () => {
    prisma.$queryRaw.mockResolvedValue([{ enabled: false }]);
    await service.getMessages(conversationId, 'owner');
    expect(prisma.chatMessage.findMany.mock.calls[0][0].select.replyTo).toBeUndefined();
    await service.saveMessage(conversationId, 'owner', 'Tin nhắn thường', undefined, undefined, undefined, messageId);
    const args = prisma.chatMessage.create.mock.calls[0][0];
    expect(args.data.replyToId).toBeUndefined();
    expect(args.select.replyTo).toBeUndefined();
    expect(args.select.replyToId).toBeUndefined();
    expect(prisma.chatMessage.findUnique.mock.calls[0][0].select.replyTo).toBeUndefined();
    await expect(save()).rejects.toThrow(BadRequestException);
  });
  it('falls back safely when schema introspection is temporarily unavailable', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('Temporarily unavailable'));
    await expect(service.getCapabilities()).resolves.toEqual({ messageReplies: false });
    await expect(service.getMessages(conversationId, 'owner')).resolves.toEqual([]);
  });
  it.each([12, {}, '', 'wrong-id', null])('rejects a malformed socket reply target %j', async target => {
    const gateway = new ChatGateway({} as any, {} as any);
    const socket = { data: { userId: 'owner' }, emit: jest.fn() };
    const ack = jest.fn();
    await gateway.handleSendMessage(socket as any, { conversationId, messageText: 'Hello', replyToId: target } as any, ack);
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
  });
});
