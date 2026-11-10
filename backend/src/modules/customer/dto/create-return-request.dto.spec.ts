import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ReturnReason, ReturnResolution } from '@prisma/client';
import { CreateReturnRequestDto } from './create-return-request.dto';

describe('return evidence by reason', () => {
  const base = {
    preferredResolution: ReturnResolution.REFUND,
    imageUrls: ['https://example.test/product.jpg'],
    items: [{ orderItemId: '94196d7d-1196-4eac-89dd-50b2118040d9', quantity: 1 }],
  };

  it('accepts a change-of-mind request without an unboxing video', async () => {
    const dto = plainToInstance(CreateReturnRequestDto, { ...base, reason: ReturnReason.CHANGE_OF_MIND });
    expect(await validate(dto)).toEqual([]);
  });

  it('requires unboxing video when the customer reports damaged goods', async () => {
    const dto = plainToInstance(CreateReturnRequestDto, { ...base, reason: ReturnReason.DAMAGED });
    expect((await validate(dto)).some(error => error.property === 'unboxingVideoUrl')).toBe(true);
  });
});
