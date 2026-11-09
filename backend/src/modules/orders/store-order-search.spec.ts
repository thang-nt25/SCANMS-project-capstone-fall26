import { storeOrderSearch } from './store-order-search';
import { validate } from 'class-validator';
import { QueryStoreOrdersDto } from './dto/fulfillment-order.dto';

describe('merchant order search criteria', () => {
  it('restricts customer and order searches to their selected fields', () => {
    expect(storeOrderSearch('Lan', 'CUSTOMER_NAME')).toEqual({ OR: [{ customerName: { contains: 'Lan', mode: 'insensitive' } }] });
    expect(storeOrderSearch('DH-123', 'ORDER_SN')).toEqual({ OR: [{ externalOrderSn: { contains: 'DH-123', mode: 'insensitive' } }] });
  });
  it('supports phone, tracking and product searches on the database', () => {
    expect(storeOrderSearch('090 123', 'PHONE')).toEqual({ OR: [{ customerPhone: { contains: '090123' } }] });
    expect(storeOrderSearch('GHN123', 'TRACKING').OR).toHaveLength(2);
    expect(storeOrderSearch('Serum', 'PRODUCT')).toMatchObject({ OR: [{ orderItems: { some: { OR: [{ product: { title: { contains: 'Serum' } } }, { product: { sku: { contains: 'Serum' } } }] } } }] });
  });
  it('searches all supported fields by default and rejects invalid criteria', async () => {
    expect(storeOrderSearch('Serum').OR).toHaveLength(6);
    const dto = Object.assign(new QueryStoreOrdersDto(), { searchField: 'INVALID' });
    expect((await validate(dto)).some(error => error.property === 'searchField')).toBe(true);
  });
});
