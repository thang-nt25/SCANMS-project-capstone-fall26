import { BadRequestException, ConflictException } from '@nestjs/common';
import { ReturnRequestStatus, UserRole } from '@prisma/client';
import { ReturnService } from './return.service';
import { PrismaService } from '../../core/database/prisma.service';
import { CloudinaryService } from '../../core/cloudinary/cloudinary.service';

const requestId = '6c73103a-2550-482b-9f18-e9f5c5ba1ad5';
const customerId = 'a9fa6bb8-f77e-4281-9fab-e24e971b07d1';
const shopOwnerId = '23acc500-c9d8-4732-8543-79f6267e8680';
const receipt = {
  size: 12,
  buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]),
} as Express.Multer.File;

function fixture(overrides: Record<string, unknown> = {}) {
  return {
    id: requestId,
    customerId,
    status: ReturnRequestStatus.SHOP_APPROVED,
    shipByAt: new Date(Date.now() + 60_000),
    returnAddress: 'Địa chỉ nhận hàng trả tại Shop',
    orderId: '94e900ec-d6dd-4d97-9f55-792d816a5387',
    order: {
      externalOrderSn: 'SCANMS-TEST',
      store: { ownerId: shopOwnerId },
    },
    ...overrides,
  };
}

describe('ReturnService.submitShipment', () => {
  let service: ReturnService;
  let prisma: {
    returnRequest: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };
  let cloudinary: { uploadImage: jest.Mock; deleteFile: jest.Mock };
  let tx: {
    returnRequest: { findFirst: jest.Mock; updateMany: jest.Mock };
    returnEvent: { create: jest.Mock };
    returnShipment: { create: jest.Mock };
    notification: { create: jest.Mock };
  };

  beforeEach(() => {
    const detail = fixture();
    tx = {
      returnRequest: {
        findFirst: jest.fn().mockResolvedValue(detail),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      returnEvent: { create: jest.fn().mockResolvedValue({}) },
      returnShipment: { create: jest.fn().mockResolvedValue({}) },
      notification: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma = {
      returnRequest: { findFirst: jest.fn().mockResolvedValue(detail) },
      $transaction: jest
        .fn()
        .mockImplementation((work: (client: typeof tx) => unknown) => work(tx)),
    };
    cloudinary = {
      uploadImage: jest.fn().mockResolvedValue({
        secureUrl: 'https://example.test/receipt.jpg',
        publicId: 'receipt-1',
      }),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    };
    service = new ReturnService(
      prisma as unknown as PrismaService,
      cloudinary as unknown as CloudinaryService,
    );
    jest.spyOn(service, 'getOne').mockResolvedValue({ id: requestId } as never);
  });

  it('moves SHOP_APPROVED to RETURN_SHIPPED and persists shipment and notification in one transaction', async () => {
    await expect(
      service.submitShipment(
        customerId,
        UserRole.CUSTOMER,
        requestId,
        { carrierName: 'GHTK', trackingNumber: 'GHTK12345' },
        receipt,
      ),
    ).resolves.toEqual({ id: requestId });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.returnRequest.updateMany).toHaveBeenCalledWith({
      where: { id: requestId, status: ReturnRequestStatus.SHOP_APPROVED },
      data: { status: ReturnRequestStatus.RETURN_SHIPPED },
    });
    const shipmentCalls = tx.returnShipment.create.mock
      .calls as unknown as Array<
      [
        {
          data: {
            returnRequestId: string;
            trackingNumber: string;
            receiptImageUrl: string;
          };
        },
      ]
    >;
    const shipmentCall = shipmentCalls[0][0];
    expect(shipmentCall.data).toMatchObject({
      returnRequestId: requestId,
      trackingNumber: 'GHTK12345',
      receiptImageUrl: 'https://example.test/receipt.jpg',
    });
    const notificationCalls = tx.notification.create.mock
      .calls as unknown as Array<
      [
        {
          data: {
            userId: string;
            type: string;
          };
        },
      ]
    >;
    const notificationCall = notificationCalls[0][0];
    expect(notificationCall.data).toMatchObject({
      userId: shopOwnerId,
      type: 'RETURN_SHIPPED',
    });
    expect(cloudinary.deleteFile).not.toHaveBeenCalled();
  });

  it('rejects expired requests before upload', async () => {
    prisma.returnRequest.findFirst.mockResolvedValue(
      fixture({ shipByAt: new Date(Date.now() - 1000) }),
    );
    await expect(
      service.submitShipment(
        customerId,
        UserRole.CUSTOMER,
        requestId,
        { carrierName: 'GHTK', trackingNumber: 'GHTK12345' },
        receipt,
      ),
    ).rejects.toThrow(ConflictException);
    expect(cloudinary.uploadImage).not.toHaveBeenCalled();
  });

  it('rejects a missing receipt before DB mutation', async () => {
    await expect(
      service.submitShipment(customerId, UserRole.CUSTOMER, requestId, {
        carrierName: 'GHTK',
        trackingNumber: 'GHTK12345',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects another customer even when the request id is known', async () => {
    prisma.returnRequest.findFirst.mockResolvedValue(null);
    await expect(
      service.submitShipment(
        'other-customer',
        UserRole.CUSTOMER,
        requestId,
        { carrierName: 'GHTK', trackingNumber: 'GHTK12345' },
        receipt,
      ),
    ).rejects.toThrow();
    expect(cloudinary.uploadImage).not.toHaveBeenCalled();
  });

  it('compensates the uploaded receipt if the transaction loses a state race', async () => {
    tx.returnRequest.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.submitShipment(
        customerId,
        UserRole.CUSTOMER,
        requestId,
        { carrierName: 'GHTK', trackingNumber: 'GHTK12345' },
        receipt,
      ),
    ).rejects.toThrow(ConflictException);
    expect(cloudinary.deleteFile).toHaveBeenCalledWith('receipt-1');
    expect(tx.returnShipment.create).not.toHaveBeenCalled();
  });
});
