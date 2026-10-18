import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { buildExplorerWhere, explorerDay } from '../chat-explorer.query';
import { ChatService } from '../chat.service';

describe('Conversation content explorer', () => {
  const conversationId = 'd4e5f6a1-b2c3-4d4e-8f5a-6b7c8d9e0f1a';
  const cursor = 'a7b8c9d0-e1f2-4a3b-8c4d-5e6f7a8b9c0d';
  const actor = 'creator';
  const prisma = { chatMessage: { findMany: jest.fn(), findFirst: jest.fn() } };
  let service: ChatService;
  beforeEach(() => {
    jest.resetAllMocks();
    service = new ChatService(prisma as any, {} as any);
    jest.spyOn(service, 'getConversationById').mockResolvedValue({
      collaboratorId: actor,
      collaborator: { role: 'COLLABORATOR' },
    } as any);
    prisma.chatMessage.findMany.mockResolvedValue([]);
  });

  it('uses inclusive Vietnam calendar days', () => {
    expect(explorerDay('2026-10-18').toISOString()).toBe(
      '2026-10-17T17:00:00.000Z',
    );
    expect(explorerDay('2026-10-18', true).toISOString()).toBe(
      '2026-10-18T17:00:00.000Z',
    );
  });
  it.each(['2026-02-30', '2026-13-01', '18/10/2026'])(
    'rejects invalid date %s',
    (day) => {
      expect(() => explorerDay(day)).toThrow(BadRequestException);
    },
  );
  it.each([
    { q: 'x'.repeat(201) },
    { kind: 'PRIVATE' },
    { sender: 'anyone' },
    { cursor: 'bad' },
    { from: '2026-10-19', to: '2026-10-18' },
    { q: ['x'] as any },
  ])('rejects invalid filters %j', (query) => {
    expect(() => buildExplorerWhere(conversationId, actor, query)).toThrow(
      BadRequestException,
    );
  });
  it('combines text, attachment name, kind, sender and tenant constraints', () => {
    expect(
      buildExplorerWhere(conversationId, actor, {
        q: ' report ',
        kind: 'DOCUMENT',
        sender: 'ME',
      }),
    ).toEqual({
      conversationId,
      senderId: actor,
      mediaType: 'DOCUMENT',
      OR: [
        { messageText: { contains: 'report', mode: 'insensitive' } },
        { mediaName: { contains: 'report', mode: 'insensitive' } },
      ],
    });
  });
  it('checks membership before looking up any messages', async () => {
    jest
      .spyOn(service, 'getConversationById')
      .mockRejectedValue(new ForbiddenException());
    await expect(
      service.exploreMessages(conversationId, actor, {}),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.chatMessage.findMany).not.toHaveBeenCalled();
  });
  it('rejects foreign or deleted cursor anchors', async () => {
    prisma.chatMessage.findFirst.mockResolvedValue(null);
    await expect(
      service.exploreMessages(conversationId, actor, { cursor }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.chatMessage.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: cursor, conversationId } }),
    );
    expect(prisma.chatMessage.findMany).not.toHaveBeenCalled();
  });
  it('breaks timestamp ties by id and preserves search conditions', async () => {
    const createdAt = new Date('2026-10-18T00:00:00Z');
    prisma.chatMessage.findFirst.mockResolvedValue({ id: cursor, createdAt });
    await service.exploreMessages(conversationId, actor, {
      cursor,
      q: 'review',
    });
    expect(prisma.chatMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          conversationId,
          OR: expect.any(Array),
          AND: [
            {
              OR: [
                { createdAt: { lt: createdAt } },
                { createdAt, id: { lt: cursor } },
              ],
            },
          ],
        }),
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 31,
      }),
    );
  });
  it('returns thirty items and uses the last returned row for pagination', async () => {
    prisma.chatMessage.findMany.mockResolvedValue(
      Array.from({ length: 31 }, (_, index) => ({
        id: String(index),
        messageText: 'Hello',
      })),
    );
    const page = await service.exploreMessages(conversationId, actor, {});
    expect(page.items).toHaveLength(30);
    expect(page.nextCursor).toBe('29');
  });
  it('does not expose private deal cards to customers or stall pagination', async () => {
    jest
      .spyOn(service, 'getConversationById')
      .mockResolvedValue({ customerId: actor } as any);
    prisma.chatMessage.findMany.mockResolvedValue(
      Array.from({ length: 31 }, (_, index) => ({
        id: String(index),
        messageText: JSON.stringify({
          type: 'EXCLUSIVE_DEAL_PROPOSAL',
          commission: 30,
        }),
      })),
    );
    const page = await service.exploreMessages(conversationId, actor, {});
    expect(page.items).toEqual([]);
    expect(page.nextCursor).toBe('29');
  });
  it('marks the end of the result set without changing read receipts', async () => {
    expect(await service.exploreMessages(conversationId, actor, {})).toEqual({
      items: [],
      nextCursor: null,
    });
  });
});
