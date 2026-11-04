import { ConflictException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { advanceGhnClaim, latestGhnClaim, type GhnClaimSnapshot } from './ghn-compensation-claim';
import { ReturnService } from './return.service';

const draft: GhnClaimSnapshot = {
  status: 'DRAFT', originalTrackingNumber: 'GHN123456',
  evidenceUrls: ['https://example.test/unboxing.jpg'], updatedAt: new Date().toISOString(),
};

describe('GHN compensation claim lifecycle', () => {
  it('moves from draft through GHN submission, acceptance, and documented payment', () => {
    const submitted = advanceGhnClaim(draft, {
      action: 'SUBMIT', ghnReference: 'GHN-CLAIM-1', claimedAmount: 280000,
      notes: 'Đã gửi ảnh và vận đơn gốc cho GHN',
    });
    expect(submitted.status).toBe('SUBMITTED');
    const accepted = advanceGhnClaim(submitted, {
      action: 'ACCEPT', approvedAmount: 250000, notes: 'GHN chấp thuận bồi hoàn 250.000 đồng',
      proofUrl: 'https://example.test/ghn-response.jpg',
    });
    expect(accepted.status).toBe('ACCEPTED');
    const paid = advanceGhnClaim(accepted, {
      action: 'PAID', notes: 'Đã đối soát sao kê chuyển khoản GHN',
      proofUrl: 'https://example.test/ghn-payment.jpg',
    });
    expect(paid.status).toBe('PAID');
    expect(() => advanceGhnClaim(paid, {
      action: 'PAID', notes: 'Không thể ghi nhận thanh toán lần hai',
      proofUrl: 'https://example.test/ghn-payment.jpg',
    })).toThrow(ConflictException);
  });

  it('requires reference, evidence and GHN proof before advancing', () => {
    expect(() => advanceGhnClaim(draft, { action: 'SUBMIT', notes: 'Thiếu mã yêu cầu GHN' }))
      .toThrow(ConflictException);
    const submitted = advanceGhnClaim(draft, {
      action: 'SUBMIT', ghnReference: 'GHN-CLAIM-1', claimedAmount: 280000,
      notes: 'Đã gửi đủ hồ sơ bồi hoàn GHN',
    });
    expect(() => advanceGhnClaim(submitted, {
      action: 'ACCEPT', approvedAmount: 300000, notes: 'GHN chấp thuận vượt quá yêu cầu',
      proofUrl: 'https://example.test/ghn.jpg',
    })).toThrow(ConflictException);
    expect(() => advanceGhnClaim(submitted, {
      action: 'REJECT', notes: 'GHN từ chối nhưng không có văn bản',
    })).toThrow(ConflictException);
    const rejected = advanceGhnClaim(submitted, {
      action: 'REJECT', notes: 'GHN từ chối theo biên bản đối soát lần đầu',
      proofUrl: 'https://example.test/ghn-rejection.jpg',
    });
    expect(() => advanceGhnClaim(rejected, {
      action: 'APPEAL', ghnReference: 'GHN-CLAIM-1', notes: 'Không thể dùng lại mã cũ khi kháng nghị',
      proofUrl: 'https://example.test/new-evidence.jpg',
    })).toThrow(ConflictException);
    expect(advanceGhnClaim(rejected, {
      action: 'APPEAL', ghnReference: 'GHN-CLAIM-2', notes: 'Đã nộp chứng cứ mới để kháng nghị',
      proofUrl: 'https://example.test/new-evidence.jpg',
    }).status).toBe('SUBMITTED');
    expect(latestGhnClaim([
      { type: 'GHN_COMPENSATION_CLAIM_OPENED', data: draft, createdAt: new Date('2026-01-01') },
      { type: 'GHN_COMPENSATION_CLAIM_UPDATED', data: submitted, createdAt: new Date('2026-01-02') },
    ])?.status).toBe('SUBMITTED');
  });

  it('serializes manager updates on the return row and records immutable evidence', async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'return-1' }]),
      returnRequest: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'return-1', orderId: 'order-1', customerId: 'customer-1',
          order: { externalOrderSn: 'DH-1', store: { ownerId: 'shop-1' } },
          events: [{ type: 'GHN_COMPENSATION_CLAIM_OPENED', data: draft, createdAt: new Date() }],
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      returnEvent: { create: jest.fn().mockResolvedValue({}) },
      notification: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = { $transaction: jest.fn((work: (client: typeof tx) => unknown) => work(tx)) };
    const service = new ReturnService(prisma as never, {} as never);
    jest.spyOn(service, 'getOne').mockResolvedValue({ id: 'return-1' } as never);
    await expect(service.updateGhnClaim('manager-1', UserRole.SYSTEM_MANAGER, 'return-1', {
      action: 'SUBMIT', ghnReference: 'GHN-CLAIM-1', claimedAmount: 280000,
      notes: 'Đã gửi ảnh bàn giao, mở hộp và vận đơn cho GHN',
    })).resolves.toEqual({ id: 'return-1' });
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.returnEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      type: 'GHN_COMPENSATION_CLAIM_UPDATED',
      data: expect.objectContaining({ status: 'SUBMITTED', claimedAmount: 280000 }),
    }) });
    await expect(service.updateGhnClaim('shop-1', UserRole.SHOP_MANAGER, 'return-1', {
      action: 'SUBMIT', notes: 'Shop không được ghi kết quả GHN',
    })).rejects.toBeInstanceOf(ForbiddenException);
  });
});
