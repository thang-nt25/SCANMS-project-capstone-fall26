import { Test, TestingModule } from '@nestjs/testing';
import { SamplesService } from '../samples.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { SampleRequestStatus } from '@prisma/client';
import { NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';

describe('SamplesService (FR-26)', () => {
  let service: SamplesService;
  let prisma: any;

  const mockProduct = {
    id: 'prod-1',
    title: 'Sản phẩm mẫu A',
    price: 150000,
    storeId: 'store-1',
    store: { id: 'store-1', name: 'Shop Sora', ownerId: 'shop-owner-1' },
    isDeleted: false,
  };

  const mockSampleRequest = {
    id: 'req-1',
    collaboratorId: 'kol-1',
    productId: 'prod-1',
    shippingAddress: '123 Sunrise City, Q7, TP.HCM',
    status: SampleRequestStatus.PENDING,
    trackingNumber: null,
    createdAt: new Date(),
    product: mockProduct,
    collaborator: { id: 'kol-1', fullName: 'KOL Test', email: 'kol@scanms.vn', role: 'COLLABORATOR' },
  };

  beforeEach(async () => {
    prisma = {
      product: {
        findFirst: jest.fn(),
      },
      store: {
        findFirst: jest.fn(),
      },
      sampleProductRequest: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SamplesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SamplesService>(SamplesService);
  });

  describe('createRequest', () => {
    it('should successfully create a sample request for a valid product', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.sampleProductRequest.findFirst.mockResolvedValue(null);
      prisma.sampleProductRequest.create.mockResolvedValue(mockSampleRequest);

      const result = await service.createRequest('kol-1', {
        productId: 'prod-1',
        shippingAddress: '123 Sunrise City, Q7, TP.HCM',
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('req-1');
      expect(prisma.sampleProductRequest.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if product is not found', async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.createRequest('kol-1', {
          productId: 'invalid-prod',
          shippingAddress: '123 Sunrise City, Q7, TP.HCM',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if request for product is already pending/approved', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.sampleProductRequest.findFirst.mockResolvedValue(mockSampleRequest);

      await expect(
        service.createRequest('kol-1', {
          productId: 'prod-1',
          shippingAddress: '123 Sunrise City, Q7, TP.HCM',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('approveRequest', () => {
    it('should approve request when shop owner is authorized and status is PENDING', async () => {
      prisma.sampleProductRequest.findUnique.mockResolvedValue(mockSampleRequest);
      prisma.sampleProductRequest.update.mockResolvedValue({
        ...mockSampleRequest,
        status: SampleRequestStatus.APPROVED,
      });

      const result = await service.approveRequest('req-1', 'shop-owner-1');
      expect(result.status).toBe(SampleRequestStatus.APPROVED);
    });

    it('should throw ForbiddenException if user is not the store owner', async () => {
      prisma.sampleProductRequest.findUnique.mockResolvedValue(mockSampleRequest);

      await expect(
        service.approveRequest('req-1', 'intruder-shop-owner'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if request is not PENDING', async () => {
      prisma.sampleProductRequest.findUnique.mockResolvedValue({
        ...mockSampleRequest,
        status: SampleRequestStatus.APPROVED,
      });

      await expect(
        service.approveRequest('req-1', 'shop-owner-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('rejectRequest', () => {
    it('should reject request when status is PENDING', async () => {
      prisma.sampleProductRequest.findUnique.mockResolvedValue(mockSampleRequest);
      prisma.sampleProductRequest.update.mockResolvedValue({
        ...mockSampleRequest,
        status: SampleRequestStatus.REJECTED,
      });

      const result = await service.rejectRequest('req-1', 'shop-owner-1');
      expect(result.status).toBe(SampleRequestStatus.REJECTED);
    });
  });

  describe('shipRequest', () => {
    it('should attach tracking number and change status to SHIPPED', async () => {
      prisma.sampleProductRequest.findUnique.mockResolvedValue({
        ...mockSampleRequest,
        status: SampleRequestStatus.APPROVED,
      });
      prisma.sampleProductRequest.update.mockResolvedValue({
        ...mockSampleRequest,
        status: SampleRequestStatus.SHIPPED,
        trackingNumber: 'GHTK998877',
      });

      const result = await service.shipRequest('req-1', 'shop-owner-1', {
        trackingNumber: 'GHTK998877',
      });

      expect(result.status).toBe(SampleRequestStatus.SHIPPED);
      expect(result.trackingNumber).toBe('GHTK998877');
    });

    it('should throw BadRequestException if shipping an unapproved request', async () => {
      prisma.sampleProductRequest.findUnique.mockResolvedValue({
        ...mockSampleRequest,
        status: SampleRequestStatus.PENDING,
      });

      await expect(
        service.shipRequest('req-1', 'shop-owner-1', {
          trackingNumber: 'GHTK998877',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getShopStats', () => {
    it('should calculate stats for the shop', async () => {
      prisma.store.findFirst.mockResolvedValue({ id: 'store-1' });
      prisma.sampleProductRequest.count
        .mockResolvedValueOnce(5)  // pending
        .mockResolvedValueOnce(10) // approved
        .mockResolvedValueOnce(3)  // shipped
        .mockResolvedValueOnce(2); // rejected

      const stats = await service.getShopStats('shop-owner-1');
      expect(stats).toEqual({
        pending: 5,
        approved: 10,
        shipped: 3,
        rejected: 2,
        total: 20,
      });
    });
  });
});
