import { CommissionsService } from './commissions.service';
import { UserRole } from '@prisma/client';

describe('referral review evidence', () => {
  const setup = () => {
    const address = { detailAddress: '123 Nguyen Hue', wardName: 'Ben Nghe', districtName: 'Quan 1', provinceName: 'Ho Chi Minh' };
    const bank = { bankName: 'VCB', bankAccountNumber: '1234567890', kycStatus: 'VERIFIED' };
    const order = { id: 'order', externalOrderSn: 'DH-QA', customerName: 'Nguoi nhan', shippingAddress: Object.values(address).join(', '),
      rawPayload: { selfReferralReviewRequired: true, selfReferralRiskSignals: ['SHARED_DELIVERY_ADDRESS'] },
      customer: { fullName: 'Khach', collaboratorProfile: bank },
      attributedCollaborator: { fullName: 'KOL', collaboratorProfile: bank, customerAddresses: [address] } };
    const service = Object.create(CommissionsService.prototype);
    service.prisma = { order: { findUnique: jest.fn().mockResolvedValue(order) } };
    return { service: service as CommissionsService, order, query: service.prisma.order.findUnique };
  };
  it('rejects shop and collaborator before reading personal data', async () => {
    const { service, query } = setup();
    for (const role of [UserRole.SHOP_MANAGER, UserRole.COLLABORATOR, UserRole.CUSTOMER]) {
      await expect(service.getReferralReview('order', { id: 'viewer', role })).rejects.toThrow();
    }
    expect(query).not.toHaveBeenCalled();
  });
  it('returns matching addresses and masked banks to the manager', async () => {
    const { service } = setup();
    const result = await service.getReferralReview('order', { id: 'manager', role: UserRole.SYSTEM_MANAGER });
    expect(result.matchedAddresses).toHaveLength(1);
    expect(result.customerBank?.account).toBe('••••7890');
    expect(JSON.stringify(result)).not.toContain('1234567890');
    expect(result.evidenceBasis).toBe('CURRENT_PROFILE');
  });
  it('preserves recorded signals when the current address no longer matches', async () => {
    const { service, order } = setup();
    order.attributedCollaborator.customerAddresses = [];
    order.attributedCollaborator.collaboratorProfile.kycStatus = 'UNVERIFIED';
    const result = await service.getReferralReview('order', { id: 'admin', role: UserRole.SYSTEM_ADMIN });
    expect(result.recordedSignals).toEqual(['SHARED_DELIVERY_ADDRESS']);
    expect(result.currentSignals).toEqual([]);
    expect(result.matchedAddresses).toEqual([]);
  });
});
