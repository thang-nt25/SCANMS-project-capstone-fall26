import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommissionRulesModule } from '../commission-rules.module';
import { AuthModule } from '../../auth/auth.module';
import { PrismaModule } from '../../../core/database/prisma.module';
import { PrismaService } from '../../../core/database/prisma.service';
import { AuthService } from '../../auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

describe('CommissionRules Integration & Security Test', () => {
  let app: INestApplication;
  let authService: AuthService;
  let jwtService: JwtService;

  const mockStoreId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const mockShopOwnerId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const otherShopOwnerId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  const adminUserId = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  const kolUserId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

  const mockUsers = [
    {
      id: mockShopOwnerId,
      email: 'owner@store.vn',
      passwordHash: bcrypt.hashSync('Password@123', 10),
      fullName: 'Chủ Cửa Hàng A',
      role: UserRole.SHOP_MANAGER,
      isActive: true,
      isDeleted: false,
    },
    {
      id: otherShopOwnerId,
      email: 'hacker@other.vn',
      passwordHash: bcrypt.hashSync('Password@123', 10),
      fullName: 'Chủ Cửa Hàng B (Trái quyền)',
      role: UserRole.SHOP_MANAGER,
      isActive: true,
      isDeleted: false,
    },
    {
      id: adminUserId,
      email: 'admin@scanms.vn',
      passwordHash: bcrypt.hashSync('Password@123', 10),
      fullName: 'Quản Trị Viên Hệ Thống',
      role: UserRole.SYSTEM_ADMIN,
      isActive: true,
      isDeleted: false,
    },
    {
      id: kolUserId,
      email: 'kol@scanms.vn',
      passwordHash: bcrypt.hashSync('Password@123', 10),
      fullName: 'Nguyễn Văn KOL',
      role: UserRole.COLLABORATOR,
      isActive: true,
      isDeleted: false,
    },
  ];

  const mockStore = {
    id: mockStoreId,
    ownerId: mockShopOwnerId,
    name: 'TechStore Flagship',
    isDeleted: false,
  };

  const inMemoryRules: any[] = [];
  const inMemoryBonusResults: any[] = [];
  const inMemoryAuditLogs: any[] = [];

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(async ({ where }) => {
        if (where.id) return mockUsers.find((u) => u.id === where.id) || null;
        if (where.email)
          return mockUsers.find((u) => u.email === where.email) || null;
        return null;
      }),
    },
    store: {
      findUnique: jest.fn(async ({ where }) => {
        if (where.id === mockStoreId) return mockStore;
        return null;
      }),
    },
    commissionRule: {
      findMany: jest.fn(async ({ where }) => {
        return inMemoryRules.filter(
          (r) => r.storeId === where.storeId && r.isDeleted === where.isDeleted,
        );
      }),
      findFirst: jest.fn(async ({ where }) => {
        return (
          inMemoryRules.find((r) => {
            if (r.storeId !== where.storeId) return false;
            if (
              where.isDeleted !== undefined &&
              r.isDeleted !== where.isDeleted
            )
              return false;
            if (where.id && where.id !== r.id) return false;
            if (where.id?.not && where.id.not === r.id) return false;
            if (
              where.minMonthlyRevenue &&
              !r.minMonthlyRevenue.equals(where.minMonthlyRevenue)
            )
              return false;
            return true;
          }) || null
        );
      }),
      create: jest.fn(async ({ data }) => {
        const newRecord = {
          id: `rule-${inMemoryRules.length + 1}`,
          ...data,
          achievementBonus: data.achievementBonus || new Prisma.Decimal(0),
          isActive: data.isActive !== undefined ? data.isActive : true,
          createdAt: new Date(),
          updatedAt: new Date(),
          isDeleted: false,
          deletedAt: null,
        };
        inMemoryRules.push(newRecord);
        return newRecord;
      }),
      update: jest.fn(async ({ where, data }) => {
        const item = inMemoryRules.find((r) => r.id === where.id);
        if (item) {
          Object.assign(item, data, { updatedAt: new Date() });
          return item;
        }
        return null;
      }),
    },
    order: {
      findMany: jest.fn(async () => {
        return [
          {
            id: 'ord-1',
            finalAmount: new Prisma.Decimal(30000000),
            refundedAmount: new Prisma.Decimal(0),
            refunds: [],
            status: 'COMPLETED',
          },
          {
            id: 'ord-2',
            finalAmount: new Prisma.Decimal(25000000),
            refundedAmount: new Prisma.Decimal(0),
            refunds: [],
            status: 'COMPLETED',
          },
        ];
      }),
    },
    bonusAdjustment: {
      findMany: jest.fn(async () => []),
      updateMany: jest.fn(async () => ({ count: 0 })),
    },
    monthlyBonusResult: {
      findUnique: jest.fn(async ({ where }) => {
        const { storeId, collaboratorId, yearMonth } =
          where.storeId_collaboratorId_yearMonth || {};
        return (
          inMemoryBonusResults.find(
            (b) =>
              b.storeId === storeId &&
              b.collaboratorId === collaboratorId &&
              b.yearMonth === yearMonth,
          ) || null
        );
      }),
      findMany: jest.fn(async () => inMemoryBonusResults),
      create: jest.fn(async ({ data }) => {
        const newBonus = {
          id: `bonus-${inMemoryBonusResults.length + 1}`,
          ...data,
          settledAt: new Date(),
          createdAt: new Date(),
        };
        inMemoryBonusResults.push(newBonus);
        return newBonus;
      }),
    },
    auditLog: {
      create: jest.fn(async ({ data }) => {
        inMemoryAuditLogs.push(data);
        return data;
      }),
    },
    $executeRawUnsafe: jest.fn(),
    $transaction: jest.fn(async (cb) => cb(mockPrismaService)),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        AuthModule,
        CommissionRulesModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    authService = moduleRef.get<AuthService>(AuthService);
    jwtService = moduleRef.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Security: Should generate valid JWT on real login', async () => {
    const loginResult = await authService.login({
      email: 'owner@store.vn',
      password: 'Password@123',
    });

    expect(loginResult.accessToken).toBeDefined();
    expect(loginResult.user.email).toBe('owner@store.vn');
    expect(loginResult.user.role).toBe(UserRole.SHOP_MANAGER);

    const payload = jwtService.verify(loginResult.accessToken);
    expect(payload.sub).toBe(mockShopOwnerId);
  });

  it('2. Security: Should reject access with forged x-user-id header without valid JWT', async () => {
    const guard = app.get(
      require('../guards/store-owner.guard').StoreOwnerGuard,
    );

    const mockCtx = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'x-user-id': mockShopOwnerId }, // Hacker trying to spoof header
          params: { storeId: mockStoreId },
          method: 'GET',
        }),
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;

    await expect(guard.canActivate(mockCtx)).rejects.toThrow(
      'Yêu cầu xác thực tài khoản qua Bearer token',
    );
  });

  it('3. Security: Should forbid Shop Owner B from modifying Store A', async () => {
    const guard = app.get(
      require('../guards/store-owner.guard').StoreOwnerGuard,
    );

    const tokenB = jwtService.sign({
      sub: otherShopOwnerId,
      email: 'hacker@other.vn',
      role: UserRole.SHOP_MANAGER,
    });

    const mockCtx = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: `Bearer ${tokenB}` },
          params: { storeId: mockStoreId },
          method: 'POST',
        }),
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;

    await expect(guard.canActivate(mockCtx)).rejects.toThrow(
      'Bạn không có quyền quản lý cấu hình mốc thưởng của cửa hàng này',
    );
  });

  it('4. RBAC: SYSTEM_ADMIN can read (GET) but is forbidden to modify (POST/PATCH/DELETE)', async () => {
    const guard = app.get(
      require('../guards/store-owner.guard').StoreOwnerGuard,
    );

    const adminToken = jwtService.sign({
      sub: adminUserId,
      email: 'admin@scanms.vn',
      role: UserRole.SYSTEM_ADMIN,
    });

    // GET request -> Allowed
    const readCtx = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: `Bearer ${adminToken}` },
          params: { storeId: mockStoreId },
          method: 'GET',
        }),
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
    expect(await guard.canActivate(readCtx)).toBe(true);

    // POST request -> Forbidden
    const writeCtx = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: `Bearer ${adminToken}` },
          params: { storeId: mockStoreId },
          method: 'POST',
        }),
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
    await expect(guard.canActivate(writeCtx)).rejects.toThrow(
      'SYSTEM_ADMIN chỉ có quyền xem (Read-only)',
    );
  });

  it('5. Business Logic: Create rule -> Reject duplicate threshold in same shop', async () => {
    const service = app.get(
      require('../commission-rules.service').CommissionRulesService,
    );

    // Tạo mốc 50M -> KPI 500k, vượt 2%
    const rule1 = await service.create(
      mockStoreId,
      {
        name: 'Thưởng 50M',
        description: 'Mốc 50M đạt KPI',
        minMonthlyRevenue: '50000000',
        achievementBonus: '500000',
        bonusPercentage: '2.00',
        isActive: true,
      },
      mockShopOwnerId,
    );
    expect(rule1.name).toBe('Thưởng 50M');
    expect(rule1.achievementBonus).toBe('500000');
    expect(rule1.version).toBe(1);

    // Tạo mốc trùng 50M -> Phải báo lỗi ConflictException
    await expect(
      service.create(
        mockStoreId,
        {
          name: 'Thưởng 50M Trùng',
          minMonthlyRevenue: '50000000',
          achievementBonus: '600000',
          bonusPercentage: '2.50',
        },
        mockShopOwnerId,
      ),
    ).rejects.toThrow('Shop đã có mốc doanh số 50000000đ');
  });

  it('6. Validation: Reject empty update body {} and whitespace name', async () => {
    const service = app.get(
      require('../commission-rules.service').CommissionRulesService,
    );

    await expect(service.update(mockStoreId, 'rule-1', {})).rejects.toThrow(
      'Dữ liệu cập nhật không được để trống',
    );

    await expect(
      service.update(mockStoreId, 'rule-1', { name: '    ' }),
    ).rejects.toThrow(
      'Tên mốc thưởng không được để trống hoặc chỉ chứa khoảng trắng',
    );
  });

  it('7. Progressive Simulation (POST /preview): Verify brackets and total calculation', async () => {
    const service = app.get(
      require('../commission-rules.service').CommissionRulesService,
    );

    // Tạo thêm mốc 100M: KPI 1.5M, vượt 3%
    await service.create(
      mockStoreId,
      {
        name: 'Thưởng 100M',
        description: 'Mốc 100M đạt KPI',
        minMonthlyRevenue: '100000000',
        achievementBonus: '1500000',
        bonusPercentage: '3.00',
        isActive: true,
      },
      mockShopOwnerId,
    );

    // Giả lập doanh số 120M
    const previewResult = await service.previewBonus(mockStoreId, '120000000');

    expect(previewResult.highestReachedRule?.name).toBe('Thưởng 100M');
    expect(previewResult.achievementBonus).toBe('1500000.00');
    expect(previewResult.rangeBonuses).toHaveLength(2);
    // [50M-100M] 50M * 2% = 1.000.000đ
    expect(previewResult.rangeBonuses[0].bonus).toBe('1000000.00');
    // [100M-120M] 20M * 3% = 600.000đ
    expect(previewResult.rangeBonuses[1].bonus).toBe('600000.00');
    // Tổng thưởng = 1.5M + 1M + 600k = 3.100.000đ
    expect(previewResult.totalBonus).toBe('3100000.00');
  });

  it('8. Status Toggle: Deactivate milestone with updateStatus', async () => {
    const service = app.get(
      require('../commission-rules.service').CommissionRulesService,
    );

    const toggleResult = await service.updateStatus(
      mockStoreId,
      'rule-2',
      { isActive: false },
      mockShopOwnerId,
    );

    expect(toggleResult.isActive).toBe(false);
    expect(toggleResult.version).toBe(2);
    expect(toggleResult.message).toContain('tạm ngừng');

    // Sau khi tạm ngừng mốc 100M, mô phỏng 120M chỉ đạt mốc 50M
    const previewAfterPause = await service.previewBonus(
      mockStoreId,
      '120000000',
    );
    expect(previewAfterPause.highestReachedRule?.name).toBe('Thưởng 50M');
    expect(previewAfterPause.achievementBonus).toBe('500000.00');
    // Khoảng [50M-120M] = 70M * 2% = 1.400.000đ -> Tổng 1.900.000đ
    expect(previewAfterPause.totalBonus).toBe('1900000.00');

    // Kích hoạt lại mốc 100M
    await service.updateStatus(
      mockStoreId,
      'rule-2',
      { isActive: true },
      mockShopOwnerId,
    );
  });

  it('9. Full Workflow: Calculate Real Orders (55M) -> Settle Bonus (Idempotency check)', async () => {
    const service = app.get(
      require('../commission-rules.service').CommissionRulesService,
    );

    // Doanh số quét từ orders (30M + 25M = 55M)
    // Đạt mốc 50M: KPI = 500k, phần vượt = (55M - 50M) * 2% = 100k -> Tổng = 600,000đ
    const revenueCalc = await service.calculateValidMonthlyRevenue(
      mockStoreId,
      kolUserId,
      '2026-09',
    );
    expect(revenueCalc.validOrdersCount).toBe(2);
    expect(revenueCalc.validRevenue).toBe('55000000.00');

    // Chốt thưởng lần đầu
    const settle1 = await service.settleMonthlyBonus(
      mockStoreId,
      kolUserId,
      '2026-09',
      mockShopOwnerId,
      undefined,
      true,
    );

    expect(settle1.isAlreadySettled).toBe(false);
    expect(settle1.settlement.bonusAmount).toBe('600000');
    expect(settle1.settlement.appliedRuleName).toBe('Thưởng 50M');
    expect(settle1.settlement.ruleSnapshot).toBeDefined();

    // Chốt thưởng lần hai (Chạy lại / Re-run) -> Phải Idempotent, không tạo thêm bản ghi hay tính lại
    const settle2 = await service.settleMonthlyBonus(
      mockStoreId,
      kolUserId,
      '2026-09',
      mockShopOwnerId,
      undefined,
      true,
    );

    expect(settle2.isAlreadySettled).toBe(true);
    expect(settle2.message).toContain('đã được chốt thưởng trước đó');
    expect(settle2.settlement.id).toBe(settle1.settlement.id);
    expect(inMemoryBonusResults).toHaveLength(1); // Chỉ duy nhất 1 bản ghi
  });
});
