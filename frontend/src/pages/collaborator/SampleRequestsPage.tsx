import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package,
  Truck,
  Copy,
  ExternalLink,
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  MessageSquare,
  Store,
  X,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Send,
  Ban,
  Video,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';
import { useWorkspaceResource } from '@/hooks/useWorkspaceResource';
import type { SampleRequest, SampleRequestStatus } from '@/types/samples.types';
import {
  canSubmitSampleVideo,
  sampleDeadline,
  sampleNeedsAttention,
} from '@/utils/sample-workspace';

const formatDate = (value?: string | number | null) =>
  value == null
    ? 'Chưa cập nhật'
    : new Date(value).toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        dateStyle: 'short',
        timeStyle: 'short',
      });

function formatDeadlineDisplay(deadlineMs: number | null) {
  if (!deadlineMs) return { text: 'Chưa có hạn chót', isUrgent: false, isOverdue: false };
  const diff = deadlineMs - Date.now();
  const days = Math.ceil(diff / 86400000);
  const formattedDate = new Date(deadlineMs).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  if (diff < 0) {
    return { text: `Quá hạn (${formattedDate})`, isUrgent: true, isOverdue: true };
  }
  if (days <= 1) {
    return { text: `Hôm nay (${formattedDate})`, isUrgent: true, isOverdue: false };
  }
  if (days <= 3) {
    return { text: `Còn ${days} ngày (${formattedDate})`, isUrgent: true, isOverdue: false };
  }
  return { text: `Hạn: ${formattedDate} (còn ${days} ngày)`, isUrgent: false, isOverdue: false };
}

function getStatusBadge(status: SampleRequestStatus) {
  switch (status) {
    case 'PENDING':
      return { bg: 'bg-[#FBF5EB]', border: 'border-[#EEDFC6]', text: 'text-[#8C6226]', label: 'Chờ Shop duyệt' };
    case 'APPROVED':
      return { bg: 'bg-[#F3EFE6]', border: 'border-[#EAE4D7]', text: 'text-[#1A1612]', label: 'Đã duyệt mẫu' };
    case 'SHIPPED':
      return { bg: 'bg-[#EFF6FF]', border: 'border-[#BFDBFE]', text: 'text-[#1D4ED8]', label: 'Đang giao GHN' };
    case 'RECEIVED':
      return { bg: 'bg-[#FEF3C7]', border: 'border-[#FDE68A]', text: 'text-[#92400E]', label: 'Cần nộp video' };
    case 'VIDEO_SUBMITTED':
      return { bg: 'bg-[#F5F3FF]', border: 'border-[#DDD6FE]', text: 'text-[#6D28D9]', label: 'Chờ nghiệm thu' };
    case 'REVISION_REQUIRED':
      return { bg: 'bg-[#FEF2F2]', border: 'border-[#FECACA]', text: 'text-[#DC2626]', label: 'Cần sửa video' };
    case 'COMPLETED':
      return { bg: 'bg-[#ECFDF5]', border: 'border-[#A7F3D0]', text: 'text-[#065F46]', label: 'Đã hoàn thành' };
    case 'OVERDUE':
      return { bg: 'bg-[#FEF2F2]', border: 'border-[#FECACA]', text: 'text-[#DC2626]', label: 'Quá hạn nộp' };
    case 'CANCELLED':
      return { bg: 'bg-[#F3F4F6]', border: 'border-[#E5E7EB]', text: 'text-[#6B7280]', label: 'Đã hủy' };
    case 'DELIVERY_ISSUE':
      return { bg: 'bg-[#FEF2F2]', border: 'border-[#FECACA]', text: 'text-[#DC2626]', label: 'Sự cố giao nhận' };
    case 'REJECTED':
      return { bg: 'bg-[#FEF2F2]', border: 'border-[#FECACA]', text: 'text-[#991B1B]', label: 'Bị từ chối' };
    default:
      return { bg: 'bg-[#F3EFE6]', border: 'border-[#EAE4D7]', text: 'text-[#7D715E]', label: status };
  }
}

type FilterType = 'ALL' | 'ATTENTION' | 'SHIPPED' | 'PENDING' | 'COMPLETED' | 'CLOSED';
type ActionType = 'video' | 'issue' | 'cancel';

