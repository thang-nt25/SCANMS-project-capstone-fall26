import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  X,
  History,
  Ban,
  ShieldAlert,
  Mail,
  Phone,
} from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../utils/toast';
import { getSafeProductImageUrl, handleProductImageError } from '@/utils/marketplace.utils';
import { Select } from '../../components/ui/Select';
import DateTimePicker from '../../components/common/DateTimePicker';
import { getPendingSampleReport, hasSampleDeadlineViolation } from '../../utils/sampleModeration';
import { Modal } from '../../components/ui/Modal';
import { SampleHistoryDialog, sampleHistoryEvents } from '../../components/returns/SampleHistoryDialog';

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
    badgeBg: 'bg-[#FBF5EB]',
    badgeText: 'text-[#8C6226]',
    badgeBorder: 'border-[#EEDFC6]',
    icon: CheckCircle2,
  },
  SHIPPED: {
    label: 'Đang giao mẫu',
    badgeBg: 'bg-[#FBF5EB]',
    badgeText: 'text-[#8C6226]',
    badgeBorder: 'border-[#EEDFC6]',
    icon: Truck,
  },
  RECEIVED: {
    label: 'Đã nhận mẫu',
    badgeBg: 'bg-[#FBF5EB]',
    badgeText: 'text-[#8C6226]',
    badgeBorder: 'border-[#EEDFC6]',
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
    badgeBg: 'bg-[#FBF5EB]',
    badgeText: 'text-[#8C6226]',
    badgeBorder: 'border-[#EEDFC6]',
    icon: CheckCircle2,
  },
  REJECTED: {
    label: 'Shop từ chối',
    badgeBg: 'bg-[#FBF5EB]',
    badgeText: 'text-[#8C6226]',
    badgeBorder: 'border-[#EEDFC6]',
    icon: X,
  },
  CANCELLED: {
    label: 'Đã hủy bỏ',
    badgeBg: 'bg-[#FBF5EB]',
    badgeText: 'text-[#8C6226]',
    badgeBorder: 'border-[#EEDFC6]',
    icon: X,
  },
};

type ResolutionAction = 'EXTEND_DEADLINE' | 'CANCEL_OBLIGATION' | 'RESOLVE_DELIVERY_ISSUE' | 'BLOCK_SAMPLE_REQUESTS' | 'DISMISS_REPORT';

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
    return { name: 'TikTok', bg: 'bg-[#000000] text-white', icon: 'TikTok' };
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
  return { name: platform || 'Mạng xã hội', bg: 'bg-[#231D15] text-white', icon: 'Web' };
}

