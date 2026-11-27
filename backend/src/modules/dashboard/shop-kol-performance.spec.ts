import { BadRequestException } from '@nestjs/common';
import { readShopKolPerformance, shopKolOrderFilter } from './shop-kol-performance';

describe('Store KOC performance report period and boundaries', () => {
  const kol = '11111111-1111-4111-8111-111111111111';
  const now = new Date('2026-10-31T18:30:00Z'); // 01/11, 01:30 Vietnam
  it('uses the Vietnam month boundary rather than the UTC month', () => {
    const where = shopKolOrderFilter('store-a', kol, { period: 'month' }, now);
    expect(where.createdAt).toEqual({
      gte: new Date('2026-10-31T17:00:00Z'),
      lte: now,
    });
    expect(where.storeId).toBe('store-a');
    expect(where.attributedCollaboratorId).toBe(kol);
  });
  it('includes seven calendar days and excludes future records', () => {
    expect(
      shopKolOrderFilter('store-a', kol, { period: '7d' }, now).createdAt,
    ).toEqual({
      gte: new Date('2026-10-25T17:00:00Z'),
      lte: now,
    });
  });
  it('retains the requested status instead of silently reporting another subset', () => {
    expect(
      shopKolOrderFilter('store-a', kol, { status: 'RETURN_REQUESTED' }, now)
        .status,
    ).toBe('RETURN_REQUESTED');
  });
  it.each([
    ['invalid-id', {}],
    [kol, { period: 'invalid' }],
    [kol, { status: 'NOT_A_STATUS' }],
  ])('rejects invalid identifiers or report filters', (id, query) => {
    expect(() => shopKolOrderFilter('store-a', id, query as any, now)).toThrow(
      BadRequestException,
    );
  });
  it('groups delivered and return states without grouping cancelled orders with returns', () => {
    expect(shopKolOrderFilter('store-a', kol, { status: 'DELIVERED_GROUP' }, now).status).toEqual({ in: ['DELIVERED','COMPLETED'] });
    expect(shopKolOrderFilter('store-a', kol, { status: 'RETURNS_GROUP' }, now).status).toEqual({ in: ['RETURN_REQUESTED','DISPUTED','RETURNED'] });
    expect(shopKolOrderFilter('store-a', kol, { status: 'CANCELLED' }, now).status).toBe('CANCELLED');
  });
  it('filters paginated rows while keeping period-wide delivered totals independent of the row filter', async () => {
    const order = { count: jest.fn((_query: any) => 1), findMany: jest.fn((_query: any) => []), aggregate: jest.fn((_query: any) => ({ _sum:{ finalAmount:200000,refundedAmount:10000 },_count:{_all:2} })) };
    const commission = { aggregate:jest.fn().mockReturnValue({_sum:{commissionAmount:19000}}) };
    const prisma = { order, commission, $transaction:jest.fn(async queries=>Promise.all(queries)) };
    const result = await readShopKolPerformance(prisma as any,'store-a',kol,{status:'CANCELLED',period:'30d',page:2,limit:20});
    expect(order.findMany.mock.calls[0][0]).toMatchObject({where:{status:'CANCELLED'},skip:20});
    const totals = order.aggregate.mock.calls[0][0].where;
    expect(totals.AND[0]).not.toHaveProperty('status');
    expect(totals.AND[1].status.in).toEqual(['DELIVERED','COMPLETED']);
    expect(result.summary).toMatchObject({totalOrders:2,totalRevenue:190000,accruedCommission:19000});
  });
  it('returns the image of each ordered product or variant and paginates ten rows', async () => {
    const images = [
      { variant:{imageUrl:'/variant.jpg'}, product:{title:'Variant product',imageUrl:'/parent.jpg',mediaAssets:[]} },
      { variant:null, product:{title:'Product image',imageUrl:'/product.jpg',mediaAssets:[]} },
      { variant:null, product:{title:'Gallery product',imageUrl:null,mediaAssets:[{urlOrContent:'/gallery.jpg'}]} },
    ];
    const order = {
      count:jest.fn(()=>11),
      findMany:jest.fn((_query:any)=>images.map((item,i)=>({id:String(i),commissions:[],orderItems:[{...item,appliedCommissionRate:10}],finalAmount:100}))),
      aggregate:jest.fn(()=>({_sum:{},_count:{_all:0}})),
    };
    const prisma={order,commission:{aggregate:jest.fn(()=>({_sum:{}}))},$transaction:jest.fn(async queries=>Promise.all(queries))};
    const result=await readShopKolPerformance(prisma as any,'store-a',kol,{limit:10,page:2});
    expect(result.items.map(item=>item.productImage)).toEqual(['/variant.jpg','/product.jpg','/gallery.jpg']);
    expect(order.findMany.mock.calls[0][0]).toMatchObject({take:10,skip:10});
    expect(result.totalPages).toBe(2);
  });
});
