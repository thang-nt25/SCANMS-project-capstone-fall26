import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../core/database/prisma.service';
import {
  UnauthorizedException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { MailService } from '../mail.service';
import { UserRole } from '@prisma/client';

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
      create: jest.fn(),
    },
    store: {
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    verify: jest.fn(),
  };
  const mockMailService = {
    sendLoginSecurityAlert: jest.fn().mockResolvedValue(undefined),
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
        {
          provide: MailService,
          useValue: mockMailService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs in with a Google access token verified by Google userinfo', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ email: mockUser.email, email_verified: true }),
    } as Response);
    mockPrismaService.user.findUnique.mockResolvedValueOnce(mockUser);

    const result = await authService.googleLogin({ idToken: 'ya29.valid' });

    expect(result.accessToken).toBe('mock-jwt-token');
    expect(result.user.email).toBe(mockUser.email);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      expect.objectContaining({
        headers: { Authorization: 'Bearer ya29.valid' },
      }),
    );
  });

  it('returns 503 when the backend cannot reach Google', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockRejectedValue(new TypeError('fetch failed'));

    await expect(
      authService.googleLogin({ idToken: 'ya29.valid' }),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it.each(['COLLABORATOR', 'SHOP_MANAGER', 'SYSTEM_ADMIN'])('creates a new Google user as CUSTOMER even when login submits %s', async role => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, status: 200, json: async () => ({ email: 'new-google@example.test', email_verified: true, name: 'Buyer' }) } as Response);
    jest.spyOn(authService as any, 'hashPassword').mockResolvedValue('test-hash');
    mockPrismaService.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ ...mockUser, id: 'new-user', email: 'new-google@example.test', role: 'CUSTOMER' });
    mockPrismaService.user.create.mockResolvedValueOnce({ id: 'new-user' });
    const result = await authService.googleLogin({ idToken: 'ya29.valid', role });
    expect(mockPrismaService.user.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ role: UserRole.CUSTOMER }) }));
    expect(result.user.role).toBe('CUSTOMER');
    expect(mockPrismaService.store.create).not.toHaveBeenCalled();
  });

  it('keeps an existing customer role when the Google login screen submits KOC', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, status: 200, json: async () => ({ email: mockUser.email, email_verified: true }) } as Response);
    mockPrismaService.user.findUnique.mockResolvedValueOnce({ ...mockUser, role: 'CUSTOMER' });
    const result = await authService.googleLogin({ idToken: 'ya29.valid', role: 'COLLABORATOR' });
    expect(result.user.role).toBe('CUSTOMER');
    expect(mockPrismaService.user.create).not.toHaveBeenCalled();
  });

  it('returns 401 only when Google rejects the access token', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
    } as Response);

    await expect(
      authService.googleLogin({ idToken: 'ya29.expired' }),
    ).rejects.toThrow(UnauthorizedException);
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

  it('returns the login response without waiting for the security email', async () => {
    mockPrismaService.user.findUnique.mockResolvedValueOnce(mockUser);
    mockMailService.sendLoginSecurityAlert.mockImplementationOnce(
      () => new Promise<void>(() => undefined),
    );

    const result = await authService.login({
      email: 'shop@techstore.vn',
      password: 'Password@123',
    });

    expect(result.accessToken).toBe('mock-jwt-token');
    expect(result.securityAlertQueued).toBe(true);
    expect(mockMailService.sendLoginSecurityAlert).toHaveBeenCalledTimes(1);
  });

  it('registers a customer without issuing a login token', async () => {
    Object.assign(authService, {
      otpCache: new Map([
        ['new@example.com', { code: '123456', expiresAt: Date.now() + 60000 }],
      ]),
    });
    mockPrismaService.user.findUnique.mockResolvedValueOnce(null);
    mockPrismaService.user.create.mockResolvedValueOnce({
      id: 'new-customer',
      email: 'new@example.com',
      fullName: 'New Customer',
      role: UserRole.CUSTOMER,
    });

    const result = await authService.register({
      email: 'new@example.com',
      password: 'Password@123',
      fullName: 'New Customer',
      role: UserRole.CUSTOMER,
      otp: '123456',
    });

    expect(result.user.email).toBe('new@example.com');
    expect(result).not.toHaveProperty('accessToken');
    expect(mockJwtService.sign).not.toHaveBeenCalled();
  });

  it('keeps a new Shop applicant as a customer until KYC approval', async () => {
    Object.assign(authService, {
      otpCache: new Map([
        [
          'new-shop@example.vn',
          { code: '123456', expiresAt: Date.now() + 60000 },
        ],
      ]),
    });
    mockPrismaService.user.findUnique.mockResolvedValueOnce(null);
    mockPrismaService.user.create.mockResolvedValueOnce({
      id: 'new-shop-owner',
      email: 'new-shop@example.vn',
      fullName: 'New Shop Owner',
      role: UserRole.CUSTOMER,
    });
    mockPrismaService.store.create.mockResolvedValueOnce({
      id: 'draft-store',
      onboardingStatus: 'DRAFT',
    });

    const result = await authService.register({
      email: 'new-shop@example.vn',
      password: 'Password@123',
      fullName: 'New Shop Owner',
      role: UserRole.SHOP_MANAGER,
      storeName: 'New Shop',
      logoUrl: 'https://cdn.scanms.vn/shop-logo.jpg',
      otp: '123456',
    });

    expect(result.user.role).toBe(UserRole.CUSTOMER);
    expect(mockPrismaService.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: UserRole.CUSTOMER }),
      }),
    );
    expect(mockPrismaService.store.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isVerified: false,
          isActive: false,
          onboardingStatus: 'DRAFT',
        }),
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

  it.each(['customer@scanms.vn', 'manager@scanms.vn'])(
    'never creates the missing demo account %s during login',
    async (email) => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      await expect(
        authService.login({ email, password: 'irrelevant' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    },
  );

  it.each(['customer@scanms.vn', 'manager@scanms.vn'])(
    'never creates the missing demo account %s during Passport validation',
    async (email) => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      await expect(
        authService.validateUser(email, 'irrelevant'),
      ).resolves.toBeNull();
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    },
  );

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
