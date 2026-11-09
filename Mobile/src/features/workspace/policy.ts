import type { Role } from "../../types/contracts";

const all: readonly Role[] = [
  "CUSTOMER",
  "COLLABORATOR",
  "SHOP_MANAGER",
  "SYSTEM_MANAGER",
  "SYSTEM_ADMIN",
];
const operations: readonly Role[] = ["SYSTEM_MANAGER", "SYSTEM_ADMIN"];
export const modules = {
  dashboard: {
    title: "Tổng quan & hiệu suất",
    roles: all.filter((role) => role !== "CUSTOMER"),
  },
  cart: { title: "Giỏ hàng", roles: ["CUSTOMER"] },
  addresses: { title: "Sổ địa chỉ", roles: ["CUSTOMER", "COLLABORATOR"] },
  profile: { title: "Hồ sơ & bảo mật", roles: all },
  notifications: { title: "Thông báo", roles: all },
  wishlist: { title: "Sản phẩm yêu thích", roles: ["CUSTOMER"] },
  returns: {
    title: "Trả hàng & khiếu nại",
    roles: ["CUSTOMER", "SHOP_MANAGER", ...operations],
  },
  samples: {
    title: "Hàng mẫu & video review",
    roles: ["COLLABORATOR", "SHOP_MANAGER", ...operations],
  },
  marketing: { title: "Link tiếp thị & QR", roles: ["COLLABORATOR"] },
  "referral-oversight": {
    title: "Giám sát link tiếp thị",
    roles: ["SHOP_MANAGER", ...operations],
  },
  wallet: {
    title: "Ví & lịch sử giao dịch",
    roles: ["CUSTOMER", "COLLABORATOR", "SHOP_MANAGER"],
  },
  payouts: {
    title: "Duyệt yêu cầu rút tiền",
    roles: ["SHOP_MANAGER", ...operations],
  },
  pricing: {
    title: "Giá sàn & khuyến mãi",
    roles: ["SHOP_MANAGER", ...operations],
  },
  kyc: {
    title: "Hồ sơ xác minh KYC",
    roles: ["COLLABORATOR", "SHOP_MANAGER", ...operations],
  },
  reviews: {
    title: "Đánh giá & phản hồi",
    roles: ["SHOP_MANAGER", ...operations],
  },
  staff: { title: "Nhân sự & gian hàng", roles: ["SYSTEM_ADMIN"] },
  shop: { title: "Cài đặt gian hàng", roles: ["SHOP_MANAGER"] },
  "product-edit": { title: "Chỉnh sửa sản phẩm", roles: ["SHOP_MANAGER"] },
  storefront: {
    title: "Gian hàng đối tác",
    roles: ["CUSTOMER", "COLLABORATOR"],
  },
  social: { title: "Kênh xã hội & cấp bậc", roles: ["COLLABORATOR"] },
  audit: { title: "Nhật ký vận hành", roles: operations },
  coupons: { title: "Mã ưu đãi KOL", roles: all },
  "manual-orders": {
    title: "Tạo đơn & Import Excel",
    roles: ["SHOP_MANAGER", ...operations],
  },
  campaigns: {
    title: "Chiến dịch & lời mời",
    roles: ["COLLABORATOR", "SHOP_MANAGER", ...operations],
  },
  fraud: { title: "Giám sát rủi ro", roles: operations },
  identity: { title: "Thông tin định danh", roles: ["CUSTOMER"] },
  bonuses: {
    title: "Thưởng doanh số tháng",
    roles: ["COLLABORATOR", "SHOP_MANAGER"],
  },
} as const satisfies Record<string, { title: string; roles: readonly Role[] }>;
export type BusinessFeature = keyof typeof modules;
export type BusinessParams = {
  feature: BusinessFeature;
  id?: string;
  orderId?: string;
  productId?: string;
  storeId?: string;
  pendingOnly?: boolean;
  returnQueue?: "disputes";
};
export function canOpenModule(
  role: Role,
  feature: string,
): feature is BusinessFeature {
  return (
    Object.prototype.hasOwnProperty.call(modules, feature) &&
    (modules[feature as BusinessFeature].roles as readonly Role[]).includes(
      role,
    )
  );
}
export const canReviewVipExceptions = (role: Role) => role === "SYSTEM_ADMIN";
