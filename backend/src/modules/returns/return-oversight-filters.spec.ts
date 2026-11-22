import { UserRole } from '@prisma/client';
import { ReturnService } from './return.service';

describe('Return oversight server filters', () => {
  const storeId='550e8400-e29b-41d4-a716-446655440000';
  function setup(){
    const model=()=>({count:jest.fn().mockResolvedValue(0),findMany:jest.fn().mockResolvedValue([])});
    const prisma={returnRequest:model(),dispute:model(),$transaction:jest.fn(async queries=>Promise.all(queries))};
    return {prisma,service:new ReturnService(prisma as never,{} as never)};
  }
  it('applies identical search/store filters to totals and paginated queue rows',async()=>{
    const {service,prisma}=setup();
    await service.listOversightQueue(UserRole.SYSTEM_MANAGER,'ghn',2,'GHN123',storeId);
    const where=prisma.returnRequest.findMany.mock.calls[0][0].where;
    expect(prisma.returnRequest.count.mock.calls[0][0].where).toEqual(where);
    expect(where.AND[0].order).toEqual({storeId});
    expect(where.AND[0].OR).toEqual(expect.arrayContaining([{shipments:{some:{trackingNumber:{contains:'GHN123',mode:'insensitive'}}}}]));
    expect(prisma.returnRequest.findMany.mock.calls[0][0].skip).toBe(20);
  });
  it('scopes disputes by their linked return and supports the same history filters',async()=>{
    const {service,prisma}=setup();
    await service.listOversightQueue(UserRole.SYSTEM_ADMIN,'disputes',1,'DH-',storeId);
    expect(prisma.dispute.findMany.mock.calls[0][0].where.returnRequest.order).toEqual({storeId});
    await service.listHistory(UserRole.SYSTEM_ADMIN,1,'GHN123',storeId);
    expect(prisma.returnRequest.findMany.mock.calls[0][0].where.order).toEqual({storeId});
    expect(prisma.returnRequest.findMany.mock.calls[0][0].where.OR).toHaveLength(3);
  });
  it('rejects unauthorized roles and invalid filters before reading queue data',async()=>{
    const {service,prisma}=setup();
    await expect(service.listOversightQueue(UserRole.CUSTOMER,'active',1,'test')).rejects.toThrow();
    await expect(service.listOversightQueue(UserRole.SYSTEM_MANAGER,'active',1,'test','invalid')).rejects.toThrow();
    await expect(service.listOversightQueue(UserRole.SYSTEM_MANAGER,'active',1,'x'.repeat(81))).rejects.toThrow();
    expect(prisma.returnRequest.findMany).not.toHaveBeenCalled();
  });
});
