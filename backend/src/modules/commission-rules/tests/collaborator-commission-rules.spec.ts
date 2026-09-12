import { Test, TestingModule } from '@nestjs/testing';
import { CollaboratorCommissionRulesController } from '../collaborator-commission-rules.controller';
import { CommissionRulesService } from '../commission-rules.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../../core/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('CollaboratorCommissionRulesController', () => {
  let controller: CollaboratorCommissionRulesController;
  let service: CommissionRulesService;

  const mockKolId = '77777777-7777-7777-7777-777777777777';
  const mockStoreId = '88888888-8888-8888-8888-888888888888';

  const mockService = {
    getKolProgress: jest.fn(),
    getKolSettlementHistory: jest.fn(),
    getCollaboratorStores: jest.fn(),
  };

  const mockReq = {
    user: {
      id: mockKolId,
      email: 'kol@scanms.vn',
      role: 'COLLABORATOR',
    },
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CollaboratorCommissionRulesController],
      providers: [
        {
          provide: CommissionRulesService,
          useValue: mockService,
        },
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: JwtService,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: {},
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CollaboratorCommissionRulesController>(
      CollaboratorCommissionRulesController,
    );
    service = module.get<CommissionRulesService>(CommissionRulesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMyBonusProgress', () => {
    it('should extract collaboratorId strictly from JWT req.user.id and call service.getKolProgress', async () => {
      const mockResult = {
        storeId: mockStoreId,
        collaboratorId: mockKolId,
        yearMonth: '2026-09',
        validRevenue: '60000000.00',
        settlementStatus: 'ACCUMULATING',
        milestones: [],
      };
      mockService.getKolProgress.mockResolvedValueOnce(mockResult);

      const result = await controller.getMyBonusProgress(
        mockStoreId,
        mockReq,
        '2026-09',
      );

      expect(result).toEqual(mockResult);
      expect(mockService.getKolProgress).toHaveBeenCalledWith(
        mockStoreId,
        mockKolId,
        '2026-09',
      );
    });
  });

  describe('getMyBonusHistory', () => {
    it('should extract collaboratorId strictly from JWT req.user.id and call service.getKolSettlementHistory', async () => {
      const mockHistory = [
        {
          id: 'settlement-1',
          storeId: mockStoreId,
          collaboratorId: mockKolId,
          yearMonth: '2026-08',
          status: 'PAID',
          bonusAmount: '700000.00',
        },
      ];
      mockService.getKolSettlementHistory.mockResolvedValueOnce(mockHistory);

      const result = await controller.getMyBonusHistory(
        mockReq,
        mockStoreId,
        '2026-08',
      );

      expect(result).toEqual(mockHistory);
      expect(mockService.getKolSettlementHistory).toHaveBeenCalledWith(
        mockKolId,
        mockStoreId,
        '2026-08',
      );
    });
  });

  describe('getCollaboratorStores', () => {
    it('should call service.getCollaboratorStores with req.user.id and isDiscovery false by default', async () => {
      const mockStores = [
        { id: mockStoreId, name: 'TechStore Flagship', activeRulesCount: 3 },
      ];
      mockService.getCollaboratorStores.mockResolvedValueOnce(mockStores);

      const result = await controller.getCollaboratorStores(mockReq);

      expect(result).toEqual(mockStores);
      expect(mockService.getCollaboratorStores).toHaveBeenCalledWith(
        mockKolId,
        false,
      );
    });

    it('should pass isDiscovery true when query discovery is set to true', async () => {
      const mockStores = [
        { id: mockStoreId, name: 'TechStore Flagship', activeRulesCount: 3 },
      ];
      mockService.getCollaboratorStores.mockResolvedValueOnce(mockStores);

      const result = await controller.getCollaboratorStores(mockReq, 'true');

      expect(result).toEqual(mockStores);
      expect(mockService.getCollaboratorStores).toHaveBeenCalledWith(
        mockKolId,
        true,
      );
    });

    it('should reject if user role is not COLLABORATOR', async () => {
      const invalidReq = {
        user: { id: mockKolId, role: 'SHOP_MANAGER' },
      } as any;

      await expect(
        controller.getCollaboratorStores(invalidReq),
      ).rejects.toThrow();
    });
  });
});
