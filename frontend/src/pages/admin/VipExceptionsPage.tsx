import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  RefreshCw,
  Search,
  AlertTriangle,
  Package,
  Info,
  ChevronDown,
  FileCheck2,
} from "lucide-react";
import api from "../../services/api";
import {
  requestError,
  unwrap,
} from "../../services/enterprise-pricing.service";
import { Modal } from "../../components/ui/Modal";
import { toast } from "../../utils/toast";
import {
  formatMoney,
  getSafeProductImageUrl,
  handleProductImageError,
} from "../../utils/marketplace.utils";

interface ExceptionStats {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  totalTargetOrders?: number;
  totalTargetRevenue: number;
  avgRate: number;
}

type TabType = "pending" | "approved" | "rejected";
const exceptionTabs = [
  { key: "approved", label: "Đã phê duyệt", count: "approvedCount", empty: "Chưa có thỏa thuận được phê duyệt" },
  { key: "pending", label: "Chờ thẩm định", count: "pendingCount", empty: "Không có đề xuất chờ thẩm định" },
  { key: "rejected", label: "Đã từ chối", count: "rejectedCount", empty: "Chưa có đề xuất bị từ chối" },
] as const;
const filterControl = "h-[42px] w-full min-w-0 rounded-lg border border-line bg-white px-3 py-0! text-sm leading-normal text-ink focus:border-brand-strong focus:outline-none";
const filterSelect = `${filterControl} block! appearance-none! bg-none! pl-8 pr-8 text-center [text-align-last:center] [&::picker-icon]:hidden!`;
const dateFormat = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" });
const numberFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });

function formatCommitment(orders: number, revenue: number) {
  return [orders > 0 ? `${numberFormat.format(orders)} đơn` : "", revenue > 0 ? formatMoney(revenue) : ""].filter(Boolean).join(" · ");
}

function dealProducts(item: any) {
  return item.scopeType === "SELECTED_PRODUCTS"
    ? (item.scopeProducts ?? []).map((entry: any) => entry.product).filter(Boolean)
    : item.product ? [item.product] : [];
}

