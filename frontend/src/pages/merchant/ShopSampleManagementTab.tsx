import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Package,
  Clock,
  Video,
  AlertCircle,
  PackageCheck,
  Users,
  Search,
  Truck,
  CheckCircle2,
  Check,
  X,
  Copy,
  BellRing,
  MessageSquare,
  RefreshCw,
  MapPin,
  ExternalLink,
  CheckCheck,
} from 'lucide-react';
import api from '../../services/api';
import SampleDeadlineExtension from '../../components/affiliate/SampleDeadlineExtension';
import SampleViolationAction from '../../components/affiliate/SampleViolationAction';
import { SampleGhnEnvironmentPicker, SampleSandboxWaybills, isSandboxShipment, sampleDisplayStatus, useSandboxSampleState } from '../../components/shipping/SampleGhnEnvironmentPicker';
import { toast } from '../../utils/toast';
import { useNavigate } from 'react-router-dom';

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


const getKolAvatarSrc = (src?: string, name?: string, id?: string) => {
  if (src && !src.includes('placeholder') && !src.includes('default') && !src.endsWith('/null') && !src.endsWith('/undefined')) {
    return src;
  }
  const normalized = (name || '').toLowerCase();
  if (normalized.includes('thắng') || normalized.includes('thang')) return '/assets/kol-avatar-thang.jpg';
  if (normalized.includes('linh')) return '/assets/kol-avatar-linh.jpg';
  if (normalized.includes('nam')) return '/assets/kol-avatar-nam.jpg';
  if (normalized.includes('nhật') || normalized.includes('nhat')) return '/assets/kol-avatar-nhat.jpg';
  if (normalized.includes('hà') || normalized.includes('ha')) return '/assets/kol-avatar-ha.jpg';
  if (normalized.includes('mai anh')) return '/assets/kol-avatar-maianh.jpg';
  if (normalized.includes('tuấn') || normalized.includes('tuan')) return '/assets/kol-avatar-tuan.jpg';

  const fallbacks = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&q=80',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=256&q=80',
  ];
  const str = id || name || 'KOL';
  let sum = 0;
  for (let i = 0; i < str.length; i++) sum += str.charCodeAt(i);
  return fallbacks[sum % fallbacks.length] || fallbacks[0];
};

function KolAvatar({
  src,
  name,
  id,
  className = 'w-9 h-9',
}: {
  src?: string;
  name: string;
  id?: string;
  className?: string;
}) {
  const resolvedSrc = getKolAvatarSrc(src, name, id);

  return (
    <span className={`${className} relative inline-flex items-center justify-center overflow-hidden rounded-xl bg-[#F3EFE6] text-[#B88E4F] font-bold border border-[#EEDFC6] shadow-2xs shrink-0`}>
      <img
        src={resolvedSrc}
        alt={name}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = '/assets/kol-avatar-thang.jpg';
        }}
      />
    </span>
  );
}

function SandboxSampleStatusBadge({ charges }: { charges?: SampleRequestItem['shippingCharges'] }) {
  const code = charges?.find((c) => c.environment === 'TEST')?.trackingNumber;
  const { state } = useSandboxSampleState(code || '');
  if (!state) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-bold">
        <Truck className="w-3 h-3 text-indigo-600" /> Đang giao
      </span>
    );
  }
  if (state.videoUrl || state.status === 'VIDEO_SUBMITTED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
        <CheckCheck className="w-3 h-3 text-emerald-600" /> Đã nộp video
      </span>
    );
  }
  if (state.status === 'OVERDUE') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-[#DC2626] text-[11px] font-bold">
        <AlertCircle className="w-3 h-3 text-[#DC2626]" /> Quá hạn
      </span>
    );
  }
  if (state.receivedAt || state.deliveryStatus === 'DELIVERED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-800 text-[11px] font-bold">
        <Video className="w-3 h-3 text-purple-600" /> Chờ video
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-bold">
      <Truck className="w-3 h-3 text-indigo-600" /> {state.simulationStartedAt ? 'Đang giao' : 'Chờ lấy hàng'}
    </span>
  );
}

