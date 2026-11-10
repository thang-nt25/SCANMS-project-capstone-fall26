import { useRef, useState } from "react";
import { X } from "lucide-react";
import type { CheckoutShopGroup } from "./CheckoutItemsSection";
import api from "@/services/api";

export interface AppliedShopVoucher {
  code: string;
  discountAmount: number;
  discountType?: string;
  storeId: string;
  storeName?: string;
}
/** Legacy fields remain compatible with old order presentation, never selectable here. */
export interface AppliedPlatformVoucher {
  storeId?: string;
  code: string;
  discountAmount: number;
  benefitType: "GOODS" | "SHIPPING";
}
export interface ScanmsCheckoutVoucherModalProps {
  isOpen: boolean;
  onClose(): void;
  onRequestSignIn?(): void;
  groups: CheckoutShopGroup[];
  shippingFeesByStore: Record<string, number>;
  totalShippingFee: number;
  rawGoodsSubtotal: number;
  customerPhone?: string;
  appliedShopCoupons: Record<string, AppliedShopVoucher>;
  appliedPlatformCoupon: AppliedPlatformVoucher | null;
  appliedShippingCoupon: AppliedPlatformVoucher | null;
  onApplyShopCoupon(
    storeId: string,
    voucher: {
      code: string;
      discountAmount: number;
      discountType?: string;
      storeName?: string;
    },
  ): void;
  onRemoveShopCoupon(storeId: string): void;
  onApplyPlatformCoupon(voucher: AppliedPlatformVoucher): void;
  onRemovePlatformCoupon(): void;
  onApplyShippingCoupon(voucher: AppliedPlatformVoucher): void;
  onRemoveShippingCoupon(): void;
}
export function ScanmsCheckoutVoucherModal({
  isOpen,
  onClose,
  groups,
  customerPhone,
  onApplyShopCoupon,
}: ScanmsCheckoutVoucherModalProps) {
  const [code, setCode] = useState(""),
    [storeId, setStoreId] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  if (!isOpen) return null;
  const target =
    groups.find((group) => group.store.id === storeId) || groups[0];
  const apply = async () => {
    if (lock.current || !target || !code.trim()) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await api.post("/coupons/validate", {
        code: code.trim().toUpperCase(),
        storeId: target.store.id,
        customerPhone: customerPhone?.trim() || undefined,
        items: target.items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
      });
      const result = response?.data?.data ?? response?.data ?? response;
      if (!result.valid || !Number.isFinite(Number(result.discountAmount)))
        throw new Error("Không xác nhận được mã KOL.");
      onApplyShopCoupon(target.store.id, {
        code: result.code,
        discountAmount: Number(result.discountAmount),
        discountType: result.discountType,
      });
      setCode("");
      onClose();
    } catch (caught: any) {
      setError(
        caught?.response?.data?.message || caught.message || "Mã không hợp lệ.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-kol-code"
        className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 text-[#1A1612]"
      >
        <header className="flex items-center justify-between">
          <h2 id="manual-kol-code" className="font-bold">
            Nhập mã ưu đãi KOL
          </h2>
          <button
            type="button"
            aria-label="Đóng"
            disabled={busy}
            onClick={onClose}
          >
            <X />
          </button>
        </header>
        <p className="text-sm text-[#7D715E]">
          Tự nhập mã đã sao chép từ KOL. Không lưu mã vào tài khoản hoặc cộng
          dồn voucher Shop/Sàn.
        </p>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void apply();
          }}
        >
          <label className="block text-sm">
            Gian hàng
            <select
              value={target?.store.id || ""}
              disabled={busy}
              onChange={(event) => setStoreId(event.target.value)}
              className="mt-1 w-full rounded-xl border border-[#EAE4D7] p-3"
            >
              {groups.map((group) => (
                <option key={group.store.id} value={group.store.id}>
                  {group.store.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Mã KOL
            <input
              value={code}
              disabled={busy}
              maxLength={20}
              autoComplete="off"
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              className="mt-1 w-full rounded-xl border border-[#EAE4D7] p-3 uppercase"
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-[#DC2626]">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || !target || !code.trim()}
            className="w-full rounded-xl bg-[#C59B58] p-3 font-semibold disabled:opacity-50"
          >
            {busy ? "Đang kiểm tra…" : "Áp dụng mã đã nhập"}
          </button>
        </form>
      </section>
    </div>
  );
}
