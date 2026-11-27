import { ForbiddenException } from '@nestjs/common';
import { assertChatNotBlocked, assertCooperationOpen } from './cooperation.policy';

describe('Cooperation policy guards', () => {
  it('blocks deal/sample actions when StoreCollaborator is REJECTED, TERMINATED, or BLOCKED', async () => {
    for (const status of ['REJECTED', 'TERMINATED', 'BLOCKED']) {
      const db = {
        storeCollaborator: {
          findUnique: jest.fn().mockResolvedValue({ status }),
        },
      };
      await expect(
        assertCooperationOpen(db, 'store-1', 'kol-1', 'tạo đề xuất Deal'),
      ).rejects.toThrow(ForbiddenException);
    }
  });

  it('allows deal/sample actions when PENDING, APPROVED, or no relationship exists', async () => {
    for (const record of [null, { status: 'PENDING' }, { status: 'APPROVED' }]) {
      const db = {
        storeCollaborator: {
          findUnique: jest.fn().mockResolvedValue(record),
        },
      };
      await expect(
        assertCooperationOpen(db, 'store-1', 'kol-1', 'xin hàng mẫu'),
      ).resolves.toBeUndefined();
    }
  });

  it('allows chat negotiation on REJECTED/TERMINATED but blocks on BLOCKED', async () => {
    for (const status of ['PENDING', 'APPROVED', 'REJECTED', 'TERMINATED']) {
      const db = {
        storeCollaborator: {
          findUnique: jest.fn().mockResolvedValue({ status }),
        },
      };
      await expect(
        assertChatNotBlocked(db, 'store-1', 'kol-1'),
      ).resolves.toBeUndefined();
    }
    const blockedDb = {
      storeCollaborator: {
        findUnique: jest.fn().mockResolvedValue({ status: 'BLOCKED' }),
      },
    };
    await expect(
      assertChatNotBlocked(blockedDb, 'store-1', 'kol-1'),
    ).rejects.toThrow(ForbiddenException);
  });
});
