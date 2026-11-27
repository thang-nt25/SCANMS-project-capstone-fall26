import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  Flame,
  Search,
  RefreshCw,
  Lock,
  Eye,
  Activity,
  Info,
  Shield,
  Layers,
  X,
  Calendar,
  Copy,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  aiFraudService,
  type FraudIncident,
  type FraudScanSummary,
  type FraudRiskLevel,
  type FraudMitigationAction,
  type FraudEvidenceItem,
} from "../../services/ai-fraud.service";
import { Select } from "../../components/ui/Select";
import { useRef } from "react";
import { workspaceButton } from "@/components/ui/FeatureWorkspace";
import { handleAvatarImageError } from "@/utils/image-fallback.utils";
import {
  getSafeProductImageUrl,
  handleProductImageError,
} from "@/utils/marketplace.utils";

export default function AiFraudSentinelPage() {
  const [summary, setSummary] = useState<FraudScanSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<
    "ALL" | "CRITICAL" | "SUSPICIOUS" | "LOW" | "FROZEN"
  >("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [activeIncident, setActiveIncident] = useState<FraudIncident | null>(
    null,
  );
  const [actionLoading, setActionLoading] = useState(false);
  const [actionNote, setActionNote] = useState("");
  const [timeframe, setTimeframe] = useState<"24h" | "7d" | "30d" | "all">(
    "30d",
  );
  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedTab, timeframe]);
  const requestSequence = useRef(0);
  const mutationLock = useRef(false);
  const detailRef = useRef<HTMLDivElement>(null);
  const [actionChoice, setActionChoice] = useState<FraudMitigationAction | "">(
    "",
  );
  const actionLabels: Record<FraudMitigationAction, string> = {
    FREEZE_COMMISSION: "Giữ thù lao chờ đối soát",
    PAUSE_LINK: "Tạm ngưng link",
    DISMISS: "Không xác nhận bất thường",
    RESOLVE: "Đánh dấu đã xử lý",
  };
  const [pendingDecision, setPendingDecision] =
    useState<FraudMitigationAction | null>(null);
  useEffect(() => {
    setActionNote("");
    setActionChoice("");
    setPendingDecision(null);
    if (!activeIncident?.id) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    detailRef.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !mutationLock.current)
        setActiveIncident(null);
      if (event.key !== "Tab") return;
      const controls = detailRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input, textarea, select, [tabindex="0"]',
      );
      if (!controls?.length) return;
      const first = controls[0],
        last = controls[controls.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === detailRef.current)
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, [activeIncident?.id]);

  const loadData = useCallback(async () => {
    const request = ++requestSequence.current;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await aiFraudService.scanTraffic({ timeframe }, true);
      if (request !== requestSequence.current) return;
      setSummary(data);
    } catch (err: any) {
      if (request !== requestSequence.current) return;
      console.error(err);
      const message =
        "Không thể tải dữ liệu quét gian lận AI. Vui lòng thử lại.";
      setLoadError(message);
      toast.error(message);
    } finally {
      if (request === requestSequence.current) setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    setSummary(null);
    loadData();
    return () => {
      requestSequence.current += 1;
    };
  }, [loadData]);

  const handleAction = (action: FraudMitigationAction) =>
    setPendingDecision(action);
  const applyAction = async (action: FraudMitigationAction) => {
    if (!activeIncident || mutationLock.current) return;
    if (actionNote.trim().length < 10) {
      toast.error("Nhập lý do xử lý tối thiểu 10 ký tự.");
      return;
    }
    mutationLock.current = true;
    setActionLoading(true);
    try {
      const res = await aiFraudService.takeAction(
        activeIncident.id,
        action,
        actionNote,
      );
      toast.success(res.message || "Thực hiện thao tác thành công!");
      setActiveIncident(res.incident);
      setActionChoice("");
      setActionNote("");
      setPendingDecision(null);
      loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Có lỗi xảy ra khi thực hiện hành động",
      );
    } finally {
      mutationLock.current = false;
      setActionLoading(false);
    }
  };

  const getRiskBadge = (level: FraudRiskLevel, score: number) => {
    const color = level === "FRAUD_CRITICAL" ? "#DC2626" : "#B88E4F";
    const label =
      level === "FRAUD_CRITICAL"
        ? "Nguy cơ cao"
        : level === "SUSPICIOUS"
          ? "Cần xác minh"
          : level === "CLEAN"
            ? "Thấp"
            : "Theo dõi";
    return (
      <div className="mx-auto w-full max-w-[120px] space-y-1.5 text-left">
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="text-[#7D715E]">{label}</span>
          <strong className="tabular-nums" style={{ color }}>
            {score}/100
          </strong>
        </div>
        <div className="h-1 overflow-hidden rounded bg-[#F3EFE6]">
          <div
            className="h-full rounded"
            style={{
              width: `${Math.max(0, Math.min(100, score))}%`,
              backgroundColor: color,
            }}
          />
        </div>
      </div>
    );
  };

  const getAnomalyLabel = (type: string) => {
    switch (type) {
      case "ZOMBIE_TRAFFIC":
        return {
          label: "Chuyển đổi thấp",
          color: "border-[#EAE4D7] bg-[#FAF8F5] text-[#7D715E]",
        };
      case "CLICK_BURST_BOT":
        return {
          label: "Nhấp tăng đột biến",
          color: "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]",
        };
      case "IP_CLUSTER":
        return {
          label: "Trùng địa chỉ IP",
          color: "border-[#EEDFC6] bg-[#FBF5EB] text-[#8A642C]",
        };
      case "FLASH_CONVERSION":
        return {
          label: "Tạo đơn nhanh bất thường (<10s)",
          color: "border-[#EEDFC6] bg-[#FBF5EB] text-[#8A642C]",
        };
      case "CONVERSION_SPIKE":
        return {
          label: "Đột biến đơn hàng bất thường",
          color: "border-[#EEDFC6] bg-[#FBF5EB] text-[#8A642C]",
        };
      case "SELF_REFERRAL":
        return {
          label: "Trùng thông tin KOL",
          color: "border-[#EAE4D7] bg-[#F3EFE6] text-[#5F5547]",
        };
      default:
        return {
          label: type,
          color: "border-[#EAE4D7] bg-[#FAF8F5] text-[#5F5547]",
        };
    }
  };

  const formatRate = (value: number) =>
    Number(value).toLocaleString("vi-VN", { maximumFractionDigits: 2 });
  // Older cached responses may still use adjudicative language for an unreviewed signal.
  const evidenceForReview = (evidence: FraudEvidenceItem) => {
    const legacySelfReferral =
      evidence.metric.includes("Self-Referral Exact Match") ||
      evidence.metric.includes("Tự Mua Hàng Trục Lợi");
    return {
      ...evidence,
      metric: legacySelfReferral
        ? "Trùng thông tin người mua và KOL"
        : evidence.metric,
      value: evidence.value.replace("đơn hàng vi phạm", "đơn có dấu hiệu"),
      description: legacySelfReferral
        ? "Có đơn qua link trùng thông tin tài khoản, email hoặc số điện thoại với KOL. Cần đối chiếu trước khi kết luận."
        : evidence.description,
    };
  };

  const filteredIncidents = (summary?.incidents || []).filter((inc) => {
    const matchesSearch =
      inc.collaboratorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.collaboratorEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.incidentCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inc.referralLinkCode &&
        inc.referralLinkCode
          .toLowerCase()
          .includes(searchQuery.toLowerCase())) ||
      (inc.productName &&
        inc.productName.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (selectedTab === "CRITICAL") return inc.riskLevel === "FRAUD_CRITICAL";
    if (selectedTab === "SUSPICIOUS") return inc.riskLevel === "SUSPICIOUS";
    if (selectedTab === "LOW") return inc.riskLevel === "LOW_RISK";
    if (selectedTab === "FROZEN") return inc.status === "FROZEN";
    return true;
  });
  const isInitialLoading = loading && summary === null;
  const countLabel = (count?: number) => {
    if (isInitialLoading) return "…";
    if (!summary && loadError) return "—";
    return (count ?? 0).toLocaleString("vi-VN");
  };

  return (
    <div id="fraud-oversight-page" className="w-full min-w-0 space-y-4 pb-8">
      {/* KPI Metric Cards - Nhỏ gọn, cân xứng, chuẩn 4 cột trên desktop */}
      <div className="admin-stat-grid grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {/* Total Clicks Scanned */}
        <div className="flex min-w-0 flex-col justify-between overflow-hidden rounded-xl border border-[#EAE4D7] bg-white p-3 sm:p-3.5 transition hover:border-[#C59B58]/50">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#7D715E] truncate">
              Tổng lượt click đã quét
            </span>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F]">
              <Activity className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-semibold tracking-tight text-[#1A1612]">
              {isInitialLoading ? (
                <span
                  aria-hidden="true"
                  className="inline-block h-7 w-20 animate-pulse rounded bg-[#F3EFE6] align-middle"
                />
              ) : !summary && loadError ? (
                "—"
              ) : (
                <>
                  {(summary?.totalScannedClicks ?? 0).toLocaleString("vi-VN")}{" "}
                  <span className="text-xs font-semibold text-[#7D715E]">
                    lượt click
                  </span>
                </>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-[#7D715E] truncate">
              {isInitialLoading ? (
                <span
                  aria-hidden="true"
                  className="inline-block h-3.5 w-32 animate-pulse rounded bg-[#F3EFE6]"
                />
              ) : !summary && loadError ? (
                "Chưa tải được số liệu"
              ) : (
                <>
                  <Layers className="h-3.5 w-3.5 text-[#B88E4F] shrink-0" />
                  <span>
                    Từ{" "}
                    <strong className="font-bold text-[#1A1612]">
                      {summary?.totalScannedLinks ?? 0}
                    </strong>{" "}
                    link tiếp thị của KOL
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Critical Alerts */}
        <div className="flex min-w-0 flex-col justify-between overflow-hidden rounded-xl border border-[#EAE4D7] bg-white p-3 sm:p-3.5 transition hover:border-[#EEDFC6]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#B91C1C] truncate">
              Cảnh báo đáng ngờ
            </span>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-semibold tracking-tight text-[#B91C1C]">
              {isInitialLoading ? (
                <span
                  aria-hidden="true"
                  className="inline-block h-7 w-12 animate-pulse rounded bg-[#F3EFE6] align-middle"
                />
              ) : !summary && loadError ? (
                "—"
              ) : (
                <>
                  {summary?.criticalCount ?? 0}{" "}
                  <span className="text-xs font-semibold text-[#B91C1C]">
                    sự vụ khẩn cấp
                  </span>
                </>
              )}
            </div>
            <div className="mt-0.5 text-[11.5px] text-[#7D715E] truncate">
              {isInitialLoading ? (
                <span
                  aria-hidden="true"
                  className="inline-block h-3.5 w-36 animate-pulse rounded bg-[#F3EFE6]"
                />
              ) : !summary && loadError ? (
                "Chưa tải được số liệu"
              ) : (
                <>
                  <span className="font-bold text-[#8A642C]">
                    {summary?.suspiciousCount ?? 0}
                  </span>{" "}
                  sự vụ cần xem xét
                </>
              )}
            </div>
          </div>
        </div>

        {/* Potential Saved Budget */}
        <div className="flex min-w-0 flex-col justify-between overflow-hidden rounded-xl border border-[#EAE4D7] bg-white p-3 sm:p-3.5 transition hover:border-[#C59B58]/50">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#7D715E] truncate">
              Hoa hồng giữ an toàn
            </span>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F]">
              <Shield className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-semibold tracking-tight text-[#8A642C]">
              {isInitialLoading ? (
                <span
                  aria-hidden="true"
                  className="inline-block h-7 w-16 animate-pulse rounded bg-[#F3EFE6] align-middle"
                />
              ) : !summary && loadError ? (
                "—"
              ) : (
                <>
                  {(summary?.potentialSavedAmount ?? 0).toLocaleString("vi-VN")}{" "}
                  ₫
                </>
              )}
            </div>
            <div className="mt-0.5 text-[11.5px] text-[#7D715E] truncate">
              {isInitialLoading
                ? "Đang tổng hợp dữ liệu…"
                : !summary && loadError
                  ? "Chưa tải được số liệu"
                  : "Hoa hồng tạm khóa chờ xác minh"}
            </div>
          </div>
        </div>

        {/* Healthy Traffic Ratio */}
        <div className="flex min-w-0 flex-col justify-between overflow-hidden rounded-xl border border-[#EAE4D7] bg-white p-3 sm:p-3.5 transition hover:border-[#C59B58]/50">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#7D715E] truncate">
              Link rủi ro thấp
            </span>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] text-[#059669]">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-semibold tracking-tight text-[#1A1612]">
              {isInitialLoading ? (
                <span
                  aria-hidden="true"
                  className="inline-block h-7 w-16 animate-pulse rounded bg-[#F3EFE6] align-middle"
                />
              ) : !summary && loadError ? (
                "—"
              ) : summary && summary.totalScannedLinks > 0 ? (
                `${Math.round(((summary.cleanCount + summary.lowRiskCount) / summary.totalScannedLinks) * 100)}%`
              ) : (
                "—"
              )}
            </div>
            <div className="mt-0.5 text-[11.5px] text-[#7D715E] truncate">
              {isInitialLoading
                ? "Đang phân tích dữ liệu…"
                : !summary && loadError
                  ? "Chưa tải được số liệu"
                  : "Link chưa có cảnh báo cao hoặc đáng ngờ"}
            </div>
          </div>
        </div>
      </div>

      {/* Main Table & Filter Container */}
      <div className="min-w-0 overflow-hidden rounded-xl border border-[#EAE4D7] bg-white shadow-xs">
        <div className="fraud-filter-scroll">
          <div className="fraud-filter-toolbar" aria-label="Incident filters">
            <button
              type="button"
              onClick={() => setSelectedTab("ALL")}
              className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition ${
                selectedTab === "ALL"
                  ? "border-[#EEDFC6] bg-[#FBF5EB] text-[#8C6226]"
                  : "border-transparent bg-white text-[#7D715E] hover:bg-[#FAF8F5]"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Tất cả ({countLabel(summary?.incidents.length)})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab("CRITICAL")}
              className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition ${
                selectedTab === "CRITICAL"
                  ? "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]"
                  : "border-transparent bg-white text-[#B91C1C] hover:bg-[#FEF2F2]"
              }`}
            >
              <Flame className="h-3.5 w-3.5" />
              Nguy cơ cao ({countLabel(summary?.criticalCount)})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab("SUSPICIOUS")}
              className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition ${
                selectedTab === "SUSPICIOUS"
                  ? "border-[#EEDFC6] bg-[#FBF5EB] text-[#8A642C]"
                  : "border-transparent bg-white text-[#7D715E] hover:bg-[#FAF8F5]"
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Cần lưu ý ({countLabel(summary?.suspiciousCount)})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab("LOW")}
              className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition ${
                selectedTab === "LOW"
                  ? "border-[#EEDFC6] bg-[#FBF5EB] text-[#5F5547]"
                  : "border-transparent bg-white text-[#7D715E] hover:bg-[#FAF8F5]"
              }`}
            >
              <Info className="h-3.5 w-3.5" />
              Theo dõi ({countLabel(summary?.lowRiskCount)})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab("FROZEN")}
              className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition ${
                selectedTab === "FROZEN"
                  ? "border-[#EEDFC6] bg-[#FBF5EB] text-[#5F5547]"
                  : "border-transparent bg-white text-[#7D715E] hover:bg-[#FAF8F5]"
              }`}
            >
              <Lock className="h-3.5 w-3.5" />
              Đã khóa (
              {countLabel(
                summary?.incidents.filter((i) => i.status === "FROZEN").length,
              )}
              )
            </button>
            <div className="fraud-time-filter relative min-w-0">
              <Calendar className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-[#8A642C]" />
              <Select
                id="timeframe-select"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value as any)}
                aria-label="Chọn khoảng thời gian quét"
                className="h-9 w-full pl-9 pr-1 text-xs"
              >
                <option value="24h">24 giờ qua</option>
                <option value="7d">7 ngày gần nhất</option>
                <option value="30d">30 ngày qua</option>
                <option value="all">Toàn thời gian</option>
              </Select>
            </div>
            <div className="fraud-search-field relative min-w-0">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7D715E]" />
              <input
                id="search-incident-input"
                aria-label="Tìm sự vụ gian lận"
                type="text"
                placeholder="Tìm sự vụ, KOL…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-lg border border-[#EAE4D7] bg-white pl-9 pr-3 text-xs text-[#1A1612] outline-none transition placeholder:text-[#7D715E] focus:border-[#C59B58]"
              />
            </div>{" "}
          </div>
        </div>

        {/* Table Content */}
        <div className="fraud-table-region">
          <table className="w-full min-w-[1120px] table-fixed border-collapse text-left">
            <colgroup>
              <col style={{ width: "12%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "10%" }} />
            </colgroup>
            <thead>
              <tr className="border-b border-[#EAE4D7] bg-[#FAF8F5] text-[10px] font-semibold tracking-normal text-[#7D715E]">
                <th className="px-4 py-4">Mã & Ngày phát hiện</th>
                <th className="px-4 py-4">Đối tác KOL</th>
                <th className="px-4 py-4">Sản phẩm & Link</th>
                <th className="px-3 py-4 text-center">Nhấp / Đơn</th>
                <th className="px-4 py-4">Dấu hiệu bất thường</th>
                <th className="px-3 py-4 text-center">Mức độ rủi ro</th>
                <th className="px-3 py-4 text-center">Trạng thái</th>
                <th className="px-4 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE4D7]/70 text-xs font-medium text-[#1A1612]">
              {loading && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-14 text-center font-semibold text-[#7D715E]"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#C59B58] border-t-transparent" />
                      <span>Đang quét phân tích dữ liệu AI...</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && !summary && loadError && (
                <tr>
                  <td colSpan={8} className="py-14 text-center">
                    <div
                      role="alert"
                      className="flex flex-col items-center gap-2 text-[#7D715E]"
                    >
                      <AlertTriangle className="h-8 w-8 text-[#B88E4F]" />
                      <p className="font-semibold text-[#1A1612]">
                        Không tải được dữ liệu quét
                      </p>
                      <p className="text-xs">Kiểm tra kết nối rồi thử lại.</p>
                      <button
                        type="button"
                        onClick={loadData}
                        className="mt-1 inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-[#8C6226] hover:bg-[#FBF5EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C59B58]/40"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Thử lại
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && summary && filteredIncidents.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-14 text-center font-semibold text-[#7D715E]"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <ShieldCheck className="h-10 w-10 stroke-1 text-[#059669]" />
                      <p className="font-bold text-[#1A1612]">
                        Không tìm thấy sự vụ nghi vấn nào
                      </p>
                      <p className="text-xs font-normal text-[#7D715E]">
                        Không có hồ sơ phù hợp với bộ lọc đang chọn.
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                filteredIncidents
                  .slice(
                    (Math.min(
                      page,
                      Math.max(1, Math.ceil(filteredIncidents.length / 10)),
                    ) -
                      1) *
                      10,
                    Math.min(
                      page,
                      Math.max(1, Math.ceil(filteredIncidents.length / 10)),
                    ) * 10,
                  )
                  .map((inc) => (
                    <tr
                      key={inc.id}
                      id={`incident-row-${inc.id}`}
                      className="group cursor-pointer transition-colors hover:bg-[#FBF5EB]/55"
                      onClick={() => setActiveIncident(inc)}
                    >
                      <td data-label="Mã sự vụ" className="px-3 py-3">
                        <div className="break-words font-mono text-[11px] font-bold text-[#1A1612]">
                          {inc.incidentCode}
                        </div>
                        <div className="mt-1 text-[10px] font-normal text-[#7D715E]">
                          {new Date(inc.detectedAt).toLocaleDateString("vi-VN")}
                        </div>
                      </td>

                      <td data-label="Đối tác KOL" className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#EEDFC6] bg-[#FBF5EB] text-xs font-bold text-[#8A642C]">
                            {inc.collaboratorAvatar ? (
                              <img
                                src={inc.collaboratorAvatar}
                                onError={handleAvatarImageError}
                                alt=""
                                className="h-full w-full rounded-full object-cover"
                              />
                            ) : (
                              inc.collaboratorName?.[0]?.toUpperCase() || "K"
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-[#1A1612]">
                              {inc.collaboratorName}
                            </div>
                            <div className="text-[10px] font-medium text-[#8A642C]">
                              Hạng {inc.collaboratorTier}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td data-label="Sản phẩm & Link" className="px-3 py-3">
                        <div className="flex min-w-0 items-center gap-2 [&>img]:h-9 [&>img]:w-9 [&>img]:shrink-0 [&>img]:rounded-lg [&>img]:object-contain [&>div]:min-w-0">
                          <img
                            src={getSafeProductImageUrl(inc.productImageUrl)}
                            onError={handleProductImageError}
                            alt={inc.productName || "Sản phẩm"}
                          />
                          <div>
                            <div className="line-clamp-2 font-medium leading-5 text-[#1A1612]">
                              {inc.productName}
                            </div>
                            <div className="truncate text-[10px] font-mono text-[#7D715E]">
                              Mã link: {inc.referralLinkCode}
                              {inc.referralLinkCode && (
                                <button
                                  type="button"
                                  aria-label="Sao chép mã link"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void navigator.clipboard
                                      .writeText(inc.referralLinkCode!)
                                      .then(() =>
                                        toast.success("Đã sao chép mã link"),
                                      )
                                      .catch(() =>
                                        toast.error("Không sao chép được mã"),
                                      );
                                  }}
                                >
                                  <Copy size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td
                        data-label="Nhấp / Đơn"
                        className="px-2 py-3 text-right tabular-nums"
                      >
                        <div className="font-semibold text-[#1A1612]">
                          {inc.totalClicks.toLocaleString("vi-VN")} nhấp ·{" "}
                          {inc.totalOrders} đơn
                        </div>
                        <div className="mt-1 text-[11px] text-[#7D715E]">
                          Chuyển đổi {formatRate(inc.conversionRate)}%
                        </div>
                      </td>

                      <td
                        data-label="Dấu hiệu bất thường"
                        className="px-3 py-3"
                      >
                        <div className="flex flex-col gap-1">
                          {inc.anomalyTypes.length === 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-md border border-[#EAE4D7] bg-[#F3EFE6] px-2 py-1 text-[10px] font-medium text-[#5F5547]">
                              <ShieldCheck className="h-3 w-3 text-[#059669]" />
                              Chưa ghi nhận dấu hiệu
                            </span>
                          ) : (
                            inc.anomalyTypes.map((type, idx) => {
                              const badge = getAnomalyLabel(type);
                              return (
                                <span
                                  key={idx}
                                  className="text-xs font-medium leading-5 text-[#655A49]"
                                >
                                  {badge.label}
                                </span>
                              );
                            })
                          )}
                        </div>
                        {!!inc.anomalyTypes.length && (
                          <p className="mt-1 text-[11px] text-[#7D715E]">
                            {inc.anomalyTypes.some(
                              (type) => type !== "ZOMBIE_TRAFFIC",
                            )
                              ? "Cần đối chiếu"
                              : "Tiếp tục theo dõi"}
                          </p>
                        )}
                      </td>

                      <td
                        data-label="Mức độ rủi ro"
                        className="px-2 py-3 text-center"
                      >
                        {getRiskBadge(inc.riskLevel, inc.riskScore)}
                      </td>

                      <td
                        data-label="Trạng thái"
                        className="px-2 py-3 text-center"
                      >
                        {inc.status === "FROZEN" && (
                          <span className="inline-flex items-center justify-center gap-1 rounded-full border border-[#EEDFC6] bg-[#FBF5EB] px-2.5 py-1 text-[10px] font-semibold text-[#8A642C]">
                            <Lock className="h-3 w-3" />{" "}
                            {inc.actionHistory?.[0]?.action ===
                            "FREEZE_COMMISSION"
                              ? "Đang giữ thù lao"
                              : "Link tạm ngưng"}
                          </span>
                        )}
                        {inc.status === "DISMISSED" && (
                          <span className="inline-flex items-center justify-center gap-1 rounded-full border border-[#EAE4D7] bg-[#F3EFE6] px-2.5 py-1 text-[10px] font-semibold text-[#5F5547]">
                            <Info className="h-3 w-3" /> Đã bỏ qua
                          </span>
                        )}
                        {inc.status === "RESOLVED" && (
                          <span className="inline-flex items-center justify-center gap-1 rounded-full border border-[#EAE4D7] bg-[#F3EFE6] px-2.5 py-1 text-[10px] font-semibold text-[#5F5547]">
                            <ShieldCheck className="h-3 w-3 text-[#059669]" />{" "}
                            Đã xử lý
                          </span>
                        )}
                        {inc.status === "ACTIVE" && (
                          <span className="inline-flex items-center justify-center gap-1 rounded-full border border-[#EEDFC6] bg-[#FBF5EB] px-2.5 py-1 text-[10px] font-semibold text-[#8A642C]">
                            <Activity className="h-3 w-3" /> Đang theo dõi
                          </span>
                        )}
                      </td>

                      <td
                        data-label="Thao tác"
                        className="px-2 py-3 text-right whitespace-nowrap"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveIncident(inc);
                          }}
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-2 py-1.5 text-[11px] font-semibold text-[#8A642C] transition hover:border-[#C59B58] hover:bg-[#F3EFE6]"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem hồ sơ</span>
                        </button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        <footer className="fraud-pagination">
          <span>{filteredIncidents.length} hồ sơ · 10 mỗi trang</span>
          <div>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={14} />
              Trước
            </button>
            <span>
              {page} / {Math.max(1, Math.ceil(filteredIncidents.length / 10))}
            </span>
            <button
              type="button"
              disabled={page * 10 >= filteredIncidents.length}
              onClick={() => setPage(page + 1)}
            >
              Sau
              <ChevronRight size={14} />
            </button>
          </div>
        </footer>
      </div>

      {activeIncident && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#231D15]/45 p-3 backdrop-blur-sm"
          onClick={() => {
            if (!mutationLock.current) setActiveIncident(null);
          }}
        >
          <div
            ref={detailRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Chi tiết cảnh báo"
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-[92dvh] w-full max-w-[920px] flex-col overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white shadow-xl outline-none"
          >
            <header className="flex shrink-0 items-center justify-between border-b border-[#EAE4D7] px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-[#1A1612]">
                  Chi tiết cảnh báo
                </h2>
                <p className="mt-1 text-xs text-[#7D715E]">
                  {activeIncident.incidentCode} ·{" "}
                  {timeframe === "all"
                    ? "Toàn thời gian"
                    : timeframe === "24h"
                      ? "24 giờ"
                      : timeframe === "7d"
                        ? "7 ngày"
                        : "30 ngày"}
                </p>
              </div>
              <button
                type="button"
                disabled={actionLoading}
                aria-label="Đóng chi tiết sự vụ"
                onClick={() => setActiveIncident(null)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#7D715E] hover:bg-[#FAF8F5]"
              >
                <X size={18} />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto text-sm text-[#1A1612]">
              <div className="grid md:grid-cols-[minmax(0,58fr)_minmax(0,42fr)]">
                <div className="min-w-0 px-5 py-5 md:border-r md:border-[#EAE4D7]">
                  <section className="flex items-start gap-3 border-b border-[#EAE4D7] pb-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#FBF5EB] text-[#8A642C]">
                      {activeIncident.collaboratorAvatar ? (
                        <img
                          src={activeIncident.collaboratorAvatar}
                          onError={handleAvatarImageError}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        activeIncident.collaboratorName?.[0]
                      )}
                    </div>
                    <div className="min-w-0">
                      <strong className="text-sm font-semibold">
                        {activeIncident.collaboratorName}
                      </strong>
                      <p className="mt-1 text-xs leading-5 text-[#7D715E]">
                        Hạng {activeIncident.collaboratorTier || "—"} ·{" "}
                        {activeIncident.storeName || "Chưa có tên gian hàng"}
                      </p>
                      <p className="mt-1 break-all text-xs text-[#7D715E]">
                        {activeIncident.collaboratorEmail}
                      </p>
                    </div>
                  </section>
                  <section className="flex items-start gap-3 py-4">
                    <img
                      src={getSafeProductImageUrl(
                        activeIncident.productImageUrl,
                      )}
                      onError={handleProductImageError}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-lg object-contain"
                    />
                    <div className="min-w-0">
                      <strong className="text-[13px] font-semibold leading-5">
                        {activeIncident.productName || "Chưa có sản phẩm"}
                      </strong>
                      <div className="mt-1 flex items-center gap-2 text-xs text-[#7D715E]">
                        <span className="break-all">
                          {activeIncident.referralLinkCode || "Chưa có mã link"}
                        </span>
                        {activeIncident.referralLinkCode && (
                          <button
                            type="button"
                            aria-label="Sao chép mã link"
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded hover:bg-[#FBF5EB]"
                            onClick={() =>
                              void navigator.clipboard
                                .writeText(activeIncident.referralLinkCode!)
                                .then(() =>
                                  toast.success("Đã sao chép mã link"),
                                )
                                .catch(() =>
                                  toast.error("Không sao chép được mã"),
                                )
                            }
                          >
                            <Copy size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </section>
                  <section className="grid grid-cols-3 divide-x divide-[#EAE4D7] border-y border-[#EAE4D7] py-3 text-center tabular-nums">
                    <div>
                      <strong className="text-sm">
                        {activeIncident.totalClicks.toLocaleString("vi-VN")}
                      </strong>
                      <p className="mt-1 text-[11px] text-[#7D715E]">
                        Lượt nhấp
                      </p>
                    </div>
                    <div>
                      <strong className="text-sm">
                        {activeIncident.totalOrders.toLocaleString("vi-VN")}
                      </strong>
                      <p className="mt-1 text-[11px] text-[#7D715E]">
                        Đơn hàng
                      </p>
                    </div>
                    <div>
                      <strong className="text-sm">
                        {formatRate(activeIncident.conversionRate)}%
                      </strong>
                      <p className="mt-1 text-[11px] text-[#7D715E]">
                        Chuyển đổi
                      </p>
                    </div>
                  </section>
                  <section className="border-b border-[#EAE4D7] py-4">
                    <h3 className="mb-3 text-xs font-semibold text-[#7D715E]">
                      Dấu hiệu cần xác minh · {activeIncident.evidences.length}
                    </h3>
                    <div className="divide-y divide-[#EAE4D7]">
                      {activeIncident.evidences
                        .map(evidenceForReview)
                        .map((ev, index) => (
                          <div
                            key={index}
                            className="py-3 first:pt-0 last:pb-0"
                          >
                            <strong className="block text-[13px] leading-5">
                              {ev.metric}
                            </strong>
                            <span className="mt-1 block text-xs font-semibold tabular-nums text-[#8A642C]">
                              {ev.value}
                            </span>
                            <p className="mt-2 text-xs leading-5 text-[#7D715E]">
                              {ev.description}
                            </p>
                          </div>
                        ))}
                    </div>
                    {activeIncident.aiReasoning &&
                      !activeIncident.anomalyTypes.includes(
                        "SELF_REFERRAL",
                      ) && (
                        <details className="mt-3 text-xs text-[#7D715E]">
                          <summary className="cursor-pointer font-medium">
                            Căn cứ đánh giá
                          </summary>
                          <p className="mt-2 leading-5">
                            {activeIncident.aiReasoning}
                          </p>
                        </details>
                      )}
                  </section>
                  <section className="space-y-3 pt-4">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-[#7D715E]">
                        Điểm rủi ro
                      </span>
                      {getRiskBadge(
                        activeIncident.riskLevel,
                        activeIncident.riskScore,
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-[#7D715E]">
                        Thù lao chờ của KOL
                      </span>
                      <strong className="text-base tabular-nums text-[#8A642C]">
                        {activeIncident.pendingCommissionAmount.toLocaleString(
                          "vi-VN",
                        )}{" "}
                        ₫
                      </strong>
                    </div>
                  </section>
                </div>
                <div className="min-w-0 border-t border-[#EAE4D7] px-5 py-5 md:border-t-0">
                  <section className="space-y-4">
                    <h3 className="text-sm font-semibold">Xử lý cảnh báo</h3>
                    <label className="block text-xs font-semibold">
                      Hành động xử lý
                      <select
                        aria-label="Hành động xử lý"
                        style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBlock: 0, lineHeight: '20px', borderRadius: 8}}
                        disabled={actionLoading}
                        value={actionChoice}
                        onChange={(event) => {
                          setActionChoice(
                            event.target.value as FraudMitigationAction | "",
                          );
                          setPendingDecision(null);
                        }}
                        className="mt-2 h-[42px] w-full rounded-lg border border-[#EAE4D7] bg-white px-3 text-sm font-normal outline-none focus:border-[#C59B58]"
                      >
                        <option value="">Chọn hành động</option>
                        {Object.entries(actionLabels).map(([value, label]) => (
                          <option
                            key={value}
                            value={value}
                            disabled={
                              (activeIncident.status === "FROZEN" &&
                                (value === "FREEZE_COMMISSION" ||
                                  value === "PAUSE_LINK")) ||
                              (value === "DISMISS" &&
                                activeIncident.status === "DISMISSED") ||
                              (value === "RESOLVE" &&
                                activeIncident.status === "RESOLVED")
                            }
                          >
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    {actionChoice && (
                      <p className="border-l-2 border-[#EEDFC6] pl-3 text-xs leading-5 text-[#7D715E]">
                        {actionChoice === "FREEZE_COMMISSION"
                          ? "Tạm ngưng link; giữ thù lao PENDING của KOL tại Shop này đến 90 ngày kể từ lúc xử lý để đối soát."
                          : actionChoice === "DISMISS"
                            ? "Mở lại link và bỏ cảnh báo. Khoản thù lao đã giữ không tự mở khóa."
                            : actionChoice === "PAUSE_LINK"
                              ? "Chỉ tạm ngưng link này; không giữ thêm thù lao."
                              : "Đóng cảnh báo; không tự mở lại link hoặc giải ngân thù lao."}
                      </p>
                    )}
                    <div>
                      <div className="mb-2 flex flex-wrap justify-between gap-1 text-xs">
                        <label
                          htmlFor="fraud-action-note"
                          className="font-semibold"
                        >
                          Lý do xử lý *
                        </label>
                        <span className="text-[#7D715E]">
                          {actionNote.length}/1.000 · Tối thiểu 10
                        </span>
                      </div>
                      <textarea
                        id="fraud-action-note"
                        style={{borderRadius: 8}}
                        aria-label="Lý do xử lý sự vụ"
                        minLength={10}
                        maxLength={1000}
                        disabled={actionLoading}
                        value={actionNote}
                        onChange={(event) => {
                          setActionNote(event.target.value);
                          setPendingDecision(null);
                        }}
                        placeholder="Ghi căn cứ và phạm vi xử lý…"
                        className="h-28 w-full resize-y rounded-lg border border-[#EAE4D7] bg-white px-3 py-2 text-sm outline-none focus:border-[#C59B58]"
                      />
                    </div>
                    {pendingDecision && (
                      <p
                        role="alert"
                        className="rounded-lg bg-[#FBF5EB] px-3 py-2 text-xs text-[#8A642C]"
                      >
                        Xác nhận {actionLabels[pendingDecision].toLowerCase()}?
                        Thao tác được lưu vào nhật ký.
                      </p>
                    )}
                    {!!activeIncident.actionHistory?.length && (
                      <details className="text-xs text-[#7D715E]">
                        <summary className="cursor-pointer font-semibold">
                          Lịch sử xử lý · {activeIncident.actionHistory.length}
                        </summary>
                        <ol className="mt-3 divide-y divide-[#EAE4D7]">
                          {activeIncident.actionHistory.map((item, index) => (
                            <li key={index} className="py-2">
                              <strong className="text-[#1A1612]">
                                {actionLabels[
                                  item.action as FraudMitigationAction
                                ] || item.action}
                              </strong>{" "}
                              · {item.performedBy}
                              <p className="mt-1 leading-5">
                                {new Date(item.performedAt).toLocaleString(
                                  "vi-VN",
                                  { timeZone: "Asia/Ho_Chi_Minh" },
                                )}{" "}
                                · {item.note}
                              </p>
                            </li>
                          ))}
                        </ol>
                      </details>
                    )}
                  </section>
                </div>
              </div>
            </div>
            <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[#EAE4D7] bg-white px-5 py-3">
              <p className="flex items-center gap-1.5 text-xs text-[#7D715E]">
                <Info size={14} />
                Chưa phải kết luận vi phạm.
              </p>
              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  className={`${workspaceButton} !h-10 !min-h-10 !rounded-lg`}
                  style={{borderRadius: 8}}
                  onClick={() =>
                    pendingDecision
                      ? setPendingDecision(null)
                      : setActiveIncident(null)
                  }
                >
                  {pendingDecision ? "Quay lại" : "Đóng"}
                </button>
                <button
                  type="button"
                  disabled={
                    actionLoading ||
                    !actionChoice ||
                    actionNote.trim().length < 10
                  }
                  className={`${workspaceButton} !h-10 !min-h-10 !rounded-lg !bg-[#C59B58] !text-[#231D15] disabled:opacity-50`}
                  style={{borderRadius: 8}}
                  onClick={() => {
                    if (actionChoice)
                      pendingDecision
                        ? void applyAction(pendingDecision)
                        : handleAction(actionChoice);
                  }}
                >
                  {actionLoading
                    ? "Đang lưu…"
                    : pendingDecision
                      ? "Xác nhận xử lý"
                      : "Lưu xử lý"}
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
