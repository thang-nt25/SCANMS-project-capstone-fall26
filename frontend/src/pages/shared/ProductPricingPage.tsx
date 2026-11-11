import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  pricingApi,
  requestError,
} from "../../services/enterprise-pricing.service";
import { Modal } from "../../components/ui/Modal";
import { getSafeProductImageUrl } from "@/utils/marketplace.utils";
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
    bg: "bg-[#E0F2FE]",
    text: "text-[#0369A1]",
    border: "border-[#BAE6FD]",
  },
  ACTIVE: {
    label: "Đang áp dụng",
    bg: "bg-[#ECFDF5]",
    text: "text-[#065F46]",
    border: "border-[#A7F3D0]",
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

export default function ProductPricingPage({
  reviewer = false,
}: {
  reviewer?: boolean;
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
  const [promoFilter, setPromoFilter] = useState<'ALL' | 'PENDING' | 'ACTIVE' | 'HISTORY'>('ALL');
  const [storeFilter, setStoreFilter] = useState<string>('ALL');
  const [showMapInfoModal, setShowMapInfoModal] = useState<boolean>(false);

  const [catalogSearch, setCatalogSearch] = useState("");

  const product = catalog.find((item) => item.id === productId);

  const pendingCount = useMemo(() => promotions.filter((p) => p.status === "PENDING").length, [promotions]);
  const activeCount = useMemo(() => promotions.filter((p) => ["ACTIVE", "APPROVED"].includes(p.status)).length, [promotions]);
  const historyCount = useMemo(() => promotions.filter((p) => ["REJECTED", "CANCELLED", "EXPIRED"].includes(p.status)).length, [promotions]);

  const filteredPromotions = useMemo(() => {
    if (promoFilter === "PENDING") return promotions.filter((p) => p.status === "PENDING");
    if (promoFilter === "ACTIVE") return promotions.filter((p) => ["ACTIVE", "APPROVED"].includes(p.status));
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
    setPrice(kind === "floor" ? String(item?.floorPrice || "") : "");
    setFloors(
      Object.fromEntries(
        (item?.variants || []).map((variant: any) => [
          variant.id,
          String(variant.floorPrice ?? item?.floorPrice ?? ""),
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
    <div className={reviewer ? "space-y-4 text-[#1A1612] pb-6" : "space-y-6 bg-[#FAF8F5] p-4 text-[#1A1612] sm:p-6 min-h-screen"}>
      {/* Header section */}
      {reviewer ? (
        <div className="flex items-center justify-between gap-2 pb-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowMapInfoModal(true)}
              title="Xem quy chuẩn kiểm soát giá sàn MAP"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#FBF5EB] hover:bg-[#F3EFE6] text-[#8C6226] text-xs font-semibold border border-[#EEDFC6] transition cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Quy chuẩn giá sàn MAP</span>
            </button>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                {pendingCount} chờ duyệt
              </span>
            )}
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#EAE4D7] bg-white text-xs font-semibold text-[#1A1612] hover:bg-[#FBF5EB] transition cursor-pointer disabled:opacity-50"
            disabled={loading || busy}
            onClick={() => void load()}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-[#7D715E] ${loading ? "animate-spin" : ""}`}
            />
            <span>Làm mới</span>
          </button>
        </div>
      ) : (
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
          <section className="space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#1A1612]">
                  Chiến dịch khuyến mãi ({promotions.length})
                </h2>
                <button
                  type="button"
                  onClick={() => setShowMapInfoModal(true)}
                  className="w-5 h-5 rounded-full bg-[#F3EFE6] hover:bg-[#EEDFC6] text-[#8C6226] inline-flex items-center justify-center border border-[#EAE4D7] transition"
                  title="Quy chuẩn thẩm định"
                >
                  <Info className="w-3 h-3" />
                </button>
              </div>

              {/* Status Tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#F3EFE6] border border-[#EAE4D7] overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setPromoFilter("ALL")}
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
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    promoFilter === "PENDING"
                      ? "bg-white text-[#92400E] shadow-2xs font-bold"
                      : "text-[#7D715E] hover:text-[#92400E]"
                  }`}
                >
                  <Clock3 className="w-3 h-3 text-[#D97706]" />
                  <span>Chờ duyệt ({pendingCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPromoFilter("ACTIVE")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    promoFilter === "ACTIVE"
                      ? "bg-white text-[#065F46] shadow-2xs font-bold"
                      : "text-[#7D715E] hover:text-[#065F46]"
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3 text-[#059669]" />
                  <span>Đang chạy ({activeCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPromoFilter("HISTORY")}
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
                                src={prodImg}
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
                      <div className="pt-3 border-t border-[#EAE4D7] flex items-center justify-end gap-2">
                        {reviewer && item.status === "PENDING" && (
                          <>
                            <button
                              type="button"
                              className="px-3.5 py-1.5 rounded-lg border border-[#DC2626] text-[#DC2626] hover:bg-[#FEF2F2] text-xs font-semibold transition cursor-pointer"
                              onClick={() => open("review", item, false)}
                            >
                              Từ chối
                            </button>
                            <button
                              type="button"
                              className="px-4 py-1.5 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-[#1A1612] text-xs font-bold shadow-2xs transition cursor-pointer"
                              onClick={() => open("review", item, true)}
                            >
                              Phê duyệt
                            </button>
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
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Section 2: Catalog and MAP configuration */}
          <section className="space-y-3.5 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#1A1612]">
                  Cấu hình giá sàn bảo vệ biên lãi (MAP) ({filteredCatalog.length})
                </h2>
                <button
                  type="button"
                  onClick={() => setShowMapInfoModal(true)}
                  className="w-5 h-5 rounded-full bg-[#F3EFE6] hover:bg-[#EEDFC6] text-[#8C6226] inline-flex items-center justify-center border border-[#EAE4D7] transition"
                  title="Quy chuẩn giá sàn MAP"
                >
                  <Info className="w-3 h-3" />
                </button>
              </div>

              {/* Filter by In-house Store and Search */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Tìm tên sản phẩm..."
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    className="w-44 sm:w-52 px-3 py-1.5 rounded-xl border border-[#EAE4D7] bg-white text-xs text-[#1A1612] placeholder-[#A79B89] focus:border-[#C59B58] focus:outline-none"
                  />
                </div>
                {availableStores.length > 1 && (
                  <select
                    value={storeFilter}
                    onChange={(e) => setStoreFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-[#EAE4D7] bg-white text-xs text-[#1A1612] focus:border-[#C59B58] focus:outline-none"
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
                <thead className="bg-[#F3EFE6] text-[#1A1612] font-semibold">
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
              ? "Cấu hình giá sàn bảo vệ (MAP)"
              : modal === "promotion"
                ? "Đề xuất giá khuyến mãi"
                : modal === "cancel"
                  ? "Xác nhận hủy chiến dịch khuyến mãi"
                  : approve
                    ? "Phê duyệt chiến dịch khuyến mãi"
                    : "Từ chối chiến dịch khuyến mãi"
          }
          maxWidth="lg"
        >
          <form className="space-y-4" onSubmit={submit} aria-busy={busy}>
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

            {["floor", "promotion"].includes(modal) && (
              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-1">
                  {modal === "floor"
                    ? "Mức giá sàn bảo vệ chung (MAP ₫)"
                    : "Mức giá sau giảm đề xuất (₫)"}{" "}
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

            {modal === "floor" && product?.variants?.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#EAE4D7]">
                <span className="text-xs font-bold text-[#1A1612] block">
                  Cấu hình giá sàn riêng theo phân loại SKU:
                </span>
                {product.variants.map((variant: any) => (
                  <div
                    key={variant.id}
                    className="flex items-center justify-between gap-3 p-2 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7]"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-[#1A1612] block truncate">
                        {variant.name}
                      </span>
                      <span className="text-[11px] text-[#7D715E]">
                        Niêm yết: {money(variant.listPrice ?? variant.price)}
                      </span>
                    </div>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={floors[variant.id] || ""}
                      disabled={busy}
                      placeholder="Dùng giá sàn chung"
                      className="w-40 rounded-lg border border-[#EAE4D7] bg-white px-2.5 py-1.5 text-xs text-[#1A1612] font-mono focus:border-[#C59B58] focus:outline-none"
                      onChange={(e) =>
                        setFloors((current) => ({
                          ...current,
                          [variant.id]: e.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
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
                <label className="text-xs font-bold text-[#1A1612] block mb-1">
                  {modal === "review"
                    ? approve
                      ? "Ghi chú phê duyệt thẩm định"
                      : "Lý do từ chối yêu cầu"
                    : "Căn cứ & Lý do điều chỉnh"}{" "}
                  <span className="text-[#DC2626]">*</span>
                </label>
                <textarea
                  className="w-full rounded-xl border border-[#EAE4D7] bg-white p-2.5 text-xs text-[#1A1612] focus:border-[#C59B58] focus:outline-none"
                  rows={3}
                  minLength={5}
                  maxLength={1000}
                  value={note}
                  placeholder={
                    modal === "review"
                      ? approve
                        ? "Đã thẩm định biên lãi đạt ngưỡng an toàn..."
                        : "Biên lợi nhuận không đảm bảo chi phí hoa hồng..."
                      : "Căn cứ chi phí sản xuất và biến động giá thị trường..."
                  }
                  required
                  disabled={busy}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            )}

            {error && (
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
                className="px-4 py-2 rounded-xl border border-[#EAE4D7] text-xs font-semibold text-[#7D715E] hover:bg-[#F3EFE6] transition cursor-pointer"
                onClick={() => setModal(null)}
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={busy}
                className={`px-5 py-2 rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer disabled:opacity-50 ${
                  modal === "review" && !approve
                    ? "bg-[#DC2626] text-white hover:bg-rose-700"
                    : "bg-[#C59B58] hover:bg-[#B88E4F] text-[#1A1612]"
                }`}
              >
                {busy ? "Đang xử lý…" : "Xác nhận"}
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
