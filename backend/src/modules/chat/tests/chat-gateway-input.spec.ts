import { ChatGateway } from '../chat.gateway';

describe('chat websocket payload boundary', () => {
  const gateway = new ChatGateway({} as never, {} as never);
  const socket = { data: { userId: 'user' }, emit: jest.fn() } as never;
  it.each([null, { messageText: 17 }, { messageText: 'a'.repeat(5001) }])('rejects malformed or oversized content before accessing persistence', async (payload) => {
    const ack = jest.fn();
    await expect(gateway.handleSendMessage(socket, payload as never, ack)).resolves.toBeUndefined();
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
  });
  it('rejects a voucher validation failure without saving or broadcasting the forged card', async () => {
    const service = { getConversationById: jest.fn().mockResolvedValue({ storeId: 'shop' }), normalizeShareCardMessage: jest.fn().mockRejectedValue(new Error('Mã giảm giá đã hết hạn hoặc hết lượt.')), saveMessage: jest.fn() };
    const instance = new ChatGateway(service as never, {} as never);
    const client = { data: { userId: 'user' }, emit: jest.fn(), join: jest.fn() };
    const ack = jest.fn();
    await instance.handleSendMessage(client as never, { conversationId: 'conversation', messageText: JSON.stringify({ type: 'COUPON_VOUCHER', couponId: 'fake', couponCode: 'FAKE99', discountValue: 99 }) }, ack);
    expect(service.saveMessage).not.toHaveBeenCalled();
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
  });
});
