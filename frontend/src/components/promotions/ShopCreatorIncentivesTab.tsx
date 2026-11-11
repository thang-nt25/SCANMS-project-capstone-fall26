import { registerPrivateCacheReset } from '@/utils/private-cache-session';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Tag,
  Trophy,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  Copy,
  Check,
  X,
  Clock,
  Ticket,
  XCircle,
} from 'lucide-react';
import api from '../../services/api';
import { storeService } from '../../services/store.service';
import { couponService } from '../../services/coupon.service';
import { toast } from '../../utils/toast';
import { ShopMonthlyBonusPanel } from './ShopMonthlyBonusPanel';

interface CreatorCoupon {
  id: string;
  codeNormalized: string;
  displayCode: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  usageCount: number;
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
    email?: string;
  };
  createdAt: string;
}

let lastCreatorIncentivesSnapshot: { coupons: CreatorCoupon[]; partnerKols: any[]; currentStoreId: string; } | null = null;
registerPrivateCacheReset(() => { lastCreatorIncentivesSnapshot = null; });

export function ShopCreatorIncentivesTab() {
  const [searchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState<'coupons' | 'milestones'>(() => searchParams.get('section') === 'milestones' ? 'milestones' : 'coupons');
  const [coupons, setCoupons] = useState<CreatorCoupon[]>(() => lastCreatorIncentivesSnapshot?.coupons || []);
  const [currentStoreId, setCurrentStoreId] = useState<string>(() => lastCreatorIncentivesSnapshot?.currentStoreId || '');
  const [loading, setLoading] = useState<boolean>(() => !lastCreatorIncentivesSnapshot);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modal states
  const [isIssueCouponOpen, setIsIssueCouponOpen] = useState<boolean>(false);
  const [partnerKols, setPartnerKols] = useState<any[]>(() => lastCreatorIncentivesSnapshot?.partnerKols || []);
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

      if (partnersRes.status === 'fulfilled') {
        const body = (partnersRes.value as any)?.data || partnersRes.value;
        const raw = body?.members || body?.items || (Array.isArray(body) ? body : []);
        const list = Array.isArray(raw)
          ? raw.map((item: any) => ({
              id: item.collaboratorId || item.collaborator?.id || item.id,
              fullName: item.collaborator?.fullName || item.fullName || 'Nhà Sáng Tạo',
              email: item.collaborator?.email || item.email || '',
              tier: item.collaborator?.collaboratorProfile?.tier?.name || item.tier || 'KOL',
            }))
          : [];
        setPartnerKols(list);
      }
      lastCreatorIncentivesSnapshot = { coupons: couponsRes.status === 'fulfilled' ? ((couponsRes.value as any)?.data?.data || (couponsRes.value as any)?.data || (couponsRes.value as any)?.items || (Array.isArray(couponsRes.value) ? couponsRes.value : [])) : [], partnerKols: partnersRes.status === 'fulfilled' ? (partnersRes.value?.data?.data || partnersRes.value?.data || []) : [], currentStoreId: sId };
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

  // Filtered coupons: Lọc bỏ voucher freeship / voucher sàn rác cũ, chỉ hiển thị Coupon KOC Attribution hợp lệ
  const filteredCoupons = coupons.filter((c: any) => {
    if (c.benefitType === 'SHIPPING' || Number(c.discountValue) >= 100) return false;
    if (!c.collaborator && !c.collaboratorId) return false;

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.displayCode?.toLowerCase().includes(q) ||
      c.codeNormalized?.toLowerCase().includes(q) ||
      c.collaborator?.fullName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 animate-in fade-in-50 duration-200">
      {loadError && <div role="alert" className="rounded-xl border border-[#EEDFC6] bg-white p-4 text-sm text-[#DC2626]">
        {loadError}<button type="button" disabled={isRefreshing} onClick={() => void loadData(true)} className="ml-2 inline-flex min-h-11 items-center font-semibold underline">Thử lại</button>
      </div>}
      {/* Sub-navigation tabs: Chuẩn 2 Trụ Cột Đãi Ngộ KOC */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-1.5 rounded-2xl bg-white border border-[#EAE4D7] shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveSection('coupons')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              activeSection === 'coupons'
                ? 'bg-[#FBF5EB] text-[#1A1612] border border-[#EEDFC6] shadow-2xs'
                : 'text-[#7D715E] hover:text-[#1A1612] hover:bg-[#FAF8F5]'
            }`}
          >
            <Tag className={`w-3.5 h-3.5 ${activeSection === 'coupons' ? 'text-[#B88E4F]' : 'text-[#7D715E]'}`} />
            <span>Mã ưu đãi KOC</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#EAE4D7] text-[#1A1612] font-mono">
              {filteredCoupons.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('milestones')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              activeSection === 'milestones'
                ? 'bg-[#FBF5EB] text-[#1A1612] border border-[#EEDFC6] shadow-2xs'
                : 'text-[#7D715E] hover:text-[#1A1612] hover:bg-[#FAF8F5]'
            }`}
          >
            <Trophy className={`w-3.5 h-3.5 ${activeSection === 'milestones' ? 'text-[#B88E4F]' : 'text-[#7D715E]'}`} />
            <span>Thưởng mốc tháng (FR-09)</span>
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0 px-2 sm:px-0">
          <button
            type="button"
            onClick={() => void loadData(true)}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] text-[#7D715E] hover:text-[#1A1612] hover:bg-[#F3EFE6] transition cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#B88E4F]' : ''}`} />
          </button>

          {activeSection === 'coupons' && (
            <button
              type="button"
              onClick={() => setIsIssueCouponOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-[#1A1612] text-xs font-bold shadow-2xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Cấp mã cho KOL có deal toàn Shop</span>
            </button>
          )}
        </div>
      </div>

      {/* SECTION 1: ATTRIBUTION COUPONS */}
      {activeSection === 'coupons' && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7D715E]" />
              <input
                type="text"
                placeholder="Tìm theo mã coupon hoặc tên KOC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#EAE4D7] bg-white text-xs text-[#1A1612] focus:border-[#C59B58] focus:outline-none"
              />
            </div>
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
                            {p.collaborator?.email || 'kol@scanms.vn'}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                          Chờ duyệt
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-[#FAF8F5] border border-[#EAE4D7] text-[11px] flex items-center justify-between">
                        <span className="text-[#7D715E]">Phạm vi áp dụng:</span>
                        <strong className="text-[#B88E4F] font-semibold">Toàn bộ sản phẩm của gian hàng</strong>
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

          {/* BẢNG TỔNG HỢP MÃ ƯU ĐÃI ĐỊNH DANH KOC */}
          <div className="overflow-x-auto rounded-2xl border border-[#EAE4D7] bg-white shadow-2xs">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="bg-[#F3EFE6] text-[#1A1612] font-semibold">
                <tr>
                  <th className="p-3.5 whitespace-nowrap">Mã Coupon</th>
                  <th className="p-3.5 whitespace-nowrap">KOC sở hữu</th>
                  <th className="p-3.5 whitespace-nowrap">Mức giảm cho fan</th>
                  <th className="p-3.5 whitespace-nowrap">Lượt sử dụng</th>
                  <th className="p-3.5 whitespace-nowrap">Thời hạn hiệu lực</th>
                  <th className="p-3.5 whitespace-nowrap">Trạng thái</th>
                  <th className="p-3.5 whitespace-nowrap text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE4D7]">
                {filteredCoupons.map((c) => (
                  <tr key={c.id} className="hover:bg-[#FAF8F5] transition">
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-[#B88E4F] text-sm px-2.5 py-1 rounded-lg bg-[#FBF5EB] border border-[#EEDFC6]">
                          {c.displayCode || c.codeNormalized}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(c.displayCode || c.codeNormalized)}
                          className="p-1 rounded-md text-[#7D715E] hover:text-[#1A1612] hover:bg-[#F3EFE6] transition cursor-pointer"
                          title="Sao chép mã"
                        >
                          {copiedCode === (c.displayCode || c.codeNormalized) ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#FAF8F5] border border-[#EAE4D7] text-[#B88E4F] flex items-center justify-center font-bold text-xs shrink-0">
                          {c.collaborator?.fullName?.charAt(0) || 'K'}
                        </div>
                        <span className="font-semibold text-[#1A1612]">
                          {c.collaborator?.fullName || 'KOC Đối Tác'}
                        </span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="font-bold text-[#DC2626] font-mono">
                        -{c.discountValue}%
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-[#1A1612]">
                      <strong>{c.usageCount || 0}</strong> lượt
                    </td>
                    <td className="p-3.5 text-[#7D715E]">
                      {c.expiresAt ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium">
                          <Clock className="w-3 h-3 text-[#7D715E]" />
                          {new Date(c.expiresAt).toLocaleDateString('vi-VN')}
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#7D715E]">
                          Theo Hợp đồng VIP
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      {c.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FBF5EB] text-[#8C6226] border border-[#EEDFC6]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Đang hoạt động
                        </span>
                      ) : c.status === 'PENDING_APPROVAL' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Chờ Shop duyệt
                        </span>
                      ) : c.status === 'REJECTED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          Đã từ chối
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-600 border border-stone-200">
                          <Clock className="w-3 h-3" />
                          Đã thay thế / Hết hạn
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      {c.status === 'PENDING_APPROVAL' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setReviewingProposal(c);
                              setReviewDiscountPercent(c.discountValue <= 5 ? 5 : 10);
                            }}
                            className="px-2.5 py-1 rounded-md bg-[#C59B58] text-[#1A1612] text-[11px] font-bold hover:bg-[#B88E4F] transition cursor-pointer"
                          >
                            Duyệt
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectingProposal(c);
                              setRejectReason('');
                            }}
                            className="px-2 py-1 rounded-md border border-[#EAE4D7] text-[#7D715E] text-[11px] font-semibold hover:bg-rose-50 hover:text-rose-700 transition cursor-pointer"
                          >
                            Từ chối
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#7D715E]">
                          {c.status === 'ACTIVE' ? 'Tự động ghi nhận' : 'Lưu trữ đối soát'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filteredCoupons.length && (
              <div className="p-8 text-center text-xs text-[#7D715E]">
                {loading ? 'Đang đồng bộ danh sách mã ưu đãi KOC...' : loadError ? 'Chưa xác định được danh sách mã ưu đãi.' : 'Chưa có mã ưu đãi định danh KOC nào được phát hành.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: MONTHLY MILESTONE RULES (FR-09) - CHUẨN DOANH SỐ THÁNG */}
      {activeSection === 'milestones' && <ShopMonthlyBonusPanel storeId={currentStoreId} />}

      {/* Chỉ cấp mã cho KOL đã có deal toàn Shop được duyệt. */}
      {isIssueCouponOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#EAE4D7] w-full max-w-md p-5 sm:p-6 text-left animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-[#EAE4D7]">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center shrink-0">
                  <Tag className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-[#1A1612] m-0">Cấp mã độc quyền theo deal KOL</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsIssueCouponOpen(false)}
                className="w-8 h-8 rounded-lg text-[#7D715E] hover:bg-[#FAF8F5] flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleIssueCoupon} className="space-y-4">
              <p className="text-xs text-[#7D715E]">Chỉ KOL có deal toàn Shop đã duyệt mới được cấp mã; mã cũ của KOL tại Shop sẽ hết hiệu lực.</p>
              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-1">
                  Chọn KOC thụ hưởng <span className="text-[#DC2626]">*</span>
                </label>
                <select
                  value={selectedKolId}
                  onChange={(e) => handleKolSelect(e.target.value)}
                  required
                  className="w-full rounded-xl border border-[#EAE4D7] bg-white p-2.5 text-xs text-[#1A1612] focus:border-[#C59B58] focus:outline-none"
                >
                  <option value="">-- Chọn KOC trong mạng lưới đối tác --</option>
                  {partnerKols.map((kol) => (
                    <option key={kol.id || kol.userId} value={kol.id || kol.userId}>
                      {kol.fullName} ({kol.channelName || kol.email || 'Đối tác'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-1">
                  Tên mã ưu đãi <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                  placeholder="Ví dụ: THAONHI10"
                  required
                  className="w-full rounded-xl border border-[#EAE4D7] bg-white p-2.5 text-xs font-mono font-bold text-[#1A1612] focus:border-[#C59B58] focus:outline-none uppercase tracking-wider"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-1">
                  Mức giảm giá <span className="text-[#DC2626]">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDiscountChange(5)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      couponDiscountPercent === 5
                        ? 'bg-[#FBF5EB] border-[#C59B58] text-[#8C6226]'
                        : 'bg-white border-[#EAE4D7] text-[#7D715E]'
                    }`}
                  >
                    Giảm 5%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDiscountChange(10)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      couponDiscountPercent === 10
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
                  onClick={() => setIsIssueCouponOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#EAE4D7] text-xs font-semibold text-[#7D715E] hover:bg-[#F3EFE6] transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={issuingCoupon || !selectedKolId || !customCode.trim()}
                  className="px-5 py-2 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-[#1A1612] text-xs font-bold shadow-2xs transition cursor-pointer disabled:opacity-50"
                >
                  {issuingCoupon ? 'Đang cấp...' : 'Xác nhận cấp mã'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
