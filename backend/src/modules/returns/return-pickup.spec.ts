import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ReturnRequestStatus, ReturnShipmentDirection, UserRole } from '@prisma/client';
import { ReturnService } from './return.service';
import { PickupGateway } from './pickup.gateway';
import { PrismaService } from '../../core/database/prisma.service';
import { CloudinaryService } from '../../core/cloudinary/cloudinary.service';

const id = '6c73103a-2550-482b-9f18-e9f5c5ba1ad5';
const customerId = 'a9fa6bb8-f77e-4281-9fab-e24e971b07d1';
const ownerId = '23acc500-c9d8-4732-8543-79f6267e8680';
const warehouse = { name: 'Kho ScanMS', phone: '0901234567', address: '12 Đường Số 8, Phường Linh Trung, TP Hồ Chí Minh', wardName: 'Phường Linh Trung', provinceName: 'Hồ Chí Minh' };
const pickup = { name: 'Khách A', phone: '0912345678', address: '15 Đường Số 9, Phường Linh Trung, TP Hồ Chí Minh', wardName: 'Phường Linh Trung', provinceName: 'Hồ Chí Minh', weight: 500, length: 20, width: 15, height: 10 };

const fixture = (status: ReturnRequestStatus = ReturnRequestStatus.SHOP_APPROVED) => ({
  id, customerId, status, orderId: '94e900ec-d6dd-4d97-9f55-792d816a5387',
  shipByAt: new Date(Date.now() + 86_400_000),
  order: { externalOrderSn: 'SCANMS-TEST', customerName: 'Khách A', customerPhone: '0912345678', shippingAddress: pickup.address,
    store: { id: 'b3380f3e-d529-4acc-8c31-57d63340e88f', ownerId, name: 'Shop A', returnWarehouse: warehouse } },
  items: [{ quantity: 1, orderItem: { product: { title: 'Sản phẩm A' } } }],
  shipments: [], events: [], refund: null, dispute: null,
});