export default function AdminSampleRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [blockedCreators, setBlockedCreators] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'requests' | 'blocked'>('requests');
  const [loading, setLoading] = useState(true);
  const loadSequence = useRef(0);

  // Resolution modal state
  const [resolution, setResolution] = useState<{ request: any; action: ResolutionAction } | null>(null);
  const [reason, setReason] = useState('');
  const [deadlineDate, setDeadlineDate] = useState(localDateAfter(7));
  const deadlineCalendarRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  // Unblock creator modal state
  const [unblockingCreator, setUnblockingCreator] = useState<any | null>(null);
  const [unblockReason, setUnblockReason] = useState('');
  const [unblockSubmitting, setUnblockSubmitting] = useState(false);

  // History timeline modal
  const [deliveryRequest, setDeliveryRequest] = useState<any | null>(null);
  const [blockedEntry,setBlockedEntry] = useState<any | null>(null);
  const [selectedHistoryRequest, setSelectedHistoryRequest] = useState<any | null>(null);

  const loadData = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setLoading(true);
    try {
      const [requestResponse, blockedResponse] = await Promise.all([
        api.get('/sample-requests/admin', { headers: { 'x-skip-cache': 'true' } }),
        api.get('/sample-requests/admin/blocked', { headers: { 'x-skip-cache': 'true' } }),
      ]);
      const requestData = requestResponse?.data || requestResponse;
      const blockedData = blockedResponse?.data || blockedResponse;
      if (sequence !== loadSequence.current) return;
      setRequests(Array.isArray(requestData) ? requestData : []);
      setBlockedCreators(Array.isArray(blockedData) ? blockedData : []);
    } catch (error: any) {
      if (sequence !== loadSequence.current) return;
      toast.error(error?.response?.data?.message || error?.message || 'Không tải được dữ liệu yêu cầu mẫu.');
    } finally {
      if (sequence === loadSequence.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Statistics calculation for Executive Bar
  const stats = useMemo(() => {
    const total = requests.length;
    const shipping = requests.filter((r) => ['APPROVED', 'SHIPPED', 'RECEIVED'].includes(r.status)).length;
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
      if (statusFilter === 'REPORTS') {
        list = list.filter((r) => getPendingSampleReport(r));
      } else if (statusFilter === 'RISK_GROUP') {
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
    if (!resolution || saving || !reason.trim()) return;
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
      ? 'Gia hạn nộp video'
      : resolution?.action === 'CANCEL_OBLIGATION'
      ? 'Miễn nộp video cho yêu cầu mẫu'
      : resolution?.action === 'BLOCK_SAMPLE_REQUESTS'
      ? 'Khóa quyền nhận mẫu của KOL'
      : resolution?.action === 'DISMISS_REPORT'
      ? 'Không chấp nhận đề nghị khóa'
      : 'Mở gửi bù hàng mẫu';

  return (
    <div id="admin-sample-oversight" className="w-full min-w-0 pb-6 text-[#1A1612]">
      <div className="mx-0 w-full min-w-0 space-y-4">
        <div className="sample-statistics grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 p-2 border border-[#EAE4D7] rounded-2xl bg-white">
          {[
            {label:'Tổng yêu cầu',value:stats.total,filter:'ALL',icon:Package},
            {label:'Đang xử lý',value:stats.shipping,filter:'IN_PROGRESS',icon:Truck},
            {label:'Chờ duyệt video',value:stats.videoReview,filter:'VIDEO_SUBMITTED',icon:Video},
            {label:'Cần xử lý',value:stats.risk,filter:'RISK_GROUP',icon:AlertTriangle},
            {label:'Hoàn tất',value:stats.completed,filter:'COMPLETED',icon:CheckCircle2},
            {label:'Bị khóa nhận mẫu',value:stats.blocked,filter:'BLOCKED',icon:Ban},
          ].map((item) => {
            const Icon = item.icon;
            const active = item.filter === 'BLOCKED' ? view === 'blocked' : view === 'requests' && statusFilter === item.filter;
            return <button key={item.filter} type="button" aria-pressed={active} onClick={() => { setView(item.filter === 'BLOCKED' ? 'blocked' : 'requests'); setSearchQuery(''); if(item.filter !== 'BLOCKED')setStatusFilter(item.filter); }} className={'rounded-xl border bg-white px-3 py-3 text-left transition cursor-pointer min-h-[82px] ' + (active ? 'border-[#EEDFC6] bg-[#FBF5EB]' : 'border-[#EAE4D7] hover:bg-[#FAF8F5]')}>
              <div className="flex items-center justify-between gap-2 text-xs text-[#7D715E]"><span>{item.label}</span><Icon className={'h-3.5 w-3.5 ' + (['RISK_GROUP','BLOCKED'].includes(item.filter) && item.value > 0 ? 'text-[#DC2626]' : 'text-[#B88E4F]')} /></div>
              <div className="mt-2 text-2xl font-semibold tabular-nums text-[#1A1612]">{item.value}</div>
            </button>;
          })}
        </div>

        {/* Toolbar: Tabs, Search & Status Dropdown */}
        <div className={`sample-toolbar ${view==='blocked'?'sample-toolbar-blocked':''} grid grid-cols-1 xl:grid-cols-[auto_minmax(0,1fr)] items-center gap-3 sm:gap-6 rounded-xl border border-[#EAE4D7] bg-white p-3`}>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-pressed={view === 'requests'}
              onClick={() => setView('requests')}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition flex items-center gap-2 cursor-pointer ${view === 'requests' ? 'bg-[#FBF5EB] text-[#8C6226] ring-1 ring-[#EEDFC6]' : 'text-[#7D715E] hover:bg-[#FAF8F5]'}`}
            >
              <Package className="h-4 w-4" />
              <span>Yêu cầu hàng mẫu</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-extrabold ${view === 'requests' ? 'bg-white text-[#8C6226]' : 'bg-[#F3EFE6] text-[#7D715E]'}`}>
                {requests.length}
              </span>
            </button>
            <button
              type="button"
              aria-pressed={view === 'blocked'}
              title="Xem KOL bị khóa quyền nhận hàng mẫu và xử lý mở khóa"
              onClick={() => setView('blocked')}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition flex items-center gap-2 cursor-pointer ${view === 'blocked' ? 'bg-[#FBF5EB] text-[#8C6226] ring-1 ring-[#EEDFC6]' : 'text-[#7D715E] hover:bg-[#FAF8F5]'}`}
            >
              <ShieldAlert className="h-4 w-4" />
              <span>KOL bị khóa nhận mẫu</span>
                <span className="sample-blocked-count">
                  {blockedCreators.length}
                </span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 min-w-0">
            {view === 'requests' && (
              <>
                {/* Search input */}
                <div className="relative min-w-0 flex-1 max-w-full xl:max-w-[460px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7D715E]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Tìm yêu cầu hàng mẫu" placeholder="Tìm sản phẩm, KOL, Shop, vận đơn…"
                    className="h-9 w-full pl-9 pr-8 py-1.5 rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] text-xs font-semibold text-[#1A1612] outline-none focus:border-[#C59B58] focus:bg-white transition"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      aria-label="Xóa từ khóa tìm kiếm"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#7D715E] hover:text-[#1A1612]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Status filter dropdown */}
                <div className="sample-status-filter w-full sm:w-[230px] shrink-0 min-w-0">
                  <Select
                    searchable={false}
                    portal={false}
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    aria-label="Lọc trạng thái hàng mẫu" className="h-9 w-full text-xs font-medium"
                  >
                    <option value="ALL">Tất cả trạng thái ({requests.length})</option>
                    <option value="IN_PROGRESS">Đang xử lý ({stats.shipping})</option>
                    <option value="VIDEO_SUBMITTED">Chờ duyệt video ({stats.videoReview})</option>
                    <option value="RISK_GROUP">Cần xử lý ({stats.risk})</option>
                    <option value="REPORTS">Chờ xét báo cáo ({requests.filter(r => getPendingSampleReport(r)).length})</option>
                    {Object.entries(STATUS_CONFIGS).map(([status, config]) => (
                      <option key={status} value={status}>
                        {config.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </>
            )}

          </div>
          <p className="sample-auto-block-note"><ShieldAlert size={14} aria-hidden="true" />Shop báo cáo · Manager/Admin xét duyệt</p>
        </div>

        {/* Content View */}
        {loading ? (
          <div className="rounded-2xl border border-[#EAE4D7] bg-white p-16 text-center text-sm text-[#7D715E] flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-[#C59B58] animate-spin" />
            <span className="font-semibold">Đang tổng hợp dữ liệu hàng mẫu và cam kết KOL...</span>
          </div>
        ) : view === 'blocked' ? (
          /* BLOCKED CREATORS VIEW */
          <div className="sample-blocked-list">
            {blockedCreators.length === 0 ? (
              <div className="sample-blocked-empty">
                <ShieldCheck size={28}/>
                <h3>Không có KOL bị khóa nhận mẫu</h3>
              </div>
            ) : (
              blockedCreators.map((entry) => {
                const creator = entry.user;
                return (
                  <article
                    key={creator.id}
                    className="sample-blocked-card rounded-xl border border-[#EAE4D7] bg-white p-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="sample-blocked-avatar">
                          {(creator.fullName || 'K')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-sm font-semibold text-[#1A1612]">
                              {creator.fullName || 'Nhà sáng tạo'}
                            </h2>
                            <span className="text-[11px] font-bold text-[#DC2626] bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Ban className="w-3 h-3" />
                              Bị khóa nhận mẫu
                            </span>
                          </div>
                          <div className="text-xs text-[#7D715E] mt-0.5 flex items-center gap-2 flex-wrap">
                            <span className="inline-flex min-w-0 items-center gap-1.5 break-all"><Mail className="h-3.5 w-3.5 shrink-0" />{creator.email}</span>
                            {creator.phoneNumber && <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{creator.phoneNumber}</span>}
                          </div>
                          <div className="sample-blocked-reason">
                            <strong>Lý do khóa quyền nhận mẫu:</strong> {entry.sampleRequestsBlockReason || 'Chưa có lý do được ghi nhận.'}
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
                        className="sample-unblock-button"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Mở khóa</span>
                      </button>
                    </div>

                    <button type="button" className="sample-blocked-related" onClick={()=>setBlockedEntry(entry)}>{"Xem hồ sơ liên quan"} ({creator.sampleProductRequests?.length || 0}) <ExternalLink size={13}/></button>
                  </article>
                );
              })
            )}
          </div>
        ) : filteredRequests.length === 0 ? (
          /* EMPTY STATE */
          <div className="rounded-2xl border border-[#EAE4D7] bg-white p-14 text-center">
            <Package className="w-12 h-12 text-[#C59B58] mx-auto mb-2 opacity-60" />
            <h3 className="text-sm font-semibold text-[#1A1612]">Không tìm thấy yêu cầu phù hợp</h3>
            <p className="text-xs text-[#7D715E] mt-1 max-w-md mx-auto">
              Không có yêu cầu hàng mẫu nào khớp với bộ lọc trạng thái hoặc từ khóa tìm kiếm của bạn.
            </p>
          </div>
        ) : (
          /* RICH SAMPLE REQUEST CARDS LIST */
          <div className="sample-request-list space-y-4">
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
              const pendingReport = getPendingSampleReport(request);

              const prodImage = getSafeProductImageUrl(
                request.product?.imageUrl,
                request.product?.title || 'Sản phẩm mẫu'
              );



              const kolProfile = request.collaborator?.collaboratorProfile;
              const tierName = kolProfile?.tier?.name || 'KOL Tiếp thị';

              return (
                <article key={request.id} data-status={request.status} className="sample-request-card min-w-0 rounded-xl border border-[#EAE4D7] bg-white p-4 text-left">
                  <div className="sample-card-heading flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={'sample-status-badge inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ' + statusCfg.badgeBg + ' ' + statusCfg.badgeText + ' ' + statusCfg.badgeBorder}><StatusIcon className="h-3 w-3" />{statusCfg.label}</span>
                      <span className="text-[11px] text-[#7D715E]">{new Date(request.createdAt).toLocaleDateString('vi-VN')}</span>
                      <code className="text-[10px] text-[#7D715E]" title={request.id}>#{request.id.slice(0,8).toUpperCase()}</code>
                    </div>
                  </div>
                  {pendingReport && <div className="sample-report-summary"><ShieldAlert size={15} /><div><strong>Shop đề nghị xử lý · Chờ Admin xét duyệt</strong><p>{pendingReport.details?.reason || 'Chưa có lý do'}</p><small>{new Date(pendingReport.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</small></div></div>}
                  <div className="sample-card-body mt-3 grid min-w-0 grid-cols-1 gap-4 border-t border-[#EAE4D7] pt-3 md:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
                    <div className="sample-product flex min-w-0 items-start gap-3">
                      <div className="sample-product-image relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[#EAE4D7] bg-white"><img src={prodImage} alt={request.product?.title || 'Sản phẩm mẫu'} className="relative h-full w-full object-contain" onError={handleProductImageError} /></div>
                      <div className="min-w-0"><h2 className="text-sm font-semibold leading-5 text-[#1A1612] line-clamp-2" title={request.product?.title}>{request.product?.title || 'Sản phẩm mẫu'}</h2>{request.productVariant?.name && <p className="mt-1 text-[11px] text-[#8C6226]">{request.productVariant.name}</p>}<p className="mt-1 flex items-center gap-1 text-[11px] text-[#7D715E]"><Store className="h-3 w-3 shrink-0" /><span className="truncate" title={request.product?.store?.name}>{request.product?.store?.name || 'Gian hàng SCANMS'}</span></p></div>
                    </div>
                    <div className="sample-creator min-w-0">
                      <p className="sample-field-label">Nhà sáng tạo</p>
                      <div className="sample-creator-identity">
                        <span className="sample-creator-avatar" aria-hidden="true">{(request.collaborator?.fullName || 'K')[0].toUpperCase()}{(kolProfile?.avatarUrl || request.collaborator?.avatarUrl) && <img src={kolProfile?.avatarUrl || request.collaborator.avatarUrl} alt="" onError={event=>{event.currentTarget.style.display='none';}}/>}</span>
                        <div className="min-w-0">
                          <p className="sample-creator-name">{request.collaborator?.fullName || 'KOL tiếp thị'}</p>
                          <p className="sample-creator-email" title={request.collaborator?.email}>{request.collaborator?.email || 'Chưa có email'}</p><span className="sample-creator-tier">{tierName}</span>
                        </div>
                      </div>
                    </div>
                    <div className="sample-deadlines min-w-0 md:col-span-2 lg:col-span-1">
                      <dl>
                        <div><dt>Giá mẫu</dt><dd className="sample-price-value">{formatMoney(request.productVariant?.price ?? request.product?.price)}</dd></div>
                        <div><dt>Dự kiến đăng</dt><dd>{request.expectedVideoAt ? new Date(request.expectedVideoAt).toLocaleDateString('vi-VN') : 'Chưa thiết lập'}</dd></div>
                        <div><dt>{revisionStage ? 'Hạn sửa video' : 'Hạn nộp video'}</dt><dd className={request.status === 'OVERDUE' ? 'font-semibold text-[#DC2626]' : undefined}>{activeDeadline ? new Date(activeDeadline).toLocaleDateString('vi-VN') : 'Chưa xác lập'}</dd></div>
                      </dl>
                      {request.videoSubmittedAt && <p className="sample-video-date">Nộp video: {new Date(request.videoSubmittedAt).toLocaleDateString('vi-VN', {timeZone:'Asia/Ho_Chi_Minh'})}</p>}
                      {request.status === 'COMPLETED' && <p className="sample-video-result">Đã hoàn tất nghĩa vụ video</p>}
                      {request.status === 'OVERDUE' && <p className="mt-2 text-[11px] text-[#DC2626]">Quá hạn nộp video · Cần xử lý</p>}
                    </div>
                  </div>
                  {(request.rejectedReason || request.videoRejectionReason) && <div className="mt-3 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-3 py-2 text-xs leading-5 text-[#7D715E]">{request.rejectedReason && <p>Ghi chú xử lý: {request.rejectedReason}</p>}{request.videoRejectionReason && <p>Yêu cầu sửa video: {request.videoRejectionReason}</p>}</div>}
                  <div className="sample-card-footer">
                  <button type="button" className="sample-delivery-trigger" onClick={() => setDeliveryRequest(request)}><Truck size={14}/>Giao nhận</button>
                      {/* Admin Resolution Action Buttons */}
                      <div className="sample-card-actions flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedHistoryRequest(request)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#8C6226] hover:underline cursor-pointer"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>Lịch sử ({sampleHistoryEvents(request).length})</span>
                        </button>
                        {request.videoUrl && <a className="sample-video-link" href={request.videoUrl} target="_blank" rel="noreferrer"><Video size={14}/>Xem video<ExternalLink size={12}/></a>}

                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {hasSampleDeadlineViolation(request) && !kolProfile?.sampleRequestsBlockedAt && <button type="button" className="sample-admin-block-button" onClick={() => openResolution(request, 'BLOCK_SAMPLE_REQUESTS')}><Ban size={14} />Khóa quyền nhận mẫu</button>}
                          {kolProfile?.sampleRequestsBlockedAt && <span className="text-xs text-[#7D715E]">Đã khóa quyền nhận mẫu</span>}
                          {pendingReport && <button type="button" className="sample-admin-dismiss-button" onClick={() => openResolution(request, 'DISMISS_REPORT')}>Không chấp nhận báo cáo</button>}
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
                              title="Miễn nộp video cho yêu cầu mẫu này, cần ghi lý do và căn cứ xử lý"
                            >
                              <span>Miễn nộp video</span>
                            </button>
                          )}

                        </div>
                      </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {blockedEntry && <Modal isOpen onClose={()=>setBlockedEntry(null)} title="Hồ sơ khóa nhận mẫu" subtitle={blockedEntry.user.fullName} maxWidth="2xl" stickyHeader className="sample-blocked-detail">
        <section><h3>{"Lý do khóa"}</h3><p>{blockedEntry.sampleRequestsBlockReason || 'Chưa có lý do'}</p><time>{blockedEntry.sampleRequestsBlockedAt ? new Date(blockedEntry.sampleRequestsBlockedAt).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}) : 'Chưa ghi nhận thời gian'}</time></section>
        <div className="sample-blocked-products">{blockedEntry.user.sampleProductRequests?.length ? blockedEntry.user.sampleProductRequests.map((item:any)=>{const full=requests.find(request=>request.id===item.id);return <article key={item.id}><img src={getSafeProductImageUrl(full?.product?.imageUrl || item.product?.imageUrl)} onError={handleProductImageError} alt={item.product?.title || 'Sản phẩm'}/><div><strong>{item.product?.title || 'Sản phẩm mẫu'}</strong><span>#{item.id.slice(0,8).toUpperCase()} · {item.product?.store?.name || full?.product?.store?.name}</span><p>{"Hạn nộp"}: {item.deadlineAt ? new Date(item.deadlineAt).toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}) : 'Chưa xác lập'}</p></div>{full && <button type="button" onClick={()=>{setBlockedEntry(null);setSelectedHistoryRequest(full);}}>{"Lịch sử"}</button>}</article>;}) : <p>{"Chưa có đơn mẫu liên kết"}</p>}</div>
      </Modal>}
      {deliveryRequest && <Modal isOpen onClose={() => setDeliveryRequest(null)} title="Giao nhận & cam kết" subtitle={deliveryRequest.product?.title || 'Hàng mẫu'} maxWidth="2xl" stickyHeader className="sample-delivery-modal">
        <section className="sample-delivery-recipient"><h3>Người nhận</h3><dl><dt>Họ tên</dt><dd>{deliveryRequest.recipientName || 'Chưa có thông tin'}</dd><dt>Điện thoại</dt><dd>{deliveryRequest.recipientPhone || 'Chưa có thông tin'}</dd><dt>Địa chỉ</dt><dd>{deliveryRequest.shippingAddress || 'Chưa cung cấp địa chỉ'}</dd></dl></section>
        <section className="sample-delivery-tracking"><h3>Vận đơn {deliveryRequest.carrier || ''}</h3><div><span>{deliveryRequest.trackingNumber || 'Chưa có vận đơn'}</span>{deliveryRequest.trackingNumber && <button type="button" onClick={() => copyToClipboard(deliveryRequest.trackingNumber,'mã vận đơn')}><Copy size={14}/>Sao chép</button>}</div></section>
        <section className="sample-delivery-channel"><h3>Kênh cam kết</h3>{deliveryRequest.socialChannelNameSnapshot || deliveryRequest.socialChannel?.channelName ? <><strong>{getPlatformBadge(deliveryRequest.socialPlatformSnapshot || deliveryRequest.socialChannel?.platformName).name} · {deliveryRequest.socialChannelNameSnapshot || deliveryRequest.socialChannel?.channelName}</strong><p>{Number(deliveryRequest.socialFollowerSnapshot ?? deliveryRequest.socialChannel?.followerCount ?? 0).toLocaleString('vi-VN')} người theo dõi</p></> : <p>Chưa có thông tin kênh</p>}</section>
        <div className="sample-delivery-dates">{[{label:'Ngày tạo',value:deliveryRequest.createdAt},{label:'Hạn nộp video',value:deliveryRequest.revisionDeadlineAt && ['REVISION_REQUIRED','OVERDUE'].includes(deliveryRequest.status) ? deliveryRequest.revisionDeadlineAt : deliveryRequest.deadlineAt}].map(({label,value})=><section key={label}><h3>{label}</h3>{value ? <><strong>{new Date(value).toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})}</strong><p>{new Date(value).toLocaleTimeString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit'})}</p></> : <p>Chưa xác lập</p>}</section>)}</div>
      </Modal>}

      {/* RESOLUTION MODAL (GIA HẠN / MIỄN NGHĨA VỤ / GỬI BÙ) */}
      {resolution && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={submitResolution}
            className="sample-resolution-modal w-full max-w-lg space-y-4 rounded-2xl border border-[#EAE4D7] bg-white p-6 shadow-2xl text-left animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE4D7]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] flex items-center justify-center shrink-0 text-[#B88E4F]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-[#1A1612] m-0">{resolutionTitle}</h2>
                  <p className="text-xs text-[#7D715E] mt-0.5 m-0">
                    {resolution.action === 'CANCEL_OBLIGATION' ? 'Quyết định được lưu vào nhật ký và thông báo cho KOL.' : 'Quyết định can thiệp sẽ được lưu vết kiểm toán.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResolution(null)}
                disabled={saving}
                aria-label="Đóng cửa sổ xử lý yêu cầu"
                className="p-1 rounded-lg text-[#7D715E] hover:bg-[#FAF8F5]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <dl className="sample-resolution-context">
              <div><dt>Sản phẩm</dt><dd>{resolution.request.product?.title || 'Chưa có thông tin'}</dd></div>
              <div><dt>KOL tiếp thị</dt><dd>{resolution.request.collaborator?.fullName}<small>{resolution.request.collaborator?.email}</small></dd></div>
              <div><dt>Gian hàng</dt><dd>{resolution.request.product?.store?.name || 'Chưa có thông tin'}</dd></div>
            </dl>
            {(resolution.action === 'BLOCK_SAMPLE_REQUESTS' || resolution.action === 'DISMISS_REPORT') && <div className="sample-waiver-summary">
              <div><span>Yêu cầu mẫu</span><strong>#{resolution.request.id.slice(0, 8).toUpperCase()}</strong></div>
              <div><span>Trạng thái</span><strong>{STATUS_CONFIGS[resolution.request.status]?.label || resolution.request.status}</strong></div>
              {(resolution.request.revisionDeadlineAt || resolution.request.deadlineAt) && <div><span>Hạn video</span><strong>{new Date(resolution.request.revisionDeadlineAt || resolution.request.deadlineAt).toLocaleString('vi-VN', { timeZone:'Asia/Ho_Chi_Minh' })}</strong></div>}
              {getPendingSampleReport(resolution.request) && <p><span><strong>Báo cáo từ Shop:</strong> {getPendingSampleReport(resolution.request)?.details?.reason}</span></p>}
              <p><ShieldAlert size={15} /><span>{resolution.action === 'BLOCK_SAMPLE_REQUESTS' ? 'KOL sẽ không thể xin hoặc được cấp mẫu mới trên toàn hệ thống. KOL vẫn được nộp video cho các yêu cầu hiện có. Chỉ Admin được mở khóa.' : 'Báo cáo được đóng và quyền nhận mẫu của KOL giữ nguyên. Lý do quyết định được gửi cho Shop và KOL.'}</span></p>
            </div>}
            {resolution.action === 'CANCEL_OBLIGATION' && (
              <div className="sample-waiver-summary">
                <div><span>Yêu cầu mẫu</span><strong title={resolution.request.id}>#{resolution.request.id.slice(0, 8).toUpperCase()}</strong></div>
                <div><span>Trạng thái hiện tại</span><strong>{STATUS_CONFIGS[resolution.request.status]?.label || resolution.request.status}</strong></div>
                {(resolution.request.revisionDeadlineAt || resolution.request.deadlineAt) && <div><span>Hạn nộp hiện tại</span><strong>{new Date(resolution.request.status === 'REVISION_REQUIRED' ? resolution.request.revisionDeadlineAt || resolution.request.deadlineAt : resolution.request.deadlineAt || resolution.request.revisionDeadlineAt).toLocaleDateString('vi-VN', { timeZone:'Asia/Ho_Chi_Minh' })}</strong></div>}
                <p><ShieldCheck size={15} aria-hidden="true" /><span>Sau khi lưu, yêu cầu chuyển sang <strong>Đã hủy</strong> và KOL được miễn nộp video cho yêu cầu này.</span></p>
              </div>
            )}

            {resolution.action === 'EXTEND_DEADLINE' && (
              <div>
                <label className="block text-xs font-bold text-[#1A1612] mb-1">
                  Thời hạn nộp video mới <span className="text-[#DC2626]">*</span>
                </label>
                <DateTimePicker
                  compact
                  mode="date"
                  minDateTime={localDateAfter(1)}
                  value={deadlineDate}
                  onChange={setDeadlineDate}
                  required
                  popoverTitle="Chọn hạn nộp video"
                  inlinePopoverRef={deadlineCalendarRef}
                  className="sample-deadline-picker"
                />
                <div ref={deadlineCalendarRef} className="sample-deadline-calendar" />
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
              <span className="sample-resolution-counter">{reason.length}/500 ký tự</span>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-[#EAE4D7]">
              <button
                type="button"
                onClick={() => setResolution(null)}
                disabled={saving}
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
                  <span>{resolution.action === 'BLOCK_SAMPLE_REQUESTS' ? 'Xác nhận khóa quyền nhận mẫu' : resolution.action === 'CANCEL_OBLIGATION' ? 'Xác nhận miễn nộp video' : 'Lưu quyết định'}</span>
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
                <div className="w-10 h-10 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] flex items-center justify-center shrink-0 text-[#059669]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-[#1A1612] m-0">Mở khóa quyền nhận mẫu</h2>
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
                className="rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] px-5 py-2 text-xs font-bold text-[#231D15] disabled:opacity-50 transition shadow-xs flex items-center gap-1.5"
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

      {selectedHistoryRequest && <SampleHistoryDialog request={selectedHistoryRequest} onClose={() => setSelectedHistoryRequest(null)}/>}
    </div>
  );
}
