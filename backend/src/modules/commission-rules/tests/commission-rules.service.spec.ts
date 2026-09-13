import { Test, TestingModule } from '@nestjs/testing';
import { CommissionRulesService } from '../commission-rules.service';
import { PrismaService } from '../../../core/database/prisma.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, UserRole, CommissionStatus } from '@prisma/client';
import { WalletsService } from '../../wallets/wallets.service';
import { FinancialLedgerService } from '../../wallets/financial-ledger.service';

describe('CommissionRulesService', () => {
  let service: CommissionRulesService;
  let prisma: PrismaService;

  const mockStoreId = '11111111-1111-1111-1111-111111111111';
  const mockUserId = '22222222-2222-2222-2222-222222222222';
  const mockKolId = '33333333-3333-3333-3333-333333333333';
  const mockStore = {
    id: mockStoreId,
    ownerId: mockUserId,
    name: 'TechStore Test',
    isDeleted: false,
  };

  const mockRules = [
    {
      id: 'rule-50m',
      storeId: mockStoreId,
      name: 'Thưởng 50 Triệu',
      description: 'Mốc 50M đạt KPI thưởng 500k, phần vượt 2%',
      minMonthlyRevenue: new Prisma.Decimal(50000000),
      achievementBonus: new Prisma.Decimal(500000),
      bonusPercentage: new Prisma.Decimal(2.0),
      isActive: true,
      effectiveFrom: new Date('2026-08-01'),
      effectiveTo: null,
      version: 1,
      isDeleted: false,
      deletedAt: null,
      createdBy: mockUserId,
      updatedBy: mockUserId,
      createdAt: new Date('2026-08-01'),
      updatedAt: new Date('2026-08-01'),
    },
    {
      id: 'rule-100m',
      storeId: mockStoreId,
      name: 'Thưởng 100 Triệu',
      description: 'Mốc 100M đạt KPI thưởng 1.5tr, phần vượt 3%',
      minMonthlyRevenue: new Prisma.Decimal(100000000),
      achievementBonus: new Prisma.Decimal(1500000),
      bonusPercentage: new Prisma.Decimal(3.0),
      isActive: true,
      effectiveFrom: new Date('2026-08-01'),
      effectiveTo: null,
      version: 1,
      isDeleted: false,
      deletedAt: null,
      createdBy: mockUserId,
      updatedBy: mockUserId,
      createdAt: new Date('2026-08-01'),
      updatedAt: new Date('2026-08-01'),
    },
    {
      id: 'rule-200m',
      storeId: mockStoreId,
      name: 'Thưởng 200 Triệu',
      description: 'Mốc 200M đạt KPI thưởng 3.5tr, phần vượt 5%',
      minMonthlyRevenue: new Prisma.Decimal(200000000),
      achievementBonus: new Prisma.Decimal(3500000),
      bonusPercentage: new Prisma.Decimal(5.0),
      isActive: true,
      effectiveFrom: new Date('2026-08-01'),
      effectiveTo: null,
      version: 1,
      isDeleted: false,
      deletedAt: null,
      createdBy: mockUserId,
      updatedBy: mockUserId,
      createdAt: new Date('2026-08-01'),
      updatedAt: new Date('2026-08-01'),
    },
  ];

  const mockPrismaService = {
    store: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    commissionRule: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    campaignParticipant: {
      findFirst: jest.fn(),
    },
    referralLink: {
      findFirst: jest.fn(),
    },
    sampleProductRequest: {
      findFirst: jest.fn(),
    },
    monthlyBonusResult: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    bonusAdjustment: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    wallet: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    financialLedger: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $executeRawUnsafe: jest.fn(),
    $transaction: jest.fn(async (cb) => {
      return cb(mockPrismaService);
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommissionRulesService,
        WalletsService,
        FinancialLedgerService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CommissionRulesService>(CommissionRulesService);
    prisma = module.get<PrismaService>(PrismaService);

    // Mặc định store tồn tại và hợp lệ
    mockPrismaService.store.findUnique.mockResolvedValue(mockStore);
    mockPrismaService.user.findUnique.mockResolvedValue({
      id: mockKolId,
      fullName: 'Top KOL Test',
      role: UserRole.COLLABORATOR,
      isActive: true,
      isDeleted: false,
    });
    mockPrismaService.order.findFirst.mockResolvedValue({
      id: 'ord-affiliate',
    });
    mockPrismaService.bonusAdjustment.findMany.mockResolvedValue([]);
    mockPrismaService.bonusAdjustment.updateMany.mockResolvedValue({
      count: 0,
    });
  });

  describe('1. Store Existence Check', () => {
    it('should throw NotFoundException if store does not exist', async () => {
      mockPrismaService.store.findUnique.mockResolvedValueOnce(null);

      await expect(service.findAll('non-existent-store')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if store is soft-deleted', async () => {
      mockPrismaService.store.findUnique.mockResolvedValueOnce({
        ...mockStore,
        isDeleted: true,
      });

      await expect(service.findAll(mockStoreId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('2. Find All & Find One', () => {
    it('should return non-deleted rules sorted by minMonthlyRevenue ASC', async () => {
      mockPrismaService.commissionRule.findMany.mockResolvedValueOnce(
        mockRules,
      );

      const result = await service.findAll(mockStoreId);

      expect(result).toHaveLength(3);
      expect(result[0].minMonthlyRevenue).toBe('50000000');
      expect(result[0].achievementBonus).toBe('500000');
      expect(result[0].bonusPercentage).toBe('2');
      expect(result[0].isActive).toBe(true);
      expect(mockPrismaService.commissionRule.findMany).toHaveBeenCalledWith({
        where: { storeId: mockStoreId, isDeleted: false },
        orderBy: { minMonthlyRevenue: 'asc' },
      });
    });

    it('should find one rule by ID and storeId', async () => {
      mockPrismaService.commissionRule.findFirst.mockResolvedValueOnce(
        mockRules[0],
      );

      const result = await service.findOne(mockStoreId, 'rule-50m');
      expect(result.id).toBe('rule-50m');
      expect(result.name).toBe('Thưởng 50 Triệu');
      expect(result.achievementBonus).toBe('500000');
      expect(result.bonusPercentage).toBe('2');
    });

    it('should throw NotFoundException if rule does not exist or does not belong to store', async () => {
      mockPrismaService.commissionRule.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.findOne(mockStoreId, 'non-existent-rule'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('3. Validation & Conflict Checking on Create', () => {
    it('should throw BadRequestException if minMonthlyRevenue <= 0', async () => {
      await expect(
        service.create(mockStoreId, {
          name: 'Mốc âm',
          minMonthlyRevenue: '-1000',
          bonusPercentage: '2.00',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if achievementBonus < 0', async () => {
      await expect(
        service.create(mockStoreId, {
          name: 'Thưởng âm',
          minMonthlyRevenue: '50000000',
          achievementBonus: '-50000',
          bonusPercentage: '2.00',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if effectiveTo <= effectiveFrom', async () => {
      await expect(
        service.create(mockStoreId, {
          name: 'Mốc sai ngày',
          minMonthlyRevenue: '50000000',
          achievementBonus: '500000',
          bonusPercentage: '2.00',
          effectiveFrom: '2026-12-01T00:00:00.000Z',
          effectiveTo: '2026-10-01T00:00:00.000Z',
        }),
      ).rejects.toThrow(
        'Thời điểm kết thúc hiệu lực (effectiveTo) phải sau thời điểm bắt đầu (effectiveFrom)',
      );
    });

    it('should throw ConflictException if minMonthlyRevenue already exists in this store', async () => {
      mockPrismaService.commissionRule.findFirst.mockResolvedValueOnce(
        mockRules[0],
      );

      await expect(
        service.create(mockStoreId, {
          name: 'Trùng mốc 50tr',
          minMonthlyRevenue: '50000000',
          achievementBonus: '500000',
          bonusPercentage: '2.50',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if higher revenue has lower bonus percentage (Hierarchy rule)', async () => {
      mockPrismaService.commissionRule.findFirst.mockResolvedValueOnce(null);
      mockPrismaService.commissionRule.findMany.mockResolvedValueOnce([
        mockRules[0], // 50M -> 2%
      ]);

      await expect(
        service.create(mockStoreId, {
          name: 'Mốc 100M thưởng bèo',
          minMonthlyRevenue: '100000000',
          achievementBonus: '1000000',
          bonusPercentage: '1.50',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if lower revenue has higher bonus percentage (Hierarchy rule)', async () => {
      mockPrismaService.commissionRule.findFirst.mockResolvedValueOnce(null);
      mockPrismaService.commissionRule.findMany.mockResolvedValueOnce([
        mockRules[0], // 50M -> 2%
      ]);

      await expect(
        service.create(mockStoreId, {
          name: 'Mốc 30M thưởng quá cao',
          minMonthlyRevenue: '30000000',
          achievementBonus: '200000',
          bonusPercentage: '3.00',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully create rule, set version=1, achievementBonus and write audit log in transaction', async () => {
      mockPrismaService.commissionRule.findFirst.mockResolvedValueOnce(null);
      mockPrismaService.commissionRule.findMany.mockResolvedValueOnce([]);

      const createdMock = {
        id: 'new-rule-id',
        storeId: mockStoreId,
        name: 'Thưởng 50 Triệu',
        description: 'Mô tả mốc 50M',
        minMonthlyRevenue: new Prisma.Decimal(50000000),
        achievementBonus: new Prisma.Decimal(500000),
        bonusPercentage: new Prisma.Decimal(2.0),
        isActive: true,
        effectiveFrom: new Date('2026-09-01'),
        effectiveTo: null,
        version: 1,
        createdBy: mockUserId,
        updatedBy: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.commissionRule.create.mockResolvedValueOnce(
        createdMock,
      );

      const result = await service.create(
        mockStoreId,
        {
          name: 'Thưởng 50 Triệu',
          description: 'Mô tả mốc 50M',
          minMonthlyRevenue: '50000000',
          achievementBonus: '500000',
          bonusPercentage: '2.00',
          isActive: true,
        },
        mockUserId,
        '127.0.0.1',
      );

      expect(result.id).toBe('new-rule-id');
      expect(result.version).toBe(1);
      expect(result.achievementBonus).toBe('500000');
      expect(result.isActive).toBe(true);
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: mockUserId,
            action: 'CREATE_COMMISSION_RULE',
          }),
        }),
      );
    });
  });

  describe('4. Update Validation, Status Toggle & Soft Delete', () => {
    it('should reject empty payload {} on update with BadRequestException', async () => {
      await expect(service.update(mockStoreId, 'rule-50m', {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject whitespace-only name on update with BadRequestException', async () => {
      await expect(
        service.update(mockStoreId, 'rule-50m', { name: '    ' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject negative achievementBonus on update with BadRequestException', async () => {
      mockPrismaService.commissionRule.findFirst.mockResolvedValueOnce(
        mockRules[0],
      );

      await expect(
        service.update(mockStoreId, 'rule-50m', { achievementBonus: '-1000' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update rule, increment version and record old and new values in audit log', async () => {
      mockPrismaService.commissionRule.findFirst.mockResolvedValueOnce(
        mockRules[0],
      );
      mockPrismaService.commissionRule.findMany.mockResolvedValueOnce([]);

      const updatedMock = {
        ...mockRules[0],
        name: 'Thưởng 50 Triệu Updated',
        achievementBonus: new Prisma.Decimal(600000),
        bonusPercentage: new Prisma.Decimal(2.5),
        version: 2,
      };
      mockPrismaService.commissionRule.update.mockResolvedValueOnce(
        updatedMock,
      );

      const result = await service.update(
        mockStoreId,
        'rule-50m',
        {
          name: 'Thưởng 50 Triệu Updated',
          achievementBonus: '600000',
          bonusPercentage: '2.50',
        },
        mockUserId,
      );

      expect(result.name).toBe('Thưởng 50 Triệu Updated');
      expect(result.achievementBonus).toBe('600000');
      expect(result.version).toBe(2);
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'UPDATE_COMMISSION_RULE',
          }),
        }),
      );
    });

    it('should toggle rule active status with updateStatus', async () => {
      mockPrismaService.commissionRule.findFirst.mockResolvedValueOnce(
        mockRules[0],
      );
      mockPrismaService.commissionRule.update.mockResolvedValueOnce({
        ...mockRules[0],
        isActive: false,
        version: 2,
      });

      const result = await service.updateStatus(
        mockStoreId,
        'rule-50m',
        false,
        mockUserId,
      );

      expect(result.isActive).toBe(false);
      expect(result.version).toBe(2);
      expect(result.message).toContain('tạm ngừng');
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'UPDATE_COMMISSION_RULE_STATUS',
          }),
        }),
      );
    });

    it('should soft-delete rule without physical delete', async () => {
      mockPrismaService.commissionRule.findFirst.mockResolvedValueOnce(
        mockRules[0],
      );
      mockPrismaService.commissionRule.update.mockResolvedValueOnce({
        ...mockRules[0],
        isDeleted: true,
        deletedAt: new Date(),
      });

      const result = await service.remove(mockStoreId, 'rule-50m', mockUserId);
      expect(result.success).toBe(true);
      expect(mockPrismaService.commissionRule.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rule-50m' },
          data: expect.objectContaining({ isDeleted: true, isActive: false }),
        }),
      );
    });
  });

  describe('5. Monthly Sales Bonus Simulation & Progressive Bracket Engine', () => {
    beforeEach(() => {
      mockPrismaService.commissionRule.findMany.mockResolvedValue(mockRules);
    });

    it('Boundary 1: Revenue under 50M (49,999,999đ) -> 0đ bonus', async () => {
      const result = await service.previewBonus(mockStoreId, '49999999');

      expect(result.highestReachedRule).toBeNull();
      expect(result.achievementBonus).toBe('0.00');
      expect(result.rangeBonuses).toHaveLength(0);
      expect(result.totalBonus).toBe('0.00');
      expect(result.formula).toContain('chưa đạt mốc KPI nào');
    });

    it('Boundary 2: Revenue exactly 50M (50,000,000đ) -> KPI Bonus = 500,000đ, excess = 0đ, Total = 500,000đ', async () => {
      const result = await service.previewBonus(mockStoreId, '50000000');

      expect(result.highestReachedRule?.id).toBe('rule-50m');
      expect(result.achievementBonus).toBe('500000.00');
      expect(result.rangeBonuses).toHaveLength(0);
      expect(result.totalBonus).toBe('500000.00');
    });

    it('Boundary 3: Revenue 50,000,001đ (+1đ excess) -> KPI Bonus = 500,000đ + 1đ × 2% = 500,000.02đ', async () => {
      const result = await service.previewBonus(mockStoreId, '50000001');

      expect(result.highestReachedRule?.id).toBe('rule-50m');
      expect(result.achievementBonus).toBe('500000.00');
      expect(result.rangeBonuses).toHaveLength(1);
      expect(result.rangeBonuses[0].revenue).toBe('1.00');
      expect(result.rangeBonuses[0].bonus).toBe('0.02');
      expect(result.totalBonus).toBe('500000.02');
    });

    it('Boundary 4: Revenue 60M (60,000,000đ) -> KPI Bonus = 500,000đ + 10M × 2% (200,000đ) = 700,000đ', async () => {
      const result = await service.previewBonus(mockStoreId, '60000000');

      expect(result.highestReachedRule?.id).toBe('rule-50m');
      expect(result.achievementBonus).toBe('500000.00');
      expect(result.rangeBonuses).toHaveLength(1);
      expect(result.rangeBonuses[0].from).toBe('50000000.00');
      expect(result.rangeBonuses[0].to).toBe('60000000.00');
      expect(result.rangeBonuses[0].revenue).toBe('10000000.00');
      expect(result.rangeBonuses[0].bonus).toBe('200000.00');
      expect(result.totalBonus).toBe('700000.00');
    });

    it('Boundary 5: Revenue 75M (75,000,000đ) -> KPI Bonus = 500,000đ + 25M × 2% (500,000đ) = 1,000,000đ', async () => {
      const result = await service.previewBonus(mockStoreId, '75000000');

      expect(result.highestReachedRule?.id).toBe('rule-50m');
      expect(result.achievementBonus).toBe('500000.00');
      expect(result.rangeBonuses).toHaveLength(1);
      expect(result.rangeBonuses[0].revenue).toBe('25000000.00');
      expect(result.rangeBonuses[0].bonus).toBe('500000.00');
      expect(result.totalBonus).toBe('1000000.00');
    });

    it('Multi-tier Bracket: Revenue 120M -> Highest milestone 100M (1.5M KPI) + Bracket [50M-100M] 50M × 2% (1M) + Bracket [100M-120M] 20M × 3% (600k) = 3,100,000đ', async () => {
      const result = await service.previewBonus(mockStoreId, '120000000');

      expect(result.highestReachedRule?.id).toBe('rule-100m');
      expect(result.highestReachedRule?.name).toBe('Thưởng 100 Triệu');
      expect(result.achievementBonus).toBe('1500000.00');

      expect(result.rangeBonuses).toHaveLength(2);
      expect(result.rangeBonuses[0].from).toBe('50000000.00');
      expect(result.rangeBonuses[0].to).toBe('100000000.00');
      expect(result.rangeBonuses[0].bonus).toBe('1000000.00');

      expect(result.rangeBonuses[1].from).toBe('100000000.00');
      expect(result.rangeBonuses[1].to).toBe('120000000.00');
      expect(result.rangeBonuses[1].bonus).toBe('600000.00');

      expect(result.totalBonus).toBe('3100000.00');
    });

    it('Deactivated Rule (isActive = false): Should be excluded from calculation', async () => {
      const rulesWithInactive = [
        mockRules[0], // 50M - active
        { ...mockRules[1], isActive: false }, // 100M - INACTIVE
      ];
      mockPrismaService.commissionRule.findMany.mockResolvedValueOnce(
        rulesWithInactive,
      );

      const result = await service.previewBonus(mockStoreId, '120000000');

      expect(result.highestReachedRule?.id).toBe('rule-50m');
      expect(result.achievementBonus).toBe('500000.00');
      expect(result.rangeBonuses).toHaveLength(1);
      expect(result.rangeBonuses[0].revenue).toBe('70000000.00');
      expect(result.rangeBonuses[0].bonus).toBe('1400000.00');
      expect(result.totalBonus).toBe('1900000.00');
    });
  });

  describe('6. Real Orders Sales Aggregation & Idempotent Monthly Settlement', () => {
    it('should aggregate valid completed orders in month for KOL', async () => {
      mockPrismaService.order.findMany.mockResolvedValueOnce([
        {
          id: 'order-1',
          finalAmount: new Prisma.Decimal(25000000),
          refundedAmount: new Prisma.Decimal(0),
          refunds: [],
          status: 'COMPLETED',
        },
        {
          id: 'order-2',
          finalAmount: new Prisma.Decimal(35000000),
          refundedAmount: new Prisma.Decimal(0),
          refunds: [],
          status: 'COMPLETED',
        },
      ]);

      const result = await service.calculateValidMonthlyRevenue(
        mockStoreId,
        mockKolId,
        '2026-09',
      );

      expect(result.validOrdersCount).toBe(2);
      expect(result.validRevenue).toBe('60000000.00');
    });

    it('should settle monthly bonus and save rule snapshot on first run', async () => {
      mockPrismaService.monthlyBonusResult.findUnique.mockResolvedValueOnce(
        null,
      );

      // Orders trả về 60 triệu
      mockPrismaService.order.findMany.mockResolvedValueOnce([
        {
          id: 'order-1',
          finalAmount: new Prisma.Decimal(60000000),
          refundedAmount: new Prisma.Decimal(0),
          refunds: [],
          status: 'COMPLETED',
        },
      ]);

      mockPrismaService.commissionRule.findMany.mockResolvedValueOnce(
        mockRules,
      );

      const createdSettlement = {
        id: 'settlement-1',
        storeId: mockStoreId,
        collaboratorId: mockKolId,
        yearMonth: '2026-09',
        validRevenue: new Prisma.Decimal(60000000),
        appliedRuleId: 'rule-50m',
        appliedRuleName: 'Thưởng 50 Triệu',
        bonusPercentage: new Prisma.Decimal(2.0),
        achievementBonus: new Prisma.Decimal(500000),
        bonusAmount: new Prisma.Decimal(700000),
        ruleSnapshot: {
          monthlyRevenue: '60000000.00',
          achievementBonus: '500000.00',
          totalBonus: '700000.00',
        },
        status: CommissionStatus.PENDING,
        settledAt: new Date(),
      };
      mockPrismaService.monthlyBonusResult.create.mockResolvedValueOnce(
        createdSettlement,
      );

      const result = await service.settleMonthlyBonus(
        mockStoreId,
        mockKolId,
        '2026-09',
        mockUserId,
        undefined,
        true, // allowUnfinishedMonth
      );

      expect(result.isAlreadySettled).toBe(false);
      expect(result.settlement.bonusAmount).toBe('700000');
      expect(result.settlement.status).toBe(CommissionStatus.PENDING);
      expect(mockPrismaService.monthlyBonusResult.create).toHaveBeenCalled();
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'SETTLE_MONTHLY_BONUS',
          }),
        }),
      );
    });

    it('should be idempotent: return existing settlement on second run without duplicate bonus', async () => {
      const existingSettlement = {
        id: 'settlement-1',
        storeId: mockStoreId,
        collaboratorId: mockKolId,
        yearMonth: '2026-09',
        validRevenue: new Prisma.Decimal(60000000),
        appliedRuleId: 'rule-50m',
        appliedRuleName: 'Thưởng 50 Triệu',
        bonusPercentage: new Prisma.Decimal(2.0),
        achievementBonus: new Prisma.Decimal(500000),
        bonusAmount: new Prisma.Decimal(700000),
        ruleSnapshot: { id: 'rule-50m', totalBonus: '700000.00' },
        status: CommissionStatus.PENDING,
        settledAt: new Date('2026-10-01'),
        approvedAt: null,
        paidAt: null,
      };

      mockPrismaService.monthlyBonusResult.findUnique.mockResolvedValueOnce(
        existingSettlement,
      );

      const result = await service.settleMonthlyBonus(
        mockStoreId,
        mockKolId,
        '2026-09',
        mockUserId,
        undefined,
        true,
      );

      expect(result.isAlreadySettled).toBe(true);
      expect(result.message).toContain('đã được chốt thưởng trước đó');
      expect(
        mockPrismaService.monthlyBonusResult.create,
      ).not.toHaveBeenCalled();
    });
  });
});
