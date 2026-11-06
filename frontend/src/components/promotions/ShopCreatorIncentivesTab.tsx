import { useState, useEffect, useCallback } from 'react';
import {
  Tag,
  Trophy,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  ShieldCheck,
  Copy,
  Check,
  X,
  Clock,
} from 'lucide-react';
import api from '../../services/api';
import { storeService } from '../../services/store.service';
import { couponService } from '../../services/coupon.service';
import { toast } from '../../utils/toast';

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

interface MonthlyMilestone {
  id: string;
  name: string;
  targetGmv: number;
  rewardAmount: number;
  description: string;
}

const MONTHLY_MILESTONES: MonthlyMilestone[] = [
  {
    id: 'M1',
    name: 'Mốc Doanh Số Tháng 1',
    targetGmv: 10000000,
    rewardAmount: 200000,
    description: 'Thưởng tiền mặt định kỳ khi đạt doanh số sạch từ 10.000.000 ₫ trong tháng.',
  },
  {
    id: 'M2',
    name: 'Mốc Doanh Số Tháng 2',
    targetGmv: 25000000,
    rewardAmount: 600000,
    description: 'Thưởng tiền mặt định kỳ khi đạt doanh số sạch từ 25.000.000 ₫ trong tháng.',
  },
  {
    id: 'M3',
    name: 'Mốc Doanh Số Tháng 3',
    targetGmv: 50000000,
    rewardAmount: 1500000,
    description: 'Thưởng tiền mặt định kỳ khi đạt doanh số sạch từ 50.000.000 ₫ trong tháng.',
  },
  {
    id: 'M4',
    name: 'Mốc Doanh Số Tháng 4',
    targetGmv: 100000000,
    rewardAmount: 4000000,
    description: 'Thưởng tiền mặt định kỳ khi đạt doanh số sạch từ 100.000.000 ₫ trong tháng.',
  },
];

const money = (val: unknown) =>
  val == null ? '0 ₫' : `${Number(val).toLocaleString('vi-VN')} ₫`;

let lastCreatorIncentivesSnapshot: { coupons: CreatorCoupon[]; partnerKols: any[]; currentStoreId: string; } | null = null;

