import { CustomerService } from './customer.service';

function setup(email = 'owner@example.com', role = 'COLLABORATOR') {
  const user = {
    id: 'actor',
    email,
    fullName: 'Test actor',
    role,
    isActive: true,
    isDeleted: false,
  };
  const prisma = {
    user: {
      findUnique: jest
        .fn()
        .mockImplementation(async ({ where }) =>
          where.id === 'actor' ? user : null,
        ),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const mailService = {
    sendPasswordSecurityOtp: jest.fn().mockResolvedValue(undefined),
  };
  const authService = {
    hashPassword: jest.fn().mockResolvedValue('hashed-password'),
  };
  const service = Object.assign(Object.create(CustomerService.prototype), {
    prisma,
    mailService,
    authService,
    securityOtpCache: new Map(),
  }) as CustomerService;
  const send = (newEmail?: string) =>
    service.sendPasswordSecurityOtp('actor', {}, newEmail);
  const code = () =>
    mailService.sendPasswordSecurityOtp.mock.calls.at(-1)![2] as string;
  const reset = (otp = code()) =>
    service.setPasswordWithOtp('actor', {
      otp,
      newPassword: 'NewPassword123!',
    });
  return { user, prisma, mailService, service, send, code, reset };
}

describe('Authenticated password recovery by email', () => {
  it.each([
    'CUSTOMER',
    'COLLABORATOR',
    'SHOP_MANAGER',
    'SYSTEM_MANAGER',
    'SYSTEM_ADMIN',
  ])('allows %s to reset only its authenticated account', async (role) => {
    const s = setup('owner@example.com', role);
    const result = await s.send();
    expect(s.code()).toMatch(/^\d{6}$/);
    expect(result).not.toHaveProperty('otp');
    expect(s.mailService.sendPasswordSecurityOtp.mock.calls[0][0]).toBe(
      'owner@example.com',
    );
    await s.service.verifyPasswordSecurityOtp('actor', s.code());
    await s.reset();
    expect(s.prisma.user.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'actor',
        email: 'owner@example.com',
        isActive: true,
        isDeleted: false,
      },
      data: { passwordHash: 'hashed-password' },
    });
    await expect(s.reset()).rejects.toThrow();
  });

  it('does not let a supplied email replace an existing recovery address', async () => {
    const s = setup();
    await expect(s.send('other@example.com')).rejects.toThrow(
      'email đã đăng ký',
    );
    expect(s.mailService.sendPasswordSecurityOtp).not.toHaveBeenCalled();
  });

  it('binds a missing email only after a valid OTP and password reset', async () => {
    const s = setup('');
    await expect(s.send()).rejects.toThrow('email hợp lệ');
    await s.send('new@example.com');
    expect(s.prisma.user.updateMany).not.toHaveBeenCalled();
    await expect(s.reset('wrong')).rejects.toThrow();
    await s.reset();
    expect(s.prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'actor', email: '', isActive: true, isDeleted: false },
      data: { passwordHash: 'hashed-password', email: 'new@example.com' },
    });
  });

  it('rejects an email already owned by another account', async () => {
    const s = setup('');
    s.prisma.user.findUnique.mockImplementation(async ({ where }) =>
      where.id ? s.user : { ...s.user, id: 'other' },
    );
    await expect(s.send('used@example.com')).rejects.toThrow('đã được sử dụng');
    expect(s.mailService.sendPasswordSecurityOtp).not.toHaveBeenCalled();
  });

  it('limits resend and locks the code after five wrong attempts', async () => {
    const s = setup();
    await s.send();
    await expect(s.send()).rejects.toThrow('60 giây');
    for (let i = 0; i < 5; i++)
      await expect(s.reset('000000')).rejects.toThrow();
    await expect(s.reset()).rejects.toThrow('5 lần');
    expect(s.prisma.user.updateMany).not.toHaveBeenCalled();
  });

  it('expires OTP after five minutes', async () => {
    const s = setup();
    const now = Date.now();
    const clock = jest.spyOn(Date, 'now').mockReturnValue(now);
    try {
      await s.send();
      clock.mockReturnValue(now + 300001);
      await expect(s.reset()).rejects.toThrow('hết hạn');
    } finally {
      clock.mockRestore();
    }
  });

  it('claims OTP before asynchronous work so parallel requests cannot reuse it', async () => {
    const s = setup();
    await s.send();
    const outcomes = await Promise.allSettled([s.reset(), s.reset()]);
    expect(outcomes.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    expect(s.prisma.user.updateMany).toHaveBeenCalledTimes(1);
  });

  it('does not retain a usable code if email delivery fails', async () => {
    const s = setup();
    s.mailService.sendPasswordSecurityOtp.mockRejectedValue(
      new Error('SMTP failed'),
    );
    await expect(s.send()).rejects.toThrow('Chưa gửi được');
    await expect(s.reset()).rejects.toThrow('không tồn tại');
  });

  it.each(['locked', 'deleted', 'email changed'])(
    'rejects an account that becomes %s before reset',
    async (state) => {
      const s = setup();
      await s.send();
      if (state === 'locked') s.user.isActive = false;
      if (state === 'deleted') s.user.isDeleted = true;
      if (state === 'email changed') s.user.email = 'changed@example.com';
      await expect(s.reset()).rejects.toThrow();
      expect(s.prisma.user.updateMany).not.toHaveBeenCalled();
    },
  );

  it('does not report success or restore a code after a failed database write', async () => {
    const s = setup();
    await s.send();
    s.prisma.user.updateMany.mockRejectedValue(new Error('DB failed'));
    await expect(s.reset()).rejects.toThrow('DB failed');
    await expect(s.reset()).rejects.toThrow('không tồn tại');
  });
});
