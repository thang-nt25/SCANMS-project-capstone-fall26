import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { CommissionRulesService } from '../commission-rules.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { Prisma, UserRole, CommissionStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

jest.setTimeout(30000);

describe('CommissionRules Real PostgreSQL Integration Tests', () => {
  let service: CommissionRulesService;
  let prisma: PrismaService;

  const testStoreId = '99999999-9999-9999-9999-999999999999';
  const testOwnerId = '88888888-8888-8888-8888-888888888888';
  const testKolId = '77777777-7777-7777-7777-777777777777';

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [CommissionRulesService, PrismaService],
    }).compile();

    service = module.get<CommissionRulesService>(CommissionRulesService);
    prisma = module.get<PrismaService>(PrismaService);

    // Dọn dẹp dữ liệu thử nghiệm cũ nếu còn
    await cleanupTestData();

    // Khởi tạo người dùng và cửa hàng thật trong PostgreSQL (dùng findUnique + create để tránh đổi primary key)
    const existingOwner = await prisma.user.findFirst({
      where: { OR: [{ id: testOwnerId }, { email: 'real_owner_test@scanms.vn' }] },
    });
    if (!existingOwner) {
      await prisma.user.create({
        data: {
          id: testOwnerId,
          email: 'real_owner_test@scanms.vn',
          passwordHash: bcrypt.hashSync('Password@123', 10),
          fullName: 'Chủ Shop Real DB Test',
          role: UserRole.SHOP_MANAGER,
          isActive: true,
        },
      });
    }

    const existingKol = await prisma.user.findFirst({
      where: { OR: [{ id: testKolId }, { email: 'real_kol_test@scanms.vn' }] },
    });
    if (!existingKol) {
      await prisma.user.create({
        data: {
          id: testKolId,
          email: 'real_kol_test@scanms.vn',
          passwordHash: bcrypt.hashSync('Password@123', 10),
          fullName: 'KOL Real DB Test',
          role: UserRole.COLLABORATOR,
          isActive: true,
        },
      });
    }

    const existingStore = await prisma.store.findUnique({
      where: { id: testStoreId },
    });
    if (!existingStore) {
      await prisma.store.create({
        data: {
          id: testStoreId,
          ownerId: testOwnerId,
          name: 'Real DB Test Store',
          slug: 'real-db-test-store-' + Date.now(),
        },
      });
    }
  }, 30000);

  afterAll(async () => {
    await cleanupTestData();
    await prisma.onModuleDestroy();
  }, 30000);

  async function cleanupTestData() {
    try {
      await prisma.bonusAdjustment.deleteMany({ where: { storeId: testStoreId } });
      await prisma.financialLedger.deleteMany({
        where: { wallet: { collaboratorId: testKolId } },
      });
      await prisma.wallet.deleteMany({ where: { collaboratorId: testKolId } });
      await prisma.monthlyBonusResult.deleteMany({
        where: { OR: [{ storeId: testStoreId }, { collaboratorId: testKolId }] },
      });
      await prisma.orderRefund.deleteMany({
        where: { order: { storeId: testStoreId } },
      });
      await prisma.commission.deleteMany({
        where: { OR: [{ order: { storeId: testStoreId } }, { collaboratorId: testKolId }] },
      });
      await prisma.orderItem.deleteMany({
        where: { order: { storeId: testStoreId } },
      });
      await prisma.order.deleteMany({
        where: { OR: [{ storeId: testStoreId }, { attributedCollaboratorId: testKolId }] },
      });
      await prisma.commissionRule.deleteMany({ where: { storeId: testStoreId } });
      await prisma.campaignParticipant.deleteMany({ where: { collaboratorId: testKolId } });
      await prisma.referralLink.deleteMany({ where: { collaboratorId: testKolId } });
      await prisma.sampleProductRequest.deleteMany({ where: { collaboratorId: testKolId } });
      await prisma.collaboratorSocialChannel.deleteMany({ where: { collaboratorId: testKolId } });
      await prisma.collaboratorProfile.deleteMany({ where: { userId: testKolId } });
      await prisma.chatMessage.deleteMany({
        where: { senderId: { in: [testOwnerId, testKolId] } },
      });
      await prisma.conversation.deleteMany({
        where: { OR: [{ storeId: testStoreId }, { collaboratorId: testKolId }] },
      });
      await prisma.payoutRequest.deleteMany({
        where: { OR: [{ storeId: testStoreId }, { collaboratorId: testKolId }] },
      });
      await prisma.auditLog.deleteMany({
        where: { userId: { in: [testOwnerId, testKolId] } },
      });
      await prisma.productReview.deleteMany({
        where: { product: { storeId: testStoreId } },
      });
      await prisma.mediaAsset.deleteMany({ where: { storeId: testStoreId } });
      await prisma.product.deleteMany({ where: { storeId: testStoreId } });
      await prisma.store.deleteMany({ where: { id: testStoreId } });
      await prisma.user.deleteMany({
        where: {
          OR: [
            { id: { in: [testOwnerId, testKolId] } },
            { email: { in: ['real_owner_test@scanms.vn', 'real_kol_test@scanms.vn'] } },
          ],
        },
      });
    } catch {
      // Bỏ qua lỗi dọn dẹp nếu bản ghi chưa tồn tại
    }
  }

  describe('1. Real PostgreSQL Partial Unique Index (Soft-delete repeatability)', () => {
    it('should allow repeating soft-delete and recreate same threshold without unique constraint collision', async () => {
      // 1. Tạo mốc 50M lần 1
      const rule1 = await service.create(
        testStoreId,
        {
          name: 'Mốc 50M - Lần 1',
          minMonthlyRevenue: '50000000',
          achievementBonus: '500000',
          bonusPercentage: '2.00',
        },
        testOwnerId,
      );
      expect(rule1.id).toBeDefined();

      // 2. Xóa mềm mốc lần 1 (isDeleted = true)
      await service.remove(testStoreId, rule1.id, testOwnerId);

      // 3. Tạo mốc 50M lần 2 -> PostgreSQL Partial Unique Index phải cho phép!
      const rule2 = await service.create(
        testStoreId,
        {
          name: 'Mốc 50M - Lần 2',
          minMonthlyRevenue: '50000000',
          achievementBonus: '500000',
          bonusPercentage: '2.00',
        },
        testOwnerId,
      );
      expect(rule2.id).toBeDefined();

      // 4. Xóa mềm mốc lần 2 (isDeleted = true) -> Không bị lỗi duplicate constraint!
      await service.remove(testStoreId, rule2.id, testOwnerId);

      // Cả 2 bản ghi soft-deleted đều tồn tại trong DB
      const softDeletedCount = await prisma.commissionRule.count({
        where: { storeId: testStoreId, isDeleted: true },
      });
      expect(softDeletedCount).toBe(2);

      // 5. Tạo mốc 50M active
      const rule3 = await service.create(
        testStoreId,
        {
          name: 'Mốc 50M - Hoạt động',
          minMonthlyRevenue: '50000000',
          achievementBonus: '500000',
          bonusPercentage: '2.00',
          effectiveFrom: '2026-08-01T00:00:00.000Z',
        },
        testOwnerId,
      );
      expect(rule3.id).toBeDefined();

      // 6. Tạo trùng khi đang active -> Phải bị từ chối
      await expect(
        service.create(
          testStoreId,
          {
            name: 'Mốc 50M - Trùng active',
            minMonthlyRevenue: '50000000',
            achievementBonus: '500000',
            bonusPercentage: '2.00',
          },
          testOwnerId,
        ),
      ).rejects.toThrow('Shop đã có mốc doanh số 50000000đ đang hoạt động');
    });
  });

  describe('2. Real Decimal Precision & No Decimal(5,2) Overflow on achievementBonus', () => {
    it('should store achievementBonus = 500,000 VND without Decimal(5,2) overflow in real PostgreSQL', async () => {
      // Tạo thêm mốc 100M: KPI 1.500.000đ, phần vượt 3%
      const rule100M = await service.create(
        testStoreId,
        {
          name: 'Mốc 100M',
          minMonthlyRevenue: '100000000',
          achievementBonus: '1500000',
          bonusPercentage: '3.00',
        },
        testOwnerId,
      );

      // Truy vấn trực tiếp từ PostgreSQL kiểm tra Decimal(15,2)
      const rawRule = await prisma.commissionRule.findUnique({
        where: { id: rule100M.id },
      });

      expect(rawRule?.achievementBonus.toString()).toBe('1500000');
      expect(rawRule?.minMonthlyRevenue.toString()).toBe('100000000');
    });
  });

  describe('3. Real Orders Aggregation with completedAt, shippingFee, and refunds', () => {
    it('should aggregate only orders with status COMPLETED and completedAt in calendar month', async () => {
      const yearMonth = '2026-08';
      const { startOfMonth, endOfMonth } = service.getVietnamMonthDateRange(yearMonth);

      // 1. Đơn 1: Thuộc tháng 8 (completedAt trong tháng 8)
      // subtotal 30M, discount 0, shipping 50k -> finalAmount = 30.050.000đ
      const order1 = await prisma.order.create({
        data: {
          storeId: testStoreId,
          externalOrderSn: 'ORD-REAL-001',
          attributedCollaboratorId: testKolId,
          subtotalAmount: new Prisma.Decimal(30000000),
          discountAmount: new Prisma.Decimal(0),
          shippingFee: new Prisma.Decimal(50000),
          finalAmount: new Prisma.Decimal(30050000),
          status: 'COMPLETED',
          completedAt: new Date(startOfMonth.getTime() + 86400000 * 2), // Ngày 3/8
          refundedAmount: new Prisma.Decimal(50000), // Hoàn 50k
        },
      });

      // 2. Đơn 2: Thuộc tháng 8, hoàn thành ngày 15/8, giá trị 35.000.000đ
      await prisma.order.create({
        data: {
          storeId: testStoreId,
          externalOrderSn: 'ORD-REAL-002',
          attributedCollaboratorId: testKolId,
          subtotalAmount: new Prisma.Decimal(35000000),
          discountAmount: new Prisma.Decimal(0),
          shippingFee: new Prisma.Decimal(0),
          finalAmount: new Prisma.Decimal(35000000),
          status: 'COMPLETED',
          completedAt: new Date(startOfMonth.getTime() + 86400000 * 15),
        },
      });

      // 3. Đơn 3: Tạo tháng 8 nhưng sang tháng 9 mới hoàn thành -> KHÔNG tính vào tháng 8!
      await prisma.order.create({
        data: {
          storeId: testStoreId,
          externalOrderSn: 'ORD-REAL-003',
          attributedCollaboratorId: testKolId,
          subtotalAmount: new Prisma.Decimal(20000000),
          finalAmount: new Prisma.Decimal(20000000),
          status: 'COMPLETED',
          createdAt: new Date(startOfMonth.getTime() + 86400000 * 28), // Đặt ngày 29/8
          completedAt: new Date(endOfMonth.getTime() + 86400000 * 2), // Hoàn thành ngày 2/9
        },
      });

      // 4. Đơn 4: Bị HỦY (CANCELLED) trong tháng 8 -> KHÔNG tính!
      await prisma.order.create({
        data: {
          storeId: testStoreId,
          externalOrderSn: 'ORD-REAL-004',
          attributedCollaboratorId: testKolId,
          subtotalAmount: new Prisma.Decimal(50000000),
          finalAmount: new Prisma.Decimal(50000000),
          status: 'CANCELLED',
          completedAt: new Date(startOfMonth.getTime() + 86400000 * 5),
        },
      });

      // Doanh số tháng 8:
      // Đơn 1: 30.050.000 - 50.000 = 30.000.000đ
      // Đơn 2: 35.000.000đ
      // Tổng = 65.000.000đ
      const revenue = await service.calculateValidMonthlyRevenue(
        testStoreId,
        testKolId,
        '2026-08',
      );

      expect(revenue.validOrdersCount).toBe(2);
      expect(revenue.validRevenue).toBe('65000000.00');
    });
  });

  describe('4. Real Settle Monthly Bonus, Idempotency & Database Storage', () => {
    it('should calculate progressive bonus, store in real PostgreSQL with status PENDING', async () => {
      // Doanh số tháng 8 = 65.000.000đ
      // Mốc đạt được: 50M (KPI: 500k, vượt: 2%)
      // Thưởng cố định: 500.000đ
      // Thưởng phần vượt: (65M - 50M) * 2% = 300.000đ
      // Tổng thưởng: 800.000đ
      const settleResult = await service.settleMonthlyBonus(
        testStoreId,
        testKolId,
        '2026-08',
        testOwnerId,
        '127.0.0.1',
        true, // allowUnfinishedMonth
      );

      expect(settleResult.isAlreadySettled).toBe(false);
      expect(settleResult.settlement.bonusAmount).toBe('800000');
      expect(settleResult.settlement.status).toBe(CommissionStatus.PENDING);
      expect(settleResult.settlement.achievementBonus).toBe('500000');

      // Truy vấn trực tiếp từ PostgreSQL
      const dbRecord = await prisma.monthlyBonusResult.findUnique({
        where: {
          storeId_collaboratorId_yearMonth: {
            storeId: testStoreId,
            collaboratorId: testKolId,
            yearMonth: '2026-08',
          },
        },
      });

      expect(dbRecord).not.toBeNull();
      expect(dbRecord?.achievementBonus.toString()).toBe('500000');
      expect(dbRecord?.bonusAmount.toString()).toBe('800000');
      expect(dbRecord?.status).toBe(CommissionStatus.PENDING);

      // Chốt lại lần 2 -> Phải Idempotent
      const rerun = await service.settleMonthlyBonus(
        testStoreId,
        testKolId,
        '2026-08',
        testOwnerId,
      );

      expect(rerun.isAlreadySettled).toBe(true);
      expect(rerun.message).toContain('đã được chốt thưởng trước đó');

      // Số lượng bản ghi trong DB vẫn chỉ duy nhất là 1
      const count = await prisma.monthlyBonusResult.count({
        where: {
          storeId: testStoreId,
          collaboratorId: testKolId,
          yearMonth: '2026-08',
        },
      });
      expect(count).toBe(1);
    });
  });

  describe('5. Real Workflow: PENDING -> APPROVED -> Payout to Wallet (FinancialLedger)', () => {
    it('should transition to APPROVED then credit Wallet and create FinancialLedger on payout', async () => {
      const settlement = await prisma.monthlyBonusResult.findFirst({
        where: { storeId: testStoreId, yearMonth: '2026-08' },
      });
      expect(settlement).toBeDefined();

      // 1. Thử payout khi đang PENDING -> Phải báo lỗi
      await expect(
        service.payoutSettlement(testStoreId, settlement!.id, testOwnerId),
      ).rejects.toThrow('Kỳ thưởng phải được APPROVED trước khi tiến hành thanh toán vào ví');

      // 2. Duyệt kỳ thưởng (PENDING -> APPROVED)
      const approved = await service.approveSettlement(
        testStoreId,
        settlement!.id,
        testOwnerId,
      );
      expect(approved.settlement.status).toBe(CommissionStatus.APPROVED);

      // 3. Thực hiện Payout vào Ví
      const payoutResult = await service.payoutSettlement(
        testStoreId,
        settlement!.id,
        testOwnerId,
      );

      expect(payoutResult.success).toBe(true);
      expect(payoutResult.settlement.paidAt).not.toBeNull();
      expect(payoutResult.settlement.walletTransactionId).not.toBeNull();
      expect(payoutResult.ledger.amount).toBe('800000');

      // 4. Kiểm tra số dư ví trong PostgreSQL
      const wallet = await prisma.wallet.findUnique({
        where: { collaboratorId: testKolId },
      });
      expect(wallet?.availableBalance.toString()).toBe('800000');

      // 5. Kiểm tra Sổ cái tài chính FinancialLedger trong PostgreSQL
      const ledger = await prisma.financialLedger.findUnique({
        where: { id: payoutResult.settlement.walletTransactionId! },
      });
      expect(ledger).not.toBeNull();
      expect(ledger?.amount.toString()).toBe('800000');
      expect(ledger?.balanceAfter.toString()).toBe('800000');

      // 6. Chống cộng tiền 2 lần vào ví
      await expect(
        service.payoutSettlement(testStoreId, settlement!.id, testOwnerId),
      ).rejects.toThrow('Kỳ thưởng này đã được chi trả vào ví trước đó');
    });
  });
});
