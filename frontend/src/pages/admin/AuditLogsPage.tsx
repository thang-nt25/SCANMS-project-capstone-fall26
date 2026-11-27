import { handleAvatarImageError } from "@/utils/image-fallback.utils";
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ShieldCheck,
  Search,
  Download,
  Clock,
  AlertTriangle,
  Info,
  DollarSign,
  Lock,
  Layers,
  FileText,
  Copy,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Eye,
} from "lucide-react";
import { toast } from "../../utils/toast";
import {
  auditService,
  type AuditLogItem,
  type AuditStats,
  type AuditCategory,
  type AuditSeverity,
} from "../../services/audit.service";
import { Select } from "../../components/ui/Select";
import { StatCard } from "../../components/ui/StatCard";

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState("");

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [selectedTimeframe, setSelectedTimeframe] = useState<
    "24h" | "7d" | "30d" | "all"
  >("30d");
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [debouncedKeyword, setDebouncedKeyword] = useState<string>("");

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const pageSize = 10;

  // Selected Log for Modal
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState<boolean>(false);
  const logSequence = useRef(0);
  const statsSequence = useRef(0);
  const exportLock = useRef(false);

  useEffect(() => {
    if (!selectedLog) {
      setShowRawJson(false);
      return;
    }
    setShowRawJson(false);
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    detailRef.current?.focus();
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedLog(null);
      if (event.key === "Tab") {
        const controls = detailRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [tabindex="0"]',
        );
        if (!controls?.length) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
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
      }
    };
    window.addEventListener("keydown", dismiss);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", dismiss);
      previousFocus?.focus();
    };
  }, [selectedLog]);

  // Debounce search keyword
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(searchKeyword);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  // Load Action metadata & Stats
  const loadStatsAndActions = useCallback(async () => {
    const request = ++statsSequence.current;
    setStats(null);
    setStatsError("");
    try {
      const statsRes = await auditService.getAuditStats(selectedTimeframe);
      if (request !== statsSequence.current) return;
      setStats(statsRes);
    } catch (err: any) {
      if (request === statsSequence.current)
        setStatsError(
          "Chưa tải được thống kê kiểm toán. Bảng sự kiện vẫn có thể tra cứu độc lập.",
        );
      console.error("Lỗi khi tải metadata kiểm toán:", err);
    }
  }, [selectedTimeframe]);

  // Load Logs
  const loadLogs = useCallback(async () => {
    const request = ++logSequence.current;
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        page: currentPage,
        limit: pageSize,
      };

      if (selectedCategory !== "ALL") {
        params.category = selectedCategory as AuditCategory;
      }
      if (selectedSeverity !== "ALL") {
        params.severity = selectedSeverity as AuditSeverity;
      }
      if (debouncedKeyword.trim()) {
        params.keyword = debouncedKeyword.trim();
      }

      // Timeframe dates
      const now = new Date();
      if (selectedTimeframe === "24h") {
        params.startDate = new Date(
          now.getTime() - 24 * 60 * 60 * 1000,
        ).toISOString();
      } else if (selectedTimeframe === "7d") {
        params.startDate = new Date(
          now.getTime() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString();
      } else if (selectedTimeframe === "30d") {
        params.startDate = new Date(
          now.getTime() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString();
      }

      const res = await auditService.getAuditLogs(params);
      if (request !== logSequence.current) return;
      setLogs(res.items || []);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotalCount(res.pagination?.total || 0);
    } catch (err: any) {
      if (request !== logSequence.current) return;
      console.error("Lỗi khi tải danh sách Audit Logs:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Không thể tải nhật ký kiểm toán",
      );
    } finally {
      if (request === logSequence.current) setLoading(false);
    }
  }, [
    currentPage,
    selectedCategory,
    selectedSeverity,
    debouncedKeyword,
    selectedTimeframe,
  ]);

  useEffect(() => {
    loadStatsAndActions();
    return () => {
      statsSequence.current += 1;
    };
  }, [loadStatsAndActions]);

  useEffect(() => {
    loadLogs();
    return () => {
      logSequence.current += 1;
    };
  }, [loadLogs]);

  // Export CSV Handler
  const handleExportCsv = async () => {
    if (exportLock.current) return;
    exportLock.current = true;
    setExporting(true);
    try {
      const params: any = {};
      if (selectedCategory !== "ALL") params.category = selectedCategory;
      if (selectedSeverity !== "ALL") params.severity = selectedSeverity;
      const days = { "24h": 1, "7d": 7, "30d": 30, all: null }[
        selectedTimeframe
      ];
      if (days !== null)
        params.startDate = new Date(Date.now() - days * 86400000).toISOString();
      if (debouncedKeyword.trim()) params.keyword = debouncedKeyword.trim();

      const blob = await auditService.exportAuditLogsCsv(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `scanms_nhat_ky_hoat_dong_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      document.body.removeChild(a);
    } catch (err: any) {
      toast.error("Xuất file nhật ký thất bại", {
        description: err.message || "Lỗi kết nối máy chủ.",
      });
    } finally {
      exportLock.current = false;
      setExporting(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error("Không thể sao chép. Vui lòng thử lại.");
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "SYSTEM_ADMIN":
        return "Quản trị viên";
      case "SYSTEM_MANAGER":
        return "Vận hành / Kế toán";
      case "SHOP_MANAGER":
        return "Quản lý cửa hàng";
      case "COLLABORATOR":
        return "Nhà sáng tạo (KOL)";
      case "CUSTOMER":
        return "Khách hàng";
      case "STAFF":
        return "Nhân viên";
      case "SYSTEM":
        return "Tác vụ hệ thống";
      default:
        return role || "Người dùng";
    }
  };

  const ACTION_NAME_VI_FALLBACK: Record<string, string> = {
    HTTP_POST_AuthController_login: "Yêu cầu đăng nhập",
    AI_FRAUD_FLAG: "Ghi nhận dấu hiệu bất thường",
    CUSTOMER_WITHDRAWAL_APPROVED: "Xác nhận rút tiền Customer",
    ADMIN_APPROVE_PAYOUT: "Xác nhận chi trả KOL",
    HTTP_POST_AdminCustomerWithdrawalsController_approve:
      "Gửi xác nhận rút tiền Customer",
    HTTP_PUT_CustomerController_syncCart: "Đồng bộ giỏ hàng",
    ANALYTICS_PAGE_VIEW: "Xem trang phân tích & báo cáo",
    ANALYTICS_CTA_CLICK: "Tương tác nút thao tác trên sàn",
    CREATE_REFERRAL_LINK: "Tạo link tiếp thị liên kết",
    ADMIN_VIEW_TRACKING_EVENTS: "Xem dữ liệu kỹ thuật chi tiết",
    AI_FRAUD_FLAGGED: "Cảnh báo gian lận lưu lượng",
    AI_FRAUD_ACTION_APPLIED: "Xử lý cảnh báo bất thường",
    FRAUD_ALERT_DISMISSED: "Bác bỏ cảnh báo gian lận",
    USER_REGISTER: "Đăng ký tài khoản",
    USER_LOGIN: "Đăng nhập hệ thống",
    USER_LOGOUT: "Đăng xuất hệ thống",
    PASSWORD_CHANGED: "Đổi mật khẩu",
    KYC_APPROVED: "Duyệt hồ sơ KYC",
    KYC_REJECTED: "Từ chối hồ sơ KYC",
    USER_STATUS_UPDATED: "Khóa / Mở tài khoản",
    PAYOUT_REQUESTED: "Yêu cầu rút tiền",
    PAYOUT_APPROVED: "Duyệt lệnh rút tiền",
    PAYOUT_REJECTED: "Từ chối rút tiền",
    COMMISSION_RULE_CREATED: "Tạo chính sách thưởng",
    COMMISSION_RULE_UPDATED: "Sửa chính sách thưởng",
    COMMISSION_FROZEN: "Đóng băng hoa hồng",
    PRODUCT_CREATED: "Đăng tải sản phẩm mới",
    PRODUCT_UPDATED: "Cập nhật sản phẩm",
    PRODUCT_DELETED: "Xóa sản phẩm khỏi sàn",
    MEDIA_REVIEWED: "Kiểm duyệt video review",
    SAMPLE_REQUEST_CREATED: "Gửi yêu cầu mẫu thử",
    SAMPLE_REQUEST_APPROVED: "Duyệt gửi hàng mẫu",
    SAMPLE_REQUEST_REJECTED: "Từ chối gửi mẫu thử",
    CAMPAIGN_CREATED: "Tạo chiến dịch mới",
    CAMPAIGN_INVITE_SENT: "Gửi thiệp mời chiến dịch",
    CAMPAIGN_INVITE_ACCEPTED: "Chấp nhận lời mời chiến dịch",
    CAMPAIGN_INVITE_REJECTED: "Từ chối lời mời chiến dịch",
  };

  const getActionNameVi = (action: string, actionNameVi?: string): string => {
    if (ACTION_NAME_VI_FALLBACK[action]) return ACTION_NAME_VI_FALLBACK[action];
    if (actionNameVi && actionNameVi.trim()) return actionNameVi;
    return action
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/^([a-z])/, (m) => m.toUpperCase());
  };

  const renderFriendlyDetails = (
    details: Record<string, any> | null | undefined,
  ) => {
    if (!details || Object.keys(details).length === 0) {
      return (
        <p className="text-xs text-[#7D715E] italic py-1">
          Không có dữ liệu chi tiết kèm theo.
        </p>
      );
    }

    const fieldLabels: Record<string, string> = {
      amount: "Số tiền giao dịch",
      payoutAmount: "Số tiền chi trả",
      finalAmount: "Tổng giá trị đơn hàng",
      commissionAmount: "Tiền hoa hồng",
      status: "Trạng thái",
      previousStatus: "Trạng thái trước",
      newStatus: "Trạng thái sau cập nhật",
      reason: "Lý do thực hiện",
      rejectionReason: "Lý do từ chối",
      note: "Ghi chú",
      storeName: "Gian hàng",
      productTitle: "Sản phẩm",
      productName: "Tên sản phẩm",
      collaboratorName: "Đối tác KOL",
      orderId: "Mã đơn hàng",
      incidentId: "Mã sự vụ AI",
      role: "Vai trò tài khoản",
      balance: "Số dư ví",
      anomalies: "Dấu hiệu ghi nhận",
      riskScore: "Điểm rủi ro",
      timeframe: "Kỳ quan sát",
      totalClicks: "Lượt nhấp",
      totalOrders: "Đơn hàng",
      action: "Hành động xử lý",
      actorName: "Người xử lý",
    };

    const entries = Object.entries(details).filter(([key]) => {
      return ![
        "userAgent",
        "stack",
        "headers",
        "timestamp",
        "token",
        "linkId",
        "storeId",
        "collaboratorId",
        "incidentId",
        "ruleVersion",
      ].includes(key);
    });

    if (entries.length === 0) {
      return (
        <p className="text-xs text-[#7D715E] italic py-1">
          Không có dữ liệu chi tiết kèm theo.
        </p>
      );
    }

    const formatValue = (key: string, val: any): React.ReactNode => {
      if (val === null || val === undefined)
        return <span className="text-[#7D715E]">—</span>;
      if (key === "anomalies" && Array.isArray(val)) {
        const labels: Record<string, string> = {
          SELF_REFERRAL: "Trùng thông tin người mua / KOL",
          ZOMBIE_TRAFFIC: "Chuyển đổi thấp",
          CLICK_BURST_BOT: "Nhấp tăng đột biến",
          IP_CLUSTER: "Trùng địa chỉ IP",
          FLASH_CONVERSION: "Tạo đơn nhanh bất thường",
          CONVERSION_SPIKE: "Đơn hàng tăng đột biến",
        };
        return (
          val.map((item) => labels[String(item)] || String(item)).join(" · ") ||
          "Chưa có dấu hiệu"
        );
      }
      if (key === "timeframe")
        return (
          (
            {
              "30d": "30 ngày",
              "7d": "7 ngày",
              "24h": "24 giờ",
              all: "Toàn thời gian",
            } as Record<string, string>
          )[String(val)] || String(val)
        );
      if (key === "riskScore") return `${val}/100`;
      if (typeof val === "number") {
        if (
          key.toLowerCase().includes("amount") ||
          key.toLowerCase().includes("price") ||
          key.toLowerCase().includes("balance")
        ) {
          return (
            <span className="font-bold text-[#8A642C]">
              {val.toLocaleString("vi-VN")} ₫
            </span>
          );
        }
        return val.toLocaleString("vi-VN");
      }
      if (typeof val === "boolean") {
        return val ? "Bật / Có" : "Tắt / Không";
      }
      if (typeof val === "object") {
        if (key === "previousState" || key === "newState") {
          return (
            <div className="space-y-0.5 text-right">
              {Object.entries(val).map(([k, v]) => (
                <div key={k} className="text-[11px]">
                  <span className="text-[#7D715E]">{fieldLabels[k] || k}:</span>{" "}
                  <span className="font-semibold text-[#1A1612]">
                    {String(v)}
                  </span>
                </div>
              ))}
            </div>
          );
        }
        return (
          <span className="font-mono text-[11px]">{JSON.stringify(val)}</span>
        );
      }
      return String(val);
    };

    return (
      <div className="divide-y divide-[#EAE4D7] bg-white text-[13px]">
        {entries.map(([key, val]) => (
          <div
            key={key}
            className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-2"
          >
            <span className="font-medium text-[#7D715E] min-w-[150px]">
              {fieldLabels[key] || key}
            </span>
            <div className="font-semibold text-[#1A1612] text-left sm:text-right [overflow-wrap:anywhere]">
              {formatValue(key, val)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Severity Badge Helper
  const renderSeverityBadge = (severity: AuditSeverity) => {
    switch (severity) {
      case "CRITICAL":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#FECACA] bg-[#FEF2F2] px-2.5 py-1 text-[11px] font-semibold text-[#B91C1C]">
            <AlertTriangle className="w-3 h-3" />
            Khẩn cấp
          </span>
        );
      case "WARN":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#EEDFC6] bg-[#FBF5EB] px-2.5 py-1 text-[11px] font-semibold text-[#8A642C]">
            <Clock className="w-3 h-3" />
            Cần lưu ý
          </span>
        );
      case "INFO":
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#EAE4D7] bg-[#F3EFE6] px-2.5 py-1 text-[11px] font-semibold text-[#5F5547]">
            <Info className="w-3 h-3" />
            Thông thường
          </span>
        );
    }
  };

  // Category Icon & Color
  const getCategoryInfo = (cat: AuditCategory) => {
    switch (cat) {
      case "AUTH":
        return {
          label: "Tài khoản & Đăng nhập",
          icon: Lock,
          color: "text-[#8A642C] bg-[#FBF5EB] border-[#EEDFC6]",
        };
      case "FINANCIAL":
        return {
          label: "Tiền & Hoa hồng",
          icon: DollarSign,
          color: "text-[#8A642C] bg-[#FBF5EB] border-[#EEDFC6]",
        };
      case "AI_SECURITY":
        return {
          label: "Bảo mật & Cảnh báo",
          icon: Sparkles,
          color: "text-[#B91C1C] bg-[#FEF2F2] border-[#FECACA]",
        };
      case "PRODUCT":
        return {
          label: "Hàng hóa & Sản phẩm",
          icon: Layers,
          color: "text-[#8A642C] bg-[#FBF5EB] border-[#EEDFC6]",
        };
      case "SAMPLE_CAMPAIGN":
        return {
          label: "Hàng mẫu & Chiến dịch",
          icon: FileText,
          color: "text-[#5F5547] bg-[#F3EFE6] border-[#EAE4D7]",
        };
      default:
        return {
          label: "Hệ thống",
          icon: ShieldCheck,
          color: "text-[#5F5547] bg-[#FAF8F5] border-[#EAE4D7]",
        };
    }
  };

  return (
    <div
      id="audit-logs-page"
      className="w-full min-w-0 text-[#1A1612] flex flex-col gap-3 pb-8"
    >
      {statsError && (
        <p role="alert" className="m-0 text-xs text-[#DC2626]">
          {statsError}
          <button
            className="ml-2 underline"
            onClick={() => void loadStatsAndActions()}
          >
            Thử lại thống kê
          </button>
        </p>
      )}

      <div className="w-full min-w-0">
        {/* 2. 4 KPI Cards Chuẩn Hóa */}
        <div className="audit-summary-grid grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <StatCard
            title="Tổng hoạt động"
            value={stats?.totalEvents?.toLocaleString("vi-VN") || 0}
            trendText={`+${stats?.eventsToday || 0} hôm nay`}
            icon={<FileText className="w-4 h-4" />}
          />

          <StatCard
            title="Tiền & Hoa hồng"
            value={stats?.financialEventsCount?.toLocaleString("vi-VN") || 0}
            note="Duyệt rút tiền, trả thưởng, ví"
            icon={<DollarSign className="w-4 h-4" />}
          />

          <StatCard
            title="Bảo mật & Cảnh báo"
            value={stats?.securityEventsCount?.toLocaleString("vi-VN") || 0}
            note="Cảnh báo traffic, khóa tài khoản"
            icon={<AlertTriangle className="w-4 h-4" />}
          />

          <StatCard
            title="Tài khoản & Đăng nhập"
            value={stats?.authEventsCount?.toLocaleString("vi-VN") || 0}
            note="Đăng nhập, KYC, đổi quyền"
            icon={<Lock className="w-4 h-4" />}
          />
        </div>

        {/* Filters & Search Toolbar */}
        <div className="audit-filter-card">
          <div className="audit-primary-filters">
            {/* Search Input */}
            <div className="relative min-w-0">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7D715E]" />
              <input
                aria-label="Tìm nhật ký"
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Tìm hoạt động, người thực hiện, email..."
                className="h-11 w-full rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] pl-10 pr-10 text-sm text-[#1A1612] outline-none transition focus:border-[#C59B58] focus:bg-white"
              />
              {searchKeyword && (
                <button
                  aria-label="Xóa từ khóa"
                  onClick={() => setSearchKeyword("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-600 hover:text-stone-800"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Controls */}
            <div className="audit-secondary-filters">
              {/* Timeframe Selector */}
              <div className="audit-timeframes">
                <button
                  aria-pressed={selectedTimeframe === "24h"}
                  onClick={() => {
                    setSelectedTimeframe("24h");
                    setCurrentPage(1);
                  }}
                  className={`h-full rounded-lg px-2 text-xs font-semibold transition-all ${
                    selectedTimeframe === "24h"
                      ? "bg-[#C59B58] text-white shadow-sm"
                      : "text-[#7D715E] hover:text-[#1A1612]"
                  }`}
                >
                  24 giờ
                </button>
                <button
                  aria-pressed={selectedTimeframe === "7d"}
                  onClick={() => {
                    setSelectedTimeframe("7d");
                    setCurrentPage(1);
                  }}
                  className={`h-full rounded-lg px-2 text-xs font-semibold transition-all ${
                    selectedTimeframe === "7d"
                      ? "bg-[#C59B58] text-white shadow-sm"
                      : "text-[#7D715E] hover:text-[#1A1612]"
                  }`}
                >
                  7 ngày
                </button>
                <button
                  aria-pressed={selectedTimeframe === "30d"}
                  onClick={() => {
                    setSelectedTimeframe("30d");
                    setCurrentPage(1);
                  }}
                  className={`h-full rounded-lg px-2 text-xs font-semibold transition-all ${
                    selectedTimeframe === "30d"
                      ? "bg-[#C59B58] text-white shadow-sm"
                      : "text-[#7D715E] hover:text-[#1A1612]"
                  }`}
                >
                  30 ngày
                </button>
                <button
                  aria-pressed={selectedTimeframe === "all"}
                  onClick={() => {
                    setSelectedTimeframe("all");
                    setCurrentPage(1);
                  }}
                  className={`h-full rounded-lg px-2 text-xs font-semibold transition-all ${
                    selectedTimeframe === "all"
                      ? "bg-[#C59B58] text-white shadow-sm"
                      : "text-[#7D715E] hover:text-[#1A1612]"
                  }`}
                >
                  Toàn thời gian
                </button>
              </div>

              {/* Severity Filter */}
              <Select
                aria-label="Mức độ nhật ký"
                value={selectedSeverity}
                onChange={(e) => {
                  setSelectedSeverity(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-11 w-full text-sm font-medium"
              >
                <option value="ALL">Mức độ: Tất cả</option>
                <option value="CRITICAL">Khẩn cấp (Quan trọng)</option>
                <option value="WARN">Cần lưu ý</option>
                <option value="INFO">Thông thường</option>
              </Select>
            </div>
          </div>

          {/* Category Tabs & Actions */}
          <div className="audit-category-toolbar">
            <div className="audit-category-filters">
              {[
                { id: "ALL", label: "Tất cả" },
                { id: "AUTH", label: "Tài khoản" },
                { id: "FINANCIAL", label: "Tài chính" },
                { id: "AI_SECURITY", label: "Bảo mật" },
                { id: "PRODUCT", label: "Sản phẩm" },
                { id: "SAMPLE_CAMPAIGN", label: "Hàng mẫu & Chiến dịch" },
                { id: "SYSTEM", label: "Hệ thống" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  aria-pressed={selectedCategory === tab.id}
                  onClick={() => {
                    setSelectedCategory(tab.id);
                    setCurrentPage(1);
                  }}
                  className={`min-h-9 rounded-xl border px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === tab.id
                      ? "border-[#C59B58] bg-[#FBF5EB] text-[#8A642C] shadow-sm"
                      : "border-[#EAE4D7] bg-white text-[#5F5547] hover:border-[#C59B58] hover:text-[#1A1612]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="audit-table-card">
          {error && (
            <div className="flex items-center gap-2 border-b border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#B91C1C]">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 border-b border-[#EAE4D7] px-4 py-3">
            <h2 className="text-sm font-bold">Nhật ký hoạt động</h2>
            <div className="audit-table-header-actions">
              {" "}
              <span className="text-xs text-[#7D715E]">
                {totalCount.toLocaleString("vi-VN")} sự kiện
              </span>{" "}
              <div className="audit-export-action">
                <button
                  onClick={handleExportCsv}
                  disabled={exporting}
                  className="inline-flex items-center justify-center gap-1.5 h-10 px-3.5 border border-[#EEDFC6] rounded-xl bg-[#FBF5EB] text-[#1A1612] text-xs font-semibold hover:border-[#C59B58] transition-colors cursor-pointer"
                >
                  <Download
                    className={`w-3.5 h-3.5 ${exporting ? "animate-bounce" : ""}`}
                  />
                  <span>{exporting ? "Đang xuất CSV..." : "Xuất CSV"}</span>
                </button>
              </div>
            </div>
          </div>
          <div
            className="w-full overflow-x-auto"
            role="region"
            aria-label="Audit log table"
          >
            <table className="w-full min-w-[760px] table-fixed border-collapse text-left text-[13px]">
              <colgroup>
                <col style={{ width: "16%" }} />
                <col style={{ width: "28%" }} />
                <col style={{ width: "34%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "10%" }} />
              </colgroup>
              <thead className="h-11 border-b border-[#EAE4D7] bg-[#FAF8F5] text-xs font-medium text-[#7D715E]">
                <tr>
                  <th className="px-4 font-medium">Thời gian</th>
                  <th className="px-4 font-medium">Người thực hiện</th>
                  <th className="px-4 font-medium">Hành động</th>
                  <th className="px-4 font-medium">Mức độ</th>
                  <th className="px-4 text-right font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE4D7]">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-[#7D715E]">
                      Đang tải nhật ký…
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-[#7D715E]">
                      {error
                        ? "Chưa tải được nhật ký"
                        : "Không có sự kiện phù hợp"}
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log.id}
                      className="h-[72px] cursor-pointer hover:bg-[#FBF5EB]/50"
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="px-4 py-3 tabular-nums">
                        <strong className="block text-xs font-semibold">
                          {new Date(log.createdAt).toLocaleTimeString("vi-VN", {
                            timeZone: "Asia/Ho_Chi_Minh",
                          })}
                        </strong>
                        <span className="mt-1 block text-[11px] text-[#7D715E]">
                          {new Date(log.createdAt).toLocaleDateString("vi-VN", {
                            timeZone: "Asia/Ho_Chi_Minh",
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#EAE4D7] bg-[#FBF5EB] text-xs text-[#8A642C]">
                            {log.actor.avatarUrl ? (
                              <img
                                src={log.actor.avatarUrl}
                                onError={handleAvatarImageError}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              log.actor.name?.[0] || "—"
                            )}
                          </div>
                          <div className="min-w-0">
                            <strong
                              className="block truncate text-[13px] font-semibold"
                              title={log.actor.name}
                            >
                              {log.actor.name}
                            </strong>
                            <span
                              className="mt-1 block truncate text-[11px] text-[#7D715E]"
                              title={log.actor.email}
                            >
                              {getRoleLabel(log.actor.role)}
                              {log.actor.email ? ` · ${log.actor.email}` : ""}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <strong className="block text-[13px] font-medium leading-5">
                          {getActionNameVi(log.action, log.actionNameVi)}
                        </strong>
                        <span className="mt-1 block text-[11px] text-[#7D715E]">
                          {getCategoryInfo(log.category).label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {renderSeverityBadge(log.severity)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          aria-label="Xem chi tiết nhật ký"
                          className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-[#EAE4D7] px-2 text-xs text-[#655A49] hover:border-[#C59B58]"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedLog(log);
                          }}
                        >
                          <Eye size={13} />
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 p-3.5 border-t border-[#EAE4D7] bg-white text-xs text-[#7D715E]">
            <div>
              Hiển thị{" "}
              <span className="font-bold text-[#1A1612]">{logs.length}</span>{" "}
              trên tổng số{" "}
              <span className="font-bold text-[#1A1612]">
                {totalCount.toLocaleString("vi-VN")}
              </span>{" "}
              sự kiện
            </div>

            <div className="flex items-center gap-2">
              <button
                aria-label="Trang trước"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || loading}
                className="p-1.5 rounded-lg border border-[#EAE4D7] bg-white text-stone-700 hover:border-[#C59B58] disabled:opacity-40 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 font-semibold text-[#1A1612]">
                Trang {currentPage} / {totalPages}
              </span>
              <button
                aria-label="Trang sau"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage >= totalPages || loading}
                className="p-1.5 rounded-lg border border-[#EAE4D7] bg-white text-stone-700 hover:border-[#C59B58] disabled:opacity-40 transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#231D15]/45 p-3 backdrop-blur-sm"
          onClick={() => setSelectedLog(null)}
        >
          <div
            ref={detailRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="audit-detail-title"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-[92dvh] w-full max-w-[800px] flex-col overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white shadow-xl outline-none"
          >
            <header className="flex shrink-0 items-center justify-between gap-4 border-b border-[#EAE4D7] px-5 py-4">
              <div className="min-w-0">
                <h2
                  id="audit-detail-title"
                  className="text-lg font-semibold text-[#1A1612]"
                >
                  Chi tiết nhật ký
                </h2>
                <p className="mt-1 text-xs text-[#7D715E]">
                  #{selectedLog.id.slice(-8).toUpperCase()} ·{" "}
                  {getCategoryInfo(selectedLog.category).label}
                </p>
              </div>
              <button
                aria-label="Đóng chi tiết nhật ký"
                onClick={() => setSelectedLog(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#7D715E] hover:bg-[#FAF8F5]"
              >
                <X size={18} />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 text-sm text-[#1A1612]">
              <section className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAE4D7] py-4">
                <strong>
                  {getActionNameVi(
                    selectedLog.action,
                    selectedLog.actionNameVi,
                  )}
                </strong>
                {renderSeverityBadge(selectedLog.severity)}
              </section>
              <section className="grid gap-4 border-b border-[#EAE4D7] py-4 sm:grid-cols-2 sm:divide-x sm:divide-[#EAE4D7]">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-[#7D715E]">
                      Thời gian · Việt Nam
                    </p>
                    <strong className="mt-1 block text-[13px] font-medium tabular-nums">
                      {new Date(selectedLog.createdAt).toLocaleString("vi-VN", {
                        timeZone: "Asia/Ho_Chi_Minh",
                      })}
                    </strong>
                  </div>
                  <div>
                    <p className="text-xs text-[#7D715E]">
                      Địa chỉ IP được ghi nhận
                    </p>
                    <span className="mt-1 block font-mono text-xs">
                      {selectedLog.ipAddress || "Chưa ghi nhận"}
                    </span>
                  </div>
                </div>
                <div className="sm:pl-5">
                  <p className="text-xs text-[#7D715E]">
                    {selectedLog.action === "AI_FRAUD_FLAG"
                      ? "Người yêu cầu quét"
                      : "Người thực hiện"}
                  </p>
                  <strong className="mt-1 block text-[13px] font-semibold">
                    {selectedLog.actor.name}
                  </strong>
                  <p className="mt-1 text-xs text-[#7D715E]">
                    {getRoleLabel(selectedLog.actor.role)}
                  </p>
                  {selectedLog.actor.email && (
                    <p className="mt-1 break-all text-xs text-[#7D715E]">
                      {selectedLog.actor.email}
                    </p>
                  )}
                  {selectedLog.action === "AI_FRAUD_FLAG" && (
                    <p className="mt-3 text-xs text-[#7D715E]">
                      Nguồn phát hiện: quy tắc tự động; chưa phải kết luận vi
                      phạm.
                    </p>
                  )}
                </div>
              </section>
              <section className="py-4">
                <h3 className="mb-2 text-sm font-semibold">Dữ liệu sự kiện</h3>
                {renderFriendlyDetails(selectedLog.details)}
              </section>
              <section className="border-t border-[#EAE4D7] py-4">
                <button
                  type="button"
                  aria-expanded={showRawJson}
                  onClick={() => setShowRawJson(!showRawJson)}
                  className="inline-flex items-center gap-2 text-xs font-medium text-[#7D715E]"
                >
                  {showRawJson ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronDown size={14} />
                  )}
                  Dữ liệu kỹ thuật
                </button>
                {showRawJson && (
                  <div className="mt-3 space-y-3">
                    <p className="break-all text-xs text-[#7D715E]">
                      Mã hành động: <code>{selectedLog.action}</code>
                    </p>
                    <p className="break-all text-xs text-[#7D715E]">
                      Mã bản ghi: {selectedLog.id}
                      {selectedLog.eventId
                        ? ` · Sự kiện: ${selectedLog.eventId}`
                        : ""}
                    </p>
                    <p className="text-xs text-[#7D715E]">
                      {selectedLog.description}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        void copyToClipboard(
                          JSON.stringify(selectedLog.details || {}, null, 2),
                          "json",
                        )
                      }
                      className="inline-flex h-8 items-center gap-2 rounded-lg border border-[#EAE4D7] px-3 text-xs"
                    >
                      {copiedField === "json" ? (
                        <Check size={13} />
                      ) : (
                        <Copy size={13} />
                      )}{" "}
                      {copiedField === "json" ? "Đã sao chép" : "Sao chép JSON"}
                    </button>
                    <pre className="max-h-64 overflow-auto rounded-lg bg-[#FAF8F5] p-3 font-mono text-xs leading-5">
                      {JSON.stringify(selectedLog.details || {}, null, 2)}
                    </pre>
                  </div>
                )}
              </section>
            </div>
            <footer className="flex shrink-0 justify-end border-t border-[#EAE4D7] px-5 py-3">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="h-10 rounded-lg border border-[#EAE4D7] px-5 text-sm font-medium text-[#655A49] hover:bg-[#FBF5EB]"
              >
                Đóng
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogsPage;
