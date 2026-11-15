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
import "./kol-coupon-cards.css";

const labels: Record<string, string> = {
  PENDING_APPROVAL: "Chờ Shop duyệt",
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
  kind: "APPROVE" | "POLICY" | "REJECT" | "BLOCK" | "UNBLOCK" | "DETAIL";
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
  const rows: CouponItem[] = list.data?.data || [];
  const [terms, setTerms] = useState({
    discountType: "PERCENTAGE",
    discountValue: "10",
    minimumOrderAmount: "0",
    maximumDiscountAmount: "50000",
    budgetTotal: "1000000",
    usageLimitTotal: "100",
    usageLimitPerCustomer: "1",
    expiresAt: "",
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
      budgetTotal: String(item.budgetTotal ?? 1000000),
      usageLimitTotal: String(item.usageLimitTotal ?? 100),
      usageLimitPerCustomer: String(item.usageLimitPerCustomer ?? 1),
      expiresAt: item.expiresAt
        ? new Date(
            new Date(item.expiresAt).getTime() -
              new Date(item.expiresAt).getTimezoneOffset() * 60000,
          )
            .toISOString()
            .slice(0, 16)
        : "",
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
          "budgetTotal",
          "usageLimitTotal",
          "usageLimitPerCustomer",
        ] as const;
        for (const field of values)
          if (
            !Number.isFinite(Number(terms[field])) ||
            Number(terms[field]) <= 0
          )
            throw new Error("Nhập đầy đủ các hạn mức dương hợp lệ.");
        if (
          !Number.isFinite(Number(terms.minimumOrderAmount)) ||
          Number(terms.minimumOrderAmount) < 0 ||
          (terms.discountType === "PERCENTAGE" &&
            Number(terms.discountValue) > 100)
        )
          throw new Error("Mức giảm hoặc giá trị đơn tối thiểu không hợp lệ.");
        if (
          ![terms.usageLimitTotal, terms.usageLimitPerCustomer].every((value) =>
            Number.isSafeInteger(Number(value)),
          )
        )
          throw new Error("Số lượt dùng phải là số nguyên.");
        const body: ApproveCouponPayload = {
          discountType: terms.discountType as "PERCENTAGE" | "FIXED_AMOUNT",
          discountValue: Number(terms.discountValue),
          minimumOrderAmount: Number(terms.minimumOrderAmount),
          maximumDiscountAmount: Number(terms.maximumDiscountAmount),
          budgetTotal: Number(terms.budgetTotal),
          usageLimitTotal: Number(terms.usageLimitTotal),
          usageLimitPerCustomer: Number(terms.usageLimitPerCustomer),
          ...(terms.expiresAt
            ? { expiresAt: new Date(terms.expiresAt).toISOString() }
            : {}),
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
      } else if (kind === "UNBLOCK")
        await couponService.adminUnblockCoupon(item.id);
      else {
        if (terms.reason.trim().length < 5)
          throw new Error("Nhập lý do ít nhất 5 ký tự.");
        if (kind === "REJECT")
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
      await list.refetch();
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
  const editing = action?.kind === "APPROVE" || action?.kind === "POLICY";
  return (
    <main className="space-y-5 text-[#1A1612]">
      <section aria-label="Bộ lọc mã ưu đãi KOL" className={`kol-coupon-filters grid w-full grid-cols-1 items-stretch gap-3 rounded-2xl border border-[#EAE4D7] bg-white p-3 ${shop ? 'sm:grid-cols-3' : 'sm:grid-cols-[minmax(0,1fr)_220px]'}`}>
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
                        ["discountValue", "Mức giảm"],
                        ["minimumOrderAmount", "Đơn tối thiểu"],
                        ["maximumDiscountAmount", "Giảm tối đa"],
                        ["budgetTotal", "Ngân sách mã"],
                        ["usageLimitTotal", "Tổng lượt dùng"],
                        ["usageLimitPerCustomer", "Lượt dùng mỗi khách"],
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
                      Hạn dùng (giờ địa phương)
                      <input
                        type="datetime-local"
                        className={input}
                        disabled={busy}
                        value={terms.expiresAt}
                        onChange={(event) =>
                          setTerms({ ...terms, expiresAt: event.target.value })
                        }
                      />
                    </label>
                  </>
                ) : (
                  action.kind !== "UNBLOCK" && (
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