export interface SampleRequestsPageProps {
  embedded?: boolean;
}

export default function SampleRequestsPage({ embedded = false }: SampleRequestsPageProps) {
  const navigate = useNavigate();
  const { data, loading, error, refresh, updatedAt } = useWorkspaceResource<SampleRequest[]>('/sample-requests/my');
  const requests = data || [];

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');

  // Modal actions
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<ActionType>('video');
  const [selectedItem, setSelectedItem] = useState<SampleRequest | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [issueReason, setIssueReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  // Expanded histories
  const [expandedHistories, setExpandedHistories] = useState<Record<string, boolean>>({});

  const toggleHistory = (id: string) => {
    setExpandedHistories((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const total = requests.length;
    const shipped = requests.filter((r) => r.status === 'SHIPPED').length;
    const attention = requests.filter((r) => sampleNeedsAttention(r)).length;
    const completed = requests.filter((r) => r.status === 'COMPLETED').length;
    const pending = requests.filter((r) => r.status === 'PENDING').length;
    const closed = requests.filter((r) => ['REJECTED', 'CANCELLED'].includes(r.status)).length;
    return { total, shipped, attention, completed, pending, closed };
  }, [requests]);

  // Filtered Items
  const filteredRequests = useMemo(() => {
    return requests
      .filter((item) => {
        if (activeFilter === 'ATTENTION' && !sampleNeedsAttention(item)) return false;
        if (activeFilter === 'SHIPPED' && item.status !== 'SHIPPED') return false;
        if (activeFilter === 'PENDING' && item.status !== 'PENDING') return false;
        if (activeFilter === 'COMPLETED' && item.status !== 'COMPLETED') return false;
        if (activeFilter === 'CLOSED' && !['REJECTED', 'CANCELLED'].includes(item.status)) return false;

        if (search.trim()) {
          const q = search.trim().toLowerCase();
          const matchTitle = item.product?.title?.toLowerCase().includes(q);
          const matchStore = item.product?.store?.name?.toLowerCase().includes(q);
          const matchTracking = item.trackingNumber?.toLowerCase().includes(q);
          if (!matchTitle && !matchStore && !matchTracking) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const aAtt = sampleNeedsAttention(a) ? 1 : 0;
        const bAtt = sampleNeedsAttention(b) ? 1 : 0;
        if (bAtt !== aAtt) return bAtt - aAtt;
        const dlA = sampleDeadline(a) ?? Infinity;
        const dlB = sampleDeadline(b) ?? Infinity;
        return dlA - dlB;
      });
  }, [requests, activeFilter, search]);

  const openActionModal = (item: SampleRequest, action: ActionType) => {
    setSelectedItem(item);
    setModalAction(action);
    setVideoTitle(item.videoTitle || `Review ${item.product.title}`);
    setVideoUrl(item.videoUrl || '');
    setIssueReason('');
    setActionError('');
    setModalOpen(true);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || submitting) return;

    setSubmitting(true);
    setActionError('');

    try {
      if (modalAction === 'video') {
        if (!videoUrl.trim() || !/^https:\/\//i.test(videoUrl.trim())) {
          throw new Error('Vui lòng nhập đường dẫn video hợp lệ (bắt đầu bằng https://)');
        }
        await api.post(`/sample-requests/${selectedItem.id}/video`, {
          title: videoTitle.trim(),
          videoUrl: videoUrl.trim(),
        });
        toast.success('Đã nộp video review thành công. Shop sẽ tiến hành nghiệm thu.');
      } else if (modalAction === 'issue') {
        if (!issueReason.trim()) {
          throw new Error('Vui lòng mô tả chi tiết sự cố gặp phải');
        }
        await api.patch(`/sample-requests/${selectedItem.id}/delivery-issue`, {
          reason: issueReason.trim(),
        });
        toast.success('Đã gửi báo cáo sự cố giao hàng đến Shop và Sàn.');
      } else if (modalAction === 'cancel') {
        await api.patch(`/sample-requests/${selectedItem.id}/cancel`, {});
        toast.success('Đã hủy yêu cầu xin mẫu thành công.');
      }

      setModalOpen(false);
      refresh();
    } catch (err: any) {
      setActionError(
        err?.response?.data?.message || err?.message || 'Có lỗi xảy ra, vui lòng thử lại.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyTracking = (trackingNumber: string) => {
    navigator.clipboard
      .writeText(trackingNumber)
      .then(() => toast.success(`Đã sao chép mã vận đơn: ${trackingNumber}`))
      .catch(() => toast.error('Không thể sao chép tự động. Hãy bôi đen mã để sao chép.'));
  };

  return (
    <div className={`w-full min-w-0 ${embedded ? '' : 'mx-auto max-w-[1400px] p-4 sm:p-6 bg-[#FAF8F5]'}`}>
      {/* Standalone Header (only when not embedded) */}
      {!embedded && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#EAE4D7] bg-white p-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#B88E4F]">
              <Package className="h-4 w-4" />
              <span>SCANMS · Vận hành mẫu thử KOL</span>
            </div>
            <h1 className="mt-1 text-xl font-extrabold text-[#1A1612]">Tiến độ Mẫu Thử & Video Review</h1>
            <p className="mt-0.5 text-xs text-[#7D715E]">
              Theo dõi vận đơn GHN, hạn chót nộp video và kết quả nghiệm thu từ tất cả các gian hàng đối tác.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-[#EAE4D7] bg-white px-3.5 py-2 text-xs font-bold text-[#1A1612] hover:bg-[#F3EFE6] transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
            <Link
              to="/collaborator/collaboration?tab=samples"
              className="inline-flex items-center gap-2 rounded-xl bg-[#C59B58] px-4 py-2 text-xs font-bold text-white hover:bg-[#B88E4F] transition-colors shadow-sm"
            >
              <Package className="h-3.5 w-3.5" />
              <span>Xin mẫu mới</span>
            </Link>
          </div>
        </div>
      )}

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-4">
        <div className="flex flex-col justify-between rounded-2xl border border-[#EAE4D7] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#7D715E]">Tổng đơn mẫu</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FBF5EB] text-[#B88E4F]">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-[#1A1612]">{stats.total}</span>
            <p className="mt-0.5 text-[11px] text-[#7D715E]">Từ tất cả gian hàng</p>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-[#EAE4D7] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#7D715E]">Đang giao GHN</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#1D4ED8]">
              <Truck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-[#1D4ED8]">{stats.shipped}</span>
            <p className="mt-0.5 text-[11px] text-[#7D715E]">Đang vận chuyển</p>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-[#EAE4D7] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#7D715E]">Cần nộp / Sửa video</span>
            <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${stats.attention > 0 ? 'bg-[#FEF2F2] text-[#DC2626]' : 'bg-[#FBF5EB] text-[#B88E4F]'}`}>
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-black ${stats.attention > 0 ? 'text-[#DC2626]' : 'text-[#1A1612]'}`}>
              {stats.attention}
            </span>
            {stats.attention > 0 && (
              <span className="rounded-full bg-[#FEF2F2] px-2 py-0.5 text-[10px] font-bold text-[#DC2626] border border-[#FECACA]">
                Cần xử lý
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-[#7D715E]">Hạn chót hoặc yêu cầu sửa</p>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-[#EAE4D7] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#7D715E]">Đã hoàn thành</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#ECFDF5] text-[#059669]">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-[#059669]">{stats.completed}</span>
            <p className="mt-0.5 text-[11px] text-[#7D715E]">Video đã nghiệm thu</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-[#EAE4D7] bg-white p-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        {/* Segmented Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL' as FilterType, label: 'Tất cả', count: stats.total },
            { id: 'ATTENTION' as FilterType, label: 'Cần xử lý', count: stats.attention, alert: stats.attention > 0 },
            { id: 'SHIPPED' as FilterType, label: 'Đang giao', count: stats.shipped },
            { id: 'PENDING' as FilterType, label: 'Chờ duyệt', count: stats.pending },
            { id: 'COMPLETED' as FilterType, label: 'Hoàn thành', count: stats.completed },
            { id: 'CLOSED' as FilterType, label: 'Đã đóng', count: stats.closed },
          ].map((pill) => {
            const active = activeFilter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setActiveFilter(pill.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#C59B58] text-white shadow-sm'
                    : 'bg-[#FAF8F5] text-[#7D715E] hover:bg-[#F3EFE6] hover:text-[#1A1612]'
                }`}
              >
                <span>{pill.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    active
                      ? 'bg-white/20 text-white'
                      : pill.alert
                        ? 'bg-[#FEF2F2] text-[#DC2626]'
                        : 'bg-[#EAE4D7] text-[#1A1612]'
                  }`}
                >
                  {pill.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input & Action Buttons */}
        <div className="flex items-center gap-2">
          <div className="relative min-w-[200px] flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7D715E] h-3.5 w-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm sản phẩm, shop, GHN..."
              className="w-full rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] py-2 pl-9 pr-3 text-xs text-[#1A1612] placeholder-[#7D715E] focus:border-[#C59B58] focus:bg-white focus:outline-none transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7D715E] hover:text-[#1A1612]"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {embedded && (
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              title="Làm mới danh sách"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#EAE4D7] bg-white text-[#1A1612] hover:bg-[#F3EFE6] transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content List / States */}
      {error && (
        <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-6 text-center text-xs text-[#DC2626]">
          <AlertCircle className="mx-auto mb-2 h-6 w-6 text-[#DC2626]" />
          <p className="font-bold">Không thể tải danh sách mẫu thử</p>
          <p className="mt-1 text-[#7D715E]">{error}</p>
          <button
            type="button"
            onClick={refresh}
            className="mt-3 rounded-xl bg-[#DC2626] px-4 py-2 font-bold text-white hover:bg-[#B91C1C] transition-colors"
          >
            Thử lại
          </button>
        </div>
      )}

      {loading && !data && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-[#EAE4D7] bg-white p-5">
              <div className="flex gap-3">
                <div className="h-16 w-16 rounded-xl bg-[#F3EFE6]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 rounded bg-[#F3EFE6]" />
                  <div className="h-4 w-48 rounded bg-[#F3EFE6]" />
                  <div className="h-3 w-32 rounded bg-[#F3EFE6]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && filteredRequests.length === 0 && (
        <div className="rounded-2xl border border-[#EAE4D7] bg-white p-10 text-center shadow-sm">
          <Package className="mx-auto h-12 w-12 text-[#B88E4F] opacity-60" />
          <h3 className="mt-3 text-sm font-bold text-[#1A1612]">Không tìm thấy yêu cầu mẫu thử phù hợp</h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-[#7D715E]">
            {search || activeFilter !== 'ALL'
              ? 'Thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm để xem các yêu cầu khác.'
              : 'Bạn chưa có yêu cầu nhận sản phẩm mẫu nào. Hãy ghé trang Hợp tác & Nhận mẫu Shop để đăng ký nhận mẫu miễn phí.'}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            {(search || activeFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setActiveFilter('ALL');
                }}
                className="rounded-xl border border-[#EAE4D7] bg-white px-4 py-2 text-xs font-bold text-[#1A1612] hover:bg-[#F3EFE6] transition-colors"
              >
                Xóa bộ lọc
              </button>
            )}
            <Link
              to="/collaborator/collaboration?tab=samples"
              className="inline-flex items-center gap-2 rounded-xl bg-[#C59B58] px-4 py-2 text-xs font-bold text-white hover:bg-[#B88E4F] transition-colors shadow-sm"
            >
              <Package className="h-3.5 w-3.5" />
              <span>Khám phá sản phẩm mẫu</span>
            </Link>
          </div>
        </div>
      )}

      {!loading && !error && filteredRequests.length > 0 && (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredRequests.map((item) => {
            const statusConfig = getStatusBadge(item.status);
            const deadlineMs = sampleDeadline(item);
            const deadlineDisplay = formatDeadlineDisplay(deadlineMs);
            const needsAttention = sampleNeedsAttention(item);
            const isHistoryOpen = Boolean(expandedHistories[item.id]);

            return (
              <article
                key={item.id}
                className={`flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md ${
                  needsAttention ? 'border-[#C59B58] ring-1 ring-[#C59B58]/30' : 'border-[#EAE4D7]'
                }`}
              >
                <div>
                  {/* Top Header: Shop & Status */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#FAF8F5]">
                    <div className="flex items-center gap-1.5 text-xs text-[#7D715E] min-w-0">
                      <Store className="h-3.5 w-3.5 shrink-0 text-[#B88E4F]" />
                      <span className="font-semibold text-[#1A1612] truncate">
                        {item.product?.store?.name || 'Gian hàng đối tác'}
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusConfig.bg} ${statusConfig.border} ${statusConfig.text}`}
                    >
                      {statusConfig.label}
                    </span>
                  </div>

                  {/* Product Details */}
                  <div className="mt-3.5 flex items-start gap-3.5">
                    {item.product?.imageUrl ? (
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.title}
                        loading="lazy"
                        className="h-16 w-16 shrink-0 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7] object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F]">
                        <Package className="h-7 w-7" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-[#1A1612] leading-snug line-clamp-2">
                        {item.product?.title || 'Sản phẩm mẫu'}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        {item.product?.price && (
                          <span className="font-bold text-[#B88E4F]">
                            {item.product.price.toLocaleString('vi-VN')} ₫
                          </span>
                        )}
                        {item.product?.sku && (
                          <span className="rounded bg-[#FAF8F5] px-1.5 py-0.5 text-[10px] text-[#7D715E] border border-[#EAE4D7]">
                            SKU: {item.product.sku}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Logistics & Deadline Bar */}
                  <div className="mt-3.5 grid grid-cols-2 gap-2.5 rounded-xl bg-[#FAF8F5] p-3 text-xs border border-[#EAE4D7]/60">
                    <div>
                      <span className="text-[11px] text-[#7D715E]">Ngày gửi yêu cầu:</span>
                      <p className="mt-0.5 font-semibold text-[#1A1612]">{formatDate(item.createdAt)}</p>
                    </div>

                    <div>
                      <span className="text-[11px] text-[#7D715E]">
                        {item.revisionDeadlineAt ? 'Hạn sửa video:' : 'Hạn nộp video:'}
                      </span>
                      <p
                        className={`mt-0.5 font-bold ${
                          deadlineDisplay.isUrgent ? 'text-[#DC2626]' : 'text-[#1A1612]'
                        }`}
                      >
                        {deadlineDisplay.text}
                      </p>
                    </div>
                  </div>

                  {/* GHN Shipping Code */}
                  {item.trackingNumber && (
                    <div className="mt-3 flex items-center justify-between rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2 text-xs text-[#1D4ED8]">
                      <div className="flex items-center gap-2 min-w-0 truncate">
                        <Truck className="h-4 w-4 shrink-0" />
                        <span className="font-medium text-[#1E3A8A]">
                          {item.carrier || 'GHN Express'}:{' '}
                          <strong className="font-bold tracking-wider">{item.trackingNumber}</strong>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyTracking(item.trackingNumber!)}
                        className="inline-flex items-center gap-1 rounded-lg bg-white/80 px-2 py-1 text-[11px] font-bold text-[#1D4ED8] hover:bg-white transition-colors"
                        title="Sao chép mã vận đơn"
                      >
                        <Copy className="h-3 w-3" />
                        <span>Sao chép</span>
                      </button>
                    </div>
                  )}

                  {/* Rejection / Revision Alert */}
                  {(item.videoRejectionReason || item.rejectedReason) && (
                    <div className="mt-3 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3 text-xs text-[#795A2D]">
                      <div className="flex items-center gap-1.5 font-bold text-[#8C6226]">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>Phản hồi kiểm duyệt từ Shop:</span>
                      </div>
                      <p className="mt-1 leading-relaxed text-[#1A1612]">
                        {item.videoRejectionReason || item.rejectedReason}
                      </p>
                    </div>
                  )}

                  {/* Video review preview if submitted */}
                  {item.videoUrl && (
                    <div className="mt-3 flex items-center justify-between rounded-xl border border-[#EAE4D7] bg-white p-2.5 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <Video className="h-4 w-4 shrink-0 text-[#B88E4F]" />
                        <span className="font-medium text-[#1A1612] truncate">
                          {item.videoTitle || 'Video review đã nộp'}
                        </span>
                      </div>
                      <a
                        href={item.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#B88E4F] hover:underline shrink-0"
                      >
                        <span>Xem video</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="mt-4 pt-3 border-t border-[#FAF8F5]">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Primary CTA: Submit / Revise Video */}
                    {canSubmitSampleVideo(item.status) && (
                      <button
                        type="button"
                        onClick={() => openActionModal(item, 'video')}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#C59B58] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#B88E4F] transition-colors shadow-sm cursor-pointer"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>
                          {item.status === 'REVISION_REQUIRED' ? 'Nộp lại video sửa đổi' : 'Nộp video review'}
                        </span>
                      </button>
                    )}

                    {/* Delivery Issue Button */}
                    {item.status === 'SHIPPED' && (
                      <button
                        type="button"
                        onClick={() => openActionModal(item, 'issue')}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#EAE4D7] bg-white px-3 py-2 text-xs font-bold text-[#7D715E] hover:border-[#DC2626] hover:text-[#DC2626] transition-colors cursor-pointer"
                      >
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>Báo sự cố giao hàng</span>
                      </button>
                    )}

                    {/* Cancel Pending Request */}
                    {item.status === 'PENDING' && (
                      <button
                        type="button"
                        onClick={() => openActionModal(item, 'cancel')}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#EAE4D7] bg-white px-3 py-2 text-xs font-bold text-[#7D715E] hover:border-[#DC2626] hover:text-[#DC2626] transition-colors cursor-pointer"
                      >
                        <Ban className="h-3.5 w-3.5" />
                        <span>Hủy yêu cầu</span>
                      </button>
                    )}

                    {/* Chat with Shop Button */}
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/collaborator/collaboration?shop=${item.product?.storeId}&tab=chat`)
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#EAE4D7] bg-white px-3 py-2 text-xs font-bold text-[#1A1612] hover:bg-[#F3EFE6] transition-colors cursor-pointer"
                      title="Nhắn tin với Shop về đơn mẫu này"
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-[#B88E4F]" />
                      <span>Nhắn tin Shop</span>
                    </button>
                  </div>

                  {/* Collapsible History Events */}
                  {Boolean(item.events?.length) && (
                    <div className="mt-3 pt-2">
                      <button
                        type="button"
                        onClick={() => toggleHistory(item.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#7D715E] hover:text-[#1A1612] transition-colors"
                      >
                        <span>Lịch sử xử lý ({item.events!.length})</span>
                        {isHistoryOpen ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </button>

                      {isHistoryOpen && (
                        <ol className="mt-2 space-y-1.5 rounded-xl bg-[#FAF8F5] p-3 text-[11px] text-[#7D715E] border border-[#EAE4D7]/50">
                          {item.events!.map((event) => (
                            <li key={event.id} className="flex items-start gap-2">
                              <span className="font-mono text-[#B88E4F] shrink-0">
                                {formatDate(event.createdAt)}
                              </span>
                              <span className="font-medium text-[#1A1612] break-words">
                                {event.action.replace(/^SAMPLE_/, '').replaceAll('_', ' ')}
                              </span>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Sync Footer */}
      {updatedAt && (
        <div className="mt-4 flex items-center justify-between text-[11px] text-[#7D715E] px-1">
          <span>Đã đồng bộ lúc: {formatDate(updatedAt.getTime())}</span>
          <span>
            Hiển thị {filteredRequests.length} / {requests.length} yêu cầu
          </span>
        </div>
      )}

      {/* Action Modal (Submit Video / Report Issue / Cancel) */}
      {modalOpen && selectedItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in-50 duration-150"
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-[#EAE4D7] bg-white p-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#FAF8F5]">
              <div>
                <h3 className="text-base font-extrabold text-[#1A1612]">
                  {modalAction === 'video'
                    ? selectedItem.status === 'REVISION_REQUIRED'
                      ? 'Nộp lại video chỉnh sửa'
                      : 'Nộp video review sản phẩm'
                    : modalAction === 'issue'
                      ? 'Báo sự cố giao hàng GHN'
                      : 'Xác nhận hủy yêu cầu xin mẫu'}
                </h3>
                <p className="mt-0.5 text-xs text-[#7D715E] truncate max-w-sm">
                  {selectedItem.product?.title} · {selectedItem.product?.store?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => !submitting && setModalOpen(false)}
                disabled={submitting}
                className="rounded-xl p-1.5 text-[#7D715E] hover:bg-[#F3EFE6] hover:text-[#1A1612] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleModalSubmit} className="mt-4 space-y-4">
              {modalAction === 'video' && (
                <>
                  <div className="rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] p-3 text-xs text-[#795A2D]">
                    <div className="flex items-center gap-1.5 font-bold text-[#8C6226]">
                      <Video className="h-3.5 w-3.5" />
                      <span>Quy chuẩn nộp video review:</span>
                    </div>
                    <ul className="mt-1.5 space-y-1 list-disc pl-4 text-[11px] leading-relaxed">
                      <li>Đăng video công khai trên TikTok, YouTube, Facebook hoặc Reels.</li>
                      <li>Phải gắn kèm Smart Link hoặc Coupon độc quyền trong mô tả / bio.</li>
                      <li>Shop có thời hạn 48h để duyệt hoặc yêu cầu chỉnh sửa nếu chưa đúng cam kết.</li>
                    </ul>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1A1612]">
                      Tiêu đề video review <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={255}
                      value={videoTitle}
                      onChange={(e) => setVideoTitle(e.target.value)}
                      placeholder="Ví dụ: Đánh giá chi tiết serum Sora Skin sau 14 ngày..."
                      className="mt-1.5 w-full rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] p-2.5 text-xs text-[#1A1612] focus:border-[#C59B58] focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1A1612]">
                      Đường dẫn video công khai (HTTPS) <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="url"
                      required
                      pattern="https://.*"
                      maxLength={2000}
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://www.tiktok.com/@creator/video/..."
                      className="mt-1.5 w-full rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] p-2.5 text-xs text-[#1A1612] focus:border-[#C59B58] focus:bg-white focus:outline-none font-mono"
                    />
                  </div>
                </>
              )}

              {modalAction === 'issue' && (
                <div>
                  <label className="block text-xs font-bold text-[#1A1612]">
                    Mô tả sự cố giao nhận hàng <span className="text-[#DC2626]">*</span>
                  </label>
                  <p className="mt-0.5 text-[11px] text-[#7D715E]">
                    Ví dụ: Mã vận đơn báo giao thành công nhưng chưa nhận được, hàng bị móp méo hư hại, hoặc shipper giao nhầm sản phẩm.
                  </p>
                  <textarea
                    required
                    minLength={5}
                    maxLength={500}
                    rows={4}
                    value={issueReason}
                    onChange={(e) => setIssueReason(e.target.value)}
                    placeholder="Mô tả cụ thể sự cố để Shop và Sàn SCANMS hỗ trợ kiểm tra đối soát GHN..."
                    className="mt-2 w-full rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] p-3 text-xs text-[#1A1612] focus:border-[#C59B58] focus:bg-white focus:outline-none"
                  />
                </div>
              )}

              {modalAction === 'cancel' && (
                <div className="rounded-xl bg-[#FEF2F2] border border-[#FECACA] p-4 text-xs text-[#DC2626]">
                  <p className="font-bold">Lưu ý khi hủy yêu cầu xin mẫu:</p>
                  <p className="mt-1 text-[#7D715E] leading-relaxed">
                    Bạn chỉ có thể hủy các yêu cầu đang ở trạng thái <strong>Chờ Shop duyệt</strong>. Sau khi hủy, bạn vẫn có thể nộp lại yêu cầu xin mẫu nếu sản phẩm còn suất mẫu thử.
                  </p>
                </div>
              )}

              {actionError && (
                <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs text-[#DC2626]">
                  {actionError}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#FAF8F5]">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-[#EAE4D7] bg-white px-4 py-2 text-xs font-bold text-[#7D715E] hover:bg-[#F3EFE6] transition-colors"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#C59B58] px-5 py-2 text-xs font-bold text-white hover:bg-[#B88E4F] transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting && <RefreshCw className="h-3 w-3 animate-spin" />}
                  <span>{submitting ? 'Đang gửi...' : 'Xác nhận gửi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

