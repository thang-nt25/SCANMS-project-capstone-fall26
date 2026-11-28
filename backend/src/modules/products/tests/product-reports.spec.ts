import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import sharp from 'sharp';
import { ProductReportsService } from '../product-reports.service';

function setup(status = 'PENDING') {
  const prisma = {
    product: {
      findFirst: jest.fn().mockResolvedValue({ title: 'Test product', variants: [{ id: 'variant', sku: 'TEST-V', name: 'Test variant' }] }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    productReport: {
      create: jest.fn().mockResolvedValue({ id: 'report', status: 'PENDING' }),
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue({
        status, productId: 'product', reporterId: 'reporter', product: { title: 'Test product', store: { ownerId: 'shop' } },
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([{ id: 'staff' }]),
      findFirst: jest.fn().mockResolvedValue({ id: 'reporter' }),
    },
    auditLog: { create: jest.fn() },
    notification: { create: jest.fn(), createMany: jest.fn() },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(callback => callback(prisma));
  const cache = { checkRateLimit: jest.fn().mockResolvedValue({ allowed: true }) };
  const products = { invalidateLandingCache: jest.fn() };
  const service = new ProductReportsService(prisma as never, cache as never, products as never);
  return { service, prisma, products };
}

describe('product report workflow', () => {
  it('stores the selected variant snapshot and routes the report to platform staff', async () => {
    const { service, prisma } = setup();
    await service.submit('reporter', 'product', { reason: 'MISLEADING_INFORMATION', variantId: 'variant' });
    expect(prisma.productReport.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ reporterId: 'reporter', productId: 'product', variantSku: 'TEST-V' }),
    }));
    expect(prisma.notification.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({
      userId: 'staff', type: 'PRODUCT_REPORT_RECEIVED',
      data: { actionUrl: '/admin/products-pricing?tab=reports&report=report' },
    })] });
    expect(prisma.product.updateMany).not.toHaveBeenCalled();
  });

  it('rejects duplicate pending reports', async () => {
    const { service, prisma } = setup();
    prisma.productReport.findFirst.mockResolvedValue({ id: 'existing' });
    await expect(service.submit('reporter', 'product', { reason: 'MISLEADING_INFORMATION' })).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.productReport.create).not.toHaveBeenCalled();
  });

  it.each(['SUSPECTED_COUNTERFEIT', 'OTHER'] as const)('requires a note for %s', async (reason) => {
    const { service, prisma } = setup();
    await expect(service.submit('reporter', 'product', { reason, details: '  ' })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.productReport.create).not.toHaveBeenCalled();
  });

  it('accepts other reports with a note and no attachment', async () => {
    const { service, prisma } = setup();
    await service.submit('reporter', 'product', { reason: 'OTHER', details: ' Check the label. ' });
    expect(prisma.productReport.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ reason: 'OTHER', details: 'Check the label.', evidence: undefined }),
    }));
  });

  it.each(['WRONG_IMAGE', 'SUSPECTED_COUNTERFEIT'] as const)('requires a photo for %s', async (reason) => {
    const { service, prisma } = setup();
    await expect(service.submit('reporter', 'product', { reason, details: 'Check the label.' }))
      .rejects.toThrow('Vui lòng đính kèm ảnh');
    expect(prisma.productReport.create).not.toHaveBeenCalled();
  });

  it('stores a photo and an optional MP4 in the same report', async () => {
    const { service, prisma } = setup();
    const png = await sharp({ create: { width: 1, height: 1, channels: 3, background: '#fff' } }).png().toBuffer();
    const mp4Header = Buffer.from('000000106674797069736f6d00000000', 'hex');
    await service.submit('reporter', 'product', { reason: 'WRONG_IMAGE' },
      { originalname: 'photo.png', mimetype: 'image/png', size: png.length, buffer: png } as Express.Multer.File,
      { originalname: 'clip.mp4', mimetype: 'video/mp4', size: mp4Header.length, buffer: mp4Header } as Express.Multer.File);
    expect(prisma.productReport.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ evidenceMime: 'image/webp', evidenceVideoMime: 'video/mp4', evidenceVideo: new Uint8Array(mp4Header) }),
    }));
  });

  it('sends a correction request to the shop without exposing the reporter', async () => {
    const { service, prisma } = setup();
    await service.resolve('report', 'manager', 'SYSTEM_MANAGER', 'CORRECTION_REQUESTED', 'Correct the photo');
    const shopNotice = prisma.notification.create.mock.calls.find(([arg]) => arg.data.userId === 'shop')?.[0].data;
    expect(shopNotice).toMatchObject({ type: 'PRODUCT_REPORT_SHOP_ACTION', message: expect.stringContaining('Correct the photo'), data: { productId: 'product' } });
    expect(JSON.stringify(shopNotice)).not.toContain('reporter');
    expect(prisma.product.updateMany).not.toHaveBeenCalled();
  });

  it('allows the manager to escalate and only the admin to hide the product', async () => {
    const pending = setup();
    await expect(pending.service.resolve('report', 'manager', 'SYSTEM_MANAGER', 'HIDDEN', 'Evidence confirmed')).rejects.toBeInstanceOf(ForbiddenException);
    await pending.service.resolve('report', 'manager', 'SYSTEM_MANAGER', 'ESCALATED', 'Admin review needed');
    expect(pending.prisma.notification.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ type: 'PRODUCT_REPORT_ESCALATED' })] });
    expect(pending.prisma.product.updateMany).not.toHaveBeenCalled();
    const escalated = setup('ESCALATED');
    await expect(escalated.service.resolve('report', 'manager', 'SYSTEM_MANAGER', 'DISMISSED', 'No policy issue')).rejects.toBeInstanceOf(ForbiddenException);
    await escalated.service.resolve('report', 'admin', 'SYSTEM_ADMIN', 'HIDDEN', 'Evidence confirmed');
    expect(escalated.prisma.product.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ isActive: false, moderationStatus: 'REJECTED' }),
    }));
    expect(escalated.products.invalidateLandingCache).toHaveBeenCalledWith('product');
    expect(escalated.prisma.notification.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: 'reporter', type: 'PRODUCT_REPORT_RESULT' }),
    }));
  });

  it('does not send another decision when a concurrent review wins', async () => {
    const { service, prisma } = setup();
    prisma.productReport.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.resolve('report', 'manager', 'SYSTEM_MANAGER', 'DISMISSED', 'No policy issue')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });
});
