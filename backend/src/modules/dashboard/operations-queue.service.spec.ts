import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { OperationsQueueService } from './operations-queue.service';

describe('Operations queue summary', () => {
  const prisma = {
    product: { count: jest.fn() },
    collaboratorProfile: { count: jest.fn() },
    store: { count: jest.fn() },
    dispute: { count: jest.fn() },
  };
  const service = new OperationsQueueService(
    prisma as unknown as PrismaService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.product.count.mockResolvedValue(2);
    prisma.collaboratorProfile.count.mockResolvedValue(3);
    prisma.store.count.mockResolvedValue(1);
    prisma.dispute.count.mockResolvedValue(5);
  });

  it.each([UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER])(
    'returns current actionable counts for %s without exposing profile data',
    async (role) => {
      const result = await service.summary(role);
      expect(result).toEqual({
        products: 2,
        kycApplications: 4,
        disputes: 5,
        generatedAt: expect.any(String),
      });
      expect(prisma.product.count).toHaveBeenCalledWith({
        where: { isDeleted: false, moderationStatus: 'DRAFT' },
      });
      expect(prisma.collaboratorProfile.count).toHaveBeenCalledWith({
        where: {
          kycStatus: 'UNVERIFIED',
          idCardNumber: { not: null, notIn: [''] },
          user: { isDeleted: false },
        },
      });
      expect(prisma.store.count).toHaveBeenCalledWith({
        where: { isDeleted: false, onboardingStatus: 'PENDING_APPROVAL' },
      });
      expect(prisma.dispute.count).toHaveBeenCalledWith({
        where: { status: 'OPEN' },
      });
    },
  );

  it.each([UserRole.CUSTOMER, UserRole.COLLABORATOR, UserRole.SHOP_MANAGER])(
    'rejects %s before accessing platform-wide queues',
    async (role) => {
      await expect(service.summary(role)).rejects.toThrow(ForbiddenException);
      expect(prisma.product.count).not.toHaveBeenCalled();
      expect(prisma.collaboratorProfile.count).not.toHaveBeenCalled();
      expect(prisma.store.count).not.toHaveBeenCalled();
      expect(prisma.dispute.count).not.toHaveBeenCalled();
    },
  );

  it('returns zero only when the database confirms empty queues', async () => {
    Object.values(prisma).forEach((delegate) =>
      delegate.count.mockResolvedValue(0),
    );
    expect(await service.summary(UserRole.SYSTEM_ADMIN)).toMatchObject({
      products: 0,
      kycApplications: 0,
      disputes: 0,
    });
  });

  it('propagates database failures instead of reporting an empty queue', async () => {
    prisma.dispute.count.mockRejectedValue(new Error('Database unavailable'));
    await expect(service.summary(UserRole.SYSTEM_ADMIN)).rejects.toThrow(
      'Database unavailable',
    );
  });
});