export default function ShopSampleManagementTab() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [samples, setSamples] = useState<SampleRequestItem[]>([]);
  const sampleLoadSequence = useRef(0);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'SHIPPED' | 'RECEIVED' | 'VIDEO_SUBMITTED' | 'OVERDUE' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [remindedSamples, setRemindedSamples] = useState<Record<string, boolean>>({});
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);

  // Address and Waybill detail modal states
  const [selectedAddressSample, setSelectedAddressSample] = useState<SampleRequestItem | null>(null);
  const [selectedWaybillSample, setSelectedWaybillSample] = useState<SampleRequestItem | null>(null);

  // Tracking modal state
  const [trackingModalItem, setTrackingModalItem] = useState<SampleRequestItem | null>(null);
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
      setSamples([]);
      setTrackingModalItem(null);
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
  }, [loadData]);

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
      if (s.status === 'RECEIVED') {
        videoPending++;
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
        const matchTracking = s.trackingCode?.toLowerCase().includes(q) || false;
        if (!matchCreator && !matchProduct && !matchTracking) return false;
      }

      return true;
    });
  }, [samples, statusFilter, searchQuery]);


  // Handlers
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

  const handleCopyTracking = (tracking: string) => {
    navigator.clipboard.writeText(tracking);
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
    <div className="w-full flex flex-col space-y-4">
      {/* STORE TABS CONTAINER */}
      <div className="bg-white border border-[#EAE4D7] rounded-2xl overflow-hidden shadow-2xs">
        {/* Tab Header Navigation */}
        <div className="flex items-center justify-between border-b border-[#EAE4D7] px-4 py-3 bg-[#FAF8F5]">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-[#B88E4F]" />
            <span className="text-xs font-bold text-[#1A1612]">Hàng đợi hàng mẫu</span>
            <span className="px-2 py-0.5 rounded-full bg-[#F3EFE6] text-[#7D715E] text-[10px] font-bold">
              {samples.length} yêu cầu
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/merchant/kol-hub')}
              className="px-2.5 py-1.5 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] hover:bg-[#F3EFE6] text-[#1A1612] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-[#B88E4F]" />
              <span>Mạng lưới KOL</span>
            </button>
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="px-2.5 py-1.5 rounded-lg border border-[#EAE4D7] bg-white hover:bg-[#FBF5EB] text-[#7D715E] hover:text-[#1A1612] text-xs font-medium flex items-center gap-1 transition cursor-pointer"
              title="Làm mới danh sách mẫu"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#B88E4F] ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Làm mới</span>
            </button>
          </div>
        </div>

        {/* CENTRAL SAMPLE QUEUE (HÀNG ĐỢI HÀNG MẪU TOÀN SHOP) */}
        <div className="p-4 sm:p-5 space-y-4">
            {/* 4 THẺ SỐ LIỆU LỌC NHANH TRONG HÀNG ĐỢI (STAT QUICK FILTERS) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Stat 1: Chờ duyệt */}
              <div
                onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')}
                className={`p-3.5 rounded-xl border transition shadow-2xs cursor-pointer text-left group ${
                  statusFilter === 'PENDING'
                    ? 'border-[#C59B58] ring-2 ring-[#C59B58]/20 bg-[#FBF5EB]'
                    : 'border-[#EAE4D7] bg-white hover:border-[#C59B58]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-[#7D715E]">Chờ duyệt</span>
                  <div className="w-7 h-7 rounded-lg bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-xl font-black text-[#1A1612]">{storeStats.pending}</div>
              </div>

              {/* Stat 2: Chờ gửi */}
              <div
                onClick={() => setStatusFilter(statusFilter === 'APPROVED' ? 'ALL' : 'APPROVED')}
                className={`p-3.5 rounded-xl border transition shadow-2xs cursor-pointer text-left group ${
                  statusFilter === 'APPROVED'
                    ? 'border-[#C59B58] ring-2 ring-[#C59B58]/20 bg-[#FBF5EB]'
                    : 'border-[#EAE4D7] bg-white hover:border-[#C59B58]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-[#7D715E]">Chờ gửi</span>
                  <div className="w-7 h-7 rounded-lg bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center">
                    <Package className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-xl font-black text-[#1A1612]">{storeStats.readyToShip}</div>
              </div>

              {/* Stat 3: Chờ video */}
              <div
                onClick={() => setStatusFilter(statusFilter === 'VIDEO_SUBMITTED' ? 'ALL' : 'VIDEO_SUBMITTED')}
                className={`p-3.5 rounded-xl border transition shadow-2xs cursor-pointer text-left group ${
                  statusFilter === 'VIDEO_SUBMITTED'
                    ? 'border-[#C59B58] ring-2 ring-[#C59B58]/20 bg-[#FBF5EB]'
                    : 'border-[#EAE4D7] bg-white hover:border-[#C59B58]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-[#7D715E]">Chờ video</span>
                  <div className="w-7 h-7 rounded-lg bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center">
                    <Video className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-xl font-black text-[#1A1612]">{storeStats.videoPending}</div>
              </div>

              {/* Stat 4: Quá hạn */}
              <div
                onClick={() => setStatusFilter(statusFilter === 'OVERDUE' ? 'ALL' : 'OVERDUE')}
                className={`p-3.5 rounded-xl border transition shadow-2xs cursor-pointer text-left group ${
                  statusFilter === 'OVERDUE'
                    ? 'border-[#DC2626] ring-2 ring-[#DC2626]/20 bg-rose-50'
                    : 'border-rose-200 bg-white hover:border-rose-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-[#DC2626]">Quá hạn</span>
                  <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 text-[#DC2626] flex items-center justify-center">
                    <AlertCircle className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-xl font-black text-[#DC2626]">{storeStats.overdue}</div>
              </div>
            </div>

            {/* Search & Filters bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
              {/* Search box */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-[#7D715E] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm KOL, sản phẩm, vận đơn..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl pl-9 pr-3 py-2 text-xs text-[#1A1612] outline-none focus:border-[#C59B58]"
                />
              </div>

              {/* Status Filter buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { key: 'ALL', label: 'Tất cả' },
                  { key: 'PENDING', label: 'Chờ duyệt' },
                  { key: 'APPROVED', label: 'Chờ gửi' },
                  { key: 'SHIPPED', label: 'Đang giao' },
                  { key: 'RECEIVED', label: 'Chờ video' },
                  { key: 'VIDEO_SUBMITTED', label: 'Duyệt video' },
                  { key: 'OVERDUE', label: 'Quá hạn', isDanger: true },
                  { key: 'COMPLETED', label: 'Hoàn tất' },
                ].map((btn) => (
                  <button
                    key={btn.key}
                    type="button"
                    onClick={() => setStatusFilter(btn.key as any)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      statusFilter === btn.key
                        ? btn.isDanger
                          ? 'bg-[#DC2626] text-white shadow-xs'
                          : 'bg-[#C59B58] text-[#231D15] font-bold shadow-xs'
                        : btn.isDanger && storeStats.overdue > 0
                          ? 'bg-rose-50 border border-rose-200 text-[#DC2626]'
                          : 'bg-[#F3EFE6] text-[#7D715E] hover:text-[#1A1612]'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Central Sample Queue Table */}
            <div className="overflow-x-auto border border-[#EAE4D7] rounded-xl bg-white">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAF8F5] border-b border-[#EAE4D7] text-[#7D715E] font-bold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4 min-w-[160px]">KOL</th>
                    <th className="py-3 px-4 min-w-[200px]">Sản phẩm</th>
                    <th className="py-3 px-4 min-w-[160px]">Trạng thái</th>
                    <th className="py-3 px-4 min-w-[190px]">Vận đơn</th>
                    <th className="py-3 px-4 text-right min-w-[160px]">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE4D7]">
                  {filteredSamples.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-[#7D715E]">
                        <Package className="w-8 h-8 mx-auto mb-2 text-[#C59B58]/40" />
                        <p className="font-semibold text-xs text-[#1A1612]">Không có yêu cầu mẫu</p>
                      </td>
                    </tr>
                  ) : (
                    filteredSamples.map((s) => {
                      const now = Date.now();
                      const deadlineTime = s.deadlineAt ? new Date(s.deadlineAt).getTime() : Number.POSITIVE_INFINITY;
                      const msLeft = deadlineTime - now;
                      const daysLeft = Math.floor(msLeft / 86400000);
                      const isOverdue = s.status === 'OVERDUE' || (s.status === 'RECEIVED' && msLeft <= 0);
                      const effectiveTracking = s.trackingCode || (s.shippingCharges?.find((c) => c.environment === 'TEST')?.trackingNumber) || null;

                      return (
                        <tr key={s.id} className="hover:bg-[#FAF8F5]/60 transition">
                          {/* Column 1: KOL */}
                          <td className="py-3 px-4 align-middle">
                            <div className="flex items-center gap-2.5">
                              <KolAvatar
                                src={s.collaboratorInfo?.avatarUrl}
                                name={s.collaboratorInfo?.fullName || 'KOL'}
                                id={s.collaboratorId}
                                className="w-9 h-9 rounded-xl border border-[#EAE4D7] shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="font-bold text-[#1A1612] truncate max-w-[140px] flex items-center gap-1">
                                  <span>{s.collaboratorInfo?.fullName || 'Nhà Sáng Tạo'}</span>
                                  {s.collaboratorMetrics?.kycStatus === 'VERIFIED' && (
                                    <span title="Đã xác minh" className="inline-flex items-center">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] shrink-0" />
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-[#7D715E] flex items-center gap-1.5 mt-0.5">
                                  <span className="px-1.5 py-0.2 rounded bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] font-semibold text-[10px]">
                                    {s.collaboratorInfo?.tier || 'Silver'}
                                  </span>
                                  <span>{s.collaboratorMetrics?.totalFollowers ? `${s.collaboratorMetrics.totalFollowers.toLocaleString('vi-VN')} flw` : ''}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Column 2: Sản phẩm */}
                          <td className="py-3 px-4 align-middle">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={s.product.thumbnail || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=100'}
                                alt={s.product.title}
                                className="w-10 h-10 rounded-xl object-cover border border-[#EAE4D7] shrink-0 bg-[#FAF8F5]"
                              />
                              <div className="min-w-0 max-w-[200px]">
                                <p className="font-bold text-[#1A1612] truncate text-xs" title={s.product.title}>{s.product.title}</p>
                                {Boolean(s.productVariantName && s.productVariantName !== 'Bản tiêu chuẩn') && (
                                  <p className="text-[11px] text-[#7D715E] mt-0.5 truncate">
                                    {s.productVariantName}
                                  </p>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setSelectedAddressSample(s)}
                                  className="mt-0.5 text-[11px] text-[#7D715E] hover:text-[#B88E4F] font-medium inline-flex items-center gap-1 cursor-pointer transition"
                                >
                                  <MapPin className="w-3 h-3 text-[#B88E4F]" />
                                  <span>Địa chỉ</span>
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* Column 3: Trạng thái */}
                          <td className="py-3 px-4 align-middle">
                            <div className="space-y-1">
                              {isSandboxShipment(s) ? (
                                <SandboxSampleStatusBadge charges={s.shippingCharges} />
                              ) : (
                                <>
                                  {s.status === 'PENDING' && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold">
                                      <Clock className="w-3 h-3 text-amber-600" /> Chờ duyệt
                                    </span>
                                  )}
                                  {s.status === 'APPROVED' && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-bold">
                                      <Package className="w-3 h-3 text-blue-600" /> Chờ gửi
                                    </span>
                                  )}
                                  {s.status === 'SHIPPED' && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-bold">
                                      <Truck className="w-3 h-3 text-indigo-600" /> Đang giao
                                    </span>
                                  )}
                                  {s.status === 'RECEIVED' && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-800 text-[11px] font-bold">
                                      <Video className="w-3 h-3 text-purple-600" /> Chờ video
                                    </span>
                                  )}
                                  {s.status === 'VIDEO_SUBMITTED' && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                                      <CheckCheck className="w-3 h-3 text-emerald-600" /> Đã nộp video
                                    </span>
                                  )}
                                  {isOverdue && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-[#DC2626] text-[11px] font-bold">
                                      <AlertCircle className="w-3 h-3 text-[#DC2626]" /> Quá hạn
                                    </span>
                                  )}
                                  {s.status === 'COMPLETED' && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F3EFE6] border border-[#EAE4D7] text-[#1A1612] text-[11px] font-bold">
                                      <Check className="w-3 h-3 text-[#059669]" /> Hoàn tất
                                    </span>
                                  )}
                                  {s.status === 'REJECTED' && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 border border-gray-200 text-gray-700 text-[11px] font-semibold">
                                      <X className="w-3 h-3" /> Đã từ chối
                                    </span>
                                  )}
                                </>
                              )}

                              {/* Hạn video */}
                              {s.status === 'RECEIVED' && s.deadlineAt && (
                                <div className="text-[10.5px] mt-1 font-semibold flex items-center gap-1">
                                  {isOverdue ? (
                                    <span className="text-[#DC2626] flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3" /> Hết hạn
                                    </span>
                                  ) : daysLeft <= 3 ? (
                                    <span className="text-amber-700 flex items-center gap-1">
                                      <Clock className="w-3 h-3" /> Còn {daysLeft} ngày
                                    </span>
                                  ) : (
                                    <span className="text-[#7D715E] flex items-center gap-1">
                                      <Clock className="w-3 h-3" /> Còn {daysLeft} ngày
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Column 4: Vận đơn */}
                          <td className="py-3 px-4 align-middle">
                            {effectiveTracking ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FAF8F5] text-[#795A2D] border border-[#EAE4D7]">
                                    GHN
                                  </span>
                                  <code className="font-mono font-bold text-xs text-[#1A1612]">
                                    {effectiveTracking}
                                  </code>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyTracking(effectiveTracking)}
                                    className="p-1 rounded hover:bg-[#F3EFE6] text-[#7D715E] hover:text-[#1A1612] cursor-pointer transition"
                                    title="Sao chép"
                                  >
                                    {copiedTracking === effectiveTracking ? (
                                      <Check className="w-3.5 h-3.5 text-[#059669]" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                                {Boolean(s.shippingCharges && s.shippingCharges.length > 0) && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedWaybillSample(s)}
                                    className="text-[#B88E4F] hover:text-[#8C6226] font-medium flex items-center gap-1 cursor-pointer transition text-[11px]"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>Chi tiết vận đơn</span>
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-[#7D715E] text-xs flex items-center gap-1">
                                <Package className="w-3.5 h-3.5 text-[#B88E4F]/60" /> Chưa phát hành
                              </span>
                            )}
                          </td>

                          {/* Column 5: Thao tác */}
                          <td className="py-3 px-4 text-right align-middle">
                            <div className="flex items-center justify-end gap-1.5">
                              <SampleDeadlineExtension request={s} onSuccess={() => void loadData()} />
                              <SampleViolationAction request={s} blocked={Boolean(s.sampleRequestsBlockedAt)} onSuccess={() => void loadData()} />

                              {/* Chờ duyệt */}
                              {s.status === 'PENDING' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleApproveSample(s.id)}
                                    className="px-3 py-1.5 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-[#231D15] font-bold text-xs flex items-center gap-1 transition cursor-pointer shadow-2xs"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Duyệt</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRejectSample(s.id)}
                                    className="px-2.5 py-1.5 rounded-xl border border-[#EAE4D7] bg-white hover:bg-rose-50 hover:text-[#DC2626] font-semibold text-xs text-[#7D715E] transition cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    <span>Từ chối</span>
                                  </button>
                                </>
                              )}

                              {/* Chờ gửi -> Tạo vận đơn */}
                              {['APPROVED', 'DELIVERY_ISSUE', 'SHIPPED'].includes(s.status) && (
                                <button
                                  type="button"
                                  onClick={() => openTrackingModal(s)}
                                  className="px-3 py-1.5 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-[#231D15] font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                                >
                                  {isSandboxShipment(s) || s.status === 'SHIPPED' ? (
                                    <>
                                      <Truck className="w-3.5 h-3.5" />
                                      <span>Đổi vận đơn</span>
                                    </>
                                  ) : (
                                    <>
                                      <Package className="w-3.5 h-3.5" />
                                      <span>Tạo vận đơn</span>
                                    </>
                                  )}
                                </button>
                              )}

                              {/* Chỉ nhắc nộp video sau khi đã nhận hàng */}
                              {s.status === 'RECEIVED' && s.deadlineAt && (
                                <button
                                  type="button"
                                  onClick={() => handleRemindVideo(s.id)}
                                  disabled={Boolean(remindedSamples[s.id])}
                                  className="px-2.5 py-1.5 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] hover:bg-[#F3EFE6] text-[#B88E4F] font-bold text-xs flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                                >
                                  <BellRing className="w-3.5 h-3.5" />
                                  <span>{remindedSamples[s.id] ? 'Đã nhắc' : 'Nhắc video'}</span>
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
                                      className="p-1.5 rounded-xl border border-[#EAE4D7] bg-white hover:bg-[#FAF8F5] text-[#1A1612] transition"
                                      title="Xem video"
                                    >
                                      <Video className="w-3.5 h-3.5 text-[#C59B58]" />
                                    </a>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleReviewSampleVideo(s, 'APPROVED')}
                                    className="px-3 py-1.5 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-[#231D15] font-bold text-xs flex items-center gap-1 transition cursor-pointer shadow-2xs"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Nghiệm thu</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleReviewSampleVideo(s, 'REJECTED')}
                                    className="px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-[#DC2626] font-semibold text-xs hover:bg-rose-100 transition cursor-pointer"
                                  >
                                    <span>Yêu cầu sửa</span>
                                  </button>
                                </div>
                              )}

                              {/* Nút Chat 1-1 */}
                              <button
                                type="button"
                                onClick={() => navigate(`/merchant/kol-hub?kol=${s.collaboratorId}`)}
                                className="w-8 h-8 rounded-xl border border-[#EAE4D7] bg-white hover:bg-[#FBF5EB] hover:border-[#C59B58] text-[#7D715E] hover:text-[#B88E4F] flex items-center justify-center transition cursor-pointer"
                                title="Nhắn tin với KOL"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
      </div>

      {/* MODAL: TẠO VẬN ĐƠN GHN CHO HÀNG MẪU */}
      {trackingModalItem && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in"
          onClick={() => setTrackingModalItem(null)}
        >
          <div
            className="bg-white border border-[#EAE4D7] rounded-2xl w-full max-w-md max-h-[calc(100dvh-2rem)] shadow-2xl overflow-y-auto overscroll-contain animate-in zoom-in-95 text-left"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="px-6 py-4 border-b border-[#EAE4D7] flex items-center justify-between bg-[#FAF8F5]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-[#1A1612]">Tạo Vận Đơn Giao Hàng Mẫu</h3>
              </div>
              <button
                type="button"
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#7D715E] hover:bg-[#F3EFE6] transition cursor-pointer"
                onClick={() => setTrackingModalItem(null)}
              >
                ✕
              </button>
            </div>

            <div className="p-4 mx-6 mt-4 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7] text-xs space-y-1">
              <div className="font-bold text-[#1A1612]">Người nhận: {trackingModalItem.recipientName || 'Chưa cập nhật'}</div>
              <div className="text-[#7D715E]">SĐT: {trackingModalItem.recipientPhone || 'Chưa cập nhật'}</div>
              <div className="text-[#7D715E]">{trackingModalItem.product.title}</div>
              <div className="text-[11px] text-[#7D715E] pt-1 border-t border-[#EAE4D7]">
                📍 {trackingModalItem.shippingAddress}
              </div>
            </div>

            <form onSubmit={handleSubmitTracking} className="p-6 space-y-4">
              <div className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3 text-xs text-[#7D715E]">
                <strong className="text-[#1A1612]">Shop thanh toán 100% phí vận chuyển · KOL COD 0 đ.</strong>
                <p className="mt-1">Khi tạo vận đơn GHN thành công, cước hãng trả về được lưu vào yêu cầu mẫu để Shop theo dõi.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1A1612] mb-1.5">
                  Đơn vị vận chuyển
                </label>
                <select
                  value={carrierInput}
                  onChange={(e) => setCarrierInput(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3 py-2 text-xs text-[#1A1612] outline-none focus:border-[#C59B58]"
                >
                  <option value="GHN">Giao Hàng Nhanh (GHN Express)</option>
                </select>
              </div>

              {carrierInput === 'GHN' && <SampleGhnEnvironmentPicker value={sampleGhnEnvironment} onChange={setSampleGhnEnvironment} allowLive={trackingModalItem.status !== 'SHIPPED'} disabled={isSubmittingTracking} />}
              {carrierInput !== 'GHN' ? <div>
                <label className="block text-xs font-bold text-[#1A1612] mb-1.5">
                  Mã vận đơn bưu cục
                </label>
                <input
                  type="text"
                  placeholder="Nhập mã vận đơn do bưu cục cấp"
                  value={trackingCodeInput}
                  onChange={(e) => setTrackingCodeInput(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3 py-2 text-xs font-mono text-[#1A1612] outline-none focus:border-[#C59B58]"
                  required
                />
                <p className="text-[11px] text-[#7D715E] mt-1">
                  Mã vận đơn phục vụ đối soát giao nhận với đối tác bưu tá.
                </p>
              </div> : <p className="text-xs text-[#7D715E]">GHN sẽ cấp mã vận đơn sau khi tạo thành công. Hạn nộp video chỉ bắt đầu sau khi GHN xác nhận giao hàng.</p>}

              {sampleShippingError && (
                <div role="alert" className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3.5 text-left">
                  <p className="m-0 text-xs font-bold text-[#991B1B]">Chưa tạo được vận đơn gửi mẫu</p>
                  <p className="mb-0 mt-1.5 whitespace-normal break-words text-xs leading-relaxed text-[#7F1D1D]">{sampleShippingError}</p>
                </div>
              )}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#EAE4D7]">
                <button
                  type="button"
                  onClick={() => setTrackingModalItem(null)}
                  className="px-4 py-2 rounded-xl border border-[#EAE4D7] text-xs font-semibold text-[#7D715E] hover:bg-[#FAF8F5] transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTracking || (carrierInput !== 'GHN' && !trackingCodeInput.trim())}
                  className="px-4 py-2 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingTracking ? 'Đang phát hành…' : 'Xác nhận tạo vận đơn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: ĐỊA CHỈ NHẬN HÀNG MẪU CỦA KOL */}
      {selectedAddressSample && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in"
          onClick={() => setSelectedAddressSample(null)}
        >
          <div
            className="bg-white border border-[#EAE4D7] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-left animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="px-5 py-3.5 border-b border-[#EAE4D7] flex items-center justify-between bg-[#FAF8F5]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-sm font-bold text-[#1A1612]">Địa chỉ giao hàng</h3>
              </div>
              <button
                type="button"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#7D715E] hover:bg-[#F3EFE6] transition cursor-pointer"
                onClick={() => setSelectedAddressSample(null)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#EAE4D7]">
                <KolAvatar
                  src={selectedAddressSample.collaboratorInfo?.avatarUrl}
                  name={selectedAddressSample.collaboratorInfo?.fullName || 'KOL'}
                  id={selectedAddressSample.collaboratorId}
                  className="w-10 h-10 rounded-xl border border-[#EAE4D7]"
                />
                <div className="min-w-0">
                  <div className="font-bold text-[#1A1612] text-sm truncate">
                    {selectedAddressSample.recipientName || selectedAddressSample.collaboratorInfo?.fullName || 'Nhà Sáng Tạo'}
                  </div>
                  <div className="text-[#7D715E] text-[11px] truncate">
                    {selectedAddressSample.collaboratorInfo?.email || 'Đối tác tiếp thị SCANMS'}
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7] space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#7D715E]">Người nhận:</span>
                  <strong className="text-[#1A1612]">{selectedAddressSample.recipientName || 'Chưa cập nhật'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7D715E]">Số điện thoại:</span>
                  <strong className="text-[#1A1612]">{selectedAddressSample.recipientPhone || 'Chưa cập nhật'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7D715E]">Sản phẩm:</span>
                  <strong className="text-[#1A1612] truncate max-w-[220px]">{selectedAddressSample.product.title}</strong>
                </div>
                <div className="pt-2 border-t border-[#EAE4D7]">
                  <span className="text-[#7D715E] block mb-1">Địa chỉ:</span>
                  <p className="font-semibold text-[#1A1612] leading-relaxed">
                    {selectedAddressSample.shippingAddress || 'Chưa cập nhật'}
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedAddressSample(null)}
                  className="px-4 py-2 rounded-xl bg-[#F3EFE6] hover:bg-[#EAE4D7] text-[#1A1612] font-bold text-xs transition cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CHI TIẾT CƯỚC & VẬN ĐƠN GHN */}
      {selectedWaybillSample && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in"
          onClick={() => setSelectedWaybillSample(null)}
        >
          <div
            className="bg-white border border-[#EAE4D7] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-left animate-in zoom-in-95 max-h-[calc(100dvh-2rem)] flex flex-col"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="px-5 py-3.5 border-b border-[#EAE4D7] flex items-center justify-between bg-[#FAF8F5] shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center">
                  <Truck className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-sm font-bold text-[#1A1612]">Vận đơn GHN</h3>
              </div>
              <button
                type="button"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#7D715E] hover:bg-[#F3EFE6] transition cursor-pointer"
                onClick={() => setSelectedWaybillSample(null)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3.5 text-xs">

              <SampleSandboxWaybills
                charges={selectedWaybillSample.shippingCharges}
                primary={isSandboxShipment(selectedWaybillSample)}
                role="shop"
                productId={selectedWaybillSample.product?.id}
                productTitle={selectedWaybillSample.product?.title}
                sampleRequestId={selectedWaybillSample.id}
              />

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedWaybillSample(null)}
                  className="px-4 py-2 rounded-xl bg-[#F3EFE6] hover:bg-[#EAE4D7] text-[#1A1612] font-bold text-xs transition cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