export default function VipExceptionsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("approved");
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<ExceptionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStore, setSelectedStore] = useState<string>("ALL");
  const [selectedRateRange, setSelectedRateRange] = useState<string>("ALL");
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [detailItem, setDetailItem] = useState<any>(null);

  // Decision Modal state
  const [selected, setSelected] = useState<any>(null);
  const [approve, setApprove] = useState(true);
  const [note, setNote] = useState("");

  // Product Detail Quick View Modal state
  const [previewProduct, setPreviewProduct] = useState<any | null>(null);

  const loadData = useCallback(async (tab: TabType = activeTab) => {
    setLoading(true);
    setError("");
    try {
      const response: any = unwrap(
        await api.get("/affiliate-deals/exceptions", {
          params: { tab, page },
          headers: { "x-skip-cache": "1" },
        })
      );

      if (response && typeof response === "object" && !Array.isArray(response)) {
        setItems(Array.isArray(response.items) ? response.items : []);
        setTotal(Number(response.total) || 0);
        if (!response.items?.length && page > 1) setPage(value => value - 1);
        if (response.stats) {
          setStats(response.stats);
        }
      } else if (Array.isArray(response)) {
        setItems(response);
      } else {
        setItems([]);
      }
    } catch (caught) {
      setError(requestError(caught));
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => {
    void loadData(activeTab);
  }, [activeTab, loadData]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedStore("ALL");
    setSelectedRateRange("ALL");
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setPage(1);
    clearFilters();
  };

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.store?.name?.toLowerCase().includes(q) ||
        item.collaborator?.fullName?.toLowerCase().includes(q) ||
        item.product?.title?.toLowerCase().includes(q) ||
        item.salesCommitment?.toLowerCase().includes(q);

      const matchStore =
        selectedStore === "ALL" ||
        item.store?.name?.toLowerCase().includes(selectedStore.toLowerCase());

      const rate = Number(item.proposedCommissionRate || 0);
      let matchRate = true;
      if (selectedRateRange === "16-18") {
        matchRate = rate > 16 && rate <= 18;
      } else if (selectedRateRange === "18-21") {
        matchRate = rate > 18 && rate <= 21;
      } else if (selectedRateRange === "21-25") {
        matchRate = rate > 21 && rate <= 25;
      }

      return matchSearch && matchStore && matchRate;
    });
  }, [items, searchQuery, selectedStore, selectedRateRange]);

  // Unique stores for filter
  const storeOptions = useMemo(() => {
    const names = new Set<string>();
    items.forEach((item) => {
      if (item.store?.name) names.add(item.store.name);
    });
    return Array.from(names);
  }, [items]);


  async function handleDecisionSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy || !selected) return;

    if (!note.trim() || note.trim().length < 10) {
      setError("Vui lòng nhập căn cứ phê duyệt tối thiểu 10 ký tự để lưu nhật ký kiểm toán (Audit Log).");
      return;
    }

    setBusy(true);
    setError("");
    try {
      await api.patch(
        `/affiliate-deals/${selected.id}/exception-review`,
        { approve, note: note.trim() },
        { timeout: 95000 }
      );
      toast.success(
        approve
          ? `Đã phê duyệt đặc cách thù lao ${Number(selected.proposedCommissionRate)}% cho KOL ${selected.collaborator?.fullName}!`
          : `Đã từ chối đề xuất thù lao đặc cách của KOL ${selected.collaborator?.fullName}.`
      );
      setSelected(null);
      setDetailItem(null);
      setNote("");
      await loadData(activeTab);
    } catch (caught) {
      const errMsg = requestError(caught);
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setBusy(false);
    }
  }

  const filtersActive = Boolean(searchQuery.trim()) || selectedStore !== "ALL" || selectedRateRange !== "ALL";
  const commitment = formatCommitment(Number(stats?.totalTargetOrders ?? 0), Number(stats?.totalTargetRevenue ?? 0));
  const hasProposals = Boolean(commitment) || exceptionTabs.some(({ count }) => (stats?.[count] ?? 0) > 0);
  const averageRate = hasProposals && stats && Number.isFinite(stats.avgRate) ? `${numberFormat.format(stats.avgRate)}%` : "—";
  const emptyMessage = exceptionTabs.find(({ key }) => key === activeTab)?.empty;
  const rowColumns = "@min-[850px]/exceptions:grid-cols-[minmax(115px,1fr)_minmax(170px,1.6fr)_80px_minmax(110px,1fr)_94px_104px]";

  return (
    <section aria-label="Phê duyệt Thỏa thuận Đặc cách" className="@container/exceptions w-full min-w-0 shrink-0 overflow-hidden rounded-xl border border-line bg-white text-ink">
      <dl className="m-0 grid grid-cols-2 gap-3 border-b border-line bg-white p-3 @min-[560px]/exceptions:p-4">
        <div className="flex min-h-24 min-w-0 flex-col justify-between gap-2 rounded-2xl border border-line bg-white p-3 @min-[560px]/exceptions:p-4">
          <dt className="text-xs font-semibold leading-snug text-[#655A49]">Cam kết KPI</dt>
          <dd className="m-0 text-2xl leading-tight font-bold tabular-nums [overflow-wrap:anywhere]">{commitment || (stats ? "Chưa có cam kết" : "—")}</dd>
        </div>
        <div className="flex min-h-24 min-w-0 flex-col justify-between gap-2 rounded-2xl border border-line bg-white p-3 @min-[560px]/exceptions:p-4">
          <dt className="text-xs font-semibold leading-snug text-[#655A49]">Thù lao trung bình</dt>
          <dd className="m-0 text-2xl leading-tight font-bold tabular-nums text-[#805B27]">{averageRate}</dd>
        </div>
      </dl>

      <div role="group" aria-label="Trạng thái thỏa thuận" className="grid grid-cols-3 gap-2 border-b border-line p-2 @min-[560px]/exceptions:gap-3 @min-[560px]/exceptions:px-3 @min-[560px]/exceptions:py-2.5">
        {exceptionTabs.map(({ key, label, count }, index) => (
            <button type="button" aria-pressed={activeTab === key} onClick={() => handleTabChange(key)}
              key={key} className="group flex min-h-[44px] min-w-0 w-full cursor-pointer flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-lg border border-line bg-white px-2 py-1.5 text-center text-xs leading-5 font-semibold text-muted transition-colors hover:bg-canvas aria-pressed:border-brand-border aria-pressed:bg-brand-soft aria-pressed:text-[#805B27] focus-visible:outline-2 focus-visible:outline-brand-strong @min-[560px]/exceptions:flex-nowrap @min-[560px]/exceptions:text-[13px]">
              <span aria-hidden="true" className="hidden size-6 shrink-0 items-center justify-center rounded-full border border-line bg-white text-xs font-normal text-muted group-aria-pressed:border-brand group-aria-pressed:text-[#805B27] @min-[560px]/exceptions:inline-flex">{index + 1}</span>
              <span>{label}</span><span className="inline-flex min-w-6 shrink-0 items-center justify-center rounded-md border border-line bg-canvas px-1.5 py-0.5 text-xs font-medium tabular-nums group-aria-pressed:border-brand-border group-aria-pressed:text-[#805B27]">{stats?.[count] ?? "—"}</span>
            </button>
        ))}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_36px] items-center gap-2 border-b border-line px-3 py-[11px] @min-[560px]/exceptions:grid-cols-[minmax(0,1fr)_160px_150px_36px] @min-[560px]/exceptions:px-4">
        <div className="relative col-span-full min-w-0 @min-[560px]/exceptions:col-span-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input type="search" aria-label="Tìm KOL, nhãn hàng, sản phẩm" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Tìm KOL, nhãn hàng, sản phẩm…" className={`${filterControl} pl-9`} />
        </div>
        <div className="relative min-w-0">
        <select aria-label="Nhãn hàng" value={selectedStore} onChange={(event) => setSelectedStore(event.target.value)} className={filterSelect}>
          <option value="ALL">Nhãn hàng</option>
          {storeOptions.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        <ChevronDown size={15} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
        </div>
        <div className="relative min-w-0">
        <select aria-label="Mức thù lao" value={selectedRateRange} onChange={(event) => setSelectedRateRange(event.target.value)} className={filterSelect}>
          <option value="ALL">Mức thù lao</option>
          <option value="16-18">Trên 16% đến 18%</option>
          <option value="18-21">Trên 18% đến 21%</option>
          <option value="21-25">Trên 21% đến 25%</option>
        </select>
        <ChevronDown size={15} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
        </div>
        <button type="button" title="Quy chuẩn thù lao" aria-label="Quy chuẩn thù lao" aria-haspopup="dialog" onClick={() => setShowPolicyModal(true)}
          className="grid size-9 cursor-pointer place-items-center rounded-lg border border-line text-[#805B27] hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-brand-strong">
          <Info size={17} aria-hidden="true" />
        </button>
      </div>

      {!loading && error && !selected ? (
        <div role="alert" className="flex items-center gap-2 px-4 py-3 text-sm text-danger">
          <AlertTriangle size={16} className="shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">{error}</span>
          <button type="button" disabled={busy} onClick={() => void loadData(activeTab)} className="shrink-0 rounded-md px-2 py-1 font-semibold underline underline-offset-2 disabled:opacity-60">Thử lại</button>
        </div>
      ) : loading ? (
        <div role="status" className="flex items-center justify-center gap-2 p-7 text-sm text-muted">
          <RefreshCw size={16} className="animate-spin text-brand-strong motion-reduce:animate-none" aria-hidden="true" /> Đang tải đề xuất…
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex min-h-[112px] flex-col items-center justify-center gap-2 px-4 py-5 text-center text-sm">
          <FileCheck2 size={22} className="text-brand-strong" aria-hidden="true" />
          <p role="status" className="m-0 font-medium text-muted">
            {filtersActive ? (total > 50 ? "Không có kết quả phù hợp trên trang này" : "Không có kết quả phù hợp") : emptyMessage}
          </p>
          {filtersActive && <button type="button" onClick={clearFilters} className="cursor-pointer font-semibold text-[#805B27] underline underline-offset-2">Xóa bộ lọc</button>}
        </div>
      ) : (
        <div>
          <div className={`hidden gap-3 bg-canvas px-4 py-2.5 text-xs font-semibold text-muted @min-[850px]/exceptions:grid ${rowColumns}`} aria-hidden="true">
            <span>KOL / Nhãn hàng</span><span>Sản phẩm</span><span className="text-right">Thù lao</span><span className="text-right">KPI cam kết</span><span className="text-right">Ngày gửi</span><span className="text-right">Thao tác</span>
          </div>
          <ul aria-label="Danh sách thỏa thuận đặc cách" className="m-0 list-none divide-y divide-line p-0 @min-[850px]/exceptions:border-t @min-[850px]/exceptions:border-line">
            {filteredItems.map((item) => {
              const products = dealProducts(item);
              const product = products[0];
              const storeWide = item.scopeType === "STORE_WIDE";
              const rate = Number(item.approvedCommissionRate ?? item.proposedCommissionRate);
              const sent = item.createdAt ? new Date(item.createdAt) : null;
              const sentLabel = sent && Number.isFinite(sent.getTime()) ? dateFormat.format(sent) : "—";
              const kpi = formatCommitment(Number(item.targetOrders ?? 0), Number(item.targetRevenue ?? 0));
              return (
                <li key={item.id} className={`grid min-h-[76px] min-w-0 grid-cols-2 items-center gap-x-3 gap-y-2.5 px-3 py-3 text-sm @min-[560px]/exceptions:px-4 ${rowColumns}`}>
                  <div className="min-w-0 [overflow-wrap:anywhere]">
                    <strong className="block font-semibold">{item.collaborator?.fullName || "Chưa có tên KOL"}</strong>
                    <span className="block text-xs text-muted">{item.store?.name || "Chưa có nhãn hàng"}</span>
                  </div>
                  <div className="flex min-w-0 items-center gap-2">
                    {product && !storeWide ? (
                      <img src={getSafeProductImageUrl(product.imageUrl, product.title, product.categoryName)} alt="" loading="lazy" onError={handleProductImageError} className="size-9 shrink-0 rounded-md border border-line bg-canvas object-cover" />
                    ) : (
                      <span className="grid size-9 shrink-0 place-items-center rounded-md border border-line bg-canvas text-brand-strong"><Package size={16} aria-hidden="true" /></span>
                    )}
                    <div className="min-w-0">
                      <span className="line-clamp-2 text-xs font-medium leading-4 [overflow-wrap:anywhere]" title={product?.title}>
                        {storeWide ? "Toàn gian hàng" : product?.title || "Chưa có sản phẩm"}
                      </span>
                      {!storeWide && products.length > 1 && <span className="text-[11px] text-muted">+{products.length - 1} sản phẩm</span>}
                    </div>
                  </div>
                  <div className="tabular-nums @min-[850px]/exceptions:text-right">
                    <span className="block text-xs text-muted @min-[850px]/exceptions:sr-only">Thù lao</span>
                    <strong className="font-semibold text-[#805B27]">{Number.isFinite(rate) ? `${numberFormat.format(rate)}%` : "—"}</strong>
                  </div>
                  <div className="min-w-0 text-xs font-medium tabular-nums [overflow-wrap:anywhere] @min-[850px]/exceptions:text-right">
                    <span className="block font-normal text-muted @min-[850px]/exceptions:sr-only">KPI cam kết</span>
                    {kpi || "Theo thỏa thuận"}
                  </div>
                  <div className="text-xs tabular-nums text-muted @min-[850px]/exceptions:text-right">
                    <span className="block @min-[850px]/exceptions:sr-only">Ngày gửi</span>
                    {sentLabel}
                  </div>
                  <button type="button" aria-haspopup="dialog" onClick={() => setDetailItem(item)}
                    className={`h-9 w-full cursor-pointer rounded-lg border px-2 text-xs font-semibold whitespace-nowrap text-[#715126] transition-colors hover:border-brand focus-visible:outline-2 focus-visible:outline-brand-strong ${item.status === "PENDING_ADMIN_APPROVAL" ? "border-brand-border bg-brand-soft" : "border-line bg-white"}`}>
                    {item.status === "PENDING_ADMIN_APPROVAL" ? "Thẩm định" : "Xem hồ sơ"}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {total > 50 && <nav aria-label="Phân trang ngoại lệ VIP" className="flex flex-wrap items-center justify-end gap-2.5 border-t border-line bg-canvas px-3 py-2.5 text-xs @min-[560px]/exceptions:px-4">
        <span className="mr-auto text-muted">Trang {page}/{Math.ceil(total / 50)} · {total} đề xuất</span>
        <button type="button" disabled={loading || busy || page <= 1} onClick={() => setPage(value => value - 1)} className="min-h-9 rounded-lg border border-line bg-white px-3 disabled:opacity-50">Trang trước</button>
        <button type="button" disabled={loading || busy || page * 50 >= total} onClick={() => setPage(value => value + 1)} className="min-h-9 rounded-lg border border-line bg-white px-3 disabled:opacity-50">Trang sau</button>
      </nav>}

      {detailItem && !selected && !previewProduct && (() => {
        const item = detailItem;
        const products = dealProducts(item);
        const rate = Number(item.approvedCommissionRate ?? item.proposedCommissionRate);
        const status = item.status === "APPROVED" ? "Đã phê duyệt" : item.status === "REJECTED" ? "Đã từ chối" : "Chờ thẩm định";
        const reviewer = item.exceptionReviewer ?? item.reviewer;
        const reviewedAt = item.adminApprovedAt ?? item.reviewedAt;
        const timestamp = (value?: string | null) => {
          const date = value ? new Date(value) : null;
          return date && Number.isFinite(date.getTime())
            ? date.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" })
            : "Chưa ghi nhận";
        };
        const scope = item.scopeType === "STORE_WIDE" ? "Toàn gian hàng" : item.scopeType === "SELECTED_PRODUCTS" ? `${products.length} sản phẩm` : "Sản phẩm đơn lẻ";
        const lifecycle = item.closedAt ? "Đã đóng" : item.commitmentEndsAt && Date.parse(item.commitmentEndsAt) <= Date.now() ? "Đã kết thúc kỳ KPI" : item.commitmentStartedAt && Date.parse(item.commitmentStartedAt) <= Date.now() ? "Đã bắt đầu kỳ KPI" : "Chưa ghi nhận ngày bắt đầu";
        return (
          <Modal isOpen title="Hồ sơ thỏa thuận đặc cách" maxWidth="4xl" stickyHeader
            onClose={() => setDetailItem(null)}
            subtitle={<span>{item.store?.name || "Chưa có nhãn hàng"} · {item.collaborator?.fullName || "Chưa có tên KOL"}</span>}
            footer={<div className="flex flex-wrap items-center justify-end gap-2">
              <button type="button" onClick={() => setDetailItem(null)} className="h-10 rounded-lg border border-line bg-white px-4 text-sm font-medium">Đóng</button>
              {item.status === "PENDING_ADMIN_APPROVAL" && <>
                <button type="button" onClick={() => { setSelected(item); setApprove(false); setNote(""); setError(""); }} className="h-10 rounded-lg border border-danger/30 px-4 text-sm font-semibold text-danger">Từ chối</button>
                <button type="button" onClick={() => { setSelected(item); setApprove(true); setNote(""); setError(""); }} className="h-10 rounded-lg border border-brand-strong bg-brand px-4 text-sm font-semibold text-brand-dark">Phê duyệt</button>
              </>}
            </div>}
          >
            <article className="space-y-4 text-sm text-ink">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${item.status === "REJECTED" ? "border-danger/20 text-danger" : "border-brand-border bg-brand-soft text-[#805B27]"}`}>{status}</span>
                <span className="text-xs text-muted">Gửi {timestamp(item.createdAt)}</span>
              </div>
              <dl className="m-0 grid grid-cols-3 divide-x divide-line border-y border-line py-3">
                {[
                  [item.approvedCommissionRate != null ? "Thù lao Deal" : "Thù lao đề xuất", Number.isFinite(rate) ? `${numberFormat.format(rate)}%` : "—"],
                  ["KPI cam kết", formatCommitment(Number(item.targetOrders ?? 0), Number(item.targetRevenue ?? 0)) || "Theo thỏa thuận"],
                  ["Thời hạn", item.commitmentDays ? `${item.commitmentDays} ngày` : "Chưa ghi nhận"],
                ].map(([label, value], index) => <div key={label} className="min-w-0 px-3 first:pl-0 last:pr-0">
                  <dt className="text-xs text-muted">{label}</dt>
                  <dd className={`m-0 mt-1.5 font-semibold tabular-nums [overflow-wrap:anywhere] ${index === 0 ? "text-xl text-[#805B27]" : "text-sm"}`}>{value}</dd>
                </div>)}
              </dl>

              <section aria-label="Sản phẩm áp dụng">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted"><strong className="font-medium">Sản phẩm áp dụng</strong><span>{scope}</span></div>
                {item.scopeType === "STORE_WIDE" ? <p className="m-0 py-2">Toàn bộ sản phẩm của {item.store?.name}</p> : products.length ? (
                  <div className="divide-y divide-line">
                    {products.map((product: any) => <div key={product.id} className="flex items-center gap-3 py-2.5">
                      <img src={getSafeProductImageUrl(product.imageUrl, product.title, product.categoryName)} alt="" onError={handleProductImageError} className="size-11 shrink-0 rounded-lg border border-line bg-canvas object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="m-0 font-semibold leading-5 [overflow-wrap:anywhere]">{product.title}</p>
                        <p className="m-0 mt-1 text-xs text-muted tabular-nums">{product.price != null ? formatMoney(product.price) : "Chưa có giá"}{product.floorPrice != null && <> · Giá sàn {formatMoney(product.floorPrice)}</>}</p>
                      </div>
                      <button type="button" onClick={() => setPreviewProduct({ ...product, storeName: item.store?.name })} className="min-h-9 shrink-0 rounded-lg border border-line px-3 text-xs font-semibold text-[#805B27] hover:bg-brand-soft">Chi tiết</button>
                    </div>)}
                  </div>
                ) : <p className="m-0 text-muted">Chưa gắn thông tin sản phẩm.</p>}
              </section>

              <dl className="m-0 grid gap-3 border-y border-line py-3 sm:grid-cols-2 sm:gap-0 sm:divide-x sm:divide-line">
                <div className="min-w-0 sm:pr-4">
                  <dt className="text-xs font-semibold text-[#805B27]">Thù lao tiêu chuẩn</dt>
                  <dd className="m-0 mt-1 font-medium">10% + phần tăng theo bậc áp dụng</dd>
                  <dd className="m-0 mt-1 text-xs leading-5 text-muted">Mở khóa sau 14 ngày và đủ điều kiện đối soát.</dd>
                </div>
                <div className="min-w-0 sm:pl-4">
                  <dt className="text-xs font-semibold text-[#805B27]">Chênh lệch chờ KPI</dt>
                  <dd className="m-0 mt-1 font-medium">{Number.isFinite(rate) ? `${numberFormat.format(rate)}%` : "Mức Deal"} − mức tiêu chuẩn</dd>
                  <dd className="m-0 mt-1 text-xs leading-5 text-muted">Mở khóa khi đạt KPI và đủ điều kiện đối soát.</dd>
                </div>
              </dl>
              {item.salesCommitment && <section><h4 className="m-0 text-xs font-semibold text-muted">Kế hoạch</h4><p className="m-0 mt-1 whitespace-pre-wrap leading-6 [overflow-wrap:anywhere]">{item.salesCommitment}</p></section>}
              {(item.exceptionNote || (item.status === "REJECTED" && item.shopResponse)) && <section>
                <h4 className="m-0 text-xs font-semibold text-muted">{item.status === "REJECTED" ? "Lý do từ chối" : "Căn cứ phê duyệt"}</h4>
                <p className="m-0 mt-1 whitespace-pre-wrap leading-6 [overflow-wrap:anywhere]">{item.exceptionNote || item.shopResponse}</p>
              </section>}
              <dl className="m-0 grid gap-x-6 gap-y-3 border-t border-line pt-3 text-xs sm:grid-cols-2">
                <div><dt className="text-muted">Người duyệt</dt><dd className="m-0 mt-1 font-medium">{reviewer?.fullName || "Chưa ghi nhận"}</dd></div>
                <div><dt className="text-muted">Thời gian duyệt</dt><dd className="m-0 mt-1 tabular-nums">{timestamp(reviewedAt)}</dd></div>
                {item.status === "APPROVED" && <>
                  <div><dt className="text-muted">Kỳ KPI</dt><dd className="m-0 mt-1">{lifecycle}</dd></div>
                  <div><dt className="text-muted">Bắt đầu / Kết thúc KPI</dt><dd className="m-0 mt-1 tabular-nums">{timestamp(item.commitmentStartedAt)} / {timestamp(item.commitmentEndsAt)}</dd></div>
                </>}
              </dl>
            </article>
          </Modal>
        );
      })()}

      {/* 5. Product Quick View Modal */}
      {previewProduct && (
        <Modal
          isOpen
          title="Chi tiết Sản phẩm Thỏa thuận"
          onClose={() => setPreviewProduct(null)}
        >
          <div className="space-y-4 text-xs text-[#1A1612]">
            <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
              <img
                src={getSafeProductImageUrl(
                  previewProduct.imageUrl,
                  previewProduct.title,
                  previewProduct.categoryName
                )}
                alt={previewProduct.title}
                onError={handleProductImageError}
                className="w-36 h-36 rounded-lg object-cover border border-[#EAE4D7] shrink-0 bg-[#FAF8F5] shadow-2xs"
              />

              <div className="space-y-2 flex-1 w-full">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F3EFE6] text-[#7D715E] border border-[#EAE4D7]">
                    {previewProduct.categoryName || "Mỹ phẩm & Chăm sóc"}
                  </span>
                  {previewProduct.sku && (
                    <span className="text-[10px] text-[#7D715E] font-mono">
                      SKU: {previewProduct.sku}
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-[#1A1612] leading-snug">
                  {previewProduct.title}
                </h3>

                {previewProduct.storeName && (
                  <p className="text-[11px] text-[#7D715E]">
                    Gian hàng: <strong className="text-[#1A1612]">{previewProduct.storeName}</strong>
                  </p>
                )}

                {/* Price Grid */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-2.5 rounded-lg bg-[#FAF8F5] border border-[#EAE4D7]">
                    <span className="text-[10px] text-[#7D715E] block font-medium">Giá bán lẻ</span>
                    <strong className="text-sm font-bold text-[#B88E4F] tabular-nums">
                      {formatMoney(previewProduct.price)}
                    </strong>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#FAF8F5] border border-[#EAE4D7]">
                    <span className="text-[10px] text-[#7D715E] block font-medium">Giá sàn bảo vệ</span>
                    <strong className="text-sm font-bold text-[#1A1612] tabular-nums">
                      {previewProduct.floorPrice ? formatMoney(previewProduct.floorPrice) : "Chưa thiết lập"}
                    </strong>
                  </div>
                </div>

                {/* Additional Specs */}
                <div className="flex items-center gap-3 pt-1 text-[11px] text-[#7D715E]">
                  <div>
                    Tồn kho: <strong className="text-[#1A1612]">{previewProduct.stockQuantity || 0}</strong>
                  </div>
                  <span>•</span>
                  <div>
                    Xuất xứ: <strong className="text-[#1A1612]">{previewProduct.origin || "Chính hãng"}</strong>
                  </div>
                  <span>•</span>
                  <div>
                    Mẫu thử: <strong className="text-[#1A1612]">{previewProduct.sampleEnabled ? "Có" : "Không"}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Description / Content snippet */}
            {previewProduct.description && (
              <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#EAE4D7] space-y-1">
                <span className="text-[10px] font-bold text-[#7D715E] uppercase tracking-wider block">
                  Thông tin sản phẩm:
                </span>
                <p className="text-[11px] text-[#1A1612] leading-relaxed line-clamp-3">
                  {previewProduct.description.replace(/<[^>]*>/g, "")}
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-[#EAE4D7]">
              <button
                type="button"
                onClick={() => setPreviewProduct(null)}
                className="px-4 py-1.5 rounded-lg bg-[#C59B58] text-white font-semibold text-xs hover:bg-[#B88E4F] transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 6. Modal Phê duyệt / Từ chối Thỏa thuận */}
      {selected && (
        <Modal
          isOpen
          title={
            approve
              ? "Ký Phê duyệt Thỏa thuận Thù lao Đặc cách"
              : "Từ chối Đề xuất Thù lao Đặc cách"
          }
          onClose={() => {
            if (!busy) setSelected(null);
          }}
        >
          <form onSubmit={handleDecisionSubmit} className="space-y-4" aria-busy={busy}>
            {/* Summary Box */}
            <div className="p-3 rounded-lg bg-[#FBF5EB] border border-[#EEDFC6] text-xs space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-[#EEDFC6]">
                <span className="text-[#7D715E]">Cửa hàng:</span>
                <strong className="text-[#1A1612] font-bold">{selected.store?.name}</strong>
              </div>
              <div className="flex items-center justify-between pb-1 border-b border-[#EEDFC6]">
                <span className="text-[#7D715E]">Đối tác KOL:</span>
                <strong className="text-[#1A1612] font-bold">{selected.collaborator?.fullName}</strong>
              </div>
              <div className="flex items-center justify-between pb-1 border-b border-[#EEDFC6]">
                <span className="text-[#7D715E]">Mức thù lao thỏa thuận:</span>
                <strong className="text-[#B88E4F] text-base font-bold tabular-nums">
                  {Number(selected.proposedCommissionRate)}%
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#7D715E]">Cam kết KPI:</span>
                <strong className="text-[#1A1612] font-bold tabular-nums">
                  {Number(selected.targetOrders || 0) > 0
                    ? `${Number(selected.targetOrders).toLocaleString("vi-VN")} đơn`
                    : `${Number(selected.targetRevenue || 0).toLocaleString("vi-VN")}₫`}
                </strong>
              </div>
            </div>

            {/* Note input */}
            <div className="space-y-1.5">
              <label htmlFor="decision-note" className="block text-xs font-bold text-[#1A1612]">
                Căn cứ phê duyệt & Lưu vết Kiểm toán (Audit Log) <span className="text-[#DC2626]">*</span>
              </label>
              <textarea
                id="decision-note"
                required
                minLength={10}
                maxLength={1000}
                disabled={busy}
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  approve
                    ? "Nhập căn cứ chấp thuận: Đánh giá năng lực chốt đơn của KOL, tỷ lệ tương thích tệp khán giả..."
                    : "Nhập lý do từ chối: Cam kết số đơn hàng chưa tương xứng với mức thù lao đề xuất..."
                }
                className="w-full rounded-lg border border-[#EAE4D7] p-2.5 text-xs text-[#1A1612] placeholder:text-[#7D715E] focus:outline-none focus:border-[#C59B58] transition"
              />
              <span className="text-[10px] text-[#7D715E] block text-right">Tối thiểu 10 ký tự ({note.trim().length}/1000)</span>
            </div>

            {error && (
              <p role="alert" className="text-xs text-[#DC2626] font-medium">
                {error}
              </p>
            )}

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EAE4D7]">
              <button
                type="button"
                disabled={busy}
                onClick={() => setSelected(null)}
                className="px-3.5 py-1.5 rounded-lg border border-[#EAE4D7] bg-white text-xs font-semibold text-[#7D715E] hover:text-[#1A1612] transition cursor-pointer"
              >
                Hủy bỏ
              </button>

              <button
                type="submit"
                disabled={busy || note.trim().length < 10}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold text-white transition shadow-2xs cursor-pointer disabled:opacity-50 ${
                  approve
                    ? "bg-[#C59B58] hover:bg-[#B88E4F]"
                    : "bg-[#DC2626] hover:bg-[#B91C1C]"
                }`}
              >
                {busy ? "Đang xử lý..." : approve ? "Ký Phê duyệt Đặc cách" : "Xác nhận Từ chối"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showPolicyModal && (
        <Modal isOpen title="Quy chuẩn thù lao" maxWidth="3xl" className="max-w-[720px]!" stickyHeader
          onClose={() => setShowPolicyModal(false)}
          footer={<div className="flex justify-end"><button type="button" onClick={() => setShowPolicyModal(false)} className="h-10 rounded-lg border border-brand-strong bg-brand px-5 text-sm font-semibold text-brand-dark">Đã hiểu</button></div>}
        >
          <div className="divide-y divide-line text-sm">
            <section className="pb-4">
              <h4 className="m-0 mb-3 text-[13px] font-semibold text-[#805B27]">Thẩm quyền phê duyệt</h4>
              <dl className="m-0 space-y-2.5">
                {[
                  ["Đến 16%", "Shop phê duyệt"],
                  ["Trên 16% đến 25%", "Admin phê duyệt"],
                  ["Trần tổng thù lao", "25%"],
                ].map(([label, value]) => <div key={label} className="grid grid-cols-2 gap-4"><dt className="text-muted">{label}</dt><dd className="m-0 font-medium">{value}</dd></div>)}
              </dl>
            </section>
            <section className="py-4">
              <h4 className="m-0 mb-3 text-[13px] font-semibold text-[#805B27]">Thù lao &amp; đối soát</h4>
              <dl className="m-0 space-y-2.5">
                <div className="grid grid-cols-2 gap-4"><dt className="text-muted">Tiêu chuẩn</dt><dd className="m-0 font-medium">10% + phần tăng theo bậc</dd></div>
                <div className="grid grid-cols-2 gap-4"><dt className="text-muted">Chênh lệch Deal</dt><dd className="m-0 font-medium">Mức Deal − mức tiêu chuẩn</dd></div>
              </dl>
              <div className="mt-3 grid grid-cols-2 divide-x divide-line rounded-lg border border-line bg-canvas py-2.5 text-center text-xs">
                <div className="grid grid-cols-2 gap-1 px-2"><span className="text-muted">Đồng</span><strong>10%</strong><span className="text-muted">Bạc</span><strong>11%</strong></div>
                <div className="grid grid-cols-2 gap-1 px-2"><span className="text-muted">Vàng</span><strong>12%</strong><span className="text-muted">Kim Cương</span><strong>13%</strong></div>
              </div>
              <p className="mb-0 mt-3 text-xs leading-5 text-muted">Mức Deal là tổng thù lao áp dụng. Tiêu chuẩn mở khóa sau 14 ngày và đủ điều kiện đối soát. Chênh lệch mở khóa khi đạt KPI và đủ điều kiện đối soát.</p>
              <p className="mb-0 mt-2 text-xs leading-5 text-muted">Phụ trợ Livestream +2% vẫn tuân theo trần tổng 25%.</p>
            </section>
            <section className="pt-4">
              <h4 className="m-0 text-[13px] font-semibold text-[#805B27]">Lưu vết xét duyệt</h4>
              <p className="mb-0 mt-2 text-xs leading-5 text-muted">Người duyệt · Thời gian · Quyết định · Căn cứ xét duyệt.</p>
            </section>
          </div>
        </Modal>
      )}
    </section>
  );
}
