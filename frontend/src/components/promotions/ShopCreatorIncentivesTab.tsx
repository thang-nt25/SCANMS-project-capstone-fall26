import { registerPrivateCacheReset } from '@/utils/private-cache-session';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Tag,
  Trophy,
  Plus,
  Search,
  Copy,
  Check,
  X,
  XCircle,
  Ticket,
  MoreHorizontal,
} from 'lucide-react';
import api from '../../services/api';
import { Modal } from '../ui/Modal';
import { storeService } from '../../services/store.service';
import { couponService } from '../../services/coupon.service';
import { toast } from '../../utils/toast';
import { ShopMonthlyBonusPanel } from './ShopMonthlyBonusPanel';
import { IssueDealCouponModal } from './IssueDealCouponModal';

interface CreatorCoupon {
  id: string;
  codeNormalized: string;
  displayCode: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  usageCount: number;
  usageLimitTotal?: number | null;
  minimumOrderAmount?: number | string | null;
  maximumDiscountAmount?: number | string | null;
  scopeType?: string;
  blockedReason?: string | null;
  couponProducts?: { product: { title: string } }[];
  couponCategories?: { categoryName: string }[];
  budgetTotal?: number;
  budgetUsed?: number;
  status: string;
  startsAt?: string;
  expiresAt?: string;
  benefitType?: string;
  collaboratorId?: string;
  collaborator?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
    collaboratorProfile?: { avatarUrl?: string | null };
    email?: string;
  };
  createdAt: string;
}

let lastCreatorIncentivesSnapshot: { coupons: CreatorCoupon[]; partnerKols: any[]; currentStoreId: string; } | null = null;
registerPrivateCacheReset(() => { lastCreatorIncentivesSnapshot = null; });

