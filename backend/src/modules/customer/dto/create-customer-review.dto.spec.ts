import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCustomerReviewDto } from './create-customer-review.dto';

describe('verified customer review input', () => {
  const input = { productId: '2f67001b-09a5-5958-85fd-5f401831c871', rating: 4, comment: 'Sản phẩm dùng rất tốt' };
  it('accepts seed UUIDs and one through five stars', async () => {
    for (const rating of [1, 2, 3, 4, 5]) expect(await validate(plainToInstance(CreateCustomerReviewDto, { ...input, rating }))).toHaveLength(0);
  });
  it.each([0, 6, 2.5])('rejects invalid star rating %s', async rating => {
    expect((await validate(plainToInstance(CreateCustomerReviewDto, { ...input, rating }))).map(error => error.property)).toContain('rating');
  });
  it('rejects malformed IDs and blank reviews', async () => {
    expect((await validate(plainToInstance(CreateCustomerReviewDto, { ...input, productId: 'invalid', comment: '     ' }))).map(error => error.property)).toEqual(expect.arrayContaining(['productId', 'comment']));
  });
});
