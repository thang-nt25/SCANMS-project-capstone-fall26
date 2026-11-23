import { ShopWorkspaceToolbar } from '../../components/affiliate/ShopWorkspaceToolbar';
import { handleProductImageError } from '@/utils/image-fallback.utils';
import { SampleRequestDetails } from '../../components/orders/SampleRequestDetails';
import { InviteKolModal } from '../../components/affiliate/InviteKolModal';
import { ShopPartnerDataTab, useShopPartnerTeam } from '../../components/affiliate/ShopPartnerDataTabs';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Package,
  Clock,
  Video,
  AlertTriangle,
  PackageCheck,
  Award,
  Handshake,
  Search,
  Truck,
  CheckCircle2,
  Check,
  X,
  Copy,
  BellRing,
  MessageSquare,
  RefreshCw,
  Eye,
} from 'lucide-react';
import api from '../../services/api';
import SampleDeadlineExtension from '../../components/affiliate/SampleDeadlineExtension';
import SampleViolationAction from '../../components/affiliate/SampleViolationAction';
import { SampleSandboxWaybills, SampleSandboxStatus, isSandboxShipment, sampleDisplayStatus } from '../../components/shipping/SampleGhnEnvironmentPicker';
import { SampleWaybillDialog } from '../../components/shipping/SampleWaybillDialog';
import { toast } from '../../utils/toast';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getSafeProductImageUrl } from '../../utils/marketplace.utils';
import { Select } from '../../components/ui/Select';

const otherSampleStatuses = [
  { value: 'SHIPPED', label: 'Đang giao' },
  { value: 'RECEIVED', label: 'Đã nhận' },
  { value: 'OVERDUE', label: 'Quá hạn' },
  { value: 'COMPLETED', label: 'Hoàn tất' },
] as const;

function recordedSampleFreight(charges: NonNullable<SampleRequestItem['shippingCharges']>) {
  const amounts = charges.flatMap(charge => {
    if (charge.environment === 'TEST' || charge.amount == null || String(charge.amount).trim() === '') return [];
    const amount = Number(charge.amount);
    return Number.isFinite(amount) && amount >= 0 ? [amount] : [];
  });
  return amounts.length ? amounts.reduce((sum, amount) => sum + amount, 0) : null;
}

export interface SampleRequestItem {
  id: string;
  status: string;
  createdAt: string;
  shippingAddress: string;
  recipientName?: string;
  recipientPhone?: string;
  socialPlatformSnapshot?: string;
  socialChannelNameSnapshot?: string;
  socialChannelUrlSnapshot?: string;
  socialFollowerSnapshot?: number;
  note?: string;
  carrier?: string;
  trackingCode?: string;
  shippingCharges?: Array<{ amount: string | number | null; trackingNumber: string; status: string; payer: string; codAmount: number; environment?: string }>;
  reviewVideoUrl?: string;
  videoTitle?: string;
  videoSubmittedAt?: string;
  sampleRequestsBlockedAt?: string | null;
  deadlineAt?: string;
  revisionDeadlineAt?: string;
  expectedVideoAt?: string;
  receivedAt?: string;
  shippedAt?: string;
  rejectedReason?: string;
  videoRejectionReason?: string;
  socialChannel?: { platformName: string; channelName?: string; channelUrl: string; followerCount: number } | null;
  collaboratorMetrics?: { kycStatus: string; totalFollowers: number; totalOrdersReferred: number; tierName?: string } | null;
  videoAssets?: Array<{ id: string; title: string; urlOrContent: string; status: string; rejectionReason?: string | null }>;
  events?: Array<{ id: string; action: string; createdAt: string; details?: any }>;
  product: {
    id: string;
    title: string;
    thumbnail?: string;
    price: number;
    commissionRate?: number;
  };
  collaboratorId: string;
  collaboratorInfo?: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string;
    tier?: string;
  };
  productVariantName?: string;
}

function KolAvatar({
  src,
  name,
  className = 'w-9 h-9',
}: {
  src?: string;
  name: string;
  id?: string;
  className?: string;
}) {
  const [failed,setFailed] = useState(false);
  return <span className={`${className} inline-flex items-center justify-center overflow-hidden rounded-xl bg-[#F3EFE6] text-[#79592C] font-semibold border border-[#EAE4D7] shrink-0`}>
    {src && !failed ? <img src={src} alt={name} className="w-full h-full object-cover" loading="lazy" onError={() => setFailed(true)} /> : name.trim().charAt(0).toUpperCase()}
  </span>;
}

