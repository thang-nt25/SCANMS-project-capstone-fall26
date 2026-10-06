import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import {
  OrderStatus,
  Prisma,
  ReturnRequestStatus,
  ReturnResolution,
  ReturnShipmentDirection,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { CloudinaryService } from '../../core/cloudinary/cloudinary.service';
import { assertReturnTransition } from './return-state.machine';
import { PickupGateway } from './pickup.gateway';
import { warehouseSchema } from './return.schemas';
import type {
  BookPickupInput,
  DisputeInput,
  InspectionInput,
  InstructionsInput,
  ResolveDisputeInput,
  ShipmentInput,
  WarehouseInput,
} from './return.schemas';

const detailInclude = {
  order: {
    select: {
      id: true,
      externalOrderSn: true,
      status: true,
      customerName: true,
      customerPhone: true,
      shippingAddress: true,
      finalAmount: true,
      refundedAmount: true,
      store: { select: { id: true, ownerId: true, name: true, returnWarehouse: true } },
      paymentTransactions: {
        select: { paymentMethod: true, status: true },
        orderBy: { createdAt: 'desc' as const },
      },
    },
  },
  items: {
    include: {
      orderItem: {
        include: { product: { select: { title: true, imageUrl: true } } },
      },
    },
  },
  shipments: true,
  refund: true,
  dispute: true,
  events: { orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.ReturnRequestInclude;

type Detail = Prisma.ReturnRequestGetPayload<{ include: typeof detailInclude }>;
const SHIP_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const INSPECTION_SLA_MS = 48 * 60 * 60 * 1000;
const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

@Injectable()
export class ReturnService {
  private readonly logger = new Logger(ReturnService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly pickupGateway: PickupGateway = new PickupGateway(),
  ) {}

  private scope(
    userId: string,
    role: UserRole,
  ): Prisma.ReturnRequestWhereInput {
    if (role === UserRole.CUSTOMER) return { customerId: userId };
    if (role === UserRole.SHOP_MANAGER)
      return { order: { store: { ownerId: userId } } };
    if (role === UserRole.SYSTEM_ADMIN || role === UserRole.SYSTEM_MANAGER)
      return {};
    throw new ForbiddenException('Vai trò không được truy cập hồ sơ đổi trả');
  }

  private async scopedDetail(
    userId: string,
    role: UserRole,
    id: string,
  ): Promise<Detail> {
    const found = await this.prisma.returnRequest.findFirst({
      where: { id, ...this.scope(userId, role) },
      include: detailInclude,
    });
    if (!found) throw new NotFoundException('Không tìm thấy hồ sơ đổi trả');
    return found;
  }

  private requireShop(userId: string, role: UserRole, detail: Detail) {
    if (
      role !== UserRole.SHOP_MANAGER ||
      detail.order.store.ownerId !== userId
    ) {
      throw new ForbiddenException('Bạn không quản lý Shop của đơn hàng này');
    }
  }

  private requireCustomer(userId: string, detail: Detail) {
    if (detail.customerId !== userId) {
      throw new ForbiddenException('Hồ sơ không thuộc tài khoản của bạn');
    }
  }

  private async move(
    tx: Prisma.TransactionClient,
    id: string,
    from: ReturnRequestStatus,
    to: ReturnRequestStatus,
    actorId: string | null,
    extra?: Prisma.ReturnRequestUpdateManyMutationInput,
  ) {
    assertReturnTransition(from, to);
    const changed = await tx.returnRequest.updateMany({
      where: { id, status: from },
      data: { ...extra, status: to },
    });
    if (changed.count !== 1) {
      throw new ConflictException(
        'Hồ sơ đã được xử lý bởi một yêu cầu khác; hãy tải lại',
      );
    }
    await tx.returnEvent.create({
      data: { returnRequestId: id, actorId, type: `${from}_TO_${to}` },
    });
  }

  private async notify(
    tx: Prisma.TransactionClient,
    request: Detail,
    userId: string,
    type: string,
    title: string,
    message: string,
  ) {
    await tx.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data: { orderId: request.orderId, returnRequestId: request.id },
      },
    });
  }

  private present(item: Detail) {
    const { order, shipments, ...rest } = item;
    return {
      ...rest,
      order: {
        id: order.id,
        externalOrderSn: order.externalOrderSn,
        storeName: order.store.name,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        shippingAddress: order.shippingAddress,
      },
      returnWarehouse: warehouseSchema.safeParse(order.store.returnWarehouse).success
        ? order.store.returnWarehouse
        : null,
      pickupProviderMode: this.pickupGateway.mode(),
      pickupSimulationEnabled: process.env.NODE_ENV !== 'production' &&
        (this.pickupGateway.mode() === 'mock' || process.env.RETURN_PICKUP_SIMULATION_ENABLED === 'true'),
      customerShipment:
        shipments.find(
          (s) => s.direction === ReturnShipmentDirection.CUSTOMER_TO_SHOP,
        ) ?? null,
      exchangeShipment:
        shipments.find(
          (s) => s.direction === ReturnShipmentDirection.SHOP_TO_CUSTOMER,
        ) ?? null,
    };
  }

  async getOne(userId: string, role: UserRole, id: string) {
    return this.present(await this.scopedDetail(userId, role, id));
  }

  async listShop(userId: string, role: UserRole, status?: string, page = 1) {
    if (role !== UserRole.SHOP_MANAGER)
      throw new ForbiddenException('Chỉ Shop được xem hàng đợi đổi trả');
    if (
      status &&
      !Object.values(ReturnRequestStatus).includes(
        status as ReturnRequestStatus,
      )
    ) {
      throw new BadRequestException('Trạng thái không hợp lệ');
    }
    const where: Prisma.ReturnRequestWhereInput = {
      order: { store: { ownerId: userId } },
      ...(status ? { status: status as ReturnRequestStatus } : {}),
    };
    const [total, records] = await this.prisma.$transaction([
      this.prisma.returnRequest.count({ where }),
      this.prisma.returnRequest.findMany({
        where,
        include: detailInclude,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * 20,
        take: 20,
      }),
    ]);
    return {
      total,
      page,
      items: records.map((record) => this.present(record)),
    };
  }

  async saveWarehouse(userId: string, role: UserRole, id: string, input: WarehouseInput) {
    const detail = await this.scopedDetail(userId, role, id);
    this.requireShop(userId, role, detail);
    await this.prisma.$transaction(async (tx) => {
      const changed = await tx.store.updateMany({
        where: { id: detail.order.store.id, ownerId: userId },
        data: { returnWarehouse: input },
      });
      if (changed.count !== 1) throw new ConflictException('Gian hàng đã thay đổi');
      // Existing approved requests can now book pickup without asking for an address per order.
      const waiting = await tx.returnRequest.findMany({
        where: { order: { storeId: detail.order.store.id }, status: ReturnRequestStatus.SHOP_APPROVED, shipByAt: null },
        select: { id: true, customerId: true, orderId: true, order: { select: { externalOrderSn: true } } },
      });
      for (const request of waiting) {
        const updated = await tx.returnRequest.updateMany({
          where: { id: request.id, status: ReturnRequestStatus.SHOP_APPROVED, shipByAt: null },
          data: {
            returnAddress: input.address,
            returnInstructions: 'Đóng gói sản phẩm và chờ đơn vị vận chuyển đến lấy tại địa chỉ đã xác nhận.',
            shipByAt: new Date(Date.now() + SHIP_WINDOW_MS),
          },
        });
        if (updated.count === 1) {
          await tx.returnEvent.create({ data: { returnRequestId: request.id, actorId: userId, type: 'PICKUP_WAREHOUSE_READY' } });
          await tx.notification.create({ data: {
            userId: request.customerId,
            type: 'RETURN_PICKUP_READY',
            title: 'Có thể đặt lấy hàng trả tại nhà',
            message: `Đơn ${request.order.externalOrderSn}: vui lòng xác nhận địa chỉ lấy hàng trong 7 ngày.`,
            data: { orderId: request.orderId, returnRequestId: request.id },
          } });
        }
      }
    });
    return this.getOne(userId, role, id);
  }

  async bookPickup(userId: string, role: UserRole, id: string, input: BookPickupInput) {
    const detail = await this.scopedDetail(userId, role, id);
    this.requireCustomer(userId, detail);
    if (detail.status === ReturnRequestStatus.PICKUP_BOOKED) return this.present(detail);
    const warehouse = warehouseSchema.safeParse(detail.order.store.returnWarehouse);
    if (!warehouse.success) throw new ConflictException('Shop chưa cấu hình kho nhận hàng trả');
    if (detail.status !== ReturnRequestStatus.SHOP_APPROVED || !detail.shipByAt) {
      throw new ConflictException('Hồ sơ chưa sẵn sàng đặt lấy hàng');
    }
    if (detail.shipByAt.getTime() <= Date.now()) throw new ConflictException('Đã quá hạn đặt lấy hàng');
    const clientOrderCode = `SC-R-${id.replace(/-/g, '')}`;
    const booking = await this.pickupGateway.book({
      clientOrderCode,
      pickup: input,
      warehouse: warehouse.data,
      content: detail.items.map((item) => `${item.orderItem.product.title} x${item.quantity}`).join(', ') || 'Hàng trả SCANMS',
    });
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.returnRequest.findFirst({ where: { id, customerId: userId, status: ReturnRequestStatus.SHOP_APPROVED }, include: detailInclude });
      if (!current || !current.shipByAt || current.shipByAt.getTime() <= Date.now()) {
        throw new ConflictException('Hồ sơ đã thay đổi; vui lòng tải lại');
      }
      await this.move(tx, id, ReturnRequestStatus.SHOP_APPROVED, ReturnRequestStatus.PICKUP_BOOKED, userId, {
        pickupContact: input,
        returnAddress: warehouse.data.address,
      });
      await tx.returnShipment.create({ data: {
        returnRequestId: id,
        direction: ReturnShipmentDirection.CUSTOMER_TO_SHOP,
        carrierName: booking.carrierName,
        trackingNumber: booking.trackingNumber,
        provider: booking.provider,
        providerStatus: booking.providerStatus,
        clientOrderCode,
        feeAmount: booking.feeAmount,
        bookedAt: new Date(),
      } });
      await this.notify(tx, current, current.order.store.ownerId, 'RETURN_PICKUP_BOOKED',
        'Khách đã đặt lấy hàng trả', `Đơn ${current.order.externalOrderSn}: vận đơn ${booking.trackingNumber}.`);
      await this.notify(tx, current, current.customerId, 'RETURN_PICKUP_BOOKED',
        'Đã đặt đơn lấy hàng trả', `Đơn ${current.order.externalOrderSn}: mã vận đơn ${booking.trackingNumber}.`);
    });
    return this.getOne(userId, role, id);
  }

  async simulatePickup(userId: string, role: UserRole, id: string, status: 'picked' | 'delivered') {
    const detail = await this.scopedDetail(userId, role, id);
    if (role !== UserRole.SYSTEM_ADMIN && role !== UserRole.SYSTEM_MANAGER) this.requireShop(userId, role, detail);
    if (process.env.NODE_ENV === 'production' ||
      (this.pickupGateway.mode() !== 'mock' && process.env.RETURN_PICKUP_SIMULATION_ENABLED !== 'true')) {
      throw new ForbiddenException('Mô phỏng vận chuyển chưa được bật');
    }
    const shipment = detail.shipments.find((item) => item.direction === ReturnShipmentDirection.CUSTOMER_TO_SHOP);
    if (!shipment?.provider) throw new ConflictException('Chưa có đơn lấy hàng tự động');
    await this.applyCarrierStatus(shipment.trackingNumber, status, shipment.provider);
    return this.getOne(userId, role, id);
  }

  async syncPickup(userId: string, role: UserRole, id: string) {
    const detail = await this.scopedDetail(userId, role, id);
    if (role !== UserRole.SYSTEM_ADMIN && role !== UserRole.SYSTEM_MANAGER) this.requireShop(userId, role, detail);
    const shipment = detail.shipments.find((item) => item.direction === ReturnShipmentDirection.CUSTOMER_TO_SHOP);
    if (!shipment || shipment.provider !== 'GHN_STAGING') throw new ConflictException('Hồ sơ không có vận đơn GHN Staging');
    const status = await this.pickupGateway.status(shipment.trackingNumber);
    await this.applyCarrierStatus(shipment.trackingNumber, status, 'GHN_STAGING');
    return this.getOne(userId, role, id);
  }

  async handleGhnWebhook(secret: string | undefined, payload: { OrderCode?: string; Status?: string; ShopID?: number }) {
    const expected = process.env.GHN_STAGING_WEBHOOK_SECRET;
    if (!expected || !secret || Buffer.byteLength(secret) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(secret), Buffer.from(expected))) {
      throw new UnauthorizedException('Webhook không hợp lệ');
    }
    if (this.pickupGateway.mode() !== 'staging' || payload.ShopID !== Number(process.env.GHN_STAGING_SHOP_ID)) {
      throw new UnauthorizedException('Webhook không thuộc tài khoản GHN Staging');
    }
    if (!payload.OrderCode || !payload.Status) throw new BadRequestException('Thiếu thông tin vận đơn');
    await this.applyCarrierStatus(payload.OrderCode, payload.Status, 'GHN_STAGING');
    return { received: true };
  }

  private async applyCarrierStatus(trackingNumber: string, status: string, provider: string) {
    const shipment = await this.prisma.returnShipment.findFirst({
      where: { trackingNumber, provider, direction: ReturnShipmentDirection.CUSTOMER_TO_SHOP },
      include: { returnRequest: { include: detailInclude } },
    });
    if (!shipment) return; // GHN may send the create callback before the local booking transaction commits.
    const ranks: Record<string, number> = {
      ready_to_pick: 0, picking: 1, money_collect_picking: 1,
      picked: 2, storing: 3, sorting: 4, transporting: 5,
      delivering: 6, money_collect_delivering: 6, delivery_fail: 6,
      waiting_to_return: 6, return: 6, return_transporting: 6,
      return_sorting: 6, returning: 6, return_fail: 6,
      delivered: 7, returned: 7, cancel: 7, exception: 7, lost: 7, damage: 7, scrap: 7,
    };
    const incomingRank = ranks[status];
    if (shipment.providerStatus === 'delivered' || incomingRank === undefined ||
      incomingRank < (ranks[shipment.providerStatus || 'ready_to_pick'] ?? 0) ||
      status === shipment.providerStatus) return;
    const onRoute = ['picked', 'storing', 'sorting', 'transporting', 'delivering', 'money_collect_delivering', 'delivered'].includes(status);
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.returnShipment.updateMany({
        where: { id: shipment.id, version: shipment.version },
        data: {
          providerStatus: status,
          version: { increment: 1 },
          ...(onRoute && !shipment.pickedUpAt ? { pickedUpAt: new Date() } : {}),
          ...(status === 'delivered' ? { receivedAt: new Date() } : {}),
        },
      });
      if (updated.count !== 1) return;
      const request = shipment.returnRequest;
      if (onRoute && request.status === ReturnRequestStatus.PICKUP_BOOKED) {
        await this.move(tx, request.id, ReturnRequestStatus.PICKUP_BOOKED, ReturnRequestStatus.RETURN_SHIPPED, null);
        await this.notify(tx, request, request.customerId, 'RETURN_PICKED_UP', 'Đơn vị vận chuyển đã lấy hàng',
          `Đơn ${request.order.externalOrderSn}: kiện hàng đang trên đường về Shop.`);
      }
      if (status === 'delivered' && (request.status === ReturnRequestStatus.PICKUP_BOOKED || request.status === ReturnRequestStatus.RETURN_SHIPPED)) {
        await this.move(tx, request.id, ReturnRequestStatus.RETURN_SHIPPED, ReturnRequestStatus.RETURN_RECEIVED, null, { receivedAt: new Date() });
        for (const recipient of [request.customerId, request.order.store.ownerId]) {
          await this.notify(tx, request, recipient, 'RETURN_RECEIVED', 'Kiện hàng trả đã đến Shop',
            `Đơn ${request.order.externalOrderSn}: Shop có thể bắt đầu kiểm tra.`);
        }
      }
      if (['delivery_fail', 'return_fail', 'cancel', 'exception', 'lost', 'damage', 'scrap'].includes(status)) {
        for (const recipient of [request.customerId, request.order.store.ownerId]) {
          await this.notify(tx, request, recipient, 'RETURN_PICKUP_PROBLEM', 'Đơn hàng trả gặp sự cố vận chuyển',
            `Đơn ${request.order.externalOrderSn}: GHN báo ${status}. Vui lòng liên hệ hỗ trợ.`);
        }
      }
      await tx.returnEvent.create({ data: { returnRequestId: request.id, type: 'PICKUP_PROVIDER_STATUS', data: { provider, status, trackingNumber } } });
    });
  }

  async setInstructions(
    userId: string,
    role: UserRole,
    id: string,
    input: InstructionsInput,
  ) {
    const detail = await this.scopedDetail(userId, role, id);
    this.requireShop(userId, role, detail);
    if (
      detail.status !== ReturnRequestStatus.SHOP_APPROVED ||
      detail.shipByAt
    ) {
      throw new ConflictException(
        'Chỉ được cấp hướng dẫn một lần sau khi duyệt',
      );
    }
    await this.prisma.$transaction(async (tx) => {
      const changed = await tx.returnRequest.updateMany({
        where: {
          id,
          status: ReturnRequestStatus.SHOP_APPROVED,
          shipByAt: null,
        },
        data: {
          returnAddress: input.returnAddress,
          returnInstructions: input.returnInstructions,
          shipByAt: new Date(Date.now() + SHIP_WINDOW_MS),
        },
      });
      if (changed.count !== 1)
        throw new ConflictException('Hướng dẫn đã được cập nhật trước đó');
      await tx.returnEvent.create({
        data: {
          returnRequestId: id,
          actorId: userId,
          type: 'RETURN_INSTRUCTIONS_SET',
        },
      });
      await this.notify(
        tx,
        detail,
        detail.customerId,
        'RETURN_INSTRUCTIONS',
        'Hướng dẫn gửi hàng trả',
        `Đơn ${detail.order.externalOrderSn}: Shop đã cung cấp địa chỉ và hạn gửi hàng trả.`,
      );
    });
    return this.getOne(userId, role, id);
  }

  private validateReceipt(file?: Express.Multer.File) {
    if (!file?.buffer || file.size < 10 || file.size > MAX_RECEIPT_BYTES) {
      throw new BadRequestException(
        'Ảnh biên nhận phải có dung lượng từ 10 byte đến 5 MB',
      );
    }
    const bytes = file.buffer;
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const png = bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const webp =
      bytes.toString('ascii', 0, 4) === 'RIFF' &&
      bytes.toString('ascii', 8, 12) === 'WEBP';
    if (!jpeg && !png && !webp)
      throw new BadRequestException('Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP');
  }

  async submitShipment(
    userId: string,
    role: UserRole,
    id: string,
    input: ShipmentInput,
    file?: Express.Multer.File,
  ) {
    const initial = await this.scopedDetail(userId, role, id);
    this.requireCustomer(userId, initial);
    if (
      initial.status !== ReturnRequestStatus.SHOP_APPROVED ||
      !initial.shipByAt ||
      !initial.returnAddress
    ) {
      throw new ConflictException(
        'Shop chưa cấp hướng dẫn gửi trả hoặc hồ sơ không còn chờ gửi hàng',
      );
    }
    if (warehouseSchema.safeParse(initial.order.store.returnWarehouse).success) {
      throw new ConflictException('Hồ sơ này sử dụng lấy hàng tận nơi; vui lòng đặt lịch lấy hàng');
    }
    if (initial.shipByAt.getTime() <= Date.now())
      throw new ConflictException('Đã quá hạn gửi hàng trả');
    this.validateReceipt(file);

    // Cloudinary is external; upload before the DB transaction and compensate on failure.
    const uploaded = await this.cloudinary.uploadImage(
      file!,
      `scanms/returns/${id}/receipts`,
    );
    try {
      await this.prisma.$transaction(async (tx) => {
        const current = await tx.returnRequest.findFirst({
          where: { id, customerId: userId },
          include: detailInclude,
        });
        if (
          !current ||
          !current.shipByAt ||
          current.shipByAt.getTime() <= Date.now()
        ) {
          throw new ConflictException('Hồ sơ không còn trong hạn gửi hàng');
        }
        await this.move(
          tx,
          id,
          ReturnRequestStatus.SHOP_APPROVED,
          ReturnRequestStatus.RETURN_SHIPPED,
          userId,
        );
        await tx.returnShipment.create({
          data: {
            returnRequestId: id,
            direction: ReturnShipmentDirection.CUSTOMER_TO_SHOP,
            carrierName: input.carrierName,
            trackingNumber: input.trackingNumber,
            receiptImageUrl: uploaded.secureUrl,
          },
        });
        await this.notify(
          tx,
          current,
          current.order.store.ownerId,
          'RETURN_SHIPPED',
          'Khách đã gửi hàng trả',
          `Đơn ${current.order.externalOrderSn}: ${input.carrierName} · ${input.trackingNumber}`,
        );
      });
    } catch (error) {
      try {
        await this.cloudinary.deleteFile(uploaded.publicId);
      } catch (cleanupError) {
        this.logger.warn(`Không thể xóa ảnh biên nhận mồ côi: ${cleanupError}`);
      }
      throw error;
    }
    return this.getOne(userId, role, id);
  }

  async correctShipment(
    userId: string,
    role: UserRole,
    id: string,
    input: ShipmentInput,
  ) {
    const detail = await this.scopedDetail(userId, role, id);
    this.requireCustomer(userId, detail);
    if (detail.status !== ReturnRequestStatus.RETURN_SHIPPED) {
      throw new ConflictException(
        'Không thể sửa vận đơn ở trạng thái hiện tại',
      );
    }
    await this.prisma.$transaction(async (tx) => {
      const shipment = await tx.returnShipment.findUnique({
        where: {
          returnRequestId_direction: {
            returnRequestId: id,
            direction: ReturnShipmentDirection.CUSTOMER_TO_SHOP,
          },
        },
      });
      if (!shipment || shipment.receivedAt)
        throw new ConflictException('Shop đã nhận hàng hoặc chưa có vận đơn');
      if (shipment.provider) throw new ConflictException('Mã vận đơn tự động không thể sửa thủ công');
      const changed = await tx.returnShipment.updateMany({
        where: { id: shipment.id, version: shipment.version, receivedAt: null },
        data: {
          carrierName: input.carrierName,
          trackingNumber: input.trackingNumber,
          version: { increment: 1 },
        },
      });
      if (changed.count !== 1)
        throw new ConflictException('Vận đơn vừa được sửa; hãy tải lại');
      await tx.returnEvent.create({
        data: {
          returnRequestId: id,
          actorId: userId,
          type: 'TRACKING_CORRECTED',
          data: {
            oldCarrier: shipment.carrierName,
            oldTracking: shipment.trackingNumber,
            newCarrier: input.carrierName,
            newTracking: input.trackingNumber,
          },
        },
      });
      await this.notify(
        tx,
        detail,
        detail.order.store.ownerId,
        'RETURN_TRACKING_CORRECTED',
        'Khách đã sửa vận đơn trả hàng',
        `Đơn ${detail.order.externalOrderSn}: ${input.carrierName} · ${input.trackingNumber}`,
      );
    });
    return this.getOne(userId, role, id);
  }

  async confirmReceipt(userId: string, role: UserRole, id: string) {
    const detail = await this.scopedDetail(userId, role, id);
    this.requireShop(userId, role, detail);
    await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      await this.move(
        tx,
        id,
        ReturnRequestStatus.RETURN_SHIPPED,
        ReturnRequestStatus.RETURN_RECEIVED,
        userId,
        { receivedAt: now },
      );
      const changed = await tx.returnShipment.updateMany({
        where: {
          returnRequestId: id,
          direction: ReturnShipmentDirection.CUSTOMER_TO_SHOP,
          receivedAt: null,
        },
        data: { receivedAt: now },
      });
      if (changed.count !== 1)
        throw new ConflictException('Không tìm thấy kiện hàng cần xác nhận');
      await this.notify(
        tx,
        detail,
        detail.customerId,
        'RETURN_RECEIVED',
        'Shop đã nhận hàng trả',
        `Đơn ${detail.order.externalOrderSn}: Shop đã nhận kiện hàng để kiểm tra.`,
      );
    });
    return this.getOne(userId, role, id);
  }

  async startInspection(userId: string, role: UserRole, id: string) {
    const detail = await this.scopedDetail(userId, role, id);
    this.requireShop(userId, role, detail);
    await this.prisma.$transaction((tx) =>
      this.move(
        tx,
        id,
        ReturnRequestStatus.RETURN_RECEIVED,
        ReturnRequestStatus.INSPECTING,
        userId,
        { inspectionStartedAt: new Date() },
      ),
    );
    return this.getOne(userId, role, id);
  }

  async inspect(
    userId: string,
    role: UserRole,
    id: string,
    input: InspectionInput,
  ) {
    const detail = await this.scopedDetail(userId, role, id);
    this.requireShop(userId, role, detail);
    const target =
      input.resolution === 'REFUND'
        ? ReturnRequestStatus.REFUND_PENDING
        : input.resolution === 'EXCHANGE'
          ? ReturnRequestStatus.EXCHANGE_PENDING
          : ReturnRequestStatus.INSPECTION_REJECTED;
    await this.prisma.$transaction(async (tx) => {
      await this.move(tx, id, ReturnRequestStatus.INSPECTING, target, userId, {
        inspectionNotes: input.notes,
        inspectionCompletedAt: new Date(),
        resolution: input.resolution === 'REJECT' ? null : input.resolution,
      });
      if (target === ReturnRequestStatus.REFUND_PENDING) {
        // Existing requests are order-wide. Amount is server-calculated, never accepted from the browser.
        const amount = detail.order.finalAmount.minus(
          detail.order.refundedAmount,
        );
        if (amount.lessThanOrEqualTo(0))
          throw new ConflictException('Đơn hàng không còn số tiền có thể hoàn');
        const payment = detail.order.paymentTransactions.find(
          (p) => p.status === 'SUCCESS',
        );
        await tx.refund.create({
          data: {
            returnRequestId: id,
            amount,
            method: payment?.paymentMethod || 'MANUAL_REVIEW',
            idempotencyKey: `return:${id}`,
          },
        });
      }
      await this.notify(
        tx,
        detail,
        detail.customerId,
        'RETURN_INSPECTED',
        'Shop đã có kết quả kiểm tra',
        `Đơn ${detail.order.externalOrderSn}: ${input.notes}`,
      );
    });
    return this.getOne(userId, role, id);
  }

  async submitExchangeShipment(
    userId: string,
    role: UserRole,
    id: string,
    input: ShipmentInput,
  ) {
    const detail = await this.scopedDetail(userId, role, id);
    this.requireShop(userId, role, detail);
    await this.prisma.$transaction(async (tx) => {
      await this.move(
        tx,
        id,
        ReturnRequestStatus.EXCHANGE_PENDING,
        ReturnRequestStatus.EXCHANGE_SHIPPED,
        userId,
      );
      await tx.returnShipment.create({
        data: {
          returnRequestId: id,
          direction: ReturnShipmentDirection.SHOP_TO_CUSTOMER,
          carrierName: input.carrierName,
          trackingNumber: input.trackingNumber,
        },
      });
      await this.notify(
        tx,
        detail,
        detail.customerId,
        'RETURN_EXCHANGE_SHIPPED',
        'Shop đã gửi sản phẩm thay thế',
        `Đơn ${detail.order.externalOrderSn}: ${input.carrierName} · ${input.trackingNumber}`,
      );
    });
    return this.getOne(userId, role, id);
  }

  async confirmCompletion(userId: string, role: UserRole, id: string) {
    const detail = await this.scopedDetail(userId, role, id);
    this.requireCustomer(userId, detail);
    if (
      detail.status !== ReturnRequestStatus.EXCHANGE_SHIPPED &&
      detail.status !== ReturnRequestStatus.AWAITING_CUSTOMER_CONFIRMATION
    ) {
      throw new ConflictException('Chưa có kết quả đổi/hoàn để xác nhận');
    }
    if (
      detail.resolution === ReturnResolution.REFUND &&
      detail.refund?.status !== 'SUCCEEDED'
    ) {
      throw new ConflictException(
        'Khoản hoàn tiền chưa được xác nhận thành công',
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await this.move(
        tx,
        id,
        detail.status,
        ReturnRequestStatus.COMPLETED,
        userId,
        { completedAt: new Date() },
      );
      const orderChanged = await tx.order.updateMany({
        where: { id: detail.orderId, status: OrderStatus.RETURN_REQUESTED },
        data: {
          status:
            detail.resolution === ReturnResolution.REFUND
              ? OrderStatus.RETURNED
              : OrderStatus.COMPLETED,
        },
      });
      if (orderChanged.count !== 1)
        throw new ConflictException('Đơn hàng đã thay đổi trạng thái');
      await this.notify(
        tx,
        detail,
        detail.order.store.ownerId,
        'RETURN_COMPLETED',
        'Khách đã xác nhận hoàn tất đổi trả',
        `Đơn ${detail.order.externalOrderSn} đã hoàn tất.`,
      );
    });
    return this.getOne(userId, role, id);
  }

  async openDispute(
    userId: string,
    role: UserRole,
    id: string,
    input: DisputeInput,
  ) {
    const detail = await this.scopedDetail(userId, role, id);
    this.requireCustomer(userId, detail);
    const allowed: ReturnRequestStatus[] = [
      ReturnRequestStatus.SHOP_REJECTED,
      ReturnRequestStatus.EXPIRED,
      ReturnRequestStatus.INSPECTION_REJECTED,
      ReturnRequestStatus.REFUND_FAILED,
    ];
    const inspectionOverdue =
      (detail.status === ReturnRequestStatus.RETURN_RECEIVED ||
        detail.status === ReturnRequestStatus.INSPECTING) &&
      detail.receivedAt !== null &&
      detail.receivedAt.getTime() <= Date.now() - INSPECTION_SLA_MS &&
      detail.inspectionCompletedAt === null;
    if (
      (!allowed.includes(detail.status) && !inspectionOverdue) ||
      detail.dispute
    ) {
      throw new ConflictException('Hồ sơ không thể mở thêm khiếu nại');
    }
    await this.prisma.$transaction(async (tx) => {
      await this.move(
        tx,
        id,
        detail.status,
        ReturnRequestStatus.DISPUTED,
        userId,
        inspectionOverdue && !detail.inspectionEscalatedAt
          ? { inspectionEscalatedAt: new Date() }
          : undefined,
      );
      await tx.dispute.create({
        data: {
          returnRequestId: id,
          reason: input.reason,
          details: input.details,
        },
      });
      const orderChanged = await tx.order.updateMany({
        where: { id: detail.orderId, status: detail.order.status },
        data: { status: OrderStatus.DISPUTED },
      });
      if (orderChanged.count !== 1)
        throw new ConflictException('Đơn hàng đã thay đổi trạng thái');
      await this.notify(
        tx,
        detail,
        detail.order.store.ownerId,
        'RETURN_DISPUTED',
        'Khách đã khiếu nại hồ sơ đổi trả',
        `Đơn ${detail.order.externalOrderSn} cần phối hợp xử lý tranh chấp.`,
      );
      const admins = await tx.user.findMany({
        where: {
          role: { in: [UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER] },
          isActive: true,
          isDeleted: false,
        },
        select: { id: true },
      });
      for (const admin of admins) {
        await this.notify(
          tx,
          detail,
          admin.id,
          'RETURN_DISPUTED',
          'Có khiếu nại đổi trả mới',
          `Đơn ${detail.order.externalOrderSn} cần được phân xử.`,
        );
      }
    });
    return this.getOne(userId, role, id);
  }

  async listDisputes(role: UserRole) {
    if (role !== UserRole.SYSTEM_ADMIN && role !== UserRole.SYSTEM_MANAGER) {
      throw new ForbiddenException('Chỉ quản trị viên được xem khiếu nại');
    }
    const rows = await this.prisma.dispute.findMany({
      where: { status: 'OPEN' },
      include: { returnRequest: { include: detailInclude } },
      orderBy: { openedAt: 'asc' },
      take: 100,
    });
    return rows.map((row) => ({
      ...row,
      returnRequest: this.present(row.returnRequest),
    }));
  }

  async listStalledInspections(role: UserRole) {
    if (role !== UserRole.SYSTEM_ADMIN && role !== UserRole.SYSTEM_MANAGER) {
      throw new ForbiddenException(
        'Chỉ quản trị viên được xem hồ sơ quá hạn kiểm tra',
      );
    }
    const rows = await this.prisma.returnRequest.findMany({
      where: {
        status: {
          in: [
            ReturnRequestStatus.RETURN_RECEIVED,
            ReturnRequestStatus.INSPECTING,
          ],
        },
        receivedAt: { lte: new Date(Date.now() - INSPECTION_SLA_MS) },
        inspectionCompletedAt: null,
      },
      include: detailInclude,
      orderBy: { receivedAt: 'asc' },
      take: 100,
    });
    return rows.map((row) => this.present(row));
  }

  async resolveDispute(
    adminId: string,
    role: UserRole,
    disputeId: string,
    input: ResolveDisputeInput,
  ) {
    if (role !== UserRole.SYSTEM_ADMIN && role !== UserRole.SYSTEM_MANAGER) {
      throw new ForbiddenException('Chỉ quản trị viên được phân xử');
    }
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { returnRequest: { include: detailInclude } },
    });
    if (!dispute || dispute.status !== 'OPEN')
      throw new NotFoundException('Không có khiếu nại đang mở');
    const detail = dispute.returnRequest;
    if (
      input.ruling === 'UPHOLD_SHOP' &&
      detail.shipments.some(
        (shipment) =>
          shipment.direction === ReturnShipmentDirection.CUSTOMER_TO_SHOP &&
          shipment.receivedAt !== null,
      )
    ) {
      throw new ConflictException(
        'Shop đang giữ hàng khách trả; không thể đóng hồ sơ khi chưa có phương án trả lại hàng hoặc bồi hoàn',
      );
    }
    const target =
      input.ruling === 'APPROVE_REFUND'
        ? ReturnRequestStatus.REFUND_PENDING
        : input.ruling === 'APPROVE_EXCHANGE'
          ? ReturnRequestStatus.EXCHANGE_PENDING
          : ReturnRequestStatus.CLOSED;
    await this.prisma.$transaction(async (tx) => {
      await this.move(
        tx,
        detail.id,
        ReturnRequestStatus.DISPUTED,
        target,
        adminId,
        {
          resolution:
            input.ruling === 'APPROVE_REFUND'
              ? ReturnResolution.REFUND
              : input.ruling === 'APPROVE_EXCHANGE'
                ? ReturnResolution.EXCHANGE
                : null,
        },
      );
      const changed = await tx.dispute.updateMany({
        where: { id: disputeId, status: 'OPEN' },
        data: {
          status: 'RESOLVED',
          ruling: input.ruling,
          resolutionNotes: input.notes,
          resolvedAt: new Date(),
          resolvedById: adminId,
        },
      });
      if (changed.count !== 1)
        throw new ConflictException('Khiếu nại đã được phân xử');
      if (target === ReturnRequestStatus.REFUND_PENDING) {
        const amount = detail.order.finalAmount.minus(
          detail.order.refundedAmount,
        );
        if (amount.lessThanOrEqualTo(0))
          throw new ConflictException('Không còn số tiền có thể hoàn');
        await tx.refund.upsert({
          where: { returnRequestId: detail.id },
          create: {
            returnRequestId: detail.id,
            amount,
            method: 'MANUAL_REVIEW',
            idempotencyKey: `return:${detail.id}`,
          },
          update: {
            status: 'PENDING',
            failureReason: null,
            providerReference: null,
          },
        });
      }
      if (target === ReturnRequestStatus.CLOSED) {
        const orderChanged = await tx.order.updateMany({
          where: { id: detail.orderId, status: OrderStatus.DISPUTED },
          data: { status: detail.originalOrderStatus },
        });
        if (orderChanged.count !== 1)
          throw new ConflictException('Đơn hàng đã thay đổi trạng thái');
      } else {
        const orderChanged = await tx.order.updateMany({
          where: { id: detail.orderId, status: OrderStatus.DISPUTED },
          data: { status: OrderStatus.RETURN_REQUESTED },
        });
        if (orderChanged.count !== 1)
          throw new ConflictException('Đơn hàng đã thay đổi trạng thái');
      }
      await this.notify(
        tx,
        detail,
        detail.customerId,
        'RETURN_DISPUTE_RESOLVED',
        'Khiếu nại đổi trả đã được phân xử',
        `Đơn ${detail.order.externalOrderSn}: ${input.notes}`,
      );
      await this.notify(
        tx,
        detail,
        detail.order.store.ownerId,
        'RETURN_DISPUTE_RESOLVED',
        'Khiếu nại đổi trả đã được phân xử',
        `Đơn ${detail.order.externalOrderSn}: ${input.notes}`,
      );
    });
    return this.getOne(adminId, role, detail.id);
  }

  async escalateStalledInspectionsBatch(limit = 100): Promise<number> {
    const cutoff = new Date(Date.now() - INSPECTION_SLA_MS);
    const stalled = await this.prisma.returnRequest.findMany({
      where: {
        status: {
          in: [
            ReturnRequestStatus.RETURN_RECEIVED,
            ReturnRequestStatus.INSPECTING,
          ],
        },
        receivedAt: { lte: cutoff },
        inspectionCompletedAt: null,
        inspectionEscalatedAt: null,
      },
      select: {
        id: true,
        orderId: true,
        customerId: true,
        order: {
          select: {
            externalOrderSn: true,
            store: { select: { ownerId: true } },
          },
        },
      },
      take: limit,
    });
    let escalated = 0;
    for (const item of stalled) {
      try {
        const changed = await this.prisma.$transaction(async (tx) => {
          // Compare-and-swap makes repeated or concurrent scheduler runs idempotent.
          const result = await tx.returnRequest.updateMany({
            where: {
              id: item.id,
              status: {
                in: [
                  ReturnRequestStatus.RETURN_RECEIVED,
                  ReturnRequestStatus.INSPECTING,
                ],
              },
              receivedAt: { lte: cutoff },
              inspectionCompletedAt: null,
              inspectionEscalatedAt: null,
            },
            data: { inspectionEscalatedAt: new Date() },
          });
          if (result.count !== 1) return false;
          await tx.returnEvent.create({
            data: {
              returnRequestId: item.id,
              type: 'INSPECTION_SLA_ESCALATED',
            },
          });
          const admins = await tx.user.findMany({
            where: {
              role: { in: [UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER] },
              isActive: true,
              isDeleted: false,
            },
            select: { id: true },
          });
          for (const recipient of new Set([
            item.customerId,
            item.order.store.ownerId,
            ...admins.map((admin) => admin.id),
          ])) {
            await tx.notification.create({
              data: {
                userId: recipient,
                type: 'RETURN_INSPECTION_OVERDUE',
                title: 'Hồ sơ trả hàng quá hạn kiểm tra 48 giờ',
                message: `Đơn ${item.order.externalOrderSn}: Shop chưa hoàn tất kiểm tra hàng trả sau 48 giờ. Khách có thể gửi khiếu nại.`,
                data: { orderId: item.orderId, returnRequestId: item.id },
              },
            });
          }
          return true;
        });
        if (changed) escalated++;
      } catch (error) {
        this.logger.error(
          `Không thể cảnh báo quá hạn kiểm tra hồ sơ ${item.id}`,
          error,
        );
      }
    }
    return escalated;
  }

  async expireApprovedBatch(limit = 100): Promise<number> {
    const overdue = await this.prisma.returnRequest.findMany({
      where: {
        status: ReturnRequestStatus.SHOP_APPROVED,
        shipByAt: { lt: new Date() },
      },
      select: {
        id: true,
        orderId: true,
        customerId: true,
        originalOrderStatus: true,
        order: {
          select: {
            externalOrderSn: true,
            store: { select: { ownerId: true } },
          },
        },
      },
      take: limit,
    });
    let expired = 0;
    for (const item of overdue) {
      try {
        const changed = await this.prisma.$transaction(async (tx) => {
          const result = await tx.returnRequest.updateMany({
            where: {
              id: item.id,
              status: ReturnRequestStatus.SHOP_APPROVED,
              shipByAt: { lt: new Date() },
            },
            data: { status: ReturnRequestStatus.EXPIRED },
          });
          if (!result.count) return false;
          await tx.returnEvent.create({
            data: {
              returnRequestId: item.id,
              type: 'SHIPMENT_DEADLINE_EXPIRED',
            },
          });
          const orderChanged = await tx.order.updateMany({
            where: { id: item.orderId, status: OrderStatus.RETURN_REQUESTED },
            data: { status: item.originalOrderStatus },
          });
          if (orderChanged.count !== 1)
            throw new ConflictException('Đơn hàng đã thay đổi trạng thái');
          for (const recipient of [item.customerId, item.order.store.ownerId]) {
            await tx.notification.create({
              data: {
                userId: recipient,
                type: 'RETURN_EXPIRED',
                title: 'Hồ sơ đổi trả quá hạn đặt lấy hàng',
                message: `Đơn ${item.order.externalOrderSn} đã quá hạn đặt lấy hàng; có thể khiếu nại nếu cần.`,
                data: { orderId: item.orderId, returnRequestId: item.id },
              },
            });
          }
          return true;
        });
        if (changed) expired++;
      } catch (error) {
        this.logger.error(`Không thể hết hạn hồ sơ ${item.id}`, error);
      }
    }
    return expired;
  }
}
