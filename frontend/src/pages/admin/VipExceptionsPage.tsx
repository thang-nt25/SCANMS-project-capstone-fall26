import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  RefreshCw,
  Search,
  AlertTriangle,
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
  totalTargetRevenue: number;
  avgRate: number;
}

type TabType = "pending" | "approved" | "rejected";

export default function VipExceptionsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [items, setItems] = useState<any[]>([]);
  const [stats, setStats] = useState<ExceptionStats>({
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    totalTargetRevenue: 0,
    avgRate: 17.5,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStore, setSelectedStore] = useState<string>("ALL");
  const [selectedRateRange, setSelectedRateRange] = useState<string>("ALL");
  const [showPolicyModal, setShowPolicyModal] = useState(false);

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
          params: { tab },
          headers: { "x-skip-cache": "1" },
        })
      );

      if (response && typeof response === "object" && !Array.isArray(response)) {
        setItems(Array.isArray(response.items) ? response.items : []);
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
  }, [activeTab]);

  useEffect(() => {
    void loadData(activeTab);
  }, [activeTab, loadData]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchQuery("");
    setSelectedStore("ALL");
    setSelectedRateRange("ALL");
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
        matchRate = rate >= 16 && rate <= 18;
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

  // Clean, professional Tier badge (No emojis, no AI-vibe)
  const renderTierBadge = (tierName?: string, tierBonus: number = 0) => {
    const t = (tierName || "").toLowerCase();
    if (t.includes("kim cương") || t.includes("diamond")) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
          Hạng Kim Cương (+{tierBonus}%)
        </span>
      );
    }
    if (t.includes("vàng") || t.includes("gold")) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
          Hạng Vàng (+{tierBonus}%)
        </span>
      );
    }
    if (t.includes("bạc") || t.includes("silver")) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
          Hạng Bạc (+{tierBonus}%)
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-orange-50 text-orange-800 border border-orange-200">
        Hạng Đồng (+{tierBonus}%)
      </span>
    );
  };

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

  return (
    <main className="min-h-screen bg-[#FAF8F5] p-5 lg:p-7 text-[#1A1612] space-y-5">
      {/* 1. Header Section (Clean enterprise single-row header) */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#EAE4D7]">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold tracking-tight text-[#1A1612]">
            Phê duyệt Thỏa thuận Đặc cách
          </h1>
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6]">
            &gt; 16% (Trần 25%)
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowPolicyModal(true)}
            className="px-3 py-1.5 rounded-lg border border-[#EAE4D7] bg-white text-xs font-semibold text-[#7D715E] hover:text-[#1A1612] hover:border-[#C59B58] transition shadow-2xs cursor-pointer"
          >
            Quy chuẩn Trần 25%
          </button>

          <button
            type="button"
            disabled={loading || busy}
            onClick={() => void loadData(activeTab)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>{loading ? "Đang tải..." : "Làm mới"}</span>
          </button>
        </div>
      </header>

      {/* 2. Top Metric Strip (Clean, understated typography) */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-[#EAE4D7] p-3.5 shadow-2xs">
          <p className="text-[11px] font-semibold text-[#7D715E] uppercase tracking-wider">Chờ thẩm định</p>
          <p className="text-2xl font-bold text-[#1A1612] tabular-nums mt-1">{stats.pendingCount}</p>
        </div>

        <div className="bg-white rounded-xl border border-[#EAE4D7] p-3.5 shadow-2xs">
          <p className="text-[11px] font-semibold text-[#7D715E] uppercase tracking-wider">Đã phê duyệt</p>
          <p className="text-2xl font-bold text-[#059669] tabular-nums mt-1">{stats.approvedCount}</p>
        </div>

        <div className="bg-white rounded-xl border border-[#EAE4D7] p-3.5 shadow-2xs">
          <p className="text-[11px] font-semibold text-[#7D715E] uppercase tracking-wider">Đã từ chối</p>
          <p className="text-2xl font-bold text-[#DC2626] tabular-nums mt-1">{stats.rejectedCount}</p>
        </div>

        <div className="bg-white rounded-xl border border-[#EAE4D7] p-3.5 shadow-2xs">
          <p className="text-[11px] font-semibold text-[#7D715E] uppercase tracking-wider">Pipeline cam kết</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-[#1A1612] tabular-nums">
              {stats.totalTargetRevenue > 0
                ? `${Math.round(stats.totalTargetRevenue / 1000000)}M`
                : "0₫"}
            </span>
            <span className="text-xs text-[#7D715E]">TB {stats.avgRate}%</span>
          </div>
        </div>
      </section>

      {/* 3. Tab Bar & Filter Controls */}
      <section className="bg-white rounded-xl border border-[#EAE4D7] p-3 shadow-2xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-[#EAE4D7]">
          {/* Tab Navigation (Clean text tabs, no icon clutter) */}
          <div className="inline-flex p-1 bg-[#F3EFE6] rounded-lg border border-[#EAE4D7]">
            <button
              type="button"
              onClick={() => handleTabChange("pending")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                activeTab === "pending"
                  ? "bg-white text-[#1A1612] shadow-2xs"
                  : "text-[#7D715E] hover:text-[#1A1612]"
              }`}
            >
              Chờ thẩm định ({stats.pendingCount})
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("approved")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                activeTab === "approved"
                  ? "bg-white text-[#1A1612] shadow-2xs"
                  : "text-[#7D715E] hover:text-[#1A1612]"
              }`}
            >
              Đã phê duyệt ({stats.approvedCount})
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("rejected")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                activeTab === "rejected"
                  ? "bg-white text-[#1A1612] shadow-2xs"
                  : "text-[#7D715E] hover:text-[#1A1612]"
              }`}
            >
              Đã từ chối ({stats.rejectedCount})
            </button>
          </div>

          <span className="text-xs text-[#7D715E]">
            Hiển thị <strong className="text-[#1A1612] font-semibold">{filteredItems.length}</strong> thỏa thuận
          </span>
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7D715E]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo KOL, Cửa hàng, Sản phẩm..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] text-xs text-[#1A1612] placeholder:text-[#7D715E] focus:bg-white focus:border-[#C59B58] focus:outline-none transition"
            />
          </div>

          <div>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] text-xs text-[#1A1612] focus:bg-white focus:border-[#C59B58] focus:outline-none transition"
            >
              <option value="ALL">Tất cả Nhãn hàng nội bộ</option>
              {storeOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedRateRange}
              onChange={(e) => setSelectedRateRange(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] text-xs text-[#1A1612] focus:bg-white focus:border-[#C59B58] focus:outline-none transition"
            >
              <option value="ALL">Tất cả biên thù lao leo thang</option>
              <option value="16-18">16.1% - 18.0% (Mức tăng trưởng)</option>
              <option value="18-21">18.1% - 21.0% (Đối tác chiến lược)</option>
              <option value="21-25">21.1% - 25.0% (Cận trần tối đa)</option>
            </select>
          </div>
        </div>
      </section>

      {/* 4. Main Content Area */}
      {error && !selected && (
        <div role="alert" className="p-3 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/20 text-xs text-[#DC2626] font-medium flex items-center gap-2">
          <AlertTriangle size={15} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-[#EAE4D7] p-12 text-center space-y-2">
          <RefreshCw size={20} className="animate-spin text-[#C59B58] mx-auto" />
          <p className="text-xs text-[#7D715E]">Đang tải dữ liệu...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        /* Empty State */
        <section className="bg-white rounded-xl border border-[#EAE4D7] p-10 text-center space-y-2 shadow-2xs">
          <h3 className="text-sm font-bold text-[#1A1612]">
            {activeTab === "pending"
              ? "Không có đề xuất thù lao tồn đọng"
              : activeTab === "approved"
              ? "Chưa có thỏa thuận nào được phê duyệt"
              : "Chưa có đề xuất nào bị từ chối"}
          </h3>
          <p className="text-xs text-[#7D715E] max-w-sm mx-auto">
            {activeTab === "pending"
              ? "Tất cả các đề xuất thù lao leo thang (> 16%) đã được thẩm định xong."
              : activeTab === "approved"
              ? "Danh sách các thỏa thuận đặc cách đã được phê duyệt sẽ hiển thị tại đây."
              : "Danh sách các đề xuất thù lao bị từ chối sẽ hiển thị tại đây."}
          </p>
        </section>
      ) : (
        /* Items Grid / List */
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const proposedRate = Number(item.proposedCommissionRate || 0);
            const targetRev = Number(item.targetRevenue || 0);
            const tierName = item.collaborator?.collaboratorProfile?.tier?.name || "Đồng";
            const tierBonus = Number(item.collaborator?.collaboratorProfile?.tier?.extraBonusPercentage || 0);
            const standardRate = 10 + tierBonus;
            const kpiDiffRate = Math.max(0, proposedRate - standardRate);

            // Extract products
            const products: any[] =
              item.scopeType === "SELECTED_PRODUCTS"
                ? (item.scopeProducts || []).map((sp: any) => sp.product).filter(Boolean)
                : item.product
                ? [item.product]
                : [];

            return (
              <article
                key={item.id}
                className="bg-white rounded-xl border border-[#EAE4D7] hover:border-[#C59B58]/80 transition shadow-2xs overflow-hidden"
              >
                {/* 4.1 Card Header: Clean, non-repetitive financial presentation */}
                <div className="bg-[#FAF8F5] px-4 py-3 border-b border-[#EAE4D7] flex flex-wrap items-center justify-between gap-3">
                  {/* Store & KOL Identity */}
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-sm font-bold text-[#1A1612]">{item.store?.name}</strong>
                      <span className="text-[10px] text-[#7D715E] bg-[#F3EFE6] px-1.5 py-0.5 rounded">
                        Nhãn hàng nội bộ
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-[#7D715E]">
                      <span>Đối tác: <strong className="text-[#1A1612]">{item.collaborator?.fullName}</strong></span>
                      {renderTierBadge(tierName, tierBonus)}
                    </div>
                  </div>

                  {/* Proposal Rate & Single Status (No duplicate numbers, no AI sparkles) */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[10px] text-[#7D715E] block uppercase tracking-wider font-semibold">
                        {item.status === "APPROVED" ? "Thù lao thỏa thuận" : "Thù lao đề xuất"}
                      </span>
                      <span className="text-2xl font-black text-[#B88E4F] tabular-nums tracking-tight block">
                        {proposedRate}%
                      </span>
                    </div>

                    <div>
                      {item.status === "APPROVED" ? (
                        <span className="px-3 py-1 rounded-md text-xs font-semibold bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                          Đã phê duyệt
                        </span>
                      ) : item.status === "REJECTED" ? (
                        <span className="px-3 py-1 rounded-md text-xs font-semibold bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]">
                          Đã từ chối
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-md text-xs font-semibold bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]">
                          Chờ thẩm định
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4.2 Card Body */}
                <div className="p-4 space-y-3.5">
                  {/* Commitments & Scope Strip */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 bg-[#FAF8F5] rounded-lg border border-[#EAE4D7] text-xs">
                    <div>
                      <span className="text-[#7D715E] mr-1.5">Phạm vi:</span>
                      <strong className="text-[#1A1612]">
                        {item.scopeType === "STORE_WIDE"
                          ? "Toàn bộ gian hàng"
                          : item.scopeType === "SELECTED_PRODUCTS"
                          ? `Nhóm chọn lọc (${products.length} sản phẩm)`
                          : "Sản phẩm đơn lẻ"}
                      </strong>
                    </div>

                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-[#7D715E] mr-1.5">Cam kết doanh thu:</span>
                        <strong className="text-[#B88E4F] font-bold tabular-nums">
                          {targetRev > 0 ? formatMoney(targetRev) : "Theo thỏa thuận"}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[#7D715E] mr-1.5">Thời hạn:</span>
                        <strong className="text-[#1A1612] font-bold">{item.commitmentDays || 30} ngày</strong>
                      </div>
                    </div>
                  </div>

                  {/* 4.3 Product Showcase Section (Real Images & Clickable Details) */}
                  {item.scopeType === "STORE_WIDE" ? (
                    <div className="p-3 bg-white rounded-lg border border-[#EAE4D7]">
                      <strong className="text-xs font-bold text-[#1A1612] block">
                        Áp dụng toàn bộ danh mục sản phẩm của {item.store?.name}
                      </strong>
                      <span className="text-[11px] text-[#7D715E] mt-0.5 block">
                        Bao gồm tất cả sản phẩm hiện hành và sản phẩm mới niêm yết trong thời gian thỏa thuận.
                      </span>
                    </div>
                  ) : products.length > 0 ? (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-[#7D715E] uppercase tracking-wider block">
                        Sản phẩm áp dụng ({products.length})
                      </span>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {products.map((p: any) => {
                          const safeImg = getSafeProductImageUrl(p.imageUrl, p.title, p.categoryName);
                          return (
                            <div
                              key={p.id}
                              className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-[#EAE4D7] hover:border-[#C59B58] transition shadow-2xs"
                            >
                              <img
                                src={safeImg}
                                alt={p.title}
                                onError={handleProductImageError}
                                className="w-12 h-12 rounded-md object-cover border border-[#EAE4D7] shrink-0 bg-[#FAF8F5]"
                              />
                              <div className="min-w-0 flex-1">
                                <p
                                  className="text-xs font-semibold text-[#1A1612] truncate"
                                  title={p.title}
                                >
                                  {p.title}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs font-bold text-[#B88E4F] tabular-nums">
                                    {formatMoney(p.price)}
                                  </span>
                                  {p.floorPrice && (
                                    <span className="text-[10px] text-[#7D715E]">
                                      Sàn: {formatMoney(p.floorPrice)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewProduct({
                                    ...p,
                                    storeName: item.store?.name,
                                  })
                                }
                                className="px-2 py-1 rounded text-[11px] font-semibold text-[#B88E4F] hover:bg-[#FBF5EB] border border-[#EEDFC6] transition shrink-0 cursor-pointer"
                              >
                                Chi tiết
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-[#FAF8F5] rounded-lg border border-[#EAE4D7] text-xs text-[#7D715E]">
                      Chưa gắn thông tin sản phẩm cụ thể.
                    </div>
                  )}

                  {/* 4.4 2-Stage Financial Breakdown (Executive Telemetry) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-lg bg-[#FBF5EB] border border-[#EEDFC6] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-[#8F682E] uppercase tracking-wider block">
                          Giai đoạn 1 • Tiền chắc chắn (14 ngày)
                        </span>
                        <span className="text-xs text-[#7D715E] mt-0.5 block">
                          Khả dụng sau hạn 14 ngày đổi trả
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xl font-bold text-[#1A1612] tabular-nums block">
                          {standardRate}%
                        </span>
                        <span className="text-[10px] text-[#7D715E]">10% Gốc + {tierBonus}% Bậc</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-[#D97706] uppercase tracking-wider block">
                          Giai đoạn 2 • Treo thưởng KPI
                        </span>
                        <span className="text-xs text-[#7D715E] mt-0.5 block">
                          Giải ngân khi đạt 100% doanh thu
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xl font-bold text-[#D97706] tabular-nums block">
                          +{kpiDiffRate}%
                        </span>
                        <span className="text-[10px] text-[#7D715E]">{proposedRate}% - {standardRate}%</span>
                      </div>
                    </div>
                  </div>

                  {/* 4.5 KOL Sales Commitment */}
                  {item.salesCommitment && (
                    <div className="text-xs p-2.5 rounded-lg bg-[#FAF8F5] border border-[#EAE4D7] flex items-start gap-2">
                      <span className="font-semibold text-[#7D715E] shrink-0 text-[11px]">Kế hoạch:</span>
                      <p className="text-[#1A1612] italic leading-relaxed">
                        "{item.salesCommitment}"
                      </p>
                    </div>
                  )}

                  {/* 4.6 Audit Trail Decision Note */}
                  {item.exceptionNote && (
                    <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs flex items-start gap-2">
                      <span className="font-semibold text-[#475569] shrink-0 text-[11px]">Căn cứ phê duyệt:</span>
                      <p className="text-[#1E293B] leading-relaxed">
                        {item.exceptionNote}
                      </p>
                    </div>
                  )}

                  {/* 4.7 Action Buttons for Pending Items */}
                  {item.status === "PENDING_ADMIN_APPROVAL" && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EAE4D7]">
                      <button
                        type="button"
                        onClick={() => {
                          setSelected(item);
                          setApprove(false);
                          setNote("");
                          setError("");
                        }}
                        className="px-3 py-1.5 rounded-lg border border-[#DC2626]/30 text-xs font-semibold text-[#DC2626] hover:bg-[#FEF2F2] transition cursor-pointer"
                      >
                        Từ chối
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelected(item);
                          setApprove(true);
                          setNote("");
                          setError("");
                        }}
                        className="px-4 py-1.5 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-xs font-bold text-white transition shadow-2xs cursor-pointer"
                      >
                        Ký Phê duyệt Đặc cách
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

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
                <span className="text-[#7D715E]">Cam kết doanh thu:</span>
                <strong className="text-[#1A1612] font-bold tabular-nums">
                  {Number(selected.targetRevenue || 0).toLocaleString("vi-VN")}₫
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
                    ? "Nhập căn cứ chấp thuận: Đánh giá tiềm năng doanh số của KOL, tỷ lệ tương thích tệp khán giả..."
                    : "Nhập lý do từ chối: Cam kết doanh thu chưa tương xứng với mức thù lao đề xuất..."
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

      {/* 7. Modal Quy chuẩn & Pháp chế Trần 25% */}
      {showPolicyModal && (
        <Modal
          isOpen
          title="Quy chế Quản trị Thù lao & Trần Thỏa thuận Đặc cách (SCANMS)"
          onClose={() => setShowPolicyModal(false)}
        >
          <div className="space-y-3.5 text-xs text-[#1A1612] leading-relaxed max-h-[70vh] overflow-y-auto pr-1">
            <div className="p-3 rounded-lg bg-[#FBF5EB] border border-[#EEDFC6] space-y-1">
              <strong className="text-[#8F682E] font-bold text-sm block">1. Cơ chế phân cấp thẩm quyền phê duyệt:</strong>
              <ul className="list-disc list-inside space-y-1 text-[#7D715E]">
                <li><strong className="text-[#1A1612]">&lt;= 16%:</strong> Quản lý Cửa hàng (<code>SHOP_MANAGER</code>) có toàn quyền chủ động đàm phán và duyệt thỏa thuận với KOL qua Chat realtime.</li>
                <li><strong className="text-[#1A1612]">&gt; 16% đến 25%:</strong> Bắt buộc leo thang lên Ban Giám Đốc (<code>SYSTEM_ADMIN</code>) thẩm định dựa trên cam kết doanh số và tiềm năng của KOL.</li>
                <li><strong className="text-[#1A1612]">Trần tuyệt đối 25%:</strong> Toàn hệ thống khóa cứng mức trần 25% (kể cả khi cộng phụ trợ Livestream +2%), ngăn chặn nguy cơ ăn mòn lợi nhuận doanh nghiệp.</li>
              </ul>
            </div>

            <div className="p-3 rounded-lg bg-white border border-[#EAE4D7] space-y-1">
              <strong className="text-[#1A1612] font-bold text-sm block">2. Nguyên tắc Giải ngân 2 Giai đoạn (Không cộng dồn):</strong>
              <p className="text-[#7D715E]">
                Thù lao Deal đặc cách <strong className="text-[#DC2626]">TUYỆT ĐỐI KHÔNG CỘNG DỒN VỚI BẬC KOL</strong>.
              </p>
              <div className="p-2.5 rounded-md bg-[#FAF8F5] border border-[#EAE4D7] space-y-1 text-[11px]">
                <p><strong>Giai đoạn 1:</strong> Trả trước <code>10% Gốc + Bậc KOL</code> ngay sau khi đơn hàng giao thành công qua hạn 14 ngày đổi trả.</p>
                <p><strong>Giai đoạn 2:</strong> Phần chênh lệch <code>Deal% - (10% + Bậc%)</code> được giam giữ trong Giỏ Escrow. Chỉ giải ngân khi đạt đủ 100% KPI doanh số đã cam kết.</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-white border border-[#EAE4D7] space-y-1">
              <strong className="text-[#1A1612] font-bold text-sm block">3. Trách nhiệm Kiểm toán & Audit Trail:</strong>
              <p className="text-[#7D715E]">
                Mọi hành động phê duyệt hoặc từ chối thỏa thuận đặc cách đều được mã hóa và ghi vĩnh viễn vào sổ cái <code>AuditLog</code> kèm lý do thẩm định của Admin, đảm bảo tính minh bạch tuyệt đối trước Ban Giám Đốc và Hội đồng kiểm toán.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowPolicyModal(false)}
                className="px-4 py-1.5 rounded-lg bg-[#C59B58] text-white font-bold text-xs hover:bg-[#B88E4F] transition"
              >
                Đã hiểu quy chế
              </button>
            </div>
          </div>
        </Modal>
      )}
    </main>
  );
}
