import { ChatGateway } from '../chat.gateway';

describe('chat websocket payload boundary', () => {
  const gateway = new ChatGateway({} as never, {} as never);
  const socket = { data: { userId: 'user' }, emit: jest.fn() } as never;
  it.each([null, { messageText: 17 }, { messageText: 'a'.repeat(5001) }])('rejects malformed or oversized content before accessing persistence', async (payload) => {
    const ack = jest.fn();
    await expect(gateway.handleSendMessage(socket, payload as never, ack)).resolves.toBeUndefined();
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
  });
});
