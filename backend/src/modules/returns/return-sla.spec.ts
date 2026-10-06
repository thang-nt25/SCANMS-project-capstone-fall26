import { ConflictException } from '@nestjs/common';
import { ReturnShipmentDirection, UserRole } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { CloudinaryService } from '../../core/cloudinary/cloudinary.service';
import { ReturnService } from './return.service';

describe('ReturnService inspection SLA', () => {
  const item = {
    id: '6c73103a-2550-482b-9f18-e9f5c5ba1ad5',
    orderId: '94e900ec-d6dd-4d97-9f55-792d816a5387',
    customerId: 'a9fa6bb8-f77e-4281-9fab-e24e971b07d1',
    order: {
      externalOrderSn: 'SCANMS-TEST',
      store: { ownerId: '23acc500-c9d8-4732-8543-79f6267e8680' },
    },
  };
  let service: ReturnService;
  let tx: {
    returnRequest: { updateMany: jest.Mock };
    returnEvent: { create: jest.Mock };
    user: { findMany: jest.Mock };
    notification: { create: jest.Mock };
  };
  let prisma: {
    returnRequest: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    tx = {
      returnRequest: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      returnEvent: { create: jest.fn().mockResolvedValue({}) },
      user: { findMany: jest.fn().mockResolvedValue([{ id: 'admin-1' }]) },
      notification: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma = {
      returnRequest: { findMany: jest.fn().mockResolvedValue([item]) },
      $transaction: jest
        .fn()
        .mockImplementation((work: (client: typeof tx) => unknown) => work(tx)),
    };
    service = new ReturnService(
      prisma as unknown as PrismaService,
      {} as CloudinaryService,
    );
  });

  it('escalates once and notifies customer, Shop, and Admin', async () => {
    await expect(service.escalateStalledInspectionsBatch()).resolves.toBe(1);
    const updateCalls = tx.returnRequest.updateMany.mock
      .calls as unknown as Array<
      [
        {
          where: { id: string; inspectionEscalatedAt: null };
          data: { inspectionEscalatedAt: Date };
        },
      ]
    >;
    expect(updateCalls[0][0].where.id).toBe(item.id);
    expect(updateCalls[0][0].where.inspectionEscalatedAt).toBeNull();
    expect(updateCalls[0][0].data.inspectionEscalatedAt).toBeInstanceOf(Date);
    expect(tx.returnEvent.create).toHaveBeenCalledTimes(1);
    expect(tx.notification.create).toHaveBeenCalledTimes(3);
  });

  it('does not send duplicate alerts after another worker wins the compare-and-swap', async () => {
    tx.returnRequest.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.escalateStalledInspectionsBatch()).resolves.toBe(0);
    expect(tx.returnEvent.create).not.toHaveBeenCalled();
    expect(tx.notification.create).not.toHaveBeenCalled();
  });

  it('does not disclose the stalled queue to a customer', async () => {
    await expect(
      service.listStalledInspections(UserRole.CUSTOMER),
    ).rejects.toThrow();
    expect(prisma.returnRequest.findMany).not.toHaveBeenCalled();
  });

  it('cannot close a dispute while the Shop still holds the returned item', async () => {
    const disputePrisma = {
      dispute: {
        findUnique: jest.fn().mockResolvedValue({
          status: 'OPEN',
          returnRequest: {
            shipments: [
              {
                direction: ReturnShipmentDirection.CUSTOMER_TO_SHOP,
                receivedAt: new Date(),
              },
            ],
          },
        }),
      },
      $transaction: jest.fn(),
    };
    const guardedService = new ReturnService(
      disputePrisma as unknown as PrismaService,
      {} as CloudinaryService,
    );
    await expect(
      guardedService.resolveDispute(
        'admin-1',
        UserRole.SYSTEM_ADMIN,
        'dispute-1',
        {
          ruling: 'UPHOLD_SHOP',
          notes: 'Bằng chứng kiểm tra và xác nhận giữ nguyên quyết định.',
        },
      ),
    ).rejects.toThrow(ConflictException);
    expect(disputePrisma.$transaction).not.toHaveBeenCalled();
  });
});
