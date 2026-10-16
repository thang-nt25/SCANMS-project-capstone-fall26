import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { AuthService } from '../auth.service';
import { MailService } from '../mail.service';
import { PrismaService } from '../../../core/database/prisma.service';

describe('OTP authentication has no fixed-code bypass', () => {
  const email = 'customer@example.test';
  function setup(code?: string, expiresAt = Date.now() + 60000) {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'customer',
          email,
          isActive: true,
          isDeleted: false,
        }),
        update: jest.fn().mockResolvedValue({ id: 'customer' }),
        create: jest.fn(),
      },
    };
    const mail = {
      sendRegistrationOtp: jest.fn(),
      sendForgotPasswordOtp: jest.fn(),
    };
    const service = new AuthService(
      prisma as unknown as PrismaService,
      {} as JwtService,
      mail as unknown as MailService,
    );
    const cache = new Map(
      code ? [[`reset_${email}`, { code, expiresAt }]] : [],
    );
    Object.assign(service, { otpCache: cache });
    return { service, prisma, mail, cache };
  }

  it.each(['development', 'production'])(
    'rejects 123456 without issuance in %s',
    async (environment) => {
      const { service, prisma } = setup();
      const original = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = environment;
        await expect(
          service.verifyResetOtp({ email, otp: '123456' }),
        ).rejects.toBeInstanceOf(BadRequestException);
        await expect(
          service.resetPassword({
            email,
            otp: '123456',
            newPassword: 'Changed2026!',
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
        await expect(
          service.register({
            email,
            otp: '123456',
            password: 'Changed2026!',
            fullName: 'Test Customer',
            role: UserRole.CUSTOMER,
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(prisma.user.create).not.toHaveBeenCalled();
        expect(prisma.user.update).not.toHaveBeenCalled();
        expect(prisma.user.findUnique).not.toHaveBeenCalled();
      } finally {
        if (original === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = original;
      }
    },
  );

  it('rejects an expired OTP before accessing account data', async () => {
    const { service, prisma } = setup('654321', Date.now() - 1);
    await expect(
      service.resetPassword({
        email,
        otp: '654321',
        newPassword: 'Changed2026!',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('invalidates the OTP after five failed guesses', async () => {
    const { service } = setup('654321');
    for (let attempt = 0; attempt < 5; attempt++) {
      await expect(
        service.verifyResetOtp({ email, otp: '111111' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    await expect(
      service.verifyResetOtp({ email, otp: '654321' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows 123456 only when actually issued, then rejects reuse', async () => {
    const { service, prisma } = setup('123456');
    await service.verifyResetOtp({ email, otp: '123456' });
    await service.resetPassword({
      email,
      otp: '123456',
      newPassword: 'Changed2026!',
    });
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
    await expect(
      service.resetPassword({
        email,
        otp: '123456',
        newPassword: 'Another2026!',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows only one concurrent reset per OTP', async () => {
    const { service, prisma } = setup('654321');
    const results = await Promise.allSettled(
      [1, 2].map(() =>
        service.resetPassword({
          email,
          otp: '654321',
          newPassword: 'Changed2026!',
        }),
      ),
    );
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
  });

  it('does not restore a claimed OTP if the database write fails', async () => {
    const { service, prisma } = setup('654321');
    prisma.user.update.mockRejectedValue(new Error('write failed'));
    await expect(
      service.resetPassword({
        email,
        otp: '654321',
        newPassword: 'Changed2026!',
      }),
    ).rejects.toThrow('write failed');
    await expect(
      service.verifyResetOtp({ email, otp: '654321' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not reset a disabled account', async () => {
    const { service, prisma } = setup('654321');
    prisma.user.findUnique.mockResolvedValue({
      id: 'customer',
      email,
      isActive: false,
      isDeleted: false,
    });
    await expect(
      service.resetPassword({
        email,
        otp: '654321',
        newPassword: 'Changed2026!',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('does not expose registration/reset OTPs in HTTP responses, even in development', async () => {
    const { service, prisma, mail } = setup();
    prisma.user.findUnique.mockResolvedValueOnce(null);
    const registration = await service.sendRegistrationOtp({ email });
    const reset = await service.sendForgotPasswordOtp({ email });
    expect(registration).not.toHaveProperty('debugOtp');
    expect(reset).not.toHaveProperty('debugOtp');
    expect(mail.sendRegistrationOtp).toHaveBeenCalledWith(
      email,
      expect.stringMatching(/^\d{6}$/),
    );
    expect(mail.sendForgotPasswordOtp).toHaveBeenCalledWith(
      email,
      expect.stringMatching(/^\d{6}$/),
    );
  });

  it.each([UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER])(
    'refuses privileged public registration with role %s even with a real OTP',
    async (role) => {
      const { service, prisma, cache } = setup();
      cache.set(email, { code: '654321', expiresAt: Date.now() + 60000 });
      await expect(
        service.register({
          email,
          otp: '654321',
          password: 'Changed2026!',
          fullName: 'Test User',
          role,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    },
  );
});