export function ShopCreatorIncentivesTab() {
  const [activeSection, setActiveSection] = useState<'coupons' | 'milestones'>('coupons');
  const [coupons, setCoupons] = useState<CreatorCoupon[]>(() => lastCreatorIncentivesSnapshot?.coupons || []);
  const [currentStoreId, setCurrentStoreId] = useState<string>(() => lastCreatorIncentivesSnapshot?.currentStoreId || '');
  const [loading, setLoading] = useState<boolean>(() => !lastCreatorIncentivesSnapshot);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modal states
  const [isIssueCouponOpen, setIsIssueCouponOpen] = useState<boolean>(false);
  const [partnerKols, setPartnerKols] = useState<any[]>(() => lastCreatorIncentivesSnapshot?.partnerKols || []);
  const [selectedKolId, setSelectedKolId] = useState<string>('');
  const [couponDiscountPercent, setCouponDiscountPercent] = useState<number>(10);
  const [issuingCoupon, setIssuingCoupon] = useState<boolean>(false);

  const loadData = useCallback(async (showIndicator = false) => {
    if (showIndicator) setIsRefreshing(true);
    try {
      const store = await storeService.getMyStore().catch(() => null);
      const sId = store?.id || '';
      setCurrentStoreId(sId);

      const [couponsRes, partnersRes] = await Promise.allSettled([
        sId ? couponService.getStoreCoupons(sId) : api.get('/coupons'),
        api.get('/stores/my-store/collaborators'),
      ]);

      if (couponsRes.status === 'fulfilled') {
        const resVal = couponsRes.value as any;
        const raw = resVal?.data?.data || resVal?.data || resVal?.items || (Array.isArray(resVal) ? resVal : []);
        setCoupons(Array.isArray(raw) ? raw : []);
      }

      if (partnersRes.status === 'fulfilled') {
        const raw = partnersRes.value?.data?.data || partnersRes.value?.data || [];
        setPartnerKols(Array.isArray(raw) ? raw : []);
      }
      lastCreatorIncentivesSnapshot = { coupons: couponsRes.status === 'fulfilled' ? ((couponsRes.value as any)?.data?.data || (couponsRes.value as any)?.data || (couponsRes.value as any)?.items || (Array.isArray(couponsRes.value) ? couponsRes.value : [])) : [], partnerKols: partnersRes.status === 'fulfilled' ? (partnersRes.value?.data?.data || partnersRes.value?.data || []) : [], currentStoreId: sId };
    } catch {
      // Fallback safe handling
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
    const generatedCode = `${kolNameClean}${couponDiscountPercent}`;

    setIssuingCoupon(true);
    try {
      await couponService.createStoreCoupon(currentStoreId, {
        code: generatedCode,
        collaboratorId: kol?.id || kol?.userId || selectedKolId,
        discountType: 'PERCENTAGE',
        discountValue: couponDiscountPercent,
        scopeType: 'STORE_WIDE',
        usageLimitPerCustomer: 1,
        benefitType: 'GOODS',
      } as any);

      toast.success(`Đã cấp thành công mã ưu đãi "${generatedCode}" cho ${kol?.fullName || 'KOC'}.`);
      setIsIssueCouponOpen(false);
      setSelectedKolId('');
      await loadData(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Không thể tạo mã ưu đãi.');
    } finally {
      setIssuingCoupon(false);
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
            <span>Mã ưu đãi KOC (Attribution)</span>
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
              <span>Cấp mã ưu đãi KOC</span>
            </button>
          )}
        </div>
      </div>

      {/* SECTION 1: ATTRIBUTION COUPONS (PHƯƠNG ÁN B - % TƯƠNG QUAN) */}
      {activeSection === 'coupons' && (
        <div className="space-y-3.5">
          {/* Search & Status Bar */}
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
            <div className="flex items-center gap-2 text-xs text-[#7D715E]">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#EAE4D7] text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#B88E4F]" />
                <span>Ghi nhận Attribution tự động 100% qua mã định danh</span>
              </span>
            </div>
          </div>

          {/* Coupons Table */}
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
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                        <CheckCircle2 className="w-3 h-3" />
                        Đang hoạt động
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <span className="text-[11px] text-[#7D715E]">
                        Tự động ghi nhận
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filteredCoupons.length && (
              <div className="p-8 text-center text-xs text-[#7D715E]">
                {loading ? 'Đang đồng bộ danh sách mã ưu đãi KOC...' : 'Chưa có mã ưu đãi định danh KOC nào được phát hành.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: MONTHLY MILESTONE RULES (FR-09) - CHUẨN DOANH SỐ THÁNG */}
      {activeSection === 'milestones' && (
        <div className="space-y-4">
          {/* Header Info */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-2xl bg-white border border-[#EAE4D7] text-xs shadow-2xs">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center shrink-0">
                <Trophy className="w-4 h-4" />
              </span>
              <div>
                <span className="font-bold text-[#1A1612] block">
                  Quy chế Thưởng Mốc Doanh Số Tháng
                </span>
                <span className="text-[11px] text-[#7D715E] block mt-0.5">
                  Quyết toán tự động vào Ví thù lao KOC vào 24h ngày cuối tháng
                </span>
              </div>
            </div>
            <span className="text-[11px] text-[#7D715E] shrink-0 font-medium">
              Chu kỳ: Hàng tháng (01 đến 30/31)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MONTHLY_MILESTONES.map((rule) => (
              <div
                key={rule.id}
                className="rounded-2xl border border-[#EAE4D7] bg-white p-4 sm:p-5 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-[#1A1612]">{rule.name}</h4>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#FBF5EB] text-[#8C6226] border border-[#EEDFC6] tabular-nums">
                    +{money(rule.rewardAmount)}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7] text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[#7D715E]">Chỉ tiêu doanh số tháng:</span>
                    <strong className="text-[#1A1612] font-mono text-sm">{money(rule.targetGmv)}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#7D715E]">Hình thức chi trả:</span>
                    <span className="font-semibold text-[#1A1612]">Thưởng tiền mặt vào Ví</span>
                  </div>
                </div>

                <p className="text-[11px] text-[#7D715E] leading-relaxed">
                  {rule.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Cấp mã ưu đãi KOC (Phương án B: Khóa cứng % tương quan) */}
      {isIssueCouponOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#EAE4D7] w-full max-w-md p-5 sm:p-6 text-left animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-[#EAE4D7]">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center shrink-0">
                  <Tag className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-[#1A1612] m-0">Cấp mã ưu đãi KOC</h3>
                  <p className="text-xs text-[#7D715E] m-0 mt-0.5">Mã độc quyền định danh bắt attribution đơn hàng</p>
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
              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-1">
                  Chọn KOC thụ hưởng <span className="text-[#DC2626]">*</span>
                </label>
                <select
                  value={selectedKolId}
                  onChange={(e) => setSelectedKolId(e.target.value)}
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
                  Mức giảm giá cho fan của KOC <span className="text-[#DC2626]">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCouponDiscountPercent(5)}
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
                    onClick={() => setCouponDiscountPercent(10)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      couponDiscountPercent === 10
                        ? 'bg-[#FBF5EB] border-[#C59B58] text-[#8C6226]'
                        : 'bg-white border-[#EAE4D7] text-[#7D715E]'
                    }`}
                  >
                    Giảm 10% (Chuẩn sàn)
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EEDFC6] text-xs space-y-1">
                <span className="font-semibold text-[#8C6226] block">Quy chuẩn mã định danh:</span>
                <p className="text-[#7D715E] text-[11px]">
                  Mã sẽ tự động sinh theo cấu trúc: <strong>[TÊN_KOC]{couponDiscountPercent}</strong> (Ví dụ: THAONHI10, LANHUONG10). Mỗi khách hàng chỉ được dùng 1 lần để chống lạm dụng.
                </p>
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
                  disabled={issuingCoupon || !selectedKolId}
                  className="px-5 py-2 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-[#1A1612] text-xs font-bold shadow-2xs transition cursor-pointer disabled:opacity-50"
                >
                  {issuingCoupon ? 'Đang cấp...' : 'Xác nhận cấp mã'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
