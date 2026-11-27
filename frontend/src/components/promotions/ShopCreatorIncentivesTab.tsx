import { Modal } from '../ui/Modal';
import { registerPrivateCacheReset } from '@/utils/private-cache-session';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Tag,
  Trophy,
  Search,
  CheckCircle2,
  Copy,
  Check,
  X,
  Clock,
  Ticket,
  XCircle,
  MessageSquare,
  Plus,
  ChevronDown,
  History,
} from 'lucide-react';
import api from '../../services/api';
import { storeService } from '../../services/store.service';
import { couponService } from '../../services/coupon.service';
import { toVietnamDateTime, parseVietnamDateTime, vietnamPickerNow } from '../../utils/date-time.utils';
import { DateTimePicker } from '../common/DateTimePicker';
import { toast } from '../../utils/toast';
import { ShopMonthlyBonusPanel } from './ShopMonthlyBonusPanel';
import { IssueDealCouponModal } from './IssueDealCouponModal';

interface CreatorCoupon {
  id: string;
  codeNormalized: string;
  displayCode: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  minimumOrderAmount?: number | string | null;
  maximumDiscountAmount?: number | string | null;
  usageCount: number;
  usageLimitTotal?: number | null;
  budgetTotal?: number;
  budgetUsed?: number;
  status: string;
  startsAt?: string;
  expiresAt?: string;
  rejectedReason?: string | null;
  blockedReason?: string | null;
  benefitType?: string;
  scopeType?: string;
  collaboratorId?: string;
  collaborator?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
    email?: string;
    collaboratorProfile?: {
      avatarUrl?: string | null;
      tier?: { name?: string } | null;
    } | null;
  };
  createdAt: string;
}

let lastCreatorIncentivesSnapshot: { coupons: CreatorCoupon[]; partnerKols: any[]; currentStoreId: string; } | null = null;
registerPrivateCacheReset(() => { lastCreatorIncentivesSnapshot = null; });

