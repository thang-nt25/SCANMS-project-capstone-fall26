import { ForbiddenException } from '@nestjs/common';
import { AffiliateDealsService } from './affiliate-deals.service';

describe('AffiliateDealsService', () => {
  const collaboratorId = '11111111-1111-4111-8111-111111111111';
  const storeId = '22222222-2222-4222-8222-222222222222';
  const productId = '33333333-3333-4333-8333-333333333333';
  const proposalId = '44444444-4444-4444-8444-444444444444';
  const conversationId = '55555555-5555-4555-8555-555555555555';
  const shopOwnerId = '66666666-6666-4666-8666-666666666666';

  let service: AffiliateDealsService;
  let prisma: any;
  let chatGateway: any;
  let referralLinksService: any;
  let tx: any;

  beforeEach(() => {
    tx = {
      coupon: { create: jest.fn().mockResolvedValue({ id: '88888888-8888-4888-8888-888888888888' }) },
      couponProduct: { create: jest.fn() },
      referralLink: { update: jest.fn() },
      exclusiveDealProposal: { create: jest.fn() },
      chatMessage: { create: jest.fn() },
      conversation: { update: jest.fn() },
    };
    prisma = {
      user: { findUnique: jest.fn() },
      store: { findUnique: jest.fn() },
      product: { findFirst: jest.fn() },
      collaboratorProfile: {
        findUnique: jest.fn().mockResolvedValue({ socialLinksJson: {} }),
      },
      exclusiveDealProposal: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      referralLink: { update: jest.fn() },
      conversation: {
        findFirst: jest.fn().mockResolvedValue({ id: conversationId }),
        create: jest.fn(),
      },
      $transaction: jest.fn((callback: (client: any) => unknown) =>
        callback(tx),
      ),
    };
    chatGateway = { broadcastNewMessage: jest.fn() };
    referralLinksService = {
      createReferralLink: jest.fn().mockResolvedValue({
        id: '77777777-7777-4777-8777-777777777777',
        shortCode: 'VIP12345',
        shortUrl: 'http://localhost:5173/r/VIP12345',
      }),
    };
    service = new AffiliateDealsService(
      prisma,
      chatGateway,
      referralLinksService,
    );
  });

  it('blocks deal proposals until KOL KYC is verified', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: collaboratorId,
      role: 'COLLABORATOR',
      isActive: true,
      deletedAt: null,
      collaboratorProfile: { kycStatus: 'UNVERIFIED' },
    });

    await expect(
      service.createProposal(collaboratorId, {
        productId,
        proposedCommissionRate: 25,
        salesCommitment: 'Tạo 4 video, mục tiêu 80 đơn hàng.',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.product.findFirst).not.toHaveBeenCalled();
  });

  it('sends a verified KOL proposal into the shop chat without auto-approving partnership', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: collaboratorId,
      role: 'COLLABORATOR',
      isActive: true,
      deletedAt: null,
      collaboratorProfile: { kycStatus: 'VERIFIED' },
    });
    prisma.product.findFirst.mockResolvedValue({
      id: productId,
      storeId,
      title: 'Serum',
      imageUrl: null,
      price: 350000,
      customCommissionRate: 15,
      isActive: true,
      isAffiliateEnabled: true,
      deletedAt: null,
      store: {
        id: storeId,
        name: 'Sora Skin',
        ownerId: shopOwnerId,
        isActive: true,
        deletedAt: null,
        defaultCommissionRate: 10,
      },
    });
    const createdProposal = {
      id: proposalId,
      collaboratorId,
      storeId,
      productId,
      conversationId,
      proposedCommissionRate: 12,
      salesCommitment: 'Tạo 4 video, mục tiêu 80 đơn hàng.',
      status: 'PENDING',
      product: { id: productId, title: 'Serum', imageUrl: null, price: 350000 },
      store: { id: storeId, name: 'Sora Skin' },
    };
    tx.exclusiveDealProposal.create.mockResolvedValue(createdProposal);
    tx.chatMessage.create.mockResolvedValue({
      id: 'message-1',
      messageText: 'deal card',
    });

    const result = await service.createProposal(collaboratorId, {
      productId,
      proposedCommissionRate: 12,
      salesCommitment: 'Tạo 4 video, mục tiêu 80 đơn hàng.',
    });

    expect(result.status).toBe('PENDING');
    expect(tx.exclusiveDealProposal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          proposedCommissionRate: expect.anything(),
        }),
      }),
    );
    expect(tx.chatMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ conversationId }),
      }),
    );
    expect(chatGateway.broadcastNewMessage).toHaveBeenCalledWith(
      conversationId,
      expect.objectContaining({ id: 'message-1' }),
      shopOwnerId,
    );
    expect(prisma.conversation.create).not.toHaveBeenCalled();
  });

  it('turns an approved proposal into one collaborator-bound VIP referral link', async () => {
    prisma.exclusiveDealProposal.findUnique.mockResolvedValue({
      id: proposalId,
      collaboratorId,
      storeId,
      productId,
      conversationId,
      proposedCommissionRate: 13,
      status: 'PENDING',
      store: { id: storeId, ownerId: shopOwnerId, defaultCommissionRate: 10 },
      product: { id: productId, title: 'Serum', customCommissionRate: 15 },
      collaborator: { fullName: 'Mai Anh' },
      referralLink: null,
    });
    prisma.store.findUnique.mockResolvedValue({
      id: storeId,
      ownerId: shopOwnerId,
      name: 'Sora Skin',
      deletedAt: null,
    });
    prisma.exclusiveDealProposal.findFirst.mockResolvedValue({
      id: 'previous-deal',
      approvedCommissionRate: 12,
    });
    tx.chatMessage.create.mockResolvedValue({ id: 'decision-message' });

    const result = await service.approveProposal(
      proposalId,
      shopOwnerId,
      'SHOP_MANAGER',
      { discountPercent: 7, minimumOrderAmount: 250000, maximumDiscountAmount: 60000, usageLimitTotal: 30, budgetTotal: 1500000, validDays: 45 },
    );

    expect(prisma.exclusiveDealProposal.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: proposalId, status: 'PENDING' },
        data: expect.objectContaining({
          status: 'APPROVED',
          approvedCommissionRate: 13,
        }),
      }),
    );
    expect(referralLinksService.createReferralLink).toHaveBeenCalledWith(
      collaboratorId,
      expect.objectContaining({ productId, exclusiveDealId: proposalId }),
    );
    expect(result.approvedCommissionRate).toBe(13);
    expect(result.vipVoucherCode).toMatch(/^MAIANH7/);
    expect(tx.coupon.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ discountValue: 7, minimumOrderAmount: 250000, maximumDiscountAmount: 60000, usageLimitTotal: 30, budgetTotal: 1500000, fundingSource: 'SHOP_FUNDED' }) }));
    const decisionCard = JSON.parse(
      tx.chatMessage.create.mock.calls[0][0].data.messageText,
    );
    expect(decisionCard).toEqual(
      expect.objectContaining({
        previousCommissionRate: 12,
        approvedCommissionRate: 13,
      }),
    );
    expect(chatGateway.broadcastNewMessage).toHaveBeenCalledWith(
      conversationId,
      expect.objectContaining({ id: 'decision-message' }),
      collaboratorId,
    );
  });

  it('allows one higher-rate renegotiation while retaining the active deal during review', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: collaboratorId,
      role: 'COLLABORATOR',
      isActive: true,
      deletedAt: null,
      collaboratorProfile: { kycStatus: 'VERIFIED' },
    });
    prisma.product.findFirst.mockResolvedValue({
      id: productId,
      storeId,
      title: 'Serum',
      imageUrl: null,
      price: 350000,
      customCommissionRate: 25,
      isActive: true,
      isAffiliateEnabled: true,
      deletedAt: null,
      store: {
        id: storeId,
        name: 'Sora Skin',
        ownerId: shopOwnerId,
        isActive: true,
        deletedAt: null,
        defaultCommissionRate: 10,
      },
    });
    prisma.exclusiveDealProposal.findFirst.mockImplementation(
      ({ where }: any) =>
        where.status === 'APPROVED'
          ? { id: 'previous-deal', approvedCommissionRate: 12 }
          : null,
    );
    tx.exclusiveDealProposal.create.mockResolvedValue({
      id: proposalId,
      collaboratorId,
      storeId,
      productId,
      conversationId,
      proposedCommissionRate: 13,
      salesCommitment: 'Tăng doanh số trong tháng này',
      status: 'PENDING',
    });
    tx.chatMessage.create.mockImplementation(async ({ data }: any) => ({
      id: 'revision-message',
      messageText: data.messageText,
    }));

    const result = await service.createProposal(collaboratorId, {
      productId,
      proposedCommissionRate: 13,
      salesCommitment: 'Tăng doanh số trong tháng này',
    });

    expect(result.status).toBe('PENDING');
    const proposalCard = JSON.parse(
      tx.chatMessage.create.mock.calls[0][0].data.messageText,
    );
    expect(proposalCard).toEqual(
      expect.objectContaining({
        currentCommissionRate: 12,
        proposedCommissionRate: 13,
        isRevision: true,
      }),
    );
  });

  it('does not approve a proposal below the current VIP rate', async () => {
    prisma.exclusiveDealProposal.findUnique.mockResolvedValue({
      id: proposalId,
      collaboratorId,
      storeId,
      productId,
      conversationId,
      proposedCommissionRate: 12,
      status: 'PENDING',
      store: { id: storeId, ownerId: shopOwnerId, defaultCommissionRate: 10 },
      product: { id: productId, title: 'Serum', customCommissionRate: 30 },
      referralLink: null,
    });
    prisma.store.findUnique.mockResolvedValue({
      id: storeId,
      ownerId: shopOwnerId,
      name: 'Sora Skin',
      deletedAt: null,
    });
    prisma.exclusiveDealProposal.findFirst.mockResolvedValue({ id: 'current', approvedCommissionRate: 13 });

    await expect(
      service.approveProposal(proposalId, shopOwnerId, 'SHOP_MANAGER' as any),
    ).rejects.toThrow('deal VIP');
    expect(prisma.exclusiveDealProposal.updateMany).not.toHaveBeenCalled();
    expect(referralLinksService.createReferralLink).not.toHaveBeenCalled();
  });
  it('Shop kết thúc deal lần thứ tư không được tự khóa quyền nhận mẫu toàn sàn', async () => {
    prisma.exclusiveDealProposal.findUnique.mockResolvedValue({
      id: proposalId,
      storeId,
      collaboratorId,
      status: 'APPROVED',
      product: { title: 'Sản phẩm' },
    });
    prisma.exclusiveDealProposal.update = jest.fn().mockResolvedValue({});
    prisma.store.findUnique.mockResolvedValue({
      id: storeId,
      ownerId: shopOwnerId,
    });
    prisma.collaboratorProfile = {
      findUnique: jest
        .fn()
        .mockResolvedValue({
          id: 'profile-1',
          socialLinksJson: { dealViolations: { count: 3 } },
          sampleRequestsBlockedAt: null,
        }),
      update: jest.fn().mockResolvedValue({}),
    };
    jest
      .spyOn(service as any, 'appendDecisionMessage')
      .mockResolvedValue(undefined);
    const result = await service.terminateDeal(
      proposalId,
      shopOwnerId,
      'SHOP_MANAGER' as any,
      { reason: 'Không hoàn thành cam kết', escalateDispute: true },
    );
    expect(result.sampleRequestsBlocked).toBe(false);
    const update = prisma.collaboratorProfile.update.mock.calls[0][0].data;
    expect(update).not.toHaveProperty('sampleRequestsBlockedAt');
    expect(update).not.toHaveProperty('sampleRequestsBlockReason');
  });
});
