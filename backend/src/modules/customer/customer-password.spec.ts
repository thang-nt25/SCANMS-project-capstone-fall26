import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../auth/auth.service';
import { CustomerService } from './customer.service';
import { PrismaService } from '../../core/database/prisma.service';

describe('Customer password algorithm compatibility', () => {
  const currentPassword = 'CurrentPassword2026!';
  const newPassword = 'ReplacementPassword2026!';
  let hashes: string[];

  beforeAll(async () => {
    hashes = [
      await argon2.hash(currentPassword, { type: argon2.argon2id }),
      await bcrypt.hash(currentPassword, 10),
    ];
  });

  function setup(hash: string) {
    const prisma = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'customer', passwordHash: hash }),
        update: jest.fn().mockResolvedValue({ id: 'customer' }),
      },
    };
    const authService = new AuthService(
      prisma as unknown as PrismaService,
      {} as JwtService,
    );
    const service = Object.assign(Object.create(CustomerService.prototype), {
      prisma,
      authService,
      securityOtpCache: new Map(),
    }) as CustomerService;
    return { service, authService, prisma };
  }

  it.each([0, 1])(
    'changes the password for algorithm index %i',
    async (index) => {
      const { service, authService, prisma } = setup(hashes[index]);
      await service.changePassword('customer', {
        currentPassword,
        newPassword,
      });
      const stored = prisma.user.update.mock.calls[0][0].data
        .passwordHash as string;
      expect(stored.startsWith('$argon2id$')).toBe(true);
      expect(await authService.verifyPassword(newPassword, stored)).toBe(true);
      expect(await authService.verifyPassword(currentPassword, stored)).toBe(
        false,
      );
    },
  );

  it('rejects a wrong current password without updating the account', async () => {
    const { service, prisma } = setup(hashes[0]);
    await expect(
      service.changePassword('customer', {
        currentPassword: 'incorrect',
        newPassword,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('fails closed for a malformed stored hash', async () => {
    const { authService } = setup('');
    await expect(
      authService.verifyPassword(currentPassword, '$argon2id$invalid'),
    ).resolves.toBe(false);
    await expect(
      authService.verifyPassword(currentPassword, 'invalid'),
    ).resolves.toBe(false);
  });

  it('uses the same hash policy for OTP password changes and consumes the OTP after save', async () => {
    const { service, prisma, authService } = setup(hashes[0]);
    Object.assign(service, {
      securityOtpCache: new Map([
        ['customer', { code: '123789', expiresAt: Date.now() + 60000 }],
      ]),
    });
    await service.setPasswordWithOtp('customer', {
      otp: '123789',
      newPassword,
    });
    const stored = prisma.user.update.mock.calls[0][0].data
      .passwordHash as string;
    expect(await authService.verifyPassword(newPassword, stored)).toBe(true);
    await expect(
      service.setPasswordWithOtp('customer', { otp: '123789', newPassword }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not claim success if saving the new password fails', async () => {
    const { service, prisma } = setup(hashes[0]);
    prisma.user.update.mockRejectedValue(new Error('save failed'));
    await expect(
      service.changePassword('customer', { currentPassword, newPassword }),
    ).rejects.toThrow('save failed');
  });
});
