import { CustomerService } from './customer.service';

describe('Customer cart replacement', () => {
  it('locks the owner before deleting or inserting cart lines', async () => {
    const operations: string[] = [];
    const tx = {
      $queryRaw: jest.fn(async (..._args: unknown[]) => { operations.push('lock'); }),
      customerCartItem: {
        deleteMany: jest.fn(async () => { operations.push('delete'); }),
        createMany: jest.fn(async () => { operations.push('insert'); }),
      },
    };
    const prisma = {
      product: { findMany: jest.fn().mockResolvedValue([{
        id: 'product', isActive: true, moderationStatus: 'APPROVED',
        stockQuantity: 10, variants: [],
      }]) },
      $transaction: jest.fn(async (work) => work(tx)),
    };
    const service = Object.create(CustomerService.prototype) as CustomerService;
    Object.assign(service, { prisma });
    jest.spyOn(service, 'getCart').mockResolvedValue({ items: [], syncedAt: '' });
    await service.syncCart('owner', { items: [{ productId: 'product', quantity: 2 }] });
    expect(operations).toEqual(['lock', 'delete', 'insert']);
    expect(tx.$queryRaw.mock.calls[0][1]).toBe('owner');
  });
});
