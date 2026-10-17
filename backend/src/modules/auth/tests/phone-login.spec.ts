import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth.service';
import { MailService } from '../mail.service';
import { PrismaService } from '../../../core/database/prisma.service';

describe('Password login by registered phone', () => {
  const user = {
    id: 'customer-id',
    email: 'customer@example.test',
    phoneNumber: '0901234567',
    passwordHash: 'existing-hash',
    isActive: true,
    isDeleted: false,
    fullName: 'Phone Customer',
    role: 'CUSTOMER',
  };

  function setup(matches = [{ id: user.id }]) {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue(matches),
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
        update: jest.fn(),
        create: jest.fn(),
      },
    };
    const jwt = { sign: jest.fn().mockReturnValue('signed-token') };
    const mail = {
      sendLoginSecurityAlert: jest.fn().mockResolvedValue(undefined),
    };
    const service = new AuthService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
      mail as unknown as MailService,
    );
    const verify = jest
      .spyOn(service, 'verifyPassword')
      .mockResolvedValue(true);
    jest.spyOn(service, 'hashPassword').mockResolvedValue('$argon2id$new');
    return { service, prisma, jwt, mail, verify };
  }

  it('resolves the unique phone owner and signs the actual account ID/role', async () => {
    const { service, prisma, jwt, mail } = setup();
    const result = await service.login({
      identifier: '+84 901 234 567',
      password: 'Current2026!',
    });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: user.id } }),
    );
    expect(jwt.sign).toHaveBeenCalledWith({
      sub: user.id,
      email: user.email,
      role: 'CUSTOMER',
    });
    expect(mail.sendLoginSecurityAlert).toHaveBeenCalledWith(
      user.email,
      user.fullName,
      expect.any(Object),
    );
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('keeps old email clients working without querying phones', async () => {
    const { service, prisma } = setup();
    await service.login({
      email: 'CUSTOMER@example.test',
      password: 'Current2026!',
    });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: user.email } }),
    );
  });

  it.each([{ matches: [] }, { matches: [{ id: 'first' }, { id: 'second' }] }])(
    'fails closed if the phone has zero or multiple owners ($matches)',
    async ({ matches }) => {
      const { service, prisma, verify, jwt } = setup(matches);
      await expect(
        service.login({ identifier: '0901234567', password: 'Current2026!' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(verify).not.toHaveBeenCalled();
      expect(jwt.sign).not.toHaveBeenCalled();
    },
  );

  it('does not issue a token for a wrong password', async () => {
    const { service, verify, jwt } = setup();
    verify.mockResolvedValue(false);
    await expect(
      service.login({ identifier: '0901234567', password: 'Wrong2026!' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it('honors inactive-account restrictions for phone login', async () => {
    const { service, prisma, verify, jwt } = setup();
    prisma.user.findUnique.mockResolvedValue({ ...user, isActive: false });
    await expect(
      service.login({ identifier: '0901234567', password: 'Current2026!' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(verify).not.toHaveBeenCalled();
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it('rejects invalid/conflicting fields for non-HTTP callers too', async () => {
    const { service, prisma } = setup();
    await expect(
      service.login({
        identifier: '0901234567',
        email: user.email,
        password: 'Current2026!',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('uses the same unique phone resolution for Passport validation', async () => {
    const { service, prisma } = setup();
    await expect(
      service.validateUser('+84901234567', 'Current2026!'),
    ).resolves.toMatchObject({ id: user.id });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });
});
