import { ValidationPipe } from '@nestjs/common';
import { CreateWithdrawalDto } from './create-withdrawal.dto';
import { QueryWithdrawalsDto } from './query-withdrawals.dto';

describe('Withdrawal DTO validation', () => {
  const storeId = '38b2b124-12d2-47f8-881f-c3107ee71084';
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  it('accepts an exact decimal string', async () => {
    const dto: unknown = await pipe.transform(
      { amount: '200000.10', storeId },
      { type: 'body', metatype: CreateWithdrawalDto },
    );
    expect(dto).toEqual({ amount: '200000.10', storeId });
  });

  it.each([
    {},
    { amount: 200000 },
    { amount: null },
    { amount: {} },
    { amount: '200000', storeId: undefined },
    { amount: '200000', storeId: 'bad' },
    { amount: '200000.001' },
    { amount: '200000', collaboratorId: 'other-user' },
    { amount: '200000', status: 'APPROVED' },
  ])('rejects malformed or unauthorized body %j', async (body) => {
    await expect(
      pipe.transform(
        { storeId, ...body },
        { type: 'body', metatype: CreateWithdrawalDto },
      ),
    ).rejects.toThrow();
  });

  it.each([{ page: '0' }, { page: '1.5' }, { limit: '101' }, { limit: '-1' }])(
    'rejects invalid pagination %j',
    async (query) => {
      await expect(
        pipe.transform(query, { type: 'query', metatype: QueryWithdrawalsDto }),
      ).rejects.toThrow();
    },
  );
});
