import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { WalletsService } from '../wallets/wallets.service';
import { CommissionRulesService } from '../commission-rules/commission-rules.service';
import { timingSafeEqual } from 'crypto';
import {
  CommissionStatus,
  OrderStatus,
  Prisma,
  ReturnRequestStatus,
  ReturnRefundStatus,
  ReturnResolution,
  ReturnShipmentDirection,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { CacheService } from '../../core/cache/cache.service';
import { managedStoreWhere } from '../../common/policies/store-access.policy';
import { CloudinaryService } from '../../core/cloudinary/cloudinary.service';
import { assertReturnTransition } from './return-state.machine';
import {
  assertShippingPackage,
  buildShippingPackage,
} from '../shipping/shipping-package';
import { PickupGateway } from './pickup.gateway';
import { configuredReturnWarehouse } from './return.schemas';
import {
  advanceGhnClaim,
  latestGhnClaim,
  type GhnClaimSnapshot,
} from './ghn-compensation-claim';
import type {
  BookPickupInput,
  DisputeInput,
  InspectionInput,
  InstructionsInput,
  LiabilityAssessmentInput,
  ResolveDisputeInput,
  ShipmentInput,
  ShopEscalationInput,
  GhnClaimActionInput,
  WarehouseInput,
} from './return.schemas';

const exchangeProductSelect = {
  title: true,
  imageUrl: true,
  packageWeight: true,
  packageLength: true,
  packageWidth: true,
  packageHeight: true,
} satisfies Prisma.ProductSelect;
const exchangeVariantSelect = {
  name: true,
  attributes: true,
} satisfies Prisma.ProductVariantSelect;
const detailInclude = {
  order: {
    select: {
      id: true,
      externalOrderSn: true,
      status: true,
      customerName: true,
      customerPhone: true,
      shippingAddress: true,
      rawPayload: true,
      finalAmount: true,
      refundedAmount: true,
      orderItems: {
        include: {
          product: { select: exchangeProductSelect },
          variant: { select: exchangeVariantSelect },
        },
      },
      customerId: true,
      store: {
        select: {
          id: true,
          ownerId: true,
          name: true,
          returnWarehouse: true,
          onboardingData: true,
          staffMembers: {
            where: {
              role: UserRole.SHOP_MANAGER,
              isActive: true,
              isDeleted: false,
            },
            select: { id: true },
          },
        },
      },
      paymentTransactions: {
        select: { paymentMethod: true, status: true },
        orderBy: { createdAt: 'desc' as const },
      },
      commissions: {
        select: { commissionAmount: true, status: true, availableAt: true },
      },
    },
  },
  items: {
    include: {
      orderItem: {
        include: {
          product: { select: exchangeProductSelect },
          variant: { select: exchangeVariantSelect },
        },
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

function originalGhnTracking(
  rawPayload: Prisma.JsonValue | null,
): string | null {
  if (
    !rawPayload ||
    typeof rawPayload !== 'object' ||
    Array.isArray(rawPayload)
  )
    return null;
  const code = (rawPayload as Record<string, unknown>).ghnOrderCode;
  return typeof code === 'string' && code.trim() ? code.trim() : null;
}

@Injectable()
export class ReturnService {
  private readonly logger = new Logger(ReturnService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly pickupGateway: PickupGateway = new PickupGateway(),
    @Optional() private readonly walletsService?: WalletsService,
    @Optional() private readonly cacheService?: CacheService,
    @Optional()
    private readonly commissionRulesService?: CommissionRulesService,
  ) {}

  /** Allocate the paid order total (including discounts and delivery) across original item value. */
  private returnAmount(detail: Detail): Prisma.Decimal {
    const remaining = detail.order.finalAmount.minus(
      detail.order.refundedAmount,
    );
    if (!detail.items?.length) return remaining; // Legacy order-wide requests.
    const original = detail.order.orderItems.reduce(
      (sum, item) => sum.add(item.unitPrice.mul(item.quantity)),
      new Prisma.Decimal(0),
    );
    const selected = detail.items.reduce(
      (sum, item) => sum.add(item.unitPrice.mul(item.quantity)),
      new Prisma.Decimal(0),
    );
    if (
      original.lessThanOrEqualTo(0) ||
      selected.greaterThanOrEqualTo(original)
    )
      return remaining;
    return Prisma.Decimal.min(
      remaining,
      detail.order.finalAmount
        .mul(selected)
        .div(original)
        .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
    );
  }

  private fullReturn(detail: Detail): boolean {
    if (!detail.items?.length) return true;
    return detail.order.orderItems.every((item) =>
      detail.items.some(
        (selected) =>
          selected.orderItemId === item.id &&
          selected.quantity === item.quantity,
      ),
    );
  }

  private scope(
    userId: string,
    role: UserRole,
  ): Prisma.ReturnRequestWhereInput {
    if (role === UserRole.CUSTOMER || role === UserRole.COLLABORATOR)
      return { customerId: userId };
    if (role === UserRole.SHOP_MANAGER)
      return {
        OR: [
          { customerId: userId },
          { order: { store: managedStoreWhere(userId) } },
        ],
      };
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
      (detail.order.store.ownerId !== userId &&
        !detail.order.store.staffMembers?.some(
          (member) => member.id === userId,
        ))
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

  private async openGhnClaim(
    tx: Prisma.TransactionClient,
    detail: Detail,
    actorId: string,
    replacementTrackingNumber?: string,
  ) {
    const originalTrackingNumber = originalGhnTracking(detail.order.rawPayload);
    if (!originalTrackingNumber || latestGhnClaim(detail.events)) return;
    const shopEvidence = detail.events.flatMap((event) => {
      if (
        event.type !== 'SHOP_EVIDENCE_SUBMITTED' ||
        !event.data ||
        typeof event.data !== 'object' ||
        Array.isArray(event.data)
      )
        return [];
      const urls = (event.data as Record<string, unknown>).evidenceUrls;
      return Array.isArray(urls)
        ? urls.filter((url): url is string => typeof url === 'string')
        : [];
    });
    const snapshot: GhnClaimSnapshot = {
      status: 'DRAFT',
      originalTrackingNumber,
      replacementTrackingNumber,
      evidenceUrls: [
        ...new Set(
          [
            ...(detail.imageUrls ?? []),
            detail.unboxingVideoUrl,
            ...shopEvidence,
          ].filter((url): url is string => Boolean(url)),
        ),
      ],
      updatedAt: new Date().toISOString(),
    };
    await tx.returnEvent.create({
      data: {
        returnRequestId: detail.id,
        actorId,
        type: 'GHN_COMPENSATION_CLAIM_OPENED',
        data: snapshot as unknown as Prisma.InputJsonValue,
      },
    });
  }

  private present(item: Detail, showPartnerIncome = false) {
    const { order, shipments, ...rest } = item;
    const outboundGhnTrackingNumber = originalGhnTracking(order.rawPayload);
    const commissions = order.commissions ?? [];
    const postedIncome = commissions.reduce(
      (sum, commission) => sum + Number(commission.commissionAmount),
      0,
    );
    const snapshotIncome = (item.items ?? []).reduce(
      (sum, line) => sum + Number(line.orderItem.calculatedCommissionAmount),
      0,
    );
    const exchange = shipments.find(
      (s) => s.direction === ReturnShipmentDirection.SHOP_TO_CUSTOMER,
    );
    const bookingPending = exchange?.providerStatus?.startsWith('booking');
    const bookingEvent = [...item.events]
      .reverse()
      .find((event) => event.type === 'EXCHANGE_BOOKING_REQUESTED');
    const savedBooking = bookingEvent?.data as {
      recipient?: BookPickupInput;
      warehouse?: WarehouseInput;
    } | null;
    const contact = item.pickupContact as Partial<BookPickupInput> | null;
    let exchangePackage: {
      weight: number;
      length: number;
      width: number;
      height: number;
    } | null = null;
    try {
      exchangePackage = buildShippingPackage(
        this.exchangeLines(item).map((line) => ({
          product: line.orderItem.product,
          variant: line.orderItem.variant,
          quantity: line.quantity,
        })),
      );
    } catch {
      /* Legacy products require the Shop to enter actual parcel measurements. */
    }
    return {
      ...rest,
      order: {
        id: order.id,
        externalOrderSn: order.externalOrderSn,
        storeName: order.store.name,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        shippingAddress: order.shippingAddress,
        outboundGhnTrackingNumber,
      },
      ...(showPartnerIncome
        ? {
            partnerIncome: {
              amount:
                order.refundedAmount.greaterThanOrEqualTo(order.finalAmount) ||
                (commissions.length > 0 &&
                  commissions.every(
                    (commission) =>
                      commission.status === CommissionStatus.REVERSED,
                  ))
                  ? 0
                  : commissions.length
                    ? postedIncome
                    : snapshotIncome,
              reversedAmount: order.refundedAmount.greaterThanOrEqualTo(
                order.finalAmount,
              )
                ? postedIncome || snapshotIncome
                : commissions.length > 0 &&
                    commissions.every(
                      (commission) =>
                        commission.status === CommissionStatus.REVERSED,
                    )
                  ? postedIncome
                  : 0,
              status: order.refundedAmount.greaterThanOrEqualTo(
                order.finalAmount,
              )
                ? 'REVERSED'
                : commissions.length
                  ? commissions.every(
                      (commission) =>
                        commission.status === CommissionStatus.REVERSED,
                    )
                    ? 'REVERSED'
                    : commissions.some(
                          (commission) =>
                            commission.status === CommissionStatus.PENDING,
                        )
                      ? 'PENDING'
                      : 'AVAILABLE'
                  : 'NOT_POSTED',
              availableAt:
                commissions.find(
                  (commission) =>
                    commission.status === CommissionStatus.PENDING,
                )?.availableAt ?? null,
            },
          }
        : {}),
      returnWarehouse: configuredReturnWarehouse(order.store.returnWarehouse),
      ...(showPartnerIncome ? { ghnClaim: latestGhnClaim(item.events) } : {}),
      pickupProviderMode: this.pickupGateway.mode(),
      pickupSimulationEnabled:
        process.env.NODE_ENV !== 'production' &&
        (this.pickupGateway.mode() === 'mock' ||
          process.env.RETURN_PICKUP_SIMULATION_ENABLED === 'true'),
      ...(showPartnerIncome
        ? {
            exchangeBooking: bookingPending
              ? {
                  pending: true,
                  recipient: savedBooking?.recipient ?? null,
                  warehouse: savedBooking?.warehouse ?? null,
                }
              : null,
            exchangeRecipient: {
              name: order.customerName || '',
              phone: order.customerPhone || '',
              address: order.shippingAddress || '',
              wardName:
                contact?.address === order.shippingAddress
                  ? contact.wardName || ''
                  : '',
              provinceName:
                contact?.address === order.shippingAddress
                  ? contact.provinceName || ''
                  : '',
              districtName:
                contact?.address === order.shippingAddress
                  ? contact.districtName || ''
                  : '',
            },
            exchangePackage,
          }
        : {}),
      customerShipment:
        shipments.find(
          (s) => s.direction === ReturnShipmentDirection.CUSTOMER_TO_SHOP,
        ) ?? null,
      exchangeShipment: bookingPending ? null : (exchange ?? null),
    };
  }

  async getOne(userId: string, role: UserRole, id: string) {
    const detail = await this.scopedDetail(userId, role, id);
    return this.present(
      detail,
      detail.customerId !== userId &&
        role !== UserRole.CUSTOMER &&
        role !== UserRole.COLLABORATOR,
    );
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
      order: { store: managedStoreWhere(userId) },
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
      items: records.map((record) => this.present(record, true)),
    };
  }

  async listForOversight(role: UserRole) {
    if (role !== UserRole.SYSTEM_ADMIN && role !== UserRole.SYSTEM_MANAGER)
      throw new ForbiddenException(
        'Chỉ vận hành hệ thống được xem hồ sơ đổi trả',
      );
    const records = await this.prisma.returnRequest.findMany({
      where: {
        status: {
          in: [
            ReturnRequestStatus.REQUESTED,
            ReturnRequestStatus.SHOP_APPROVED,
            ReturnRequestStatus.PICKUP_BOOKED,
            ReturnRequestStatus.RETURN_SHIPPED,
            ReturnRequestStatus.RETURN_RECEIVED,
            ReturnRequestStatus.INSPECTING,
            ReturnRequestStatus.EXCHANGE_PENDING,
            ReturnRequestStatus.REFUND_PENDING,
            // Failed refunds remain actionable for operations even without a customer dispute.
            ReturnRequestStatus.REFUND_FAILED,
            ReturnRequestStatus.AWAITING_CUSTOMER_CONFIRMATION,
          ],
        },
      },
      include: detailInclude,
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    return records.map((record) => this.present(record, true));
  }

  async listOversightQueue(
    role: UserRole,
    kind: 'active' | 'rejected' | 'ghn' | 'stalled' | 'disputes',
    page: number,
  ) {
    if (role !== UserRole.SYSTEM_ADMIN && role !== UserRole.SYSTEM_MANAGER)
      throw new ForbiddenException(
        'Chỉ vận hành hệ thống được xem hàng đợi đổi trả',
      );
    const pageSize = 20;
    const skip = (page - 1) * pageSize;
    if (kind === 'disputes') {
      const where: Prisma.DisputeWhereInput = { status: 'OPEN' };
      const [total, rows] = await this.prisma.$transaction([
        this.prisma.dispute.count({ where }),
        this.prisma.dispute.findMany({
          where,
          include: { returnRequest: { include: detailInclude } },
          orderBy: { openedAt: 'asc' },
          skip,
          take: pageSize,
        }),
      ]);
      return {
        total,
        page,
        pageSize,
        items: rows.map((row) => ({
          ...row,
          returnRequest: this.present(row.returnRequest, true),
        })),
      };
    }
    const where: Prisma.ReturnRequestWhereInput =
      kind === 'active'
        ? {
            status: {
              in: [
                ReturnRequestStatus.REQUESTED,
                ReturnRequestStatus.SHOP_APPROVED,
                ReturnRequestStatus.PICKUP_BOOKED,
                ReturnRequestStatus.RETURN_SHIPPED,
                ReturnRequestStatus.RETURN_RECEIVED,
                ReturnRequestStatus.INSPECTING,
                ReturnRequestStatus.EXCHANGE_PENDING,
                ReturnRequestStatus.REFUND_PENDING,
                ReturnRequestStatus.REFUND_FAILED,
                ReturnRequestStatus.AWAITING_CUSTOMER_CONFIRMATION,
              ],
            },
          }
        : kind === 'rejected'
          ? { status: ReturnRequestStatus.SHOP_REJECTED, dispute: { is: null } }
          : kind === 'ghn'
            ? { events: { some: { type: 'GHN_COMPENSATION_CLAIM_OPENED' } } }
            : {
                status: {
                  in: [
                    ReturnRequestStatus.RETURN_RECEIVED,
                    ReturnRequestStatus.INSPECTING,
                  ],
                },
                receivedAt: { lte: new Date(Date.now() - INSPECTION_SLA_MS) },
                inspectionCompletedAt: null,
              };
    const orderBy: Prisma.ReturnRequestOrderByWithRelationInput =
      kind === 'rejected'
        ? { shopRespondedAt: 'desc' }
        : kind === 'stalled'
          ? { receivedAt: 'asc' }
          : { updatedAt: 'desc' };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.returnRequest.count({ where }),
      this.prisma.returnRequest.findMany({
        where,
        include: detailInclude,
        orderBy,
        skip,
        take: pageSize,
      }),
    ]);
    return {
      total,
      page,
      pageSize,
      items: rows.map((row) => this.present(row, true)),
    };
  }

  async listHistory(role: UserRole, page = 1, query = '') {
    if (role !== UserRole.SYSTEM_ADMIN && role !== UserRole.SYSTEM_MANAGER)
      throw new ForbiddenException(
        'Chỉ vận hành hệ thống được xem lịch sử đổi trả',
      );

    const pageSize = 20;
    const search = query.trim().slice(0, 80);
    const where: Prisma.ReturnRequestWhereInput = {
      status: {
        in: [
          ReturnRequestStatus.COMPLETED,
          ReturnRequestStatus.REFUNDED,
          ReturnRequestStatus.CLOSED,
          ReturnRequestStatus.EXPIRED,
        ],
      },
      ...(search
        ? {
            order: {
              OR: [
                {
                  externalOrderSn: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  customerName: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
                { customerPhone: { contains: search } },
                {
                  store: {
                    name: { contains: search, mode: 'insensitive' as const },
                  },
                },
              ],
            },
          }
        : {}),
    };
    const [total, records] = await this.prisma.$transaction([
      this.prisma.returnRequest.count({ where }),
      this.prisma.returnRequest.findMany({
        where,
        include: detailInclude,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      total,
      page,
      pageSize,
      items: records.map((record) => this.present(record, true)),
    };
  }

  async assessLiability(
    userId: string,
    role: UserRole,
    id: string,
    input: LiabilityAssessmentInput,
  ) {
    if (role !== UserRole.SYSTEM_ADMIN && role !== UserRole.SYSTEM_MANAGER)
      throw new ForbiddenException(
        'Chỉ vận hành hệ thống được xác định trách nhiệm',
      );
    const detail = await this.scopedDetail(userId, role, id);
    if (
      input.liability === 'LOGISTICS_FAULT' &&
      !originalGhnTracking(detail.order.rawPayload)
    )
      throw new ConflictException(
        'Chưa có vận đơn GHN gốc để quy trách nhiệm cho GHN; cần đối chiếu chứng cứ hoặc chọn kết luận khác',
      );
    const latestAssessment = [...detail.events].reverse().find((event) => {
      const data = event.data as Record<string, unknown> | null;
      return (
        event.type === 'LIABILITY_ASSESSED' &&
        data?.source === 'SYSTEM_MANAGER_REVIEW'
      );
    });
    const latestData = latestAssessment?.data as Record<string, unknown> | null;
    if (
      latestData?.liability === input.liability &&
      latestData?.notes === input.notes
    )
      return this.getOne(userId, role, id);
    const assessable: ReturnRequestStatus[] = [
      ReturnRequestStatus.REQUESTED,
      ReturnRequestStatus.SHOP_APPROVED,
      ReturnRequestStatus.PICKUP_BOOKED,
      ReturnRequestStatus.RETURN_SHIPPED,
      ReturnRequestStatus.RETURN_RECEIVED,
      ReturnRequestStatus.INSPECTING,
    ];
    if (!assessable.includes(detail.status))
      throw new ConflictException('Hồ sơ đã qua bước xác định trách nhiệm');
    await this.prisma.$transaction(async (tx) => {
      const changed = await tx.returnRequest.updateMany({
        where: { id, status: { in: assessable } },
        data: { updatedAt: new Date() },
      });
      if (changed.count !== 1)
        throw new ConflictException('Hồ sơ vừa được xử lý; hãy tải lại');
      await tx.returnEvent.create({
        data: {
          returnRequestId: id,
          actorId: userId,
          type: 'LIABILITY_ASSESSED',
          data: {
            ...input,
            source: 'SYSTEM_MANAGER_REVIEW',
            ...(input.liability === 'LOGISTICS_FAULT'
              ? {
                  originalTrackingNumber: originalGhnTracking(
                    detail.order.rawPayload,
                  ),
                }
              : {}),
          },
        },
      });
    });
    return this.getOne(userId, role, id);
  }

  /** Serialize settlement entry points on the case/refund before re-reading their status. */
  private async lockedRefundDetail(tx: Prisma.TransactionClient, id: string) {
    const locked = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT r.id FROM return_requests r
      JOIN return_refunds f ON f.return_request_id = r.id
      WHERE r.id = ${id}::uuid FOR UPDATE OF r, f
    `;
    if (locked.length !== 1)
      throw new NotFoundException('Chưa có khoản hoàn tiền để xử lý');
    const current = await tx.returnRequest.findUnique({
      where: { id },
      include: detailInclude,
    });
    if (!current?.refund)
      throw new NotFoundException('Không tìm thấy hồ sơ hoàn tiền');
    return { ...current, refund: current.refund };
  }

  private async settleConfirmedRefund(
    tx: Prisma.TransactionClient,
    current: Detail,
    actorId: string,
    reason: string,
  ) {
    if (current.refund?.status === ReturnRefundStatus.SUCCEEDED) return;
    if (
      !current.refund ||
      (current.refund.status !== ReturnRefundStatus.PENDING &&
        current.refund.status !== ReturnRefundStatus.FAILED)
    )
      throw new ConflictException('Khoản hoàn tiền chưa sẵn sàng để xác nhận');
    if (!this.walletsService)
      throw new ServiceUnavailableException(
        'Dịch vụ ví chưa sẵn sàng để hoàn tiền',
      );
    if (!this.commissionRulesService)
      throw new ConflictException('Chưa cấu hình xử lý thu hồi thu nhập');
    const amount = this.returnAmount(current);
    if (amount.lessThanOrEqualTo(0) || !amount.equals(current.refund.amount))
      throw new ConflictException(
        'Số tiền hoàn không khớp số dư đơn hàng; cần đối soát thủ công',
      );
    // The accounting service locks the bonus ledger, then the order and checks
    // the remaining amount again. Keep that lock order for concurrent partial refunds.
    await this.commissionRulesService.handleRefundAdjustment(
      current.order.store.id,
      current.orderId,
      amount.toFixed(2),
      reason,
      actorId,
      undefined,
      tx,
      `return:${current.id}`,
      current.items.length
        ? current.items.map((item) => ({
            orderItemId: item.orderItemId,
            quantity: item.quantity,
          }))
        : undefined,
    );
    await this.walletsService.refundToWallet(
      tx,
      current.customerId,
      amount,
      current.orderId,
    );
    await tx.refund.update({
      where: { returnRequestId: current.id },
      data: {
        status: ReturnRefundStatus.SUCCEEDED,
        method: 'WALLET',
        processedAt: new Date(),
        failureReason: null,
      },
    });
  }

  async retryPendingRefund(userId: string, role: UserRole, id: string) {
    if (role !== UserRole.SYSTEM_ADMIN && role !== UserRole.SYSTEM_MANAGER)
      throw new ForbiddenException(
        'Chỉ vận hành hệ thống được xử lý lại khoản hoàn tiền',
      );
    if (!this.walletsService)
      throw new ServiceUnavailableException(
        'Dịch vụ ví chưa sẵn sàng để hoàn tiền',
      );

    await this.prisma.$transaction(async (tx) => {
      const current = await this.lockedRefundDetail(tx, id);
      if (current.refund.status === ReturnRefundStatus.SUCCEEDED) return;
      if (
        current.resolution !== ReturnResolution.REFUND ||
        (current.status !== ReturnRequestStatus.REFUND_PENDING &&
          current.status !== ReturnRequestStatus.REFUND_FAILED) ||
        (current.refund.status !== ReturnRefundStatus.PENDING &&
          current.refund.status !== ReturnRefundStatus.FAILED)
      )
        throw new ConflictException(
          'Khoản hoàn tiền không ở trạng thái có thể xử lý lại',
        );

      if (
        !current.events.some(
          (event) =>
            event.type === 'CUSTOMER_REFUND_CONFIRMED' &&
            event.actorId === current.customerId,
        )
      )
        throw new ConflictException(
          'Khách chưa xác nhận đồng ý hoàn tiền trong đơn hàng',
        );
      await this.settleConfirmedRefund(
        tx,
        current,
        userId,
        'Xử lý lại hoàn tiền đổi trả đã được khách xác nhận',
      );
      await this.move(
        tx,
        id,
        current.status,
        ReturnRequestStatus.REFUND_PROCESSING,
        userId,
      );
      await this.move(
        tx,
        id,
        ReturnRequestStatus.REFUND_PROCESSING,
        ReturnRequestStatus.AWAITING_CUSTOMER_CONFIRMATION,
        userId,
      );
      await tx.returnEvent.create({
        data: {
          returnRequestId: id,
          actorId: userId,
          type: 'REFUND_RETRY_SUCCEEDED',
          data: { amount: current.refund.amount.toString(), method: 'WALLET' },
        },
      });
      await this.notify(
        tx,
        current,
        current.customerId,
        'RETURN_REFUND_SUCCEEDED',
        'Đã hoàn tiền vào ví SCANMS',
        `Đơn ${current.order.externalOrderSn}: khoản hoàn tiền đã được ghi vào ví.`,
      );
    });
    return this.getOne(userId, role, id);
  }

  async saveWarehouse(
    userId: string,
    role: UserRole,
    id: string,
    input: WarehouseInput,
  ) {
    const detail = await this.scopedDetail(userId, role, id);
    this.requireShop(userId, role, detail);
    await this.prisma.$transaction(async (tx) => {
      const changed = await tx.store.updateMany({
        where: { id: detail.order.store.id, ...managedStoreWhere(userId) },
        data: { returnWarehouse: input },
      });
      if (changed.count !== 1)
        throw new ConflictException('Gian hàng đã thay đổi');
      // Existing approved requests can now book pickup without asking for an address per order.
      const waiting = await tx.returnRequest.findMany({
        where: {
          order: { storeId: detail.order.store.id },
          status: ReturnRequestStatus.SHOP_APPROVED,
          shipByAt: null,
        },
        select: {
          id: true,
          customerId: true,
          orderId: true,
          order: { select: { externalOrderSn: true } },
        },
      });
      for (const request of waiting) {
        const updated = await tx.returnRequest.updateMany({
          where: {
            id: request.id,
            status: ReturnRequestStatus.SHOP_APPROVED,
            shipByAt: null,
          },
          data: {
            returnAddress: input.address,
            returnInstructions:
              'Đóng gói sản phẩm và chờ đơn vị vận chuyển đến lấy tại địa chỉ đã xác nhận.',
            shipByAt: new Date(Date.now() + SHIP_WINDOW_MS),
          },
        });
        if (updated.count === 1) {
          await tx.returnEvent.create({
            data: {
              returnRequestId: request.id,
              actorId: userId,
              type: 'PICKUP_WAREHOUSE_READY',
            },
          });
          await tx.notification.create({
            data: {
              userId: request.customerId,
              type: 'RETURN_PICKUP_READY',
              title: 'Có thể đặt lấy hàng trả tại nhà',
              message: `Đơn ${request.order.externalOrderSn}: vui lòng xác nhận địa chỉ lấy hàng trong 7 ngày.`,
              data: { orderId: request.orderId, returnRequestId: request.id },
            },
          });
        }
      }
    });
    return this.getOne(userId, role, id);
  }

  async bookPickup(
    userId: string,
    role: UserRole,
    id: string,
    input: BookPickupInput,
  ) {
    const detail = await this.scopedDetail(userId, role, id);
    this.requireCustomer(userId, detail);
    if (detail.status === ReturnRequestStatus.PICKUP_BOOKED)
      return this.present(detail);
    const effectiveWarehouse = configuredReturnWarehouse(
      detail.order.store.returnWarehouse,
    );
    if (!effectiveWarehouse)
      throw new ConflictException(
        'Shop chưa cấu hình kho nhận hàng trả hợp lệ',
      );
    if (
      detail.status !== ReturnRequestStatus.SHOP_APPROVED ||
      !detail.shipByAt
    ) {
      throw new ConflictException('Hồ sơ chưa sẵn sàng đặt lấy hàng');
    }
    if (detail.shipByAt.getTime() <= Date.now())
      throw new ConflictException('Đã quá hạn đặt lấy hàng');
    const clientOrderCode = `SC-R-${id.replace(/-/g, '')}`;
    const booking = await this.pickupGateway.book({
      clientOrderCode,
      pickup: input,
      warehouse: effectiveWarehouse,
      content:
        detail.items
          .map((item) => `${item.orderItem.product.title} x${item.quantity}`)
          .join(', ') || 'Hàng trả SCANMS',
    });
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.returnRequest.findFirst({
        where: {
          id,
          customerId: userId,
          status: ReturnRequestStatus.SHOP_APPROVED,
        },
        include: detailInclude,
      });
      if (
        !current ||
        !current.shipByAt ||
        current.shipByAt.getTime() <= Date.now()
      ) {
        throw new ConflictException('Hồ sơ đã thay đổi; vui lòng tải lại');
      }
      await this.move(
        tx,
        id,
        ReturnRequestStatus.SHOP_APPROVED,
        ReturnRequestStatus.PICKUP_BOOKED,
        userId,
        {
          pickupContact: input,
          returnAddress: effectiveWarehouse.address,
        },
      );
      await tx.returnShipment.create({
        data: {
          returnRequestId: id,
          direction: ReturnShipmentDirection.CUSTOMER_TO_SHOP,
          carrierName: booking.carrierName,
          trackingNumber: booking.trackingNumber,
          provider: booking.provider,
          providerStatus: booking.providerStatus,
          clientOrderCode,
          feeAmount: booking.feeAmount,
          bookedAt: new Date(),
        },
      });
      await this.notify(
        tx,
        current,
        current.order.store.ownerId,
        'RETURN_PICKUP_BOOKED',
        'Khách đã đặt lấy hàng trả',
        `Đơn ${current.order.externalOrderSn}: vận đơn ${booking.trackingNumber}.`,
      );
      await this.notify(
        tx,
        current,
        current.customerId,
        'RETURN_PICKUP_BOOKED',
        'Đã đặt đơn lấy hàng trả',
        `Đơn ${current.order.externalOrderSn}: mã vận đơn ${booking.trackingNumber}.`,
      );
    });
    return this.getOne(userId, role, id);
  }

  async simulatePickup(
    userId: string,
    role: UserRole,
    id: string,
    status: 'picked' | 'delivered',
  ) {
    const detail = await this.scopedDetail(userId, role, id);
    if (role !== UserRole.SYSTEM_ADMIN && role !== UserRole.SYSTEM_MANAGER)
      this.requireShop(userId, role, detail);
    if (
      process.env.NODE_ENV === 'production' ||
      (this.pickupGateway.mode() !== 'mock' &&
        process.env.RETURN_PICKUP_SIMULATION_ENABLED !== 'true')
    ) {
      throw new ForbiddenException('Mô phỏng vận chuyển chưa được bật');
    }
    const shipment = detail.shipments.find(
      (item) => item.direction === ReturnShipmentDirection.CUSTOMER_TO_SHOP,
    );
    if (
      !shipment?.provider ||
      !['MOCK', 'GHN_STAGING'].includes(shipment.provider)
    )
      throw new ConflictException(
        'Chỉ mô phỏng vận đơn lấy hàng MOCK hoặc GHN Staging, không hỗ trợ vận đơn Production.',
      );
    await this.applyCarrierStatus(
      shipment.trackingNumber,
      status,
      shipment.provider,
    );
    return this.getOne(userId, role, id);
  }

  async syncPickup(userId: string, role: UserRole, id: string) {
    const detail = await this.scopedDetail(userId, role, id);
    if (role !== UserRole.SYSTEM_ADMIN && role !== UserRole.SYSTEM_MANAGER)
      this.requireShop(userId, role, detail);
    const shipment = detail.shipments.find(
      (item) => item.direction === ReturnShipmentDirection.CUSTOMER_TO_SHOP,
    );
    if (!shipment || shipment.provider !== 'GHN_STAGING')
      throw new ConflictException('Hồ sơ không có vận đơn GHN Staging');
    const status = await this.pickupGateway.status(shipment.trackingNumber);
    await this.applyCarrierStatus(
      shipment.trackingNumber,
      status,
      'GHN_STAGING',
    );
    return this.getOne(userId, role, id);
  }

  async handleGhnWebhook(
    secret: string | undefined,
    payload: { OrderCode?: string; Status?: string; ShopID?: number },
  ) {
    const expected = process.env.GHN_STAGING_WEBHOOK_SECRET;
    if (
      !expected ||
      !secret ||
      Buffer.byteLength(secret) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(secret), Buffer.from(expected))
    ) {
      throw new UnauthorizedException('Webhook không hợp lệ');
    }
    if (
      this.pickupGateway.mode() !== 'staging' ||
      payload.ShopID !==
        Number(process.env.GHN_STAGING_SHOP_ID || process.env.GHN_TEST_SHOP_ID)
    ) {
      throw new UnauthorizedException(
        'Webhook không thuộc tài khoản GHN Staging',
      );
    }
    if (!payload.OrderCode || !payload.Status)
      throw new BadRequestException('Thiếu thông tin vận đơn');
    await this.applyCarrierStatus(
      payload.OrderCode,
      payload.Status,
      'GHN_STAGING',
    );
    return { received: true };
  }

  private async applyCarrierStatus(
    trackingNumber: string,
    status: string,
    provider: string,
  ) {
    const shipment = await this.prisma.returnShipment.findFirst({
      where: {
        trackingNumber,
        provider,
      },
      include: { returnRequest: { include: detailInclude } },
    });
    if (!shipment) return; // GHN may send the create callback before the local booking transaction commits.
    const ranks: Record<string, number> = {
      ready_to_pick: 0,
      picking: 1,
      money_collect_picking: 1,
      picked: 2,
      storing: 3,
      sorting: 4,
      transporting: 5,
      delivering: 6,
      money_collect_delivering: 6,
      delivery_fail: 6,
      waiting_to_return: 6,
      return: 6,
      return_transporting: 6,
      return_sorting: 6,
      returning: 6,
      return_fail: 6,
      delivered: 7,
      returned: 7,
      cancel: 7,
      exception: 7,
      lost: 7,
      damage: 7,
      scrap: 7,
    };
    const incomingRank = ranks[status];
    if (
      shipment.providerStatus === 'delivered' ||
      incomingRank === undefined ||
      incomingRank < (ranks[shipment.providerStatus || 'ready_to_pick'] ?? 0) ||
      status === shipment.providerStatus
    )
      return;
    const onRoute = [
      'picked',
      'storing',
      'sorting',
      'transporting',
      'delivering',
      'money_collect_delivering',
      'delivered',
    ].includes(status);
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.returnShipment.updateMany({
        where: { id: shipment.id, version: shipment.version },
        data: {
          providerStatus: status,
          version: { increment: 1 },
          ...(onRoute && !shipment.pickedUpAt
            ? { pickedUpAt: new Date() }
            : {}),
          ...(status === 'delivered' &&
          shipment.direction === ReturnShipmentDirection.CUSTOMER_TO_SHOP
            ? { receivedAt: new Date() }
            : {}),
        },
      });
      if (updated.count !== 1) return;
      const request = shipment.returnRequest;
      if (shipment.direction === ReturnShipmentDirection.SHOP_TO_CUSTOMER) {
        await tx.returnEvent.create({
          data: {
            returnRequestId: request.id,
            type: 'EXCHANGE_PROVIDER_STATUS',
            data: { provider, status, trackingNumber },
          },
        });
        if (
          status === 'delivered' ||
          [
            'delivery_fail',
            'return_fail',
            'cancel',
            'exception',
            'lost',
            'damage',
            'scrap',
          ].includes(status)
        ) {
          for (const recipient of [
            request.customerId,
            request.order.store.ownerId,
          ])
            await this.notify(
              tx,
              request,
              recipient,
              status === 'delivered'
                ? 'RETURN_EXCHANGE_DELIVERED'
                : 'RETURN_EXCHANGE_PROBLEM',
              status === 'delivered'
                ? 'Hàng đổi đã được giao'
                : 'Hàng đổi gặp sự cố vận chuyển',
              status === 'delivered'
                ? `Đơn ${request.order.externalOrderSn}: khách vui lòng kiểm tra hàng đổi rồi xác nhận đã nhận.`
                : `Đơn ${request.order.externalOrderSn}: hãng vận chuyển báo ${status}. Hồ sơ vẫn mở để xử lý.`,
            );
        }
        return; // A carrier report never substitutes for the customer's receipt confirmation.
      }
      if (onRoute && request.status === ReturnRequestStatus.PICKUP_BOOKED) {
        await this.move(
          tx,
          request.id,
          ReturnRequestStatus.PICKUP_BOOKED,
          ReturnRequestStatus.RETURN_SHIPPED,
          null,
        );
        await this.notify(
          tx,
          request,
          request.customerId,
          'RETURN_PICKED_UP',
          'Đơn vị vận chuyển đã lấy hàng',
          `Đơn ${request.order.externalOrderSn}: kiện hàng đang trên đường về Shop.`,
        );
      }
      if (
        status === 'delivered' &&
        (request.status === ReturnRequestStatus.PICKUP_BOOKED ||
          request.status === ReturnRequestStatus.RETURN_SHIPPED)
      ) {
        await this.move(
          tx,
          request.id,
          ReturnRequestStatus.RETURN_SHIPPED,
          ReturnRequestStatus.RETURN_RECEIVED,
          null,
          { receivedAt: new Date() },
        );
        for (const recipient of [
          request.customerId,
          request.order.store.ownerId,
        ]) {
          await this.notify(
            tx,
            request,
            recipient,
            'RETURN_RECEIVED',
            'Kiện hàng trả đã đến Shop',
            `Đơn ${request.order.externalOrderSn}: Shop có thể bắt đầu kiểm tra.`,
          );
        }
      }
      if (
        [
          'delivery_fail',
          'return_fail',
          'cancel',
          'exception',
          'lost',
          'damage',
          'scrap',
        ].includes(status)
      ) {
        for (const recipient of [
          request.customerId,
          request.order.store.ownerId,
        ]) {
          await this.notify(
            tx,
            request,
            recipient,
            'RETURN_PICKUP_PROBLEM',
            'Đơn hàng trả gặp sự cố vận chuyển',
            `Đơn ${request.order.externalOrderSn}: GHN báo ${status}. Vui lòng liên hệ hỗ trợ.`,
          );
        }
      }
      await tx.returnEvent.create({
        data: {
          returnRequestId: request.id,
          type: 'PICKUP_PROVIDER_STATUS',
          data: { provider, status, trackingNumber },
        },
      });
    });
    await this.invalidateStoreOrders(shipment.returnRequest.order.store.id);
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
    if (configuredReturnWarehouse(initial.order.store.returnWarehouse)) {
      throw new ConflictException(
        'Hồ sơ này sử dụng lấy hàng tận nơi; vui lòng đặt lịch lấy hàng',
      );
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
      if (shipment.provider)
        throw new ConflictException(
          'Mã vận đơn tự động không thể sửa thủ công',
        );
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
    const managerAssessment = [...detail.events].reverse().find((event) => {
      const data = event.data as Record<string, unknown> | null;
      return (
        event.type === 'LIABILITY_ASSESSED' &&
        data?.source === 'SYSTEM_MANAGER_REVIEW'
      );
    });
    const reviewedLiability = (
      managerAssessment?.data as Record<string, unknown> | null
    )?.liability;
    if (reviewedLiability && reviewedLiability !== input.liability)
      throw new ConflictException(
        'Trách nhiệm phải khớp kết luận của System Manager',
      );
    if (
      input.liability === 'LOGISTICS_FAULT' &&
      reviewedLiability !== 'LOGISTICS_FAULT'
    )
      throw new ConflictException(
        'Lỗi vận chuyển cần System Manager xác minh trước khi Shop xử lý',
      );
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
      await tx.returnEvent.create({
        data: {
          returnRequestId: id,
          actorId: userId,
          type: 'LIABILITY_ASSESSED',
          data: {
            liability: input.liability,
            resolution: input.resolution,
            notes: input.notes,
          },
        },
      });
      if (
        input.liability === 'LOGISTICS_FAULT' &&
        target !== ReturnRequestStatus.INSPECTION_REJECTED
      ) {
        await this.openGhnClaim(tx, detail, userId);
      }
      if (target === ReturnRequestStatus.REFUND_PENDING) {
        // Amount is calculated from selected items on the server, never accepted from the browser.
        const amount = this.returnAmount(detail);
        if (amount.lessThanOrEqualTo(0))
          throw new ConflictException('Đơn hàng không còn số tiền có thể hoàn');
        await tx.refund.create({
          data: {
            returnRequestId: id,
            amount,
            method: 'WALLET',
            status: ReturnRefundStatus.PENDING,
            idempotencyKey: `return:${id}`,
          },
        });
        await this.move(
          tx,
          id,
          ReturnRequestStatus.REFUND_PENDING,
          ReturnRequestStatus.AWAITING_CUSTOMER_CONFIRMATION,
          userId,
        );
      }
      await this.notify(
        tx,
        detail,
        detail.customerId,
        'RETURN_INSPECTED',
        'Shop đã có kết quả kiểm tra',
        `Đơn ${detail.order.externalOrderSn}: ${input.notes}${target === ReturnRequestStatus.REFUND_PENDING ? ' Mở hồ sơ trong đơn để xác nhận đồng ý và nhận tiền hoàn vào ví.' : ''}`,
      );
    });
    return this.getOne(userId, role, id);
  }

  private exchangeLines(detail: Detail) {
    return detail.items?.length
      ? detail.items.map((line) => ({
          quantity: line.quantity,
          orderItem: line.orderItem,
        }))
      : detail.order.orderItems.map((orderItem) => ({
          quantity: orderItem.quantity,
          orderItem,
        }));
  }

  private async reserveExchangeStock(
    tx: Prisma.TransactionClient,
    detail: Detail,
  ) {
    for (const line of this.exchangeLines(detail).sort((a, b) =>
      a.orderItem.productId.localeCompare(b.orderItem.productId),
    )) {
      const quantity = line.quantity;
      const product = await tx.product.updateMany({
        where: {
          id: line.orderItem.productId,
          stockQuantity: { gte: quantity },
        },
        data: { stockQuantity: { decrement: quantity } },
      });
      if (product.count !== 1) {
        throw new ConflictException(
          'Sản phẩm không đủ tồn kho để giao hàng đổi',
        );
      }
      if (line.orderItem.variantId) {
        const variant = await tx.productVariant.updateMany({
          where: {
            id: line.orderItem.variantId,
            productId: line.orderItem.productId,
            stockQuantity: { gte: quantity },
          },
          data: { stockQuantity: { decrement: quantity } },
        });
        if (variant.count !== 1) {
          throw new ConflictException(
            'Biến thể không đủ tồn kho để giao hàng đổi',
          );
        }
      }
    }
  }

  private async invalidateStoreOrders(storeId: string) {
    if (!storeId || !this.cacheService) return;
    try {
      await this.cacheService.delPrefix(`orders:store:${storeId}:`);
    } catch (error) {
      this.logger.warn(
        'Đã lưu vận đơn nhưng chưa làm mới được cache danh sách đơn',
        error,
      );
    }
  }

  private async recordExchangeSent(
    tx: Prisma.TransactionClient,
    detail: Detail,
    userId: string,
    trackingNumber: string,
    carrierName: string,
    booked = false,
  ) {
    const id = detail.id;
    await tx.returnEvent.create({
      data: {
        returnRequestId: id,
        actorId: userId,
        type: 'EXCHANGE_INCOME_PRESERVED',
        data: {
          orderId: detail.orderId,
          replacementItems: this.exchangeLines(detail).map((line) => ({
            productId: line.orderItem.productId,
            variantId: line.orderItem.variantId,
            quantity: line.quantity,
          })),
        },
      },
    });
    const logisticsAssessment = [...detail.events].reverse().find((event) => {
      const data = event.data as Record<string, unknown> | null;
      return (
        event.type === 'LIABILITY_ASSESSED' &&
        ['SYSTEM_MANAGER_REVIEW', 'SYSTEM_MANAGER_ARBITRATION'].includes(
          String(data?.source),
        ) &&
        data?.liability === 'LOGISTICS_FAULT'
      );
    });
    const claim = latestGhnClaim(detail.events);
    if (claim && !claim.replacementTrackingNumber) {
      await tx.returnEvent.create({
        data: {
          returnRequestId: id,
          actorId: userId,
          type: 'GHN_COMPENSATION_CLAIM_UPDATED',
          data: {
            ...claim,
            replacementTrackingNumber: trackingNumber,
          },
        },
      });
    } else if (logisticsAssessment && !claim) {
      await this.openGhnClaim(tx, detail, userId, trackingNumber);
    }
    await this.notify(
      tx,
      detail,
      detail.customerId,
      'RETURN_EXCHANGE_SHIPPED',
      booked
        ? 'Đã tạo vận đơn giao sản phẩm thay thế'
        : 'Shop đã gửi sản phẩm thay thế',
      `Đơn ${detail.order.externalOrderSn}: ${carrierName} · ${trackingNumber}`,
    );
  }

  async bookExchangeShipment(
    userId: string,
    role: UserRole,
    id: string,
    input: BookPickupInput,
  ) {
    const detail = await this.scopedDetail(userId, role, id);
    this.requireShop(userId, role, detail);
    if (this.pickupGateway.mode() === 'disabled')
      throw new ServiceUnavailableException(
        'Chưa cấu hình dịch vụ giao hàng đổi',
      );
    assertShippingPackage(input);
    const clientOrderCode = `SC-X-${id.replace(/-/g, '')}`;
    const reservation = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM return_requests WHERE id = ${id}::uuid FOR UPDATE`;
      const current = await tx.returnRequest.findUnique({
        where: { id },
        include: detailInclude,
      });
      if (!current)
        throw new NotFoundException('Không tìm thấy hồ sơ đổi hàng');
      this.requireShop(userId, role, current);
      const existing = current.shipments.find(
        (s) => s.direction === ReturnShipmentDirection.SHOP_TO_CUSTOMER,
      );
      if (
        current.status === ReturnRequestStatus.EXCHANGE_SHIPPED &&
        existing &&
        !existing.providerStatus?.startsWith('booking')
      )
        return null;
      if (
        current.status !== ReturnRequestStatus.EXCHANGE_PENDING ||
        current.resolution !== ReturnResolution.EXCHANGE
      )
        throw new ConflictException('Hồ sơ chưa được duyệt đổi hàng');
      const savedEvent = [...current.events]
        .reverse()
        .find((event) => event.type === 'EXCHANGE_BOOKING_REQUESTED');
      const saved = savedEvent?.data as unknown as {
        recipient: BookPickupInput;
        warehouse: WarehouseInput;
      } | null;
      if (existing) {
        if (
          existing.clientOrderCode !== clientOrderCode ||
          !existing.providerStatus?.startsWith('booking') ||
          !saved
        )
          throw new ConflictException('Hồ sơ đã có vận đơn hàng đổi');
        if (
          (
            [
              'name',
              'phone',
              'address',
              'wardName',
              'provinceName',
              'districtName',
              'weight',
              'length',
              'width',
              'height',
            ] as const
          ).some((key) => (saved.recipient[key] ?? '') !== (input[key] ?? ''))
        )
          throw new ConflictException(
            'Đang đối chiếu lần đặt trước; hãy giữ nguyên thông tin và thử lại',
          );
        if (
          existing.provider !==
          (this.pickupGateway.mode() === 'mock' ? 'MOCK' : 'GHN_STAGING')
        )
          throw new ConflictException(
            'Môi trường vận chuyển đã thay đổi; cần khôi phục môi trường của lần đặt trước để đối chiếu',
          );
        if (
          existing.providerStatus === 'booking' &&
          existing.bookedAt &&
          Date.now() - existing.bookedAt.getTime() < 30000
        )
          throw new ConflictException(
            'Vận đơn đang được tạo; vui lòng chờ rồi tải lại hồ sơ',
          );
        await tx.returnShipment.update({
          where: { id: existing.id },
          data: { providerStatus: 'booking', bookedAt: new Date() },
        });
        return { current, warehouse: saved.warehouse, recovery: true };
      }
      const warehouse = configuredReturnWarehouse(
        current.order.store.returnWarehouse,
      );
      if (!warehouse)
        throw new ConflictException(
          'Shop cần lưu kho gửi hàng hợp lệ trước khi giao hàng đổi',
        );
      if (!this.exchangeLines(current).length)
        throw new ConflictException('Hồ sơ không có sản phẩm để đổi');
      await this.reserveExchangeStock(tx, current);
      await tx.returnShipment.create({
        data: {
          returnRequestId: id,
          direction: ReturnShipmentDirection.SHOP_TO_CUSTOMER,
          carrierName: 'Đang tạo vận đơn',
          trackingNumber: clientOrderCode,
          clientOrderCode,
          provider:
            this.pickupGateway.mode() === 'mock' ? 'MOCK' : 'GHN_STAGING',
          providerStatus: 'booking',
          bookedAt: new Date(),
        },
      });
      await tx.returnEvent.create({
        data: {
          returnRequestId: id,
          actorId: userId,
          type: 'EXCHANGE_BOOKING_REQUESTED',
          data: {
            recipient: input,
            warehouse,
            shippingPayer: 'SHOP',
            codAmount: 0,
          },
        },
      });
      return { current, warehouse, recovery: false };
    });
    if (!reservation) return this.getOne(userId, role, id);
    let booking: Awaited<ReturnType<PickupGateway['book']>>;
    try {
      // Reuse the configured carrier, reversing the return-pickup direction.
      // A stable client_order_code lets GHN recover a timed-out create without duplicates.
      booking = await this.pickupGateway.book({
        clientOrderCode,
        pickup: {
          ...reservation.warehouse,
          weight: input.weight,
          length: input.length,
          width: input.width,
          height: input.height,
        },
        warehouse: {
          name: input.name,
          phone: input.phone,
          address: input.address,
          wardName: input.wardName,
          provinceName: input.provinceName,
          ...(input.districtName ? { districtName: input.districtName } : {}),
        },
        content: `Hàng đổi ${reservation.current.order.externalOrderSn}: ${this.exchangeLines(
          reservation.current,
        )
          .map((line) => `${line.orderItem.product.title} x${line.quantity}`)
          .join(', ')}`,
      });
    } catch (error) {
      const response =
        error && typeof error === 'object' && 'getResponse' in error
          ? ((error as { getResponse(): unknown }).getResponse() as {
              code?: string;
            })
          : null;
      // A later auth/config failure cannot prove an earlier timed-out create
      // failed. Once acceptance is uncertain, keep the reserved stock for reconciliation.
      const rejected =
        !reservation.recovery &&
        (error instanceof ServiceUnavailableException ||
          response?.code === 'GHN_CREATE_REJECTED');
      await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM return_requests WHERE id = ${id}::uuid FOR UPDATE`;
        const current = await tx.returnRequest.findUnique({
          where: { id },
          include: detailInclude,
        });
        const pending = current?.shipments.find(
          (s) =>
            s.clientOrderCode === clientOrderCode &&
            s.providerStatus?.startsWith('booking'),
        );
        if (
          !current ||
          current.status !== ReturnRequestStatus.EXCHANGE_PENDING ||
          !pending
        )
          return;
        if (rejected) {
          for (const line of this.exchangeLines(current).sort((a, b) =>
            a.orderItem.productId.localeCompare(b.orderItem.productId),
          )) {
            await tx.product.update({
              where: { id: line.orderItem.productId },
              data: { stockQuantity: { increment: line.quantity } },
            });
            if (line.orderItem.variantId)
              await tx.productVariant.update({
                where: { id: line.orderItem.variantId },
                data: { stockQuantity: { increment: line.quantity } },
              });
          }
          await tx.returnShipment.delete({ where: { id: pending.id } });
        } else {
          // Carrier acceptance is unknown: preserve stock and address until the same booking is reconciled.
          await tx.returnShipment.update({
            where: { id: pending.id },
            data: { providerStatus: 'booking_retry' },
          });
        }
        await tx.returnEvent.create({
          data: {
            returnRequestId: id,
            actorId: userId,
            type: rejected
              ? 'EXCHANGE_BOOKING_REJECTED'
              : 'EXCHANGE_BOOKING_RETRY_REQUIRED',
          },
        });
      });
      throw error;
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM return_requests WHERE id = ${id}::uuid FOR UPDATE`;
      const current = await tx.returnRequest.findUnique({
        where: { id },
        include: detailInclude,
      });
      const pending = current?.shipments.find(
        (s) => s.clientOrderCode === clientOrderCode,
      );
      if (
        current?.status === ReturnRequestStatus.EXCHANGE_SHIPPED &&
        pending?.trackingNumber === booking.trackingNumber
      )
        return;
      if (
        !current ||
        current.status !== ReturnRequestStatus.EXCHANGE_PENDING ||
        !pending?.providerStatus?.startsWith('booking')
      )
        throw new ConflictException(
          'Vận đơn đã tạo nhưng hồ sơ vừa thay đổi; hãy tải lại để đối chiếu',
        );
      await tx.returnShipment.update({
        where: { id: pending.id },
        data: {
          carrierName: booking.carrierName,
          trackingNumber: booking.trackingNumber,
          provider: booking.provider,
          providerStatus: booking.providerStatus,
          feeAmount: booking.feeAmount,
          shippedAt: new Date(),
        },
      });
      await this.move(
        tx,
        id,
        ReturnRequestStatus.EXCHANGE_PENDING,
        ReturnRequestStatus.EXCHANGE_SHIPPED,
        userId,
      );
      await this.recordExchangeSent(
        tx,
        current,
        userId,
        booking.trackingNumber,
        booking.carrierName,
        true,
      );
    });
    await this.invalidateStoreOrders(detail.order.store.id);
    return this.getOne(userId, role, id);
  }

  async syncExchangeShipment(userId: string, role: UserRole, id: string) {
    const detail = await this.scopedDetail(userId, role, id);
    this.requireShop(userId, role, detail);
    const shipment = detail.shipments.find(
      (s) => s.direction === ReturnShipmentDirection.SHOP_TO_CUSTOMER,
    );
    if (
      shipment?.provider !== 'GHN_STAGING' ||
      detail.status !== ReturnRequestStatus.EXCHANGE_SHIPPED
    )
      throw new ConflictException(
        'Chưa có vận đơn GHN Staging hàng đổi để đồng bộ',
      );
    await this.applyCarrierStatus(
      shipment.trackingNumber,
      await this.pickupGateway.status(shipment.trackingNumber),
      'GHN_STAGING',
    );
    return this.getOne(userId, role, id);
  }

  async simulateExchangeShipment(
    userId: string,
    role: UserRole,
    id: string,
    status: 'picked' | 'delivered',
  ) {
    const detail = await this.scopedDetail(userId, role, id);
    this.requireShop(userId, role, detail);
    const shipment = detail.shipments.find(
      (s) => s.direction === ReturnShipmentDirection.SHOP_TO_CUSTOMER,
    );
    if (
      process.env.NODE_ENV === 'production' ||
      detail.status !== ReturnRequestStatus.EXCHANGE_SHIPPED ||
      !shipment ||
      !['MOCK', 'GHN_STAGING'].includes(shipment.provider || '') ||
      (this.pickupGateway.mode() !== 'mock' &&
        process.env.RETURN_PICKUP_SIMULATION_ENABLED !== 'true')
    )
      throw new ForbiddenException('Mô phỏng hàng đổi chưa được bật');
    await this.applyCarrierStatus(
      shipment.trackingNumber,
      status,
      shipment.provider!,
    );
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
    if (
      detail.shipments?.some(
        (s) => s.direction === ReturnShipmentDirection.SHOP_TO_CUSTOMER,
      )
    )
      throw new ConflictException(
        'Đã có lần đặt vận đơn hàng đổi; hãy đối chiếu hoặc thử lại lần đặt đó',
      );
    await this.prisma.$transaction(async (tx) => {
      await this.move(
        tx,
        id,
        ReturnRequestStatus.EXCHANGE_PENDING,
        ReturnRequestStatus.EXCHANGE_SHIPPED,
        userId,
      );
      await this.reserveExchangeStock(tx, detail);
      await tx.returnShipment.create({
        data: {
          returnRequestId: id,
          direction: ReturnShipmentDirection.SHOP_TO_CUSTOMER,
          carrierName: input.carrierName,
          trackingNumber: input.trackingNumber,
        },
      });
      await this.recordExchangeSent(
        tx,
        detail,
        userId,
        input.trackingNumber,
        input.carrierName,
      );
    });
    await this.invalidateStoreOrders(detail.order.store.id);
    return this.getOne(userId, role, id);
  }

  async confirmExchangeReceipt(userId: string, role: UserRole, id: string) {
    const detail = await this.scopedDetail(userId, role, id);
    this.requireCustomer(userId, detail);
    if (
      detail.status !== ReturnRequestStatus.EXCHANGE_SHIPPED ||
      detail.resolution !== ReturnResolution.EXCHANGE ||
      !detail.shipments.some(
        (shipment) =>
          shipment.direction === ReturnShipmentDirection.SHOP_TO_CUSTOMER,
      )
    ) {
      throw new ConflictException('Chưa có hàng đổi đang giao để xác nhận');
    }
    if (
      detail.shipments.some(
        (s) =>
          s.direction === ReturnShipmentDirection.SHOP_TO_CUSTOMER &&
          s.provider &&
          s.providerStatus !== 'delivered',
      )
    )
      throw new ConflictException('Vận đơn hàng đổi chưa báo giao thành công');
    await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      await this.move(
        tx,
        id,
        ReturnRequestStatus.EXCHANGE_SHIPPED,
        ReturnRequestStatus.AWAITING_CUSTOMER_CONFIRMATION,
        userId,
      );
      const changed = await tx.returnShipment.updateMany({
        where: {
          returnRequestId: id,
          direction: ReturnShipmentDirection.SHOP_TO_CUSTOMER,
          receivedAt: null,
        },
        data: { receivedAt: now },
      });
      if (changed.count !== 1)
        throw new ConflictException('Hàng đổi đã được xác nhận nhận trước đó');
      await this.notify(
        tx,
        detail,
        detail.order.store.ownerId,
        'RETURN_EXCHANGE_RECEIVED',
        'Khách đã nhận hàng đổi',
        `Đơn ${detail.order.externalOrderSn}: khách xác nhận đã nhận hàng thay thế.`,
      );
    });
    return this.getOne(userId, role, id);
  }

  async confirmCompletion(userId: string, role: UserRole, id: string) {
    const detail = await this.scopedDetail(userId, role, id);
    this.requireCustomer(userId, detail);
    const refund = detail.resolution === ReturnResolution.REFUND;
    // Pending/failed cases created before the confirmation gate remain recoverable by their owner.
    const confirmable: ReturnRequestStatus[] = refund
      ? [
          ReturnRequestStatus.AWAITING_CUSTOMER_CONFIRMATION,
          ReturnRequestStatus.REFUND_PENDING,
          ReturnRequestStatus.REFUND_FAILED,
          ReturnRequestStatus.COMPLETED,
        ]
      : [ReturnRequestStatus.AWAITING_CUSTOMER_CONFIRMATION];
    if (!confirmable.includes(detail.status))
      throw new ConflictException('Chưa có kết quả đổi/hoàn để xác nhận');
    if (
      !refund &&
      !detail.shipments.some(
        (shipment) =>
          shipment.direction === ReturnShipmentDirection.SHOP_TO_CUSTOMER &&
          shipment.receivedAt,
      )
    )
      throw new ConflictException('Khách chưa xác nhận đã nhận hàng đổi');

    await this.prisma.$transaction(async (tx) => {
      const current = refund ? await this.lockedRefundDetail(tx, id) : detail;
      this.requireCustomer(userId, current);
      if (refund && current.resolution !== ReturnResolution.REFUND)
        throw new ConflictException('Phương án xử lý đã thay đổi; hãy tải lại');
      if (
        refund &&
        current.status === ReturnRequestStatus.COMPLETED &&
        current.refund?.status === ReturnRefundStatus.SUCCEEDED
      )
        return;
      if (
        !confirmable.includes(current.status) ||
        current.status === ReturnRequestStatus.COMPLETED
      )
        throw new ConflictException('Hồ sơ đã thay đổi; hãy tải lại');
      if (
        refund &&
        current.status !== ReturnRequestStatus.AWAITING_CUSTOMER_CONFIRMATION
      ) {
        await this.move(
          tx,
          id,
          current.status,
          ReturnRequestStatus.REFUND_PROCESSING,
          userId,
        );
        await this.move(
          tx,
          id,
          ReturnRequestStatus.REFUND_PROCESSING,
          ReturnRequestStatus.AWAITING_CUSTOMER_CONFIRMATION,
          userId,
        );
      }
      await this.move(
        tx,
        id,
        ReturnRequestStatus.AWAITING_CUSTOMER_CONFIRMATION,
        ReturnRequestStatus.COMPLETED,
        userId,
        { completedAt: new Date() },
      );
      if (refund && current.refund?.status !== ReturnRefundStatus.SUCCEEDED) {
        await tx.returnEvent.create({
          data: {
            returnRequestId: id,
            actorId: userId,
            type: 'CUSTOMER_REFUND_CONFIRMED',
            data: {
              amount: current.refund?.amount.toString(),
              method: 'WALLET',
            },
          },
        });
        // Wallet credit, income clawback, acknowledgement and completion commit together.
        // Any error rolls everything back so the customer can safely retry.
        await this.settleConfirmedRefund(
          tx,
          current,
          userId,
          'Khách xác nhận đồng ý hoàn tiền đổi trả',
        );
        await this.notify(
          tx,
          current,
          current.customerId,
          'RETURN_REFUND_SUCCEEDED',
          'Đã hoàn tiền vào ví SCANMS',
          `Đơn ${current.order.externalOrderSn}: bạn đã xác nhận hoàn tiền; khoản hoàn đã được ghi vào ví.`,
        );
      }
      const orderChanged = await tx.order.updateMany({
        where: { id: current.orderId, status: OrderStatus.RETURN_REQUESTED },
        data: {
          status:
            refund && this.fullReturn(current)
              ? OrderStatus.RETURNED
              : OrderStatus.COMPLETED,
        },
      });
      if (orderChanged.count !== 1)
        throw new ConflictException('Đơn hàng đã thay đổi trạng thái');
      await this.notify(
        tx,
        current,
        current.order.store.ownerId,
        'RETURN_COMPLETED',
        'Khách đã xác nhận hoàn tất đổi trả',
        `Đơn ${current.order.externalOrderSn} đã hoàn tất.`,
      );
    });
    return this.getOne(userId, role, id);
  }

  /** Wallet refunds are already settled; a missing acknowledgement must not leave the order open forever. */
  async closeSettledRefundsBatch(limit = 100): Promise<number> {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const records = await this.prisma.returnRequest.findMany({
      where: {
        status: ReturnRequestStatus.AWAITING_CUSTOMER_CONFIRMATION,
        resolution: ReturnResolution.REFUND,
        refund: {
          is: {
            status: ReturnRefundStatus.SUCCEEDED,
            processedAt: { lte: cutoff },
          },
        },
      },
      include: detailInclude,
      take: limit,
      orderBy: { updatedAt: 'asc' },
    });
    for (const record of records) {
      await this.prisma.$transaction(async (tx) => {
        const changed = await tx.returnRequest.updateMany({
          where: {
            id: record.id,
            status: ReturnRequestStatus.AWAITING_CUSTOMER_CONFIRMATION,
          },
          data: {
            status: ReturnRequestStatus.COMPLETED,
            completedAt: new Date(),
          },
        });
        if (changed.count !== 1) return;
        await tx.order.updateMany({
          where: { id: record.orderId, status: OrderStatus.RETURN_REQUESTED },
          data: {
            status: this.fullReturn(record)
              ? OrderStatus.RETURNED
              : OrderStatus.COMPLETED,
          },
        });
        await tx.returnEvent.create({
          data: {
            returnRequestId: record.id,
            type: 'REFUND_AUTO_CLOSED',
            data: {
              reason:
                'Wallet refund settled for 7 days without customer acknowledgement',
            },
          },
        });
        await this.notify(
          tx,
          record,
          record.customerId,
          'RETURN_COMPLETED',
          'Hồ sơ hoàn tiền đã hoàn tất',
          `Đơn ${record.order.externalOrderSn}: khoản hoàn đã vào Ví SCANMS và hồ sơ được đóng sau 7 ngày.`,
        );
      });
    }
    return records.length;
  }

  async escalateShopRejection(
    userId: string,
    role: UserRole,
    id: string,
    input: ShopEscalationInput,
  ) {
    const detail = await this.scopedDetail(userId, role, id);
    this.requireShop(userId, role, detail);
    const startDispute =
      detail.status === ReturnRequestStatus.SHOP_REJECTED && !detail.dispute;
    const attachToDispute =
      detail.status === ReturnRequestStatus.DISPUTED &&
      detail.dispute?.status === 'OPEN';
    if (!startDispute && !attachToDispute)
      throw new ConflictException(
        'Hồ sơ không ở trạng thái có thể gửi bằng chứng cho Manager',
      );
    if (
      detail.events.filter((event) => event.type === 'SHOP_EVIDENCE_SUBMITTED')
        .length >= 10
    )
      throw new ConflictException(
        'Hồ sơ đã đạt giới hạn 10 lần bổ sung bằng chứng',
      );
    await this.prisma.$transaction(async (tx) => {
      if (attachToDispute) {
        const locked = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM return_requests WHERE id = ${id}::uuid FOR UPDATE
        `;
        if (locked.length !== 1)
          throw new NotFoundException('Không tìm thấy hồ sơ đổi trả');
        const current = await tx.returnRequest.findUnique({
          where: { id },
          select: {
            status: true,
            dispute: { select: { status: true } },
            events: {
              where: { type: 'SHOP_EVIDENCE_SUBMITTED' },
              select: { id: true },
            },
          },
        });
        if (
          current?.status !== ReturnRequestStatus.DISPUTED ||
          current.dispute?.status !== 'OPEN' ||
          current.events.length >= 10
        )
          throw new ConflictException(
            'Hồ sơ đã được xử lý hoặc đạt giới hạn bằng chứng; hãy tải lại',
          );
      }
      if (startDispute) {
        await this.move(
          tx,
          id,
          ReturnRequestStatus.SHOP_REJECTED,
          ReturnRequestStatus.DISPUTED,
          userId,
        );
        await tx.dispute.create({
          data: {
            returnRequestId: id,
            reason: 'SHOP_REQUESTED_REVIEW',
            details: input.details,
          },
        });
      }
      await tx.returnEvent.create({
        data: {
          returnRequestId: id,
          actorId: userId,
          type: 'SHOP_EVIDENCE_SUBMITTED',
          data: { details: input.details, evidenceUrls: input.evidenceUrls },
        },
      });
      if (startDispute) {
        const changed = await tx.order.updateMany({
          where: { id: detail.orderId, status: detail.order.status },
          data: { status: OrderStatus.DISPUTED },
        });
        if (changed.count !== 1)
          throw new ConflictException('Đơn hàng đã thay đổi trạng thái');
      }
      await this.notify(
        tx,
        detail,
        detail.customerId,
        'RETURN_DISPUTED',
        'Hồ sơ đổi trả được chuyển cho System Manager',
        `Đơn ${detail.order.externalOrderSn}: Shop đã gửi bằng chứng để System Manager xem xét. Chưa có kết luận bên chịu trách nhiệm.`,
      );
      const managers = await tx.user.findMany({
        where: {
          role: { in: [UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN] },
          isActive: true,
          isDeleted: false,
        },
        select: { id: true },
      });
      for (const manager of managers) {
        await this.notify(
          tx,
          detail,
          manager.id,
          'RETURN_DISPUTED',
          'Shop yêu cầu xác minh hồ sơ đổi trả',
          `Đơn ${detail.order.externalOrderSn}: kiểm tra bằng chứng Shop và khách trước khi kết luận lỗi vận chuyển hay hàng hóa.`,
        );
      }
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
      returnRequest: this.present(row.returnRequest, true),
    }));
  }

  async listGhnClaims(role: UserRole) {
    if (role !== UserRole.SYSTEM_ADMIN && role !== UserRole.SYSTEM_MANAGER)
      throw new ForbiddenException(
        'Chỉ vận hành hệ thống được xem yêu cầu bồi hoàn GHN',
      );
    const rows = await this.prisma.returnRequest.findMany({
      where: { events: { some: { type: 'GHN_COMPENSATION_CLAIM_OPENED' } } },
      include: detailInclude,
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    return rows.map((row) => this.present(row, true));
  }

  async listRejectedForReview(role: UserRole) {
    if (role !== UserRole.SYSTEM_ADMIN && role !== UserRole.SYSTEM_MANAGER)
      throw new ForbiddenException(
        'Chỉ vận hành hệ thống được xem hồ sơ Shop đã từ chối',
      );
    const rows = await this.prisma.returnRequest.findMany({
      where: {
        status: ReturnRequestStatus.SHOP_REJECTED,
        dispute: { is: null },
      },
      include: detailInclude,
      orderBy: { shopRespondedAt: 'desc' },
      take: 100,
    });
    return rows.map((row) => this.present(row, true));
  }

  async openRejectedReview(userId: string, role: UserRole, id: string) {
    if (role !== UserRole.SYSTEM_ADMIN && role !== UserRole.SYSTEM_MANAGER)
      throw new ForbiddenException('Chỉ vận hành hệ thống được mở phân xử');
    const detail = await this.scopedDetail(userId, role, id);
    if (detail.status !== ReturnRequestStatus.SHOP_REJECTED || detail.dispute)
      throw new ConflictException(
        'Hồ sơ không còn ở trạng thái Shop đã từ chối',
      );
    await this.prisma.$transaction(async (tx) => {
      await this.move(
        tx,
        id,
        ReturnRequestStatus.SHOP_REJECTED,
        ReturnRequestStatus.DISPUTED,
        userId,
      );
      await tx.dispute.create({
        data: {
          returnRequestId: id,
          reason: 'MANAGER_REVIEW_SHOP_REJECTION',
          details:
            detail.shopResponse ||
            'Manager mở phân xử hồ sơ sau khi Shop từ chối yêu cầu đổi trả.',
        },
      });
      const changed = await tx.order.updateMany({
        where: { id: detail.orderId, status: detail.order.status },
        data: { status: OrderStatus.DISPUTED },
      });
      if (changed.count !== 1)
        throw new ConflictException('Đơn hàng đã thay đổi; hãy tải lại');
      for (const recipient of new Set([
        detail.customerId,
        detail.order.store.ownerId,
      ])) {
        await this.notify(
          tx,
          detail,
          recipient,
          'RETURN_DISPUTED',
          'Manager đang xem xét quyết định đổi trả',
          `Đơn ${detail.order.externalOrderSn}: hồ sơ Shop từ chối đã được chuyển sang phân xử. Chưa có kết luận trách nhiệm.`,
        );
      }
    });
    return this.getOne(userId, role, id);
  }

  async updateGhnClaim(
    userId: string,
    role: UserRole,
    id: string,
    input: GhnClaimActionInput,
  ) {
    if (role !== UserRole.SYSTEM_ADMIN && role !== UserRole.SYSTEM_MANAGER)
      throw new ForbiddenException(
        'Chỉ vận hành hệ thống được đối soát bồi hoàn GHN',
      );
    await this.prisma.$transaction(async (tx) => {
      // The claim is an event stream. Lock its parent row so two managers cannot advance it twice.
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM return_requests WHERE id = ${id}::uuid FOR UPDATE
      `;
      if (locked.length !== 1)
        throw new NotFoundException('Không tìm thấy hồ sơ đổi trả');
      const detail = await tx.returnRequest.findUnique({
        where: { id },
        include: detailInclude,
      });
      if (!detail) throw new NotFoundException('Không tìm thấy hồ sơ đổi trả');
      const current = latestGhnClaim(detail.events);
      if (!current)
        throw new ConflictException(
          'Manager chưa kết luận lỗi GHN cho hồ sơ này',
        );
      const next = advanceGhnClaim(current, input);
      await tx.returnEvent.create({
        data: {
          returnRequestId: id,
          actorId: userId,
          type: 'GHN_COMPENSATION_CLAIM_UPDATED',
          data: {
            ...next,
            action: input.action,
          },
        },
      });
      await tx.returnRequest.update({
        where: { id },
        data: { updatedAt: new Date() },
      });
      await this.notify(
        tx,
        detail,
        detail.order.store.ownerId,
        'GHN_COMPENSATION_UPDATED',
        'Cập nhật bồi hoàn GHN',
        `Đơn ${detail.order.externalOrderSn}: yêu cầu GHN ${next.ghnReference || 'chưa gửi'} đang ở trạng thái ${next.status}.`,
      );
    });
    return this.getOne(userId, role, id);
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
    return rows.map((row) => this.present(row, true));
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
      input.liability === 'LOGISTICS_FAULT' &&
      !originalGhnTracking(detail.order.rawPayload)
    )
      throw new ConflictException(
        'Chưa có vận đơn GHN gốc để quy trách nhiệm cho GHN; cần đối chiếu chứng cứ hoặc chọn kết luận khác',
      );
    if (input.liability === 'LOGISTICS_FAULT' && input.ruling === 'UPHOLD_SHOP')
      throw new ConflictException(
        'Đã xác định lỗi GHN thì cần chọn hoàn tiền hoặc đổi hàng cho khách',
      );
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
      if (input.liability) {
        await tx.returnEvent.create({
          data: {
            returnRequestId: detail.id,
            actorId: adminId,
            type: 'LIABILITY_ASSESSED',
            data: {
              liability: input.liability,
              ruling: input.ruling,
              notes: input.notes,
              source: 'SYSTEM_MANAGER_ARBITRATION',
              ...(input.liability === 'LOGISTICS_FAULT'
                ? {
                    originalTrackingNumber: originalGhnTracking(
                      detail.order.rawPayload,
                    ),
                  }
                : {}),
            },
          },
        });
      }
      if (
        input.liability === 'LOGISTICS_FAULT' &&
        input.ruling !== 'UPHOLD_SHOP'
      ) {
        await this.openGhnClaim(tx, detail, adminId);
      }
      if (target === ReturnRequestStatus.REFUND_PENDING) {
        const amount = this.returnAmount(detail);
        if (amount.lessThanOrEqualTo(0))
          throw new ConflictException('Không còn số tiền có thể hoàn');
        await tx.refund.upsert({
          where: { returnRequestId: detail.id },
          create: {
            returnRequestId: detail.id,
            amount,
            method: 'WALLET',
            status: ReturnRefundStatus.PENDING,
            idempotencyKey: `return:${detail.id}`,
          },
          update: {
            amount,
            status: ReturnRefundStatus.PENDING,
            method: 'WALLET',
            processedAt: null,
            failureReason: null,
            providerReference: null,
          },
        });
        await this.move(
          tx,
          detail.id,
          ReturnRequestStatus.REFUND_PENDING,
          ReturnRequestStatus.AWAITING_CUSTOMER_CONFIRMATION,
          adminId,
        );
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
