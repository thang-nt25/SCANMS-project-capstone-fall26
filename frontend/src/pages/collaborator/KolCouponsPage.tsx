import React, { useState, useEffect, useRef } from 'react';
import {
  Tag,
  Ticket,
  Plus,
  Copy,
  Check,
  Pause,
  Play,
  Trash2,
  Search,
  Store,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Percent,
  Loader2,
  Sparkles,
  ChevronDown,
  DollarSign,
} from 'lucide-react';
import {
  couponService,
  type CouponItem,
  type CouponStatus,
  type DiscountType,
  type CouponScope,
} from '../../services/coupon.service';
import { toast as sonnerToast } from '../../utils/toast';
import api from '../../services/api';

interface EligibleStore {
  id?: string;
  storeId?: string;
  name?: string;
  storeName?: string;
  logoUrl?: string | null;
  owner?: { avatarUrl?: string | null } | null;
}

function PartnerStoreAvatar({ store }: { store?: EligibleStore }) {
  const avatarUrl = store?.owner?.avatarUrl?.trim();
  const logoUrl = store?.logoUrl?.trim();
  const [imageIndex, setImageIndex] = useState(0);
  useEffect(() => setImageIndex(0), [avatarUrl, logoUrl]);
  const images = [...new Set([avatarUrl, logoUrl].filter((url): url is string => Boolean(url)))];
  const imageUrl = images[imageIndex];
  const name = store?.name || store?.storeName || 'Gian hàng đối tác';
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  return (
    <span className="w-7 h-7 rounded-lg bg-[#FBF5EB] border border-[#EAE4D7] inline-flex items-center justify-center overflow-hidden shrink-0 text-[#B88E4F] text-[10px] font-semibold">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={`Avatar ${name}`}
          className="w-full h-full object-cover"
          onError={() => setImageIndex((index) => index + 1)}
        />
      ) : store ? (
        <span aria-hidden="true">{initials || 'S'}</span>
      ) : (
        <Store className="w-3.5 h-3.5" />
      )}
    </span>
  );
}