export function ShopCreatorIncentivesTab({ section, hideNavigation = false, onCouponCount }: { section?: 'coupons' | 'milestones'; hideNavigation?: boolean; onCouponCount?: (count: number) => void } = {}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reviewCouponId = searchParams.get('reviewCouponId');
  const handledReviewCouponRef = useRef<string | null>(null);
  const [localSection, setActiveSection] = useState<'coupons' | 'milestones'>(() => searchParams.get('section') === 'milestones' ? 'milestones' : 'coupons');
  const activeSection = section ?? localSection;
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [historyKolId, setHistoryKolId] = useState<string | null>(null);
  const [avatarErrorByKol, setAvatarErrorByKol] = useState<Record<string, boolean>>({});
  const [coupons, setCoupons] = useState<CreatorCoupon[]>(() => (reviewCouponId ? [] : lastCreatorIncentivesSnapshot?.coupons || []));
  const [currentStoreId, setCurrentStoreId] = useState<string>(() => lastCreatorIncentivesSnapshot?.currentStoreId || '');
  const [loading, setLoading] = useState<boolean>(() => !lastCreatorIncentivesSnapshot);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState<string>(() => searchParams.get('search') || '');
  useEffect(() => {
    const q = searchParams.get('search');
    if (q !== null) setSearchQuery(q);
  }, [searchParams]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modal states
  const [isIssueCouponOpen, setIsIssueCouponOpen] = useState<boolean>(false);
  const [partnerKols, setPartnerKols] = useState<any[]>(() => Array.isArray(lastCreatorIncentivesSnapshot?.partnerKols) ? lastCreatorIncentivesSnapshot.partnerKols : []);
  const [selectedKolId, setSelectedKolId] = useState<string>('');
  const [customCode, setCustomCode] = useState<string>('');
  const [couponDiscountPercent, setCouponDiscountPercent] = useState<number>(10);
  const [couponMaxDiscount, setCouponMaxDiscount] = useState<number>(50000);
  const [couponExpiresAt, setCouponExpiresAt] = useState(() =>
    toVietnamDateTime(new Date(Date.now() + 14 * 86_400_000)),
  );
  const [issuingCoupon, setIssuingCoupon] = useState<boolean>(false);

  // Proposal Review Modal states
  const [reviewingProposal, setReviewingProposal] = useState<CreatorCoupon | null>(null);
  const [reviewDiscountPercent, setReviewDiscountPercent] = useState<number>(10);
  const [reviewMaxDiscount, setReviewMaxDiscount] = useState<number>(50000);
  const [reviewMinOrder, setReviewMinOrder] = useState<number>(0);
  const [reviewExpiresAt, setReviewExpiresAt] = useState<string>(() => {
    const d = new Date(Date.now() + 14 * 86_400_000);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [isApproving, setIsApproving] = useState<boolean>(false);

  // Proposal Reject Modal states
  const [rejectingProposal, setRejectingProposal] = useState<CreatorCoupon | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [isRejecting, setIsRejecting] = useState<boolean>(false);

  // Coupon Detail / Extend / Block Modal states
  const [detailCoupon, setDetailCoupon] = useState<CreatorCoupon | null>(null);
  const [extendExpiresAt, setExtendExpiresAt] = useState<string>('');
  const extendCalendar = useRef<HTMLDivElement>(null);
  const currentExpiry = detailCoupon?.expiresAt ? Date.parse(detailCoupon.expiresAt) : 0;
  const earliestExpiry = Math.floor(Math.max(Date.now(), currentExpiry || 0) / 60_000) * 60_000 + 60_000;
  const selectedExpiry = parseVietnamDateTime(extendExpiresAt);
  const canSaveExpiry = Number.isFinite(selectedExpiry) && selectedExpiry >= earliestExpiry;
  const [isUpdatingPolicy, setIsUpdatingPolicy] = useState<boolean>(false);
  const [blockReasonInput, setBlockReasonInput] = useState<string>('');
  const [showBlockInput, setShowBlockInput] = useState<boolean>(false);
  const [isBlockingCoupon, setIsBlockingCoupon] = useState<boolean>(false);

  const loadData = useCallback(async (showIndicator = false) => {
    if (showIndicator) setIsRefreshing(true);
    setLoadError('');
    try {
      const store = await storeService.getMyStore();
      const sId = store?.id || '';
      setCurrentStoreId(sId);

      const [couponsRes, pendingRes, partnersRes] = await Promise.allSettled([
        sId ? couponService.getStoreCoupons(sId, { limit: 100 }) : api.get('/coupons'),
        sId ? couponService.getStoreCoupons(sId, { status: 'PENDING_APPROVAL', limit: 100 }) : Promise.resolve([]),
        api.get('/store-collaborators/shop'),
      ]);
      if (couponsRes.status === 'rejected' || partnersRes.status === 'rejected')
        setLoadError('Chưa tải đủ mã ưu đãi và đối tác. Dữ liệu đang hiển thị có thể chưa được cập nhật.');

      let mergedCoupons: CreatorCoupon[] = [];
      if (couponsRes.status === 'fulfilled') {
        const resVal = couponsRes.value as any;
        const raw = resVal?.data?.data || resVal?.data || resVal?.items || (Array.isArray(resVal) ? resVal : []);
        if (Array.isArray(raw)) mergedCoupons = raw;
      }
      if (pendingRes.status === 'fulfilled') {
        const pVal = pendingRes.value as any;
        const pRaw = pVal?.data?.data || pVal?.data || pVal?.items || (Array.isArray(pVal) ? pVal : []);
        if (Array.isArray(pRaw) && pRaw.length > 0) {
          const seen = new Set(mergedCoupons.map((c) => c.id));
          const extra = pRaw.filter((c: CreatorCoupon) => c?.id && !seen.has(c.id));
          if (extra.length > 0) mergedCoupons = [...extra, ...mergedCoupons];
        }
      }
      if (couponsRes.status === 'fulfilled' || pendingRes.status === 'fulfilled') {
        setCoupons(mergedCoupons);
      }

      let loadedPartners: any[] = [];
      if (partnersRes.status === 'fulfilled') {
        const body = (partnersRes.value as any)?.data?.data || (partnersRes.value as any)?.data || partnersRes.value;
        const raw = body?.members || body?.items || (Array.isArray(body) ? body : []);
        const list = Array.isArray(raw)
          ? raw.map((item: any) => ({
              id: item.collaboratorId || item.collaborator?.id || item.id,
              fullName: item.collaborator?.fullName || item.fullName || 'Nhà Sáng Tạo',
              email: item.collaborator?.email || item.email || '',
              avatarUrl: item.collaborator?.avatarUrl || item.collaborator?.collaboratorProfile?.avatarUrl || item.avatarUrl || '',
              tier: item.collaborator?.collaboratorProfile?.tier?.name || item.tier || 'KOL',
            }))
          : [];
        loadedPartners = list;
        setPartnerKols(list);
      }
      lastCreatorIncentivesSnapshot = { coupons: mergedCoupons, partnerKols: loadedPartners, currentStoreId: sId };
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Không tải được ưu đãi của cửa hàng.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  useEffect(() => {
    if (!reviewCouponId || coupons.length === 0) return;
    if (handledReviewCouponRef.current === reviewCouponId) return;
    const target = coupons.find((c) => c.id === reviewCouponId);
    if (!target) return;
    handledReviewCouponRef.current = reviewCouponId;
    const targetKolKey = target.collaboratorId || target.collaborator?.id || target.collaborator?.email || '';
    if (targetKolKey && ['EXPIRED', 'REJECTED', 'BLOCKED'].includes(target.status)) {
      setHistoryKolId(targetKolKey);
    }
    if (target.status === 'PENDING_APPROVAL') {
      setReviewingProposal(target);
      setReviewDiscountPercent(target.discountValue > 0 && target.discountValue <= 20 ? target.discountValue : 10);
    } else {
      setDetailCoupon(target);
      const baseDate = target.expiresAt ? new Date(target.expiresAt) : new Date(Date.now() + 14 * 86_400_000);
      setExtendExpiresAt(toVietnamDateTime(baseDate));
    }
  }, [reviewCouponId, coupons]);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleKolSelect = (kolId: string) => {
    setSelectedKolId(kolId);
    if (!kolId) {
      setCustomCode('');
      return;
    }
    const kol = partnerKols.find((k) => k.id === kolId || k.userId === kolId);
    const kolNameClean = (kol?.fullName || 'KOC')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 10);
    setCustomCode(`${kolNameClean}${couponDiscountPercent}`);
  };

  const handleDiscountChange = (pct: number) => {
    setCouponDiscountPercent(pct);
    if (selectedKolId) {
      const kol = partnerKols.find((k) => k.id === selectedKolId || k.userId === selectedKolId);
      const kolNameClean = (kol?.fullName || 'KOC')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, 10);
      setCustomCode(`${kolNameClean}${pct}`);
    }
  };

  const handleIssueCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKolId) {
      toast.error('Vui lòng chọn KOC cần cấp mã ưu đãi.');
      return;
    }
    if (!currentStoreId) {
      toast.error('Không tìm thấy thông tin gian hàng trực thuộc.');
      return;
    }

    const kol = partnerKols.find((k) => k.id === selectedKolId || k.userId === selectedKolId);
    const kolNameClean = (kol?.fullName || 'KOC')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 10);
    const fallbackCode = `${kolNameClean}${couponDiscountPercent}`;
    const finalCode = (customCode || fallbackCode).trim().toUpperCase();

    const expiry = parseVietnamDateTime(couponExpiresAt);
    if (!Number.isFinite(expiry) || expiry <= Date.now()) {
      toast.error('Thời hạn của mã phải sau thời điểm hiện tại.');
      return;
    }

    setIssuingCoupon(true);
    try {
      await couponService.createStoreCoupon(currentStoreId, {
        code: finalCode,
        collaboratorId: kol?.id || kol?.userId || selectedKolId,
        discountType: 'PERCENTAGE',
        discountValue: couponDiscountPercent,
        maximumDiscountAmount: couponMaxDiscount,
        expiresAt: new Date(expiry).toISOString(),
        scopeType: 'STORE_WIDE',
        benefitType: 'GOODS',
      } as any);

      toast.success(
        couponDiscountPercent > 10
          ? `Đã tạo mã "${finalCode}" (${couponDiscountPercent}%) và chuyển System Admin duyệt ngoại lệ.`
          : `Đã cấp thành công mã ưu đãi "${finalCode}" cho ${kol?.fullName || 'KOC'} (đã tự động thu hồi mã cũ).`,
      );
      setIsIssueCouponOpen(false);
      setSelectedKolId('');
      setCustomCode('');
      await loadData(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Không thể tạo mã ưu đãi.');
    } finally {
      setIssuingCoupon(false);
    }
  };

  const handleConfirmApprove = async () => {
    if (!reviewingProposal || !currentStoreId) return;
    if (reviewDiscountPercent < 3 || reviewDiscountPercent > 20) {
      toast.error('Mức giảm giá phải từ 3% đến tối đa 20%.');
      return;
    }
    if (!reviewMaxDiscount || reviewMaxDiscount < 10000) {
      toast.error('Giảm tối đa / đơn phải từ 10.000₫ trở lên.');
      return;
    }
    if (!reviewExpiresAt || new Date(reviewExpiresAt).getTime() <= Date.now()) {
      toast.error('Vui lòng chọn ngày hết hạn chiến dịch hợp lệ ở tương lai.');
      return;
    }
    setIsApproving(true);
    try {
      await couponService.approveCoupon(currentStoreId, reviewingProposal.id, {
        discountType: 'PERCENTAGE',
        discountValue: reviewDiscountPercent,
        maximumDiscountAmount: reviewMaxDiscount,
        minimumOrderAmount: reviewMinOrder,
        expiresAt: new Date(reviewExpiresAt).toISOString(),
        scopeType: 'STORE_WIDE',
      } as any);
      toast.success(
        reviewDiscountPercent > 10
          ? `Đã xác nhận mã "${reviewingProposal.displayCode}" (${reviewDiscountPercent}%) và chuyển System Admin duyệt ngoại lệ (>10%)!`
          : `Đã duyệt mã "${reviewingProposal.displayCode}" (${reviewDiscountPercent}%) cho ${reviewingProposal.collaborator?.fullName || 'KOC'} và tự động thu hồi mã cũ!`,
      );
      setReviewingProposal(null);
      await loadData(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Không thể phê duyệt mã.');
    } finally {
      setIsApproving(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingProposal || !currentStoreId) return;
    if (!rejectReason.trim() || rejectReason.trim().length < 5) {
      toast.error('Lý do từ chối phải có ít nhất 5 ký tự.');
      return;
    }
    setIsRejecting(true);
    try {
      await couponService.rejectCoupon(currentStoreId, rejectingProposal.id, rejectReason.trim());
      toast.success(`Đã từ chối đề xuất mã "${rejectingProposal.displayCode}".`);
      setRejectingProposal(null);
      setRejectReason('');
      await loadData(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Không thể từ chối đề xuất mã.');
    } finally {
      setIsRejecting(false);
    }
  };

  // Filtered coupons: Lọc bỏ voucher freeship / voucher sàn rác cũ, chỉ hiển thị Coupon KOC Attribution hợp lệ
  const validKolCoupons = useMemo(
    () =>
      coupons.filter((c: any) => {
        if (c.benefitType === 'SHIPPING' || (c.discountType === 'PERCENTAGE' && Number(c.discountValue) >= 100)) return false;
        if (!c.collaborator && !c.collaboratorId) return false;
        return true;
      }),
    [coupons],
  );

  useEffect(() => { onCouponCount?.(validKolCoupons.length); }, [onCouponCount, validKolCoupons.length]);
  const couponFilterCounts = useMemo(() => {
    let pending = 0;
    let active = 0;
    let history = 0;
    for (const c of validKolCoupons) {
      if (c.status === 'PENDING_APPROVAL') pending++;
      else if (['ACTIVE', 'PENDING_ADMIN_APPROVAL', 'PENDING_BLOCK_APPROVAL', 'PAUSED'].includes(c.status)) active++;
      else history++;
    }
    return { all: validKolCoupons.length, pending, active, history };
  }, [validKolCoupons]);

  const filteredCoupons = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return validKolCoupons.filter((c: any) => {
      if (statusFilter === 'PENDING' && c.status !== 'PENDING_APPROVAL') return false;
      if (
        statusFilter === 'ACTIVE' &&
        !['ACTIVE', 'PENDING_ADMIN_APPROVAL', 'PENDING_BLOCK_APPROVAL', 'PAUSED'].includes(c.status)
      )
        return false;
      if (
        statusFilter === 'HISTORY' &&
        !['EXPIRED', 'REJECTED', 'BLOCKED'].includes(c.status)
      )
        return false;

      if (['EXPIRED', 'BLOCKED', 'REJECTED'].includes(statusFilter) && c.status !== statusFilter) return false;

      if (!q) return true;
      return (
        c.displayCode?.toLowerCase().includes(q) ||
        c.codeNormalized?.toLowerCase().includes(q) ||
        c.collaborator?.fullName?.toLowerCase().includes(q) ||
        c.collaborator?.email?.toLowerCase().includes(q)
      );
    });
  }, [validKolCoupons, statusFilter, searchQuery]);

  const kolGroups = useMemo(() => {
    const partnerById = new Map<string, any>();
    for (const p of partnerKols) {
      if (p?.id) partnerById.set(p.id, p);
    }

    const groups = new Map<
      string,
      {
        kolId: string;
        fullName: string;
        email: string;
        avatarUrl: string;
        tier: string;
        pendingProposals: CreatorCoupon[];
        activeCoupons: CreatorCoupon[];
        historyCoupons: CreatorCoupon[];
      }
    >();

    for (const c of filteredCoupons) {
      const kolId = c.collaboratorId || c.collaborator?.id || c.collaborator?.email || 'unknown';
      const partner = partnerById.get(kolId);
      let group = groups.get(kolId);
      if (!group) {
        group = {
          kolId,
          fullName: c.collaborator?.fullName || partner?.fullName || 'KOC Đối Tác',
          email: c.collaborator?.email || partner?.email || '',
          avatarUrl:
            c.collaborator?.avatarUrl ||
            c.collaborator?.collaboratorProfile?.avatarUrl ||
            partner?.avatarUrl ||
            '',
          tier:
            c.collaborator?.collaboratorProfile?.tier?.name ||
            partner?.tier ||
            '',
          pendingProposals: [],
          activeCoupons: [],
          historyCoupons: [],
        };
        groups.set(kolId, group);
      } else if (!group.avatarUrl) {
        group.avatarUrl =
          c.collaborator?.avatarUrl ||
          c.collaborator?.collaboratorProfile?.avatarUrl ||
          partner?.avatarUrl ||
          '';
      }

      if (c.status === 'PENDING_APPROVAL') {
        group.pendingProposals.push(c);
      } else if (['ACTIVE', 'PENDING_ADMIN_APPROVAL', 'PENDING_BLOCK_APPROVAL', 'PAUSED'].includes(c.status)) {
        group.activeCoupons.push(c);
      } else {
        group.historyCoupons.push(c);
      }
    }

    return Array.from(groups.values()).sort((a, b) => {
      if (a.pendingProposals.length > 0 && b.pendingProposals.length === 0) return -1;
      if (a.pendingProposals.length === 0 && b.pendingProposals.length > 0) return 1;
      if (a.activeCoupons.length > 0 && b.activeCoupons.length === 0) return -1;
      if (a.activeCoupons.length === 0 && b.activeCoupons.length > 0) return 1;
      return a.fullName.localeCompare(b.fullName, 'vi');
    });
  }, [filteredCoupons, partnerKols]);

  const historyGroup = kolGroups.find(group => group.kolId === historyKolId);

  const openCouponDetail = (c: CreatorCoupon) => {
    setDetailCoupon(c);
    const baseDate = c.expiresAt ? new Date(c.expiresAt) : new Date(Date.now() + 14 * 86_400_000);
    setExtendExpiresAt(toVietnamDateTime(baseDate));
    setShowBlockInput(false);
    setBlockReasonInput('');
  };

  const renderStatusBadge = (status: string, blockedReason?: string | null) => {
    if (status === 'ACTIVE') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FBF5EB] text-[#8C6226] border border-[#EEDFC6]">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Đang hoạt động
        </span>
      );
    }
    if (status === 'PENDING_APPROVAL') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <Clock className="w-3 h-3 text-amber-600" />
          Chờ Shop duyệt
        </span>
      );
    }
    if (status === 'PENDING_ADMIN_APPROVAL') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <Clock className="w-3 h-3 text-amber-600" />
          Chờ Admin duyệt (&gt;10%)
        </span>
      );
    }
    if (status === 'PENDING_BLOCK_APPROVAL') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-[#92400E] border border-amber-200">
          <Clock className="w-3 h-3 text-[#D97706]" />
          Chờ Vận hành duyệt ngừng
        </span>
      );
    }
    if (status === 'REJECTED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle className="w-3 h-3 text-rose-600" />
          Đã từ chối
        </span>
      );
    }
    if (status === 'BLOCKED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-[#DC2626] border border-rose-200">
          <XCircle className="w-3 h-3 text-[#DC2626]" />
          {blockedReason?.startsWith('Đã thay thế bởi mã định danh mới:') ? 'Đã thay thế' : 'Đã khóa'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-600 border border-stone-200">
        <Clock className="w-3 h-3" />
        Đã thay thế / Hết hạn
      </span>
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in-50 duration-200">
      {loadError && <div role="alert" className="rounded-xl border border-[#EEDFC6] bg-white p-4 text-sm text-[#DC2626]">
        {loadError}<button type="button" disabled={isRefreshing} onClick={() => void loadData(true)} className="ml-2 inline-flex min-h-11 items-center font-semibold underline">Thử lại</button>
      </div>}
      {/* Sub-navigation tabs: Chuẩn 2 Trụ Cột Đãi Ngộ KOC */}
      {!hideNavigation && <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="w-full rounded-2xl border border-[#EAE4D7] bg-white p-2" role="group" aria-label="Chức năng đãi ngộ KOL">
        <div className="relative grid grid-cols-2 items-stretch gap-4 before:pointer-events-none before:absolute before:bottom-2 before:left-1/2 before:top-2 before:w-px before:-translate-x-1/2 before:bg-[#EAE4D7]">
          <button
            type="button"
            aria-pressed={activeSection === 'coupons'} onClick={() => setActiveSection('coupons')}
            className={`inline-flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium leading-5 transition-colors ${activeSection === 'coupons' ? 'border-[#EEDFC6] bg-[#FBF5EB] text-[#715126]' : 'border-transparent bg-white text-[#7D715E] hover:bg-[#FAF8F5]'}`}
          >
            <Tag className={`w-3.5 h-3.5 ${activeSection === 'coupons' ? 'text-[#B88E4F]' : 'text-[#7D715E]'}`} />
            <span>Mã ưu đãi KOC</span>
            <span className="inline-flex min-w-5 items-center justify-center rounded-md bg-[#F3EFE6] px-1.5 py-0.5 text-[10px] leading-4 text-[#7D715E] tabular-nums">
              {validKolCoupons.length}
            </span>
          </button>

          <button
            type="button"
            aria-pressed={activeSection === 'milestones'} onClick={() => setActiveSection('milestones')}
            className={`inline-flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium leading-5 transition-colors ${activeSection === 'milestones' ? 'border-[#EEDFC6] bg-[#FBF5EB] text-[#715126]' : 'border-transparent bg-white text-[#7D715E] hover:bg-[#FAF8F5]'}`}
          >
            <Trophy className={`w-3.5 h-3.5 ${activeSection === 'milestones' ? 'text-[#B88E4F]' : 'text-[#7D715E]'}`} />
            <span>Thưởng mốc tháng</span>
          </button>
        </div>

      </div>

      </div>}
      {/* SECTION 1: ATTRIBUTION COUPONS (GROUPED BY KOC) */}
      {activeSection === 'coupons' && (
        <div className="space-y-4">
          {/* Search & Status Filter Bar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-[#EAE4D7] bg-white p-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 min-w-0">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7D715E]" />
                <input
                  type="text"
                  placeholder="Tìm theo tên KOC, email hoặc mã coupon..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Tìm theo mã coupon hoặc tên KOC"
                  className="h-11 w-full rounded-xl border border-[#EAE4D7] bg-white pl-9 pr-3 text-sm text-[#1A1612] outline-none focus:border-[#C59B58] focus:ring-2 focus:ring-[#FBF5EB]"
                />
              </div>
              <div className="relative shrink-0 sm:min-w-[174px]">
                <select
                  aria-label="Lọc trạng thái mã ưu đãi"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="flex h-11 w-full appearance-none items-center [&::picker-icon]:hidden rounded-xl border border-[#EAE4D7] bg-white py-0 pl-3 pr-9 text-sm leading-normal [background-image:none]!"
                >
                  <option value="ALL">Tất cả trạng thái ({couponFilterCounts.all})</option>
                  <option value="PENDING">Chờ duyệt ({couponFilterCounts.pending})</option>
                  <option value="ACTIVE">Đang hiệu lực ({couponFilterCounts.active})</option>
                  <option value="HISTORY">Lịch sử ({couponFilterCounts.history})</option>
                  <option value="EXPIRED">Hết hạn</option>
                  <option value="BLOCKED">Đã khóa / thay thế</option>
                  <option value="REJECTED">Đã từ chối</option>
                </select>
                <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#7D715E]" />
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedKolId('');
                  setIsIssueCouponOpen(true);
                }}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] px-4 text-xs font-bold text-[#1A1612] transition cursor-pointer shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>Phát hành mã cho KOC</span>
              </button>
            </div>

          </div>

          {/* KOC GROUP CARDS */}
          {kolGroups.length > 0 ? (
            <div aria-label="Danh sách mã ưu đãi theo KOC" className="@container rounded-2xl border border-[#EAE4D7] bg-white p-2 sm:p-3">
              <div className="grid grid-cols-1 gap-3 @min-[1000px]:grid-cols-2">
                {kolGroups.map((group) => {
                  const showRealAvatar = Boolean(group.avatarUrl) && !avatarErrorByKol[group.kolId];

                  return (
                    <section
                      key={group.kolId}
                      className="min-w-0 overflow-hidden rounded-xl border border-[#EAE4D7] bg-white"
                    >
                      {/* TẦNG 1: HEADER KOC (Avatar thật + Định danh + Nhắn tin KOC + Cấp mã) */}
                      <header className="flex flex-col justify-between gap-3 border-b border-[#EAE4D7] bg-[#FAF8F5] px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {showRealAvatar ? (
                            <img
                              src={group.avatarUrl}
                              alt={group.fullName}
                              onError={() =>
                                setAvatarErrorByKol((prev) => ({ ...prev, [group.kolId]: true }))
                              }
                              className="size-10 rounded-full object-cover ring-1 ring-black/10 shrink-0 bg-white"
                            />
                          ) : (
                            <div className="size-10 rounded-full bg-[#FBF5EB] border border-[#EEDFC6] text-[#8C6226] flex items-center justify-center font-bold text-base shrink-0">
                              {group.fullName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="m-0 text-sm font-bold text-[#1A1612] truncate">
                                {group.fullName}
                              </h3>
                              {group.tier && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FBF5EB] text-[#8C6226] border border-[#EEDFC6]">
                                  {group.tier}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[#7D715E] mt-0.5 tabular-nums">
                              {group.email && <span className="truncate">{group.email}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {group.historyCoupons.length > 0 && (
                            <button
                              type="button"
                              aria-haspopup="dialog"
                              aria-label={`Lịch sử mã của ${group.fullName}`}
                              onClick={() => setHistoryKolId(group.kolId)}
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#EAE4D7] bg-white px-3 text-xs font-semibold text-[#715126] hover:bg-[#FBF5EB]"
                            >
                              <History aria-hidden="true" size={14} />
                              Lịch sử ({group.historyCoupons.length})
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/merchant/kol-hub?kol=${encodeURIComponent(group.kolId)}&tab=messages`)
                            }
                            className="inline-flex items-center h-8 gap-1.5 px-3 rounded-lg border border-[#EAE4D7] bg-white hover:bg-[#F3EFE6] text-[#1A1612] text-xs font-semibold transition cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-[#B88E4F]" />
                            <span>Nhắn tin KOC</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedKolId(group.kolId);
                              setIsIssueCouponOpen(true);
                            }}
                            className="inline-flex items-center h-8 gap-1.5 px-3 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] hover:bg-[#F3EFE6] text-[#715126] text-xs font-bold transition cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Cấp mã cho KOC</span>
                          </button>
                        </div>
                      </header>

                      {/* TẦNG 2: YÊU CẦU CHỜ DUYỆT & MÃ ĐANG HIỆU LỰC */}
                      {(group.pendingProposals.length > 0 || group.activeCoupons.length > 0) && <div className="divide-y divide-[#EAE4D7]">
                        {group.pendingProposals.length > 0 && (
                          <div className="p-3.5 bg-[#FBF5EB]/60 space-y-2.5">
                            <div className="text-[11px] font-bold uppercase tracking-wide text-[#8C6226]">
                              Yêu cầu đề xuất mã mới ({group.pendingProposals.length})
                            </div>
                            <div className="grid gap-2.5">
                              {group.pendingProposals.map((p) => (
                                <div
                                  key={p.id}
                                  className="p-3 rounded-xl bg-white border border-[#EEDFC6] flex flex-col justify-between gap-2.5 text-left"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <span className="break-all font-mono font-extrabold text-[#B88E4F] text-sm tracking-wider">
                                        {p.displayCode || p.codeNormalized}
                                      </span>
                                      <p className="m-0 text-[11px] text-[#7D715E] mt-0.5">
                                        Phạm vi: <strong className="text-[#1A1612]">Toàn bộ cửa hàng</strong>
                                      </p>
                                    </div>
                                    {renderStatusBadge(p.status)}
                                  </div>
                                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-[#EAE4D7]">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRejectingProposal(p);
                                        setRejectReason('');
                                      }}
                                      className="px-3 py-1.5 rounded-lg border border-[#EAE4D7] text-xs font-semibold text-[#7D715E] hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition cursor-pointer"
                                    >
                                      Từ chối
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setReviewingProposal(p);
                                        setReviewDiscountPercent(p.discountValue <= 5 ? 5 : 10);
                                      }}
                                      className="px-3.5 py-1.5 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-[#1A1612] text-xs font-bold transition shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Duyệt &amp; Gán %</span>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {group.activeCoupons.length > 0 && (
                          <ul className="m-0 list-none divide-y divide-[#EAE4D7] p-0">
                            {group.activeCoupons.map((coupon) => {
                              const code = coupon.displayCode || coupon.codeNormalized;
                              return (
                                <li key={coupon.id} className="space-y-3 px-4 py-3.5">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex min-w-0 items-center gap-1.5">
                                      <span title={code} className="min-w-0 break-all font-mono text-xs font-semibold text-[#715126]">{code}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleCopy(code)}
                                        className="grid size-7 shrink-0 place-items-center rounded-md text-[#7D715E] transition-colors hover:bg-[#F3EFE6] hover:text-[#1A1612]"
                                        aria-label="Sao chép mã"
                                      >
                                        {copiedCode === code ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                      </button>
                                    </div>
                                    {renderStatusBadge(coupon.status)}
                                  </div>
                                  <dl className="m-0 grid grid-cols-[1fr_1fr_1.35fr] divide-x divide-[#EAE4D7] border-y border-[#EAE4D7] py-2.5 text-xs">
                                    <div className="min-w-0 pr-2">
                                      <dt className="text-[#7D715E]">Mức giảm</dt>
                                      <dd className="m-0 mt-1 font-semibold tabular-nums text-[#DC2626]">
                                        {coupon.discountType === 'FIXED_AMOUNT' ? `-${Number(coupon.discountValue).toLocaleString('vi-VN')} ₫` : `-${coupon.discountValue}%`}
                                      </dd>
                                    </div>
                                    <div className="min-w-0 px-2.5">
                                      <dt className="text-[#7D715E]">Lượt dùng</dt>
                                      <dd className="m-0 mt-1 font-semibold tabular-nums text-[#1A1612]">
                                        {coupon.usageCount || 0}{coupon.usageLimitTotal ? `/${coupon.usageLimitTotal}` : ''} lượt
                                      </dd>
                                    </div>
                                    <div className="min-w-0 pl-2.5">
                                      <dt className="text-[#7D715E]">Thời hạn</dt>
                                      <dd className="m-0 mt-1 font-medium tabular-nums text-[#1A1612]">
                                        {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'Theo Hợp đồng VIP'}
                                      </dd>
                                    </div>
                                  </dl>
                                  <div className="flex items-center justify-end gap-2">
                                    {coupon.scopeType === 'STORE_WIDE' && <span className="mr-auto text-xs text-[#7D715E]">Toàn Shop</span>}
                                    <button
                                      type="button"
                                      aria-label={`Chi tiết mã ${code}`}
                                      onClick={() => openCouponDetail(coupon)}
                                      className="min-h-8 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-3 text-xs font-semibold text-[#8C6226] transition-colors hover:bg-[#F3EFE6]"
                                    >
                                      Xem chi tiết
                                    </button>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>}
                    </section>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#EAE4D7] bg-white p-8 text-center text-xs text-[#7D715E]">
              {loading
                ? 'Đang đồng bộ danh sách mã ưu đãi KOC...'
                : loadError
                ? 'Chưa xác định được danh sách mã ưu đãi.'
                : 'Chưa có mã ưu đãi định danh KOC nào phù hợp với bộ lọc.'}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: MONTHLY MILESTONE RULES (FR-09) - CHUẨN DOANH SỐ THÁNG */}
      {activeSection === 'milestones' && <ShopMonthlyBonusPanel storeId={currentStoreId} />}

      {/* Chỉ cấp mã cho KOL đã có deal toàn Shop được duyệt. */}
      {isIssueCouponOpen && <IssueDealCouponModal partners={partnerKols} storeId={currentStoreId} selectedId={selectedKolId} code={customCode} discount={couponDiscountPercent} maxDiscount={couponMaxDiscount} expiresAt={couponExpiresAt} busy={issuingCoupon} onSelect={handleKolSelect} onCode={setCustomCode} onDiscount={handleDiscountChange} onMaxDiscount={setCouponMaxDiscount} onExpiresAt={setCouponExpiresAt} onClose={() => setIsIssueCouponOpen(false)} onSubmit={handleIssueCoupon}/>}

      {/* Modal Duyệt Đề Xuất Mã KOC */}
      {reviewingProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#EAE4D7] w-full max-w-md p-5 sm:p-6 text-left animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-[#EAE4D7]">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center shrink-0">
                  <Ticket className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-[#1A1612] m-0">Xét duyệt mã KOC</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviewingProposal(null)}
                className="w-8 h-8 rounded-lg text-[#7D715E] hover:bg-[#FAF8F5] flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#7D715E]">Mã đề xuất:</span>
                  <span className="font-mono font-black text-sm text-[#B88E4F]">
                    {reviewingProposal.displayCode || reviewingProposal.codeNormalized}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#7D715E]">KOC đề xuất:</span>
                  <span className="font-semibold text-xs text-[#1A1612]">
                    {reviewingProposal.collaborator?.fullName || 'KOC Đối Tác'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#7D715E]">Phạm vi áp dụng:</span>
                  <span className="font-bold text-xs text-[#B88E4F]">
                    Toàn bộ sản phẩm của gian hàng
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#1A1612]">
                    Mức giảm giá (3% – 20%) <span className="text-[#DC2626]">*</span>
                  </label>
                  <span className="text-xs font-extrabold text-[#B88E4F]">Giảm {reviewDiscountPercent}%</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[5, 10, 15, 20].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setReviewDiscountPercent(pct)}
                      className={`py-2 px-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        reviewDiscountPercent === pct
                          ? 'bg-[#FBF5EB] border-[#C59B58] text-[#8C6226]'
                          : 'bg-white border-[#EAE4D7] text-[#7D715E]'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                  <input
                    type="number"
                    min={3}
                    max={20}
                    value={reviewDiscountPercent}
                    onChange={(e) => setReviewDiscountPercent(Math.min(20, Math.max(3, Number(e.target.value) || 3)))}
                    aria-label="Nhập phần trăm giảm giá"
                    className="py-1.5 px-2 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] text-center text-xs font-bold text-[#1A1612] outline-none focus:border-[#C59B58]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#1A1612] block mb-1">
                    Giảm tối đa / đơn (₫) <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="number"
                    min={10000}
                    step={10000}
                    value={reviewMaxDiscount}
                    onChange={(e) => setReviewMaxDiscount(Math.max(10000, Number(e.target.value) || 10000))}
                    className="w-full h-9 px-3 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] text-xs font-bold text-[#1A1612] outline-none focus:border-[#C59B58]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#1A1612] block mb-1">
                    Đơn tối thiểu (₫)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={50000}
                    value={reviewMinOrder}
                    onChange={(e) => setReviewMinOrder(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full h-9 px-3 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] text-xs font-bold text-[#1A1612] outline-none focus:border-[#C59B58]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-1">
                  Ngày hết hạn chiến dịch <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={reviewExpiresAt}
                  onChange={(e) => setReviewExpiresAt(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] text-xs font-bold text-[#1A1612] outline-none focus:border-[#C59B58]"
                />
              </div>

              {reviewDiscountPercent > 10 ? (
                <p className="m-0 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-[11px] font-semibold text-[#D97706]">
                  Mức giảm {reviewDiscountPercent}% (&gt; 10%): Sau khi xác nhận sẽ tự động chuyển System Admin phê duyệt ngoại lệ.
                </p>
              ) : (
                <p className="m-0 text-[11px] text-[#7D715E]">
                  Mức giảm {reviewDiscountPercent}% (3%–10%): Kích hoạt ngay, không giới hạn lượt dùng trong thời hạn chiến dịch (hạch toán trừ doanh thu đơn hàng).
                </p>
              )}

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#EAE4D7]">
                <button
                  type="button"
                  onClick={() => setReviewingProposal(null)}
                  className="px-4 py-2 rounded-xl border border-[#EAE4D7] text-xs font-semibold text-[#7D715E] hover:bg-[#F3EFE6] transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleConfirmApprove}
                  disabled={isApproving}
                  className="px-5 py-2 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-[#1A1612] text-xs font-bold shadow-2xs transition cursor-pointer disabled:opacity-50"
                >
                  {isApproving ? 'Đang duyệt...' : 'Phê duyệt'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Từ Chối Đề Xuất Mã KOC */}
      {rejectingProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#EAE4D7] w-full max-w-md p-5 sm:p-6 text-left animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-[#EAE4D7]">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                  <XCircle className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-[#1A1612] m-0">Từ chối đề xuất mã</h3>
                  <p className="text-xs text-[#7D715E] m-0 mt-0.5">Nhập lý do gửi phản hồi tới KOC</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectingProposal(null)}
                className="w-8 h-8 rounded-lg text-[#7D715E] hover:bg-[#FAF8F5] flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-[#7D715E] m-0">
                Bạn đang từ chối mã <strong>{rejectingProposal.displayCode}</strong> do KOC <strong>{rejectingProposal.collaborator?.fullName}</strong> đề xuất.
              </p>

              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-1">
                  Lý do từ chối <span className="text-[#DC2626]">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ví dụ: Tên mã chưa phù hợp với quy chuẩn nhận diện thương hiệu gian hàng, vui lòng đề xuất lại..."
                  rows={3}
                  className="w-full p-2.5 text-xs bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl focus:bg-white focus:border-[#C59B58] outline-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#EAE4D7]">
                <button
                  type="button"
                  onClick={() => setRejectingProposal(null)}
                  className="px-4 py-2 rounded-xl border border-[#EAE4D7] text-xs font-semibold text-[#7D715E] hover:bg-[#F3EFE6] transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={isRejecting || rejectReason.trim().length < 5}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-2xs transition cursor-pointer disabled:opacity-50"
                >
                  {isRejecting ? 'Đang gửi...' : 'Xác nhận từ chối'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {activeSection === 'coupons' && historyGroup && !detailCoupon && (
        <Modal
          isOpen
          stickyHeader
          maxWidth="3xl"
          title="Lịch sử mã ưu đãi"
          subtitle={`${historyGroup.fullName} · ${historyGroup.historyCoupons.length} mã`}
          bodyClassName="!p-0"
          onClose={() => setHistoryKolId(null)}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="bg-[#FAF8F5] text-[#7D715E]">
                <tr>
                  {['Mã ưu đãi', 'Mức giảm', 'Lượt dùng', 'Thời hạn', 'Trạng thái', 'Thao tác'].map(label => (
                    <th key={label} scope="col" className="px-4 py-2.5 font-semibold last:text-right">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE4D7]">
                {historyGroup.historyCoupons.map((c) => (
                  <tr key={c.id} className="hover:bg-[#FAF8F5] transition">
                    <td className="w-[28%] px-4 py-2.5">
                      <span className="whitespace-nowrap font-mono font-semibold text-[#715126]">
                        {c.displayCode || c.codeNormalized}
                      </span>
                    </td>
                    <td className="w-[14%] px-4 py-2.5 font-mono text-[#7D715E] tabular-nums">
                      {c.discountType === 'FIXED_AMOUNT' ? `-${Number(c.discountValue).toLocaleString('vi-VN')} ₫` : `-${c.discountValue}%`}
                    </td>
                    <td className="w-[12%] px-4 py-2.5 font-mono text-[#7D715E] tabular-nums">
                      {c.usageCount || 0}{c.usageLimitTotal ? `/${c.usageLimitTotal}` : ''} lượt
                    </td>
                    <td className="w-[16%] px-4 py-2.5 text-[11px] text-[#7D715E] tabular-nums">
                      {c.expiresAt
                        ? new Date(c.expiresAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
                        : 'Theo Hợp đồng VIP'}
                    </td>
                    <td className="w-[16%] px-4 py-2.5">{renderStatusBadge(c.status, c.blockedReason)}</td>
                    <td className="w-[14%] px-4 py-2.5 text-right">
                      <button
                        type="button"
                        aria-label={`Chi tiết mã ${c.displayCode || c.codeNormalized}`}
                        onClick={() => openCouponDetail(c)}
                        className="px-2.5 py-1 rounded-md border border-[#EAE4D7] bg-white text-[#7D715E] text-[11px] font-semibold hover:bg-[#FAF8F5] hover:text-[#1A1612] transition cursor-pointer"
                      >
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}

      {/* Modal Xem Chi Tiết / Gia Hạn / Khóa Mã KOC */}
      {detailCoupon && (
        <Modal
          isOpen
          onClose={() => { if (!isUpdatingPolicy && !isBlockingCoupon) setDetailCoupon(null); }}
          title={`Chi tiết mã ${detailCoupon.displayCode || detailCoupon.codeNormalized}`}
          subtitle={detailCoupon.collaborator?.fullName || 'Đối tác KOC'}
          maxWidth="lg"
          stickyHeader
          footer={
            <div className="flex justify-end">
              <button type="button" disabled={isUpdatingPolicy || isBlockingCoupon} onClick={() => setDetailCoupon(null)} className="h-10 rounded-lg border border-[#EAE4D7] px-4 text-sm font-medium hover:bg-[#FAF8F5] disabled:opacity-50">
                {historyGroup ? 'Về lịch sử' : 'Đóng'}
              </button>
            </div>
          }
        >
          <div className="space-y-4 text-sm">
            <dl className="overflow-hidden rounded-xl border border-[#EAE4D7]">
              <div className="grid grid-cols-2 divide-x divide-[#EAE4D7] bg-[#FBF5EB]">
                <div className="p-3.5">
                  <dt className="text-xs text-[#7D715E]">Mức giảm</dt>
                  <dd className="mt-1 text-xl font-bold tabular-nums text-[#805920]">
                    {detailCoupon.discountType === 'PERCENTAGE'
                      ? `${Number(detailCoupon.discountValue)}%`
                      : `${Number(detailCoupon.discountValue).toLocaleString('vi-VN')} ₫`}
                  </dd>
                </div>
                <div className="p-3.5">
                  <dt className="text-xs text-[#7D715E]">Lượt dùng</dt>
                  <dd className="mt-1 text-xl font-bold tabular-nums">
                    {detailCoupon.usageCount ?? 0}{detailCoupon.usageLimitTotal ? ` / ${detailCoupon.usageLimitTotal}` : ''}
                  </dd>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[#EAE4D7] p-3.5 [&_dd]:mt-1 [&_dd]:font-semibold [&_dt]:text-xs [&_dt]:text-[#7D715E]">
                <div><dt>Phạm vi</dt><dd>{({ STORE_WIDE: 'Toàn cửa hàng', PRODUCTS: 'Sản phẩm được áp dụng', CATEGORIES: 'Danh mục được áp dụng', CAMPAIGN: 'Theo chiến dịch' } as Record<string, string>)[detailCoupon.scopeType ?? ''] || 'Chưa ghi nhận'}</dd></div>
                <div><dt>Trạng thái</dt><dd>{renderStatusBadge(detailCoupon.status, detailCoupon.blockedReason)}</dd></div>
                <div><dt>Đơn tối thiểu</dt><dd>{Number(detailCoupon.minimumOrderAmount) > 0 ? `${Number(detailCoupon.minimumOrderAmount).toLocaleString('vi-VN')} ₫` : 'Không yêu cầu'}</dd></div>
                <div><dt>Giảm tối đa / đơn</dt><dd>{Number(detailCoupon.maximumDiscountAmount) > 0 ? `${Number(detailCoupon.maximumDiscountAmount).toLocaleString('vi-VN')} ₫` : 'Không giới hạn'}</dd></div>
                <div><dt>Hạn dùng</dt><dd>{detailCoupon.expiresAt ? new Date(detailCoupon.expiresAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false }) : 'Không giới hạn'}</dd></div>
                {detailCoupon.budgetTotal != null && <div><dt>Ngân sách</dt><dd>{Number(detailCoupon.budgetTotal).toLocaleString('vi-VN')} ₫</dd></div>}
              </div>
            </dl>

            {(detailCoupon.rejectedReason || detailCoupon.blockedReason) && (
              <p className="rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] px-3 py-2.5 break-words"><strong>Lý do </strong>{detailCoupon.blockedReason || detailCoupon.rejectedReason}</p>
            )}
            {detailCoupon.status === 'PENDING_BLOCK_APPROVAL' && (
              <p className="rounded-lg bg-[#FBF5EB] px-3 py-2.5 text-[#805920]">Mã còn hiệu lực trong lúc chờ Vận hành duyệt ngừng.</p>
            )}

            {detailCoupon.status === 'ACTIVE' && (
              <div className="space-y-3 border-t border-[#EAE4D7] pt-3">
                <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <DateTimePicker
                    compact
                    smallCalendar
                    disabled={isUpdatingPolicy || isBlockingCoupon}
                    label="Hạn dùng mới · Giờ Việt Nam"
                    popoverTitle="Chọn hạn dùng mới"
                    value={extendExpiresAt}
                    onChange={setExtendExpiresAt}
                    getCurrentDate={vietnamPickerNow}
                    minDateTime={toVietnamDateTime(new Date(earliestExpiry))}
                    inlinePopoverRef={extendCalendar}
                  />
                  <button
                    type="button"
                    disabled={isUpdatingPolicy || isBlockingCoupon || !canSaveExpiry}
                    onClick={async () => {
                      if (!currentStoreId || !canSaveExpiry || isUpdatingPolicy || isBlockingCoupon) return;
                      setIsUpdatingPolicy(true);
                      try {
                        await couponService.updatePolicy(currentStoreId, detailCoupon.id, {
                          expiresAt: new Date(selectedExpiry).toISOString(),
                        });
                        setDetailCoupon(null);
                        toast.success(detailCoupon.expiresAt ? 'Đã gia hạn mã KOC.' : 'Đã đặt hạn dùng cho mã KOC.');
                        await loadData(true);
                      } catch (err: any) {
                        toast.error(err?.response?.data?.message || 'Không thể lưu hạn dùng lúc này.');
                      } finally {
                        setIsUpdatingPolicy(false);
                      }
                    }}
                    className="h-10 rounded-lg bg-[#C59B58] px-4 font-semibold text-[#231D15] hover:bg-[#B88E4F] disabled:opacity-50"
                  >
                    {isUpdatingPolicy ? 'Đang lưu…' : detailCoupon.expiresAt ? 'Gia hạn' : 'Đặt hạn dùng'}
                  </button>
                </div>
                <div ref={extendCalendar} className="min-w-0 empty:hidden" />
                  {!showBlockInput ? (
                    <button
                      type="button"
                      onClick={() => setShowBlockInput(true)}
                      className="text-[11px] font-semibold text-[#DC2626] hover:underline cursor-pointer"
                    >
                      Yêu cầu ngừng mã
                    </button>
                  ) : (
                    <div className="space-y-2 pt-1 border-t border-[#EEDFC6]">
                      <p className="m-0 text-[11px] text-[#7D715E]">
                        Mã còn hiệu lực trong lúc chờ Vận hành duyệt.
                      </p>
                      <input
                        type="text"
                        value={blockReasonInput}
                        onChange={(e) => setBlockReasonInput(e.target.value)}
                        placeholder="Nhập lý do đề nghị ngừng mã (tối thiểu 5 ký tự)..."
                        className="w-full h-9 px-2.5 rounded-xl border border-rose-200 bg-white text-xs text-[#1A1612] outline-none focus:border-rose-400"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => { setShowBlockInput(false); setBlockReasonInput(''); }}
                          className="px-3 py-1 rounded-lg border border-[#EAE4D7] text-[11px] text-[#7D715E] cursor-pointer"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          disabled={isBlockingCoupon || isUpdatingPolicy || blockReasonInput.trim().length < 5}
                          onClick={async () => {
                            if (!currentStoreId) return;
                            setIsBlockingCoupon(true);
                            try {
                              await couponService.blockCoupon(currentStoreId, detailCoupon.id, blockReasonInput.trim());
                              toast.success('Đã gửi yêu cầu ngừng mã tới Bộ phận Vận hành xét duyệt.');
                              setDetailCoupon(null);
                              await loadData(true);
                            } catch (err: any) {
                              toast.error(err?.response?.data?.message || 'Không thể gửi yêu cầu ngừng mã.');
                            } finally {
                              setIsBlockingCoupon(false);
                            }
                          }}
                          className="px-3 py-1 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-[#1A1612] text-[11px] font-bold disabled:opacity-50 cursor-pointer"
                        >
                          {isBlockingCoupon ? 'Đang gửi...' : 'Gửi yêu cầu ngừng'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
        </Modal>
      )}
    </div>
  );
}
