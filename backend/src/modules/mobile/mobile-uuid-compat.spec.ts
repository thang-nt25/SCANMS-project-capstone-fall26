import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ImportOrdersDto } from '../orders/dto/import-orders.dto';
import { CreateManualOrderDto } from '../orders/dto/create-manual-order.dto';
import { CreateProductDto } from '../products/dto/create-product.dto';
import { CreateInternalStaffDto } from '../users/dto/create-internal-staff.dto';
const seededId = 'c6bd8760-9de6-5ef6-8ccb-fecdfd7a022b';
describe('database UUID versions used by native and web commands', () => {
  it.each([
    CreateProductDto,
    CreateManualOrderDto,
    ImportOrdersDto,
    CreateInternalStaffDto,
  ])(
    '%p accepts a seeded v5 store ID, still rejects arbitrary text',
    async (Dto) => {
      const valid = await validate(
        Object.assign(new Dto(), { storeId: seededId }),
      );
      expect(
        valid.filter((issue) => issue.property === 'storeId'),
      ).toHaveLength(0);
      const invalid = await validate(
        Object.assign(new Dto(), { storeId: 'shop-name' }),
      );
      expect(invalid.some((issue) => issue.property === 'storeId')).toBe(true);
    },
  );
  it('nested manual order product IDs accept existing UUID v5 records', async () => {
    const dto = plainToInstance(CreateManualOrderDto, {
      items: [{ productId: seededId, quantity: 1 }],
    });
    const errors = await validate(dto);
    expect(errors.filter((issue) => issue.property === 'items')).toHaveLength(
      0,
    );
  });
});
