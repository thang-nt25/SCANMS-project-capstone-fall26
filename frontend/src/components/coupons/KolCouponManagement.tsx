import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Check, Copy, Search, Tag, X, ChevronLeft, ChevronRight } from "lucide-react";
import api from "@/services/api";
import { authService } from "@/services/auth.service";
import {
  couponService,
  type CouponItem,
  type CouponStatus,
  type ApproveCouponPayload,
} from "@/services/coupon.service";
import { formatMoney } from "@/utils/marketplace.utils";
import { CouponOversightDetails, couponDate, couponExpiry, couponLimit } from "./CouponOversightDetails";

const labels: Record<string, string> = {
  PENDING_APPROVAL: "Chờ Shop duyệt",
  PENDING_ADMIN_APPROVAL: "Chờ Admin duyệt (>10%)",
  PENDING_BLOCK_APPROVAL: "Chờ duyệt ngừng",
  ACTIVE: "Đang áp dụng",
  PAUSED: "Tạm dừng",
  BLOCKED: "Đã khóa",
  EXPIRED: "Hết hạn",
  REJECTED: "Từ chối",
  DELETED: "Đã xóa",
};
const unwrap = (response: any) =>
  response?.data?.data ?? response?.data ?? response;
const button =
  "rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-4 py-2 text-sm text-[#231D15] disabled:opacity-50";
const input =
  "w-full rounded-xl border border-[#EAE4D7] bg-white px-3 py-2 text-sm text-[#1A1612]";
type Action = {
  item: CouponItem;
  kind: "APPROVE" | "POLICY" | "REJECT" | "BLOCK" | "UNBLOCK" | "DETAIL" | "ADMIN_APPROVE" | "ADMIN_REJECT" | "REVIEW_BLOCK";
};