export default function ShopSampleManagementTab({ refreshKey = 0, showRefreshButton = true, onLoadingChange }: {
  refreshKey?: number;
  showRefreshButton?: boolean;
  onLoadingChange?: (loading: boolean) => void;
} = {}) {
  const navigate = useNavigate();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchParams] = useSearchParams();
  const [detailSampleId, setDetailSampleId] = useState<string | null>(null);
  const closeSampleDetails = useCallback(() => setDetailSampleId(null), []);
  const [loading, setLoading] = useState(true);
  useEffect(() => { onLoadingChange?.(loading); }, [loading, onLoadingChange]);
  const [samples, setSamples] = useState<SampleRequestItem[]>([]);
  const [sampleLoadError,setSampleLoadError] = useState('');
  const partnerTeam = useShopPartnerTeam();
  const sampleLoadSequence = useRef(0);
  const [storeTab, setStoreTab] = useState<'SAMPLES_QUEUE' | 'LEADERBOARD' | 'DEALS'>(() => searchParams.get('section') === 'deals' ? 'DEALS' : 'SAMPLES_QUEUE');
  const [selectedSampleIds, setSelectedSampleIds] = useState<string[]>([]);
  const [bulkApproving, setBulkApproving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'SHIPPED' | 'RECEIVED' | 'VIDEO_SUBMITTED' | 'OVERDUE' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [samplePage, setSamplePage] = useState(1);
  useEffect(() => { setSamplePage(1); }, [statusFilter, searchQuery]);
  const [remindedSamples, setRemindedSamples] = useState<Record<string, boolean>>({});
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);

  // Tracking modal state
  const [trackingModalItem, setTrackingModalItem] = useState<SampleRequestItem | null>(null);
  const [deadlineNow, setDeadlineNow] = useState(() => Date.now());
  useEffect(() => {
    const update = () => setDeadlineNow(Date.now());
    const timer = window.setInterval(update, 60_000);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  const [sampleShippingError, setSampleShippingError] = useState('');
  const [sampleGhnEnvironment, setSampleGhnEnvironment] = useState<'LIVE' | 'TEST'>('LIVE');
  useEffect(() => { setSampleShippingError(''); }, [trackingModalItem?.id]);
  const [carrierInput, setCarrierInput] = useState('GHN');
  const [trackingCodeInput, setTrackingCodeInput] = useState('');
  const [isSubmittingTracking, setIsSubmittingTracking] = useState(false);

  // Load data from Backend
  const loadData = useCallback(async () => {
    const sequence = ++sampleLoadSequence.current;
    setLoading(true);
    setSampleLoadError('');
    try {
      const res: any = await api.get('/sample-requests/shop', { headers: { 'x-skip-cache': 'true' } });
      const data = res?.data || res;
      if (sequence !== sampleLoadSequence.current) return;
      if (!Array.isArray(data)) throw new Error('Không đọc được danh sách hàng mẫu.');
      if (Array.isArray(data)) {
        const transformed: SampleRequestItem[] = data.map((item: any) => {
          const kolId = item.collaboratorId || item.collaborator?.id || 'kol-unknown';
          return {
            id: item.id,
            collaboratorId: kolId,
            status: item.status,
            createdAt: item.createdAt,
            shippingAddress: item.shippingAddress,
            recipientName: item.recipientName,
            recipientPhone: item.recipientPhone,
            socialPlatformSnapshot: item.socialPlatformSnapshot,
            socialChannelNameSnapshot: item.socialChannelNameSnapshot,
            socialChannelUrlSnapshot: item.socialChannelUrlSnapshot,
            socialFollowerSnapshot: item.socialFollowerSnapshot,
            note: item.contentType,
            carrier: item.carrier,
            trackingCode: item.trackingNumber,
            shippingCharges: item.shippingCharges || [],
            reviewVideoUrl: item.videoUrl,
            videoTitle: item.videoTitle,
            videoSubmittedAt: item.videoSubmittedAt,
            sampleRequestsBlockedAt: item.collaborator?.collaboratorProfile?.sampleRequestsBlockedAt,
            deadlineAt: item.deadlineAt,
            revisionDeadlineAt: item.revisionDeadlineAt,
            expectedVideoAt: item.expectedVideoAt,
            receivedAt: item.receivedAt,
            shippedAt: item.shippedAt,
            rejectedReason: item.rejectedReason,
            videoRejectionReason: item.videoRejectionReason,
            socialChannel: item.socialChannel,
            collaboratorMetrics: item.collaborator?.collaboratorProfile
              ? {
                  kycStatus: item.collaborator.collaboratorProfile.kycStatus,
                  totalFollowers: item.collaborator.collaboratorProfile.totalFollowers || 0,
                  totalOrdersReferred: item.collaborator.collaboratorProfile.totalOrdersReferred || 0,
                  tierName: item.collaborator.collaboratorProfile.tier?.name,
                }
              : null,
            videoAssets: item.videoAssets || [],
            events: item.events || [],
            product: {
              id: item.product?.id || 'prod',
              title: item.product?.title || 'Sản phẩm mẫu',
              thumbnail: item.product?.imageUrl || item.product?.thumbnail || item.product?.images?.[0],
              price: item.product?.price || 0,
              commissionRate: item.product?.customCommissionRate != null || item.product?.store?.defaultCommissionRate != null
                ? Number(item.product.customCommissionRate ?? item.product.store.defaultCommissionRate)
                : undefined,
            },
            collaboratorInfo: {
              id: kolId,
              fullName: item.collaborator?.fullName || item.recipientName || 'Nhà Sáng Tạo SCANMS',
              email: item.collaborator?.email || '',
              avatarUrl: item.collaborator?.collaboratorProfile?.avatarUrl || item.collaborator?.avatarUrl,
              tier: item.collaborator?.collaboratorProfile?.tier?.name || 'Mới',
            },
            productVariantName: item.productVariant?.name,
          };
        });
        setSamples(transformed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }
    } catch (err: any) {
      if (sequence !== sampleLoadSequence.current) return;
      setSampleLoadError(err instanceof Error ? err.message : 'Kh?ng t?i ???c danh s?ch h?ng m?u.');
      toast.error('Chưa tải được thông tin nhận hàng mới nhất. Vui lòng làm mới danh sách mẫu.');
    } finally {
      if (sequence === sampleLoadSequence.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const refresh = () => { if (!document.hidden) void loadData(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [loadData, refreshKey]);

  useEffect(() => {
    setTrackingModalItem(current => current ? samples.find(item => item.id === current.id) || null : null);
  }, [samples]);

  // Aggregate Stats
  const storeStats = useMemo(() => {
    let pending = 0;
    let readyToShip = 0;
    let videoPending = 0;
    let overdue = 0;

    const now = Date.now();
    samples.forEach((s) => {
      if (s.status === 'PENDING') pending++;
      if (sampleDisplayStatus(s) === 'APPROVED') readyToShip++;
      if (s.status === 'VIDEO_SUBMITTED') videoPending++;
      if (s.status === 'RECEIVED') {
        if (s.deadlineAt && new Date(s.deadlineAt).getTime() <= now) overdue++;
      }
      if (s.status === 'OVERDUE') overdue++;
    });

    return {
      pending,
      readyToShip,
      videoPending,
      overdue,
      total: samples.length,
    };
  }, [samples]);

  // Filtered samples
  const filteredSamples = useMemo(() => {
    return samples.filter((s) => {
      if (statusFilter === 'PENDING' && s.status !== 'PENDING') return false;
      if (statusFilter === 'APPROVED' && sampleDisplayStatus(s) !== 'APPROVED') return false;
      if (statusFilter === 'SHIPPED' && sampleDisplayStatus(s) !== 'SHIPPED') return false;
      if (statusFilter === 'RECEIVED' && s.status !== 'RECEIVED') return false;
      if (statusFilter === 'VIDEO_SUBMITTED' && s.status !== 'VIDEO_SUBMITTED') return false;
      if (statusFilter === 'COMPLETED' && s.status !== 'COMPLETED') return false;
      if (statusFilter === 'OVERDUE') {
        const pastDeadline = s.status === 'RECEIVED' && Boolean(s.deadlineAt && new Date(s.deadlineAt).getTime() <= Date.now());
        if (s.status !== 'OVERDUE' && !pastDeadline) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchCreator = (s.collaboratorInfo?.fullName || '').toLowerCase().includes(q);
        const matchProduct = s.product.title.toLowerCase().includes(q);
        const matchTracking = s.trackingCode?.toLowerCase().includes(q)
          || s.shippingCharges?.some(charge => charge.trackingNumber?.toLowerCase().includes(q));
        if (!matchCreator && !matchProduct && !matchTracking) return false;
      }

      return true;
    });
  }, [samples, statusFilter, searchQuery]);

  const samplePageCount = Math.max(1, Math.ceil(filteredSamples.length / 20));
  const currentSamplePage = Math.min(samplePage, samplePageCount);
  const pageSamples = filteredSamples.slice((currentSamplePage - 1) * 20, currentSamplePage * 20);
  const recordedFreight = recordedSampleFreight(samples.flatMap(sample => sample.shippingCharges || []));

  // Handlers

  const handleToggleSelectSample = (id: string, checked: boolean) => {
    setSelectedSampleIds((prev) => (checked ? [...prev, id] : prev.filter((i) => i !== id)));
  };

  const handleBulkApproveSamples = async () => {
    if (selectedSampleIds.length === 0) return;
    setBulkApproving(true);
    let successCount = 0;
    try {
      await Promise.all(
        selectedSampleIds.map(async (id) => {
          try {
            await api.patch(`/sample-requests/${id}/approve`, {});
            successCount++;
          } catch (e) {
            console.error('Failed to approve sample:', id, e);
          }
        })
      );
      toast.success(`Đã duyệt thành công ${successCount}/${selectedSampleIds.length} yêu cầu mẫu 0đ!`);
      setSamples((prev) => prev.map((s) => (selectedSampleIds.includes(s.id) ? { ...s, status: 'APPROVED' } : s)));
      setSelectedSampleIds([]);
    } catch (err: any) {
      toast.error('Có lỗi xảy ra khi duyệt hàng loạt.');
    } finally {
      setBulkApproving(false);
    }
  };

  const handleApproveSample = async (sampleId: string) => {
    try {
      await api.patch(`/sample-requests/${sampleId}/approve`, {});
      toast.success('Đã duyệt đơn gửi hàng mẫu cho KOL!');
      setSamples((prev) => prev.map((s) => (s.id === sampleId ? { ...s, status: 'APPROVED' } : s)));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể duyệt yêu cầu mẫu.');
    }
  };

  const handleRejectSample = async (sampleId: string) => {
    const rejectedReason = window.prompt('Nhập lý do từ chối yêu cầu mẫu:');
    if (!rejectedReason?.trim()) return;
    try {
      await api.patch(`/sample-requests/${sampleId}/reject`, { rejectedReason: rejectedReason.trim() });
      toast.info('Đã từ chối yêu cầu gửi hàng mẫu');
      setSamples((prev) => prev.map((s) => (s.id === sampleId ? { ...s, status: 'REJECTED' } : s)));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể từ chối yêu cầu mẫu.');
    }
  };

  const handleRemindVideo = (sampleId: string) => {
    setRemindedSamples((prev) => ({ ...prev, [sampleId]: true }));
    toast.success('Đã gửi thông báo nhắc KOL đăng tải video review theo cam kết 14 ngày!');
  };

  const handleCopyTracking = async (tracking: string) => {
    try {
      await navigator.clipboard.writeText(tracking);
    } catch {
      toast.error('Không sao chép được mã vận đơn.');
      return;
    }
    setCopiedTracking(tracking);
    toast.success('Đã sao chép mã vận đơn!');
    setTimeout(() => setCopiedTracking(null), 2000);
  };

  const handleReviewSampleVideo = async (sample: SampleRequestItem, status: 'APPROVED' | 'REJECTED') => {
    const asset = sample.videoAssets?.find((item) => item.status === 'PENDING');
    const rejectionReason = status === 'REJECTED'
      ? window.prompt('Nhập lý do cần chỉnh sửa video:')?.trim()
      : undefined;
    if (status === 'REJECTED' && !rejectionReason) return;

    try {
      if (asset?.id) {
        await api.patch(`/media/${asset.id}/review`, { status, rejectionReason });
      }
      toast.success(status === 'APPROVED' ? 'Đã nghiệm thu video và hoàn tất yêu cầu mẫu.' : 'Đã gửi yêu cầu chỉnh sửa video cho KOL.');
      await loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể cập nhật kết quả kiểm duyệt video.');
    }
  };

  const handleSubmitTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingModalItem || (carrierInput !== 'GHN' && !trackingCodeInput.trim())) return;
    setIsSubmittingTracking(true);
    setSampleShippingError('');
    let reusedSandbox = false;
    try {
      if (carrierInput === 'GHN') {
        const response: any = await api.post(`/shipping/ghn/create-sample/${trackingModalItem.id}`, { environment: sampleGhnEnvironment });
        const result = response?.data?.data || response?.data || response;
        reusedSandbox = Boolean(result.reused);
      } else {
        await api.patch(`/sample-requests/${trackingModalItem.id}/ship`, {
          trackingNumber: trackingCodeInput.trim(), carrier: carrierInput,
        });
      }
      toast.success(carrierInput === 'GHN' ? sampleGhnEnvironment === 'TEST' ? reusedSandbox ? 'Dùng lại mã sandbox hiện có, không tạo thêm vận đơn.' : 'Đã tạo mã sandbox. Giữ nguyên đơn thật và hạn video.' : 'Đã phát hành vận đơn mẫu. Shop chịu phí ship, KOL nhận hàng với COD 0 đ.' : 'Đã lưu mã vận đơn hàng mẫu.');
      await loadData();
      setTrackingModalItem(null);
    } catch (err: any) {
      setSampleShippingError(String(err?.response?.data?.message || err?.message || 'Không thể tạo vận đơn hàng mẫu.'));
    } finally {
      setIsSubmittingTracking(false);
    }
  };

  const openTrackingModal = (s: SampleRequestItem) => {
    setSampleGhnEnvironment(s.status === 'SHIPPED' || isSandboxShipment(s) ? 'TEST' : 'LIVE');
    setTrackingModalItem(s);
    setCarrierInput('GHN');
    setTrackingCodeInput(s.trackingCode || '');
  };

  return (
    <div className="shop-samples-page w-full flex flex-col space-y-4">
      {/* STORE TABS CONTAINER */}
      <div className="sample-data-container bg-white border border-[#EAE4D7] rounded-2xl overflow-hidden shadow-2xs">
        <div className="flex items-center gap-2 border-b border-[#EAE4D7] p-1.5 sm:px-4">
          <div className="grid min-w-0 flex-1 grid-cols-3 divide-x divide-[#EAE4D7]" role="group" aria-label="Quản lý hàng mẫu và hợp tác">
            {([
              { key: 'SAMPLES_QUEUE', label: 'Hàng mẫu', Icon: PackageCheck, count: samples.length },
              { key: 'LEADERBOARD', label: 'Hiệu quả KOL', Icon: Award, count: partnerTeam.data?.members.length },
              { key: 'DEALS', label: 'Deal độc quyền', Icon: Handshake },
            ] as const).map(({ key, label, Icon, ...tab }) => <div key={key} className="min-w-0 px-0.5 sm:px-1.5">
              <button type="button" aria-pressed={storeTab === key} onClick={() => setStoreTab(key)}
                className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-1 rounded-lg border border-transparent px-1 text-center text-[11px] font-semibold text-[#655A49] hover:bg-[#FAF8F5] focus-visible:outline-2 focus-visible:outline-[#C59B58] aria-pressed:border-[#EEDFC6] aria-pressed:bg-[#FBF5EB] aria-pressed:text-[#231D15] sm:gap-2 sm:text-xs">
                <Icon size={16} className="hidden shrink-0 text-[#B88E4F] sm:block" aria-hidden="true" />
                {label}
                {'count' in tab && tab.count !== undefined && <span className="rounded-md bg-[#F3EFE6] px-1.5 py-0.5 text-[10px] tabular-nums">{tab.count}</span>}
              </button>
            </div>)}
          </div>

          {showRefreshButton && <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="mb-3 px-2.5 py-1.5 rounded-lg border border-[#EAE4D7] bg-white hover:bg-[#FBF5EB] text-[#7D715E] hover:text-[#1A1612] text-xs font-medium flex items-center gap-1 transition cursor-pointer"
            title="Làm mới danh sách mẫu"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#B88E4F] ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>}
        </div>

        {/* TAB 1: CENTRAL SAMPLE QUEUE (HÀNG ĐỢI HÀNG MẪU TOÀN SHOP) */}
        {storeTab === 'SAMPLES_QUEUE' && (
          <div className="p-3 space-y-3">
            <div data-sample-toolbar>
              <ShopWorkspaceToolbar label="Công cụ hàng mẫu"
                search={<label className="relative block min-w-0">
                  <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#7D715E]" />
                  <input type="search" placeholder="Tìm KOL, sản phẩm, vận đơn…" aria-label="Tìm hàng mẫu theo KOL, sản phẩm hoặc mã vận đơn"
                    value={searchQuery} onChange={event => setSearchQuery(event.target.value)}
                    className="w-full border border-[#EAE4D7] bg-white pl-9 pr-3 text-xs text-[#1A1612] outline-none focus:border-[#C59B58]" />
                </label>}
                filters={<div className="grid grid-cols-3 divide-x divide-[#EAE4D7]" role="group" aria-label="Lọc trạng thái hàng mẫu">
                  {([
                    { key: 'ALL', label: 'Tất cả', count: samples.length },
                    { key: 'PENDING', label: 'Chờ duyệt', count: storeStats.pending },
                    { key: 'APPROVED', label: 'Chờ gửi', count: storeStats.readyToShip },
                  ] as const).map(({ key, label, count }) => <div key={key} className="min-w-0 px-1">
                    <button type="button" onClick={() => setStatusFilter(key)} aria-pressed={statusFilter === key}
                      className="flex w-full min-w-0 items-center justify-center gap-1 whitespace-nowrap border border-transparent px-1 text-xs text-[#655A49] transition-colors hover:bg-[#FAF8F5] aria-pressed:border-[#EEDFC6] aria-pressed:bg-[#FBF5EB] aria-pressed:font-semibold aria-pressed:text-[#79592C]">
                      {label}{(key === 'ALL' || count > 0) && <span className="tabular-nums">{count}</span>}
                    </button>
                  </div>)}
                </div>}
                action={<Select aria-label="Lọc theo trạng thái khác" portal
                  value={['VIDEO_SUBMITTED', ...otherSampleStatuses.map(option => option.value)].includes(statusFilter) ? statusFilter : ''}
                  options={[{ value: '', label: 'Trạng thái' }, { value: 'VIDEO_SUBMITTED', label: 'Chờ video' }, ...otherSampleStatuses]}
                  onChange={event => setStatusFilter((event.target.value || 'ALL') as typeof statusFilter)}
                  className="min-h-10 w-full py-0 text-xs shadow-none" />} />
            </div>

            {storeStats.overdue > 0 && <button type="button" onClick={() => setStatusFilter('OVERDUE')}
              aria-pressed={statusFilter === 'OVERDUE'}
              className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-[#DC2626] hover:bg-red-50 aria-pressed:bg-red-50">
              <AlertTriangle size={14} aria-hidden="true" /> Quá hạn <span className="tabular-nums">{storeStats.overdue}</span>
            </button>}

            {/* Central Sample Queue Table */}
            {selectedSampleIds.length > 0 && (
              <div className="flex items-center justify-between p-3 mb-3 bg-[#FBF5EB] border border-[#EEDFC6] rounded-xl animate-in fade-in">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-[#C59B58] text-[#1A1612] font-bold text-xs">
                    Đã chọn {selectedSampleIds.length} yêu cầu
                  </span>
                  <span className="text-xs text-[#7D715E]">Thao tác hàng loạt:</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={bulkApproving}
                    onClick={handleBulkApproveSamples}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-[#1A1612] text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{bulkApproving ? 'Đang duyệt...' : `Duyệt nhanh hàng loạt (${selectedSampleIds.length})`}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSampleIds([])}
                    className="p-1.5 text-xs text-[#7D715E] hover:text-[#1A1612] cursor-pointer"
                    title="Bỏ chọn"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            <div className="overflow-x-auto rounded-2xl border border-[#EAE4D7] bg-white shadow-[0_2px_10px_rgb(35_29_21_/_2%)]">
              <table className="sample-queue-table w-full table-fixed border-collapse text-left text-xs">
                <colgroup><col className="w-[5%]" /><col className="w-[17%]" /><col className="w-[23%]" /><col className="w-[19%]" /><col className="w-[18%]" /><col className="w-[18%]" /></colgroup>
                <thead>
                  <tr className="border-b border-[#EAE4D7] bg-[#FBF5EB]/40 font-bold text-[#7D715E]">
                    <th className="w-10" aria-label="Chọn yêu cầu" />
                    <th className="py-3 px-3 font-medium">Nhà sáng tạo</th>
                    <th className="py-3 px-3 font-medium">Sản phẩm mẫu</th>
                    <th className="py-3 px-3 font-medium">Tiến độ & hạn video</th>
                    <th className="py-3 px-3 font-medium">Vận chuyển</th>
                    <th className="py-3 px-3 text-right font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE4D7]">
                  {loading && !samples.length ? <tr><td colSpan={6} className="sample-list-message" role="status">Đang tải yêu cầu hàng mẫu…</td></tr> : sampleLoadError ? <tr><td colSpan={6} className="sample-list-message"><div role="alert">Không tải được danh sách hàng mẫu. <button type="button" onClick={() => void loadData()}>Thử lại</button></div></td></tr> : filteredSamples.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[#7D715E]">
                        <Package className="w-8 h-8 mx-auto mb-2 text-[#C59B58]/40" />
                        <p className="font-semibold text-xs text-[#1A1612]">{samples.length ? 'Không có yêu cầu phù hợp bộ lọc' : 'Chưa có yêu cầu hàng mẫu'}</p>
                      </td>
                    </tr>
                  ) : (
                    pageSamples.map((s) => {
                      const now = Math.max(deadlineNow, Date.now());
                      const deadlineTime = s.deadlineAt ? new Date(s.deadlineAt).getTime() : Number.POSITIVE_INFINITY;
                      const msLeft = deadlineTime - now;
                      const daysLeft = Math.floor(msLeft / 86400000);
                      const hoursLeft = Math.floor((msLeft % 86400000) / 3600000);
                      const isOverdue = s.status === 'OVERDUE' || (s.status === 'RECEIVED' && msLeft <= 0);
                      const isDueSoon = s.status === 'RECEIVED' && msLeft > 0 && msLeft <= 2 * 86400000;

                      const testCharge = s.shippingCharges?.find(charge => charge.environment === 'TEST' && charge.trackingNumber);
                      const tracking = s.trackingCode || testCharge?.trackingNumber;
                      const isTestTracking = Boolean(tracking && s.shippingCharges?.some(charge => charge.trackingNumber === tracking && charge.environment === 'TEST'));
                      const liveCharges = s.shippingCharges?.filter(charge => charge.trackingNumber === tracking) || [];
                      const freight = recordedSampleFreight(liveCharges);
                      return (
                        <tr key={s.id} data-sample-row={s.id} className="bg-white align-middle transition-colors hover:bg-[#FBF5EB]/30 [&>td]:px-3 [&>td]:py-3.5">
                          {/* Column 0: Checkbox */}
                          <td className="py-3.5 px-3 align-middle w-10">
                            {s.status === 'PENDING' ? (
                              <input
                                type="checkbox"
                                aria-label={`Chọn yêu cầu của ${s.collaboratorInfo?.fullName || 'KOL'}`}
                                checked={selectedSampleIds.includes(s.id)}
                                onChange={(e) => handleToggleSelectSample(s.id, e.target.checked)}
                                className="rounded border-[#EAE4D7] text-[#C59B58] focus:ring-[#C59B58] cursor-pointer"
                              />
                            ) : null}
                          </td>
                          {/* Column 1: KOL */}
                          <td className="py-3.5 px-4">
                            <Link to={`/merchant/kol-hub?kol=${encodeURIComponent(s.collaboratorId)}&tab=profile`} aria-label={`Xem hồ sơ ${s.collaboratorInfo?.fullName || 'KOL'}`} className="flex items-center gap-2.5 rounded-lg hover:text-[#B88E4F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C59B58]">
                              <KolAvatar
                                src={s.collaboratorInfo?.avatarUrl}
                                name={s.collaboratorInfo?.fullName || 'KOL'}
                                id={s.collaboratorId}
                                className="w-9 h-9 rounded-xl border border-[#EAE4D7] shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="font-bold text-[#1A1612] truncate max-w-[160px] flex items-center gap-1">
                                  <span className="truncate" title={s.collaboratorInfo?.fullName}>{s.collaboratorInfo?.fullName || 'Nhà Sáng Tạo'}</span>
                                  {s.collaboratorMetrics?.kycStatus === 'VERIFIED' && (
                                    <span className="text-[#059669] text-[10px]" title="Đã xác minh KYC">✓</span>
                                  )}
                                </div>

                              </div>
                            </Link>
                          </td>

                          {/* Column 2: Sản phẩm */}
                          <td className="py-3.5 px-4">
                            <Link to={`/products/${encodeURIComponent(s.product.id)}`} aria-label={`Xem sản phẩm ${s.product.title}`} className="flex items-start gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C59B58]">
                              <img
                                src={getSafeProductImageUrl(s.product.thumbnail, s.product.title)} onError={handleProductImageError}
                                alt={s.product.title}
                                className="w-10 h-10 rounded-lg object-cover border border-[#EAE4D7] shrink-0 bg-[#FAF8F5]"
                              />
                              <div className="min-w-0 max-w-[220px]">
                                <p title={s.product.title} className="line-clamp-2 text-xs font-semibold leading-relaxed text-[#1A1612] hover:text-[#B88E4F]">{s.product.title}</p>
                                {s.productVariantName && <p className="mt-0.5 text-[11px] text-[#7D715E]">{s.productVariantName}</p>}

                              </div>
                            </Link>
                          </td>

                          {/* Column 3: Trạng thái & Hạn nộp video */}
                          <td className="py-3.5 px-4 align-middle">
                            <div className="space-y-1">
                              {s.status === 'PENDING' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold">
                                  <Clock className="w-3 h-3 text-amber-600" /> Chờ Shop duyệt
                                </span>
                              )}
                              {s.status === 'APPROVED' && !isSandboxShipment(s) && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FBF5EB] border border-[#EEDFC6] text-[#8C6B32] text-[11px] font-bold">
                                  <Package className="w-3 h-3 text-[#B88E4F]" /> Chờ tạo vận đơn
                                </span>
                              )}
                              {(s.status === 'SHIPPED' || isSandboxShipment(s)) && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FBF5EB] border border-[#EEDFC6] text-[#8C6B32] text-[11px] font-bold">
                                  <Truck className="w-3 h-3 text-[#B88E4F]" /> {isSandboxShipment(s) ? <SampleSandboxStatus charges={s.shippingCharges} /> : 'Đang vận chuyển'}
                                </span>
                              )}
                              {s.status === 'RECEIVED' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FBF5EB] border border-[#EEDFC6] text-[#8C6B32] text-[11px] font-bold">
                                  <CheckCircle2 className="w-3 h-3 text-[#B88E4F]" /> Đã nhận hàng · Chờ video
                                </span>
                              )}
                              {s.status === 'VIDEO_SUBMITTED' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FBF5EB] border border-[#EEDFC6] text-[#8C6B32] text-[11px] font-bold">
                                  <Video className="w-3 h-3 text-[#B88E4F]" /> Đã nộp video review
                                </span>
                              )}
                              {isOverdue && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-[#DC2626] text-[11px] font-bold">
                                  <AlertTriangle className="w-3 h-3 text-[#DC2626]" /> Quá hạn nộp video
                                </span>
                              )}
                              {s.status === 'COMPLETED' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F3EFE6] border border-[#EAE4D7] text-[#1A1612] text-[11px] font-bold">
                                  <Check className="w-3 h-3 text-[#059669]" /> Đã hoàn tất
                                </span>
                              )}
                              {s.status === 'REJECTED' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 border border-gray-200 text-gray-700 text-[11px] font-semibold">
                                  <X className="w-3 h-3" /> Đã từ chối
                                </span>
                              )}

                              {/* Đếm ngược 14 ngày */}
                              {s.status === 'RECEIVED' && s.deadlineAt && (
                                <div data-video-deadline={isOverdue ? 'overdue' : isDueSoon ? 'soon' : 'normal'} className={`mt-2 flex items-start gap-1 text-[11px] ${isOverdue || isDueSoon ? 'font-semibold text-[#DC2626]' : 'font-medium text-[#7D715E]'}`}><Clock size={12} className="mt-0.5 shrink-0" />
                                  {isOverdue ? (
                                    <span>Đã quá hạn nộp video</span>
                                  ) : isDueSoon ? (
                                    <span>Sắp hết hạn: {daysLeft > 0 ? `Còn ${daysLeft} ngày ${hoursLeft} giờ` : msLeft < 3600000 ? 'Còn dưới 1 giờ' : `Còn ${hoursLeft} giờ`}</span>
                                  ) : (
                                    <span>Hạn video: Còn {daysLeft} ngày</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Column 4: Mã vận đơn */}
                          <td className="py-3.5 px-4 align-middle text-xs">
                            {tracking ? <>
                              <div className="flex min-h-7 w-full min-w-0 flex-nowrap items-center gap-1.5" data-sample-tracking>
                                <span className="shrink-0 whitespace-nowrap text-xs text-[#7D715E]">
                                  {isTestTracking ? 'GHN thử nghiệm' : s.carrier || 'GHN'}
                                </span>
                                <span aria-hidden="true" className="shrink-0 text-[#7D715E]">·</span>
                                <code title={tracking} className="min-w-0 truncate whitespace-nowrap text-xs font-semibold text-[#231D15]">{tracking}</code>
                                <button type="button" onClick={() => void handleCopyTracking(tracking)}
                                  className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-lg text-[#7D715E] hover:bg-[#F3EFE6]"
                                  title="Sao chép mã" aria-label={`Sao chép mã vận đơn ${tracking}`}>
                                  {copiedTracking === tracking ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                                </button>
                              </div>
                              <p className="text-[11px] leading-relaxed text-[#7D715E]">
                                {isTestTracking ? 'Cước thử nghiệm' : freight == null ? 'Cước chưa ghi nhận' : `Cước Shop ${freight.toLocaleString('vi-VN')} ₫`} · COD <strong className="font-semibold text-[#1A1612]">0 ₫</strong>
                              </p>
                            </> : <span className="text-[11px] text-[#7D715E]">Chưa có vận đơn</span>}

                          </td>

                          {/* Column 5: Thao tác */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex flex-wrap items-center justify-end gap-1.5">

                              {/* Chờ duyệt */}
                              {s.status === 'PENDING' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleApproveSample(s.id)}
                                    className="px-2.5 py-1.5 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-white font-bold text-[11px] transition cursor-pointer shadow-2xs"
                                  >
                                    Duyệt gửi
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRejectSample(s.id)}
                                    className="px-2.5 py-1.5 rounded-lg border border-[#EAE4D7] bg-white hover:bg-rose-50 hover:text-[#DC2626] font-semibold text-[11px] text-[#7D715E] transition cursor-pointer"
                                  >
                                    Từ chối
                                  </button>
                                </>
                              )}

                              {/* Chờ gửi -> Tạo vận đơn GHN */}
                              {['APPROVED', 'DELIVERY_ISSUE'].includes(s.status) && !isSandboxShipment(s) && (
                                <button
                                  type="button"
                                  onClick={() => openTrackingModal(s)}
                                  className="flex cursor-pointer items-center gap-1 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-2.5 py-1.5 text-[11px] font-semibold text-[#8C6B32] transition hover:border-[#C59B58] hover:bg-[#F3EFE6]"
                                >
                                  <Truck className="w-3 h-3 text-[#C59B58]" />
                                  <span>{s.status === 'DELIVERY_ISSUE' ? 'Tạo lại vận đơn' : 'Tạo vận đơn GHN'}</span>
                                </button>
                              )}

                              {/* Chỉ nhắc nộp video sau khi đã nhận hàng */}
                              {s.status === 'RECEIVED' && s.deadlineAt && (
                                <button
                                  type="button"
                                  onClick={() => handleRemindVideo(s.id)}
                                  disabled={Boolean(remindedSamples[s.id])}
                                  className="px-2.5 py-1.5 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] hover:bg-[#F3EFE6] text-[#B88E4F] font-bold text-[11px] flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                                >
                                  <BellRing className="w-3 h-3" />
                                  <span>{remindedSamples[s.id] ? 'Đã nhắc' : 'Nhắc nộp video'}</span>
                                </button>
                              )}

                              {/* Đã nộp video -> Nghiệm thu */}
                              {s.status === 'VIDEO_SUBMITTED' && (
                                <div className="flex items-center gap-1">
                                  {s.reviewVideoUrl && (
                                    <a
                                      href={s.reviewVideoUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 rounded-lg border border-[#EAE4D7] bg-white hover:bg-[#FAF8F5] text-[#1A1612]"
                                      title="Xem video"
                                    >
                                      <Video className="w-3.5 h-3.5 text-[#C59B58]" />
                                    </a>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleReviewSampleVideo(s, 'APPROVED')}
                                    className="rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-2.5 py-1.5 text-[11px] font-semibold text-[#8C6B32] transition hover:bg-[#F3EFE6] cursor-pointer"
                                  >
                                    Nghiệm thu
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleReviewSampleVideo(s, 'REJECTED')}
                                    className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-[#DC2626] font-bold text-[11px] hover:bg-rose-100 transition cursor-pointer"
                                  >
                                    Sửa
                                  </button>
                                </div>
                              )}

                              <div className="ml-auto flex shrink-0 gap-1.5">
                              <button type="button" onClick={() => setDetailSampleId(s.id)} aria-label={`Chi tiết hàng mẫu ${s.product.title}`} title="Chi tiết hàng mẫu" className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg border border-[#EAE4D7] bg-white text-[#7D715E] hover:border-[#C59B58] hover:bg-[#FBF5EB]"><Eye size={15} /></button>
                              {/* Nút Chat 1-1 */}
                              <button
                                type="button"
                                onClick={() => navigate(`/merchant/kol-hub?kol=${s.collaboratorId}`)}
                                className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg border border-[#EAE4D7] bg-white text-[#7D715E] hover:border-[#C59B58] hover:bg-[#FBF5EB]"
                                aria-label="Nhắn tin với KOL"
                                title="Nhắn tin với KOL"
                              >
                                <MessageSquare className="size-4" aria-hidden="true" />
                              </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <footer className="sample-table-footer">
              <span>Cước Shop đã ghi nhận: <strong>{loading || sampleLoadError || recordedFreight == null ? '—' : `${recordedFreight.toLocaleString('vi-VN')} ₫`}</strong></span>
              <nav aria-label="Phân trang hàng mẫu">
                <button type="button" disabled={loading || !!sampleLoadError || currentSamplePage <= 1} onClick={() => setSamplePage(currentSamplePage - 1)}>Trang trước</button>
                <span aria-live="polite">{currentSamplePage}/{samplePageCount}</span>
                <button type="button" disabled={loading || !!sampleLoadError || currentSamplePage >= samplePageCount} onClick={() => setSamplePage(currentSamplePage + 1)}>Trang sau</button>
              </nav>
            </footer>
          </div>
        )}

        {storeTab !== 'SAMPLES_QUEUE' && <ShopPartnerDataTab key={storeTab} kind={storeTab} onInvite={() => setShowInviteModal(true)} />}
      </div>

      {showInviteModal && <InviteKolModal onClose={() => setShowInviteModal(false)} />}
      {trackingModalItem && (
        <SampleWaybillDialog
          sample={trackingModalItem}
          environment={sampleGhnEnvironment}
          onEnvironmentChange={value => {
            setSampleGhnEnvironment(value);
            setSampleShippingError('');
          }}
          manualTracking={carrierInput === 'GHN' ? undefined : { value: trackingCodeInput, onChange: setTrackingCodeInput }}
          busy={isSubmittingTracking}
          error={sampleShippingError}
          onClose={() => {
            setTrackingModalItem(null);
            setSampleShippingError('');
          }}
          onSubmit={handleSubmitTracking}
        />
      )}

      {detailSampleId && (() => {
        const selected = samples.find(sample => sample.id === detailSampleId);
        return selected ? <SampleRequestDetails sample={selected} onClose={closeSampleDetails}>
          {(selected.status === 'SHIPPED' || isSandboxShipment(selected)) && <button type="button"
            onClick={() => { closeSampleDetails(); openTrackingModal(selected); }}
            className="mt-3 inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-3 text-xs font-semibold text-[#79592C]">
            <Truck size={15} aria-hidden="true" />{isSandboxShipment(selected) ? 'Đổi môi trường GHN' : 'Tạo mã GHN sandbox'}
          </button>}
          <SampleSandboxWaybills charges={selected.shippingCharges} primary={isSandboxShipment(selected)} role="shop" />
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#EAE4D7] pt-3"><SampleDeadlineExtension request={selected} onSuccess={() => void loadData()} /><SampleViolationAction request={selected} blocked={Boolean(selected.sampleRequestsBlockedAt)} onSuccess={() => void loadData()} /></div>
        </SampleRequestDetails> : null;
      })()}
    </div>
  );
}
