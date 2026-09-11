import { Test, TestingModule } from '@nestjs/testing';
import { StoreOwnerGuard } from '../guards/store-owner.guard';
import { PrismaService } from '../../../core/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

describe('StoreOwnerGuard', () => {
  let guard: StoreOwnerGuard;
  let prisma: PrismaService;

  const mockStoreId = '11111111-1111-1111-1111-111111111111';
  const mockOwnerId = '22222222-2222-2222-2222-222222222222';
  const otherUserId = '33333333-3333-3333-3333-333333333333';

  const mockStore = {
    id: mockStoreId,
    ownerId: mockOwnerId,
    name: 'TechStore',
    isDeleted: false,
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    store: {
      findUnique: jest.fn(),
    },
  };

  const mockJwtService = {
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-secret'),
  };

  const createMockContext = (request: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          ...request,
        }),
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreOwnerGuard,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    guard = module.get<StoreOwnerGuard>(StoreOwnerGuard);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should throw UnauthorizedException if no user and no authorization header', async () => {
    const ctx = createMockContext({
      headers: {},
      params: { storeId: mockStoreId },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if authorization header format is not Bearer <token>', async () => {
    const ctx = createMockContext({
      headers: { authorization: 'Basic 123456' },
      params: { storeId: mockStoreId },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should extract user from valid Bearer token', async () => {
    mockJwtService.verify.mockReturnValueOnce({ sub: mockOwnerId });
    mockPrismaService.user.findUnique.mockResolvedValueOnce({
      id: mockOwnerId,
      role: UserRole.SHOP_MANAGER,
      isActive: true,
      isDeleted: false,
    });
    mockPrismaService.store.findUnique.mockResolvedValueOnce(mockStore);

    const ctx = createMockContext({
      headers: { authorization: 'Bearer valid-jwt-token' },
      params: { storeId: mockStoreId },
    });

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('should throw ForbiddenException if user is deactivated or soft-deleted', async () => {
    const ctx = createMockContext({
      user: {
        id: mockOwnerId,
        role: UserRole.SHOP_MANAGER,
        isActive: false,
        isDeleted: false,
      },
      headers: {},
      params: { storeId: mockStoreId },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should throw NotFoundException if store does not exist', async () => {
    mockPrismaService.store.findUnique.mockResolvedValueOnce(null);

    const ctx = createMockContext({
      user: {
        id: mockOwnerId,
        role: UserRole.SHOP_MANAGER,
        isActive: true,
        isDeleted: false,
      },
      headers: {},
      params: { storeId: mockStoreId },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(NotFoundException);
  });

  it('should throw ForbiddenException if role is COLLABORATOR', async () => {
    mockPrismaService.store.findUnique.mockResolvedValueOnce(mockStore);

    const ctx = createMockContext({
      user: {
        id: otherUserId,
        role: UserRole.COLLABORATOR,
        isActive: true,
        isDeleted: false,
      },
      headers: {},
      params: { storeId: mockStoreId },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException if SHOP_MANAGER does not own this store', async () => {
    mockPrismaService.store.findUnique.mockResolvedValueOnce(mockStore);

    const ctx = createMockContext({
      user: {
        id: otherUserId,
        role: UserRole.SHOP_MANAGER,
        isActive: true,
        isDeleted: false,
      },
      headers: {},
      params: { storeId: mockStoreId },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should allow access if user is the store owner (SHOP_MANAGER)', async () => {
    mockPrismaService.store.findUnique.mockResolvedValueOnce(mockStore);

    const ctx = createMockContext({
      user: {
        id: mockOwnerId,
        role: UserRole.SHOP_MANAGER,
        isActive: true,
        isDeleted: false,
      },
      headers: {},
      params: { storeId: mockStoreId },
    });

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('should allow SYSTEM_ADMIN on GET requests (Read-only)', async () => {
    mockPrismaService.store.findUnique.mockResolvedValueOnce(mockStore);

    const ctx = createMockContext({
      method: 'GET',
      user: {
        id: otherUserId,
        role: UserRole.SYSTEM_ADMIN,
        isActive: true,
        isDeleted: false,
      },
      headers: {},
      params: { storeId: mockStoreId },
    });

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('should FORBID SYSTEM_ADMIN on POST/PATCH/DELETE requests', async () => {
    mockPrismaService.store.findUnique.mockResolvedValueOnce(mockStore);

    const ctx = createMockContext({
      method: 'POST',
      user: {
        id: otherUserId,
        role: UserRole.SYSTEM_ADMIN,
        isActive: true,
        isDeleted: false,
      },
      headers: {},
      params: { storeId: mockStoreId },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });
});