/** Shared KOL-only oversight. Generic retail issuance and platform subsidy screens are retired. */
export function KolCouponManagement({ shop }: { shop: boolean }) {
  const user = authService.getCurrentUser();
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(1),
    [status, setStatus] = useState(""),
    [search, setSearch] = useState("");
  const [action, setAction] = useState<Action | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const stores = useQuery({
    queryKey: [user?.id, "coupon-managed-stores"],
    enabled: shop,
    queryFn: async () => {
      const actor = unwrap(await api.get("/auth/me"));
      const result: { id: string; name: string }[] = Array.isArray(actor.stores)
        ? actor.stores
        : [];
      if (actor.storeId && !result.some((row) => row.id === actor.storeId))
        result.push({ id: actor.storeId, name: "Gian hàng được phân công" });
      return result;
    },
  });
  const requestedStore = params.get("storeId");
  const storeId =
    stores.data?.find((row) => row.id === requestedStore)?.id ||
    stores.data?.[0]?.id;
  const list = useQuery({
    queryKey: [user?.id, "kol-coupons", storeId, shop, page, status, search],
    enabled: !shop || Boolean(storeId),
    queryFn: () =>
      shop
        ? couponService.getStoreCoupons(storeId!, {
            page,
            limit: 10,
            status: (status || undefined) as CouponStatus | undefined,
            search,
          })
        : couponService.getAdminCoupons({
            page,
            limit: 10,
            status: (status || undefined) as CouponStatus | undefined,
            search,
          }),
  });
  const pendingBlockCountQuery = useQuery({
    queryKey: [user?.id, "kol-coupons-pending-block-count"],
    enabled: !shop,
    queryFn: () =>
      couponService.getAdminCoupons({
        page: 1,
        limit: 1,
        status: "PENDING_BLOCK_APPROVAL",
      }),
  });
  const pendingBlockCount: number = pendingBlockCountQuery.data?.meta?.total ?? 0;
  const rows: CouponItem[] = list.data?.data || [];
  const defaultExpiryLocal = () => {
    const d = new Date(Date.now() + 14 * 86_400_000);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };
  const [terms, setTerms] = useState({
    discountType: "PERCENTAGE",
    discountValue: "10",
    minimumOrderAmount: "0",
    maximumDiscountAmount: "50000",
    expiresAt: defaultExpiryLocal(),
    reason: "",
  });
  const open = (next: Action) => {
    const item = next.item;
    setError("");
    setAction(next);
    setTerms({
      discountType: item.discountType,
      discountValue: String(item.discountValue),
      minimumOrderAmount: String(item.minimumOrderAmount ?? 0),
      maximumDiscountAmount: String(item.maximumDiscountAmount ?? 50000),
      expiresAt: item.expiresAt
        ? new Date(
            new Date(item.expiresAt).getTime() -
              new Date(item.expiresAt).getTimezoneOffset() * 60000,
          )
            .toISOString()
            .slice(0, 16)
        : defaultExpiryLocal(),
      reason: "",
    });
  };
  const submit = async () => {
    if (!action || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const { item, kind } = action;
      if (kind === "APPROVE" || kind === "POLICY") {
        const values = [
          "discountValue",
          "maximumDiscountAmount",
        ] as const;
        for (const field of values)
          if (
            !Number.isFinite(Number(terms[field])) ||
            Number(terms[field]) <= 0
          )
            throw new Error("Nhập đầy đủ mức giảm và trần giảm tối đa hợp lệ.");
        if (!terms.expiresAt || new Date(terms.expiresAt).getTime() <= Date.now())
          throw new Error("Vui lòng chọn ngày hết hạn chiến dịch hợp lệ ở tương lai.");
        if (
          !Number.isFinite(Number(terms.minimumOrderAmount)) ||
          Number(terms.minimumOrderAmount) < 0 ||
          (terms.discountType === "PERCENTAGE" &&
            (Number(terms.discountValue) < 3 || Number(terms.discountValue) > 20))
        )
          throw new Error("Voucher % phải từ 3% đến tối đa 20% (trên 10% chuyển Admin duyệt).");
        if (
          terms.discountType === "FIXED_AMOUNT" &&
          (Number(terms.discountValue) < 10000 ||
            Number(terms.minimumOrderAmount) <= 0 ||
            Number(terms.discountValue) / Number(terms.minimumOrderAmount) > 0.2)
        )
          throw new Error("Voucher cố định tối thiểu 10.000₫ và không vượt 20% đơn tối thiểu.");
        const maxDiscount = Number(terms.maximumDiscountAmount);
        const body: ApproveCouponPayload = {
          discountType: terms.discountType as "PERCENTAGE" | "FIXED_AMOUNT",
          discountValue: Number(terms.discountValue),
          minimumOrderAmount: Number(terms.minimumOrderAmount),
          ...(maxDiscount > 0 ? { maximumDiscountAmount: maxDiscount } : {}),
          expiresAt: new Date(terms.expiresAt).toISOString(),
          scopeType: item.scopeType,
          productIds: item.couponProducts?.map((row) => row.product.id),
          categoryNames: item.couponCategories?.map((row) => row.categoryName),
          fundingSource: "SHOP_FUNDED",
          shopFundingRate: 100,
          platformFundingRate: 0,
          stackableWithProductDiscount: Boolean(
            item.stackableWithProductDiscount,
          ),
        };
        if (kind === "APPROVE")
          await couponService.approveCoupon(item.storeId, item.id, body);
        else await couponService.updatePolicy(item.storeId, item.id, body);
      } else if (kind === "ADMIN_APPROVE") {
        await couponService.adminApproveException(item.id, true);
      } else if (kind === "UNBLOCK")
        await couponService.adminUnblockCoupon(item.id);
      else {
        if (terms.reason.trim().length < 5)
          throw new Error("Nhập lý do ít nhất 5 ký tự.");
        if (kind === "ADMIN_REJECT") {
          await couponService.adminApproveException(item.id, false, terms.reason.trim());
        } else if (kind === "REJECT")
          await couponService.rejectCoupon(
            item.storeId,
            item.id,
            terms.reason.trim(),
          );
        else if (shop)
          await couponService.blockCoupon(
            item.storeId,
            item.id,
            terms.reason.trim(),
          );
        else await couponService.adminBlockCoupon(item.id, terms.reason.trim());
      }
      setAction(null);
      await Promise.all([
        list.refetch(),
        !shop ? pendingBlockCountQuery.refetch() : Promise.resolve(),
      ]);
    } catch (caught: any) {
      setError(
        caught?.response?.data?.message ||
          caught.message ||
          "Chưa cập nhật được mã.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const submitReviewBlock = async (approve: boolean) => {
    if (!action || action.kind !== "REVIEW_BLOCK" || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await couponService.reviewBlockRequest(
        action.item.id,
        approve,
        terms.reason.trim() || undefined,
      );
      setAction(null);
      await Promise.all([
        list.refetch(),
        pendingBlockCountQuery.refetch(),
      ]);
    } catch (caught: any) {
      setError(
        caught?.response?.data?.message ||
          caught.message ||
          "Không thể xử lý yêu cầu ngừng mã.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const editing = action?.kind === "APPROVE" || action?.kind === "POLICY";
  return (
    <main className="space-y-5 text-[#1A1612]">
      <section aria-label="Bộ lọc mã ưu đãi KOL" className={`kol-coupon-filters grid w-full grid-cols-1 items-stretch gap-3 rounded-2xl border border-[#EAE4D7] bg-white p-3 ${shop ? 'sm:grid-cols-3' : 'sm:grid-cols-[minmax(0,1fr)_250px]'}`}>
        {shop && (
          <select
            aria-label="Gian hàng phụ trách"
            className={input + " h-11 min-w-0"}
            value={storeId || ""}
            onChange={(event) => {
              setParams({ storeId: event.target.value });
              setPage(1);
            }}
          >
            {stores.data?.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        )}
        <div className="relative min-w-0">
        <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7D715E]"/>
        <input
          aria-label="Tìm mã KOL"
          className={input + " h-11 min-w-0 !pl-10 outline-none focus:border-[#C59B58] focus:ring-2 focus:ring-[#FBF5EB]"}
          placeholder="Tìm mã độc quyền…"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        </div>
        <select
          aria-label="Trạng thái mã"
          className={input + " coupon-status-select h-11 min-w-0 outline-none focus:border-[#C59B58] focus:ring-2 focus:ring-[#FBF5EB]"}
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(labels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </section>
      {!shop && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {[
            { value: "", label: "Tất cả" },
            { value: "PENDING_BLOCK_APPROVAL", label: "Chờ duyệt ngừng", count: pendingBlockCount },
            { value: "ACTIVE", label: "Đang áp dụng" },
            { value: "BLOCKED", label: "Đã khóa" },
            { value: "EXPIRED", label: "Hết hạn" },
          ].map((pill) => {
            const active = status === pill.value;
            return (
              <button
                key={pill.value || "ALL"}
                type="button"
                onClick={() => {
                  setStatus(pill.value);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  active
                    ? "border-[#C59B58] bg-[#FBF5EB] text-[#1A1612] shadow-xs"
                    : "border-[#EAE4D7] bg-white text-[#7D715E] hover:border-[#C59B58]/60 hover:text-[#1A1612]"
                }`}
              >
                {pill.value === "PENDING_BLOCK_APPROVAL" && (pill.count ?? 0) > 0 && (
                  <span className="h-2 w-2 rounded-full bg-[#D97706]" aria-hidden="true" />
                )}
                <span>{pill.label}</span>
                {typeof pill.count === "number" && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    pill.count > 0 ? "bg-[#FEF3C7] text-[#92400E]" : "bg-[#F3EFE6] text-[#7D715E]"
                  }`}>
                    {pill.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
      {(list.error || stores.error) && (
        <p role="alert" className="text-[#DC2626]">
          Không tải được dữ liệu. Hãy làm mới hoặc kiểm tra quyền gian hàng.
        </p>
      )}
      {(list.isLoading || (shop && stores.isLoading)) && (
        <p role="status">Đang tải mã KOL…</p>
      )}
      {!list.isLoading && !rows.length && (
        <p className="rounded-2xl border border-[#EAE4D7] bg-white p-8 text-[#7D715E]">
          Chưa có mã KOL trong danh sách này.
        </p>
      )}
      <section className="kol-coupon-card-grid">
        {rows.map((item) => (
          <article key={item.id} className="kol-coupon-card">
            <header className="kol-coupon-card-header">
              <div className="kol-coupon-code"><Tag size={17}/><strong>{item.displayCode}</strong><button type="button" aria-label={`Sao chép mã ${item.displayCode}`} title={copiedId === item.id ? 'Đã sao chép' : 'Sao chép mã'} onClick={() => { void navigator.clipboard.writeText(item.displayCode).then(() => setCopiedId(item.id)).catch(() => setError('Không sao chép được mã.')); }}>{copiedId === item.id ? <Check size={15}/> : <Copy size={15}/>}</button></div>
              <span className={`kol-coupon-status status-${item.status.toLowerCase()}`}>{labels[item.status] || item.status}</span>
            </header>
            <div className="kol-coupon-owner"><strong>{item.collaborator?.fullName || 'Chưa có thông tin KOL'}</strong>{!shop && <span>{item.store?.name || 'Chưa có thông tin cửa hàng'}</span>}</div>
            {!shop && item.status==='PENDING_APPROVAL' && <p className="coupon-pending-shop">Chờ cửa hàng duyệt điều kiện và ngân sách mã.</p>}
            {item.status === "PENDING_BLOCK_APPROVAL" && (
              <div className="my-2 rounded-xl border border-amber-200 bg-[#FBF5EB] px-3 py-2 text-xs text-[#1A1612]">
                <p className="m-0 font-semibold text-[#92400E]">
                  Shop đề nghị ngừng mã · Chờ Vận hành xét duyệt
                </p>
                {item.blockedReason && (
                  <p className="mt-0.5 mb-0 text-[11px] text-[#7D715E] line-clamp-2">
                    Lý do: {item.blockedReason}
                  </p>
                )}
              </div>
            )}
            <dl className="kol-coupon-terms">
              <div><dt>Mức giảm</dt><dd>{item.discountType === 'PERCENTAGE' ? `${Number(item.discountValue)}%` : formatMoney(Number(item.discountValue))}</dd></div>
              <div><dt>Đơn tối thiểu</dt><dd>{Number(item.minimumOrderAmount ?? 0) === 0 ? 'Không yêu cầu' : formatMoney(Number(item.minimumOrderAmount))}</dd></div>
              <div><dt>Hết hạn</dt><dd>{couponExpiry(item)}</dd></div>
            </dl>
            <p className="kol-coupon-start">Bắt đầu: {couponDate(item.startsAt, 'Không ấn định')} · Giảm tối đa: {couponLimit(item.maximumDiscountAmount)}</p>
            <dl className="kol-coupon-stats">
              <div><dt>Lượt sử dụng</dt><dd>{item.usageCount} <span>/ {item.usageLimitTotal ?? 'Không giới hạn'}</span></dd><small>{item.usageLimitTotal == null ? 'Không giới hạn lượt' : `Còn ${Math.max(0, item.usageLimitTotal - item.usageCount)} lượt`}</small></div>
              <div><dt>Ngân sách đã dùng</dt><dd>{formatMoney(Number(item.budgetUsed))} <span>/ {couponLimit(item.budgetTotal)}</span></dd><small>{item.budgetTotal == null ? 'Không giới hạn ngân sách' : `Còn ${formatMoney(Math.max(0, Number(item.budgetTotal) - Number(item.budgetUsed)))}`}</small></div>
            </dl>
            <div className="kol-coupon-card-actions">
              <button
                type="button"
                className={button}
                onClick={() => open({ item, kind: "DETAIL" })}
              >
                Xem chi tiết
              </button>
              {shop && item.status === "PENDING_APPROVAL" && (
                <>
                  <button
                    type="button"
                    className={button}
                    onClick={() => open({ item, kind: "APPROVE" })}
                  >
                    Duyệt đề xuất
                  </button>
                  <button
                    type="button"
                    className={button}
                    onClick={() => open({ item, kind: "REJECT" })}
                  >
                    Từ chối
                  </button>
                </>
              )}
              {shop && ["ACTIVE", "PAUSED"].includes(item.status) && (
                <button
                  type="button"
                  className={button}
                  onClick={() => open({ item, kind: "POLICY" })}
                >
                  Sửa chính sách mã KOL
                </button>
              )}
              {["ACTIVE", "PAUSED"].includes(item.status) && (
                <button
                  type="button"
                  className={button + " coupon-block-action"}
                  onClick={() => open({ item, kind: "BLOCK" })}
                >
                  Khóa mã
                </button>
              )}
              {!shop && item.status === "PENDING_ADMIN_APPROVAL" && user?.role === "SYSTEM_ADMIN" && (
                <>
                  <button
                    type="button"
                    className={button + " !bg-[#C59B58] !text-[#231D15] font-semibold"}
                    onClick={() => open({ item, kind: "ADMIN_APPROVE" })}
                  >
                    Duyệt ngoại lệ (&gt;10%)
                  </button>
                  <button
                    type="button"
                    className={button}
                    onClick={() => open({ item, kind: "ADMIN_REJECT" })}
                  >
                    Từ chối
                  </button>
                </>
              )}
              {!shop && item.status === "PENDING_BLOCK_APPROVAL" && (
                <button
                  type="button"
                  className={button + " !bg-[#C59B58] !border-[#B88E4F] !text-[#1A1612] font-semibold cursor-pointer"}
                  onClick={() => open({ item, kind: "REVIEW_BLOCK" })}
                >
                  Xem &amp; Duyệt ngừng
                </button>
              )}
              {!shop && item.status === "BLOCKED" && (
                <button
                  type="button"
                  className={button}
                  onClick={() => open({ item, kind: "UNBLOCK" })}
                >
                  Mở khóa
                </button>
              )}
            </div>
          </article>
        ))}
      </section>
      <nav className="kol-coupon-pagination" aria-label="Phân trang mã ưu đãi">
        <span className="coupon-page-count">{list.data?.meta?.total ? `${(page-1)*10+1}–${(page-1)*10+rows.length} / ${list.data.meta.total} mã` : `${rows.length} mã`}<small>10 mã mỗi trang</small></span>
        <div className="coupon-page-controls">
        <button
          type="button"
          className={button}
          disabled={page <= 1 || list.isFetching}
          onClick={() => setPage(page - 1)}
        >
          <ChevronLeft size={15}/>Trước
        </button>
        <span className="coupon-current-page">
          Trang {page} / {Math.max(1, list.data?.meta?.totalPages || 1)}
        </span>
        <button
          type="button"
          className={button}
          disabled={
            page >= (list.data?.meta?.totalPages || 1) || list.isFetching
          }
          onClick={() => setPage(page + 1)}
        >
          Sau<ChevronRight size={15}/>
        </button>
        </div>
      </nav>
      {error && !action && (
        <p role="alert" className="text-[#DC2626]">
          {error}
        </p>
      )}
      {action && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="kol-coupon-dialog"
            className="coupon-action-dialog max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6"
          >
            <header className="mb-4 flex items-center justify-between">
              <h2 id="kol-coupon-dialog" className="font-bold">
                {action.kind === "DETAIL"
                  ? "Chi tiết mã KOL"
                  : action.kind === "REVIEW_BLOCK"
                  ? "Thẩm định yêu cầu ngừng mã KOC"
                  : "Xác nhận cập nhật mã"}{" "}
                · {action.item.displayCode}
              </h2>
              <button
                type="button"
                aria-label="Đóng"
                disabled={busy}
                onClick={() => setAction(null)}
              >
                <X />
              </button>
            </header>
            {action.kind === "DETAIL" ? (
              <CouponOversightDetails key={action.item.id} item={action.item} shop={shop}/>
            ) : action.kind === "REVIEW_BLOCK" ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] p-3.5 text-xs space-y-1.5">
                  <div className="font-bold text-[#1A1612]">Cam kết đang chạy với KOC</div>
                  <div className="grid grid-cols-2 gap-2 text-[#7D715E]">
                    <div>Cửa hàng: <strong className="text-[#1A1612]">{action.item.store?.name || "—"}</strong></div>
                    <div>KOC/KOL: <strong className="text-[#1A1612]">{action.item.collaborator?.fullName || "—"}</strong></div>
                    <div>Mức giảm: <strong className="text-[#B88E4F]">{action.item.discountType === "PERCENTAGE" ? `${Number(action.item.discountValue)}%` : formatMoney(Number(action.item.discountValue))}</strong></div>
                    <div>Đã dùng: <strong className="text-[#1A1612]">{action.item.usageCount} lượt</strong></div>
                    <div className="col-span-2">Hiệu lực: <strong className="text-[#1A1612]">{couponExpiry(action.item)}</strong></div>
                  </div>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs space-y-1">
                  <div className="font-bold text-[#92400E]">Lý do Cửa hàng đề nghị ngừng mã</div>
                  <p className="m-0 text-[#1A1612] leading-relaxed">
                    {action.item.blockedReason || "Không có lý do chi tiết."}
                  </p>
                </div>
                <label className="block text-xs font-semibold text-[#1A1612]">
                  Ghi chú phản hồi của Vận hành (gửi tới Shop &amp; KOC)
                  <textarea
                    rows={3}
                    className={input + " mt-1.5"}
                    disabled={busy}
                    placeholder="Nhập nhận xét hoặc lý do chấp thuận / từ chối (tùy chọn)..."
                    value={terms.reason}
                    onChange={(event) =>
                      setTerms({ ...terms, reason: event.target.value })
                    }
                  />
                </label>
                {error && (
                  <p role="alert" className="text-sm text-[#DC2626]">
                    {error}
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-[#EAE4D7]">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void submitReviewBlock(false)}
                    className="rounded-xl border border-[#EAE4D7] bg-white px-4 py-2 text-xs font-semibold text-[#1A1612] hover:bg-[#F3EFE6] transition cursor-pointer disabled:opacity-50"
                  >
                    {busy ? "Đang xử lý…" : "Từ chối ngừng (Giữ mã cho KOC)"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void submitReviewBlock(true)}
                    className="rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] px-4 py-2 text-xs font-bold text-[#1A1612] transition cursor-pointer disabled:opacity-50"
                  >
                    {busy ? "Đang xử lý…" : "Chấp thuận ngừng mã"}
                  </button>
                </div>
              </div>
            ) : (
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submit();
                }}
              >
                {editing ? (
                  <>
                    <label className="block text-sm">
                      Hình thức giảm
                      <select
                        className={input}
                        disabled={busy}
                        value={terms.discountType}
                        onChange={(event) =>
                          setTerms({
                            ...terms,
                            discountType: event.target.value,
                          })
                        }
                      >
                        <option value="PERCENTAGE">Phần trăm</option>
                        <option value="FIXED_AMOUNT">Số tiền VNĐ</option>
                      </select>
                    </label>
                    {(
                      [
                        ["discountValue", "Mức giảm (% hoặc ₫)"],
                        ["minimumOrderAmount", "Đơn tối thiểu (₫)"],
                        ["maximumDiscountAmount", "Giảm tối đa / đơn (₫)"],
                      ] as const
                    ).map(([field, label]) => (
                      <label key={field} className="block text-sm">
                        {label}
                        <input
                          required
                          type="number"
                          min={field === "minimumOrderAmount" ? 0 : 1}
                          className={input}
                          disabled={busy}
                          value={terms[field]}
                          onChange={(event) =>
                            setTerms({ ...terms, [field]: event.target.value })
                          }
                        />
                      </label>
                    ))}
                    <label className="block text-sm">
                      Ngày hết hạn chiến dịch *
                      <input
                        required
                        type="datetime-local"
                        className={input}
                        disabled={busy}
                        value={terms.expiresAt}
                        onChange={(event) =>
                          setTerms({ ...terms, expiresAt: event.target.value })
                        }
                      />
                    </label>
                    <p className="text-xs text-[#7D715E]">Mã hoạt động không giới hạn số lượt trong suốt thời hạn hiệu lực (trừ doanh thu đơn hàng, bảo vệ bằng trần giảm tối đa/đơn).</p>
                  </>
                ) : (
                  action.kind !== "UNBLOCK" && action.kind !== "ADMIN_APPROVE" && (
                    <label className="block text-sm">
                      Lý do
                      <textarea
                        minLength={5}
                        required
                        className={input}
                        disabled={busy}
                        value={terms.reason}
                        onChange={(event) =>
                          setTerms({ ...terms, reason: event.target.value })
                        }
                      />
                    </label>
                  )
                )}
                {error && (
                  <p role="alert" className="text-sm text-[#DC2626]">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={busy}
                  className={button + " bg-[#C59B58]"}
                >
                  {busy ? "Đang xử lý…" : "Xác nhận"}
                </button>
              </form>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
