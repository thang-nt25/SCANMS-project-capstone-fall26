import { HelpCircle } from 'lucide-react';
import { publicWebsiteUrl } from '@/utils/public-url';
import { handleAvatarImageError, handleProductImageError } from '@/utils/image-fallback.utils';
import { registerPrivateCacheReset } from '@/utils/private-cache-session';
import { CreateExclusiveDealModal } from '../../components/chat/CreateExclusiveDealModal';
import { normalizePartnerTier } from '../../utils/partner-tier';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { StoreCooperationPanel } from '../../components/affiliate/StoreCooperationPanel';
import { TerminateCooperationModal } from '../../components/affiliate/TerminateCooperationModal';
import { QuickKolCouponModal } from '../../components/promotions/QuickKolCouponModal';
import { couponService, type CouponItem } from '../../services/coupon.service';
import { SampleSandboxStatus, isSandboxShipment, sampleDisplayStatus } from '../../components/shipping/SampleGhnEnvironmentPicker';
import { SampleWaybillDialog } from '../../components/shipping/SampleWaybillDialog';
import { PartnerSampleDetails } from '../../components/shipping/PartnerSampleDetails';
import { useSearchParams } from 'react-router-dom';
import {
  Users,
  MessageSquare,
  Package,
  BarChart3,
  UserCheck,
  Search,
  ExternalLink,
  Award,
  Gem,
  Medal,
  Truck,
  CheckCircle2,
  Clock,
  Plus,
  Copy,
  Check,
  Share2,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  Mail,
  X,
  Radar,
  ArrowUpRight,
  RefreshCw,
  Handshake,
  UserMinus,
  Send,
  Ticket,
  MoreHorizontal,
} from 'lucide-react';
import api from '../../services/api';
import { analyticsService, type ReferralOrderItem } from '../../services/analytics.service';
import ChatBoxPage from '../chat/ChatBoxPage';
import KolRecommendationPage from './KolRecommendationPage';
import { toast } from '../../utils/toast';
import { Select } from '../../components/ui/Select';
import { format, isToday, isYesterday } from 'date-fns';
import { vi } from 'date-fns/locale';
import SampleViolationAction from '../../components/affiliate/SampleViolationAction';
import SampleDeadlineExtension from '../../components/affiliate/SampleDeadlineExtension';
import ShopActiveDealsTab from '../../components/affiliate/ShopActiveDealsTab';

function formatConvTime(dateStr?: string | null) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Hôm qua';
  return format(d, 'dd/MM/yy', { locale: vi });
}

function getChatMessagePreview(messageText?: string, mediaName?: string): string {
  if (!messageText) return mediaName ? `📎 ${mediaName}` : '';
  try {
    const parsed = JSON.parse(messageText);
    if (parsed.type === 'CAMPAIGN_INVITE') {
      const bonus = parsed.bonusCommissionRate ? ` (+${parsed.bonusCommissionRate}%)` : '';
      return `🎁 Thư mời chiến dịch VIP: ${parsed.campaignName || parsed.title || 'Chiến dịch'}${bonus}`;
    }
    if (parsed.type === 'CAMPAIGN_ACCEPTED') {
      return `✅ Đã tham gia chiến dịch: ${parsed.campaignName || parsed.title || 'Chiến dịch'}`;
    }
    if (parsed.type === 'CAMPAIGN_REJECTED') {
      return `❌ Đã từ chối chiến dịch: ${parsed.campaignName || parsed.title || 'Chiến dịch'}`;
    }
    if (parsed.type === 'COUPON_PROPOSAL') {
      return `🎟️ Đề xuất mã riêng: ${parsed.code || parsed.couponCode || 'Voucher VIP'}`;
    }
    if (parsed.type === 'COUPON_PROPOSAL_APPROVED') {
      return `✅ Đã kích hoạt mã riêng: ${parsed.code || parsed.couponCode || 'Voucher VIP'}`;
    }
    if (parsed.type === 'EXCLUSIVE_DEAL_PROPOSAL') {
      return `🤝 Đề xuất deal độc quyền: ${parsed.productTitle || 'Sản phẩm'}`;
    }
    if (parsed.type === 'EXCLUSIVE_DEAL_DECISION') {
      return parsed.status === 'APPROVED' ? '✅ Đã duyệt deal độc quyền' : '❌ Đã từ chối deal độc quyền';
    }
    if (parsed.type === 'PRODUCT_INQUIRY') {
      return `🛍️ Hỏi về: ${parsed.productTitle || 'sản phẩm'}`;
    }
    if (parsed.type === 'COUPON_VOUCHER') {
      return `🎟️ Voucher: ${parsed.couponCode || 'ưu đãi'}`;
    }
    return messageText;
  } catch {
    return messageText;
  }
}

export function formatPartnerEngagement(value?: string | number | null): string {
  if (value == null || String(value).trim() === '') return '—';
  const raw = String(value).trim().replace(/%$/, '').trim();
  const numeric = Number(raw.replace(',', '.'));
  return Number.isFinite(numeric) ? `${numeric.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%` : '—';
}

export interface PartnerKol {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  tier?: 'DIAMOND' | 'GOLD' | 'SILVER' | 'BRONZE';
  handle?: string;
  primaryChannel?: {
    platform: 'TIKTOK' | 'INSTAGRAM' | 'YOUTUBE' | 'FACEBOOK';
    url: string;
    followers: number;
    engagementRate?: string | number;
  };
  socialChannels?: Array<{
    platform: 'TIKTOK' | 'INSTAGRAM' | 'YOUTUBE' | 'FACEBOOK';
    url: string;
    handle: string;
    followers: number;
    engagementRate?: string | number;
    isVerified?: boolean;
  }>;
  kycStatus?: 'VERIFIED' | 'PENDING' | 'UNVERIFIED' | 'REJECTED';
  commissionRate?: number; // Custom % for this KOL
  statsAvailable?: boolean;
  stats: {
    totalRevenue: number;
    totalOrders: number;
    sampleRequestsCount: number;
    pendingSamplesCount: number;
    completedVideosCount: number;
  };
  lastMessage?: string;
  lastMessageTime?: string;
  lastMessageTimestamp?: number;
  unreadCount?: number;
  cooperationId?: string;
  cooperationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'TERMINATED' | 'BLOCKED';
  requestedByKol?: boolean;
  cooperationNote?: string | null;
  cooperationUpdatedAt?: string;
  hasCooperationHistory?: boolean;
}

export function SocialBrandIcon({ platform, className = 'w-3.5 h-3.5' }: { platform: string; className?: string }) {
  const p = (platform || '').toUpperCase();
  if (p === 'TIKTOK') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.86.12V9.42a6.34 6.34 0 0 0-.86-.06 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.28 8.28 0 0 0 4.84 1.55V6.85a4.85 4.85 0 0 1-1.07-.16z" fill="#000000" />
      </svg>
    );
  }
  if (p === 'YOUTUBE') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#FF0000" />
      </svg>
    );
  }
  if (p === 'FACEBOOK') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2" />
      </svg>
    );
  }
  if (p === 'INSTAGRAM') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" fill="#E1306C" />
      </svg>
    );
  }
  return <ExternalLink className={className} />;
}

export const getInitials = (name?: string) => {
  const clean = (name || '').trim().replace(/\s*\([^)]*\)/g, '');
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (clean || 'KO').slice(0, 2).toUpperCase();
};

export const getKolAvatarSrc = (src?: string, name?: string, _id?: string) => {
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
  if (normalized.includes('xinh') || normalized.includes('đẹp')) return '/assets/kol-avatar-depxinh.jpg';
  return '';
};