describe('return pickup booking', () => {
  let service: ReturnService;
  let prisma: { returnRequest: { findFirst: jest.Mock }; returnShipment: { findFirst: jest.Mock }; $transaction: jest.Mock };
  let tx: {
    returnRequest: { findFirst: jest.Mock; updateMany: jest.Mock };
    returnShipment: { create: jest.Mock; updateMany: jest.Mock };
    returnEvent: { create: jest.Mock };
    notification: { create: jest.Mock };
  };
  let gateway: { mode: jest.Mock; book: jest.Mock };

  beforeEach(() => {
    const detail = fixture();
    tx = {
      returnRequest: { findFirst: jest.fn().mockResolvedValue(detail), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      returnShipment: { create: jest.fn().mockResolvedValue({}), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      returnEvent: { create: jest.fn().mockResolvedValue({}) },
      notification: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma = { returnRequest: { findFirst: jest.fn().mockResolvedValue(detail) }, returnShipment: { findFirst: jest.fn() },
      $transaction: jest.fn().mockImplementation((work: (client: typeof tx) => unknown) => work(tx)) };
    gateway = { mode: jest.fn().mockReturnValue('mock'), book: jest.fn().mockResolvedValue({
      provider: 'MOCK', carrierName: 'SCANMS Demo', trackingNumber: 'SIM12345', providerStatus: 'ready_to_pick', feeAmount: null,
    }) };
    service = new ReturnService(prisma as unknown as PrismaService, {} as CloudinaryService, gateway as unknown as PickupGateway);
    jest.spyOn(service, 'getOne').mockResolvedValue({ id } as never);
  });

  it('books a pickup with a stable client order code and atomically saves the return shipment', async () => {
    await expect(service.bookPickup(customerId, UserRole.CUSTOMER, id, pickup)).resolves.toEqual({ id });
    expect(gateway.book).toHaveBeenCalledWith(expect.objectContaining({
      clientOrderCode: `SC-R-${id.replace(/-/g, '')}`, pickup, warehouse,
    }));
    expect(tx.returnRequest.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id, status: ReturnRequestStatus.SHOP_APPROVED },
      data: expect.objectContaining({ status: ReturnRequestStatus.PICKUP_BOOKED, pickupContact: pickup }),
    }));
    expect(tx.returnShipment.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      direction: ReturnShipmentDirection.CUSTOMER_TO_SHOP, provider: 'MOCK', trackingNumber: 'SIM12345',
    }) });
    expect(tx.notification.create).toHaveBeenCalledTimes(2);
  });

  it('never calls GHN for another customer', async () => {
    prisma.returnRequest.findFirst.mockResolvedValue(null);
    await expect(service.bookPickup('other-customer', UserRole.CUSTOMER, id, pickup)).rejects.toThrow(NotFoundException);
    expect(gateway.book).not.toHaveBeenCalled();
  });

  it('rejects an expired booking before calling the carrier', async () => {
    prisma.returnRequest.findFirst.mockResolvedValue({ ...fixture(), shipByAt: new Date(Date.now() - 1000) });
    await expect(service.bookPickup(customerId, UserRole.CUSTOMER, id, pickup)).rejects.toThrow(ConflictException);
    expect(gateway.book).not.toHaveBeenCalled();
  });

  it('returns an existing booking without creating another GHN order', async () => {
    prisma.returnRequest.findFirst.mockResolvedValue(fixture(ReturnRequestStatus.PICKUP_BOOKED));
    await service.bookPickup(customerId, UserRole.CUSTOMER, id, pickup);
    expect(gateway.book).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects unsigned GHN callbacks', async () => {
    await expect(service.handleGhnWebhook(undefined, { OrderCode: 'GHN1', Status: 'picked', ShopID: 1 }))
      .rejects.toThrow(UnauthorizedException);
  });

  it('moves a booked pickup to in transit after the courier picks it up', async () => {
    const shipment = { id: 'shipment-1', direction: ReturnShipmentDirection.CUSTOMER_TO_SHOP,
      trackingNumber: 'SIM12345', provider: 'MOCK', providerStatus: 'ready_to_pick', version: 1,
      pickedUpAt: null, returnRequest: fixture(ReturnRequestStatus.PICKUP_BOOKED) };
    prisma.returnRequest.findFirst.mockResolvedValue({ ...fixture(ReturnRequestStatus.PICKUP_BOOKED), shipments: [shipment] });
    prisma.returnShipment.findFirst.mockResolvedValue(shipment);
    await service.simulatePickup(ownerId, UserRole.SHOP_MANAGER, id, 'picked');
    expect(tx.returnRequest.updateMany).toHaveBeenCalledWith({
      where: { id, status: ReturnRequestStatus.PICKUP_BOOKED },
      data: { status: ReturnRequestStatus.RETURN_SHIPPED },
    });
    expect(tx.returnShipment.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'shipment-1', version: 1 },
      data: expect.objectContaining({ providerStatus: 'picked' }),
    }));
  });

  it('marks the parcel received when the courier delivers it to the shop', async () => {
    const shipment = { id: 'shipment-1', direction: ReturnShipmentDirection.CUSTOMER_TO_SHOP,
      trackingNumber: 'SIM12345', provider: 'MOCK', providerStatus: 'picked', version: 2,
      pickedUpAt: new Date(), returnRequest: fixture(ReturnRequestStatus.RETURN_SHIPPED) };
    prisma.returnRequest.findFirst.mockResolvedValue({ ...fixture(ReturnRequestStatus.RETURN_SHIPPED), shipments: [shipment] });
    prisma.returnShipment.findFirst.mockResolvedValue(shipment);
    await service.simulatePickup(ownerId, UserRole.SHOP_MANAGER, id, 'delivered');
    expect(tx.returnRequest.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id, status: ReturnRequestStatus.RETURN_SHIPPED },
      data: expect.objectContaining({ status: ReturnRequestStatus.RETURN_RECEIVED, receivedAt: expect.any(Date) }),
    }));
    expect(tx.notification.create).toHaveBeenCalledTimes(2);
  });

  it('keeps a failed pickup out of the shipped state', async () => {
    const shipment = { id: 'shipment-1', direction: ReturnShipmentDirection.CUSTOMER_TO_SHOP,
      trackingNumber: 'GHN123', provider: 'GHN_STAGING', providerStatus: 'ready_to_pick', version: 1,
      pickedUpAt: null, returnRequest: fixture(ReturnRequestStatus.PICKUP_BOOKED) };
    prisma.returnShipment.findFirst.mockResolvedValue(shipment);
    await (service as unknown as { applyCarrierStatus: (code: string, status: string, provider: string) => Promise<void> })
      .applyCarrierStatus('GHN123', 'delivery_fail', 'GHN_STAGING');
    expect(tx.returnRequest.updateMany).not.toHaveBeenCalled();
    expect(tx.returnShipment.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ providerStatus: 'delivery_fail' }),
    }));
    expect(tx.notification.create).toHaveBeenCalledTimes(2);
  });

  it('does not regress a delivered parcel when an older callback arrives', async () => {
    prisma.returnShipment.findFirst.mockResolvedValue({ id: 'shipment-1', direction: ReturnShipmentDirection.CUSTOMER_TO_SHOP,
      trackingNumber: 'GHN123', provider: 'GHN_STAGING', providerStatus: 'delivered', version: 3,
      pickedUpAt: new Date(), returnRequest: fixture(ReturnRequestStatus.RETURN_RECEIVED) });
    await (service as unknown as { applyCarrierStatus: (code: string, status: string, provider: string) => Promise<void> })
      .applyCarrierStatus('GHN123', 'cancel', 'GHN_STAGING');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
