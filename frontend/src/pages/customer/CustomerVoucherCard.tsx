import { Copy, Store, Tag } from "lucide-react";
import type { CustomerVoucher } from "../../hooks/useCustomerVouchers";
import { formatMoney } from "../../utils/marketplace.utils";
import { voucherExpiryState } from "../../utils/voucher-expiry.utils";

export function CustomerVoucherCard({
  voucher,
  now,
  copied,
  onCopy,
}: {
  voucher: CustomerVoucher;
  now: number;
  copied: boolean;
  onCopy(): void;
}) {
  const expired = voucherExpiryState(voucher.expiresAt, now) === "expired";
  return (
    <article className="space-y-3 rounded-2xl border border-[#EEDFC6] bg-white p-5">
      <div className="flex items-center gap-2 text-sm text-[#7D715E]">
        <Store size={16} />
        {voucher.benefitType === "SHIPPING" ? "Freeship toàn hệ thống" : voucher.store.name}
      </div>
      <h2 className="font-semibold">
        {voucher.benefitType === "SHIPPING" ? "Freeship khách mới · Tối đa 3 lượt" : voucher.collaborator?.fullName
          ? `Mã của ${voucher.collaborator.fullName}`
          : "Mã độc quyền KOL"}
      </h2>
      <p className="text-xl font-bold text-[#B88E4F]">
        Giảm{" "}
        {voucher.discountType === "PERCENTAGE"
          ? `${voucher.discountValue}%`
          : formatMoney(voucher.discountValue)}
      </p>
      <p className="text-xs text-[#7D715E]">
        Đơn từ {formatMoney(voucher.minimumOrderAmount)}
        {voucher.maximumDiscountAmount != null
          ? ` · Giảm tối đa ${formatMoney(voucher.maximumDiscountAmount)}`
          : ""}
      </p>
      <div className="flex items-center justify-between gap-3 rounded-xl bg-[#FBF5EB] p-3">
        <span className="flex items-center gap-2 font-mono font-bold">
          <Tag size={15} />
          {voucher.code}
        </span>
        <button
          type="button"
          disabled={expired}
          onClick={onCopy}
          className="flex items-center gap-2 rounded-lg border border-[#EEDFC6] bg-white px-3 py-2 text-xs disabled:opacity-50"
        >
          <Copy size={14} />
          {copied ? "Đã sao chép" : "Sao chép mã"}
        </button>
      </div>
      <p className="text-xs text-[#7D715E]">
        {voucher.expiresAt
          ? `Hạn dùng: ${new Date(voucher.expiresAt).toLocaleString("vi-VN")}`
          : "Theo điều kiện của mã"}
        . Tự nhập mã khi thanh toán.
      </p>
    </article>
  );
}