function KolAvatar({
  src,
  name,
  className,
}: {
  src?: string;
  name: string;
  id?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const initials = getInitials(name);
  const resolved = getKolAvatarSrc(src, name);

  if (!resolved || failed) {
    return (
      <span
        className={`${className || 'w-10 h-10'} relative inline-flex items-center justify-center rounded-full bg-[#F3EFE6] text-[#B88E4F] font-bold text-xs border border-[#EEDFC6] select-none shrink-0 shadow-2xs`}
        title={name}
      >
        {initials}
      </span>
    );
  }

  return (
    <span className={`${className || 'w-10 h-10'} relative inline-flex items-center justify-center overflow-hidden rounded-full border border-[#EAE4D7] shrink-0`}>
      <img
        src={resolved}
        alt={name}
        className="h-full w-full object-cover"
        onError={() => setFailed(true)}
      />
    </span>
  );
}

export interface SampleRequestItem {
  sampleRequestsBlockedAt?: string | null;
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
  deadlineAt?: string;
  revisionDeadlineAt?: string;
  expectedVideoAt?: string;
  receivedAt?: string;
  shippedAt?: string;
  rejectedReason?: string;
  videoRejectionReason?: string;
  socialChannel?: { platformName: string; channelName?: string; channelUrl: string; followerCount: number } | null;
  collaboratorMetrics?: { kycStatus: string; totalFollowers: number; totalOrdersReferred: number; tierName?: string } | null;
  videoAssets?: Array<{ id: string; title: string; urlOrContent: string; status: string; createdAt?: string; rejectionReason?: string | null }>;
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

export interface AffiliateOrderItem {
  id: string;
  orderCode: string;
  createdAt: string;
  customerName: string;
  productTitle: string;
  orderTotal: number;
  commissionEarned: number;
  status: 'DELIVERED' | 'SHIPPING' | 'PROCESSING' | 'CANCELLED';
}

let lastShopKolHubSnapshot: {
  kols: PartnerKol[];
  rawConversations: any[];
  samplesMap: Record<string, SampleRequestItem[]>;
  sampleProgramStats: any;
  couponsByKolId: Record<string, CouponItem[]>;
} | null = null;
registerPrivateCacheReset(() => { lastShopKolHubSnapshot = null; });

export default function ShopKolHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const kolParam = searchParams.get('kol');
  const tabParam = searchParams.get('tab') || 'messages';
  const modeParam = searchParams.get('mode'); // 'ai-matching' or null

  const [isAiMatchingMode, setIsAiMatchingMode] = useState<boolean>(() =>
    modeParam === 'ai-matching' || tabParam === 'radar' || tabParam === 'ai-matching'
  );
  const [kols, setKols] = useState<PartnerKol[]>(() => lastShopKolHubSnapshot?.kols || []);
  const [allPlatformKols, setAllPlatformKols] = useState<PartnerKol[]>([]);
  const [selectedKolId, setSelectedKolId] = useState<string>(kolParam || '');
  const [viewMode, setViewMode] = useState<'CRM' | 'LEADERBOARD' | 'ALL_DEALS'>(
    tabParam === 'deals' ? 'ALL_DEALS' : tabParam === 'leaderboard' ? 'LEADERBOARD' : 'CRM'
  );
  const [activeTab, setActiveTab] = useState<'messages' | 'samples' | 'performance' | 'profile'>(
    (['messages', 'samples', 'performance', 'profile'].includes(tabParam) ? tabParam : (tabParam === 'collaborators' || tabParam === 'team') ? 'profile' : 'messages') as any
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState<'ALL' | 'PENDING' | 'PENDING_SAMPLE' | 'CLOSED'>('ALL');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [leaderSearch, setLeaderSearch] = useState('');
  const [leaderTier, setLeaderTier] = useState('ALL');
  const [leaderSort, setLeaderSort] = useState('REVENUE');
  const [leaderPage, setLeaderPage] = useState(1);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  // Chat & Realtime Data Cache
  const [rawConversations, setRawConversations] = useState<any[]>(() => lastShopKolHubSnapshot?.rawConversations || []);

  // Samples management
  const [samplesMap, setSamplesMap] = useState<Record<string, SampleRequestItem[]>>(() => lastShopKolHubSnapshot?.samplesMap || {});
  const sampleLoadSequence = useRef(0);
  const [loadingBackendData, setLoadingBackendData] = useState(() => !lastShopKolHubSnapshot);
  const [sampleFilter, setSampleFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'SHIPPED' | 'RECEIVED' | 'VIDEO_SUBMITTED' | 'REVISION_REQUIRED' | 'OVERDUE' | 'DELIVERY_ISSUE' | 'COMPLETED' | 'REJECTED' | 'CANCELLED'>('ALL');
  const [trackingModalItem, setTrackingModalItem] = useState<SampleRequestItem | null>(null);
  const [sampleShippingError, setSampleShippingError] = useState('');
  const [sampleGhnEnvironment, setSampleGhnEnvironment] = useState<'LIVE' | 'TEST'>('LIVE');
  useEffect(() => { setSampleShippingError(''); setSampleGhnEnvironment(trackingModalItem && (trackingModalItem.status === 'SHIPPED' || isSandboxShipment(trackingModalItem)) ? 'TEST' : 'LIVE'); }, [trackingModalItem?.id]);
  const [carrierInput] = useState('GHN');
  const [trackingCodeInput, setTrackingCodeInput] = useState('');
  const [updatingSample, setUpdatingSample] = useState(false);

  // Store Sharing & Links
  const [copiedLink, setCopiedLink] = useState(false);
  const [copyingLink, setCopyingLink] = useState(false);
  const [ownedStore, setOwnedStore] = useState<{ id: string; name: string } | null>(null);

  const [performanceRange, setPerformanceRange] = useState<'7d' | '30d' | 'month' | 'all'>('30d');
  const [kolOrders, setKolOrders] = useState<ReferralOrderItem[]>([]);
  const [kolPerformance, setKolPerformance] = useState<{ totalOrders: number; totalRevenue: number; accruedCommission: number } | null>(null);
  const [performanceError, setPerformanceError] = useState('');
  const [performancePage, setPerformancePage] = useState(1);
  const [performancePages, setPerformancePages] = useState(0);
  const [performanceStatus, setPerformanceStatus] = useState('ALL');
  const [performanceRefresh, setPerformanceRefresh] = useState(0);
  const [loadingKolOrders, setLoadingKolOrders] = useState(false);

  // Creator Discovery Directory Modal (Khám phá & Thêm KOL mới)
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
  const [showKolActionsMenu, setShowKolActionsMenu] = useState(false);
  const [copiedPartnerId, setCopiedPartnerId] = useState<string | null>(null);
  const copyPartnerId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedPartnerId(id);
    } catch { toast.error('Không sao chép được ID. Vui lòng thử lại.'); }
  };
  const kolActionsDropdownRef = useRef<HTMLDivElement>(null);
  const [discoverySearch, setDiscoverySearch] = useState('');
  const [discoveryFilter, setDiscoveryFilter] = useState('ALL');
  const [discoveryTier, setDiscoveryTier] = useState('ALL');
  const [directoryError, setDirectoryError] = useState('');
  const [directoryCreators, setDirectoryCreators] = useState<any[]>([]);
  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [connectingKolId, setConnectingKolId] = useState<string | null>(null);
  const [showExclusiveDealModal, setShowExclusiveDealModal] = useState(false);
  const [showQuickCouponModal, setShowQuickCouponModal] = useState(false);
  const [terminateModalKol, setTerminateModalKol] = useState<PartnerKol | null>(null);
  const [couponsByKolId, setCouponsByKolId] = useState<Record<string, CouponItem[]>>(() => lastShopKolHubSnapshot?.couponsByKolId || {});
  const [terminatingKolId] = useState<string | null>(null);
  const [actingCoopKolId, setActingCoopKolId] = useState<string | null>(null);

  const handleTerminateCollaboration = (kolId: string) => {
    const kolObj = kols.find((k) => k.id === kolId) || allPlatformKols.find((k) => k.id === kolId) || null;
    if (kolObj) {
      setTerminateModalKol(kolObj);
    }
  };

  const handleDecisionCooperation = async (kol: PartnerKol, accept: boolean) => {
    if (!kol.cooperationId || actingCoopKolId) return;
    setActingCoopKolId(kol.id);
    try {
      await api.patch(`/store-collaborators/${kol.cooperationId}/${accept ? 'shop-approve' : 'shop-reject'}`, {});
      window.dispatchEvent(new Event('scanms_cooperation_changed'));
      toast.success(
        accept
          ? `Đã duyệt hợp tác với ${kol.fullName}. Hai bên có thể đề xuất Deal ngay.`
          : `Đã từ chối yêu cầu hợp tác của ${kol.fullName}.`,
      );
      await loadBackendData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Không thể xử lý yêu cầu hợp tác.');
    } finally {
      setActingCoopKolId(null);
    }
  };

  const handleQuickInviteKol = async (kol: PartnerKol) => {
    if (!kol.email || actingCoopKolId) {
      toast.error('Không tìm thấy email của đối tác để gửi lời mời.');
      return;
    }
    setActingCoopKolId(kol.id);
    try {
      await api.post('/store-collaborators/invite', {
        email: kol.email,
        ...(ownedStore?.id ? { storeId: ownedStore.id } : {}),
      });
      window.dispatchEvent(new Event('scanms_cooperation_changed'));
      toast.success(`Đã gửi lời mời hợp tác tới ${kol.fullName}.`);
      await loadBackendData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Không thể gửi lời mời hợp tác.');
    } finally {
      setActingCoopKolId(null);
    }
  };

  // Click outside listener for KOL actions dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (kolActionsDropdownRef.current && !kolActionsDropdownRef.current.contains(event.target as Node)) {
        setShowKolActionsMenu(false);
      }
    };
    if (showKolActionsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showKolActionsMenu]);

  // Sync URL Params
  useEffect(() => {
    const kol = searchParams.get('kol');
    const tab = searchParams.get('tab') || 'messages';
    const mode = searchParams.get('mode');

    if (kol && kol !== selectedKolId) {
      setSelectedKolId(kol);
    }
    if (mode === 'ai-matching' || tab === 'radar' || tab === 'ai-matching') {
      setIsAiMatchingMode(true);
    } else {
      setIsAiMatchingMode(false);
      if (tab === 'deals') {
        setViewMode('ALL_DEALS');
      } else if (tab === 'leaderboard') {
        setViewMode('LEADERBOARD');
      } else if (tab === 'collaborators' || tab === 'team') {
        setViewMode('CRM');
        setActiveTab('profile');
      } else if (['messages', 'samples', 'performance', 'profile'].includes(tab)) {
        setViewMode('CRM');
        setActiveTab(tab as any);
      }
    }
  }, [searchParams, selectedKolId]);

  // Load real data from backend
  // Load real data from backend
  const loadBackendData = useCallback(async () => {
    const sequence = ++sampleLoadSequence.current;
    setLoadingBackendData(true);
    try {
// 1. Fetch conversations, sample requests, and store members in parallel
      const [sampleRes, statsRes, convsRes, membersRes]: [any, any, any, any] = await Promise.all([
        api.get('/sample-requests/shop').catch(() => []),
        api.get('/sample-requests/shop/stats').catch(() => null),
        api.get('/chat/conversations').catch(() => []),
        api.get('/store-collaborators/shop', { headers: { 'x-skip-cache': '1' } }).catch(() => ({})),
      ]);

      const parsedConvs = Array.isArray(convsRes) ? convsRes : convsRes?.data || [];
      setRawConversations(parsedConvs);
      const sampleData = sampleRes?.data || sampleRes;
      if (sequence !== sampleLoadSequence.current) return;
      if (!Array.isArray(sampleData)) throw new Error('Không đọc được danh sách hàng mẫu.');
      const sampleStatsByKol: Record<string, { total: number; pending: number; completed: number }> = {};
      const requestKols: PartnerKol[] = [];
      let grouped: Record<string, SampleRequestItem[]> = {};

      if (Array.isArray(sampleData)) {
        grouped = {};
        sampleData.forEach((item: any) => {
          const kolId = item.collaboratorId || item.collaborator?.id || 'kol-unknown';
          const transformed: SampleRequestItem = {
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
          if (!grouped[kolId]) grouped[kolId] = [];
          if (!grouped[kolId].some((s) => s.id === transformed.id)) {
            grouped[kolId].unshift(transformed);
          }
          const currentStats = sampleStatsByKol[kolId] || (sampleStatsByKol[kolId] = { total: 0, pending: 0, completed: 0 });
          currentStats.total += 1;
          if (item.status === 'PENDING') currentStats.pending += 1;
          if (item.status === 'COMPLETED') currentStats.completed += 1;
        });
        setSamplesMap(grouped);

        sampleData
          .filter((item: any) => item.collaborator?.id)
          .forEach((item: any) => {
            const creator = item.collaborator;
            const profile = creator.collaboratorProfile || {};
            const channel = item.socialChannel;
            const requestStats = sampleStatsByKol[creator.id] || { total: 0, pending: 0, completed: 0 };
            requestKols.push({
              id: creator.id,
              fullName: creator.fullName || 'Nhà sáng tạo SCANMS',
              email: creator.email || '',
              phone: creator.phoneNumber || undefined,
              avatarUrl: profile.avatarUrl || creator.avatarUrl || undefined,
              tier: normalizePartnerTier(profile.tier),
              handle: channel?.channelName ? `@${channel.channelName.trim().replace(/^@+/, '')}` : undefined,
              primaryChannel: channel ? {
                platform: (channel.platformName?.toUpperCase() as any) || 'TIKTOK',
                url: channel.channelUrl || '',
                followers: Number(channel.followerCount ?? profile.totalFollowers ?? 0),
              engagementRate: channel.engagementRate,
              } : undefined,
              kycStatus: profile.kycStatus || 'PENDING',
              stats: {
                totalRevenue: 0,
                totalOrders: 0,
                sampleRequestsCount: requestStats.total,
                pendingSamplesCount: requestStats.pending,
                completedVideosCount: requestStats.completed,
              },
            });
          });
      }

      // 2. Load StoreCollaborator buckets (APPROVED + PENDING + REJECTED/TERMINATED/BLOCKED)
      const membersBody = membersRes?.data || membersRes;
      if (membersBody?.store?.id) {
        setOwnedStore(membersBody.store);
        void couponService
          .getStoreCoupons(membersBody.store.id, { limit: 100 })
          .then((res: any) => {
            if (!isMountedRef.current) return;
            const rows: CouponItem[] = res?.data?.data || res?.data?.items || res?.items || res?.data || res || [];
            if (!Array.isArray(rows)) return;
            const groupedCoupons: Record<string, CouponItem[]> = {};
            for (const c of rows) {
              const cid = c.collaboratorId || c.collaborator?.id;
              if (!cid) continue;
              if (!groupedCoupons[cid]) groupedCoupons[cid] = [];
              groupedCoupons[cid].push(c);
            }
            setCouponsByKolId(groupedCoupons);
            if (lastShopKolHubSnapshot) {
              lastShopKolHubSnapshot.couponsByKolId = groupedCoupons;
            }
          })
          .catch(() => undefined);
      }

      const mapStoreRelationToPartner = (
        m: any,
        idx: number,
        forcedStatus?: PartnerKol['cooperationStatus'],
      ): PartnerKol => {
        const c = m.collaborator || {};
        const profile = c.collaboratorProfile || {};
        const channel = c.socialChannels?.[0];
        const cid = c.id || m.collaboratorId || `collab-${idx}`;
        return {
          id: cid,
          fullName: c.fullName || 'Nhà Sáng Tạo SCANMS',
          email: c.email || '',
          phone: c.phoneNumber || undefined,
          avatarUrl: profile.avatarUrl || c.avatarUrl || undefined,
          tier: normalizePartnerTier(profile.tier),
          handle: channel?.channelName ? `@${channel.channelName.trim().replace(/^@+/, '')}` : undefined,
          primaryChannel: channel ? {
            platform: channel.platformName?.toUpperCase() as any,
            url: channel.channelUrl || '',
            followers: Number(channel.followerCount ?? profile.totalFollowers ?? 0),
            engagementRate: channel.engagementRate,
          } : undefined,
          socialChannels: (c.socialChannels || []).map((sc: any) => ({
            platform: sc.platformName?.toUpperCase() as any,
            url: sc.channelUrl,
            handle: sc.channelName ? `@${sc.channelName.trim().replace(/^@+/, '')}` : undefined,
            followers: Number(sc.followerCount ?? profile.totalFollowers ?? 0),
            isVerified: sc.isVerified,
            engagementRate: sc.engagementRate,
          })),
          kycStatus: profile.kycStatus || undefined,
          commissionRate: undefined,
          statsAvailable: Boolean(m.stats),
          stats: {
            totalRevenue: Number(m.stats?.totalRevenue ?? 0),
            totalOrders: Number(m.stats?.totalOrders ?? 0),
            sampleRequestsCount: sampleStatsByKol[cid]?.total || 0,
            pendingSamplesCount: sampleStatsByKol[cid]?.pending || 0,
            completedVideosCount: Number(m.stats?.completedVideosCount ?? sampleStatsByKol[cid]?.completed ?? 0),
          },
          cooperationId: m.id,
          cooperationStatus: forcedStatus || m.status,
          requestedByKol: Boolean(m.requestedByKol),
          cooperationNote: m.note ?? null,
          cooperationUpdatedAt: m.updatedAt || m.createdAt,
          hasCooperationHistory: Boolean(m.hasHistory),
        };
      };

      const backendKols: PartnerKol[] = Array.isArray(membersBody?.members)
        ? membersBody.members.map((m: any, idx: number) => mapStoreRelationToPartner(m, idx, 'APPROVED'))
        : [];
      const pendingCoopKols: PartnerKol[] = Array.isArray(membersBody?.pendingRequests)
        ? membersBody.pendingRequests.map((m: any, idx: number) => mapStoreRelationToPartner(m, idx, 'PENDING'))
        : [];
      const closedCoopKols: PartnerKol[] = Array.isArray(membersBody?.closedRelations)
        ? membersBody.closedRelations.map((m: any, idx: number) => mapStoreRelationToPartner(m, idx))
        : [];

      const coopByKolId = new Map<string, PartnerKol>(
        [...backendKols, ...pendingCoopKols, ...closedCoopKols].map((k) => [k.id, k]),
      );

      // 3. Load active verified creators from backend database
      let dbKols: PartnerKol[] = [];
      try {
        const creatorsRes: any = await api.get('/chat/search-collaborators', { headers: { 'x-skip-cache': '1' } });
        const creatorsData = creatorsRes?.data || creatorsRes;
        if (Array.isArray(creatorsData) && creatorsData.length > 0) {
          dbKols = creatorsData.map((c: any) => {
            const profile = c.collaboratorProfile || {};
            const channel = c.socialChannels?.[0];
            return {
              id: c.id,
              fullName: c.fullName || 'Nhà Sáng Tạo SCANMS',
              email: c.email || '',
              phone: c.phoneNumber || '',
              avatarUrl: profile.avatarUrl || c.avatarUrl || undefined,
              tier: normalizePartnerTier(profile.tier),
              handle: channel?.channelName ? `@${channel.channelName.trim().replace(/^@+/, '')}` : undefined,
              primaryChannel: channel
                ? {
                    platform: channel.platformName?.toUpperCase() as any,
                    url: channel.channelUrl || '',
                    followers: Number(channel.followerCount ?? profile.totalFollowers ?? 0),
              engagementRate: channel.engagementRate,
                  }
                : undefined,
              socialChannels: (c.socialChannels || []).map((sc: any) => ({
                platform: sc.platformName?.toUpperCase() as any,
                url: sc.channelUrl,
                handle: sc.channelName ? `@${sc.channelName.trim().replace(/^@+/, '')}` : undefined,
                followers: Number(sc.followerCount ?? profile.totalFollowers ?? 0),
                isVerified: sc.isVerified,
                engagementRate: sc.engagementRate,
              })),
              kycStatus: profile.kycStatus || undefined,
              commissionRate: undefined,
              stats: {
                totalRevenue: Number(c.stats?.totalRevenue ?? 0),
                totalOrders: Number(c.stats?.totalOrders ?? 0),
                sampleRequestsCount: sampleStatsByKol[c.id]?.total || 0,
                pendingSamplesCount: sampleStatsByKol[c.id]?.pending || 0,
                completedVideosCount: sampleStatsByKol[c.id]?.completed || 0,
              },
            };
          });
        }
      } catch {
        dbKols = [];
      }

      // 4. Load active conversations with collaborators (real chat history)
      const convsList = Array.isArray(convsRes) ? convsRes : convsRes?.data || [];
      const convKols: PartnerKol[] = [];

      convsList.forEach((conv: any) => {
        const c = conv.collaborator;
        if (!c || !c.id) return;
        const profile = c.collaboratorProfile || {};
        const channel = c.socialChannels?.[0];
        const lastMsg = conv.chatMessages?.[0];
        const lastText = getChatMessagePreview(lastMsg?.messageText, lastMsg?.mediaName);
        const lastDate = conv.lastMessageAt || lastMsg?.createdAt || conv.updatedAt || conv.createdAt;
        const lastTimestamp = lastDate ? new Date(lastDate).getTime() : 0;
        const unreadCount = Number(conv._count?.chatMessages || (lastMsg && !lastMsg.isRead ? 1 : 0));

        convKols.push({
          id: c.id,
          fullName: c.fullName || 'Nhà Sáng Tạo SCANMS',
          email: c.email || '',
          phone: c.phoneNumber || '',
          avatarUrl: profile.avatarUrl || c.avatarUrl || undefined,
          tier: normalizePartnerTier(profile.tier),
          handle: channel?.channelName ? `@${channel.channelName.trim().replace(/^@+/, '')}` : undefined,
          primaryChannel: channel ? {
            platform: channel.platformName?.toUpperCase() as any,
            url: channel.channelUrl || '',
            followers: Number(channel.followerCount ?? profile.totalFollowers ?? 0),
              engagementRate: channel.engagementRate,
          } : undefined,
          socialChannels: (c.socialChannels || []).map((sc: any) => ({
            platform: sc.platformName?.toUpperCase() as any,
            url: sc.channelUrl,
            handle: sc.channelName ? `@${sc.channelName.trim().replace(/^@+/, '')}` : undefined,
            followers: Number(sc.followerCount ?? profile.totalFollowers ?? 0),
            isVerified: sc.isVerified,
                engagementRate: sc.engagementRate,
          })),
          kycStatus: profile.kycStatus || undefined,
          commissionRate: undefined,
          stats: {
            totalRevenue: Number(c.stats?.totalRevenue ?? 0),
            totalOrders: Number(c.stats?.totalOrders ?? 0),
            sampleRequestsCount: sampleStatsByKol[c.id]?.total || 0,
            pendingSamplesCount: sampleStatsByKol[c.id]?.pending || 0,
            completedVideosCount: sampleStatsByKol[c.id]?.completed || 0,
          },
          lastMessage: lastText,
          lastMessageTime: formatConvTime(lastDate),
          lastMessageTimestamp: lastTimestamp,
          unreadCount,
        });
      });

      // 4. Merge all active collaborators (Chat Conversations + Sample Requests + Store Relations)
      const mergedMap = new Map<string, PartnerKol>();
      const measuredMembers = new Map(backendKols.map(member => [member.id, member]));
      const upsertPartner = (candidate: PartnerKol) => {
        const existing = mergedMap.get(candidate.id);
        if (!existing) {
          mergedMap.set(candidate.id, candidate);
          return;
        }
        mergedMap.set(candidate.id, {
          ...candidate,
          ...existing,
          email: existing.email || candidate.email,
          phone: existing.phone || candidate.phone,
          avatarUrl: existing.avatarUrl || candidate.avatarUrl,
          tier: existing.tier || candidate.tier,
          handle: existing.handle || candidate.handle,
          primaryChannel: existing.primaryChannel || candidate.primaryChannel,
          socialChannels: existing.socialChannels?.length ? existing.socialChannels : candidate.socialChannels,
          kycStatus: existing.kycStatus || candidate.kycStatus,
          statsAvailable: existing.statsAvailable || candidate.statsAvailable,
          stats: {
            totalRevenue: Math.max(existing.stats.totalRevenue, candidate.stats.totalRevenue),
            totalOrders: Math.max(existing.stats.totalOrders, candidate.stats.totalOrders),
            sampleRequestsCount: Math.max(existing.stats.sampleRequestsCount, candidate.stats.sampleRequestsCount),
            pendingSamplesCount: Math.max(existing.stats.pendingSamplesCount, candidate.stats.pendingSamplesCount),
            completedVideosCount: Math.max(existing.stats.completedVideosCount, candidate.stats.completedVideosCount),
          },
          cooperationId: candidate.cooperationId || existing.cooperationId,
          cooperationStatus: candidate.cooperationStatus || existing.cooperationStatus,
          requestedByKol: candidate.requestedByKol ?? existing.requestedByKol,
          cooperationNote: candidate.cooperationNote ?? existing.cooperationNote,
          cooperationUpdatedAt: candidate.cooperationUpdatedAt || existing.cooperationUpdatedAt,
          hasCooperationHistory: Boolean(existing.hasCooperationHistory || candidate.hasCooperationHistory),
        });
      };

      // Active chats
      convKols.forEach((k) => {
        if ((k.lastMessageTimestamp ?? 0) > 0 || (k.lastMessage && k.lastMessage.trim().length > 0)) {
          upsertPartner({ ...k, hasCooperationHistory: true });
        }
      });

      // Sample requests
      requestKols.forEach((k) => {
        if (k.stats.pendingSamplesCount > 0 || k.stats.sampleRequestsCount > 0) {
          upsertPartner({ ...k, hasCooperationHistory: true });
        }
      });

      // Approved, Pending & Closed StoreCollaborator relations (never lose AI Radar invites or accepted KOLs!)
      [...backendKols, ...pendingCoopKols, ...closedCoopKols].forEach(upsertPartner);

      const currentSearchParams = new URLSearchParams(window.location.search);
      const currentKolParam = currentSearchParams.get('kol');
      const currentTab = currentSearchParams.get('tab') || 'messages';

      if (currentKolParam && !mergedMap.has(currentKolParam)) {
        const found = [...dbKols, ...backendKols, ...pendingCoopKols, ...closedCoopKols].find(
          (k) => k.id === currentKolParam,
        );
        if (found) mergedMap.set(found.id, found);
      }

      // Enrich final list with latest StoreCollaborator state & sort by latest interaction
      const allKols = Array.from(mergedMap.values())
        .map((kol) => {
          const coop = coopByKolId.get(kol.id);
          const measured = measuredMembers.get(kol.id);
          const hasHistory = Boolean(
            kol.hasCooperationHistory ||
              coop?.hasCooperationHistory ||
              (kol.lastMessageTimestamp ?? 0) > 0 ||
              kol.stats.sampleRequestsCount > 0,
          );
          return {
            ...kol,
            stats: measured?.stats || kol.stats,
            statsAvailable: measured?.statsAvailable || kol.statsAvailable || false,
            tier: measured?.tier || kol.tier,
            cooperationId: coop?.cooperationId || kol.cooperationId,
            cooperationStatus: coop?.cooperationStatus || kol.cooperationStatus,
            requestedByKol: coop?.requestedByKol ?? kol.requestedByKol,
            cooperationNote: coop?.cooperationNote ?? kol.cooperationNote,
            cooperationUpdatedAt: coop?.cooperationUpdatedAt || kol.cooperationUpdatedAt,
            hasCooperationHistory: hasHistory,
          };
        })
        .sort((a, b) => {
          const timeA = Math.max(a.lastMessageTimestamp || 0, Date.parse(a.cooperationUpdatedAt || '') || 0);
          const timeB = Math.max(b.lastMessageTimestamp || 0, Date.parse(b.cooperationUpdatedAt || '') || 0);
          return timeB - timeA;
        });

      setKols(allKols);
      lastShopKolHubSnapshot = {
        kols: allKols,
        rawConversations: parsedConvs,
        samplesMap: grouped,
        sampleProgramStats: statsRes?.data || statsRes || null,
        couponsByKolId: lastShopKolHubSnapshot?.couponsByKolId || {},
      };
      setAllPlatformKols(Array.from(new Map([...dbKols, ...backendKols].map(kol => [kol.id, kol])).values()).map(kol => {
        const coop = coopByKolId.get(kol.id);
        return {
          ...kol,
          stats: measuredMembers.get(kol.id)?.stats || kol.stats,
          statsAvailable: measuredMembers.get(kol.id)?.statsAvailable || false,
          tier: measuredMembers.get(kol.id)?.tier || kol.tier,
          cooperationId: coop?.cooperationId || kol.cooperationId,
          cooperationStatus: coop?.cooperationStatus || kol.cooperationStatus,
          requestedByKol: coop?.requestedByKol ?? kol.requestedByKol,
        };
      }));

      if (!isMountedRef.current || sequence !== sampleLoadSequence.current) return;

      if (allKols.length > 0) {
        const visibleDefault = allKols.find(
          (k) =>
            k.cooperationStatus !== 'REJECTED' &&
            k.cooperationStatus !== 'TERMINATED' &&
            k.cooperationStatus !== 'BLOCKED' ||
            k.hasCooperationHistory,
        );
        const targetKolId =
          currentKolParam && allKols.some((k) => k.id === currentKolParam)
            ? currentKolParam
            : (visibleDefault?.id || allKols[0].id);
        setSelectedKolId(targetKolId);

        const targetObj = allKols.find((k) => k.id === targetKolId);
        if (
          currentKolParam &&
          targetObj &&
          (targetObj.cooperationStatus === 'REJECTED' ||
            targetObj.cooperationStatus === 'TERMINATED' ||
            targetObj.cooperationStatus === 'BLOCKED') &&
          !targetObj.hasCooperationHistory
        ) {
          setFilterTag('CLOSED');
        }

        // Anti Bounce-Back: CHỈ đồng bộ kol vào URL nếu đang ở tab CRM (messages, samples, performance, profile).
        const isCrmTab = ['messages', 'samples', 'performance', 'profile'].includes(currentTab);
        if (isCrmTab && !currentKolParam) {
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set('kol', targetKolId);
            if (!next.get('tab')) next.set('tab', currentTab);
            return next;
          }, { replace: true });
        }
      } else {
        setSelectedKolId('');
      }
    } catch {
      if (!isMountedRef.current || sequence !== sampleLoadSequence.current) return;
      setKols([]);
      setSamplesMap({});
      setTrackingModalItem(null);
      toast.error('Chưa tải được thông tin nhận hàng mới nhất. Vui lòng làm mới danh sách mẫu.');
    } finally {
      if (isMountedRef.current) {
        setLoadingBackendData(false);
      }
    }
  }, []);

  useEffect(() => {
    loadBackendData();
    const onCoopChanged = () => void loadBackendData();
    window.addEventListener('scanms_cooperation_changed', onCoopChanged);
    return () => window.removeEventListener('scanms_cooperation_changed', onCoopChanged);
  }, [loadBackendData]);

  useEffect(() => {
    setTrackingModalItem(current => current ? Object.values(samplesMap).flat().find(item => item.id === current.id) || null : null);
  }, [samplesMap]);

  // Selected Kol Object
  const selectedKol = useMemo(() => {
    return kols.find((k) => k.id === selectedKolId) || kols[0] || null;
  }, [kols, selectedKolId]);

  useEffect(() => {
    const openDealParam = searchParams.get('openDeal');
    if (openDealParam !== '1' || !selectedKol) return;
    const isClosed =
      selectedKol.cooperationStatus === 'REJECTED' ||
      selectedKol.cooperationStatus === 'TERMINATED' ||
      selectedKol.cooperationStatus === 'BLOCKED';
    if (!isClosed) {
      setIsAiMatchingMode(false);
      setViewMode('CRM');
      setShowExclusiveDealModal(true);
    }
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('openDeal');
      return next;
    }, { replace: true });
  }, [searchParams, selectedKol, setSearchParams]);

  const kolOrdersCacheRef = useRef<
    Record<string, { items: any[]; summary: { totalOrders: number; totalRevenue: number; accruedCommission: number } | null; totalPages: number; timestamp: number }>
  >({});

  useEffect(() => {
    let active = true;
    setPerformanceError('');
    if (activeTab === 'performance' && selectedKol?.id) {
      const cacheKey = `${selectedKol.id}:${performanceRange}:${performanceStatus}:${performancePage}:${performanceRefresh}`;
      const cached = kolOrdersCacheRef.current[cacheKey];
      const now = Date.now();
      if (cached && now - cached.timestamp < 180000) {
        setKolOrders(cached.items);
        setKolPerformance(cached.summary);
        setPerformancePages(cached.totalPages);
        setLoadingKolOrders(false);
        return;
      }
      setLoadingKolOrders(true);
      analyticsService
        .getShopKolOrders(selectedKol.id, { limit: 10, page: performancePage, period: performanceRange, status: performanceStatus }, true)
        .then((res) => {
          if (!active) return;
          const items = res?.items || [];
          const summary = res?.summary ?? null;
          const totalPages = res?.totalPages ?? 0;
          kolOrdersCacheRef.current[cacheKey] = { items, summary, totalPages, timestamp: Date.now() };
          setKolOrders(items);
          setKolPerformance(summary);
          setPerformancePages(totalPages);
        })
        .catch((err) => {
          if (!active) return;
          setPerformanceError(err?.message || 'Không tải được hiệu suất KOC.');
          if (!cached) setKolOrders([]);
        })
        .finally(() => {
          if (active) setLoadingKolOrders(false);
        });
    }
    return () => { active = false; };
  }, [activeTab, selectedKol?.id, performancePage, performanceRange, performanceStatus, performanceRefresh]);

  useEffect(() => { setPerformancePage(1); setPerformanceStatus('ALL'); }, [selectedKol?.id]);

  // Multi-channel list for selected KOL
  const allChannels = useMemo(() => {
    if (!selectedKol) return [];
    const list: Array<{ platform: string; url: string; handle: string; followers: number }> = [];
    if (selectedKol.socialChannels && selectedKol.socialChannels.length > 0) {
      selectedKol.socialChannels.forEach((sc) => {
        list.push({
          platform: sc.platform,
          url: sc.url,
          handle: sc.handle || selectedKol.handle || '@kenh',
          followers: sc.followers,
        });
      });
    } else if (selectedKol.primaryChannel) {
      list.push({
        platform: selectedKol.primaryChannel.platform,
        url: selectedKol.primaryChannel.url,
        handle: selectedKol.handle || '@kenh',
        followers: selectedKol.primaryChannel.followers,
      });
    }
    return list;
  }, [selectedKol]);

  // Filtered KOL List
  const filteredKols = useMemo(() => {
    return kols.filter((kol) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        kol.fullName.toLowerCase().includes(q) ||
        kol.email.toLowerCase().includes(q) ||
        (kol.handle && kol.handle.toLowerCase().includes(q));

      if (!matchSearch) return false;

      const isClosed =
        kol.cooperationStatus === 'REJECTED' ||
        kol.cooperationStatus === 'TERMINATED' ||
        kol.cooperationStatus === 'BLOCKED';

      if (filterTag === 'PENDING') {
        return kol.cooperationStatus === 'PENDING';
      }
      if (filterTag === 'PENDING_SAMPLE') {
        const kolSamples = samplesMap[kol.id] || [];
        return kolSamples.some((s) => s.status === 'PENDING') || kol.stats.pendingSamplesCount > 0;
      }
      if (filterTag === 'CLOSED') {
        return isClosed;
      }
      // ALL: hide unhistoried REJECTED / TERMINATED / BLOCKED from active inbox per A3
      if (isClosed && !kol.hasCooperationHistory) {
        return false;
      }
      return true;
    });
  }, [kols, searchQuery, filterTag, samplesMap]);

  const pendingCoopCount = useMemo(
    () => kols.filter((k) => k.cooperationStatus === 'PENDING').length,
    [kols],
  );
  const closedCoopCount = useMemo(
    () =>
      kols.filter(
        (k) =>
          k.cooperationStatus === 'REJECTED' ||
          k.cooperationStatus === 'TERMINATED' ||
          k.cooperationStatus === 'BLOCKED',
      ).length,
    [kols],
  );

  const sortedLeaderboardKols = useMemo(() => {
    const source = allPlatformKols.length > 0 ? allPlatformKols : kols;
    return source.filter(kol => (leaderTier === 'ALL' || normalizePartnerTier(kol.tier) === leaderTier) && `${kol.fullName} ${kol.email} ${kol.handle || ''}`.toLocaleLowerCase('vi').includes(leaderSearch.trim().toLocaleLowerCase('vi'))).sort((a,b) => Number(!!b.statsAvailable)-Number(!!a.statsAvailable) || (leaderSort === 'ORDERS' ? b.stats.totalOrders-a.stats.totalOrders : b.stats.totalRevenue-a.stats.totalRevenue));
  }, [allPlatformKols, kols, leaderSearch, leaderTier, leaderSort]);

  useEffect(() => { setLeaderPage(page => Math.min(page, Math.max(1, Math.ceil(sortedLeaderboardKols.length / 10)))); }, [sortedLeaderboardKols.length]);

  // Selected KOL Samples
  const currentKolSamples = useMemo(() => {
    const list = samplesMap[selectedKol?.id] || [];
    if (sampleFilter === 'ALL') return list;
    return list.filter((s) => sampleDisplayStatus(s) === sampleFilter);
  }, [samplesMap, selectedKol, sampleFilter]);

  const pendingSampleCount = kols.reduce((total, kol) => total + Math.max(
    (samplesMap[kol.id] || []).filter(sample => sample.status === 'PENDING').length,
    kol.stats.pendingSamplesCount || 0,
  ), 0);
  // Handler: Select KOL
  const setAiMatchingMode = (enabled: boolean) => {
    setIsAiMatchingMode(enabled);
    const params = new URLSearchParams(searchParams);
    if (enabled) {
      params.set('tab', 'radar');
      params.delete('mode');
    } else {
      setViewMode('CRM');
      if (params.get('tab') === 'radar') {
        params.set('tab', 'messages');
      }
      params.delete('mode');
    }
    setSearchParams(params, { replace: true });
  };

  const handleSelectKol = (kolId: string) => {
    setSelectedKolId(kolId);
    setSearchParams(
      {
        kol: kolId,
        tab: activeTab,
      },
      { replace: true }
    );
  };

  const openKolProfile = (kolId: string) => {
    setSelectedKolId(kolId);
    setActiveTab('profile');
    setSearchParams(
      { kol: kolId, tab: 'profile' },
      { replace: true }
    );
  };

  // Handler: Change Tab
  const handleTabChange = (tabId: 'messages' | 'samples' | 'performance' | 'profile' | 'deals') => {
    if (tabId === 'deals') {
      setViewMode('ALL_DEALS');
      setSearchParams(
        {
          tab: 'deals',
        },
        { replace: true }
      );
      return;
    }
    setViewMode('CRM');
    setActiveTab(tabId);
    setSearchParams(
      {
        kol: selectedKolId,
        tab: tabId,
      },
      { replace: true }
    );
  };

  // Handler: Approve Sample Request
  const handleApproveSample = async (sampleId: string) => {
    try {
      await api.patch(`/sample-requests/${sampleId}/approve`, {});
      toast.success('Đã duyệt đơn gửi hàng mẫu cho KOL!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể duyệt yêu cầu mẫu.');
      return;
    }

    setSamplesMap((prev) => {
      const copy = { ...prev };
      Object.keys(copy).forEach((k) => {
        copy[k] = copy[k].map((item) => (item.id === sampleId ? { ...item, status: 'APPROVED' } : item));
      });
      return copy;
    });
  };

  // Handler: Reject Sample Request
  const handleRejectSample = async (sampleId: string) => {
    const rejectedReason = window.prompt('Nhập lý do từ chối yêu cầu mẫu:');
    if (!rejectedReason?.trim()) return;
    try {
      await api.patch(`/sample-requests/${sampleId}/reject`, { rejectedReason: rejectedReason.trim() });
      toast.info('Đã từ chối yêu cầu gửi hàng mẫu');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể từ chối yêu cầu mẫu.');
      return;
    }

    setSamplesMap((prev) => {
      const copy = { ...prev };
      Object.keys(copy).forEach((k) => {
        copy[k] = copy[k].map((item) => (item.id === sampleId ? { ...item, status: 'REJECTED' } : item));
      });
      return copy;
    });
  };

  const handleReviewSampleVideo = async (sample: SampleRequestItem, status: 'APPROVED' | 'REJECTED') => {
    const asset = sample.videoAssets?.find((item) => item.status === 'PENDING');
    if (!asset) {
      toast.error('Không tìm thấy video đang chờ kiểm duyệt.');
      return;
    }
    const rejectionReason = status === 'REJECTED'
      ? window.prompt('Nhập lý do cần chỉnh sửa video:')?.trim()
      : undefined;
    if (status === 'REJECTED' && !rejectionReason) return;
    try {
      await api.patch(`/media/${asset.id}/review`, { status, rejectionReason });
      toast.success(status === 'APPROVED' ? 'Đã nghiệm thu video và hoàn tất yêu cầu mẫu.' : 'Đã gửi yêu cầu chỉnh sửa video cho KOL.');
      await loadBackendData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể cập nhật kết quả kiểm duyệt video.');
    }
  };

  // Handler: Submit Shipping Tracking
  const handleSaveTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingModalItem || (carrierInput !== 'GHN' && !trackingCodeInput.trim())) return;

    setUpdatingSample(true);
    setSampleShippingError('');
    let savedTrackingCode = trackingCodeInput.trim();
    try {
      if (carrierInput === 'GHN') {
        const response: any = await api.post(`/shipping/ghn/create-sample/${trackingModalItem.id}`, { environment: sampleGhnEnvironment });
        const result = response?.data?.data || response?.data || response;
        savedTrackingCode = result.trackingNumber;
        if (sampleGhnEnvironment === 'TEST') {
          toast.success(`${result.reused ? 'Dùng lại mã' : 'Đã tạo mã'} GHN sandbox: ${savedTrackingCode}.`);
          setTrackingModalItem(null);
          await loadBackendData();
          return;
        }
      } else {
        await api.patch(`/sample-requests/${trackingModalItem.id}/ship`, {
          carrier: carrierInput,
          trackingNumber: savedTrackingCode,
        });
      }
      toast.success('Đã cập nhật mã vận đơn và chuyển sang trạng thái Đang giao hàng!');
    } catch (err: any) {
      setSampleShippingError(String(err?.response?.data?.message || err?.message || 'Không thể cập nhật mã vận đơn.'));
      setUpdatingSample(false);
      return;
    } finally {
      setUpdatingSample(false);
    }

    setSamplesMap((prev) => {
      const copy = { ...prev };
      Object.keys(copy).forEach((k) => {
        copy[k] = copy[k].map((item) =>
          item.id === trackingModalItem.id
            ? {
                ...item,
                status: 'SHIPPED',
                carrier: carrierInput,
                trackingCode: savedTrackingCode,
              }
            : item
        );
      });
      return copy;
    });
    setTrackingModalItem(null);
    setTrackingCodeInput('');
    await loadBackendData();
  };

  // Copy Store Invite Link
  const handleCopyInviteLink = async () => {
    if (copyingLink) return;
    setCopyingLink(true);
    setCopiedLink(false);
    try {
      const response: any = await api.get('/stores/my-store');
      const store = response?.data || response;
      if (!store?.slug) throw new Error('Gian hàng chưa có đường dẫn công khai để chia sẻ.');
      const link = publicWebsiteUrl(`/shop/${encodeURIComponent(store.slug)}`);
      if (!navigator.clipboard?.writeText) throw new Error('Trình duyệt không hỗ trợ sao chép tự động. Hãy chọn và chép liên kết bên dưới.');
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      toast.success('Đã sao chép trang gian hàng trên SCANMS.');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (error) {
      toast.error(error instanceof DOMException ? 'Trình duyệt chưa cho phép sao chép. Hãy chọn và chép liên kết bên dưới.' : error instanceof Error ? error.message : 'Không sao chép được. Bạn có thể chọn và chép liên kết bên dưới.');
    } finally {
      setCopyingLink(false);
    }
  };

  // Load full creators directory from DB
  const loadDirectoryCreators = useCallback(async (q?: string) => {
    setLoadingDirectory(true);
    setDirectoryError('');
    try {
      const res: any = await api.get('/chat/search-collaborators', { params: q ? { q } : {} });
      const data = res?.data || res;
      if (Array.isArray(data)) {
        setDirectoryCreators(data);
      }
    } catch (err) {
      console.error('Lỗi tải danh bạ KOL:', err);
      setDirectoryError('Không tải được danh bạ nhà sáng tạo. Vui lòng thử lại.');
    } finally {
      setLoadingDirectory(false);
    }
  }, []);

  // When opening discovery modal, load creators
  useEffect(() => {
    if (showDiscoveryModal) {
      loadDirectoryCreators(discoverySearch);
    }
  }, [showDiscoveryModal, loadDirectoryCreators, discoverySearch]);

  // Connect creator from directory
  const handleConnectCreator = async (creator: any) => {
    setConnectingKolId(creator.id);
    try {
      await api.post('/chat/conversations', {
        collaboratorId: creator.id,
      });

      const profile = creator.collaboratorProfile || {};
      const channel = creator.socialChannels?.[0];
      const newPartner: PartnerKol = {
        id: creator.id,
        fullName: creator.fullName || 'Nhà Sáng Tạo SCANMS',
        email: creator.email || '',
        phone: creator.phoneNumber || '',
        avatarUrl: profile.avatarUrl || creator.avatarUrl || undefined,
        tier: normalizePartnerTier(profile.tier),
        handle: channel?.channelName ? `@${channel.channelName.trim().replace(/^@+/, '')}` : undefined,
        primaryChannel: channel
          ? {
              platform: channel.platformName?.toUpperCase() as any,
              url: channel.channelUrl || '',
              followers: Number(channel.followerCount ?? profile.totalFollowers ?? 0),
              engagementRate: channel.engagementRate,
            }
          : undefined,
        socialChannels: (creator.socialChannels || []).map((sc: any) => ({
          platform: sc.platformName?.toUpperCase() as any,
          url: sc.channelUrl,
          handle: sc.channelName ? `@${sc.channelName.trim().replace(/^@+/, '')}` : undefined,
          followers: Number(sc.followerCount ?? profile.totalFollowers ?? 0),
          isVerified: sc.isVerified,
                engagementRate: sc.engagementRate,
        })),
        kycStatus: profile.kycStatus || undefined,
        commissionRate: undefined,
        stats: {
          totalRevenue: 0,
          totalOrders: 0,
          sampleRequestsCount: 0,
          pendingSamplesCount: 0,
          completedVideosCount: 0,
        },
      };

      setKols((prev) => {
        const exists = prev.some((k) => k.id === creator.id);
        if (exists) return prev;
        return [newPartner, ...prev];
      });

      setSelectedKolId(creator.id);
      setActiveTab('messages');
      setSearchParams({ kol: creator.id, tab: 'messages' }, { replace: true });
      setShowDiscoveryModal(false);
      toast.success(`Đã kết nối và mở hộp thoại trao đổi với ${creator.fullName}!`);
    } catch (err) {
      console.error('Lỗi khi kết nối với KOL:', err);
      toast.error('Không thể kết nối với nhà sáng tạo lúc này. Vui lòng thử lại!');
    } finally {
      setConnectingKolId(null);
    }
  };

  // Filtered creators in discovery directory
  const filteredDirectoryCreators = useMemo(() => {
    return directoryCreators.filter((creator) => {
      const q = discoverySearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        creator.fullName?.toLowerCase().includes(q) ||
        creator.email?.toLowerCase().includes(q) ||
        creator.phoneNumber?.includes(q) ||
        (creator.socialChannels || []).some((sc: any) =>
          sc.channelName?.toLowerCase().includes(q)
        );

      if (!matchSearch) return false;

      const matchTier = discoveryTier === 'ALL' || normalizePartnerTier(creator.collaboratorProfile?.tier) === discoveryTier;
      const matchPlatform = discoveryFilter === 'ALL' || (creator.socialChannels || []).some(
        (sc: any) => sc.platformName?.toUpperCase() === discoveryFilter
      );
      return matchTier && matchPlatform;
    });
  }, [directoryCreators, discoverySearch, discoveryFilter, discoveryTier]);

  const discoveryModal = showDiscoveryModal && createPortal(
        <div
          className="creator-directory-overlay fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-in fade-in-50 duration-200"
          onClick={() => setShowDiscoveryModal(false)}
        >
          <div
            className="creator-directory bg-white border border-[#EAE4D7] rounded-2xl w-full max-w-4xl max-h-[84dvh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="creator-directory-title"
            onKeyDown={event => { if (event.key === 'Escape') setShowDiscoveryModal(false); }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="creator-directory-header shrink-0 px-4 py-4 sm:px-5 border-b border-[#EAE4D7] bg-white flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F]"><Users className="h-5 w-5" /></span>
                <div className="min-w-0">
                <h3 id="creator-directory-title" className="m-0 text-lg font-bold text-[#1A1612]">
                  Khám phá nhà sáng tạo
                </h3>
                <p className="text-xs text-[#7D715E] mt-0.5">
                  Tìm đối tác phù hợp và kết nối hợp tác.
                </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDiscoveryModal(false)}
                className="w-8 h-8 shrink-0 rounded-lg border border-[#EAE4D7] flex items-center justify-center text-[#7D715E] hover:bg-[#FBF5EB] cursor-pointer transition"
                aria-label="Đóng danh bạ nhà sáng tạo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="creator-directory-filters px-4 py-3 sm:px-5 border-b border-[#EAE4D7] bg-white grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_155px_145px] sm:items-end">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7D715E]" />
                <input
                  type="text"
                  placeholder="Tìm tên, email, số điện thoại hoặc tên kênh…"
                  aria-label="Tìm nhà sáng tạo"
                  value={discoverySearch}
                  onChange={(e) => setDiscoverySearch(e.target.value)}
                  className="h-10 w-full pl-10 pr-4 text-xs bg-white border border-[#EAE4D7] rounded-xl text-[#1A1612] placeholder:text-[#9A8E7C] outline-none focus:border-[#B88E4F] focus:ring-2 focus:ring-[#C59B58]/10 transition"
                />
              </div>

              <label className="grid gap-1 text-[11px] font-medium text-[#7D715E]">Nền tảng
                <Select value={discoveryFilter} onChange={(event) => setDiscoveryFilter(event.target.value)} className="h-10 w-full text-xs">
                  <option value="ALL">Tất cả nền tảng</option><option value="TIKTOK">TikTok</option><option value="YOUTUBE">YouTube</option><option value="INSTAGRAM">Instagram</option><option value="FACEBOOK">Facebook</option>
                </Select>
              </label>
              <label className="grid gap-1 text-[11px] font-medium text-[#7D715E]">Hạng
                <Select value={discoveryTier} onChange={(event) => setDiscoveryTier(event.target.value)} className="h-10 w-full text-xs">
                  <option value="ALL">Tất cả hạng</option><option value="DIAMOND">Kim cương</option><option value="GOLD">Vàng</option><option value="SILVER">Bạc</option><option value="BRONZE">Đồng</option>
                </Select>
              </label>
            </div>

            {/* Creators Grid */}
            <div className="creator-directory-results min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 bg-[#FAF8F5]/50">
              <p className="mb-3 text-xs text-[#7D715E]">{loadingDirectory ? 'Đang tìm kiếm…' : `${filteredDirectoryCreators.length} nhà sáng tạo phù hợp`}</p>
              {loadingDirectory ? (
                <div className="py-16 text-center text-xs text-[#7D715E]">
                  <div className="w-6 h-6 border-2 border-[#C59B58] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  Đang tải nhà sáng tạo…
                </div>
              ) : directoryError ? (
                <div className="py-12 text-center text-xs text-[#7D715E]">
                  <p role="alert">{directoryError}</p>
                  <button type="button" onClick={() => loadDirectoryCreators(discoverySearch)} className="mt-3 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-3 py-2 text-[#B88E4F]">Thử lại</button>
                </div>
              ) : filteredDirectoryCreators.length === 0 ? (
                <div className="py-16 text-center text-xs text-[#7D715E]">
                  Không tìm thấy nhà sáng tạo nào phù hợp với bộ lọc.
                </div>
              ) : (
                <div className="creator-directory-grid grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
                  {filteredDirectoryCreators.map((creator) => {
                    const profile = creator.collaboratorProfile || {};
                    const channels = (creator.socialChannels || []).filter((channel: any, index: number, list: any[]) =>
                      list.findIndex((item: any) => item.platformName?.toUpperCase() === channel.platformName?.toUpperCase() &&
                        (item.channelUrl?.trim().replace(/\/$/, '') || item.channelName?.trim().toLowerCase()) ===
                        (channel.channelUrl?.trim().replace(/\/$/, '') || channel.channelName?.trim().toLowerCase())) === index
                    );
                    const isConnecting = connectingKolId === creator.id;
                    const tier = normalizePartnerTier(profile.tier);
                    const creatorCoop = kols.find((k) => k.id === creator.id)?.cooperationStatus;
                    const renderChannel = (ch: any, idx: number) => {
                      const content = (
                        <>
                          <div className="min-w-0 flex-1">
                            <span className="text-[11px] font-semibold text-[#7D715E]">{ch.platformName}</span>
                            <p className="truncate text-xs text-[#1A1612]" title={ch.channelName}>{ch.channelName || 'Chưa cập nhật tên kênh'}</p>
                          </div>
                          <span className="shrink-0 text-xs tabular-nums text-[#7D715E]" title="Người theo dõi">{Number(ch.followerCount || 0).toLocaleString('vi-VN')}</span>
                          {ch.channelUrl && <ExternalLink className="h-3 w-3 shrink-0 text-[#B88E4F]" />}
                        </>
                      );
                      const className = 'flex min-w-0 items-center gap-2 rounded-lg border border-[#EAE4D7]/70 bg-white px-2.5 py-1.5';
                      return ch.channelUrl ? <a key={idx} href={ch.channelUrl} target="_blank" rel="noopener noreferrer" className={`${className} hover:border-[#C59B58]`} aria-label={`Xem kênh ${ch.platformName} của ${creator.fullName}`}>{content}</a> : <div key={idx} className={className}>{content}</div>;
                    };

                    return (
                      <div
                        key={creator.id}
                        className="creator-directory-card bg-white border border-[#EAE4D7] rounded-2xl p-4 hover:border-[#DCC69F] transition shadow-[0_2px_8px_rgba(35,29,21,0.025)] flex flex-col justify-between gap-2 min-w-0"
                      >
                        <div>
                          {/* Top: Avatar + Name + Tier */}
                          <div className="creator-directory-identity flex items-start gap-3">
                            <div className="relative flex-shrink-0">
                              {creator.avatarUrl ? <img src={creator.avatarUrl} onError={handleAvatarImageError} alt={creator.fullName} className="w-10 h-10 rounded-full object-cover border border-[#EAE4D7]" /> : <span className="grid h-10 w-10 place-items-center rounded-full border border-[#EEDFC6] bg-[#FBF5EB] text-xs font-semibold text-[#B88E4F]">{(creator.fullName || 'KOL').split(' ').filter(Boolean).slice(-2).map((part: string) => part[0]).join('')}</span>}
                              {profile.kycStatus === 'VERIFIED' && (
                                <span
                                  className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white flex items-center justify-center"
                                  title="Đã xác minh định danh KYC"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 text-[#059669]" />
                                </span>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-sm font-semibold text-[#1A1612] truncate" title={creator.fullName}>
                                  {creator.fullName}
                                </h4>
                                <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-[#FBF5EB] text-[#B88E4F] border border-[#EAE4D7]">
                                  {tier === 'DIAMOND' ? 'Kim cương' : tier === 'GOLD' ? 'Vàng' : tier === 'SILVER' ? 'Bạc' : tier === 'BRONZE' ? 'Đồng' : 'Chưa xếp hạng'}
                                </span>
                                {creatorCoop && (
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                    creatorCoop === 'APPROVED'
                                      ? 'border-[#C59B58]/60 bg-[#FBF5EB] text-[#8C6226]'
                                      : creatorCoop === 'PENDING'
                                        ? 'border-[#FCD34D] bg-[#FFFBEB] text-[#B45309]'
                                        : 'border-[#EAE4D7] bg-[#F3EFE6] text-[#7D715E]'
                                  }`}>
                                    {creatorCoop === 'APPROVED' ? 'Đang hợp tác' : creatorCoop === 'PENDING' ? 'Đang chờ phản hồi' : creatorCoop === 'REJECTED' ? 'Đã từ chối' : creatorCoop === 'BLOCKED' ? 'Đã khóa' : 'Đã chấm dứt'}
                                  </span>
                                )}
                              </div>

                            </div>
                          </div>

                          <details className="group mt-2">
                            <summary className="inline-flex items-center gap-1.5 list-none text-xs text-[#7D715E] cursor-pointer py-0.5 [&::-webkit-details-marker]:hidden hover:text-[#1A1612]">Chi tiết <span className="text-[#B88E4F] text-xs group-open:rotate-45 transition-transform" aria-hidden="true">+</span></summary>
                            <div className="mt-1.5 p-3 rounded-xl border border-[#EAE4D7] bg-white space-y-2">
<p className="text-[11px] text-[#7D715E] truncate mt-0.5">
                                {creator.email} {creator.phoneNumber ? `· ${creator.phoneNumber}` : ''}
                              </p>
                              {profile.kycStatus === 'VERIFIED' && (
                                <span className="inline-flex items-center gap-1 text-[11px] text-[#7D715E] mt-1">
                                  <CheckCircle2 className="w-3 h-3 text-[#059669]" />
                                  Đã xác minh danh tính
                                </span>
                              )}
                          {/* Quick Stats */}
                          <div className="creator-directory-stats grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[#EAE4D7]/70">
                            <div>
                              <div className="text-[11px] text-[#7D715E]">Người theo dõi</div>
                              <div className="text-xs font-extrabold text-[#1A1612]">
                                {Number(profile.totalFollowers || 0).toLocaleString('vi-VN')}
                              </div>
                            </div>
                            <div>
                              <div className="text-[11px] text-[#7D715E]">Đơn giới thiệu</div>
                              <div className="text-xs font-extrabold text-[#1A1612]">
                                {profile.totalOrdersReferred ?? profile.totalOrders ?? 0} đơn
                              </div>
                            </div>

                          </div>
<details className="creator-directory-channels mt-3 space-y-2">
                            <summary className="cursor-pointer text-xs font-medium text-[#8C6226]">{channels.length} kênh mạng xã hội · Xem chi tiết</summary>
                            {channels.length > 0 ? (
                              <div className="space-y-1.5">
                                {channels.slice(0, 2).map(renderChannel)}
                                {channels.length > 2 && <details className="text-xs text-[#7D715E]"><summary className="cursor-pointer py-1 hover:text-[#B88E4F]">Xem thêm {channels.length - 2} kênh</summary><div className="mt-1 space-y-1.5">{channels.slice(2).map(renderChannel)}</div></details>}
                              </div>
                            ) : <p className="text-xs text-[#7D715E]">Chưa liên kết kênh mạng xã hội</p>}
                          </details>


                            </div>
                          </details>
                        </div>

                        {/* CTA button */}
                        <div className="creator-directory-action pt-3 border-t border-[#EAE4D7]/70 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleConnectCreator(creator)}
                            disabled={isConnecting}
                            className="h-9 px-3 rounded-lg text-xs font-semibold bg-[#C59B58] text-[#231D15] hover:bg-[#B88E4F] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            {isConnecting ? 'Đang kết nối…' : 'Nhắn tin'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="creator-directory-footer px-4 py-3 sm:px-5 border-t border-[#EAE4D7] bg-white flex flex-wrap gap-3 items-center justify-between">
              <span className="text-xs text-[#7D715E]">
                Tìm thấy {filteredDirectoryCreators.length} nhà sáng tạo đối tác. Bấm vào hồ sơ để bắt đầu kết nối & đàm phán.
              </span>
              <button
                type="button"
                onClick={() => setShowDiscoveryModal(false)}
                className="h-9 px-4 rounded-xl text-xs font-bold bg-[#FBF5EB] border border-[#EEDFC6] text-[#8C6226] hover:bg-[#F3EFE6] transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>,
        document.body
      );

  if (kols.length === 0 && !isAiMatchingMode && loadingBackendData) {
    return <div className="min-h-[420px] grid place-items-center text-sm text-[#7D715E]">Đang tải hồ sơ KOL…</div>;
  }

  if (kols.length === 0 && !isAiMatchingMode) {
    return (
      <div className="w-full min-h-[420px] bg-[#FAF8F5] rounded-2xl border border-[#EAE4D7] overflow-hidden flex flex-col">
        <StoreCooperationPanel mode="shop" onChanged={() => void loadBackendData()} />
        <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
        <Users className="w-9 h-9 text-[#B88E4F] mb-3" />
        <h2 className="text-base font-bold text-[#1A1612]">Chưa có dữ liệu KOL hoặc yêu cầu mẫu</h2>
        <p className="max-w-lg mt-2 text-sm text-[#7D715E]">
          Khi KOL kết nối với Shop, được mời qua AI Radar hoặc gửi yêu cầu nhận mẫu, hồ sơ và lịch sử thật sẽ xuất hiện tại đây.
        </p>
        <button type="button" onClick={() => setShowDiscoveryModal(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#C59B58] px-4 py-2.5 text-sm font-semibold text-[#231D15] hover:bg-[#B88E4F]">
          <Plus className="h-4 w-4" /> Tìm nhà sáng tạo
        </button>
        <button type="button" onClick={() => setAiMatchingMode(true)} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#EEDFC6] bg-white px-4 py-2.5 text-sm font-semibold text-[#B88E4F] hover:bg-[#FBF5EB]">
          <Search className="h-4 w-4" /> Đề xuất KOL bằng AI
        </button>
        </div>
        {discoveryModal}
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100dvh-74px)] min-h-[520px] flex flex-col overflow-hidden pb-1" id="shop-kol-hub-workspace">
      {/* Top Sub-Navigation Tabs */}
      <div className="w-full min-w-0 overflow-x-auto mb-2.5 shrink-0">
        <div className="kol-primary-tabs grid w-full min-w-0 grid-cols-2 sm:grid-cols-4" role="group" aria-label="Mục quản lý KOL">
          <button
            type="button"
            onClick={() => {
              setIsAiMatchingMode(false);
              setViewMode('CRM');
              setSearchParams({ tab: 'messages', kol: selectedKolId }, { replace: true });
            }}
            aria-pressed={viewMode === 'CRM' && !isAiMatchingMode}
          >
            <MessageSquare size={16} aria-hidden="true" />
            <span>Tin nhắn &amp; Hợp tác</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsAiMatchingMode(false);
              setViewMode('LEADERBOARD');
              setSearchParams({ tab: 'leaderboard' }, { replace: true });
            }}
            aria-pressed={viewMode === 'LEADERBOARD' && !isAiMatchingMode}
          >
            <Award size={16} aria-hidden="true" />
            <span>Xếp hạng KOL</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsAiMatchingMode(false);
              setViewMode('ALL_DEALS');
              setSearchParams({ tab: 'deals' }, { replace: true });
            }}
            aria-pressed={viewMode === 'ALL_DEALS' && !isAiMatchingMode}
          >
            <Handshake size={16} aria-hidden="true" />
            <span>Thỏa thuận độc quyền</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsAiMatchingMode(true);
              setSearchParams({ tab: 'radar' }, { replace: true });
            }}
            aria-pressed={isAiMatchingMode}
          >
            <Radar size={16} aria-hidden="true" />
            <span>Gợi ý KOC (AI Radar)</span>
          </button>
        </div>

      </div>

      {/* Mode 1: AI Recommendation Mode */}
      <div className={`kol-ai-workspace flex-1 min-h-0 w-full overflow-y-auto rounded-2xl border border-[#EAE4D7] bg-white p-5 shadow-xs ${isAiMatchingMode ? 'flex flex-col' : 'hidden'}`}>
        <KolRecommendationPage onReturn={() => setAiMatchingMode(false)} />
      </div>

      {/* Mode 2: BẢNG XẾP HẠNG KOL */}
      <div className={`kol-leaderboard flex-1 min-h-0 w-full overflow-y-auto rounded-2xl border border-[#EAE4D7] bg-white shadow-xs ${viewMode === 'LEADERBOARD' && !isAiMatchingMode ? 'block' : 'hidden'}`}>
          <div className="kol-leader-toolbar">
            <label><Search size={15}/><input aria-label="Tìm KOL trong bảng xếp hạng" placeholder="Tìm tên, email, kênh…" value={leaderSearch} onChange={event=>{setLeaderPage(1);setLeaderSearch(event.target.value);}}/></label>
            <select aria-label="Lọc bậc KOL" value={leaderTier} onChange={event=>{setLeaderPage(1);setLeaderTier(event.target.value);}}><option value="ALL">Tất cả bậc</option><option value="BRONZE">Đồng</option><option value="SILVER">Bạc</option><option value="GOLD">Vàng</option><option value="DIAMOND">Kim Cương</option></select>
            <select aria-label="Sắp xếp KOL" value={leaderSort} onChange={event=>{setLeaderPage(1);setLeaderSort(event.target.value);}}><option value="REVENUE">Doanh số tại Shop</option><option value="ORDERS">Đơn hàng tại Shop</option></select>
          </div>
          <div className="kol-leader-table overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#EAE4D7] bg-[#FAF8F5] text-[11px] font-semibold text-[#7D715E]">
                  <th className="py-3 px-4 w-12 text-center">Hạng</th>
                  <th className="py-3 px-4">Nhà sáng tạo</th>
                  <th className="py-3 px-4 text-center">Cấp bậc</th>
                  <th className="py-3 px-4 text-right" title="Toàn thời gian · Số liệu tại cửa hàng">Doanh số tại Shop</th>
                  <th className="py-3 px-4 text-right">Đơn</th>
                  <th className="py-3 px-4 text-right">Video đã nghiệm thu</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE4D7]">
                {!sortedLeaderboardKols.length && <tr><td colSpan={7} className="p-8 text-center text-[#7D715E]">Không có KOL phù hợp bộ lọc.</td></tr>}
                {sortedLeaderboardKols.slice((leaderPage - 1) * 10, leaderPage * 10).map((rawKol, idx) => {
                  const rank = (leaderPage - 1) * 10 + idx + 1;
                  const effectiveTier = normalizePartnerTier(rawKol.tier);
                  const kol = { ...rawKol, tier: effectiveTier };
                  return (
                    <tr key={kol.id} className="hover:bg-[#FBF5EB]/40 transition">
                      <td className="py-3 px-4 text-center font-bold">
                        {!kol.statsAvailable ? '—' : rank === 1 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#FAF0DD] text-[#9E7332] border border-[#E8D4B0] text-xs">
                            1
                          </span>
                        ) : rank === 2 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#F1F3F5] text-[#5C6470] border border-[#DCE0E5] text-xs">
                            2
                          </span>
                        ) : rank === 3 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#FDF2E9] text-[#A05E23] border border-[#F0D5C0] text-xs">
                            3
                          </span>
                        ) : (
                          <span className="text-xs text-[#7D715E]">{rank}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#1A1612]">
                        <div className="flex items-center gap-2.5">
                          <KolAvatar
                            src={kol.avatarUrl}
                            name={kol.fullName}
                            id={kol.id}
                            className="h-9 w-9 rounded-full border border-[#EAE4D7] shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[13px] font-semibold text-[#1A1612] truncate">{kol.fullName}</span>
                              {kol.kycStatus === 'VERIFIED' && (
                                <span className="text-[10px] text-[#059669]" title="Đã xác minh KYC">✓</span>
                              )}
                            </div>
                            <span className="text-[11px] text-[#7D715E] block font-normal truncate">
                              {kol.handle || kol.email}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`kol-tier-badge inline-flex h-6 w-[104px] items-center justify-center gap-[5px] rounded-full text-[11px] font-semibold border ${
                          kol.tier === 'DIAMOND'
                            ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                            : kol.tier === 'GOLD'
                            ? 'bg-[#FAF0DD] text-[#9E7332] border-[#E8D4B0]'
                            : kol.tier === 'SILVER'
                            ? 'bg-[#F1F3F5] text-[#5C6470] border-[#DCE0E5]'
                            : 'bg-[#F3EFE6] text-[#7D715E] border-[#EAE4D7]'
                        }`}>
                          {kol.tier === 'DIAMOND' ? <Gem size={14} aria-hidden="true"/> : <Medal size={14} aria-hidden="true"/>}
                          {kol.tier === 'DIAMOND' ? 'Kim Cương' : kol.tier === 'GOLD' ? 'Vàng' : kol.tier === 'SILVER' ? 'Bạc' : kol.tier === 'BRONZE' ? 'Đồng' : 'Chưa xếp hạng'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#1A1612] tabular-nums">
                        {kol.statsAvailable ? `${kol.stats.totalRevenue.toLocaleString('vi-VN')} ₫` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-[#1A1612] tabular-nums">
                        {kol.statsAvailable ? kol.stats.totalOrders : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-[#1A1612] tabular-nums">
                        {kol.stats.completedVideosCount}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              handleSelectKol(kol.id);
                              setViewMode('CRM');
                              handleTabChange('messages');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#EAE4D7] bg-white hover:bg-[#FAF8F5] text-[#1A1612] text-xs font-semibold transition cursor-pointer shadow-2xs"
                          >
                            <MessageSquare size={13} className="text-[#C59B58]" />
                            <span>Chat</span>
                          </button>
                          <button
                            type="button"
                            disabled={kol.cooperationStatus !== 'APPROVED'}
                            onClick={() => {
                              setSelectedKolId(kol.id);
                              setShowExclusiveDealModal(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-[#231D15] text-xs font-bold transition cursor-pointer shadow-2xs active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
                            title="Thiết lập thỏa thuận thù lao độc quyền"
                          >
                            <Handshake size={13} strokeWidth={2} />
                            <span>Đề xuất Deal</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <nav className="kol-leader-pagination flex items-center justify-between gap-3 border-t border-[#EAE4D7] px-4 py-3 text-xs text-[#7D715E]" aria-label="Phân trang KOL">
            <span>{sortedLeaderboardKols.length ? `${(leaderPage-1)*10+1}–${Math.min(leaderPage*10,sortedLeaderboardKols.length)} / ${sortedLeaderboardKols.length} KOL` : '0 KOL'}</span>
            {sortedLeaderboardKols.length > 10 && <div className="flex items-center gap-3"><button type="button" disabled={leaderPage===1} onClick={()=>setLeaderPage(page=>page-1)} className="h-9 rounded-lg border border-[#EAE4D7] px-3 disabled:opacity-40">Trước</button><span className="tabular-nums">{leaderPage}/{Math.ceil(sortedLeaderboardKols.length/10)}</span><button type="button" disabled={leaderPage>=Math.ceil(sortedLeaderboardKols.length/10)} onClick={()=>setLeaderPage(page=>page+1)} className="h-9 rounded-lg border border-[#EAE4D7] px-3 disabled:opacity-40">Sau</button></div>}
          </nav>
        </div>
      {/* Mode 3: THỎA THUẬN ĐỘC QUYỀN TOÀN SHOP */}
      <div className={`kol-deals-workspace flex-1 min-h-0 w-full overflow-y-auto rounded-2xl ${viewMode === 'ALL_DEALS' && !isAiMatchingMode ? 'block' : 'hidden'}`}>
          <ShopActiveDealsTab
            onSelectKolForChat={(kolId) => {
              handleSelectKol(kolId);
              setViewMode('CRM');
              handleTabChange('messages');
            }}
          />
        </div>
      {/* Mode 4: KHÔNG GIAN 1-1 (CREATOR CRM VIEW) */}
      <div className={`shop-kol-shell bg-white border border-[#EAE4D7] rounded-2xl overflow-hidden flex flex-col sm:flex-row flex-1 min-h-0 w-full h-full ${viewMode === 'CRM' && !isAiMatchingMode ? 'flex' : 'hidden'}`}>
          {/* LEFT COLUMN: KOL List & Filters */}
          <div
            className={`shop-kol-sidebar ${
              isSidebarCollapsed ? 'w-[72px]' : 'w-full sm:w-[285px] lg:w-[305px] xl:w-[325px]'
            } flex-shrink-0 overflow-hidden border-r border-[#EAE4D7] bg-[#FAF8F5] flex flex-col h-48 sm:h-full transition-all duration-300 ease-in-out`}
          >
            {isSidebarCollapsed ? (
              /* COLLAPSED VIEW: Only Avatars & Expand Toggle */
              <div className="flex flex-col h-full items-center">
                {/* Header with Expand Button */}
                <div className="h-14 w-full border-b border-[#EAE4D7] bg-[#FAF8F5] flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setIsSidebarCollapsed(false)}
                    className="w-9 h-9 rounded-xl bg-white border border-[#EAE4D7] hover:border-[#B88E4F] hover:bg-[#FBF5EB] text-[#7D715E] hover:text-[#B88E4F] flex items-center justify-center transition cursor-pointer shadow-2xs"
                    title="Mở rộng danh sách nhà sáng tạo"
                    aria-label="Mở rộng danh sách nhà sáng tạo"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Collapsed List: Avatars only */}
                <div className="flex-1 w-full overflow-y-auto py-3 px-2 space-y-3 no-scrollbar flex flex-col items-center">
                  {filteredKols.map((kol) => {
                    const isSelected = selectedKol ? kol.id === selectedKol.id : false;
                    const kolSamples = samplesMap[kol.id] || [];
                    const pendingSamples = kolSamples.filter((s) => s.status === 'PENDING').length;
                    const cleanHandle = kol.handle ? kol.handle.replace(/^@+/, '@') : kol.email;

                    return (
                      <div key={kol.id} className="relative group">
                        <button
                          type="button"
                          onClick={() => handleSelectKol(kol.id)}
                          className={`relative p-1 rounded-2xl transition cursor-pointer block ${
                            isSelected
                              ? 'bg-[#FBF5EB] ring-2 ring-[#C59B58] shadow-sm'
                              : 'hover:bg-[#FAF8F5]'
                          }`}
                        >
                          <div className="relative">
                            <KolAvatar
                              src={kol.avatarUrl}
                              name={kol.fullName}
                              className="w-10 h-10 rounded-xl border border-[#EAE4D7] text-xs object-cover"
                            />
                            {kol.kycStatus === 'VERIFIED' && (
                              <span
                                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#059669] text-white flex items-center justify-center text-[8px] font-bold border-2 border-white shadow-2xs"
                                title="Đã xác minh KYC"
                              >
                                ✓
                              </span>
                            )}
                            {pendingSamples > 0 && (
                              <span
                                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[9px] font-black border-2 border-white animate-pulse"
                                title={`${pendingSamples} mẫu mới cần duyệt`}
                              >
                                {pendingSamples}
                              </span>
                            )}
                          </div>
                        </button>

                        {/* Floating Tooltip Card on Hover */}
                        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:flex z-50 flex-col min-w-[210px] p-2.5 bg-white border border-[#EAE4D7] rounded-xl shadow-xl pointer-events-none whitespace-nowrap animate-in fade-in duration-150">
                          <div className="flex items-center gap-1.5 justify-between">
                            <span className="text-xs font-bold text-[#1A1612] truncate max-w-[130px]">
                              {kol.fullName}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[8px] font-bold uppercase bg-[#FAF8F5] text-[#B88E4F] border border-[#EEDFC6]">
                              {kol.tier === 'DIAMOND' ? 'KC' : kol.tier === 'GOLD' ? 'Vàng' : kol.tier === 'SILVER' ? 'Bạc' : kol.tier === 'BRONZE' ? 'Đồng' : 'Mới'}
                            </span>
                          </div>
                          <span className="text-[10.5px] text-[#7D715E] truncate mt-0.5">
                            {cleanHandle}
                          </span>
                          <div className="mt-1.5 pt-1.5 border-t border-[#EAE4D7] flex items-center justify-between text-[10px] text-[#7D715E]">
                            <span>
                              DS: <strong className="text-[#1A1612] font-bold">{kol.stats.totalRevenue > 0 ? (kol.stats.totalRevenue / 1000000).toFixed(1) + 'M ₫' : '0 ₫'}</strong>
                            </span>
                            {pendingSamples > 0 ? (
                              <span className="text-amber-600 font-bold bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                                {pendingSamples} mẫu mới
                              </span>
                            ) : kol.commissionRate != null ? (
                              <span className="text-[#B88E4F] font-semibold">
                                HH: {kol.commissionRate}%
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Collapsed Footer: Copy Link Icon */}
                <div className="p-2 border-t border-[#EAE4D7] bg-[#FAF8F5] w-full flex justify-center">
                  <button
                    type="button"
                    onClick={handleCopyInviteLink}
                    className="w-10 h-10 rounded-xl bg-white border border-[#EAE4D7] hover:border-[#B88E4F] text-[#B88E4F] hover:bg-[#FBF5EB] flex items-center justify-center transition cursor-pointer shadow-2xs"
                    title={copiedLink ? "Đã chép trang gian hàng!" : "Sao chép trang gian hàng"}
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-[#059669]" /> : <Share2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ) : (
              /* EXPANDED VIEW: Full list, search, filter tags, cleaner formatting */
              <>
                {/* Header left */}
                <div className="kol-list-heading flex items-center justify-between gap-2 border-b border-[#EAE4D7] bg-white px-4 py-3 shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center shadow-2xs shrink-0">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h1 className="truncate text-sm font-extrabold tracking-tight text-[#1A1612] uppercase">
                        Nhà sáng tạo
                      </h1>
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6]">
                        {filteredKols.length}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      id="btn-discover-creators"
                      onClick={() => setShowDiscoveryModal(true)}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[#EAE4D7] bg-white text-[#7D715E] shadow-2xs transition hover:border-[#B88E4F] hover:bg-[#FBF5EB] hover:text-[#B88E4F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C59B58]/40"
                      title="Khám phá và kết nối nhà sáng tạo mới trên hệ thống"
                      aria-label="Tìm nhà sáng tạo KOL/KOC"
                      aria-haspopup="dialog"
                      aria-expanded={showDiscoveryModal}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSidebarCollapsed(true)}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[#EAE4D7] bg-white text-[#7D715E] shadow-2xs transition hover:border-[#B88E4F] hover:bg-[#FBF5EB] hover:text-[#B88E4F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C59B58]/40"
                      title="Thu gọn danh sách"
                      aria-label="Thu gọn danh sách"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="kol-list-search border-b border-[#EAE4D7] bg-[#FAF8F5] p-3 shrink-0">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#7D715E]" />
                    <input
                      id="input-search-kol-list"
                      type="text"
                      className="w-full rounded-xl border border-[#EAE4D7] bg-white py-2 pl-9 pr-8 text-xs font-medium text-[#1A1612] shadow-2xs transition placeholder:text-[#7D715E]/60 focus:border-[#C59B58] focus:outline-none focus:ring-2 focus:ring-[#C59B58]/15"
                      placeholder="Tìm theo tên, TikTok..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[#7D715E] hover:text-[#1A1612] text-xs font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Filter Tabs Under Search */}
                  <div className="kol-list-filters">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <button
                        type="button"
                        onClick={() => { setViewMode('CRM'); setFilterTag('ALL'); }}
                        aria-pressed={filterTag === 'ALL'}
                        className={`font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1 pb-1 text-xs relative ${
                          filterTag === 'ALL'
                            ? 'text-[#1A1612] font-black border-b-2 border-[#C59B58]'
                            : 'border-b-2 border-transparent text-[#7D715E] hover:text-[#1A1612]'
                        }`}
                      >
                        Tất cả
                      </button>
                      <button
                        type="button"
                        onClick={() => { setViewMode('CRM'); setFilterTag('PENDING'); }}
                        aria-pressed={filterTag === 'PENDING'}
                        className={`font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1 pb-1 text-xs relative ${
                          filterTag === 'PENDING'
                            ? 'text-[#1A1612] font-black border-b-2 border-[#C59B58]'
                            : 'border-b-2 border-transparent text-[#7D715E] hover:text-[#1A1612]'
                        }`}
                      >
                        <span>Chờ phản hồi</span>
                        {pendingCoopCount > 0 && <span className="kol-pending-count">{pendingCoopCount}</span>}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setViewMode('CRM'); setFilterTag('PENDING_SAMPLE'); }}
                        aria-pressed={filterTag === 'PENDING_SAMPLE'}
                        className={`font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1 pb-1 text-xs relative ${
                          filterTag === 'PENDING_SAMPLE'
                            ? 'text-[#1A1612] font-black border-b-2 border-[#C59B58]'
                            : 'border-b-2 border-transparent text-[#7D715E] hover:text-[#1A1612]'
                        }`}
                      >
                        <span>Có mẫu mới</span>
                        {pendingSampleCount > 0 && <span className="kol-pending-count">{pendingSampleCount}</span>}
                      </button>
                      {(closedCoopCount > 0 || filterTag === 'CLOSED') && (
                        <button
                          type="button"
                          onClick={() => { setViewMode('CRM'); setFilterTag('CLOSED'); }}
                          aria-pressed={filterTag === 'CLOSED'}
                          className={`font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1 pb-1 text-xs relative ${
                            filterTag === 'CLOSED'
                              ? 'text-[#1A1612] font-black border-b-2 border-[#C59B58]'
                              : 'border-b-2 border-transparent text-[#7D715E] hover:text-[#1A1612]'
                          }`}
                        >
                          <span>Đã kết thúc</span>
                          {closedCoopCount > 0 && (
                            <span className="rounded-full bg-[#F3EFE6] px-1.5 py-0.2 text-[10px] font-bold text-[#7D715E]">
                              {closedCoopCount}
                            </span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>


                </div>

                {/* KOL items list - Exact ChatBoxPage Card Style */}
                <div className="kol-contact-list min-h-0 flex-1 space-y-1.5 overflow-y-auto px-2.5 py-2.5 no-scrollbar" role="list">
                  {filteredKols.length === 0 ? (
                    <div className="py-12 text-center text-[#7D715E] text-xs space-y-2">
                      <Users className="w-7 h-7 mx-auto text-[#C59B58]/40 stroke-1" />
                      <p className="font-medium">Không tìm thấy nhà sáng tạo nào phù hợp.</p>
                    </div>
                  ) : (
                    filteredKols.map((kol) => {
                      const isSelected = selectedKol ? kol.id === selectedKol.id : false;
                      const kolSamples = samplesMap[kol.id] || [];
                      const pendingSamples = kolSamples.filter((s) => s.status === 'PENDING').length;

                      // 1. Sanitize & clean displayName (remove parenthesis suffixes, newlines, duplicate spaces)
                      const displayName = kol.fullName
                        .replace(/\s*\([^)]*\)/g, '')
                        .replace(/[\r\n]+/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim() || kol.fullName;

                      // 2. Parse & beautify Subtitle (Handle vs Email vs Message)
                      let subText = '';
                      let isEmail = false;

                      if (kol.lastMessage) {
                        subText = kol.lastMessage;
                      } else if (kol.cooperationStatus === 'PENDING') {
                        subText = kol.requestedByKol
                          ? (kol.cooperationNote ? `Xin hợp tác: ${kol.cooperationNote}` : 'KOL gửi yêu cầu hợp tác')
                          : 'Đã gửi lời mời · Chờ KOL';
                      } else if (kol.cooperationStatus === 'APPROVED') {
                        subText = 'Đã liên kết hợp tác';
                      } else if (kol.cooperationStatus === 'REJECTED') {
                        subText = 'KOL đã từ chối hợp tác';
                      } else if (kol.cooperationStatus === 'TERMINATED') {
                        subText = 'Đã chấm dứt hợp tác';
                      } else if (kol.cooperationStatus === 'BLOCKED') {
                        subText = 'Đã khóa hợp tác';
                      } else if (pendingSamples > 0) {
                        subText = `${pendingSamples} yêu cầu mượn mẫu mới`;
                      } else if (kol.handle) {
                        const match = kol.handle.match(/\(@?([a-zA-Z0-9_.]+)\)/);
                        if (match && match[1]) {
                          subText = `@${match[1]}`;
                        } else {
                          subText = kol.handle.replace(/^@+/, '@').trim();
                        }
                      } else if (kol.email) {
                        isEmail = true;
                        subText = kol.email;
                      } else {
                        subText = 'Đối tác liên kết';
                      }

                      return (
                        <div
                          key={kol.id}
                          onClick={() => handleSelectKol(kol.id)}
                          data-selected={isSelected}
                          role="button"
                          tabIndex={0}
                          aria-pressed={isSelected}
                          onKeyDown={event => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              handleSelectKol(kol.id);
                            }
                          }}
                          className={`shop-kol-person group relative flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-150 ${
                            isSelected
                              ? 'border-[#EEDFC6] bg-[#FBF5EB] shadow-xs'
                              : 'hover:bg-white border-transparent'
                          }`}
                        >
                          {/* Active gold left indicator bar */}
                          {isSelected && (
                            <div className="absolute left-0 top-2 bottom-2 w-1 bg-[#C59B58] rounded-r-full" />
                          )}

                          {/* Avatar */}
                          <div className="relative flex-shrink-0">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openKolProfile(kol.id);
                              }}
                              title={`Xem hồ sơ ${kol.fullName}`}
                              aria-label={`Xem hồ sơ ${kol.fullName}`}
                              className="rounded-full border-0 bg-transparent p-0 cursor-pointer block"
                            >
                              <KolAvatar
                                src={kol.avatarUrl}
                                name={kol.fullName}
                                id={kol.id}
                                className={`h-10 w-10 rounded-full text-xs shadow-2xs object-cover transition-transform group-hover:scale-105 ${
                                  isSelected ? 'border border-[#C59B58] ring-2 ring-[#C59B58]/20' : 'border border-[#EAE4D7]'
                                }`}
                              />
                            </button>
                            {kol.kycStatus === 'VERIFIED' && (
                              <span
                                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#059669] text-white flex items-center justify-center text-[7px] font-black border-2 border-white shadow-2xs"
                                title="Đã xác minh KYC"
                              >
                                ✓
                              </span>
                            )}
                          </div>

                          {/* Info Column */}
                          <div className="flex-1 min-w-0">
                            {/* Row 1: Name + Tier Badge */}
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <span
                                className={`truncate text-[13px] font-bold transition-colors ${
                                  isSelected ? 'text-[#B88E4F]' : 'text-[#1A1612] group-hover:text-[#B88E4F]'
                                }`}
                                title={kol.fullName}
                              >
                                {displayName}
                              </span>

                              <span
                                className={`px-1.5 py-0.5 rounded-md text-[8.5px] font-extrabold uppercase tracking-wide shrink-0 border shadow-2xs ${
                                  kol.tier === 'DIAMOND'
                                    ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                                    : kol.tier === 'GOLD'
                                    ? 'bg-[#FAF0DD] text-[#9E7332] border-[#E8D4B0]'
                                    : kol.tier === 'SILVER'
                                    ? 'bg-[#F1F3F5] text-[#5C6470] border-[#DCE0E5]'
                                    : kol.tier === 'BRONZE'
                                    ? 'bg-[#FDF2E9] text-[#A05E23] border-[#F0D5C0]'
                                    : 'bg-[#F3EFE6] text-[#7D715E] border-[#EAE4D7]'
                                }`}
                              >
                                {kol.tier === 'DIAMOND' ? 'KC' : kol.tier === 'GOLD' ? 'VÀNG' : kol.tier === 'SILVER' ? 'BẠC' : kol.tier === 'BRONZE' ? 'ĐỒNG' : 'MỚI'}
                              </span>
                            </div>

                            {kol.cooperationStatus && (
                              <div className="mb-1 flex flex-wrap items-center gap-1">
                                <span
                                  className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.2 text-[9.5px] font-bold ${
                                    kol.cooperationStatus === 'APPROVED'
                                      ? 'border-[#C59B58]/50 bg-[#FBF5EB] text-[#8C6226]'
                                      : kol.cooperationStatus === 'PENDING'
                                        ? 'border-[#FCD34D] bg-[#FFFBEB] text-[#B45309]'
                                        : kol.cooperationStatus === 'REJECTED' || kol.cooperationStatus === 'BLOCKED'
                                          ? 'border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]'
                                          : 'border-[#EAE4D7] bg-[#F3EFE6] text-[#7D715E]'
                                  }`}
                                >
                                  {kol.cooperationStatus === 'APPROVED'
                                    ? 'Đang hợp tác'
                                    : kol.cooperationStatus === 'PENDING'
                                      ? (kol.requestedByKol ? 'KOL xin hợp tác' : 'Chờ KOL duyệt')
                                      : kol.cooperationStatus === 'REJECTED'
                                        ? 'Đã từ chối'
                                        : kol.cooperationStatus === 'BLOCKED'
                                          ? 'Đã khóa'
                                          : 'Đã chấm dứt'}
                                </span>
                                {kol.cooperationStatus === 'PENDING' && kol.requestedByKol && kol.cooperationId && (
                                  <span className="inline-flex items-center gap-1 ml-auto" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      type="button"
                                      disabled={actingCoopKolId === kol.id}
                                      onClick={() => void handleDecisionCooperation(kol, true)}
                                      className="rounded border border-[#B88E4F] bg-[#C59B58] px-1.5 py-0.5 text-[9.5px] font-bold text-[#1A1612] hover:bg-[#B88E4F] cursor-pointer disabled:opacity-50"
                                    >
                                      Duyệt
                                    </button>
                                    <button
                                      type="button"
                                      disabled={actingCoopKolId === kol.id}
                                      onClick={() => void handleDecisionCooperation(kol, false)}
                                      className="rounded border border-[#EAE4D7] bg-white px-1.5 py-0.5 text-[9.5px] font-semibold text-[#7D715E] hover:text-[#DC2626] cursor-pointer disabled:opacity-50"
                                    >
                                      Từ chối
                                    </button>
                                  </span>
                                )}
                                {(kol.cooperationStatus === 'REJECTED' || kol.cooperationStatus === 'TERMINATED') && filterTag === 'CLOSED' && kol.email && (
                                  <button
                                    type="button"
                                    disabled={actingCoopKolId === kol.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void handleQuickInviteKol(kol);
                                    }}
                                    className="ml-auto rounded border border-[#C59B58] bg-white px-1.5 py-0.5 text-[9.5px] font-bold text-[#8C6226] hover:bg-[#FBF5EB] cursor-pointer disabled:opacity-50"
                                  >
                                    Mời lại
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Row 2: Subtitle (Handle or Gmail) + Revenue / Samples / Commission */}
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1 min-w-0 flex-1">
                                {isEmail ? (
                                  <Mail className="w-3 h-3 text-[#B88E4F] shrink-0" />
                                ) : !kol.lastMessage && pendingSamples === 0 && Boolean(kol.handle) ? (
                                  <span className="text-[11px] font-bold text-[#B88E4F] leading-none shrink-0">@</span>
                                ) : null}
                                <span
                                  className="truncate text-[11px] font-medium text-[#7D715E] group-hover:text-[#1A1612] transition-colors"
                                  title={isEmail ? kol.email : subText}
                                >
                                  {isEmail ? subText : subText.replace(/^@/, '')}
                                </span>
                              </div>

                              {pendingSamples > 0 ? (
                                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0 flex items-center gap-1 shadow-2xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                  {pendingSamples} mẫu
                                </span>
                              ) : kol.commissionRate != null ? (
                                <span className="text-[9px] font-bold text-[#B88E4F] shrink-0 bg-[#FBF5EB] px-1.5 py-0.5 rounded-md border border-[#EEDFC6]/70">
                                  HH {kol.commissionRate}%
                                </span>
                              ) : kol.stats.totalRevenue > 0 ? (
                                <span className="text-[10px] font-bold text-[#1A1612] shrink-0">
                                  {(kol.stats.totalRevenue / 1000000).toFixed(1)}M ₫
                                </span>
                              ) : (
                                <span className="text-[9.5px] text-[#7D715E]/70 shrink-0 font-medium">
                                  {kol.lastMessageTime || ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Quick footer invite CTA */}
                <div className="p-3 border-t border-[#EAE4D7] bg-white shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyInviteLink}
                    className="w-full py-2.5 px-3 rounded-xl bg-white border border-[#EAE4D7] hover:border-[#B88E4F] hover:bg-[#FBF5EB] text-xs font-bold text-[#1A1612] flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-4 h-4 text-[#059669]" />
                        <span>Đã chép link mời!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4 text-[#B88E4F]" />
                        <span>Chia sẻ trang gian hàng</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* RIGHT COLUMN: Dedicated KOL Workspace */}
          <div className="shop-kol-detail flex-1 flex flex-col min-w-0 min-h-0 bg-white">
            <StoreCooperationPanel mode="shop" onChanged={() => void loadBackendData()} />
            {!selectedKol ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#FAF8F5]">
                <div className="w-14 h-14 rounded-2xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center mb-3 shadow-2xs">
                  <Users className="w-7 h-7" />
                </div>
                <h3 className="text-base font-extrabold text-[#1A1612] m-0">Chưa có kết nối nào với KOL</h3>
                <p className="text-xs text-[#7D715E] max-w-sm mt-1.5 mb-4 leading-relaxed">
                  Chưa có nhà sáng tạo nào gửi tin nhắn hay yêu cầu mẫu thử. Hãy dùng tính năng Khám phá KOL để tìm kiếm và mời các nhà sáng tạo hợp tác đẩy số.
                </p>
                <button
                  type="button"
                  onClick={() => setShowDiscoveryModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  <span>Khám phá danh bạ KOL</span>
                </button>
              </div>
            ) : (
              <>
                <div className="shop-kol-detail-heading kol-chat-heading">
                  <button type="button" onClick={() => openKolProfile(selectedKol.id)}
                    title={`Xem hồ sơ ${selectedKol.fullName}`} aria-label={`Xem hồ sơ ${selectedKol.fullName}`}
                    className="kol-chat-avatar">
                    <KolAvatar src={selectedKol.avatarUrl} name={selectedKol.fullName} id={selectedKol.id}
                      className="h-10 w-10 rounded-lg object-cover text-xs font-bold text-[#B88E4F]" />
                  </button>
                  <div className="kol-chat-identity">
                    <div className="kol-chat-name-row">
                      <h2 title={selectedKol.fullName}>
                        <button type="button" onClick={() => openKolProfile(selectedKol.id)}>
                          {selectedKol.fullName.replace(/\s*\([^)]*\)/g, '').trim() || selectedKol.fullName}
                        </button>
                      </h2>
                      {selectedKol.kycStatus === 'VERIFIED' && (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#059669]" aria-label="Đã xác thực" />
                      )}
                      <span className="kol-chat-rate" title="Mức thù lao áp dụng cho đối tác">
                        {selectedKol.commissionRate ? `Deal · ${selectedKol.commissionRate}%` : selectedKol.tier === 'DIAMOND' ? 'Kim cương · 13%' : selectedKol.tier === 'GOLD' ? 'Vàng · 12%' : selectedKol.tier === 'SILVER' ? 'Bạc · 11%' : 'Đồng · 10%'}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                          selectedKol.cooperationStatus === 'APPROVED'
                            ? 'border-[#C59B58]/60 bg-[#FBF5EB] text-[#8C6226]'
                            : selectedKol.cooperationStatus === 'PENDING'
                              ? 'border-[#FCD34D] bg-[#FFFBEB] text-[#B45309]'
                              : selectedKol.cooperationStatus === 'REJECTED' || selectedKol.cooperationStatus === 'BLOCKED'
                                ? 'border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]'
                                : 'border-[#EAE4D7] bg-[#FAF8F5] text-[#7D715E]'
                        }`}
                      >
                        {selectedKol.cooperationStatus === 'APPROVED'
                          ? 'Đang hợp tác'
                          : selectedKol.cooperationStatus === 'PENDING'
                            ? (selectedKol.requestedByKol ? 'KOL xin hợp tác' : 'Đã gửi lời mời · Chờ KOL')
                            : selectedKol.cooperationStatus === 'REJECTED'
                              ? 'KOL đã từ chối'
                              : selectedKol.cooperationStatus === 'TERMINATED'
                                ? 'Đã chấm dứt hợp tác'
                                : selectedKol.cooperationStatus === 'BLOCKED'
                                  ? 'Đã khóa hợp tác'
                                  : 'Chưa mời hợp tác'}
                      </span>
                    </div>
                    <div className="kol-chat-channels">
                      {allChannels.length ? allChannels.map((channel, index) => (
                        <a key={index} href={channel.url} target="_blank" rel="noreferrer"
                          title={`${channel.platform}: ${channel.handle} · ${channel.followers.toLocaleString('vi-VN')} người theo dõi`}>
                          <SocialBrandIcon platform={channel.platform} className="h-3.5 w-3.5 shrink-0" />
                          <span className="kol-chat-handle">{channel.handle}</span>
                          <ArrowUpRight className="h-3 w-3 shrink-0" />
                          <span className="kol-chat-followers">· {channel.followers >= 1000 ? `${(channel.followers / 1000).toLocaleString('vi-VN')}K` : channel.followers} người theo dõi</span>
                        </a>
                      )) : <span>Chưa liên kết kênh</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {(!selectedKol.cooperationStatus || selectedKol.cooperationStatus === 'REJECTED' || selectedKol.cooperationStatus === 'TERMINATED') && selectedKol.email && (
                      <button
                        type="button"
                        disabled={actingCoopKolId === selectedKol.id}
                        onClick={() => void handleQuickInviteKol(selectedKol)}
                        className="inline-flex h-8 items-center gap-1 rounded-xl border border-[#C59B58] bg-[#FBF5EB] px-2.5 text-xs font-bold text-[#8C6226] hover:bg-[#F3EFE6] cursor-pointer disabled:opacity-50 whitespace-nowrap"
                        title={selectedKol.cooperationStatus ? 'Gửi lời mời kết nối hợp tác trở lại' : 'Gửi lời mời hợp tác chính thức tới KOL'}
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>{actingCoopKolId === selectedKol.id ? 'Đang gửi…' : selectedKol.cooperationStatus ? 'Mời lại hợp tác' : 'Mời hợp tác'}</span>
                      </button>
                    )}
                    {(() => {
                      const kolCoupons = couponsByKolId[selectedKol.id] || [];
                      const activeKolCoupon = kolCoupons.find((c) => ['ACTIVE', 'PAUSED', 'PENDING_BLOCK_APPROVAL', 'PENDING_ADMIN_APPROVAL'].includes(c.status));
                      const pendingKolCoupon = kolCoupons.find((c) => c.status === 'PENDING_APPROVAL');
                      return (
                        <button
                          type="button"
                          id="btn-header-kol-coupon"
                          onClick={() => setShowQuickCouponModal(true)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-2.5 text-xs font-semibold text-[#8C6226] hover:bg-[#F3EFE6] cursor-pointer whitespace-nowrap"
                          title="Quản lý nhanh / Gia hạn / Phát hành mã ưu đãi cho KOC"
                        >
                          <Ticket className="h-3.5 w-3.5 text-[#B88E4F]" />
                          <span className="hidden md:inline">
                            {pendingKolCoupon
                              ? `Duyệt mã (${pendingKolCoupon.displayCode})`
                              : activeKolCoupon
                                ? `Mã: ${activeKolCoupon.displayCode}`
                                : 'Mã ưu đãi KOC'}
                          </span>
                          <span className="md:hidden">Mã KOC</span>
                          {pendingKolCoupon && <span className="h-2 w-2 rounded-full bg-[#D97706]" />}
                        </button>
                      );
                    })()}
                    <button
                      type="button"
                      id="btn-header-exclusive-deal"
                      disabled={selectedKol.cooperationStatus !== 'APPROVED'}
                      onClick={() => setShowExclusiveDealModal(true)}
                      className="kol-chat-deal disabled:cursor-not-allowed disabled:opacity-45"
                      title={
                        selectedKol.cooperationStatus === 'APPROVED'
                          ? 'Đề xuất thỏa thuận thù lao độc quyền cho đối tác'
                          : selectedKol.cooperationStatus === 'PENDING'
                            ? 'Cần xác nhận hợp tác từ hai bên trước khi tạo Deal độc quyền.'
                            : !selectedKol.cooperationStatus
                              ? 'Cần mời hợp tác và được KOL chấp nhận trước khi tạo Deal mới.'
                              : 'Hợp tác đang ở trạng thái Đã từ chối / Đã chấm dứt. Cần mời lại hợp tác trước khi tạo Deal mới.'
                      }
                    >
                      <Handshake className="h-4 w-4" />
                      <span className="hidden sm:inline">Đề xuất Deal</span><span className="sm:hidden">Đề xuất</span>
                    </button>
                    {selectedKol.cooperationStatus === 'APPROVED' && (
                      <button
                        type="button"
                        id="btn-header-terminate-collab"
                        onClick={() => handleTerminateCollaboration(selectedKol.id)}
                        className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#EAE4D7] bg-white px-2.5 text-xs font-semibold text-[#7D715E] hover:border-[#FECACA] hover:bg-[#FEF2F2] hover:text-[#DC2626] transition cursor-pointer whitespace-nowrap"
                        title="Kiểm tra ràng buộc & chấm dứt hợp tác với KOL"
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                        <span className="hidden xl:inline">Chấm dứt</span>
                      </button>
                    )}
                  </div>
                </div>

            {/* 2. Sub-Tabs Header (Compact SCANMS Style) */}
            <div className="shop-kol-tabs shrink-0 overflow-x-auto border-b border-[#EAE4D7] bg-white px-3 py-1.5 no-scrollbar [.is-header-compact_&]:py-[3px] [.is-header-compact_&_button]:min-h-[34px]">
              <div className="grid w-full min-w-0 grid-cols-4 items-stretch gap-0">
                <button
                  type="button"
                  id="tab-btn-messages"
                  aria-pressed={activeTab === 'messages'}
                  onClick={() => {
                    setViewMode('CRM');
                    handleTabChange('messages');
                  }}
                  className={`flex min-h-11 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-t-lg border-b-2 px-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#C59B58] ${
                    activeTab === 'messages' && viewMode === 'CRM'
                      ? 'border-[#C59B58] text-[#1A1612] font-bold bg-[#FBF5EB]'
                      : 'border-transparent text-[#7D715E] hover:bg-[#FAF8F5] hover:text-[#1A1612]'
                  }`}
                >
                  <MessageSquare className={`w-3.5 h-3.5 ${activeTab === 'messages' && viewMode === 'CRM' ? 'text-[#B88E4F]' : 'text-[#7D715E]'}`} />
                  <span>Tin nhắn</span>
                </button>

                <button
                  type="button"
                  id="tab-btn-samples"
                  aria-pressed={activeTab === 'samples'}
                  onClick={() => {
                    setViewMode('CRM');
                    handleTabChange('samples');
                  }}
                  className={`flex min-h-11 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-t-lg border-b-2 px-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#C59B58] ${
                    activeTab === 'samples' && viewMode === 'CRM'
                      ? 'border-[#C59B58] text-[#1A1612] font-bold bg-[#FBF5EB]'
                      : 'border-transparent text-[#7D715E] hover:bg-[#FAF8F5] hover:text-[#1A1612]'
                  }`}
                >
                  <Package className={`w-3.5 h-3.5 ${activeTab === 'samples' && viewMode === 'CRM' ? 'text-[#B88E4F]' : 'text-[#7D715E]'}`} />
                  <span>Hàng mẫu</span>
                  {(samplesMap[selectedKol.id] || []).length > 0 && (
                    <span className="min-w-4 h-4 px-1 rounded-full text-[10px] font-black bg-[#C59B58] text-white inline-flex items-center justify-center shadow-2xs">
                      {(samplesMap[selectedKol.id] || []).length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  id="tab-btn-performance"
                  aria-pressed={activeTab === 'performance'}
                  onClick={() => {
                    setViewMode('CRM');
                    handleTabChange('performance');
                  }}
                  className={`flex min-h-11 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-t-lg border-b-2 px-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#C59B58] ${
                    activeTab === 'performance' && viewMode === 'CRM'
                      ? 'border-[#C59B58] text-[#1A1612] font-bold bg-[#FBF5EB]'
                      : 'border-transparent text-[#7D715E] hover:bg-[#FAF8F5] hover:text-[#1A1612]'
                  }`}
                >
                  <BarChart3 className={`w-3.5 h-3.5 ${activeTab === 'performance' && viewMode === 'CRM' ? 'text-[#B88E4F]' : 'text-[#7D715E]'}`} />
                  <span>Hiệu suất</span>
                </button>

                <button
                  type="button"
                  id="tab-btn-profile"
                  aria-pressed={activeTab === 'profile'}
                  onClick={() => {
                    setViewMode('CRM');
                    handleTabChange('profile');
                  }}
                  className={`flex min-h-11 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-t-lg border-b-2 px-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#C59B58] ${
                    activeTab === 'profile' && viewMode === 'CRM'
                      ? 'border-[#C59B58] text-[#1A1612] font-bold bg-[#FBF5EB]'
                      : 'border-transparent text-[#7D715E] hover:bg-[#FAF8F5] hover:text-[#1A1612]'
                  }`}
                >
                  <UserCheck className={`w-3.5 h-3.5 ${activeTab === 'profile' && viewMode === 'CRM' ? 'text-[#B88E4F]' : 'text-[#7D715E]'}`} />
                  <span>Hồ sơ</span>
                </button>
              </div>

              {/* Right: Nút Cấp VIP & Kênh MXH (Borderless) */}

            </div>

            {/* 3. Sub-Tab Content Areas */}
            <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col bg-white">
              {/* TAB 1: MESSAGES (Full height seamless embedded ChatBox with persistent DOM cache) */}
                  <div className={`h-full min-h-0 w-full overflow-hidden ${activeTab === 'messages' ? 'block' : 'hidden'}`}>
                    <div className="h-full min-h-0 overflow-hidden">
                      <ChatBoxPage
                        embedded
                        targetCollaboratorId={selectedKol.id}
                        targetCollaboratorName={selectedKol.fullName}
                        targetCollaboratorAvatar={selectedKol.avatarUrl}
                        cooperationStatus={selectedKol.cooperationStatus ?? null}
                        hideSidebar
                        hideHeaderInChat
                        className="h-full w-full border-0 rounded-none shadow-none bg-white"
                        initialConversations={rawConversations}
                      />
                    </div>
                  </div>

                  {/* Các Tab còn lại: Có vùng cuộn độc lập bên trong */}
                  <div className={`h-full w-full overflow-y-auto px-3 pb-4 pt-1.5 sm:px-4 space-y-3 ${activeTab !== 'messages' ? 'block' : 'hidden'}`}>

                  {/* TAB 2: SAMPLE REQUESTS MANAGEMENT */}
                  {activeTab === 'samples' && (
                    <div className="kol-sample-workspace flex min-w-0 flex-col gap-2.5">
                  <div className="kol-sample-filterbar" role="group" aria-label="Lọc yêu cầu hàng mẫu">
                    <div className="contents">
                      {([{value:'ALL',label:'Tất cả'}, {value:'PENDING',label:'Chờ duyệt mẫu'}, {value:'VIDEO_SUBMITTED',label:'Chờ duyệt video'}] as const).map((filter) => {
                        const count = (samplesMap[selectedKol.id] || []).filter(sample => filter.value === 'ALL' || sampleDisplayStatus(sample) === filter.value).length;
                        return (
                        <button key={filter.value} type="button" onClick={() => setSampleFilter(filter.value)} title={`${filter.label}: ${count}`} aria-label={`${filter.label}: ${count}`} aria-pressed={sampleFilter === filter.value} className={
                          'flex min-w-0 items-center justify-center gap-1 whitespace-nowrap border border-transparent px-1.5 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C59B58] ' + (sampleFilter === filter.value ? 'border-[#EEDFC6] bg-[#FBF5EB] text-[#79592C]' : 'text-[#655A49] hover:bg-[#FAF8F5]')
                        }><span className="min-w-0 truncate">{filter.label}</span><span className="shrink-0 tabular-nums">{count}</span></button>
                        );
                      })}
                    </div>
                    <div className="kol-sample-other-filter">
                      <Select
                        value={['ALL', 'PENDING', 'VIDEO_SUBMITTED'].includes(sampleFilter) ? '' : sampleFilter}
                        searchable={false}
                        placeholder="Trạng thái"
                        onChange={(event) => setSampleFilter(event.target.value as typeof sampleFilter)}
                        aria-label="Trạng thái mẫu khác"
                        className="w-full min-w-0 gap-1 px-2 py-0 text-xs font-semibold"
                      >
                        <option value="APPROVED">Chờ gửi</option>
                        <option value="SHIPPED">Đang giao</option>
                        <option value="RECEIVED">Đã nhận mẫu</option>
                        <option value="REVISION_REQUIRED">Cần sửa video</option>
                        <option value="OVERDUE">{`Quá hạn (${(samplesMap[selectedKol.id] || []).filter(sample => sampleDisplayStatus(sample) === 'OVERDUE').length})`}</option>
                        <option value="DELIVERY_ISSUE">Sự cố giao hàng</option>
                        <option value="COMPLETED">{`Hoàn tất (${(samplesMap[selectedKol.id] || []).filter(sample => sampleDisplayStatus(sample) === 'COMPLETED').length})`}</option>
                        <option value="REJECTED">Bị từ chối</option>
                        <option value="CANCELLED">Đã hủy</option>
                      </Select>

                    </div>
                  </div>

                  {/* Samples list */}
                  {currentKolSamples.length === 0 ? (
                    <div className="kol-samples-empty bg-white border border-[#EAE4D7] rounded-xl py-8 px-4 text-center">
                      <Package className="w-7 h-7 text-[#C59B58] mx-auto mb-3" />
                      <h4 className="text-sm font-semibold text-[#1A1612]">{sampleFilter === 'ALL' ? 'Chưa có yêu cầu hàng mẫu' : 'Không có mẫu ở trạng thái này'}</h4>

                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {currentKolSamples.map((item) => (
                        <div
                          key={item.id}
                          className="partner-sample-card rounded-xl border border-[#EAE4D7] bg-white p-4 sm:p-5"
                        >
                          <div className="flex flex-col items-stretch justify-between gap-3">
                            {/* Product Info */}
                            <div className="partner-sample-header flex w-full min-w-0 flex-1 items-start gap-3">
                              <img
                                src={
                                  item.product.thumbnail ||
                                  '/assets/product-placeholder.svg'
                                } onError={handleProductImageError}
                                alt={item.product.title}
                                className="h-12 w-12 shrink-0 rounded-lg border border-[#EAE4D7] bg-white object-contain"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="partner-sample-meta">
                                  <span
                                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                      item.status === 'PENDING'
                                        ? 'border-[#EAE4D7] bg-[#FAF8F5] text-[#7D715E]'
                                        : ['APPROVED', 'SHIPPED'].includes(item.status)
                                        ? 'border-[#EEDFC6] bg-[#FBF5EB] text-[#795A2D]'
                                        : ['COMPLETED', 'VIDEO_SUBMITTED'].includes(item.status)
                                        ? 'border-[#EEDFC6] bg-[#F3EFE6] text-[#795A2D]'
                                        : 'bg-rose-50 text-rose-700 border-rose-200'
                                    }`}
                                  >
                                    {item.status === 'PENDING' && 'Chờ duyệt mẫu'}
                                    {item.status === 'APPROVED' && (isSandboxShipment(item) ? <SampleSandboxStatus charges={item.shippingCharges} /> : 'Đã duyệt · Chờ gửi')}
                                    {item.status === 'SHIPPED' && 'Đang giao'}
                                    {item.status === 'RECEIVED' && 'Đã nhận · Chờ video'}
                                    {item.status === 'VIDEO_SUBMITTED' && 'Chờ duyệt video'}
                                    {item.status === 'REVISION_REQUIRED' && 'Cần sửa video'}
                                    {item.status === 'COMPLETED' && 'Hoàn tất'}
                                    {item.status === 'REJECTED' && 'Từ chối'}
                                    {item.status === 'OVERDUE' && 'Quá hạn video'}
                                    {item.status === 'DELIVERY_ISSUE' && 'Sự cố giao hàng'}
                                    {item.status === 'CANCELLED' && 'Đã hủy'}
                                  </span>
                                  <span className="text-[11px] text-[#7D715E]">
                                    Ngày yêu cầu: {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                                  </span>
                                </div>

                                <h4 className="line-clamp-2 text-base font-semibold leading-snug text-[#1A1612]">
                                  {item.product.title}
                                </h4>

                                <div className="mt-2 space-y-1.5 text-xs leading-relaxed text-[#7D715E]">
                                  <div>
                                    Giá mẫu:{' '}
                                    <strong className="text-[#1A1612]">
                                      {Number(item.product.price || 0).toLocaleString('vi-VN')} ₫
                                    </strong>{' '}
                                    · Thù lao: <strong>{item.product.commissionRate != null ? (item.product.commissionRate + "%") : "—"}</strong>
                                  </div>
                                  {item.expectedVideoAt && !['PENDING', 'APPROVED', 'SHIPPED', 'DELIVERY_ISSUE'].includes(item.status) && (
                                    <div>Ngày KOL dự kiến đăng: {new Date(item.expectedVideoAt).toLocaleDateString('vi-VN')}</div>
                                  )}
                                  {item.deadlineAt && !['PENDING', 'APPROVED', 'SHIPPED', 'DELIVERY_ISSUE', 'COMPLETED', 'REJECTED', 'CANCELLED'].includes(item.status) && (
                                    <div className={item.status === 'OVERDUE' ? 'font-bold text-rose-700' : 'font-semibold text-[#8C6226]'}>
                                      Hạn nộp video: {new Date(item.deadlineAt).toLocaleString('vi-VN')}
                                    </div>
                                  )}
                                  {item.revisionDeadlineAt && ['REVISION_REQUIRED', 'OVERDUE'].includes(item.status) && (
                                    <div className="font-semibold text-[#8C6226]">Hạn sửa video: {new Date(item.revisionDeadlineAt).toLocaleString('vi-VN')}</div>
                                  )}
                                  {item.videoRejectionReason && (
                                    <div className="text-rose-700">Lý do yêu cầu sửa: {item.videoRejectionReason}</div>
                                  )}
                                  {item.rejectedReason && (
                                    <div className="text-rose-700">Ghi chú xử lý: {item.rejectedReason}</div>
                                  )}

                                </div>
                              </div>
                            </div>

                            <PartnerSampleDetails item={item} />

                            {/* Actions by status */}
                            <div className="partner-sample-footer flex w-full flex-wrap items-center justify-end gap-2 border-t border-[#EAE4D7] pt-2.5">
                              <div className="sample-deadline-actions grid! grid-cols-[repeat(2,_minmax(0,_1fr))]! [align-items:start]! gap-[6px_10px]! w-[min(100%,_370px)]! [&:empty]:hidden! [&_.sample-violation-button]:w-full! [&_.sample-violation-button]:min-h-[38px]! [&_.sample-violation-button]:justify-center! [&_.sample-violation-button]:p-[9px_12px]! [&_.sample-violation-button]:font-[500]! [&_.sample-violation-button]:leading-[18px]! [&_.sample-violation-button]:whitespace-nowrap! [&_.sample-violation-button_svg]:shrink-0! [&_.sample-violation-unavailable]:contents! [&_.sample-violation-unavailable_small]:col-[1_/_-1]! [&_.sample-violation-unavailable_small]:text-right! [&_.sample-violation-unavailable_small]:text-[length:10px]! [&_.sample-violation-unavailable_small]:leading-[16px]! [&_.sample-violation-state]:col-[1_/_-1]! [@media(max-width:400px)]:[&&]:gap-[6px]! [@media(max-width:400px)]:[&&]:[&_.sample-violation-button]:p-[8px_6px]! [@media(max-width:400px)]:[&&]:[&_.sample-violation-button]:text-[length:11px]! ">
                                <SampleDeadlineExtension request={item} onSuccess={() => void loadBackendData()} />
                                <SampleViolationAction request={item} blocked={Boolean(item.sampleRequestsBlockedAt)} onSuccess={() => void loadBackendData()} />
                              </div>
                              {item.status === 'PENDING' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleRejectSample(item.id)}
                                    className="px-3 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                                  >
                                    Từ chối
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleApproveSample(item.id)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-[#231D15] bg-[#C59B58] hover:bg-[#B88E4F] transition shadow-xs cursor-pointer"
                                  >
                                    Duyệt mẫu
                                  </button>
                                </>
                              )}

                              {(!isSandboxShipment(item) && (item.status === 'APPROVED' || item.status === 'DELIVERY_ISSUE')) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTrackingModalItem(item);
                                    setTrackingCodeInput('');
                                  }}
                                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-3 py-2 text-[11px] font-semibold text-[#795A2D] transition hover:bg-[#F3EFE6]"
                                >
                                  <Truck className="w-3.5 h-3.5" />
                                  {item.status === 'DELIVERY_ISSUE' ? 'Tạo lại vận đơn GHN' : 'Tạo vận đơn GHN'}
                                </button>
                              )}

                              {item.status === 'SHIPPED' && (
                                <span className="text-xs text-[#7D715E] font-semibold flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" /> Chờ KOL nhận mẫu
                                </span>
                              )}

                              {item.status === 'VIDEO_SUBMITTED' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleReviewSampleVideo(item, 'REJECTED')}
                                    className="px-3 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                                  >Yêu cầu sửa</button>
                                  <button
                                    type="button"
                                    onClick={() => handleReviewSampleVideo(item, 'APPROVED')}
                                    className="px-3 py-2 rounded-xl text-xs font-bold text-[#231D15] bg-[#C59B58] hover:bg-[#B88E4F] transition cursor-pointer"
                                  >Nghiệm thu video</button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: PERFORMANCE & AFFILIATE ORDERS (Tone Sáng, Sang Trọng, Chuẩn SCANMS) */}
              {activeTab === 'performance' && (() => {
                const displayRevenue = kolPerformance?.totalRevenue || 0;
                const displayOrders = kolPerformance?.totalOrders || 0;
                const displayCommission = kolPerformance?.accruedCommission || 0;
                const displayAov = displayOrders > 0 ? Math.round(displayRevenue / displayOrders) : 0;

                const ordersList = kolOrders.map((ord: any) => ({
                  id: ord.id,
                  orderCode: ord.orderCode || ord.externalOrderSn || `#${ord.id?.slice(0, 8)}`,
                  createdAt: ord.createdAt ? new Date(ord.createdAt).toLocaleDateString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                  }) : '—',
                  customerName: ord.customerName || ord.customerPhoneMasked || 'Khách mua qua link',
                  productTitle: ord.productTitle || (Array.isArray(ord.products) ? ord.products.map((p: any) => `${p.title} (x${p.quantity})`).join(', ') : 'Sản phẩm tiếp thị'),
                  productImage: ord.productImage || ord.products?.[0]?.imageUrl || '',
                  orderTotal: Number(ord.finalAmount || ord.orderTotal || 0),
                  commissionEarned: Number(ord.commissionAmount || ord.commissionEarned || 0),
                  status: ord.status,
                }));

                return (
                  <div className="kol-performance @container overflow-hidden rounded-xl border border-[#EAE4D7] bg-white">
                    <div className="kol-performance-toolbar grid @[720px]:grid-cols-[152px_minmax(0,1fr)]">
                      <label className="flex items-center gap-2 border-b border-[#EAE4D7] px-3 py-2.5 text-xs text-[#7D715E] @[720px]:border-r @[720px]:border-b-0">
                        <span>Kỳ</span>
                        <select aria-label="Kỳ báo cáo" value={performanceRange}
                          onChange={event => { setPerformancePage(1); setPerformanceRange(event.target.value as typeof performanceRange); }}
                          className="flex h-9 min-w-0 flex-1 items-center gap-1 rounded-lg border border-[#EAE4D7] px-2 py-0 text-xs font-medium [&::picker-icon]:self-center">
                          <option value="7d">7 ngày</option>
                          <option value="30d">30 ngày</option>
                          <option value="month">Tháng này</option>
                          <option value="all">Toàn thời gian</option>
                        </select>
                      </label>
                    <div className="kol-performance-metrics grid min-w-0 grid-cols-2 @[720px]:grid-cols-4" aria-label="Tổng số liệu trong kỳ báo cáo">
                      {[
                        {label:'Doanh số đã giao',value:kolPerformance?`${displayRevenue.toLocaleString('vi-VN')} ₫`:'—',help:'Giá trị đơn đã giao hoặc hoàn tất trong kỳ, trừ số tiền đã hoàn.'},
                        {label:'Thù lao ghi nhận',value:kolPerformance?`${displayCommission.toLocaleString('vi-VN')} ₫`:'—',help:'Gồm thù lao đang chờ, được duyệt và đã thanh toán; không đồng nghĩa đã rút tiền.'},
                        {label:'Đơn đã giao',value:kolPerformance?displayOrders.toLocaleString('vi-VN'):'—',help:'Đơn đã giao hoặc hoàn tất trên toàn bộ các trang trong kỳ.'},
                        {label:'TB/đơn',value:kolPerformance&&displayOrders>0?`${displayAov.toLocaleString('vi-VN')} ₫`:'—',help:'Doanh số đã giao chia cho số đơn đã giao trong kỳ.'},
                      ].map(metric => <div key={metric.label} className="flex min-h-[66px] min-w-0 flex-col justify-center px-3 py-2 even:border-l [&:nth-child(n+3)]:border-t @[720px]:[&:nth-child(n+3)]:border-t-0 @[720px]:[&:not(:first-child)]:border-l border-[#EAE4D7]">
                        <div className="flex items-center gap-1.5 text-xs text-[#7D715E]"><span>{metric.label}</span><span title={metric.help} aria-label={metric.help} tabIndex={0} className="shrink-0"><HelpCircle size={12}/></span></div>
                        <strong className={`mt-0.5 block text-xl font-semibold leading-6 tabular-nums [overflow-wrap:anywhere] ${metric.label === 'Thù lao ghi nhận' ? 'text-[#90682F]' : 'text-[#1A1612]'}`}>{metric.value}</strong>
                      </div>)}
                    </div>
                    </div>
                    {performanceError && <div role="alert" className="flex items-center justify-between gap-3 border-t border-[#EAE4D7] px-4 py-3 text-xs text-[#DC2626]"><span>{performanceError}</span><button type="button" onClick={()=>setPerformanceRefresh(value=>value+1)} className="shrink-0 rounded-lg border border-[#EAE4D7] px-3 py-2 text-[#79592C]">Thử lại</button></div>}
                    <div className="kol-performance-orders border-t border-[#EAE4D7]">
                      <div className="kol-order-filters grid grid-cols-6 gap-1 p-3" role="group" aria-label="Lọc đơn hàng theo trạng thái">
                        {[{value:'ALL',label:'Tất cả'},{value:'PENDING',label:'Đang xử lý'},{value:'SHIPPING',label:'Đang giao'},{value:'DELIVERED_GROUP',label:'Đã giao'},{value:'CANCELLED',label:'Đã hủy'},{value:'RETURNS_GROUP',label:'Đổi trả',title:'Đổi trả / Khiếu nại'}].map(filter=><button type="button" key={filter.value} title={filter.title||filter.label} aria-label={filter.title||filter.label} aria-pressed={performanceStatus===filter.value} onClick={()=>{setPerformancePage(1);setPerformanceStatus(filter.value);}} className={`relative flex h-[38px] min-w-0 items-center justify-center rounded-lg px-1 text-xs font-medium ${performanceStatus===filter.value?'text-[#79592C]':'text-[#7D715E] hover:bg-[#FAF8F5]'}`}><span className="min-w-0 truncate">{filter.label}</span></button>)}
                      </div>
                      {loadingKolOrders?<p role="status" className="flex items-center justify-center gap-2 border-t border-[#EAE4D7] py-10 text-xs text-[#7D715E]"><RefreshCw size={15} className="animate-spin"/>Đang tải đơn hàng…</p>:performanceError?null:!ordersList.length?<div className="kol-orders-empty"><ShoppingBag size={26}/><strong>{performanceStatus==='ALL'?'Chưa có đơn hàng trong kỳ này':'Không có đơn ở trạng thái này'}</strong></div>:<div className="overflow-x-auto border-t border-[#EAE4D7]"><table className="w-full min-w-[560px] text-left text-xs"><thead className="bg-[#FAF8F5] text-[#7D715E]"><tr><th className="px-4 py-3 font-medium">Mã đơn · Sản phẩm</th><th className="px-3 py-3 text-right font-medium">Giá trị</th><th className="px-3 py-3 text-right font-medium">Thù lao</th><th className="px-4 py-3 font-medium">Trạng thái</th></tr></thead><tbody className="divide-y divide-[#EAE4D7]">{ordersList.map(ord=><tr key={ord.id} className="hover:bg-[#FAF8F5]"><td className="px-4 py-3"><strong className="block font-semibold">{ord.orderCode}</strong><span className="mt-1 flex max-w-[300px] items-center gap-2 text-[#7D715E]">{ord.productImage?<img src={ord.productImage} alt="" onError={handleProductImageError} className="size-6 shrink-0 rounded border border-[#EAE4D7] bg-white object-contain"/>:<span className="grid size-6 shrink-0 place-items-center rounded border border-[#EAE4D7] bg-white text-[#B88E4F]"><Package size={13}/></span>}<span className="min-w-0">{ord.productTitle}</span></span><span className="mt-1 block text-[11px] text-[#7D715E]">{ord.customerName} · {ord.createdAt}</span></td><td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums">{ord.orderTotal.toLocaleString('vi-VN')} ₫</td><td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums text-[#90682F]">{ord.commissionEarned.toLocaleString('vi-VN')} ₫</td><td className="px-4 py-3"><span className="inline-flex whitespace-nowrap rounded-md border border-[#EEDFC6] bg-[#FBF5EB] px-2 py-1 text-[11px] text-[#79592C]">{({PENDING:'Đang xử lý',CONFIRMED:'Đã xác nhận',PROCESSING:'Đang xử lý',SHIPPING:'Đang giao',DELIVERED:'Đã giao',COMPLETED:'Hoàn tất',CANCELLED:'Đã hủy',RETURN_REQUESTED:'Yêu cầu đổi trả',RETURNED:'Đã trả hàng',DISPUTED:'Đang khiếu nại'} as Record<string,string>)[ord.status]||ord.status}</span></td></tr>)}</tbody></table></div>}
                      {!loadingKolOrders&&!performanceError&&ordersList.length>0&&<div className="kol-performance-pagination flex items-center justify-end gap-2 border-t border-[#EAE4D7] px-4 py-3 text-xs text-[#7D715E]"><button type="button" disabled={performancePage<=1} onClick={()=>setPerformancePage(page=>page-1)} className="h-8 rounded-lg border border-[#EAE4D7] px-3 disabled:opacity-40">Trước</button><span className="tabular-nums">{performancePage}/{Math.max(1,performancePages)}</span><button type="button" disabled={performancePage>=performancePages} onClick={()=>setPerformancePage(page=>page+1)} className="h-8 rounded-lg border border-[#EAE4D7] px-3 disabled:opacity-40">Sau</button></div>}
                    </div>
                  </div>
                );
              })()}

              {/* TAB 4: PROFILE & SOCIAL CHANNELS */}
              {activeTab === 'profile' && (() => {
                const canTerminate = selectedKol.cooperationStatus === 'APPROVED';
                const canQuickInvite = (!selectedKol.cooperationStatus || selectedKol.cooperationStatus === 'REJECTED' || selectedKol.cooperationStatus === 'TERMINATED') && Boolean(selectedKol.email);
                return (
                <div className="kol-channel-profile">
                  <div className="kol-channel-panel rounded-xl border border-[#EAE4D7] bg-white p-4 text-[#1A1612] sm:p-5">
                    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EAE4D7] pb-3">
                      <h3 className="text-sm font-semibold">Thông tin đối tác</h3>
                      <div className="flex min-w-0 items-center gap-1.5 text-xs text-[#7D715E]">
                        <span title={selectedKol.id}>ID: <span className="font-mono">{selectedKol.id.slice(0,8)}</span></span>
                        <button type="button" onClick={()=>void copyPartnerId(selectedKol.id)} aria-label="Sao chép mã đối tác" title={copiedPartnerId===selectedKol.id?'Đã sao chép':'Sao chép đầy đủ ID'} className="grid size-8 shrink-0 place-items-center rounded-lg hover:bg-[#FBF5EB] focus-visible:outline-2 focus-visible:outline-[#C59B58]">{copiedPartnerId===selectedKol.id?<Check size={14}/>:<Copy size={14}/>}</button>
                        {(canTerminate || canQuickInvite) && (
                        <div className="relative" ref={kolActionsDropdownRef}>
                          <button id="btn-kol-actions-menu" type="button" aria-label="Thao tác với nhà sáng tạo" aria-haspopup="menu" aria-expanded={showKolActionsMenu} aria-controls="kol-partner-actions" onClick={()=>setShowKolActionsMenu(value=>!value)} onKeyDown={event=>{if(event.key==='Escape')setShowKolActionsMenu(false);}} className={`grid size-8 place-items-center rounded-lg border focus-visible:outline-2 focus-visible:outline-[#C59B58] ${showKolActionsMenu?'border-[#C59B58] bg-[#FBF5EB] text-[#79592C]':'border-[#EAE4D7] hover:bg-[#FAF8F5]'}`}><MoreHorizontal size={17}/></button>
                          {showKolActionsMenu&&<div id="kol-partner-actions" role="menu" className="absolute top-full right-0 z-40 mt-1.5 w-52 rounded-xl border border-[#EAE4D7] bg-white p-1.5 shadow-lg" onKeyDown={event=>{if(event.key==='Escape'){setShowKolActionsMenu(false);document.getElementById('btn-kol-actions-menu')?.focus();}}}>
                            {canTerminate && (
                              <button id="btn-terminate-collab" type="button" role="menuitem" disabled={terminatingKolId===selectedKol.id} onClick={()=>{setShowKolActionsMenu(false);void handleTerminateCollaboration(selectedKol.id);}} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-2.5 text-left text-xs font-medium text-[#DC2626] hover:bg-[#FEF2F2] disabled:opacity-40"><UserMinus size={15}/>{terminatingKolId===selectedKol.id?'Đang xử lý…':'Chấm dứt hợp tác'}</button>
                            )}
                            {canQuickInvite && (
                              <button id="btn-quick-reinvite-collab" type="button" role="menuitem" disabled={actingCoopKolId===selectedKol.id} onClick={()=>{setShowKolActionsMenu(false);void handleQuickInviteKol(selectedKol);}} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-2.5 text-left text-xs font-medium text-[#8C6226] hover:bg-[#FBF5EB] disabled:opacity-40"><Send size={15}/>{selectedKol.cooperationStatus?'Mời lại hợp tác':'Mời hợp tác chính thức'}</button>
                            )}
                          </div>}
                        </div>
                        )}
                      </div>
                    </header>
                    <div className="kol-profile-columns py-4">
                      <section><h4>Liên hệ</h4><dl>
                        <div><dt>Email</dt><dd>{selectedKol.email||'Chưa cập nhật'}</dd></div>
                        <div><dt>Điện thoại</dt><dd>{selectedKol.phone||'Chưa cập nhật'}</dd></div>
                      </dl></section>
                      <section><h4>Thù lao & định danh</h4><dl>
                        <div><dt>Bậc KOL</dt><dd>{({DIAMOND:'Kim Cương',GOLD:'Vàng',SILVER:'Bạc',BRONZE:'Đồng'} as Record<string,string>)[selectedKol.tier||'']||'Chưa xếp hạng'}</dd></div>
                        <div><dt>Thù lao chuẩn</dt><dd title="Thù lao tiêu chuẩn theo bậc KOL; không cộng dồn với mức Deal độc quyền.">{selectedKol.tier==='DIAMOND'?13:selectedKol.tier==='GOLD'?12:selectedKol.tier==='SILVER'?11:10}%</dd></div>
                        <div><dt>eKYC</dt><dd className={selectedKol.kycStatus==='REJECTED'?'text-[#DC2626]':selectedKol.kycStatus==='PENDING'?'text-[#D97706]':undefined}>{({VERIFIED:'Đã xác minh',PENDING:'Đang xác minh',REJECTED:'Bị từ chối',UNVERIFIED:'Chưa xác minh'} as Record<string,string>)[selectedKol.kycStatus||'']||'Chưa xác minh'}</dd></div>
                      </dl></section>
                    </div>
                    <section className="border-t border-[#EAE4D7] pt-3">
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-2"><h4 className="text-xs font-semibold">Kênh liên kết</h4><button type="button" onClick={handleCopyInviteLink} disabled={copyingLink} className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-xs text-[#79592C] hover:bg-[#FBF5EB] disabled:opacity-40"><Copy size={13}/>{copiedLink?'Đã sao chép':'Sao chép link Shop'}</button></div>
                      <div className="kol-profile-channel-list divide-y divide-[#EAE4D7]">
                        {(selectedKol.socialChannels?.length?selectedKol.socialChannels:selectedKol.primaryChannel?[{...selectedKol.primaryChannel,handle:selectedKol.handle||'',isVerified:false}]:[]).map((channel,index)=><div key={`${channel.platform}-${index}`} className="flex min-w-0 items-center justify-between gap-3 py-3">
                          <div className="flex min-w-0 items-center gap-2.5"><span className="grid size-9 shrink-0 place-items-center rounded-lg border border-[#EAE4D7] bg-white text-[#1A1612]"><SocialBrandIcon platform={channel.platform} className="size-[18px]"/></span><div className="min-w-0"><div className="flex min-w-0 items-center gap-1.5 text-xs font-semibold"><span className="truncate">{({TIKTOK:'TikTok',YOUTUBE:'YouTube',INSTAGRAM:'Instagram',FACEBOOK:'Facebook'} as Record<string,string>)[channel.platform]||channel.platform}: {channel.handle?`@${channel.handle.replace(/^@+/,'')}`:'Chưa cập nhật'}</span>{channel.isVerified&&<CheckCircle2 size={13} className="shrink-0 text-[#059669]" aria-label="Kênh đã xác minh"/>}</div><p className="mt-1 text-[11px] leading-4 text-[#7D715E]">{Number.isFinite(channel.followers)?channel.followers.toLocaleString('vi-VN'):'—'} người theo dõi · Tương tác: {formatPartnerEngagement(channel.engagementRate)}</p></div></div>
                          {channel.url&&<a href={channel.url} target="_blank" rel="noreferrer" className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg border border-[#EAE4D7] px-2.5 text-xs text-[#79592C] hover:bg-[#FBF5EB]">Mở kênh <ExternalLink size={12}/></a>}
                        </div>)}
                        {!selectedKol.socialChannels?.length&&!selectedKol.primaryChannel&&<p className="py-3 text-xs text-[#7D715E]">Chưa liên kết kênh mạng xã hội.</p>}
                      </div>
                    </section>
                  </div>
                </div>
                );
              })()}
            </div>
          </div>
  </>
)}
</div>
</div>

      {trackingModalItem && (
        <SampleWaybillDialog
          sample={trackingModalItem}
          environment={sampleGhnEnvironment}
          onEnvironmentChange={value => {
            setSampleGhnEnvironment(value);
            setSampleShippingError('');
          }}
          manualTracking={carrierInput === 'GHN' ? undefined : { value: trackingCodeInput, onChange: setTrackingCodeInput }}
          busy={updatingSample}
          error={sampleShippingError}
          onClose={() => {
            setTrackingModalItem(null);
            setSampleShippingError('');
          }}
          onSubmit={handleSaveTracking}
        />
      )}

      {/* MODAL 4: Danh Bạ & Khám Phá Nhà Sáng Tạo (KOL/KOC) SCANMS */}
      {discoveryModal}

      {showExclusiveDealModal && selectedKol && (
        <CreateExclusiveDealModal
          collaboratorId={selectedKol.id}
          collaboratorName={selectedKol.fullName}
          storeId={ownedStore?.id}
          onClose={() => setShowExclusiveDealModal(false)}
          onSuccess={() => {
            setShowExclusiveDealModal(false);
            toast.success('Đã gửi đề xuất Thỏa thuận Độc quyền thành công!');
            setActiveTab('messages');
          }}
        />
      )}

      {showQuickCouponModal && selectedKol && ownedStore?.id && (
        <QuickKolCouponModal
          isOpen={showQuickCouponModal}
          storeId={ownedStore.id}
          kol={selectedKol}
          onClose={() => setShowQuickCouponModal(false)}
          onUpdated={() => void loadBackendData()}
          onRequestOpenDealModal={() => {
            if (selectedKol.cooperationStatus === 'APPROVED') {
              setShowExclusiveDealModal(true);
            }
          }}
        />
      )}

      {terminateModalKol && (
        <TerminateCooperationModal
          isOpen={Boolean(terminateModalKol)}
          targetId={terminateModalKol.cooperationId || terminateModalKol.id}
          storeId={ownedStore?.id}
          partnerName={terminateModalKol.fullName}
          mode="shop"
          onClose={() => setTerminateModalKol(null)}
          onTerminated={() => {
            const terminatedId = terminateModalKol.id;
            setKols((prev) =>
              prev.map((k) =>
                k.id === terminatedId ? { ...k, cooperationStatus: 'TERMINATED', hasCooperationHistory: true } : k,
              ),
            );
            setAllPlatformKols((prev) =>
              prev.map((k) =>
                k.id === terminatedId ? { ...k, cooperationStatus: 'TERMINATED', hasCooperationHistory: true } : k,
              ),
            );
            if (lastShopKolHubSnapshot) {
              lastShopKolHubSnapshot.kols = lastShopKolHubSnapshot.kols.map((k) =>
                k.id === terminatedId ? { ...k, cooperationStatus: 'TERMINATED', hasCooperationHistory: true } : k,
              );
            }
          }}
        />
      )}
    </div>
  );
}
