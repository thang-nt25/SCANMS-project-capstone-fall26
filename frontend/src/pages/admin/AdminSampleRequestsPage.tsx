import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Package,
  RefreshCw,
  ShieldCheck,
  Truck,
  Video,
  ExternalLink,
  Copy,
  Search,
  Store,
  MapPin,
  X,
  History,
  Ban,
  ShieldAlert,
} from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../utils/toast';
import { getSafeProductImageUrl } from '../../features/marketplace/marketplaceUtils';
import { Select } from '../../components/ui/Select';

interface StatusConfig {
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  icon: typeof Clock3;
}

const STATUS_CONFIGS: Record<string, StatusConfig> = {
  PENDING: {
    label: 'Chờ Shop duyệt',
    badgeBg: 'bg-[#FFFBEB]',
    badgeText: 'text-[#D97706]',
    badgeBorder: 'border-[#FDE68A]',
    icon: Clock3,
  },
  APPROVED: {
    label: 'Shop đã duyệt',
    badgeBg: 'bg-[#EFF6FF]',
    badgeText: 'text-[#2563EB]',
    badgeBorder: 'border-[#BFDBFE]',
    icon: CheckCircle2,
  },
  SHIPPED: {
    label: 'Đang giao mẫu',
    badgeBg: 'bg-[#F0FDF4]',
    badgeText: 'text-[#16A34A]',
    badgeBorder: 'border-[#BBF7D0]',
    icon: Truck,
  },
  RECEIVED: {
    label: 'Đã nhận mẫu',
    badgeBg: 'bg-[#F5F3FF]',
    badgeText: 'text-[#7C3AED]',
    badgeBorder: 'border-[#DDD6FE]',
    icon: Package,
  },
  VIDEO_SUBMITTED: {
    label: 'Chờ nghiệm thu video',
    badgeBg: 'bg-[#FBF5EB]',
    badgeText: 'text-[#B88E4F]',
    badgeBorder: 'border-[#EEDFC6]',
    icon: Video,
  },
  REVISION_REQUIRED: {
    label: 'Yêu cầu sửa video',
    badgeBg: 'bg-[#FFF7ED]',
    badgeText: 'text-[#EA580C]',
    badgeBorder: 'border-[#FED7AA]',
    icon: AlertTriangle,
  },
  OVERDUE: {
    label: 'Quá hạn nộp video',
    badgeBg: 'bg-[#FEF2F2]',
    badgeText: 'text-[#DC2626]',
    badgeBorder: 'border-[#FECACA]',
    icon: AlertTriangle,
  },
  DELIVERY_ISSUE: {
    label: 'Sự cố bưu cục',
    badgeBg: 'bg-[#FEF2F2]',
    badgeText: 'text-[#DC2626]',
    badgeBorder: 'border-[#FECACA]',
    icon: AlertTriangle,
  },
  COMPLETED: {
    label: 'Đã hoàn tất',
    badgeBg: 'bg-[#ECFDF5]',
    badgeText: 'text-[#059669]',
    badgeBorder: 'border-[#A7F3D0]',
    icon: CheckCircle2,
  },
  REJECTED: {
    label: 'Shop từ chối',
    badgeBg: 'bg-[#F8FAFC]',
    badgeText: 'text-[#64748B]',
    badgeBorder: 'border-[#CBD5E1]',
    icon: X,
  },
  CANCELLED: {
    label: 'Đã hủy bỏ',
    badgeBg: 'bg-[#F8FAFC]',
    badgeText: 'text-[#64748B]',
    badgeBorder: 'border-[#CBD5E1]',
    icon: X,
  },
};

type ResolutionAction = 'EXTEND_DEADLINE' | 'CANCEL_OBLIGATION' | 'RESOLVE_DELIVERY_ISSUE';

