import { findShortCode } from '../utils/find-short-code';

describe('legacy uppercase referral codes', () => {
  it('resolves uppercase stored code from lowercase input with the requested relations', async () => {
    const row = { id: 'link', shortCode: 'REF-YENNHISKIN', product: { id: 'product' } };
    const links = { findUnique: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([row]) };
    const result = await findShortCode(links as any, { where: { shortCode: 'ref-yennhiskin' }, include: { product: true } });
    expect(result).toEqual(row);
    expect(links.findMany).toHaveBeenCalledWith({ where: { shortCode: { equals: 'ref-yennhiskin', mode: 'insensitive' } }, include: { product: true }, take: 2 });
  });
  it('keeps exact matching links on the indexed lookup', async () => {
    const links = { findUnique: jest.fn().mockResolvedValue({ id: 'link' }), findMany: jest.fn() };
    await findShortCode(links as any, { where: { shortCode: 'abc' } });
    expect(links.findMany).not.toHaveBeenCalled();
  });
  it.each([{ matches: [] }, { matches: [{ id: 'one' }, { id: 'two' }] }])('rejects missing or ambiguous case-insensitive matches', async ({ matches }) => {
    const links = { findUnique: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue(matches) };
    expect(await findShortCode(links as any, { where: { shortCode: 'abc' } })).toBeNull();
  });
});
