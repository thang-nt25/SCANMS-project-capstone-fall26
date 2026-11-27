import { handleProductImageError } from '@/utils/image-fallback.utils';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  pricingApi,
  requestError,
} from "../../services/enterprise-pricing.service";
import { Modal } from "../../components/ui/Modal";
import { getSafeProductImageUrl } from "@/utils/marketplace.utils";
import { authService } from "../../services/auth.service";
import {
  calculateMinSafePrice,
  estimateMaxLossPerUnit,
} from "../../utils/pricing-math";
import {
  ShieldCheck,
  Tag,
  RefreshCw,
  Calendar,
  Coins,
  SlidersHorizontal,
  Store,
  Info,
  CheckCircle2,
  Clock3,
  History,
} from "lucide-react";

const money = (value: unknown) =>
  value == null
    ? "Chưa cấu hình"
    : `${Number(value).toLocaleString("vi-VN")} ₫`;

const statusBadges: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  PENDING: {
    label: "Chờ thẩm định",
    bg: "bg-[#FEF3C7]",
    text: "text-[#92400E]",
    border: "border-[#FDE68A]",
  },
  APPROVED: {
    label: "Đã duyệt · Chờ kích hoạt",
    bg: "bg-[#FBF5EB]",
    text: "text-[#805B27]",
    border: "border-[#EEDFC6]",
  },
  ACTIVE: {
    label: "Đang áp dụng",
    bg: "bg-[#FAF8F5]",
    text: "text-[#715126]",
    border: "border-[#EAE4D7]",
  },
  REJECTED: {
    label: "Bị từ chối",
    bg: "bg-[#FEF2F2]",
    text: "text-[#991B1B]",
    border: "border-[#FECACA]",
  },
  EXPIRED: {
    label: "Đã kết thúc",
    bg: "bg-[#F1F5F9]",
    text: "text-[#475569]",
    border: "border-[#E2E8F0]",
  },
  CANCELLED: {
    label: "Đã hủy",
    bg: "bg-[#F1F5F9]",
    text: "text-[#475569]",
    border: "border-[#E2E8F0]",
  },
};