export function ShopCreatorIncentivesTab({ section, hideNavigation = false, onCouponCount }: { section?: 'coupons' | 'milestones'; hideNavigation?: boolean; onCouponCount?: (count: number) => void } = {}) {
  const [searchParams] = useSearchParams();
  const [localSection, setActiveSection] = useState<'coupons' | 'milestones'>(() => searchParams.get('section') === 'milestones' ? 'milestones' : 'coupons');
  const activeSection = section ?? localSection;
  const [coupons, setCoupons] = useState<CreatorCoupon[]>(() => lastCreatorIncentivesSnapshot?.coupons || []);
  const [currentStoreId, setCurrentStoreId] = useState<string>(() => lastCreatorIncentivesSnapshot?.currentStoreId || '');
  useEffect(() => { onCouponCount?.(coupons.filter(c => c.benefitType !== 'SHIPPING' && (c.collaborator || c.collaboratorId)).length); }, [coupons, onCouponCount]);
  const [loading, setLoading] = useState<boolean>(() => !lastCreatorIncentivesSnapshot);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [detailCoupon, setDetailCoupon] = useState<CreatorCoupon | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modal states
  const [isIssueCouponOpen, setIsIssueCouponOpen] = useState<boolean>(false);
  const [partnerKols, setPartnerKols] = useState<any[]>(() => Array.isArray(lastCreatorIncentivesSnapshot?.partnerKols) ? lastCreatorIncentivesSnapshot.partnerKols : []);
  const [selectedKolId, setSelectedKolId] = useState<string>('');
  const [customCode, setCustomCode] = useState<string>('');
  const [couponDiscountPercent, setCouponDiscountPercent] = useState<number>(10);
  const [issuingCoupon, setIssuingCoupon] = useState<boolean>(false);

  // Proposal Review Modal states
  const [reviewingProposal, setReviewingProposal] = useState<CreatorCoupon | null>(null);
  const [reviewDiscountPercent, setReviewDiscountPercent] = useState<number>(10);
  const [isApproving, setIsApproving] = useState<boolean>(false);

  // Proposal Reject Modal states
  const [rejectingProposal, setRejectingProposal] = useState<CreatorCoupon | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [isRejecting, setIsRejecting] = useState<boolean>(false);

  const loadData = useCallback(async (showIndicator = false) => {
    if (showIndicator) setIsRefreshing(true);
    setLoadError('');
    try {
      const store = await storeService.getMyStore();
      const sId = store?.id || '';
      setCurrentStoreId(sId);

      const [couponsRes, partnersRes] = await Promise.allSettled([
        sId ? couponService.getStoreCoupons(sId) : api.get('/coupons'),
        api.get('/store-collaborators/shop'),
      ]);
      if (couponsRes.status === 'rejected' || partnersRes.status === 'rejected')
        setLoadError('Chưa tải đủ mã ưu đãi và đối tác. Dữ liệu đang hiển thị có thể chưa được cập nhật.');

      if (couponsRes.status === 'fulfilled') {
        const resVal = couponsRes.value as any;
        const raw = resVal?.data?.data || resVal?.data || resVal?.items || (Array.isArray(resVal) ? resVal : []);
        setCoupons(Array.isArray(raw) ? raw : []);
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
              tier: item.collaborator?.collaboratorProfile?.tier?.name || item.tier || 'KOL',
            }))
          : [];
        loadedPartners = list;
        setPartnerKols(list);
      }
      lastCreatorIncentivesSnapshot = { coupons: couponsRes.status === 'fulfilled' ? ((couponsRes.value as any)?.data?.data || (couponsRes.value as any)?.data || (couponsRes.value as any)?.items || (Array.isArray(couponsRes.value) ? couponsRes.value : [])) : [], partnerKols: loadedPartners, currentStoreId: sId };
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

    setIssuingCoupon(true);
    try {
      await couponService.createStoreCoupon(currentStoreId, {
        code: finalCode,
        collaboratorId: kol?.id || kol?.userId || selectedKolId,
        discountType: 'PERCENTAGE',
        discountValue: couponDiscountPercent,
        scopeType: 'STORE_WIDE',
        usageLimitPerCustomer: 1,
        benefitType: 'GOODS',
      } as any);

      toast.success(`Đã cấp thành công mã ưu đãi "${finalCode}" cho ${kol?.fullName || 'KOC'} (đã tự động thu hồi mã cũ).`);
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
    setIsApproving(true);
    try {
      await couponService.approveCoupon(currentStoreId, reviewingProposal.id, {
        discountType: 'PERCENTAGE',
        discountValue: reviewDiscountPercent,
        scopeType: 'STORE_WIDE',
        usageLimitTotal: 100,
        budgetTotal: 3000000,
      } as any);
      toast.success(`Đã duyệt mã "${reviewingProposal.displayCode}" cho ${reviewingProposal.collaborator?.fullName || 'KOC'} và tự động thu hồi mã cũ!`);
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

  const couponState = (c: CreatorCoupon) => c.status === 'BLOCKED' && c.blockedReason?.startsWith('Đã thay thế bởi mã định danh mới:') ? 'REPLACED' : c.status === 'ACTIVE' && c.expiresAt && Date.parse(c.expiresAt) <= Date.now() ? 'EXPIRED' : c.status;
  const statusNames: Record<string, string> = { REPLACED: 'Đã thay thế', ACTIVE: 'Đang hoạt động', PENDING_APPROVAL: 'Chờ duyệt', PAUSED: 'Tạm dừng', REJECTED: 'Đã từ chối', EXPIRED: 'Hết hạn', BLOCKED: 'Đã khóa', DELETED: 'Đã xóa' };
  const scopeName = (c: CreatorCoupon) => c.scopeType === 'STORE_WIDE' ? 'Toàn Shop' : c.couponProducts?.length ? c.couponProducts.map(item => item.product.title).join(', ') : c.couponCategories?.length ? c.couponCategories.map(item => item.categoryName).join(', ') : 'Chưa có phạm vi';
  const formatMoney = (value: number | string) => `${Number(value).toLocaleString('vi-VN')} ₫`;
  useEffect(() => { setPage(1); }, [searchQuery, statusFilter]);
  // Filtered coupons: Lọc bỏ voucher freeship / voucher sàn rác cũ, chỉ hiển thị Coupon KOC Attribution hợp lệ
  const filteredCoupons = coupons.filter((c: any) => {
    if (c.benefitType === 'SHIPPING' || (c.discountType === 'PERCENTAGE' && Number(c.discountValue) >= 100)) return false;
    if (!c.collaborator && !c.collaboratorId) return false;

    if (statusFilter !== 'ALL' && couponState(c) !== statusFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.displayCode?.toLowerCase().includes(q) ||
      c.codeNormalized?.toLowerCase().includes(q) ||
      c.collaborator?.fullName?.toLowerCase().includes(q)
    );
  });

  const pageCount = Math.max(1, Math.ceil(filteredCoupons.length / 10));
  const currentPage = Math.min(page, pageCount);
  const pageCoupons = filteredCoupons.slice((currentPage - 1) * 10, currentPage * 10);
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
              {coupons.filter(c => c.benefitType !== 'SHIPPING' && (c.collaborator || c.collaboratorId)).length}
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

      </div>
      }
      {/* SECTION 1: ATTRIBUTION COUPONS */}
      {activeSection === 'coupons' && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="grid grid-cols-1 items-center gap-3 rounded-2xl border border-[#EAE4D7] bg-white p-3 lg:grid-cols-[minmax(0,1fr)_170px_auto]">
            <div className="relative min-w-0">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7D715E]" />
              <input
                type="text"
                placeholder="Tìm mã, tên KOC…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Tìm theo mã coupon hoặc tên KOC" className="h-10 w-full rounded-lg border border-[#EAE4D7] bg-white pl-9 pr-3 text-sm text-[#1A1612] outline-none focus:border-[#C59B58] focus:ring-2 focus:ring-[#FBF5EB]"
              />
            </div>
            <select aria-label="Lọc trạng thái mã ưu đãi" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="flex h-10 items-center rounded-lg border border-[#EAE4D7] bg-white px-3 py-0 text-[13px] leading-normal text-[#1A1612] [&::picker-icon]:self-center">
              <option value="ALL">Tất cả trạng thái</option>
              {Object.entries(statusNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <button type="button" onClick={() => setIsIssueCouponOpen(true)} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#C59B58] bg-[#C59B58] px-5 text-sm font-semibold text-[#715126] transition-colors hover:bg-[#F3EFE6]"><Plus size={16}/><span>Cấp mã</span></button>
          </div>

          {/* KHỐI YÊU CẦU ĐỀ XUẤT MÃ TỪ KOC CHỜ XÉT DUYỆT */}
          {filteredCoupons.some((c: any) => c.status === 'PENDING_APPROVAL') && (
            <div className="rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-4 sm:p-5 shadow-2xs space-y-3 animate-in fade-in-50 duration-200">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-white border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center shrink-0">
                    <Ticket className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="font-bold text-sm text-[#1A1612] m-0">
                      Đề xuất mã từ KOC
                    </h3>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#FAF8F5] text-[#8C6226] border border-[#EEDFC6]">
                  {filteredCoupons.filter((c: any) => c.status === 'PENDING_APPROVAL').length} đề xuất
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {filteredCoupons
                  .filter((c: any) => c.status === 'PENDING_APPROVAL')
                  .map((p: any) => (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-xl bg-white border border-[#EAE4D7] shadow-2xs flex flex-col justify-between gap-3 text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-mono font-extrabold text-[#B88E4F] text-base block tracking-wider">
                            {p.displayCode || p.codeNormalized}
                          </span>
                          <span className="text-xs font-semibold text-[#1A1612] block mt-0.5">
                            {p.collaborator?.fullName || 'KOC Đối Tác'}
                          </span>
                          <span className="text-[11px] text-[#7D715E] block truncate">
                            {p.collaborator?.email || 'Chưa cập nhật email'}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                          Chờ duyệt
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-[#FAF8F5] border border-[#EAE4D7] text-[11px] flex items-center justify-between">
                        <span className="text-[#7D715E]">Phạm vi áp dụng:</span>
                        <strong className="text-[#B88E4F] font-semibold">{scopeName(p)}</strong>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#EAE4D7]">
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
                          className="px-3.5 py-1.5 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-[#1A1612] text-xs font-bold transition shadow-2xs cursor-pointer flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Duyệt & Gán %</span>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-[#EAE4D7] bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-[13px]">
                <thead className="bg-[#FAF8F5] text-xs font-medium text-[#7D715E]"><tr>
                  {['Mã ưu đãi', 'KOC', 'Mức giảm', 'Đã dùng', 'Hết hạn', 'Trạng thái', ''].map(label => <th key={label} className="px-4 py-3 font-medium">{label}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-[#EAE4D7]">
                  {pageCoupons.map(c => <tr key={c.id} className="h-[72px] hover:bg-[#FAF8F5]">
                    <td className="px-4 py-3"><div className="flex items-center gap-1.5"><strong className="break-all font-mono text-[12px] text-[#1A1612]">{c.displayCode || c.codeNormalized}</strong><button type="button" aria-label={`Sao chép ${c.displayCode || c.codeNormalized}`} onClick={() => handleCopy(c.displayCode || c.codeNormalized)} className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-[#7D715E] hover:bg-[#F3EFE6]">{copiedCode === (c.displayCode || c.codeNormalized) ? <Check size={14}/> : <Copy size={14}/>}</button></div></td>
                    <td className="max-w-[240px] px-4 py-3"><div className="flex items-center gap-2"><span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F3EFE6] text-xs text-[#7D715E]">{(c.collaborator?.avatarUrl || c.collaborator?.collaboratorProfile?.avatarUrl) ? <img src={c.collaborator.avatarUrl || c.collaborator.collaboratorProfile?.avatarUrl || ''} alt="" className="size-full object-cover"/> : c.collaborator?.fullName?.charAt(0) || 'K'}</span><div className="min-w-0"><strong className="font-semibold">{c.collaborator?.fullName || 'KOC'}</strong><p title={scopeName(c)} className="m-0 mt-0.5 max-w-[200px] truncate text-[11px] text-[#7D715E]">{scopeName(c)}</p></div></div></td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-[#715126]">{c.discountType === 'FIXED_AMOUNT' ? formatMoney(c.discountValue) : `${c.discountValue}%`}</td>
                    <td className="px-4 py-3 tabular-nums">{c.usageCount ?? 0}{c.usageLimitTotal != null ? `/${c.usageLimitTotal}` : ''}</td>
                    <td className="px-4 py-3 text-xs tabular-nums text-[#7D715E]">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'Chưa ghi nhận'}</td>
                    <td className="px-4 py-3"><span className="inline-flex whitespace-nowrap rounded-md border border-[#EAE4D7] bg-[#FAF8F5] px-2 py-1 text-[11px] text-[#715126]">{statusNames[couponState(c)] || c.status}</span></td>
                    <td className="px-4 py-3 text-right"><button type="button" aria-label={`Chi tiết mã ${c.displayCode || c.codeNormalized}`} onClick={() => setDetailCoupon(c)} className="inline-flex size-8 items-center justify-center rounded-lg border border-[#EAE4D7] text-[#7D715E] hover:bg-[#FBF5EB]"><MoreHorizontal size={16}/></button></td>
                  </tr>)}
                </tbody>
              </table>
            </div>
            {!filteredCoupons.length && <p role="status" className="m-0 p-8 text-center text-sm text-[#7D715E]">{loading ? 'Đang tải mã ưu đãi…' : loadError ? 'Chưa tải được mã ưu đãi.' : 'Không có mã ưu đãi phù hợp.'}</p>}
            {!!filteredCoupons.length && <div className="flex items-center justify-between gap-3 border-t border-[#EAE4D7] px-4 py-3 text-xs text-[#7D715E]"><span>{(currentPage - 1) * 10 + 1}–{Math.min(currentPage * 10, filteredCoupons.length)}/{filteredCoupons.length} mã</span><div className="flex items-center gap-3"><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="h-8 rounded-lg border border-[#EAE4D7] px-3 disabled:opacity-40">Trước</button><span>{currentPage}/{pageCount}</span><button type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} className="h-8 rounded-lg border border-[#EAE4D7] px-3 disabled:opacity-40">Sau</button></div></div>}
          </div>
        </div>
      )}

      {detailCoupon && <Modal isOpen title="Chi tiết mã ưu đãi" subtitle={detailCoupon.displayCode || detailCoupon.codeNormalized} maxWidth="lg" onClose={() => setDetailCoupon(null)}>
        <dl className="m-0 grid grid-cols-2 gap-x-5 gap-y-4 text-sm">
          {[
            ['KOC', detailCoupon.collaborator?.fullName || 'Chưa ghi nhận'],
            ['Trạng thái', statusNames[couponState(detailCoupon)] || detailCoupon.status],
            ['Phạm vi', scopeName(detailCoupon)],
            ['Mức giảm', detailCoupon.discountType === 'FIXED_AMOUNT' ? formatMoney(detailCoupon.discountValue) : `${detailCoupon.discountValue}%`],
            ['Đơn tối thiểu', detailCoupon.minimumOrderAmount != null ? formatMoney(detailCoupon.minimumOrderAmount) : 'Chưa ghi nhận'],
            ['Giảm tối đa', detailCoupon.maximumDiscountAmount != null ? formatMoney(detailCoupon.maximumDiscountAmount) : 'Không giới hạn'],
            ['Ngân sách', detailCoupon.budgetTotal != null ? formatMoney(detailCoupon.budgetTotal) : 'Chưa ghi nhận'],
            ['Đã sử dụng', `${detailCoupon.usageCount ?? 0}${detailCoupon.usageLimitTotal != null ? `/${detailCoupon.usageLimitTotal}` : ''} lượt`],
            ['Bắt đầu', detailCoupon.startsAt ? new Date(detailCoupon.startsAt).toLocaleString('vi-VN') : 'Chưa ghi nhận'],
            ['Hết hạn', detailCoupon.expiresAt ? new Date(detailCoupon.expiresAt).toLocaleString('vi-VN') : 'Chưa ghi nhận'],
          ].map(([label, value]) => <div key={label}><dt className="text-xs text-[#7D715E]">{label}</dt><dd className="m-0 mt-1 break-words font-medium">{value}</dd></div>)}
        </dl>
        {detailCoupon.blockedReason && <p className="m-0 border-t border-[#EAE4D7] pt-3 text-sm">{detailCoupon.blockedReason}</p>}
        {detailCoupon.status === 'PENDING_APPROVAL' && <div className="flex justify-end gap-2 border-t border-[#EAE4D7] pt-4"><button type="button" className="h-10 rounded-lg border border-[#EAE4D7] px-4 text-sm" onClick={() => { setRejectingProposal(detailCoupon); setRejectReason(''); setDetailCoupon(null); }}>Từ chối</button><button type="button" className="h-10 rounded-lg bg-[#C59B58] px-4 text-sm font-semibold" onClick={() => { setReviewingProposal(detailCoupon); setReviewDiscountPercent(detailCoupon.discountValue <= 5 ? 5 : 10); setDetailCoupon(null); }}>Duyệt mã</button></div>}
      </Modal>}

      {/* SECTION 2: MONTHLY MILESTONE RULES (FR-09) - CHUẨN DOANH SỐ THÁNG */}
      {activeSection === 'milestones' && <ShopMonthlyBonusPanel storeId={currentStoreId} />}

      {/* Chỉ cấp mã cho KOL đã có deal toàn Shop được duyệt. */}
      {isIssueCouponOpen && <IssueDealCouponModal partners={partnerKols} storeId={currentStoreId} selectedId={selectedKolId} code={customCode} discount={couponDiscountPercent} busy={issuingCoupon} onSelect={handleKolSelect} onCode={setCustomCode} onDiscount={handleDiscountChange} onClose={() => setIsIssueCouponOpen(false)} onSubmit={handleIssueCoupon}/>}

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
                <label className="text-xs font-bold text-[#1A1612] block mb-1">
                  Mức giảm giá <span className="text-[#DC2626]">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewDiscountPercent(5)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      reviewDiscountPercent === 5
                        ? 'bg-[#FBF5EB] border-[#C59B58] text-[#8C6226]'
                        : 'bg-white border-[#EAE4D7] text-[#7D715E]'
                    }`}
                  >
                    Giảm 5%
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewDiscountPercent(10)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      reviewDiscountPercent === 10
                        ? 'bg-[#FBF5EB] border-[#C59B58] text-[#8C6226]'
                        : 'bg-white border-[#EAE4D7] text-[#7D715E]'
                    }`}
                  >
                    Giảm 10%
                  </button>
                </div>
              </div>

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
    </div>
  );
}
