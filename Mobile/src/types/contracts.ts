import { z } from "zod";

export const RoleSchema = z.enum([
  "CUSTOMER",
  "COLLABORATOR",
  "SHOP_MANAGER",
  "SYSTEM_MANAGER",
  "SYSTEM_ADMIN",
]);
export type Role = z.infer<typeof RoleSchema>;
export const roleLabels: Record<Role, string> = {
  CUSTOMER: "Khách mua hàng",
  COLLABORATOR: "Nhà sáng tạo KOC",
  SHOP_MANAGER: "Quản lý gian hàng",
  SYSTEM_MANAGER: "Vận hành sàn",
  SYSTEM_ADMIN: "Quản trị hệ thống",
};
export const UserSchema = z.object({
  id: z.string(),
  email: z.string(),
  fullName: z.string(),
  role: RoleSchema,
  avatarUrl: z.string().nullish(),
  storeId: z.string().nullish(),
});
export type User = z.infer<typeof UserSchema>;
export const StoreSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string().nullish(),
  logoUrl: z.string().nullish(),
  categoryName: z.string().nullish(),
  variantFields: z
    .array(z.object({ key: z.string(), label: z.string() }))
    .optional(),
});
export type Store = z.infer<typeof StoreSchema>;
export const BootstrapSchema = z.object({
  contractVersion: z.literal(1),
  serverTime: z.string(),
  actor: UserSchema,
  managedStores: z.array(StoreSchema),
  capabilities: z.array(z.string()),
  sessionPolicy: z.literal("REAUTHENTICATE_ON_EXPIRY"),
});
export type Bootstrap = z.infer<typeof BootstrapSchema>;
const MoneySchema = z.union([z.number(), z.string()]);
export const ProductSchema = z.object({
  id: z.string(),
  title: z.string(),
  sku: z.string().optional(),
  price: MoneySchema,
  originalPrice: MoneySchema.nullish(),
  imageUrl: z.string().nullish(),
  description: z.string().nullish(),
  categoryName: z.string().nullish(),
  stockQuantity: z.number().optional(),
  isActive: z.boolean().optional(),
  isAffiliateEnabled: z.boolean().optional(),
  sampleEnabled: z.boolean().optional(),
  sampleQuota: z.number().optional(),
  storeId: z.string().optional(),
  store: StoreSchema.nullish(),
  moderationStatus: z.string().optional(),
  moderationReason: z.string().nullish(),
  createdById: z.string().nullish(),
  submittedById: z.string().nullish(),
  ingredients: z.string().nullish(),
  origin: z.string().nullish(),
  labelInfo: z.string().nullish(),
  barcode: z.string().nullish(),
  packageWeight: z.number().nullish(),
  packageLength: z.number().nullish(),
  packageWidth: z.number().nullish(),
  packageHeight: z.number().nullish(),
  originProofLinks: z.array(z.string()).optional(),
  originProofImages: z.array(z.string()).optional(),
  labelProofLinks: z.array(z.string()).optional(),
  labelProofImages: z.array(z.string()).optional(),
  subImages: z.array(z.string()).optional(),
  soldCount: z.number().optional(),
  rating: MoneySchema.nullish(),
  reviewCount: z.number().optional(),
  variants: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        price: MoneySchema.nullish(),
        stockQuantity: z.number(),
        sku: z.string().optional(),
        attributes: z.record(z.string(), z.string()).nullish(),
        imageUrl: z.string().nullish(),
        isActive: z.boolean().optional(),
      }),
    )
    .optional(),
});
export type Product = z.infer<typeof ProductSchema>;
export const OrderSchema = z.object({
  id: z.string(),
  externalOrderSn: z.string(),
  status: z.string(),
  finalAmount: MoneySchema,
  totalAmount: MoneySchema.nullish(),
  subtotalAmount: MoneySchema.nullish(),
  shippingFee: MoneySchema.nullish(),
  discountAmount: MoneySchema.nullish(),
  paymentMethod: z.string().nullish(),
  paymentStatus: z.string().nullish(),
  createdAt: z.string(),
  customerName: z.string().nullish(),
  customerPhone: z.string().nullish(),
  customerEmail: z.string().nullish(),
  deliveredAt: z.string().nullish(),
  completedAt: z.string().nullish(),
  couponCodeSnapshot: z.string().nullish(),
  trackingNumber: z.string().nullish(),
  carrierName: z.string().nullish(),
  ghnEnvironment: z.enum(["LIVE", "TEST"]).nullish(),
  rawPayload: z
    .object({
      trackingNumber: z.string().nullish(),
      ghnOrderCode: z.string().nullish(),
      carrierName: z.string().nullish(),
      ghnEnvironment: z.enum(["LIVE", "TEST"]).nullish(),
      paymentMethod: z.string().nullish(),
      paymentStatus: z.string().nullish(),
      orderNotes: z.string().nullish(),
    })
    .nullish(),
  shippingAddress: z.string().nullish(),
  returnRequest: z.object({ id: z.string(), status: z.string() }).nullish(),
  productReviews: z
    .array(
      z.object({ id: z.string(), productId: z.string(), rating: z.number() }),
    )
    .optional(),
  store: StoreSchema.nullish(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        title: z.string(),
        quantity: z.number(),
        unitPrice: MoneySchema.optional(),
        imageUrl: z.string().nullish(),
        variantName: z.string().nullish(),
        variantId: z.string().nullish(),
      }),
    )
    .optional(),
  orderItems: z
    .array(
      z.object({
        id: z.string(),
        quantity: z.number(),
        productId: z.string().optional(),
        unitPrice: MoneySchema.optional(),
        variant: z
          .object({
            id: z.string(),
            name: z.string(),
            sku: z.string().nullish(),
          })
          .nullish(),
        product: z
          .object({
            id: z.string().optional(),
            title: z.string(),
            imageUrl: z.string().nullish(),
          })
          .nullish(),
      }),
    )
    .optional(),
});
export type Order = z.infer<typeof OrderSchema>;
export const CooperationSchema = z.object({
  id: z.string(),
  status: z.string(),
  requestedByKol: z.boolean(),
  storeId: z.string(),
  collaboratorId: z.string(),
  note: z.string().nullish(),
  store: StoreSchema.nullish(),
  collaborator: UserSchema.partial().nullish(),
});
export type Cooperation = z.infer<typeof CooperationSchema>;
export const DealSchema = z.object({
  id: z.string(),
  status: z.string(),
  productId: z.string().optional(),
  proposedCommissionRate: MoneySchema,
  approvedCommissionRate: MoneySchema.nullish(),
  targetRevenue: MoneySchema.nullish(),
  commitmentDays: z.number().optional(),
  scopeType: z.string().optional(),
  salesCommitment: z.string().nullish(),
  initiatedById: z.string().nullish(),
  initiatorRole: z.string().optional(),
  product: z.object({ id: z.string().optional(), title: z.string() }).nullish(),
  store: StoreSchema.partial().required({ name: true }).nullish(),
  collaborator: UserSchema.partial().nullish(),
  shortUrl: z.string().nullish(),
  vipVoucherCode: z.string().nullish(),
});
export type Deal = z.infer<typeof DealSchema>;
export const MessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  senderId: z.string(),
  mediaType: z.string().nullish(),
  mediaName: z.string().nullish(),
  messageText: z.string().nullish(),
  mediaUrl: z.string().nullish(),
  createdAt: z.string(),
  sender: z
    .object({
      id: z.string(),
      fullName: z.string(),
      role: z.string().optional(),
    })
    .nullish(),
});
export type Message = z.infer<typeof MessageSchema>;
export const ConversationSchema = z.object({
  id: z.string(),
  store: StoreSchema,
  collaborator: UserSchema.partial().nullish(),
  customer: UserSchema.partial().nullish(),
  _count: z.object({ chatMessages: z.number() }).optional(),
  lastMessageAt: z.string().optional(),
  // The conversation list selects a preview, not a full ChatMessage entity.
  chatMessages: z
    .array(MessageSchema.omit({ id: true, conversationId: true }))
    .optional(),
});
export type Conversation = z.infer<typeof ConversationSchema>;
export interface Page<T> {
  items: T[];
  page: number;
  totalPages: number;
  total: number;
}
export const PaginationSchema = z.object({
  page: z.number(),
  total: z.number(),
  totalPages: z.number(),
  limit: z.number().optional(),
});
export const statusLabels: Record<string, string> = {
  REQUESTED: "Chờ Shop xét duyệt",
  SHOP_APPROVED: "Đã duyệt · chờ lấy hàng",
  SHOP_REJECTED: "Shop đã từ chối",
  PICKUP_BOOKED: "Đã đặt lịch lấy hàng",
  RETURN_SHIPPED: "Đang chuyển về Shop",
  RETURN_RECEIVED: "Shop đã nhận hàng trả",
  INSPECTING: "Đang kiểm tra hàng trả",
  INSPECTION_REJECTED: "Từ chối sau kiểm tra",
  REFUND_PENDING: "Chờ hoàn tiền",
  REFUND_PROCESSING: "Đang hoàn tiền",
  REFUND_FAILED: "Hoàn tiền gặp lỗi",
  EXCHANGE_PENDING: "Chờ gửi sản phẩm đổi",
  EXCHANGE_SHIPPED: "Đang giao sản phẩm đổi",
  AWAITING_CUSTOMER_CONFIRMATION: "Chờ khách xác nhận hoàn tất",
  SHIPPED: "Đã gửi hàng",
  RECEIVED: "Đã nhận hàng mẫu",
  VIDEO_SUBMITTED: "Chờ nghiệm thu video",
  REVISION_REQUIRED: "Cần sửa video",
  OVERDUE: "Quá hạn",
  DELIVERY_ISSUE: "Sự cố giao nhận",
  EXPIRED: "Hết hạn",
  ACTIVE: "Đang hoạt động",
  PAUSED: "Tạm dừng",
  BLOCKED: "Đã khóa",
  PROCESSING: "Đang xử lý",
  SUCCEEDED: "Thành công",
  FAILED: "Gặp lỗi",
  PAID: "Đã chi trả",
  REVERSED: "Đã thu hồi",
  INVITED: "Chờ phản hồi lời mời",
  ACCEPTED: "Đã chấp nhận",
  CLOSED: "Đã đóng hồ sơ",
  REFUNDED: "Đã hoàn tiền",
  OPEN: "Đang chờ phân xử",
  RESOLVED: "Đã phân xử",
  DRAFT: "Chờ kiểm duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  PENDING: "Chờ xử lý",
  PENDING_APPROVAL: "Chờ Shop duyệt",
  DELETED: "Đã xóa",
  SHIPPING: "Đang giao",
  DELIVERED: "Đã giao",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
  PENDING_ADMIN_APPROVAL: "Chờ Admin duyệt",
  RETURN_REQUESTED: "Yêu cầu đổi trả",
  DISPUTED: "Khiếu nại",
};
export const statusText = (status: string) => statusLabels[status] || status;
export const money = (value: string | number | null | undefined) =>
  value == null
    ? "Chưa có dữ liệu"
    : `${Number(value).toLocaleString("vi-VN")} đ`;
