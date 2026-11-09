import { useState } from "react";
import { authService } from "../../services/auth.service";
import {
  useCustomerVouchers,
  type CustomerVoucher,
} from "../../hooks/useCustomerVouchers";
import { toast } from "../../utils/toast";
import { CustomerVoucherCard } from "./CustomerVoucherCard";

export function CustomerVouchersTab() {
  const user = authService.getCurrentUser();
  const { vouchers, now, loading, error, retry } = useCustomerVouchers(
    user?.id,
  );
  const [copied, setCopied] = useState("");
  const copy = async (voucher: CustomerVoucher) => {
    try {
      await navigator.clipboard.writeText(voucher.code);
      setCopied(voucher.code);
      toast.success("Đã sao chép. Hãy tự nhập mã khi thanh toán.");
    } catch {
      toast.error(
        "Chưa sao chép được. Bạn có thể chọn mã và sao chép thủ công.",
      );
    }
  };
  return (
    <section className="space-y-4 text-[#1A1612]">
      <div>
        <h1 className="text-xl font-bold">Mã ưu đãi độc quyền KOL</h1>
        <p className="mt-2 text-sm text-[#7D715E]">
          Sao chép mã từ KOL và tự nhập khi thanh toán. Mã không được lưu vào
          tài khoản hoặc tự động áp dụng.
        </p>
      </div>
      {loading && <p role="status">Đang tải mã ưu đãi…</p>}
      {error && (
        <div role="alert" className="text-[#DC2626]">
          Chưa tải được mã ưu đãi.{" "}
          <button
            type="button"
            onClick={() => void retry()}
            className="underline"
          >
            Thử lại
          </button>
        </div>
      )}
      {!loading && !error && !vouchers.length && (
        <p className="rounded-xl border border-[#EAE4D7] bg-white p-6 text-[#7D715E]">
          Chưa có mã KOL đang khả dụng.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {vouchers.map((voucher) => (
          <CustomerVoucherCard
            key={voucher.id}
            voucher={voucher}
            now={now}
            copied={copied === voucher.code}
            onCopy={() => void copy(voucher)}
          />
        ))}
      </div>
    </section>
  );
}