const localDate = (date: Date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

const floorInputClass = "h-[42px] w-full min-w-0 appearance-none rounded-lg border border-[#EAE4D7] bg-white pl-2 pr-6 text-right text-xs font-semibold tabular-nums text-[#1A1612] placeholder:text-[10px] placeholder:font-normal placeholder:text-[#7D715E] focus:border-[#C59B58] focus:outline-none aria-invalid:border-[#DC2626] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none sm:text-sm";

export default function ProductPricingPage({
  reviewer = false,
  pricingSection = 'floor',
  onPendingCountChange,
}: {
  reviewer?: boolean;
  pricingSection?: 'floor' | 'promotions';
  onPendingCountChange?: (count: number) => void;
}) {
  const [catalog, setCatalog] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<
    "floor" | "promotion" | "review" | "cancel" | null
  >(null);
  const [productId, setProductId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [price, setPrice] = useState("");
  const [floors, setFloors] = useState<Record<string, string>>({});
  const [budget, setBudget] = useState("5000000");
  const [startsAt, setStartsAt] = useState(
    localDate(new Date(Date.now() + 15 * 60 * 1000)),
  );
  const [endsAt, setEndsAt] = useState(
    localDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
  );
  const [note, setNote] = useState("");
  const [approve, setApprove] = useState(true);
  const [promoFilter, setPromoFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'ACTIVE' | 'HISTORY'>('ALL');
  const [storeFilter, setStoreFilter] = useState<string>('ALL');
  const [showMapInfoModal, setShowMapInfoModal] = useState<boolean>(false);

  const [catalogSearch, setCatalogSearch] = useState("");

  const product = catalog.find((item) => item.id === productId);
  const floorProduct = modal === "floor" ? product ?? selected : null;
  const floorImage = floorProduct ? getSafeProductImageUrl(floorProduct.imageUrl, floorProduct.title, "") : "";
  const floorNoteError = modal === "floor" && error.startsWith("Lý do điều chỉnh") ? error : "";
  const floorCommonError = modal === "floor" && /^(Giá niêm yết|Giá bán hiện tại|Sản phẩm):/.test(error) ? error : "";
  const floorVariantErrorId = floorProduct?.variants?.find((variant: { id: string; sku?: string }) =>
    variant.sku && [`SKU ${variant.sku}:`, `Giá bán SKU ${variant.sku}:`, `Khuyến mãi SKU ${variant.sku}:`].some(prefix => error.startsWith(prefix)),
  )?.id;

  const pendingCount = useMemo(() => promotions.filter((p) => p.status === "PENDING").length, [promotions]);
  const approvedCount = useMemo(() => promotions.filter((p) => p.status === 'APPROVED').length, [promotions]);
  const activeCount = useMemo(() => promotions.filter((p) => p.status === 'ACTIVE').length, [promotions]);
  const historyCount = useMemo(() => promotions.filter((p) => ["REJECTED", "CANCELLED", "EXPIRED"].includes(p.status)).length, [promotions]);

  useEffect(() => {
    onPendingCountChange?.(pendingCount);
  }, [onPendingCountChange, pendingCount]);

  const filteredPromotions = useMemo(() => {
    if (promoFilter === "PENDING") return promotions.filter((p) => p.status === "PENDING");
    if (promoFilter === "APPROVED") return promotions.filter((p) => p.status === 'APPROVED');
    if (promoFilter === "ACTIVE") return promotions.filter((p) => p.status === 'ACTIVE');
    if (promoFilter === "HISTORY") return promotions.filter((p) => ["REJECTED", "CANCELLED", "EXPIRED"].includes(p.status));
    return promotions;
  }, [promotions, promoFilter]);

  const availableStores = useMemo(() => {
    const set = new Set<string>();
    catalog.forEach((item) => {
      if (item.store?.name) set.add(item.store.name);
    });
    return Array.from(set);
  }, [catalog]);

  const filteredCatalog = useMemo(() => {
    return catalog.filter((item) => {
      const matchStore = storeFilter === "ALL" || item.store?.name === storeFilter;
      const matchSearch = !catalogSearch.trim() || item.title.toLowerCase().includes(catalogSearch.toLowerCase().trim());
      return matchStore && matchSearch;
    });
  }, [catalog, storeFilter, catalogSearch]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [items, requests] = await Promise.all([
        pricingApi.catalog(),
        pricingApi.promotions(),
      ]);
      setCatalog(items);
      setPromotions(requests);
    } catch (caught) {
      setError(requestError(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function open(kind: typeof modal, item?: any, decision = true) {
    setSelected(item || null);
    setProductId(item?.id || catalog[0]?.id || "");
    setVariantId("");
    setPrice(kind === "floor" ? String(item?.floorPrice ?? "") : "");
    setFloors(
      Object.fromEntries(
        (item?.variants || []).map((variant: any) => [
          variant.id,
          String(variant.floorPrice ?? ""),
        ]),
      ),
    );
    setNote("");
    setError("");
    setApprove(decision);
    setModal(kind);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (modal === "floor" && note.trim().length < 10) {
      setError("Lý do điều chỉnh cần ít nhất 10 ký tự.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (modal === "floor") {
        await pricingApi.floor(productId, {
          floorPrice: Number(price),
          variants: Object.entries(floors)
            .filter(([, value]) => value !== "")
            .map(([varId, value]) => ({
              variantId: varId,
              floorPrice: Number(value),
            })),
          reason: note.trim(),
        });
      }
      if (modal === "promotion") {
        await pricingApi.create({
          productId,
          ...(variantId ? { variantId } : {}),
          proposedPrice: Number(price),
          budgetTotal: Number(budget),
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
          reason: note.trim(),
        });
      }
      if (modal === "review") {
        await pricingApi.review(selected.id, { approve, note: note.trim() });
      }
      if (modal === "cancel") {
        await pricingApi.cancel(selected.id);
      }
      setModal(null);
      await load();
    } catch (caught) {
      setError(requestError(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={reviewer ? "product-pricing-review flex flex-col gap-3 text-[#1A1612] pb-6" : "space-y-6 bg-[#FAF8F5] p-4 text-[#1A1612] sm:p-6 min-h-screen"}>
      {/* Header section */}
      {!reviewer && (
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#EAE4D7]">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1612]">
                Quản lý giá bán & Khuyến mại sản phẩm
              </h1>
              <button
                type="button"
                onClick={() => setShowMapInfoModal(true)}
                title="Xem quy chuẩn kiểm soát giá sàn MAP"
                className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#F3EFE6] hover:bg-[#EEDFC6] text-[#8C6226] border border-[#EAE4D7] transition ml-0.5"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#EAE4D7] bg-white text-xs font-semibold text-[#1A1612] hover:bg-[#FBF5EB] transition cursor-pointer disabled:opacity-50"
              disabled={loading || busy}
              onClick={() => void load()}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-[#7D715E] ${loading ? "animate-spin" : ""}`}
              />
              <span>Làm mới</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-[#1A1612] text-xs font-bold shadow-2xs transition cursor-pointer disabled:opacity-50"
              disabled={loading || !catalog.length}
              onClick={() => open("promotion")}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Đề xuất khuyến mãi</span>
            </button>
          </div>
        </header>
      )}

      {error && !modal && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B] font-medium"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#EAE4D7] text-xs text-[#7D715E] shadow-2xs">
            <RefreshCw className="w-4 h-4 text-[#B88E4F] animate-spin" />
            <span>Đang tải danh mục giá và yêu cầu thẩm định…</span>
          </div>
        </div>
      ) : (
        <>
          {/* Section 1: Promotion requests */}
          <section id={reviewer ? 'pricing-promotions-panel' : undefined} role={reviewer ? 'tabpanel' : undefined} aria-labelledby={reviewer ? 'hub-tab-promotions' : undefined} hidden={reviewer && pricingSection !== 'promotions'} className="pricing-promotions-panel space-y-3.5">
            <div className="rounded-2xl border border-[#EAE4D7] bg-white p-3 sm:p-3.5">
              {/* Status Tabs */}
              <div className="pricing-promotion-filters grid grid-cols-2 gap-2 sm:grid-cols-5 [&>button]:flex [&>button]:min-h-11 [&>button]:w-full [&>button]:items-center [&>button]:justify-center [&>button]:border [&>button]:border-[#EAE4D7] [&>button]:bg-white [&>button[aria-pressed=true]]:bg-[#FBF5EB]">
                <button
                  type="button"
                  onClick={() => setPromoFilter("ALL")}
                  aria-pressed={promoFilter === 'ALL'}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                    promoFilter === "ALL"
                      ? "bg-white text-[#1A1612] shadow-2xs"
                      : "text-[#7D715E] hover:text-[#1A1612]"
                  }`}
                >
                  Tất cả ({promotions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPromoFilter("PENDING")}
                  aria-pressed={promoFilter === 'PENDING'}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    promoFilter === "PENDING"
                      ? "bg-white text-[#92400E] shadow-2xs font-bold"
                      : "text-[#7D715E] hover:text-[#92400E]"
                  }`}
                >
                  <Clock3 className="w-3 h-3 text-[#D97706]" />
                  <span>Chờ duyệt ({pendingCount})</span>
                </button>
                <button type="button" aria-pressed={promoFilter === 'APPROVED'} onClick={() => setPromoFilter('APPROVED')} className="flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-1 text-xs font-semibold text-[#805B27]"><Clock3 className="h-3 w-3"/>Đã duyệt ({approvedCount})</button>
                <button
                  type="button"
                  onClick={() => setPromoFilter("ACTIVE")}
                  aria-pressed={promoFilter === 'ACTIVE'}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    promoFilter === "ACTIVE"
                      ? "bg-white text-[#8F682E] shadow-2xs font-bold"
                      : "text-[#7D715E] hover:text-[#8F682E]"
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3 text-[#059669]" />
                  <span>Đang áp dụng ({activeCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPromoFilter("HISTORY")}
                  aria-pressed={promoFilter === 'HISTORY'}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    promoFilter === "HISTORY"
                      ? "bg-white text-[#7D715E] shadow-2xs font-bold"
                      : "text-[#7D715E] hover:text-[#1A1612]"
                  }`}
                >
                  <History className="w-3 h-3 text-[#7D715E]" />
                  <span>Lịch sử ({historyCount})</span>
                </button>
              </div>
            </div>

            {!filteredPromotions.length ? (
              <div className="rounded-2xl border border-[#EAE4D7] bg-white p-8 text-center">
                <Tag className="w-8 h-8 text-[#A79B89] mx-auto mb-2 opacity-40" />
                <p className="text-xs font-semibold text-[#1A1612]">
                  {promoFilter === "PENDING"
                    ? "Không có yêu cầu chờ thẩm định"
                    : promoFilter === "APPROVED"
                      ? "Chưa có đề xuất đã duyệt chờ áp dụng"
                    : promoFilter === "ACTIVE"
                      ? "Không có chiến dịch đang áp dụng"
                      : promoFilter === "HISTORY"
                        ? "Chưa có chiến dịch trong lịch sử"
                        : "Không có dữ liệu khuyến mãi"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredPromotions.map((item) => {
                  const badge =
                    statusBadges[item.status] || statusBadges.PENDING;
                  const prodImg = getSafeProductImageUrl(
                    item.product?.imageUrl,
                    item.product?.title,
                    "",
                  );
                  const listPrice = Number(
                    item.product?.listPrice ?? item.product?.price ?? 0,
                  );
                  const proposedPrice = Number(item.proposedPrice ?? 0);
                  const discountPercent =
                    listPrice > proposedPrice
                      ? Math.round(
                          ((listPrice - proposedPrice) / listPrice) * 100,
                        )
                      : 0;

                  return (
                    <article
                      key={item.id}
                      className="rounded-2xl border border-[#EAE4D7] bg-white p-4 sm:p-5 shadow-2xs hover:shadow-xs transition space-y-3.5 flex flex-col justify-between"
                    >
                      <div>
                        {/* Header card */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            {prodImg ? (
                              <img
                                src={prodImg} onError={handleProductImageError}
                                alt={item.product?.title}
                                className="w-11 h-11 rounded-xl object-cover border border-[#EAE4D7] bg-[#FAF8F5] shrink-0"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-xl border border-[#EAE4D7] bg-[#FBF5EB] text-[#B88E4F] flex items-center justify-center shrink-0">
                                <Tag className="w-5 h-5" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <h3
                                className="text-sm font-bold text-[#1A1612] truncate"
                                title={item.product?.title}
                              >
                                {item.product?.title}
                              </h3>
                              <div className="flex items-center gap-1.5 text-xs text-[#7D715E] mt-0.5">
                                <Store className="w-3.5 h-3.5 text-[#B88E4F] shrink-0" />
                                <span className="truncate">
                                  {item.store?.name}
                                </span>
                                {item.variant && (
                                  <>
                                    <span>·</span>
                                    <span className="font-medium text-[#1A1612]">
                                      {item.variant.name}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0 ${badge.bg} ${badge.text} ${badge.border}`}
                          >
                            {badge.label}
                          </span>
                        </div>

                        {/* Price breakdown */}
                        <div className="grid grid-cols-3 gap-2 p-2.5 mt-3 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7] text-xs">
                          <div>
                            <span className="text-[11px] text-[#7D715E] block">
                              Giá niêm yết:
                            </span>
                            <span className="font-semibold text-[#7D715E] line-through tabular-nums">
                              {money(listPrice)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[11px] text-[#8C6226] font-semibold block">
                              Giá đề xuất:
                            </span>
                            <span className="font-extrabold text-[#1A1612] tabular-nums text-sm">
                              {money(proposedPrice)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[11px] text-[#7D715E] block">
                              Mức giảm:
                            </span>
                            <span className="font-bold text-[#DC2626] tabular-nums">
                              -{discountPercent}%
                            </span>
                          </div>
                        </div>

                        {/* Budget & Timeline */}
                        <div className="mt-3 space-y-1.5 text-xs text-[#7D715E]">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Coins className="w-3.5 h-3.5 text-[#B88E4F]" />
                              Ngân sách chiến dịch:
                            </span>
                            <span className="font-semibold text-[#1A1612] tabular-nums">
                              {money(item.budgetUsed)} /{" "}
                              {money(item.budgetTotal)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-[#7D715E]" />
                              Hiệu lực:
                            </span>
                            <span className="tabular-nums text-[11px]">
                              {new Date(item.startsAt).toLocaleDateString(
                                "vi-VN",
                              )}{" "}
                              →{" "}
                              {new Date(item.endsAt).toLocaleDateString(
                                "vi-VN",
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Reason / Review notes */}
                        {item.reason && (
                          <div className="mt-2.5 p-2 rounded-lg bg-white border border-[#EAE4D7] text-xs">
                            <span className="text-[10px] text-[#7D715E] font-medium block">
                              Mục đích chiến dịch:
                            </span>
                            <p className="text-[#1A1612] mt-0.5 line-clamp-2">
                              {item.reason}
                            </p>
                          </div>
                        )}

                        {item.reviewNote && (
                          <div className="mt-2 p-2 rounded-lg bg-[#FAF8F5] border border-[#EEDFC6] text-xs">
                            <span className="text-[10px] text-[#8C6226] font-semibold block">
                              Ý kiến thẩm định:
                            </span>
                            <p className="text-[#1A1612] mt-0.5">
                              {item.reviewNote}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      {(() => {
                        const floorVal = Number(item.variant?.floorPrice ?? item.product?.floorPrice ?? 0);
                        const safePrice = Number(item.minSafePrice || calculateMinSafePrice(floorVal));
                        const isClearance =
                          item.isClearanceBelowSafeFloor ??
                          (safePrice > 0 && Number(item.proposedPrice || 0) < safePrice);
                        const maxLoss =
                          item.maxLossPerUnit ??
                          (isClearance ? estimateMaxLossPerUnit(Number(item.proposedPrice || 0), floorVal) : 0);
                        const isAdmin = authService.getCurrentUser()?.role === "SYSTEM_ADMIN";

                        return (
                          <div className="pt-3 border-t border-[#EAE4D7] flex flex-wrap items-center justify-between gap-2">
                            {isClearance ? (
                              <span
                                title={`Giá đề xuất thấp hơn ngưỡng an toàn (${money(safePrice)}). Lỗ tối đa ước tính ${money(maxLoss)}/sp.`}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFFBEB] border border-[#D97706] text-[11px] font-bold text-[#92400E]"
                              >
                                <span>Xả hàng dưới sàn</span>
                                <span className="font-mono text-[#DC2626]">
                                  · Lỗ tối đa {money(maxLoss)} / sản phẩm
                                </span>
                              </span>
                            ) : (
                              <span />
                            )}
                            <div className="flex items-center justify-end gap-2">
                              {reviewer && item.status === "PENDING" && (
                                <>
                                  <button
                                    type="button"
                                    className="px-3.5 py-1.5 rounded-lg border border-[#DC2626] text-[#DC2626] hover:bg-[#FEF2F2] text-xs font-semibold transition cursor-pointer"
                                    onClick={() => open("review", item, false)}
                                  >
                                    Từ chối
                                  </button>
                                  {isClearance && !isAdmin ? (
                                    <span
                                      title="Khuyến mãi xả hàng dưới ngưỡng an toàn bắt buộc SYSTEM_ADMIN phê duyệt."
                                      className="px-3 py-1.5 rounded-lg bg-[#F3EFE6] border border-[#EEDFC6] text-[#7D715E] text-xs font-bold cursor-not-allowed"
                                    >
                                      Chỉ SYSTEM_ADMIN duyệt
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      className="px-4 py-1.5 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-[#1A1612] text-xs font-bold shadow-2xs transition cursor-pointer"
                                      onClick={() => open("review", item, true)}
                                    >
                                      Phê duyệt
                                    </button>
                                  )}
                                </>
                              )}
                              {["PENDING", "APPROVED", "ACTIVE"].includes(
                                item.status,
                              ) && (
                                <button
                                  type="button"
                                  className="px-3 py-1.5 rounded-lg border border-[#EAE4D7] text-[#7D715E] hover:text-[#DC2626] hover:bg-[#FEF2F2] text-xs font-medium transition cursor-pointer"
                                  onClick={() => open("cancel", item)}
                                >
                                  Hủy khuyến mãi
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Section 2: Catalog and MAP configuration */}
          <section id={reviewer ? 'pricing-floor-panel' : undefined} role={reviewer ? 'tabpanel' : undefined} aria-labelledby={reviewer ? 'hub-tab-pricing' : undefined} hidden={reviewer && pricingSection !== 'floor'} className={reviewer ? "space-y-3" : "space-y-3.5 pt-4"}>
            <div className="rounded-2xl border border-[#EAE4D7] bg-white p-3 sm:p-3.5">
              {/* Filter by In-house Store and Search */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative min-w-0 flex-1">
                  <input
                    type="text"
                    placeholder="Tìm tên sản phẩm..."
                    aria-label="Tìm tên sản phẩm"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    className="h-11 w-full px-3 rounded-xl border border-[#EAE4D7] bg-white text-xs text-[#1A1612] placeholder-[#A79B89] focus:border-[#C59B58] focus:outline-none"
                  />
                </div>
                {availableStores.length > 1 && (
                  <select
                    aria-label="Lọc nhãn hàng"
                    value={storeFilter}
                    onChange={(e) => setStoreFilter(e.target.value)}
                    className="relative flex h-11 w-full items-center justify-center rounded-xl border border-[#EAE4D7] bg-white px-8 text-center text-sm font-semibold leading-normal text-[#1A1612] [text-align-last:center] [&::picker-icon]:absolute [&::picker-icon]:right-3 [&::picker-icon]:top-1/2 [&::picker-icon]:-translate-y-1/2 sm:w-64 focus:border-[#C59B58] focus:outline-none"
                  >
                    <option value="ALL">Tất cả nhãn hàng ({catalog.length})</option>
                    {availableStores.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[#EAE4D7] bg-white shadow-2xs">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead className="border-b border-[#EAE4D7] bg-white text-[#1A1612] font-semibold">
                  <tr>
                    <th className="p-3.5">Sản phẩm / Nhãn hàng</th>
                    <th className="p-3.5 whitespace-nowrap">Giá niêm yết</th>
                    <th className="p-3.5 whitespace-nowrap">Giá hiện tại</th>
                    <th className="p-3.5 whitespace-nowrap">Giá sàn MAP</th>
                    <th className="p-3.5 whitespace-nowrap text-right">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE4D7]">
                  {filteredCatalog.map((item) => {
                    const img = getSafeProductImageUrl(
                      item.imageUrl,
                      item.title,
                      "",
                    );
                    const hasMap =
                      item.floorPrice != null && Number(item.floorPrice) > 0;

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-[#FAF8F5] transition"
                      >
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            {img ? (
                              <img
                                src={img}
                                alt={item.title}
                                className="w-10 h-10 rounded-xl object-cover border border-[#EAE4D7] bg-[#FAF8F5] shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] text-[#A79B89] flex items-center justify-center shrink-0">
                                <Tag className="w-4 h-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <span
                                className="font-bold text-[#1A1612] block truncate"
                                title={item.title}
                              >
                                {item.title}
                              </span>
                              <span className="text-[11px] text-[#7D715E] block mt-0.5">
                                {item.store?.name} · {item.variants?.length || 0}{" "}
                                phân loại
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 font-semibold text-[#7D715E] tabular-nums">
                          {money(item.listPrice ?? item.price)}
                        </td>
                        <td className="p-3.5 font-bold text-[#1A1612] tabular-nums">
                          {money(item.price)}
                        </td>
                        <td className="p-3.5 tabular-nums">
                          {hasMap ? (
                            <span className="inline-flex items-center gap-1 font-bold text-[#8C6226]">
                              <ShieldCheck className="w-3.5 h-3.5 text-[#B88E4F]" />
                              {money(item.floorPrice)}
                            </span>
                          ) : (
                            <span className="text-[#A79B89] text-[11px]">
                              Chưa cấu hình
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          {reviewer ? (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] hover:bg-[#F3EFE6] text-[#8C6226] text-xs font-semibold transition cursor-pointer"
                              onClick={() => open("floor", item)}
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5 text-[#B88E4F]" />
                              <span>Cấu hình MAP</span>
                            </button>
                          ) : (
                            <span className="text-xs text-[#7D715E]">
                              {item.variants?.length || 0} phân loại
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!filteredCatalog.length && (
                <p className="p-6 text-center text-xs text-[#7D715E]">
                  Chưa có sản phẩm trong phạm vi quản lý.
                </p>
              )}
            </div>
          </section>
        </>
      )}

      {/* Modals for Floor Price configuration, Review, Cancel */}
      {modal && (
        <Modal
          isOpen
          onClose={() => {
            if (!busy) setModal(null);
          }}
          title={
            modal === "floor"
              ? "Cấu hình giá sàn MAP"
              : modal === "promotion"
                ? "Đề xuất giá khuyến mãi"
                : modal === "cancel"
                  ? "Xác nhận hủy chiến dịch khuyến mãi"
                  : approve
                    ? "Phê duyệt chiến dịch khuyến mãi"
                    : "Từ chối chiến dịch khuyến mãi"
          }
          maxWidth="lg"
          className={modal === "floor" ? "max-w-[600px] [&>.modal-header]:px-5 [&>.modal-header]:py-2.5 [&>.modal-header_h3]:text-base" : undefined}
          stickyHeader={modal === "floor"}
          bodyClassName={modal === "floor" ? "p-5 sm:p-5" : undefined}
        >
          <form className="space-y-4" onSubmit={submit} aria-busy={busy}>
            {floorProduct && (
              <div className="flex items-center gap-3 border-b border-[#EAE4D7] pb-3">
                <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] text-[#B88E4F]">
                  {floorImage
                    ? <img src={floorImage} alt="" onError={handleProductImageError} className="size-full object-contain" />
                    : <Tag size={16} aria-hidden="true" />}
                </span>
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-[#1A1612]">{floorProduct.title}</p>
                  {floorProduct.sku && <p className="mt-0.5 break-words text-xs text-[#7D715E]">SKU {floorProduct.sku}</p>}
                </div>
              </div>
            )}
            {modal === "promotion" && (
              <>
                <div>
                  <label className="text-xs font-bold text-[#1A1612] block mb-1">
                    Sản phẩm áp dụng <span className="text-[#DC2626]">*</span>
                  </label>
                  <select
                    className="w-full rounded-xl border border-[#EAE4D7] bg-white p-2.5 text-xs text-[#1A1612] focus:border-[#C59B58] focus:outline-none"
                    value={productId}
                    required
                    disabled={busy}
                    onChange={(e) => {
                      setProductId(e.target.value);
                      setVariantId("");
                    }}
                  >
                    {catalog.map((item) => (
                      <option value={item.id} key={item.id}>
                        {item.title} · {item.store?.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1A1612] block mb-1">
                    Phạm vi phân loại SKU
                  </label>
                  <select
                    className="w-full rounded-xl border border-[#EAE4D7] bg-white p-2.5 text-xs text-[#1A1612] focus:border-[#C59B58] focus:outline-none"
                    value={variantId}
                    disabled={busy}
                    onChange={(e) => setVariantId(e.target.value)}
                  >
                    <option value="">Tất cả phân loại</option>
                    {product?.variants.map((item: any) => (
                      <option value={item.id} key={item.id}>
                        {item.name} · MAP{" "}
                        {money(item.floorPrice ?? product.floorPrice)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#1A1612] block mb-1">
                      Bắt đầu <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      className="w-full rounded-xl border border-[#EAE4D7] bg-white p-2.5 text-xs text-[#1A1612] focus:border-[#C59B58] focus:outline-none"
                      type="datetime-local"
                      value={startsAt}
                      required
                      disabled={busy}
                      onChange={(e) => setStartsAt(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#1A1612] block mb-1">
                      Kết thúc <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      className="w-full rounded-xl border border-[#EAE4D7] bg-white p-2.5 text-xs text-[#1A1612] focus:border-[#C59B58] focus:outline-none"
                      type="datetime-local"
                      value={endsAt}
                      min={startsAt}
                      required
                      disabled={busy}
                      onChange={(e) => setEndsAt(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1A1612] block mb-1">
                    Hạn mức ngân sách tối đa (₫){" "}
                    <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    max="1000000000000"
                    className="w-full rounded-xl border border-[#EAE4D7] bg-white p-2.5 text-xs text-[#1A1612] focus:border-[#C59B58] focus:outline-none font-mono"
                    value={budget}
                    required
                    disabled={busy}
                    onChange={(e) => setBudget(e.target.value)}
                  />
                </div>
              </>
            )}

            {modal === "floor" && (
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,45%)] items-center gap-x-3 gap-y-1.5">
                <label htmlFor="map-common-floor" className="text-sm font-semibold">Giá sàn chung <span className="text-[#DC2626]">*</span></label>
                <div className="relative">
                  <input id="map-common-floor" type="number" inputMode="numeric" min="1" step="1" max="1000000000000"
                    className={floorInputClass} value={price} required disabled={busy}
                    aria-invalid={Boolean(floorCommonError)} aria-describedby={floorCommonError ? "map-common-error" : undefined}
                    onChange={event => setPrice(event.target.value)} />
                  <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-2 grid place-items-center text-xs text-[#7D715E]">₫</span>
                </div>
                {floorCommonError && <p id="map-common-error" role="alert" className="col-span-2 text-xs text-[#DC2626]">{floorCommonError}</p>}
              </div>
            )}

            {modal === "promotion" && (
              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-1">
                  Mức giá sau giảm đề xuất (₫){" "}
                  <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  aria-label="Giá cấu hình"
                  type="number"
                  min="1"
                  step="1"
                  max="1000000000000"
                  className="w-full rounded-xl border border-[#EAE4D7] bg-white p-2.5 text-xs text-[#1A1612] focus:border-[#C59B58] focus:outline-none font-mono font-bold"
                  value={price}
                  required
                  disabled={busy}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
            )}

            {floorProduct?.variants?.length > 0 && (
              <div className="overflow-hidden rounded-lg border border-[#EAE4D7]">
                <table aria-label="Giá sàn theo phân loại" className="w-full table-fixed text-xs">
                  <thead className="bg-[#FAF8F5] text-[#655A49]">
                    <tr>
                      <th scope="col" className="w-[30%] px-2 py-2.5 text-left font-semibold sm:px-3">Phân loại</th>
                      <th scope="col" className="w-[25%] px-2 py-2.5 text-right font-semibold sm:px-3">Giá niêm yết</th>
                      <th scope="col" className="px-2 py-2.5 text-right font-semibold sm:px-3">Giá sàn riêng</th>
                    </tr>
                  </thead>
                  {floorProduct.variants.map((variant: any) => {
                    const variantError = floorVariantErrorId === variant.id;
                    return (
                      <tbody key={variant.id} className="border-t border-[#EAE4D7]">
                        <tr>
                          <th scope="row" className="break-words px-2 py-2 text-left font-semibold sm:px-3">{variant.name}</th>
                          <td className="break-words px-2 py-2 text-right tabular-nums text-[#655A49] sm:px-3">{money(variant.listPrice ?? variant.price)}</td>
                          <td className="px-2 py-2 sm:px-3">
                            <div className="relative">
                              <input type="number" inputMode="numeric" min="1" step="1"
                                aria-label={`Giá sàn riêng cho ${variant.name}`}
                                aria-invalid={variantError}
                                aria-describedby={variantError ? `map-error-${variant.id}` : undefined}
                                value={floors[variant.id] ?? ""} disabled={busy}
                                placeholder={variant.floorPrice == null ? "Dùng giá sàn chung" : "Giữ giá đã lưu"}
                                className={floorInputClass}
                                onChange={event => setFloors(current => ({ ...current, [variant.id]: event.target.value }))} />
                              <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-2 grid place-items-center text-xs text-[#7D715E]">₫</span>
                            </div>
                          </td>
                        </tr>
                        {variantError && <tr><td colSpan={3} className="px-3 pb-2 text-xs text-[#DC2626]"><p id={`map-error-${variant.id}`} role="alert">{error}</p></td></tr>}
                      </tbody>
                    );
                  })}
                </table>
              </div>
            )}

            {modal === "cancel" ? (
              <div className="p-3 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-xs text-[#92400E]">
                Giá bán của sản phẩm sẽ lập tức hoàn nguyên về giá niêm yết ban
                đầu. Các đơn hàng đã đặt trước thời điểm này vẫn được giữ nguyên
                giá ưu đãi.
              </div>
            ) : (
              <div>
                <label htmlFor="pricing-change-note" className="mb-1.5 flex items-center justify-between gap-2 text-xs font-bold text-[#1A1612]">
                  <span>
                  {modal === "review"
                    ? approve
                      ? "Ghi chú phê duyệt thẩm định"
                      : "Lý do từ chối yêu cầu"
                    : modal === "floor" ? "Lý do điều chỉnh" : "Căn cứ & Lý do điều chỉnh"}{" "}
                  <span className="text-[#DC2626]">*</span>
                  </span>
                  {modal === "floor" && <span className="whitespace-nowrap text-[11px] font-normal tabular-nums text-[#7D715E]">{note.length}/1.000</span>}
                </label>
                <textarea
                  id="pricing-change-note"
                  className={`w-full border border-[#EAE4D7] bg-white p-2.5 text-xs text-[#1A1612] focus:border-[#C59B58] focus:outline-none aria-invalid:border-[#DC2626] ${modal === "floor" ? "min-h-20 rounded-lg" : "rounded-xl"}`}
                  rows={3}
                  minLength={modal === "floor" ? undefined : 5}
                  maxLength={1000}
                  aria-invalid={Boolean(floorNoteError)}
                  aria-describedby={floorNoteError ? "map-note-error" : undefined}
                  value={note}
                  placeholder={
                    modal === "review"
                      ? approve
                        ? "Đã thẩm định biên lãi đạt ngưỡng an toàn..."
                        : "Biên lợi nhuận không đảm bảo chi phí hoa hồng..."
                      : modal === "floor" ? "Nhập lý do điều chỉnh giá sàn…" : "Căn cứ chi phí sản xuất và biến động giá thị trường..."
                  }
                  required
                  disabled={busy}
                  onChange={(e) => setNote(e.target.value)}
                />
                {floorNoteError && <p id="map-note-error" role="alert" className="mt-1 text-xs text-[#DC2626]">{floorNoteError}</p>}
              </div>
            )}

            {error && !floorNoteError && !floorCommonError && !floorVariantErrorId && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B]"
              >
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#EAE4D7]">
              <button
                type="button"
                disabled={busy}
                className={`border border-[#EAE4D7] px-4 py-2 text-xs font-semibold text-[#655A49] transition hover:bg-[#F3EFE6] disabled:opacity-50 cursor-pointer ${modal === "floor" ? "h-[42px] rounded-lg" : "rounded-xl"}`}
                onClick={() => setModal(null)}
              >
                {modal === "floor" ? "Hủy" : "Đóng"}
              </button>
              <button
                type="submit"
                disabled={busy}
                className={`px-5 py-2 text-xs font-bold transition cursor-pointer disabled:opacity-50 ${
                  modal === "floor"
                    ? "h-[42px] rounded-lg border border-[#EEDFC6] bg-[#C59B58] text-[#231D15] hover:bg-[#B88E4F]"
                    : modal === "review" && !approve
                      ? "rounded-xl bg-[#DC2626] text-white shadow-2xs hover:bg-rose-700"
                      : "rounded-xl bg-[#C59B58] text-[#1A1612] shadow-2xs hover:bg-[#B88E4F]"
                }`}
              >
                {modal === "floor" ? (busy ? "Đang lưu…" : "Lưu giá sàn") : (busy ? "Đang xử lý…" : "Xác nhận")}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {/* Info Modal for MAP Governance */}
      {showMapInfoModal && (
        <Modal
          isOpen
          onClose={() => setShowMapInfoModal(false)}
          title="Quy chuẩn Kiểm soát Giá sàn MAP & Biên lãi"
          maxWidth="md"
        >
          <div className="space-y-3.5 text-xs text-[#1A1612]">
            <div className="p-3 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] space-y-1">
              <span className="font-bold text-[#8C6226] block">
                1. Giá sàn MAP (Minimum Advertised Price)
              </span>
              <p className="text-[#7D715E]">
                Mức giá bán tối thiểu được cấu hình theo từng SKU nhằm bảo vệ giá trị thương hiệu và ngăn chặn việc bán phá giá hoặc lỗ ngân sách chiến dịch.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7] space-y-1">
              <span className="font-bold text-[#1A1612] block">
                2. Cơ chế kiểm soát Maker-Checker
              </span>
              <p className="text-[#7D715E]">
                Quản lý cửa hàng (Maker) đề xuất giảm giá kèm dự toán ngân sách. System Manager / Admin (Checker) thẩm định biên lãi an toàn trước khi chiến dịch được kích hoạt.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7] space-y-1">
              <span className="font-bold text-[#1A1612] block">
                3. Đảm bảo nguồn thù lao Tiếp thị Liên kết
              </span>
              <p className="text-[#7D715E]">
                Giá thực thu sau khuyến mãi và voucher độc quyền của KOL luôn phải lớn hơn hoặc bằng giá sàn MAP để đảm bảo khả năng thanh toán thù lao cho đối tác.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowMapInfoModal(false)}
                className="px-4 py-2 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-[#1A1612] text-xs font-bold transition cursor-pointer"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
