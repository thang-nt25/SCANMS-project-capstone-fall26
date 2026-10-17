import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CustomerIdentityService } from './customer-identity.service';
import {
  importLegacyIdentities,
  parseLegacyIdentities,
} from './customer-identity-import';
import type { PrismaClient } from '@prisma/client';

describe('Customer identity persistence', () => {
  const userId = '03018a76-3f2a-4373-8413-0718a42cbfa2';
  const input = {
    fullName: '  Test Customer  ',
    idCardNumber: ' 001 202 012 345 ',
    address: '  123 Test Street  ',
  };
  const record = {
    userId,
    fullName: 'Test Customer',
    idCardNumber: '001202012345',
    address: '123 Test Street',
    verificationMethod: 'SELF_DECLARED',
    verifiedAt: new Date('2026-10-16T05:00:00Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  function setup() {
    const tx = {
      user: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        count: jest.fn().mockResolvedValue(1),
      },
      customerIdentity: {
        upsert: jest.fn().mockResolvedValue(record),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma = {
      user: { findUnique: jest.fn() },
      $transaction: jest.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
    };
    return {
      tx,
      prisma,
      service: new CustomerIdentityService(prisma as unknown as PrismaService),
    };
  }

  it('reads only the authenticated user and allowlists the response', async () => {
    const { service, prisma } = setup();
    prisma.user.findUnique.mockResolvedValue({
      isActive: true,
      isDeleted: false,
      customerIdentity: { ...record, privateField: 'must not leak' },
    });
    const result = await service.getOne(userId);
    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: userId } }),
    );
    expect(result).toEqual({
      isVerified: true,
      fullName: record.fullName,
      idCardNumber: record.idCardNumber,
      address: record.address,
      verifiedAt: record.verifiedAt.toISOString(),
      verificationMethod: 'SELF_DECLARED',
    });
  });

  it('returns the existing unverified FE contract without a declaration', async () => {
    const { service, prisma } = setup();
    prisma.user.findUnique.mockResolvedValue({
      isActive: true,
      isDeleted: false,
      fullName: 'Test Customer',
      customerIdentity: null,
    });
    await expect(service.getOne(userId)).resolves.toEqual({
      isVerified: false,
      fullName: 'Test Customer',
      idCardNumber: '',
      address: '',
    });
  });

  it('saves account name and declaration in one transaction', async () => {
    const { service, tx, prisma } = setup();
    await expect(service.confirm(userId, input)).resolves.toMatchObject({
      success: true,
      data: { isVerified: true },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { id: userId, isActive: true, isDeleted: false },
      data: { fullName: 'Test Customer' },
    });
    expect(tx.customerIdentity.upsert).toHaveBeenCalledWith({
      where: { userId },
      create: expect.objectContaining({ userId, idCardNumber: '001202012345' }),
      update: expect.objectContaining({ verificationMethod: 'SELF_DECLARED' }),
    });
  });

  it.each(['1234567890', '12345678901', 'abc', ''])(
    'rejects invalid ID %p before writing',
    async (idCardNumber) => {
      const { service, prisma } = setup();
      await expect(
        service.confirm(userId, { ...input, idCardNumber }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    },
  );

  it('rejects overlong fields before writing', async () => {
    const { service, prisma } = setup();
    await expect(
      service.confirm(userId, { ...input, fullName: 'a'.repeat(151) }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not save a declaration for a missing/inactive account', async () => {
    const { service, tx } = setup();
    tx.user.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.confirm(userId, input)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(tx.customerIdentity.upsert).not.toHaveBeenCalled();
  });

  it('propagates DB failure instead of falsely reporting successful verification', async () => {
    const { service, tx } = setup();
    tx.customerIdentity.upsert.mockRejectedValue(
      new Error('database unavailable'),
    );
    await expect(service.confirm(userId, input)).rejects.toThrow(
      'Không thể lưu thông tin định danh',
    );
  });

  it('imports valid legacy records without overwriting newer database declarations', async () => {
    const { prisma, tx } = setup();
    const rows = parseLegacyIdentities({
      [userId]: { ...input, verifiedAt: record.verifiedAt.toISOString() },
    });
    expect(rows[0].verificationMethod).toBe('LEGACY_IMPORT');
    tx.customerIdentity.createMany.mockResolvedValue({ count: 0 });
    await expect(
      importLegacyIdentities(prisma as unknown as PrismaClient, rows),
    ).resolves.toEqual({ imported: 0, preserved: 1 });
    expect(tx.customerIdentity.createMany).toHaveBeenCalledWith({
      data: rows,
      skipDuplicates: true,
    });
    expect(tx.user.updateMany).not.toHaveBeenCalled();
  });

  it('refuses orphaned legacy records before any insert', async () => {
    const { prisma, tx } = setup();
    const rows = parseLegacyIdentities({
      [userId]: { ...input, verifiedAt: record.verifiedAt.toISOString() },
    });
    tx.user.count.mockResolvedValue(0);
    await expect(
      importLegacyIdentities(prisma as unknown as PrismaClient, rows),
    ).rejects.toThrow('no active account');
    expect(tx.customerIdentity.createMany).not.toHaveBeenCalled();
  });

  it('rejects invalid legacy JSON without exposing its identity values', () => {
    expect(() =>
      parseLegacyIdentities({
        [userId]: { ...input, idCardNumber: 'sensitive-invalid' },
      }),
    ).toThrow('Legacy identity file is invalid');
  });
});