function localDateAfter(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function formatMoney(amount?: number | string | null): string {
  const num = Number(amount || 0);
  return num.toLocaleString('vi-VN') + ' ₫';
}

function getPlatformBadge(platform?: string) {
  const p = (platform || '').toUpperCase();
  if (p.includes('TIKTOK')) {
    return { name: 'TikTok', bg: 'bg-[#000000] text-white', icon: '🎵' };
  }
  if (p.includes('YOUTUBE')) {
    return { name: 'YouTube', bg: 'bg-[#FF0000] text-white', icon: '▶' };
  }
  if (p.includes('FACEBOOK')) {
    return { name: 'Facebook', bg: 'bg-[#1877F2] text-white', icon: 'f' };
  }
  if (p.includes('INSTAGRAM')) {
    return { name: 'Instagram', bg: 'bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCB045] text-white', icon: '📷' };
  }
  return { name: platform || 'Mạng xã hội', bg: 'bg-[#231D15] text-white', icon: '🌐' };
}

export default function AdminSampleRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [blockedCreators, setBlockedCreators] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'requests' | 'blocked'>('requests');
  const [loading, setLoading] = useState(true);

  // Resolution modal state
  const [resolution, setResolution] = useState<{ request: any; action: ResolutionAction } | null>(null);
  const [reason, setReason] = useState('');
  const [deadlineDate, setDeadlineDate] = useState(localDateAfter(7));
  const [saving, setSaving] = useState(false);

  // Unblock creator modal state
  const [unblockingCreator, setUnblockingCreator] = useState<any | null>(null);
  const [unblockReason, setUnblockReason] = useState('');
  const [unblockSubmitting, setUnblockSubmitting] = useState(false);

  // History timeline modal
  const [selectedHistoryRequest, setSelectedHistoryRequest] = useState<any | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [requestResponse, blockedResponse] = await Promise.all([
        api.get('/sample-requests/admin', { headers: { 'x-skip-cache': 'true' } }),
        api.get('/sample-requests/admin/blocked', { headers: { 'x-skip-cache': 'true' } }),
      ]);
      const requestData = requestResponse?.data || requestResponse;
      const blockedData = blockedResponse?.data || blockedResponse;
      setRequests(Array.isArray(requestData) ? requestData : []);
      setBlockedCreators(Array.isArray(blockedData) ? blockedData : []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Không tải được dữ liệu yêu cầu mẫu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Statistics calculation for Executive Bar
  const stats = useMemo(() => {
    const total = requests.length;
    const shipping = requests.filter((r) => ['SHIPPED', 'RECEIVED'].includes(r.status)).length;
    const videoReview = requests.filter((r) => r.status === 'VIDEO_SUBMITTED').length;
    const risk = requests.filter((r) => ['OVERDUE', 'DELIVERY_ISSUE', 'REVISION_REQUIRED'].includes(r.status)).length;
    const completed = requests.filter((r) => r.status === 'COMPLETED').length;
    const blocked = blockedCreators.length;
    return { total, shipping, videoReview, risk, completed, blocked };
  }, [requests, blockedCreators]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    let list = requests;
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'RISK_GROUP') {
        list = list.filter((r) => ['OVERDUE', 'DELIVERY_ISSUE', 'REVISION_REQUIRED'].includes(r.status));
      } else if (statusFilter === 'IN_PROGRESS') {
        list = list.filter((r) => ['APPROVED', 'SHIPPED', 'RECEIVED'].includes(r.status));
      } else {
        list = list.filter((r) => r.status === statusFilter);
      }
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        const prodTitle = (r.product?.title || '').toLowerCase();
        const prodSku = (r.product?.sku || '').toLowerCase();
        const shopName = (r.product?.store?.name || '').toLowerCase();
        const kolName = (r.collaborator?.fullName || '').toLowerCase();
        const kolEmail = (r.collaborator?.email || '').toLowerCase();
        const recipientName = (r.recipientName || '').toLowerCase();
        const recipientPhone = (r.recipientPhone || '').toLowerCase();
        const tracking = (r.trackingNumber || '').toLowerCase();
        const channel = (r.socialChannelNameSnapshot || r.socialChannel?.channelName || '').toLowerCase();

        return (
          prodTitle.includes(q) ||
          prodSku.includes(q) ||
          shopName.includes(q) ||
          kolName.includes(q) ||
          kolEmail.includes(q) ||
          recipientName.includes(q) ||
          recipientPhone.includes(q) ||
          tracking.includes(q) ||
          channel.includes(q)
        );
      });
    }

    return list;
  }, [requests, statusFilter, searchQuery]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label}!`, { description: text });
  };

  const openResolution = (request: any, action: ResolutionAction) => {
    setResolution({ request, action });
    setReason('');
    setDeadlineDate(localDateAfter(7));
  };

  const submitResolution = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!resolution || !reason.trim()) return;
    if (resolution.action === 'EXTEND_DEADLINE' && !deadlineDate) return;
    setSaving(true);
    try {
      await api.patch(`/sample-requests/admin/${resolution.request.id}/resolve`, {
        action: resolution.action,
        reason: reason.trim(),
        ...(resolution.action === 'EXTEND_DEADLINE'
          ? { deadlineAt: new Date(`${deadlineDate}T23:59:00`).toISOString() }
          : {}),
      });
      toast.success('Đã lưu quyết định xử lý và cập nhật hồ sơ yêu cầu.');
      setResolution(null);
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Không thể xử lý yêu cầu mẫu.');
    } finally {
      setSaving(false);
    }
  };

  const submitUnblock = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!unblockingCreator || !unblockReason.trim()) return;
    setUnblockSubmitting(true);
    try {
      await api.patch(`/sample-requests/admin/${unblockingCreator.id}/unblock`, {
        reason: unblockReason.trim(),
      });
      toast.success(`Đã mở khóa quyền nhận mẫu cho KOL ${unblockingCreator.fullName || ''}!`);
      setUnblockingCreator(null);
      setUnblockReason('');
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Không thể mở khóa KOL.');
    } finally {
      setUnblockSubmitting(false);
    }
  };

  const resolutionTitle =
    resolution?.action === 'EXTEND_DEADLINE'
      ? 'Gia hạn thời hạn nộp video cam kết'
      : resolution?.action === 'CANCEL_OBLIGATION'
      ? 'Miễn nghĩa vụ video mẫu (Đóng tranh chấp)'
      : 'Mở lại xuất gửi bù hàng mẫu';

  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#FAF8F5] p-4 sm:p-6 text-[#1A1612]">
      <div className="mx-auto max-w-7xl space-y-5">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#B88E4F] bg-[#FBF5EB] px-2.5 py-0.5 rounded-md border border-[#EEDFC6]">
                Quản trị rủi ro hàng mẫu
              </span>
              <span className="text-xs text-[#7D715E]">• SCANMS Platform Admin</span>
            </div>
            <h1 className="mt-1 text-2xl font-black text-[#1A1612]">
              Quản Trị Hàng Mẫu KOL & Cam Kết Video
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#7D715E] max-w-3xl leading-relaxed">
              Theo dõi chu trình gửi mẫu 4 bước (Duyệt mẫu → Giao nhận bưu cục → Nộp video nghiệm thu → Đối soát hoa hồng). Can thiệp xử lý quá hạn và giải quyết tranh chấp giữa Shop và Nhà sáng tạo.
            </p>
          </div>
          <button
            onClick={() => void loadData()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-[#EAE4D7] bg-white px-3.5 py-2 text-xs sm:text-sm font-bold text-[#1A1612] hover:bg-[#FBF5EB] shadow-2xs transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 text-[#B88E4F] ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Đang tải...' : 'Làm mới dữ liệu'}</span>
          </button>
        </header>

        {/* Executive KPI Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div
            onClick={() => { setView('requests'); setStatusFilter('ALL'); }}
            className={`p-3.5 rounded-2xl border transition cursor-pointer ${statusFilter === 'ALL' && view === 'requests' ? 'bg-[#FBF5EB] border-[#B88E4F] shadow-sm' : 'bg-white border-[#EAE4D7] hover:border-[#C59B58]/60'}`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-[#7D715E]">
              <span>Tổng yêu cầu</span>
              <Package className="w-4 h-4 text-[#C59B58]" />
            </div>
            <div className="mt-2 text-xl font-black text-[#1A1612]">{stats.total}</div>
            <div className="text-[10px] text-[#7D715E] mt-0.5">Toàn bộ sàn</div>
          </div>

          <div
            onClick={() => { setView('requests'); setStatusFilter('IN_PROGRESS'); }}
            className={`p-3.5 rounded-2xl border transition cursor-pointer ${statusFilter === 'IN_PROGRESS' && view === 'requests' ? 'bg-[#FBF5EB] border-[#B88E4F] shadow-sm' : 'bg-white border-[#EAE4D7] hover:border-[#C59B58]/60'}`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-[#7D715E]">
              <span>Đang gửi / Nhận</span>
              <Truck className="w-4 h-4 text-[#16A34A]" />
            </div>
            <div className="mt-2 text-xl font-black text-[#16A34A]">{stats.shipping}</div>
            <div className="text-[10px] text-[#7D715E] mt-0.5">KOL đang quay</div>
          </div>

          <div
            onClick={() => { setView('requests'); setStatusFilter('VIDEO_SUBMITTED'); }}
            className={`p-3.5 rounded-2xl border transition cursor-pointer ${statusFilter === 'VIDEO_SUBMITTED' && view === 'requests' ? 'bg-[#FBF5EB] border-[#B88E4F] shadow-sm' : 'bg-white border-[#EAE4D7] hover:border-[#C59B58]/60'}`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-[#7D715E]">
              <span>Chờ duyệt video</span>
              <Video className="w-4 h-4 text-[#B88E4F]" />
            </div>
            <div className="mt-2 text-xl font-black text-[#B88E4F]">{stats.videoReview}</div>
            <div className="text-[10px] text-[#7D715E] mt-0.5">KOL đã gửi video</div>
          </div>

          <div
            onClick={() => { setView('requests'); setStatusFilter('RISK_GROUP'); }}
            className={`p-3.5 rounded-2xl border transition cursor-pointer ${statusFilter === 'RISK_GROUP' && view === 'requests' ? 'bg-[#FEF2F2] border-[#DC2626] shadow-sm' : 'bg-white border-[#EAE4D7] hover:border-rose-400'}`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-[#DC2626]">
              <span>Cảnh báo rủi ro</span>
              <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
            </div>
            <div className="mt-2 text-xl font-black text-[#DC2626]">{stats.risk}</div>
            <div className="text-[10px] text-[#DC2626] mt-0.5">Quá hạn / Sửa video</div>
          </div>

          <div
            onClick={() => { setView('requests'); setStatusFilter('COMPLETED'); }}
            className={`p-3.5 rounded-2xl border transition cursor-pointer ${statusFilter === 'COMPLETED' && view === 'requests' ? 'bg-[#ECFDF5] border-[#059669] shadow-sm' : 'bg-white border-[#EAE4D7] hover:border-[#059669]/60'}`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-[#059669]">
              <span>Đã hoàn tất</span>
              <CheckCircle2 className="w-4 h-4 text-[#059669]" />
            </div>
            <div className="mt-2 text-xl font-black text-[#059669]">{stats.completed}</div>
            <div className="text-[10px] text-[#7D715E] mt-0.5">Nghiệm thu thành công</div>
          </div>

          <div
            onClick={() => setView('blocked')}
            className={`p-3.5 rounded-2xl border transition cursor-pointer ${view === 'blocked' ? 'bg-[#FEF2F2] border-[#DC2626] shadow-sm' : 'bg-white border-[#EAE4D7] hover:border-rose-400'}`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-[#DC2626]">
              <span>KOL bị khóa</span>
              <Ban className="w-4 h-4 text-[#DC2626]" />
            </div>
            <div className="mt-2 text-xl font-black text-[#DC2626]">{stats.blocked}</div>
            <div className="text-[10px] text-[#DC2626] mt-0.5">Khóa quyền nhận mẫu</div>
          </div>
        </div>

        {/* Toolbar: Tabs, Search & Status Dropdown */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#EAE4D7] bg-white p-3.5 shadow-2xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setView('requests')}
              className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${view === 'requests' ? 'bg-[#C59B58] text-[#231D15] shadow-xs' : 'text-[#7D715E] hover:bg-[#FAF8F5]'}`}
            >
              <Package className="h-4 w-4" />
              <span>Yêu cầu hàng mẫu</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-extrabold ${view === 'requests' ? 'bg-[#231D15] text-[#C59B58]' : 'bg-[#F3EFE6] text-[#7D715E]'}`}>
                {requests.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setView('blocked')}
              className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${view === 'blocked' ? 'bg-[#DC2626] text-white shadow-xs' : 'text-[#7D715E] hover:bg-[#FAF8F5]'}`}
            >
              <ShieldAlert className="h-4 w-4" />
              <span>KOL bị khóa quyền</span>
              {blockedCreators.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-extrabold ${view === 'blocked' ? 'bg-white text-[#DC2626]' : 'bg-rose-100 text-[#DC2626]'}`}>
                  {blockedCreators.length}
                </span>
              )}
            </button>
          </div>

          {view === 'requests' && (
            <div className="flex flex-wrap items-center gap-2.5 flex-1 justify-end">
              {/* Search input */}
              <div className="relative min-w-[220px] sm:min-w-[280px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7D715E]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm sản phẩm, KOL, Shop, mã vận đơn..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] text-xs font-semibold text-[#1A1612] outline-none focus:border-[#C59B58] focus:bg-white transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#7D715E] hover:text-[#1A1612]"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Status filter dropdown */}
              <Select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-56 text-xs font-semibold"
              >
                <option value="ALL">Tất cả trạng thái ({requests.length})</option>
                <option value="IN_PROGRESS">Đang gửi / Đã nhận ({stats.shipping})</option>
                <option value="VIDEO_SUBMITTED">Chờ duyệt video ({stats.videoReview})</option>
                <option value="RISK_GROUP">Cảnh báo rủi ro &amp; Quá hạn ({stats.risk})</option>
                {Object.entries(STATUS_CONFIGS).map(([status, config]) => (
                  <option key={status} value={status}>
                    {config.label}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>

        {/* Content View */}
        {loading ? (
          <div className="rounded-2xl border border-[#EAE4D7] bg-white p-16 text-center text-sm text-[#7D715E] flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-[#C59B58] animate-spin" />
            <span className="font-semibold">Đang tổng hợp dữ liệu hàng mẫu và cam kết KOL...</span>
          </div>
        ) : view === 'blocked' ? (
          /* BLOCKED CREATORS VIEW */
          <div className="space-y-3.5">
            {blockedCreators.length === 0 ? (
              <div className="rounded-2xl border border-[#EAE4D7] bg-white p-14 text-center">
                <ShieldCheck className="w-12 h-12 text-[#059669] mx-auto mb-2" />
                <h3 className="text-base font-extrabold text-[#1A1612]">Không có KOL nào bị khóa</h3>
                <p className="text-xs text-[#7D715E] mt-1 max-w-md mx-auto">
                  Hiện tại toàn bộ Nhà sáng tạo đều tuân thủ tốt nghĩa vụ gửi video nghiệm thu mẫu đúng hạn.
                </p>
              </div>
            ) : (
              blockedCreators.map((entry) => {
                const creator = entry.user;
                return (
                  <article
                    key={creator.id}
                    className="rounded-2xl border border-rose-200 bg-white p-5 shadow-xs transition hover:shadow-sm"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0 text-rose-600 font-bold text-base">
                          {(creator.fullName || 'K')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-base font-extrabold text-[#1A1612]">
                              {creator.fullName || 'Nhà sáng tạo'}
                            </h2>
                            <span className="text-[11px] font-bold text-[#DC2626] bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Ban className="w-3 h-3" />
                              Bị khóa nhận mẫu
                            </span>
                          </div>
                          <div className="text-xs text-[#7D715E] mt-0.5 flex items-center gap-2 flex-wrap">
                            <span>📧 {creator.email}</span>
                            {creator.phoneNumber && <span>📞 {creator.phoneNumber}</span>}
                          </div>
                          <div className="mt-2.5 p-2.5 rounded-xl bg-rose-50/70 border border-rose-100 text-xs text-rose-800">
                            <strong>Lý do hệ thống khóa:</strong> {entry.sampleRequestsBlockReason || 'Quá hạn nộp video cam kết nhiều lần mà không hoàn thành nghĩa vụ.'}
                          </div>
                          <p className="mt-1.5 text-[11px] text-[#7D715E]">
                            Thời điểm khóa: {entry.sampleRequestsBlockedAt ? new Date(entry.sampleRequestsBlockedAt).toLocaleString('vi-VN') : '—'} • {creator.sampleProductRequests?.length || 0} yêu cầu mẫu bị quá hạn liên quan
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setUnblockingCreator(creator);
                          setUnblockReason('');
                        }}
                        className="self-start px-4 py-2 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-[#231D15] text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Mở khóa quyền nhận mẫu</span>
                      </button>
                    </div>

                    {creator.sampleProductRequests?.length > 0 && (
                      <div className="mt-4 pt-3.5 border-t border-[#EAE4D7]">
                        <p className="text-xs font-bold text-[#1A1612] mb-2 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-[#DC2626]" />
                          Các đơn mẫu quá hạn gây khóa tài khoản:
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {creator.sampleProductRequests.map((req: any) => (
                            <div key={req.id} className="p-2 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7] text-xs">
                              <div className="font-bold text-[#1A1612] truncate">{req.product?.title || 'Sản phẩm mẫu'}</div>
                              <div className="text-[11px] text-[#7D715E] flex justify-between mt-0.5">
                                <span>Shop: {req.product?.store?.name || '—'}</span>
                                <span className="text-[#DC2626] font-semibold">Hạn: {req.deadlineAt ? new Date(req.deadlineAt).toLocaleDateString('vi-VN') : '—'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        ) : filteredRequests.length === 0 ? (
          /* EMPTY STATE */
          <div className="rounded-2xl border border-[#EAE4D7] bg-white p-14 text-center">
            <Package className="w-12 h-12 text-[#C59B58] mx-auto mb-2 opacity-60" />
            <h3 className="text-base font-extrabold text-[#1A1612]">Không tìm thấy yêu cầu phù hợp</h3>
            <p className="text-xs text-[#7D715E] mt-1 max-w-md mx-auto">
              Không có yêu cầu hàng mẫu nào khớp với bộ lọc trạng thái hoặc từ khóa tìm kiếm của bạn.
            </p>
          </div>
        ) : (
          /* RICH SAMPLE REQUEST CARDS LIST */
          <div className="space-y-4">
            {filteredRequests.map((request) => {
              const statusCfg = STATUS_CONFIGS[request.status] || {
                label: request.status,
                badgeBg: 'bg-[#FBF5EB]',
                badgeText: 'text-[#8C6226]',
                badgeBorder: 'border-[#EEDFC6]',
                icon: Clock3,
              };
              const StatusIcon = statusCfg.icon;

              const revisionStage =
                Boolean(request.revisionDeadlineAt) && ['REVISION_REQUIRED', 'OVERDUE'].includes(request.status);
              const activeDeadline = revisionStage ? request.revisionDeadlineAt : request.deadlineAt;
              const canExtend = ['RECEIVED', 'REVISION_REQUIRED', 'OVERDUE'].includes(request.status);

              const prodImage = getSafeProductImageUrl(
                request.product?.imageUrl,
                request.product?.title || 'Sản phẩm mẫu'
              );

              const platformBadge = getPlatformBadge(
                request.socialPlatformSnapshot || request.socialChannel?.platformName
              );

              const kolProfile = request.collaborator?.collaboratorProfile;
              const tierName = kolProfile?.tier?.name || 'KOL Tiếp thị';

              return (
                <article
                  key={request.id}
                  className="rounded-2xl border border-[#EAE4D7] bg-white shadow-xs hover:shadow-md transition p-4 sm:p-5 text-left"
                >
                  {/* Top Bar of the Card: Status, Created At, Sample Value */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-[#EAE4D7]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusCfg.badgeBg} ${statusCfg.badgeText} ${statusCfg.badgeBorder}`}
                      >
                        <StatusIcon className="w-3.5 h-3.5" />
                        <span>{statusCfg.label}</span>
                      </span>

                      <span className="text-[11px] text-[#7D715E] font-medium">
                        Tạo lúc: {new Date(request.createdAt).toLocaleString('vi-VN')}
                      </span>

                      <span className="text-[11px] font-mono text-[#7D715E] bg-[#FAF8F5] px-2 py-0.5 rounded-md border border-[#EAE4D7]">
                        Mã: {request.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#7D715E]">Trị giá mẫu:</span>
                      <span className="text-xs sm:text-sm font-black text-[#1A1612] bg-[#FAF8F5] px-2.5 py-1 rounded-xl border border-[#EAE4D7]">
                        {formatMoney(request.productVariant?.price ?? request.product?.price)}
                      </span>
                    </div>
                  </div>

                  {/* Main Grid: 3 Clean Structured Columns */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-4">
                    {/* Column 1 (4 cols): Product & Store Info */}
                    <div className="lg:col-span-4 flex gap-3.5">
                      <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl border border-[#EAE4D7] overflow-hidden bg-[#FAF8F5] shrink-0 relative shadow-2xs">
                        <img
                          src={prodImage}
                          alt={request.product?.title || 'Sản phẩm mẫu'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 -z-10 flex items-center justify-center text-xs text-[#7D715E]">
                          <Package className="w-8 h-8 text-[#C59B58] opacity-40" />
                        </div>
                      </div>

                      <div className="min-w-0 flex-1 flex flex-col justify-between">
                        <div>
                          <h3
                            className="text-sm font-extrabold text-[#1A1612] line-clamp-2 leading-snug"
                            title={request.product?.title}
                          >
                            {request.product?.title || 'Sản phẩm mẫu'}
                          </h3>

                          {request.productVariant?.name && (
                            <span className="inline-block mt-1 text-[11px] font-semibold text-[#8C6226] bg-[#FBF5EB] border border-[#EEDFC6] px-2 py-0.5 rounded-md">
                              Phân loại: {request.productVariant.name}
                            </span>
                          )}
                        </div>

                        <div className="mt-2 pt-2 border-t border-[#EAE4D7]/70 text-xs text-[#7D715E] flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5 text-[#B88E4F] shrink-0" />
                          <span className="truncate font-semibold text-[#1A1612]">
                            {request.product?.store?.name || 'Gian hàng SCANMS'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Column 2 (4 cols): Creator & Social Commitment & Delivery Info */}
                    <div className="lg:col-span-4 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7] p-3.5 space-y-2.5 text-xs text-[#1A1612]">
                      {/* KOL Identity */}
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#EAE4D7]">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#C59B58] text-[#231D15] font-black text-xs flex items-center justify-center shrink-0">
                            {(request.collaborator?.fullName || 'K')[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-extrabold text-[#1A1612] truncate">
                              {request.collaborator?.fullName || 'KOL Tiếp thị'}
                            </div>
                            <div className="text-[10px] text-[#7D715E]">
                              {request.collaborator?.email}
                            </div>
                          </div>
                        </div>

                        <span className="text-[10px] font-bold text-[#8C6226] bg-[#FBF5EB] border border-[#EEDFC6] px-2 py-0.5 rounded-full shrink-0">
                          {tierName}
                        </span>
                      </div>

                      {/* Social Channel Commitment */}
                      <div className="space-y-1">
                        <div className="text-[11px] font-bold text-[#7D715E] flex items-center gap-1">
                          <span>Kênh cam kết nộp video:</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 bg-white p-2 rounded-lg border border-[#EAE4D7]">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold ${platformBadge.bg}`}>
                              {platformBadge.name}
                            </span>
                            <span className="font-bold text-[#1A1612] truncate">
                              {request.socialChannelNameSnapshot || request.socialChannel?.channelName || 'Chưa định danh'}
                            </span>
                          </div>
                          <span className="text-[11px] font-extrabold text-[#8C6226] shrink-0">
                            {Number(
                              request.socialFollowerSnapshot ?? request.socialChannel?.followerCount ?? 0
                            ).toLocaleString('vi-VN')}{' '}
                            Followers
                          </span>
                        </div>
                      </div>

                      {/* Shipping info */}
                      <div className="pt-1.5 border-t border-[#EAE4D7] text-[11px] text-[#7D715E] space-y-1">
                        <div className="flex items-center gap-1 truncate text-[#1A1612] font-semibold">
                          <MapPin className="w-3.5 h-3.5 text-[#B88E4F] shrink-0" />
                          <span className="truncate">{request.recipientName || 'Người nhận'} ({request.recipientPhone || '—'})</span>
                        </div>
                        <div className="text-[11px] text-[#7D715E] pl-4 line-clamp-1" title={request.shippingAddress}>
                          {request.shippingAddress || 'Chưa cung cấp địa chỉ nhận'}
                        </div>
                        {request.trackingNumber && (
                          <div className="flex items-center justify-between pl-4 pt-0.5 text-[#1A1612] font-mono">
                            <span className="text-[11px] text-[#16A34A] font-bold flex items-center gap-1">
                              <Truck className="w-3 h-3" />
                              {request.carrier || 'Bưu cục'}: {request.trackingNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(request.trackingNumber, 'mã vận đơn')}
                              className="text-[10px] text-[#B88E4F] hover:underline flex items-center gap-0.5 font-sans cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                              Sao chép
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Column 3 (4 cols): Deadlines, Video Submission & Admin Actions */}
                    <div className="lg:col-span-4 flex flex-col justify-between rounded-xl bg-white border border-[#EAE4D7] p-3.5 space-y-3">
                      <div>
                        {/* Timeline & Deadlines */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#7D715E]">Dự kiến đăng:</span>
                            <span className="font-semibold text-[#1A1612]">
                              {request.expectedVideoAt
                                ? new Date(request.expectedVideoAt).toLocaleDateString('vi-VN')
                                : 'Chưa thiết lập'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#7D715E]">
                              {revisionStage ? 'Hạn sửa video:' : 'Hạn nộp nghiệm thu:'}
                            </span>
                            <span
                              className={`font-bold ${
                                request.status === 'OVERDUE'
                                  ? 'text-[#DC2626] bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200'
                                  : 'text-[#1A1612]'
                              }`}
                            >
                              {activeDeadline
                                ? new Date(activeDeadline).toLocaleString('vi-VN')
                                : 'Chờ bưu cục phát'}
                            </span>
                          </div>

                          {request.status === 'OVERDUE' && (
                            <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-[11px] font-bold text-[#DC2626] flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span>Đã quá hạn! Tài khoản KOL bị tạm khóa quyền nhận mẫu mới.</span>
                            </div>
                          )}
                        </div>

                        {/* Video Submission link if submitted */}
                        {request.videoUrl && (
                          <div className="mt-2.5 pt-2.5 border-t border-[#EAE4D7]">
                            <a
                              href={request.videoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#FBF5EB] hover:bg-[#F3EFE6] border border-[#EEDFC6] text-xs font-bold text-[#8C6226] transition active:scale-95"
                            >
                              <Video className="w-4 h-4 text-[#B88E4F]" />
                              <span>Mở video KOL đã nộp nghiệm thu</span>
                              <ExternalLink className="w-3 h-3 text-[#B88E4F]" />
                            </a>
                          </div>
                        )}

                        {/* Rejection / Delivery issue notes */}
                        {request.rejectedReason && (
                          <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
                            <strong>Ghi chú giao nhận:</strong> {request.rejectedReason}
                          </div>
                        )}
                        {request.videoRejectionReason && (
                          <div className="mt-2 p-2 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-800">
                            <strong>Yêu cầu chỉnh sửa video:</strong> {request.videoRejectionReason}
                          </div>
                        )}
                      </div>

                      {/* Admin Resolution Action Buttons */}
                      <div className="pt-3 border-t border-[#EAE4D7] flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedHistoryRequest(request)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#8C6226] hover:underline cursor-pointer"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>Lịch sử ({request.events?.length || 0})</span>
                        </button>

                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {canExtend && (
                            <button
                              type="button"
                              onClick={() => openResolution(request, 'EXTEND_DEADLINE')}
                              className="px-2.5 py-1.5 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] hover:bg-[#F3EFE6] text-xs font-bold text-[#8C6226] flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-2xs"
                              title="Gia hạn thời hạn nộp video cho KOL"
                            >
                              <CalendarClock className="w-3.5 h-3.5" />
                              <span>Gia hạn</span>
                            </button>
                          )}

                          {request.status === 'DELIVERY_ISSUE' && (
                            <button
                              type="button"
                              onClick={() => openResolution(request, 'RESOLVE_DELIVERY_ISSUE')}
                              className="px-2.5 py-1.5 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-[#231D15] text-xs font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-2xs"
                              title="Giải quyết sự cố giao hàng và mở lại cho Shop gửi bù"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>Mở gửi bù</span>
                            </button>
                          )}

                          {['APPROVED', 'SHIPPED', 'RECEIVED', 'REVISION_REQUIRED', 'OVERDUE', 'DELIVERY_ISSUE'].includes(
                            request.status
                          ) && (
                            <button
                              type="button"
                              onClick={() => openResolution(request, 'CANCEL_OBLIGATION')}
                              className="px-2.5 py-1.5 rounded-lg border border-[#EAE4D7] bg-white hover:bg-[#FAF8F5] text-xs font-bold text-[#7D715E] hover:text-[#DC2626] transition active:scale-95 cursor-pointer"
                              title="Miễn nghĩa vụ video mẫu do sự cố bất khả kháng"
                            >
                              <span>Miễn nghĩa vụ</span>
                            </button>
                          )}

                          {request.status === 'COMPLETED' && (
                            <span className="inline-flex items-center gap-1 text-xs font-extrabold text-[#059669] bg-[#ECFDF5] px-2.5 py-1 rounded-lg border border-[#A7F3D0]">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Hoàn tất</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* RESOLUTION MODAL (GIA HẠN / MIỄN NGHĨA VỤ / GỬI BÙ) */}
      {resolution && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={submitResolution}
            className="w-full max-w-lg space-y-4 rounded-2xl border border-[#EAE4D7] bg-white p-6 shadow-2xl text-left animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE4D7]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] flex items-center justify-center shrink-0 text-[#B88E4F]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-[#1A1612] m-0">{resolutionTitle}</h2>
                  <p className="text-xs text-[#7D715E] mt-0.5 m-0">
                    Quyết định can thiệp sẽ được lưu vết kiểm toán và gửi thông báo cho hai bên
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResolution(null)}
                className="p-1 rounded-lg text-[#7D715E] hover:bg-[#FAF8F5]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7] text-xs text-[#7D715E] space-y-1">
              <div className="truncate">• <strong>Sản phẩm:</strong> <span className="text-[#1A1612] font-semibold">{resolution.request.product?.title}</span></div>
              <div>• <strong>KOL tiếp thị:</strong> <span className="text-[#1A1612] font-semibold">{resolution.request.collaborator?.fullName} ({resolution.request.collaborator?.email})</span></div>
              <div>• <strong>Gian hàng:</strong> <span className="text-[#1A1612] font-semibold">{resolution.request.product?.store?.name}</span></div>
            </div>

            {resolution.action === 'EXTEND_DEADLINE' && (
              <div>
                <label className="block text-xs font-bold text-[#1A1612] mb-1">
                  Thời hạn nộp video mới <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="date"
                  min={localDateAfter(1)}
                  value={deadlineDate}
                  onChange={(event) => setDeadlineDate(event.target.value)}
                  required
                  className="w-full rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] px-3 py-2 text-xs font-semibold text-[#1A1612] outline-none focus:border-[#C59B58]"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#1A1612] mb-1">
                Căn cứ / Lý do can thiệp của Quản trị viên <span className="text-[#DC2626]">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={500}
                required
                rows={3}
                className="w-full rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] p-3 text-xs text-[#1A1612] outline-none focus:border-[#C59B58] transition resize-none font-medium"
                placeholder="Ghi nhận khiếu nại, thỏa thuận giữa hai bên hoặc bằng chứng bất khả kháng..."
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-[#EAE4D7]">
              <button
                type="button"
                onClick={() => setResolution(null)}
                className="rounded-xl border border-[#EAE4D7] bg-white px-4 py-2 text-xs font-bold text-[#7D715E] hover:bg-[#FAF8F5] transition"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={saving || !reason.trim()}
                className="rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] px-5 py-2 text-xs font-bold text-[#231D15] disabled:opacity-50 transition shadow-xs flex items-center gap-1.5"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <span>Lưu quyết định</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* UNBLOCK CREATOR MODAL */}
      {unblockingCreator && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={submitUnblock}
            className="w-full max-w-md space-y-4 rounded-2xl border border-[#EAE4D7] bg-white p-6 shadow-2xl text-left animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE4D7]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 text-[#059669]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-[#1A1612] m-0">Mở khóa quyền nhận mẫu</h2>
                  <p className="text-xs text-[#7D715E] mt-0.5 m-0">KOL: {unblockingCreator.fullName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUnblockingCreator(null)}
                className="p-1 rounded-lg text-[#7D715E] hover:bg-[#FAF8F5]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#7D715E] leading-relaxed">
              Sau khi mở khóa, KOL sẽ được khôi phục quyền gửi yêu cầu xin sản phẩm mẫu tới các gian hàng đối tác trên sàn SCANMS.
            </p>

            <div>
              <label className="block text-xs font-bold text-[#1A1612] mb-1">
                Lý do phê duyệt mở khóa <span className="text-[#DC2626]">*</span>
              </label>
              <textarea
                value={unblockReason}
                onChange={(e) => setUnblockReason(e.target.value)}
                maxLength={400}
                required
                rows={3}
                className="w-full rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] p-3 text-xs text-[#1A1612] outline-none focus:border-[#C59B58] transition resize-none font-medium"
                placeholder="VD: KOL đã bổ sung video giải trình hợp lệ / Đã thanh toán bồi hoàn chi phí mẫu..."
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-[#EAE4D7]">
              <button
                type="button"
                onClick={() => setUnblockingCreator(null)}
                className="rounded-xl border border-[#EAE4D7] bg-white px-4 py-2 text-xs font-bold text-[#7D715E] hover:bg-[#FAF8F5] transition"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={unblockSubmitting || !unblockReason.trim()}
                className="rounded-xl bg-[#059669] hover:bg-[#047857] px-5 py-2 text-xs font-bold text-white disabled:opacity-50 transition shadow-xs flex items-center gap-1.5"
              >
                {unblockSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang mở khóa...</span>
                  </>
                ) : (
                  <span>Xác nhận mở khóa</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* HISTORY TIMELINE DRAWER / MODAL */}
      {selectedHistoryRequest && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl border border-[#EAE4D7] bg-white shadow-2xl text-left animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-[#EAE4D7]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] flex items-center justify-center shrink-0 text-[#B88E4F]">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-[#1A1612] m-0">Lịch sử sự kiện & Video nộp</h2>
                  <p className="text-xs text-[#7D715E] mt-0.5 m-0">
                    Đơn mẫu #{selectedHistoryRequest.id.slice(0, 8).toUpperCase()} • {selectedHistoryRequest.product?.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHistoryRequest(null)}
                className="p-1 rounded-lg text-[#7D715E] hover:bg-[#FAF8F5]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {/* Video Assets section */}
              {selectedHistoryRequest.videoAssets?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#B88E4F] mb-2 flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5" />
                    Các phiên bản video đã gửi ({selectedHistoryRequest.videoAssets.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedHistoryRequest.videoAssets.map((asset: any) => (
                      <div key={asset.id} className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7] text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <a
                            href={asset.urlOrContent}
                            target="_blank"
                            rel="noreferrer"
                            className="font-bold text-[#8C6226] hover:underline flex items-center gap-1 truncate"
                          >
                            <span>{asset.title || 'Video nghiệm thu'}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white border border-[#EAE4D7]">
                            {asset.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#7D715E] mt-1">
                          Nộp lúc: {new Date(asset.createdAt).toLocaleString('vi-VN')}
                        </div>
                        {asset.rejectionReason && (
                          <div className="mt-1.5 text-[11px] text-[#DC2626] bg-rose-50 p-2 rounded-lg border border-rose-200">
                            <strong>Lý do từ chối:</strong> {asset.rejectionReason}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Events Timeline */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#7D715E] mb-2 flex items-center gap-1.5">
                  <Clock3 className="w-3.5 h-3.5 text-[#B88E4F]" />
                  Dòng thời gian sự kiện ({selectedHistoryRequest.events?.length || 0})
                </h4>

                {(!selectedHistoryRequest.events || selectedHistoryRequest.events.length === 0) ? (
                  <p className="text-xs text-[#7D715E] italic">Chưa có sự kiện bổ sung.</p>
                ) : (
                  <div className="relative pl-6 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#EAE4D7]">
                    {selectedHistoryRequest.events.map((event: any) => (
                      <div key={event.id} className="relative text-xs">
                        <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#C59B58] ring-4 ring-white" />
                        <div className="font-bold text-[#1A1612]">{event.action}</div>
                        <div className="text-[10px] text-[#7D715E]">{new Date(event.createdAt).toLocaleString('vi-VN')}</div>
                        {event.details?.reason && (
                          <div className="mt-1 text-[11px] text-[#7D715E] bg-[#FAF8F5] p-2 rounded-lg border border-[#EAE4D7]">
                            <strong>Căn cứ:</strong> {event.details.reason}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-[#EAE4D7] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedHistoryRequest(null)}
                className="px-4 py-2 rounded-xl border border-[#EAE4D7] text-xs font-bold text-[#7D715E] hover:bg-[#FAF8F5]"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
