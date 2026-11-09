import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ChatService } from '../chat.service';
import { CHAT_REACTIONS, validateChatReaction } from '../chat-reactions';

describe('Message reactions', () => {
  let service: ChatService;
  const prisma = { $executeRaw: jest.fn(), $queryRaw: jest.fn() };
  beforeEach(() => {
    jest.resetAllMocks();
    service = new ChatService(prisma as any, {} as any);
    jest.spyOn(service, 'getCapabilities').mockResolvedValue({ messageReplies: true, messageReactions: true });
    jest.spyOn(service, 'getMessage').mockResolvedValue({ id: 'message' } as any);
    prisma.$queryRaw.mockResolvedValue([{ messageId: 'message', emoji: '👍', count: 1, mine: true }]);
  });
  it.each(CHAT_REACTIONS)('accepts the supported reaction %s', emoji => {
    expect(validateChatReaction(emoji)).toBe(emoji);
  });
  it.each([null, {}, 'not-an-emoji', '👍👍', '<script>'])('rejects invalid input %j without a write', async value => {
    await expect(service.setMessageReaction('conversation', 'actor', 'message', value)).rejects.toThrow(BadRequestException);
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });
  it('uses the authenticated actor and checks message membership before writing', async () => {
    await expect(service.setMessageReaction('conversation', 'actor', 'message', '👍')).resolves.toEqual([{ messageId: 'message', emoji: '👍', count: 1, mine: true }]);
    expect(service.getMessage).toHaveBeenCalledWith('conversation', 'actor', 'message');
    const call = prisma.$executeRaw.mock.calls[0];
    expect(call.slice(1)).toEqual(['message', 'actor', '👍']);
  });
  it.each(['set', 'remove'])('rejects another tenant for %s', async operation => {
    jest.spyOn(service, 'getMessage').mockRejectedValue(new ForbiddenException());
    const request = operation === 'set' ? service.setMessageReaction('other-conversation', 'intruder', 'message', '👍') : service.removeMessageReaction('other-conversation', 'intruder', 'message');
    await expect(request).rejects.toThrow(ForbiddenException);
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });
  it('does not react to a missing or foreign message', async () => {
    jest.spyOn(service, 'getMessage').mockRejectedValue(new NotFoundException());
    await expect(service.setMessageReaction('conversation', 'actor', 'foreign', '👍')).rejects.toThrow(NotFoundException);
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });
  it('deletes only the authenticated actors reaction', async () => {
    await service.removeMessageReaction('conversation', 'actor', 'message');
    expect(prisma.$executeRaw.mock.calls[0].slice(1)).toEqual(['message', 'actor']);
  });
  it('keeps messaging available but refuses reactions before migration', async () => {
    jest.spyOn(service, 'getCapabilities').mockResolvedValue({ messageReplies: true, messageReactions: false });
    await expect(service.setMessageReaction('conversation', 'actor', 'message', '👍')).rejects.toThrow(BadRequestException);
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });
});