const STATUS_LABELS: Record<CouponStatus, { label: string; bg: string; text: string; border: string }> = {
  ACTIVE: {
    label: 'Đang hoạt động',
    bg: 'bg-[#FBF5EB]',
    text: 'text-[#B88E4F]',
    border: 'border-[#EAE4D7]',
  },
  PENDING_APPROVAL: {
    label: 'Chờ Shop duyệt',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  PAUSED: {
    label: 'Tạm ngưng',
    bg: 'bg-stone-100',
    text: 'text-stone-600',
    border: 'border-stone-200',
  },
  REJECTED: {
    label: 'Đã từ chối',
    bg: 'bg-red-50',
    text: 'text-red-600',
    border: 'border-red-200',
  },
  EXPIRED: {
    label: 'Hết hạn',
    bg: 'bg-stone-100',
    text: 'text-stone-500',
    border: 'border-stone-200',
  },
  BLOCKED: {
    label: 'Đã bị khóa',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-300',
  },
  DELETED: {
    label: 'Đã xóa',
    bg: 'bg-stone-100',
    text: 'text-stone-400',
    border: 'border-stone-200',
  },
};

export const KolCouponsPage: React.FC = () => {
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [summary, setSummary] = useState<{
    totalSales: number;
    totalCommission: number;
    totalOrders: number;
    activeCoupons: number;
  }>({ totalSales: 0, totalCommission: 0, totalOrders: 0, activeCoupons: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);


  const [isModalOpen, setIsModalOpen] = useState(false);
  const [approvedStores, setApprovedStores] = useState<EligibleStore[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [isStoreDropdownOpen, setIsStoreDropdownOpen] = useState(false);
  const storeDropdownRef = useRef<HTMLDivElement>(null);
  const [proposeCode, setProposeCode] = useState('');
  const [proposeDiscountType, setProposeDiscountType] = useState<DiscountType>('PERCENTAGE');
  const [proposeDesiredPercent, setProposeDesiredPercent] = useState<number>(15);
  const [proposeFixedAmount, setProposeFixedAmount] = useState<number>(30000);
  const [proposeMaxDiscount, setProposeMaxDiscount] = useState<number>(50000);
  const [proposeMinOrder, setProposeMinOrder] = useState<number>(150000);
  const [proposeValidityDays, setProposeValidityDays] = useState<number>(30);
  const [proposeScopeType, setProposeScopeType] = useState<CouponScope>('STORE_WIDE');
  const [proposeNote, setProposeNote] = useState<string>('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  const handleNumericInput = (rawText: string, setter: (val: number) => void) => {
    const digits = rawText.replace(/\D/g, '');
    if (!digits) {
      setter(0);
      return;
    }
    const parsed = parseInt(digits, 10);
    setter(Number.isNaN(parsed) ? 0 : parsed);
  };


  const selectedStore = approvedStores.find(
    (store) => (store.id || store.storeId) === selectedStoreId,
  ) || approvedStores[0];


  const [deleteTarget, setDeleteTarget] = useState<CouponItem | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);


  const [toast, setToast] = useState<{
    id: number;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  } | null>(null);

  const showToast = (
    type: 'success' | 'error' | 'info',
    title: string,
    message: string,
  ) => {
    const id = Date.now();
    setToast({ id, type, title, message });

    if (window.self !== window.top) {
      window.parent.postMessage(
        { type: 'SCANMS_TOAST', message: `${title}: ${message}` },
        window.location.origin,
      );
    }

    setTimeout(() => {
      setToast((curr) => (curr?.id === id ? null : curr));
    }, 4500);
  };

  const hasOpenModal = isModalOpen || deleteTarget !== null;

  useEffect(() => {
    if (window.self === window.top) return;

    window.parent.postMessage(
      { type: 'SCANMS_MODAL_STATE', open: hasOpenModal },
      window.location.origin,
    );

    return () => {
      if (hasOpenModal) {
        window.parent.postMessage(
          { type: 'SCANMS_MODAL_STATE', open: false },
          window.location.origin,
        );
      }
    };
  }, [hasOpenModal]);

  useEffect(() => {
    if (hasOpenModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [hasOpenModal]);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        storeDropdownRef.current &&
        !storeDropdownRef.current.contains(event.target as Node)
      ) {
        setIsStoreDropdownOpen(false);
      }
    };
    if (isStoreDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isStoreDropdownOpen]);

  const fetchCouponsRef = useRef<(retryCount?: number) => Promise<void>>(() => Promise.resolve());
  const fetchApprovedStoresRef = useRef<() => Promise<void>>(() => Promise.resolve());

  useEffect(() => {
    fetchCouponsRef.current();
    fetchApprovedStoresRef.current();

    const handleSync = (e: MessageEvent) => {
      if (e.data?.type === 'SCANMS_AUTH_SYNC') {
        fetchCouponsRef.current();
        fetchApprovedStoresRef.current();
      }
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === 'user' || e.key === 'scanms-current-role') {
        fetchCouponsRef.current();
        fetchApprovedStoresRef.current();
      }
    };
    const handleFocus = () => {
      fetchCouponsRef.current();
    };

    window.addEventListener('message', handleSync);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleFocus);

    const handleOpenPropose = () => {
      setIsModalOpen(true);
      setModalError(null);
      setModalSuccess(null);
    };
    window.addEventListener('scanms_open_propose_coupon', handleOpenPropose);

    return () => {
      window.removeEventListener('message', handleSync);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('scanms_open_propose_coupon', handleOpenPropose);
    };
  }, []);

  const fetchCoupons = async (retryCount = 0) => {
    try {
      setLoading(true);
      const res = await couponService.getKolCoupons();
      const list = Array.isArray(res?.data)
        ? res.data
        : (Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res) ? res : []));
      setCoupons(list);
      const sum = res?.summary || res?.data?.summary;
      if (sum) {
        setSummary(sum);
      }
      if (list.length === 0 && retryCount < 2) {
        setTimeout(() => fetchCoupons(retryCount + 1), 400);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách coupon của KOL:', err);
      if (retryCount < 2) {
        setTimeout(() => fetchCoupons(retryCount + 1), 400);
      }
    } finally {
      setLoading(false);
    }
  };
  fetchCouponsRef.current = fetchCoupons;

  const fetchApprovedStores = async () => {
    try {

      const res = await api.get('/collaborator/coupons/eligible-stores');
      const storeList = res.data?.data || res.data || [];
      setApprovedStores(storeList);
      if (storeList.length > 0) {
        setSelectedStoreId(storeList[0].id || storeList[0].storeId);
      } else {
        setSelectedStoreId('');
      }
    } catch (err) {
      console.error('Lỗi lấy danh sách gian hàng đủ điều kiện tạo coupon:', err);
      setApprovedStores([]);
      setSelectedStoreId('');
    }
  };
  fetchApprovedStoresRef.current = fetchApprovedStores;

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    sonnerToast.success('Đã sao chép mã giảm giá!');
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleTogglePause = async (coupon: CouponItem) => {
    try {
      await couponService.togglePauseCoupon(coupon.id);
      sonnerToast.success(coupon.status === 'ACTIVE' ? 'Đã tạm dừng mã giảm giá' : 'Đã kích hoạt lại mã giảm giá');
      await fetchCoupons();
    } catch (err: any) {
      sonnerToast.error(err.response?.data?.message || 'Không thể thay đổi trạng thái coupon');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      await couponService.deleteCoupon(deleteTarget.id, deleteReason);
      setDeleteTarget(null);
      setDeleteReason('');
      sonnerToast.success('Đã xóa mã giảm giá');
      await fetchCoupons();
    } catch (err: any) {
      sonnerToast.error(err.response?.data?.message || 'Không thể xóa mã giảm giá');
    } finally {
      setDeleteLoading(false);
    }
  };


  const trimmedCode = proposeCode.trim().toUpperCase();
  const isLengthValid = trimmedCode.length >= 4 && trimmedCode.length <= 20;
  const isAlphanumeric = /^[A-Z0-9]+$/.test(trimmedCode);
  const hasLetter = /[A-Z]/.test(trimmedCode);
  const isBanned = [
    'ADMIN',
    'SCANMS',
    'OFFICIAL',
    'SYSTEM',
    'SUPPORT',
    'ROOT',
    'MODERATOR',
    'STAFF',
    'HELPDESK',
    'VOUCHER',
    'PROMO',
    'DISCOUNT',
  ].some((word) => trimmedCode === word || trimmedCode.includes(word));

  const isCodeValid =
    isLengthValid && isAlphanumeric && hasLetter && !isBanned;

  const handleProposeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStoreId) {
      setModalError('Vui lòng chọn Gian hàng đối tác');
      return;
    }
    if (!isCodeValid) {
      setModalError('Mã không hợp lệ. Vui lòng kiểm tra lại các yêu cầu bên dưới');
      return;
    }

    try {
      setModalLoading(true);
      setModalError(null);

      const startsAt = new Date().toISOString();
      const expiresAt = proposeValidityDays > 0
        ? new Date(Date.now() + proposeValidityDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

      await couponService.proposeCoupon({
        storeId: selectedStoreId,
        code: trimmedCode,
        discountType: proposeDiscountType,
        discountValue: proposeDiscountType === 'PERCENTAGE' ? proposeDesiredPercent : proposeFixedAmount,
        minimumOrderAmount: proposeMinOrder > 0 ? proposeMinOrder : undefined,
        maximumDiscountAmount: proposeDiscountType === 'PERCENTAGE' && proposeMaxDiscount > 0 ? proposeMaxDiscount : undefined,
        startsAt,
        expiresAt,
        scopeType: proposeScopeType,
        note: proposeNote.trim() || undefined,
      });


      setModalSuccess(
        `Đề xuất mã "${trimmedCode}" thành công! Đang chuyển tiếp...`,
      );
      setTimeout(() => {
        setIsModalOpen(false);
        setModalSuccess(null);
        setProposeCode('');
        fetchCoupons();
        showToast(
          'success',
          'Đã gửi đề xuất mã thành công!',
          `Mã "${trimmedCode}" đã được gửi tới Gian hàng và đang chờ cấu hình ưu đãi xét duyệt.`,
        );
      }, 500);
    } catch (err: any) {
      setModalError(
        err.response?.data?.message ||
          'Không thể gửi đề xuất mã giảm giá. Vui lòng kiểm tra lại.',
      );
    } finally {
      setModalLoading(false);
    }
  };


  const safeCoupons = Array.isArray(coupons) ? coupons : [];
  const filteredCoupons = safeCoupons.filter((c) => {
    if (!c) return false;
    const matchSearch =
      (c.codeNormalized &&
        c.codeNormalized.includes(searchTerm.trim().toUpperCase())) ||
      (c.displayCode &&
        c.displayCode.toUpperCase().includes(searchTerm.trim().toUpperCase())) ||
      (c.store?.name &&
        c.store.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchStatus =
      statusFilter === 'ALL' ? true : c.status === statusFilter;
    return matchSearch && matchStatus;
  });


  const totalCount = safeCoupons.length;
  const activeCount = safeCoupons.filter((c) => c && c.status === 'ACTIVE').length;
  const pendingCount = safeCoupons.filter(
    (c) => c && c.status === 'PENDING_APPROVAL',
  ).length;
  const totalRedemptions = safeCoupons.reduce(
    (acc, curr) => acc + (curr?.usageCount || 0),
    0,
  );

  return (
    <div className="kol-coupon-page min-h-screen h-full overflow-y-auto bg-[#FAF8F5] p-4 sm:p-6 lg:p-8 text-[#1A1612]">

      <div className="kol-coupon-content max-w-[1520px] mx-auto mb-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-[#EAE4D7] shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#7D715E] uppercase tracking-wider">
                Doanh số qua Coupon
              </span>
              <DollarSign className="w-4 h-4 text-[#B88E4F]" />
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-[#1A1612]">
              {Number(summary.totalSales || 0).toLocaleString('vi-VN')} ₫
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#EAE4D7] shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#7D715E] uppercase tracking-wider">
                Thu nhập tiếp thị dự kiến
              </span>
              <Tag className="w-4 h-4 text-[#B88E4F]" />
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-[#B88E4F]">
              +{Number(summary.totalCommission || 0).toLocaleString('vi-VN')} ₫
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#EAE4D7] shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#7D715E] uppercase tracking-wider">
                Đơn hàng / Lượt dùng
              </span>
              <Percent className="w-4 h-4 text-[#B88E4F]" />
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-[#1A1612]">
              {summary.totalOrders || 0} <span className="text-xs font-normal text-[#7D715E]">đơn ({totalRedemptions} lượt)</span>
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#EAE4D7] shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#7D715E] uppercase tracking-wider">
                Mã đang hoạt động
              </span>
              <Ticket className="w-4 h-4 text-[#B88E4F]" />
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-[#1A1612]">
              {activeCount} <span className="text-xs font-normal text-[#7D715E]">/ {totalCount} mã</span>
            </p>
            <span className="text-[11px] text-[#7D715E] block mt-0.5">
              ({pendingCount} mã chờ Shop duyệt)
            </span>
          </div>
        </div>


        <div className="kol-coupon-toolbar bg-white p-4 rounded-xl border border-[#EAE4D7] shadow-xs mb-6">
          <div className="kol-coupon-search relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7D715E]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm mã coupon hoặc tên gian hàng..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-[#FAF8F5] border border-[#EAE4D7] rounded-lg focus:outline-none focus:border-[#C59B58] transition-colors"
            />
          </div>

          <div className="kol-coupon-status-tabs">
            {[
              { key: 'ALL', label: 'Tất cả' },
              { key: 'ACTIVE', label: 'Đang chạy' },
              { key: 'PENDING_APPROVAL', label: 'Chờ duyệt' },
              { key: 'PAUSED', label: 'Tạm ngưng' },
              { key: 'REJECTED', label: 'Từ chối' },
              { key: 'BLOCKED', label: 'Bị khóa' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                aria-pressed={statusFilter === tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  statusFilter === tab.key
                    ? 'bg-[#ECE1CD] text-[#1A1612] border border-[#DEBE85] font-bold shadow-xs'
                    : 'bg-[#F3EFE6] text-[#7D715E] hover:bg-[#EAE4D7] hover:text-[#1A1612]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>


        {loading ? (
          <div className="bg-white rounded-xl border border-[#EAE4D7] p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#B88E4F] mx-auto mb-3" />
            <p className="text-sm text-[#7D715E]">
              Đang tải danh sách mã giảm giá...
            </p>
          </div>
        ) : filteredCoupons.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#EAE4D7] p-12 text-center">
            <div className="w-14 h-14 bg-[#FBF5EB] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#EAE4D7]">
              <Tag className="w-6 h-6 text-[#B88E4F]" />
            </div>
            <h3 className="text-lg font-semibold text-[#1A1612] mb-1">
              Chưa có mã giảm giá nào
            </h3>
            <p className="text-xs text-[#7D715E] max-w-md mx-auto mb-5 leading-relaxed">
              Tạo mã giảm giá độc quyền mang dấu ấn cá nhân để phân phối cho người theo dõi, tăng tỷ lệ hoàn tất đơn và nhận hoa hồng tiếp thị.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Đề xuất mã đầu tiên
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCoupons.map((coupon) => {
              const statusCfg =
                STATUS_LABELS[coupon.status] || STATUS_LABELS.PENDING_APPROVAL;
              const isDiscountPercent =
                coupon.discountType === 'PERCENTAGE';
              const discountVal = Number(coupon.discountValue || 0);

              return (
                <div
                  key={coupon.id}
                  className="bg-white rounded-2xl border border-[#EAE4D7] shadow-xs hover:border-[#C59B58] hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden relative"
                >
                  {/* Top Ticket Header */}
                  <div className="bg-gradient-to-br from-[#FAF8F5] via-[#FBF5EB] to-[#F3EFE6] p-4 pb-4 border-b border-dashed border-[#EEDFC6] relative">
                    {/* Header Store & Status */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Store className="w-3.5 h-3.5 text-[#B88E4F] shrink-0" />
                        <span className="text-xs font-bold text-[#1A1612] truncate">
                          {coupon.store?.name || 'Gian hàng đối tác'}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border shrink-0 ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                      >
                        {statusCfg.label}
                      </span>
                    </div>

                    {/* Voucher Code Box */}
                    <div className="flex items-center justify-between gap-2 bg-white/95 border border-[#EEDFC6] rounded-xl px-3 py-2 shadow-2xs">
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#7D715E] block">
                          MÃ VOUCHER ĐỘC QUYỀN
                        </span>
                        <span className="text-sm sm:text-base font-mono font-black text-[#1A1612] tracking-normal truncate block" title={coupon.displayCode}>
                          {coupon.displayCode}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(coupon.displayCode)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] hover:bg-[#F3EFE6] border border-[#EEDFC6] text-[#B88E4F] hover:text-[#1A1612] text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs shrink-0"
                        title="Sao chép mã"
                      >
                        {copiedCode === coupon.displayCode ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-[11px] text-emerald-700">Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="text-[11px]">Chép mã</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Ticket Notches at side edges */}
                    <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-[#FAF8F5] rounded-full border border-[#EAE4D7]" />
                    <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-[#FAF8F5] rounded-full border border-[#EAE4D7]" />
                  </div>

                  {/* Bottom Ticket Body */}
                  <div className="p-4 pt-3 flex flex-col justify-between flex-1">
                    <div className="space-y-2 mb-4 text-xs text-[#7D715E]">
                      {coupon.status === 'PENDING_APPROVAL' ? (
                        <div className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/80 flex items-start gap-2">
                          <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <p className="text-[11px] text-amber-800 leading-relaxed">
                            Yêu cầu đang chờ Shop xác nhận cấu hình mức giảm, ngân sách và thời hạn áp dụng.
                          </p>
                        </div>
                      ) : coupon.status === 'REJECTED' ? (
                        <div className="bg-red-50/70 p-2.5 rounded-xl border border-red-200 flex items-start gap-2">
                          <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[11px] font-semibold text-red-800">
                              Lý do từ chối:
                            </p>
                            <p className="text-[11px] text-red-700 mt-0.5">
                              {coupon.rejectedReason ||
                                'Không đáp ứng điều kiện chiến dịch'}
                            </p>
                          </div>
                        </div>
                      ) : coupon.status === 'BLOCKED' ? (
                        <div className="bg-red-50/70 p-2.5 rounded-xl border border-red-200 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[11px] font-semibold text-red-800">
                              Mã đã bị khóa:
                            </p>
                            <p className="text-[11px] text-red-700 mt-0.5">
                              {coupon.blockedReason ||
                                'Vi phạm chính sách sử dụng'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <span>Ưu đãi áp dụng:</span>
                            <span className="font-bold text-[#1A1612]">
                              {isDiscountPercent
                                ? `Giảm ${discountVal}%`
                                : `Giảm ${discountVal.toLocaleString('vi-VN')} ₫`}
                              {coupon.maximumDiscountAmount &&
                                ` (Tối đa ${Number(
                                  coupon.maximumDiscountAmount,
                                ).toLocaleString('vi-VN')} ₫)`}
                            </span>
                          </div>

                          {coupon.minimumOrderAmount && (
                            <div className="flex items-center justify-between">
                              <span>Đơn tối thiểu:</span>
                              <span className="font-medium text-[#1A1612]">
                                {Number(
                                  coupon.minimumOrderAmount,
                                ).toLocaleString('vi-VN')}{' '}
                                ₫
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <span>Đã dùng:</span>
                            <span className="font-medium text-[#1A1612]">
                              {coupon.usageCount}
                              {coupon.usageLimitTotal
                                ? ` / ${coupon.usageLimitTotal} lượt`
                                : ' lượt'}
                            </span>
                          </div>

                          {coupon.expiresAt && (
                            <div className="flex items-center justify-between">
                              <span>Hạn dùng:</span>
                              <span className="font-medium text-[#1A1612]">
                                {new Date(coupon.expiresAt).toLocaleDateString(
                                  'vi-VN',
                                )}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {(coupon.status === 'ACTIVE' || coupon.status === 'PAUSED') && (
                      <div className="mb-4 p-2.5 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7] text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[#7D715E]">Doanh số tạo ra:</span>
                          <span className="font-bold text-[#1A1612]">
                            {Number((coupon as any).totalSales || 0).toLocaleString('vi-VN')} ₫
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#7D715E]">Hoa hồng dự kiến:</span>
                          <span className="font-bold text-[#B88E4F]">
                            +{Number((coupon as any).totalCommission || 0).toLocaleString('vi-VN')} ₫
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="pt-3 border-t border-[#EAE4D7] flex items-center justify-between gap-2">
                      <span className="text-[11px] text-[#7D715E]">
                        Tạo ngày:{' '}
                        {new Date(coupon.createdAt).toLocaleDateString('vi-VN')}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {coupon.status === 'ACTIVE' && (
                          <button
                            type="button"
                            onClick={() => handleTogglePause(coupon)}
                            className="p-1.5 rounded-lg text-[#7D715E] hover:bg-[#F3EFE6] hover:text-[#1A1612] transition-colors cursor-pointer"
                            title="Tạm ngưng mã"
                          >
                            <Pause className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {coupon.status === 'PAUSED' && coupon.approvedBy && coupon.approvedAt && (
                          <button
                            type="button"
                            onClick={() => handleTogglePause(coupon)}
                            className="p-1.5 rounded-lg text-[#B88E4F] hover:bg-[#FBF5EB] transition-colors cursor-pointer"
                            title="Kích hoạt lại"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {(coupon.status === 'PENDING_APPROVAL' || coupon.status === 'REJECTED') && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(coupon)}
                            className="p-1.5 rounded-lg text-[#7D715E] hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                            title="Xóa mềm mã"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>


      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#231D15]/35 p-4 backdrop-blur-xs overflow-y-auto">
          <div role="dialog" aria-modal="true" aria-labelledby="coupon-proposal-title" className="bg-white w-full max-w-lg rounded-2xl border border-[#EAE4D7] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto max-h-[92vh] flex flex-col text-left">
            <div className="px-5 py-4 border-b border-[#EAE4D7] flex items-center justify-between shrink-0 bg-[#FAF8F5]">
              <div className="flex items-center gap-3 min-w-0">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6]" aria-hidden="true">
                  <Ticket className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <h3 id="coupon-proposal-title" className="text-sm sm:text-base font-bold text-[#1A1612]">
                    Đề xuất mã giảm giá riêng
                  </h3>
                  <p className="text-xs text-[#7D715E] mt-0.5">
                    Tạo mã ưu đãi mang dấu ấn thương hiệu cá nhân của bạn.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                type="button"
                aria-label="Đóng đề xuất mã giảm giá"
                className="text-[#7D715E] hover:text-[#1A1612] p-1.5 rounded-lg hover:bg-[#F3EFE6] transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleProposeSubmit} className="overflow-y-auto p-5 space-y-4">
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}

              {modalSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{modalSuccess}</span>
                </div>
              )}


              <div>
                <label htmlFor="coupon-partner-store" className="block text-xs font-semibold text-[#1A1612] mb-1.5">
                  Gian hàng đối tác <span className="text-red-500">*</span>
                </label>

                <div ref={storeDropdownRef} className="relative">
                  <button
                    type="button"
                    id="coupon-partner-store"
                    aria-expanded={isStoreDropdownOpen}
                    onClick={() => setIsStoreDropdownOpen((prev) => !prev)}
                    className={`w-full px-3.5 py-2.5 text-sm bg-[#FAF8F5] border rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                      isStoreDropdownOpen
                        ? 'border-[#C59B58] ring-2 ring-[#DEC07A]/30 bg-white shadow-xs'
                        : 'border-[#EAE4D7] hover:border-[#C59B58]/60 hover:bg-[#F3EFE6]/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <PartnerStoreAvatar key={selectedStoreId} store={selectedStore} />
                      <span className="font-medium text-[#1A1612] truncate text-left">
                        {selectedStore?.name || selectedStore?.storeName || 'Chưa có gian hàng nào được duyệt'}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-[#7D715E] shrink-0 transition-transform duration-200 ${
                        isStoreDropdownOpen ? 'rotate-180 text-[#B88E4F]' : ''
                      }`}
                    />
                  </button>


                  {isStoreDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#EAE4D7] rounded-xl shadow-xl overflow-hidden py-1.5 max-h-56 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
                      {approvedStores.length > 0 ? (
                        approvedStores.map((s) => {
                          const storeId = s.id || s.storeId;
                          const storeName =
                            s.name || s.storeName || 'Gian hàng đối tác';
                          const isSelected = selectedStoreId === storeId;
                          return (
                            <button
                              key={storeId}
                              type="button"
                              onClick={() => {
                                setSelectedStoreId(storeId || '');
                                setIsStoreDropdownOpen(false);
                              }}
                              className={`w-full px-3.5 py-2.5 text-left text-xs sm:text-sm flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-[#FBF5EB] text-[#B88E4F] font-semibold border-l-3 border-[#C59B58]'
                                  : 'text-[#1A1612] hover:bg-[#F3EFE6] hover:text-[#B88E4F]'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <PartnerStoreAvatar store={s} />
                                <span className="truncate">{storeName}</span>
                              </div>
                              {isSelected && (
                                <Check className="w-4 h-4 text-[#B88E4F] shrink-0" />
                              )}
                            </button>
                          );
                        })
                      ) : (
                        <div className="px-3.5 py-2.5 text-xs text-[#7D715E] italic bg-[#FAF8F5]">
                          Không có gian hàng nào khả dụng
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {approvedStores.length === 0 && (
                  <div className="mt-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                    <span>
                      Bạn chưa có quan hệ đối tác được phê duyệt với Gian hàng nào để tạo mã giảm giá riêng. Vui lòng liên kết với Gian hàng trước.
                    </span>
                  </div>
                )}

                <span className="text-[11px] text-[#7D715E] mt-1 block">
                  Chỉ hiển thị gian hàng đã duyệt hợp tác với bạn.
                </span>
              </div>


              <div className="space-y-4">
                {/* 1. Nhập mã voucher */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label htmlFor="coupon-proposal-code" className="block text-xs font-semibold text-[#1A1612]">
                      Mã giảm giá đề xuất <span className="text-[#DC2626]">*</span>
                    </label>
                    <span className="text-[11px] font-medium text-[#7D715E]">
                      {proposeCode.length}/20 ký tự
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      id="coupon-proposal-code"
                      aria-describedby="coupon-code-feedback"
                      aria-invalid={Boolean(trimmedCode && !isCodeValid)}
                      autoComplete="off"
                      value={proposeCode}
                      onChange={(e) => setProposeCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                      placeholder="Ví dụ: THANGVIP10"
                      maxLength={20}
                      className="w-full px-3.5 py-2.5 text-sm font-bold tracking-wider uppercase bg-[#FAF8F5] focus:bg-white border border-[#EAE4D7] rounded-xl focus:outline-none focus:border-[#C59B58] focus:ring-2 focus:ring-[#C59B58]/20 transition-all text-[#1A1612]"
                      required
                    />
                    {trimmedCode && (
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold">
                        {isCodeValid ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-[#DC2626]" />
                        )}
                      </span>
                    )}
                  </div>

                  {/* Gợi ý đuôi mã nhanh */}
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-[#7D715E]">Gợi ý nhanh:</span>
                    {['VIP10', 'SALE15', 'DEAL20', 'SPECIAL'].map((suf) => (
                      <button
                        key={suf}
                        type="button"
                        onClick={() => {
                          const prefix = trimmedCode ? trimmedCode.replace(/\d+$/, '') : 'THANG';
                          setProposeCode((prefix + suf).slice(0, 20));
                        }}
                        className="px-2 py-0.5 rounded-md bg-[#FAF8F5] border border-[#EAE4D7] hover:border-[#C59B58] hover:bg-[#FBF5EB] text-[10.5px] font-semibold text-[#7D715E] hover:text-[#B88E4F] transition-colors cursor-pointer"
                      >
                        +{suf}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Cấu hình điều kiện ưu đãi đề xuất */}
                <div className="space-y-3 pt-1 border-t border-[#EAE4D7]">
                  {/* Hình thức giảm giá */}
                  <div>
                    <label className="block text-xs font-semibold text-[#1A1612] mb-1.5">
                      Hình thức giảm giá mong muốn
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setProposeDiscountType('PERCENTAGE')}
                        className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                          proposeDiscountType === 'PERCENTAGE'
                            ? 'border-[#C59B58] bg-[#FBF5EB] text-[#8C6226] ring-1 ring-[#C59B58]/30 shadow-2xs'
                            : 'border-[#EAE4D7] bg-[#FAF8F5] text-[#7D715E] hover:bg-white'
                        }`}
                      >
                        <Percent className="w-3.5 h-3.5" />
                        <span>Giảm theo phần trăm (%)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setProposeDiscountType('FIXED_AMOUNT')}
                        className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                          proposeDiscountType === 'FIXED_AMOUNT'
                            ? 'border-[#C59B58] bg-[#FBF5EB] text-[#8C6226] ring-1 ring-[#C59B58]/30 shadow-2xs'
                            : 'border-[#EAE4D7] bg-[#FAF8F5] text-[#7D715E] hover:bg-white'
                        }`}
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Giảm tiền cố định (VNĐ)</span>
                      </button>
                    </div>
                  </div>

                  {/* Giá trị giảm */}
                  {proposeDiscountType === 'PERCENTAGE' ? (
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                          Mức giảm (%)
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={5}
                            max={50}
                            value={proposeDesiredPercent || ''}
                            onChange={(e) => setProposeDesiredPercent(Number(e.target.value) || 0)}
                            className="w-full px-3 py-2 text-xs font-bold bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl focus:border-[#C59B58] focus:bg-white outline-none"
                            placeholder="15"
                          />
                          <span className="text-xs font-bold text-[#7D715E]">%</span>
                        </div>
                        <div className="flex gap-1 mt-1">
                          {[10, 15, 20, 25].map((pct) => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => setProposeDesiredPercent(pct)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                                proposeDesiredPercent === pct
                                  ? 'bg-[#B88E4F] text-white'
                                  : 'bg-[#FAF8F5] border border-[#EAE4D7] text-[#7D715E] hover:bg-white'
                              }`}
                            >
                              {pct}%
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                          Giảm tối đa (VNĐ)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={proposeMaxDiscount ? String(proposeMaxDiscount) : ''}
                          onChange={(e) => handleNumericInput(e.target.value, setProposeMaxDiscount)}
                          placeholder="50000"
                          className="w-full px-3 py-2 text-xs font-bold font-mono bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl focus:border-[#C59B58] focus:bg-white outline-none"
                        />
                        <div className="flex items-center justify-between text-[10px] mt-0.5">
                          <span className="text-[#7D715E]">Trần giảm bảo vệ Shop</span>
                          {proposeMaxDiscount > 0 && (
                            <span className="font-bold text-[#B88E4F] font-mono">
                              {proposeMaxDiscount.toLocaleString('vi-VN')} ₫
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                        Số tiền giảm cố định (VNĐ)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={proposeFixedAmount ? String(proposeFixedAmount) : ''}
                        onChange={(e) => handleNumericInput(e.target.value, setProposeFixedAmount)}
                        placeholder="30000"
                        className="w-full px-3 py-2 text-xs font-bold font-mono bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl focus:border-[#C59B58] focus:bg-white outline-none"
                      />
                      {proposeFixedAmount > 0 && (
                        <div className="text-[10px] text-[#B88E4F] font-bold font-mono mt-0.5">
                          Quy đổi: {proposeFixedAmount.toLocaleString('vi-VN')} ₫
                        </div>
                      )}
                      <div className="flex gap-1.5 mt-1">
                        {[20000, 30000, 50000, 100000].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setProposeFixedAmount(amt)}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                              proposeFixedAmount === amt
                                ? 'bg-[#B88E4F] text-white'
                                : 'bg-[#FAF8F5] border border-[#EAE4D7] text-[#7D715E] hover:bg-white'
                            }`}
                          >
                            {(amt / 1000).toLocaleString('vi-VN')}K
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Giá trị đơn tối thiểu */}
                  <div>
                    <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                      Giá trị đơn hàng tối thiểu (VNĐ)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={proposeMinOrder ? String(proposeMinOrder) : ''}
                      onChange={(e) => handleNumericInput(e.target.value, setProposeMinOrder)}
                      placeholder="150000"
                      className="w-full px-3 py-2 text-xs font-bold font-mono bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl focus:border-[#C59B58] focus:bg-white outline-none"
                    />
                    {proposeMinOrder > 0 && (
                      <div className="text-[10px] text-[#B88E4F] font-bold font-mono mt-0.5">
                        Áp dụng đơn từ: {proposeMinOrder.toLocaleString('vi-VN')} ₫
                      </div>
                    )}
                    <div className="flex gap-1.5 mt-1 flex-wrap">
                      {[0, 100000, 150000, 200000, 300000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setProposeMinOrder(amt)}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                            proposeMinOrder === amt
                              ? 'bg-[#B88E4F] text-white'
                              : 'bg-[#FAF8F5] border border-[#EAE4D7] text-[#7D715E] hover:bg-white'
                          }`}
                        >
                          {amt === 0 ? 'Không giới hạn' : `${(amt / 1000).toLocaleString('vi-VN')}K`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Phạm vi & Thời hạn */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                        Phạm vi áp dụng
                      </label>
                      <select
                        value={proposeScopeType}
                        onChange={(e) => setProposeScopeType(e.target.value as CouponScope)}
                        className="w-full px-2.5 py-2 text-xs font-semibold bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl focus:border-[#C59B58] focus:bg-white outline-none"
                      >
                        <option value="STORE_WIDE">Toàn bộ gian hàng</option>
                        <option value="PRODUCTS">Sản phẩm review chỉ định</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                        Thời hạn hiệu lực
                      </label>
                      <select
                        value={proposeValidityDays}
                        onChange={(e) => setProposeValidityDays(Number(e.target.value))}
                        className="w-full px-2.5 py-2 text-xs font-semibold bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl focus:border-[#C59B58] focus:bg-white outline-none"
                      >
                        <option value={14}>14 ngày (Đợt review)</option>
                        <option value={30}>30 ngày (Tháng này)</option>
                        <option value={60}>60 ngày (Dài hạn)</option>
                        <option value={0}>Vô thời hạn</option>
                      </select>
                    </div>
                  </div>

                  {/* Cam kết review */}
                  <div>
                    <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                      Kế hoạch đẩy số / Mục đích sử dụng
                    </label>
                    <textarea
                      rows={2}
                      value={proposeNote}
                      onChange={(e) => setProposeNote(e.target.value)}
                      placeholder="VD: Em chuẩn bị lên video review trên TikTok và ghim mã trong giỏ hàng..."
                      className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl focus:border-[#C59B58] focus:bg-white outline-none resize-none"
                    />
                  </div>
                </div>

                {/* 3. LIVE INTERACTIVE VOUCHER PREVIEW (Vé Ưu Đãi Trực Quan Thời Gian Thực) */}
                <div className="pt-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#7D715E] mb-1.5">
                    <span className="flex items-center gap-1 text-[#B88E4F]">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Xem trước hiển thị trên App khách hàng</span>
                    </span>
                    <span>Bản mẫu ưu đãi</span>
                  </div>

                  <div className="relative rounded-2xl border border-[#EEDFC6] bg-gradient-to-r from-[#FBF5EB] via-[#FAF8F5] to-[#FBF5EB] p-3.5 shadow-2xs overflow-hidden">
                    {/* Đường rãnh vé khuyết 2 bên */}
                    <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border border-[#EEDFC6]" />
                    <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border border-[#EEDFC6]" />

                    <div className="flex items-center justify-between gap-3 pl-2 pr-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-[#B88E4F] uppercase tracking-wider">
                          <Ticket className="w-3.5 h-3.5" />
                          <span>Voucher Độc Quyền KOL</span>
                        </div>
                        <div className="mt-1 text-base sm:text-lg font-black tracking-widest text-[#1A1612] truncate font-sans">
                          {trimmedCode || 'THANGVIP10'}
                        </div>
                        <div className="text-[11px] text-[#7D715E] mt-0.5 truncate">
                          Áp dụng tại: <strong>{selectedStore?.name || selectedStore?.storeName || 'Gian hàng đối tác'}</strong>
                        </div>
                        <div className="text-[10px] text-[#B88E4F] font-semibold mt-0.5">
                          {proposeDiscountType === 'PERCENTAGE'
                            ? `Giảm ${proposeDesiredPercent}%${proposeMaxDiscount ? ` (Tối đa ${(proposeMaxDiscount / 1000).toLocaleString('vi-VN')}K)` : ''}`
                            : `Giảm ${(proposeFixedAmount / 1000).toLocaleString('vi-VN')}K₫`}
                          {proposeMinOrder > 0 ? ` · Đơn từ ${(proposeMinOrder / 1000).toLocaleString('vi-VN')}K` : ''}
                        </div>
                      </div>

                      <div className="shrink-0 text-right border-l border-dashed border-[#EEDFC6] pl-3 py-1">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-white border border-[#EEDFC6] text-[10px] font-bold text-[#B88E4F]">
                          Chờ duyệt
                        </span>
                        <div className="text-[10px] text-[#7D715E] mt-1">
                          {proposeValidityDays > 0 ? `${proposeValidityDays} ngày` : 'Dài hạn'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Kiểm tra điều kiện mã trực quan (Real-time Checklist) */}
                <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                  <div className={`flex items-center gap-1.5 ${isLengthValid ? 'text-emerald-700 font-medium' : 'text-[#7D715E]'}`}>
                    <span>{isLengthValid ? '✓' : '•'}</span>
                    <span>Từ 4 đến 20 ký tự</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${isAlphanumeric && proposeCode ? 'text-emerald-700 font-medium' : 'text-[#7D715E]'}`}>
                    <span>{isAlphanumeric && proposeCode ? '✓' : '•'}</span>
                    <span>Chỉ dùng chữ cái & số</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasLetter ? 'text-emerald-700 font-medium' : 'text-[#7D715E]'}`}>
                    <span>{hasLetter ? '✓' : '•'}</span>
                    <span>Có ít nhất 1 chữ cái</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${!isBanned && proposeCode ? 'text-emerald-700 font-medium' : 'text-[#7D715E]'}`}>
                    <span>{!isBanned && proposeCode ? '✓' : '•'}</span>
                    <span>Không chứa từ khóa cấm</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7] text-[11px] text-[#7D715E]">
                  <Clock className="w-4 h-4 text-[#B88E4F] shrink-0" />
                  <span>Sau khi gửi, Chủ Shop sẽ thiết lập hạn mức giảm (10% - 20%) và ngân sách kích hoạt mã.</span>
                </div>
              </div>

              <div className="pt-4 mt-2 border-t border-[#EAE4D7] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#7D715E] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={!isCodeValid || modalLoading || approvedStores.length === 0 || !selectedStoreId}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#C59B58] hover:bg-[#B88E4F] disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-all cursor-pointer active:scale-95"
                >
                  {modalLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang gửi đề xuất...</span>
                    </>
                  ) : (
                    <span>Gửi đề xuất mã</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-2xl border border-[#EAE4D7] shadow-2xl overflow-hidden p-6 my-auto animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-[#1A1612] mb-1">
              Xác nhận xóa mã giảm giá
            </h3>
            <p className="text-xs text-[#7D715E] mb-4">
              Mã coupon <strong>{deleteTarget.displayCode}</strong> sẽ được xóa
              mềm. Dữ liệu đơn hàng cũ vẫn được bảo lưu, nhưng mã này sẽ không
              thể dùng cho đơn mới.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-[#1A1612] mb-1.5">
                Lý do xóa (tùy chọn)
              </label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Nhập lý do xóa mã giảm giá này..."
                rows={2}
                className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl focus:outline-none focus:border-[#C59B58]"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#7D715E] hover:bg-stone-100 cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {deleteLoading ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}


      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-5 right-5 z-[99999] flex items-start gap-3.5 max-w-sm sm:max-w-md p-4 bg-white/95 backdrop-blur-md rounded-2xl border border-[#EAE4D7] shadow-2xl shadow-amber-900/15 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto"
        >
          <div className="w-9 h-9 rounded-xl bg-[#FBF5EB] border border-[#EAE4D7] flex items-center justify-center shrink-0 mt-0.5 text-[#B88E4F]">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-red-600" />
            ) : (
              <Sparkles className="w-5 h-5 text-[#B88E4F]" />
            )}
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <h4 className="text-xs font-bold text-[#1A1612] uppercase tracking-wider">
                {toast.title}
              </h4>
            </div>
            <p className="text-xs text-[#7D715E] leading-relaxed break-words">
              {toast.message}
            </p>
          </div>

          <button
            onClick={() => setToast(null)}
            className="text-[#7D715E] hover:text-[#1A1612] p-1 rounded-lg hover:bg-[#F3EFE6] transition-colors cursor-pointer shrink-0 -mr-1 -mt-1"
            title="Đóng thông báo"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default KolCouponsPage;
