import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { JwtService } from '../jwt.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let authService: AuthService;
  let jwtService: JwtService;

  const mockUser = {
    id: 'user-1',
    email: 'shop@techstore.vn',
    passwordHash: bcrypt.hashSync('Password@123', 10),
    fullName: 'Shop Owner Test',
    role: 'SHOP_MANAGER',
    isActive: true,
    isDeleted: false,
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should login successfully with correct credentials and return accessToken', async () => {
    mockPrismaService.user.findUnique.mockResolvedValueOnce(mockUser);

    const result = await authService.login({
      email: 'shop@techstore.vn',
      password: 'Password@123',
    });

    expect(result.accessToken).toBe('mock-jwt-token');
    expect(result.user.email).toBe('shop@techstore.vn');
    expect(mockJwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 'user-1',
        email: 'shop@techstore.vn',
        role: 'SHOP_MANAGER',
      }),
    );
  });

  it('should throw UnauthorizedException for wrong password', async () => {
    mockPrismaService.user.findUnique.mockResolvedValueOnce(mockUser);

    await expect(
      authService.login({
        email: 'shop@techstore.vn',
        password: 'WrongPassword',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException for non-existent email', async () => {
    mockPrismaService.user.findUnique.mockResolvedValueOnce(null);

    await expect(
      authService.login({
        email: 'notfound@test.vn',
        password: 'Password@123',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw ForbiddenException for deactivated user', async () => {
    mockPrismaService.user.findUnique.mockResolvedValueOnce({
      ...mockUser,
      isActive: false,
    });

    await expect(
      authService.login({
        email: 'shop@techstore.vn',
        password: 'Password@123',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should return user info from getMe for valid active user', async () => {
    mockPrismaService.user.findUnique.mockResolvedValueOnce(mockUser);

    const result = await authService.getMe('user-1');
    expect(result.id).toBe('user-1');
    expect(result.role).toBe('SHOP_MANAGER');
    expect(result.email).toBe('shop@techstore.vn');
  });

  it('should throw UnauthorizedException from getMe if user is inactive or deleted', async () => {
    mockPrismaService.user.findUnique.mockResolvedValueOnce({
      ...mockUser,
      isActive: false,
    });

    await expect(authService.getMe('user-1')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
