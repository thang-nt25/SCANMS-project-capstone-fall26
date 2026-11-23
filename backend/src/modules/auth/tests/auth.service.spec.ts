import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../core/database/prisma.service';
import {
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { MailService } from '../mail.service';
import { UserRole } from '@prisma/client';
import { LoginTicket } from 'google-auth-library';

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
    $transaction: jest.fn((callback: (tx: any) => Promise<unknown>) => callback(mockPrismaService)),
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
    mockPrismaService.user.findUnique.mockResolvedValueOnce(null);
    mockPrismaService.user.create.mockResolvedValueOnce({ ...mockUser, id: 'new-user', email: 'new-google@example.test', role: 'CUSTOMER' });
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

  describe('native Google ID token', () => {
    const idToken = 'header.payload.signature';
    const expectedAudience = 'scanms-test.apps.googleusercontent.com';
    const email = 'mobile-user@gmail.com';
    let previousAudience: string | undefined;

    beforeEach(() => {
      previousAudience = process.env.GOOGLE_CLIENT_ID;
      process.env.GOOGLE_CLIENT_ID = expectedAudience;
    });

    afterEach(() => {
      if (previousAudience === undefined) delete process.env.GOOGLE_CLIENT_ID;
      else process.env.GOOGLE_CLIENT_ID = previousAudience;
    });

    const verifiedGoogle = (emailAddress = email, verified = true) =>
      jest.spyOn((authService as any).googleOAuthClient, 'verifyIdToken')
        .mockImplementation(async () => new LoginTicket(undefined, {
          iss: 'https://accounts.google.com',
          sub: 'google-subject',
          aud: expectedAudience,
          iat: 1,
          exp: 2,
          email: emailAddress,
          email_verified: verified,
          name: 'Mobile Buyer',
        }));

    it('opens the existing account with its original ID and role', async () => {
      const verify = verifiedGoogle(' MOBILE-USER@GMAIL.COM ');
      mockPrismaService.user.findUnique.mockResolvedValueOnce({ ...mockUser, email });

      const result = await authService.googleLogin({ idToken, intent: 'login' });

      expect(verify).toHaveBeenCalledWith({ idToken, audience: expectedAudience });
      expect(result.user).toMatchObject({ id: mockUser.id, email, role: mockUser.role });
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });

    it('creates a customer from Google signup and signs into that same user next time', async () => {
      verifiedGoogle();
      jest.spyOn(authService as any, 'hashPassword').mockResolvedValue('test-hash');
      const customer = { ...mockUser, id: 'mobile-customer', email, role: UserRole.CUSTOMER };
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(customer);
      mockPrismaService.user.create.mockResolvedValueOnce(customer);

      const signup = await authService.googleLogin({ idToken, intent: 'register' });
      const login = await authService.googleLogin({ idToken, intent: 'login' });

      expect(signup.user.id).toBe('mobile-customer');
      expect(login.user.id).toBe(signup.user.id);
      expect(mockPrismaService.user.create).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ email, role: UserRole.CUSTOMER }),
      }));
    });

    it('asks unregistered Google users to use the registration screen', async () => {
      verifiedGoogle();
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null);

      await expect(authService.googleLogin({ idToken, intent: 'login' })).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });

    it.each([[email, false], ['external@example.test', true]])(
      'does not open accounts when Google cannot prove current email ownership (%s)',
      async (emailAddress, verified) => {
        verifiedGoogle(emailAddress, verified);
        await expect(authService.googleLogin({ idToken, intent: 'login' })).rejects.toThrow();
        expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled();
      },
    );

    it('rejects opaque access tokens submitted by the mobile flow', async () => {
      const fetch = jest.spyOn(global, 'fetch');
      await expect(authService.googleLogin({ idToken: 'ya29.token', intent: 'login' })).rejects.toThrow(UnauthorizedException);
      expect(fetch).not.toHaveBeenCalled();
    });
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

  it('rejects public shop registration without creating a user or store', async () => {
    Object.assign(authService, {
      otpCache: new Map([
        [
          'new-shop@example.vn',
          { code: '123456', expiresAt: Date.now() + 60000 },
        ],
      ]),
    });
    await expect(authService.register({
      email: 'new-shop@example.vn',
      password: 'Password@123',
      fullName: 'New Shop Owner',
      role: UserRole.SHOP_MANAGER,
      otp: '123456',
    })).rejects.toThrow();
    expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    expect(mockPrismaService.store.create).not.toHaveBeenCalled();
  });

  it('keeps OTP and does not create a KOL account when the required avatar is missing', async () => {
    const otpCache = new Map([
      ['new-kol@example.vn', { code: '123456', expiresAt: Date.now() + 60000 }],
    ]);
    Object.assign(authService, { otpCache });
    mockPrismaService.user.findUnique.mockResolvedValueOnce(null);
    await expect(authService.register({
      email: 'new-kol@example.vn', password: 'Password@123',
      fullName: 'New KOL', role: UserRole.COLLABORATOR, otp: '123456',
    })).rejects.toThrow();
    expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    expect(otpCache.has('new-kol@example.vn')).toBe(true);
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

  it('preserves the assigned Shop when a manager owns no stores', async () => {
    mockPrismaService.user.findUnique.mockResolvedValueOnce({ ...mockUser, storeId: 'assigned-shop', stores: [] });
    expect((await authService.getMe('user-1')).storeId).toBe('assigned-shop');
  });

  it('keeps owner fallback and removes a revoked assignment from profile refresh', async () => {
    mockPrismaService.user.findUnique.mockResolvedValueOnce({ ...mockUser, storeId: null, stores: [{ id: 'owned-shop' }] });
    expect((await authService.getMe('user-1')).storeId).toBe('owned-shop');
    mockPrismaService.user.findUnique.mockResolvedValueOnce({ ...mockUser, storeId: null, stores: [] });
    expect((await authService.getMe('user-1')).storeId).toBeNull();
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
