import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Radar,
  Search,
  Filter,
  Award,
  Send,
  BarChart3,
  X,
  ShoppingBag,
  ChevronDown,
  MessageSquare,
  Info,
  Crown,
  RotateCcw,
  TrendingUp,
  MousePointerClick,
  ShoppingBasket,
  SlidersHorizontal,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  aiRecommendationService,
  type KolMatchResult,
  type TargetProductSummary,
} from '../../services/ai-recommendation.service';
import api from '../../services/api';
import { Select } from '../../components/ui/Select';
import { AiRadarChart } from '../../components/ai/AiRadarChart';
import { KolComparisonModal, KolComparisonDock } from '../../components/ai/KolComparisonPanel';

const CATEGORIES = [
  'Tất cả danh mục',
  'Thời trang & Phụ kiện',
  'Mỹ phẩm & Làm đẹp',
  'Đồ gia dụng & Đời sống',
  'Công nghệ & Thiết bị số',
  'Ăn vặt & Ẩm thực',
  'Sách & Văn phòng phẩm',
  'Mẹ & Bé',
  'Thể thao & Dã ngoại',
];

const PRICE_RANGES = [
  { label: 'Tất cả khoảng giá', value: 'ALL' },
  { label: 'Dưới 200.000đ', value: 'UNDER_200K' },
  { label: '200.000đ - 500.000đ', value: 'FROM_200K_TO_500K' },
  { label: '500.000đ - 1.000.000đ', value: 'FROM_500K_TO_1M' },
  { label: 'Trên 1.000.000đ', value: 'OVER_1M' },
];

const TIERS = [
  { label: 'Tất cả cấp bậc', value: '' },
  { label: 'Đồng (Bronze) trở lên', value: 'BRONZE' },
  { label: 'Bạc (Silver) trở lên', value: 'SILVER' },
  { label: 'Vàng (Gold) trở lên', value: 'GOLD' },
  { label: 'Bạch Kim (Platinum) trở lên', value: 'PLATINUM' },
  { label: 'Kim Cương (Diamond)', value: 'DIAMOND' },
];

function matchingPreferencesKey() {
  return `scanms-kol-matching:v3:${window.location.pathname}:${localStorage.getItem('current_store_id') || 'platform'}`;
}

function readMatchingPreferences(): { productId?: string; autoScan?: boolean } {
  try {
    return JSON.parse(sessionStorage.getItem(matchingPreferencesKey()) || '{}') || {};
  } catch {
    return {};
  }
}

export default function KolRecommendationPage({ onReturn: _onReturn }: { onReturn?: () => void } = {}) {
  const [products, setProducts] = useState<any[]>([]);
  const [searchParams] = useSearchParams();
  const urlProductId = searchParams.get('productId');
  const [selectedProductId, setSelectedProductId] = useState<string>(
    () => urlProductId || readMatchingPreferences().productId || '',
  );
  const [targetProduct, setTargetProduct] = useState<TargetProductSummary | null>(null);
  const [kols, setKols] = useState<KolMatchResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [analyzingKol, setAnalyzingKol] = useState<KolMatchResult | null>(null);

  const [productsReady, setProductsReady] = useState(false);
  const [autoScan, setAutoScan] = useState(() => readMatchingPreferences().autoScan === true);
  const [calculatedAt, setCalculatedAt] = useState('');
  const [scanError, setScanError] = useState('');
  const scanVersion = useRef(0);
  const scanBusy = useRef(false);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả danh mục');
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('ALL');
  const [selectedMinTier, setSelectedMinTier] = useState<string>('');
  const [minConversionRate, setMinConversionRate] = useState<number>(0);
  const [limit, setLimit] = useState<number>(6);
  const [totalScanned, setTotalScanned] = useState(0);
  const invitationLock = useRef(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedEvidence, setExpandedEvidence] = useState<Record<string, boolean>>({});

  // Comparison State
  const [compareKolIds, setCompareKolIds] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // VIP Invitation Modal State
  const [invitingKol, setInvitingKol] = useState<KolMatchResult | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string>('');
  const [isSendingInvite, setIsSendingInvite] = useState<boolean>(false);
  const [inviteCommissionRate, setInviteCommissionRate] = useState<number>(14);
  const [inviteIncludeSample, setInviteIncludeSample] = useState<boolean>(true);

  useEffect(() => {
    if (!productsReady) return;
    try {
      sessionStorage.setItem(
        matchingPreferencesKey(),
        JSON.stringify({ productId: selectedProductId, autoScan }),
      );
    } catch {
      /* ignore storage errors */
    }
  }, [productsReady, selectedProductId, autoScan]);

  useEffect(() => {
    if (!invitingKol && !analyzingKol && !isCompareModalOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || isSendingInvite) return;
      setInvitingKol(null);
      setAnalyzingKol(null);
      setIsCompareModalOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [invitingKol, analyzingKol, isCompareModalOpen, isSendingInvite]);

  // 1. Fetch Merchant Products to populate dropdown
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res: any = await api.get('/products', { params: { limit: 100 } });
        const body = res?.data?.data || res?.data || res;
        const list = (Array.isArray(body) ? body : body?.items || []).filter(
          (p: any) => p.moderationStatus === 'APPROVED' && p.isActive !== false && !p.isDeleted,
        );
        if (Array.isArray(list) && list.length > 0) {
          setProducts(list);
          setSelectedProductId((prev) => {
            const chosen = urlProductId || prev;
            return list.some((product: any) => product.id === chosen) ? chosen : list[0]?.id || '';
          });
        } else {
          setSelectedProductId('');
        }
      } catch {
        toast.error('Không tải được sản phẩm của shop. Bạn vẫn có thể quét hồ sơ KOL chung.');
      } finally {
        setProductsReady(true);
      }
    };
    fetchProducts();
  }, [urlProductId]);

  // 2. Fetch recommendations whenever product or filters change
  const fetchRecommendations = useCallback(async () => {
    const version = ++scanVersion.current;
    scanBusy.current = true;
    setScanError('');
    setLoading(true);
    try {
      const params: any = { limit };
      if (selectedCategory && selectedCategory !== 'Tất cả danh mục') {
        params.category = selectedCategory;
      }
      if (selectedPriceRange && selectedPriceRange !== 'ALL') {
        params.priceRange = selectedPriceRange;
      }
      if (selectedMinTier) {
        params.minTier = selectedMinTier;
      }
      if (minConversionRate > 0) {
        params.minConversionRate = minConversionRate;
      }

      let res;
      if (selectedProductId) {
        res = await aiRecommendationService.getRecommendationsForProduct(selectedProductId, params);
      } else {
        res = await aiRecommendationService.getGeneralRecommendations(params);
      }

      if (version !== scanVersion.current) return;
      if (selectedProductId && res.targetProduct?.productId !== selectedProductId) {
        throw new Error('Kết quả chưa đúng sản phẩm đang chọn. Vui lòng quét lại.');
      }
      setCalculatedAt(res.calculatedAt || '');
      setTotalScanned(res.totalKolsScanned || 0);
      setKols(res.recommendedKols || []);
      setTargetProduct(res.targetProduct || null);
    } catch (err: any) {
      if (version !== scanVersion.current) return;
      setKols([]);
      setTargetProduct(null);
      setScanError(err.message || 'Không kết nối được máy chủ để quét KOL.');
    } finally {
      if (version === scanVersion.current) {
        scanBusy.current = false;
        setLoading(false);
      }
    }
  }, [selectedProductId, selectedCategory, selectedPriceRange, selectedMinTier, minConversionRate, limit]);

  const latestRecommendationScan = useRef(fetchRecommendations);

  useEffect(() => {
    if (!productsReady) return;
    setLoading(true);
    setScanError('');
    setTargetProduct(null);
    setAnalyzingKol(null);
    setInvitingKol(null);
    const debounce = setTimeout(() => {
      void fetchRecommendations();
    }, 300);
    return () => {
      clearTimeout(debounce);
      scanVersion.current += 1;
      scanBusy.current = false;
    };
  }, [productsReady, fetchRecommendations]);

  useEffect(() => {
    latestRecommendationScan.current = fetchRecommendations;
  }, [fetchRecommendations]);

  useEffect(() => {
    if (!productsReady || !autoScan) return;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible' && !scanBusy.current) {
        void latestRecommendationScan.current();
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [productsReady, autoScan]);

  // Filtered KOLs by search
  const displayedKols = useMemo(() => {
    if (!searchQuery.trim()) return kols;
    const q = searchQuery.toLowerCase();
    return kols.filter(
      (k) =>
        k.fullName.toLowerCase().includes(q) ||
        k.bio?.toLowerCase().includes(q) ||
        k.tierName.toLowerCase().includes(q) ||
        k.lifetimeStats?.primaryCategory?.toLowerCase().includes(q),
    );
  }, [kols, searchQuery]);

  const selectedProduct = products.find((product) => String(product.id) === selectedProductId);

  // Compare handlers
  const toggleCompareKol = (kolId: string) => {
    setCompareKolIds((prev) => {
      if (prev.includes(kolId)) {
        return prev.filter((id) => id !== kolId);
      }
      if (prev.length >= 3) {
        toast.info('Bạn chỉ có thể so sánh tối đa 3 KOC cùng lúc.');
        return prev;
      }
      return [...prev, kolId];
    });
  };

  const selectedCompareKols = useMemo(() => {
    return compareKolIds
      .map((id) => kols.find((k) => k.collaboratorId === id))
      .filter((k): k is KolMatchResult => !!k);
  }, [kols, compareKolIds]);

  const handleNegotiateDeal = (kol: KolMatchResult) => {
    window.location.href = `/merchant/kol-hub?kol=${kol.collaboratorId}&tab=messages`;
  };

  // Handle VIP Invitation Submission
  const handleSendVipInvite = async () => {
    if (!invitingKol || invitationLock.current) return;
    invitationLock.current = true;
    setIsSendingInvite(true);
    try {
      const result: any = await api.post('/store-collaborators/invite', {
        email: invitingKol.email,
        note: `🎯 Đề xuất Deal VIP ${inviteCommissionRate}% cho [${selectedProduct?.title || 'Sản phẩm'}]${inviteIncludeSample ? ' | Kèm mẫu thử 0đ (SLA 14 ngày)' : ''}. ${inviteMessage.trim()}`.trim(),
      });
      const body = result?.data || result;
      if (!body?.invitation?.id) throw new Error('Máy chủ chưa xác nhận lời mời.');
      toast.success(`Đã gửi gói đề xuất hợp tác ${inviteCommissionRate}% cho ${invitingKol.fullName}!`);
      setInviteMessage('');
      setInvitingKol(null);
    } catch (err: any) {
      toast.error('Gửi lời mời thất bại: ' + (err.message || 'Lỗi'));
    } finally {
      invitationLock.current = false;
      setIsSendingInvite(false);
    }
  };

  const getTierBadge = (tierName: string) => {
    const tier = (tierName || '').toUpperCase();
    const label =
      tier.includes('DIAMOND') || tier.includes('KIM CƯƠNG')
        ? 'Kim cương'
        : tier.includes('PLATINUM') || tier.includes('BẠCH KIM')
          ? 'Bạch kim'
          : tier.includes('GOLD') || tier.includes('VÀNG')
            ? 'Vàng'
            : tier.includes('SILVER') || tier.includes('BẠC')
              ? 'Bạc'
              : tier.includes('BRONZE') || tier.includes('ĐỒNG')
                ? 'Đồng'
                : 'Chưa xếp hạng';
    return (
      <span className="inline-flex rounded-full border border-[#EEDFC6] bg-[#FBF5EB] px-2.5 py-0.5 text-[11px] font-bold text-[#8C6226]">
        {label}
      </span>
    );
  };

  const getRankBadge = (idx: number) => {
    if (idx === 0) {
      return (
        <div className="flex items-center gap-1.5 rounded-full border border-[#EEDFC6] bg-[#FBF5EB] px-3 py-1 text-xs font-bold text-[#8C6226] shadow-2xs">
          <Crown size={14} className="text-[#B88E4F]" />
          <span>Top 1 Đề xuất</span>
        </div>
      );
    }
    if (idx === 1) {
      return (
        <div className="flex items-center gap-1.5 rounded-full border border-[#CBD5E1] bg-[#F1F5F9] px-3 py-1 text-xs font-bold text-[#475569] shadow-2xs">
          <Award size={14} className="text-[#64748B]" />
          <span>Top 2 Phù hợp</span>
        </div>
      );
    }
    if (idx === 2) {
      return (
        <div className="flex items-center gap-1.5 rounded-full border border-[#FDE68A] bg-[#FEF3C7] px-3 py-1 text-xs font-bold text-[#92400E] shadow-2xs">
          <Award size={14} className="text-[#B45309]" />
          <span>Top 3 Tiềm năng</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 rounded-full border border-[#EAE4D7] bg-[#FAF8F5] px-2.5 py-1 text-xs font-bold text-[#7D715E]">
        <span>Hạng #{idx + 1}</span>
      </div>
    );
  };

  const getMatchScorePill = (score: number) => {
    if (score >= 85) {
      return (
        <span className="rounded-full border border-[#EEDFC6] bg-[#FBF5EB] px-2.5 py-0.5 text-[10px] font-bold text-[#8C6226]">
          Khớp rất cao
        </span>
      );
    }
    if (score >= 70) {
      return (
        <span className="rounded-full border border-[#EAE4D7] bg-[#FAF8F5] px-2.5 py-0.5 text-[10px] font-bold text-[#7D715E]">
          Khớp cao
        </span>
      );
    }
    return (
      <span className="rounded-full border border-[#EAE4D7] bg-[#FAF8F5] px-2.5 py-0.5 text-[10px] font-semibold text-[#7D715E]">
        Tiềm năng
      </span>
    );
  };

  const hasActiveFilters =
    selectedCategory !== 'Tất cả danh mục' ||
    selectedPriceRange !== 'ALL' ||
    Boolean(selectedMinTier) ||
    minConversionRate > 0;

  return (
    <div className="kol-recommendation-page space-y-5">
      {/* 1. Header Toolbar */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#EAE4D7]/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center shadow-2xs shrink-0">
            <Radar className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-[#1A1612]">
              Đối Sánh KOC Tiếp Thị (AI Radar)
            </h2>
            <span className="rounded-full border border-[#EEDFC6] bg-[#FBF5EB] px-2 py-0.5 text-[10px] font-bold text-[#8C6226]">
              4 Trục Đánh Giá
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowInfoModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] text-xs font-bold text-[#8C6226] hover:bg-[#F3EFE6] transition cursor-pointer shadow-2xs"
            title="Xem chi tiết cơ chế đối sánh AI"
          >
            <Info size={13} className="text-[#B88E4F]" />
            <span>Cơ chế đối sánh AI</span>
          </button>
        </div>
      </div>

      {/* 2. Target Product Hero & Filter Command Center */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left: Product Selection Hero Card (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-[#EAE4D7] bg-white p-4.5 shadow-xs flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-bold text-[#1A1612] uppercase tracking-wider">
                <ShoppingBag className="w-4 h-4 text-[#B88E4F]" />
                <span>1. Chọn sản phẩm cần ghép đôi</span>
              </label>
              {calculatedAt && (
                <span className="text-[11px] text-[#7D715E]">
                  Cập nhật: {new Date(calculatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>

            <Select
              aria-label="Sản phẩm đối sánh"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full text-xs font-medium"
            >
              <option value="">{productsReady ? 'Quét hồ sơ KOC toàn sàn' : 'Đang tải danh sách…'}</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title || p.name} — {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p.price || 0)}
                </option>
              ))}
            </Select>
          </div>

          {/* Active Product Preview Banner */}
          {(targetProduct || selectedProduct) ? (
            <div className="flex items-center gap-3 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] p-3">
              <div className="w-12 h-12 shrink-0 rounded-xl border border-[#EAE4D7] bg-white overflow-hidden shadow-2xs flex items-center justify-center">
                {targetProduct?.imageUrl || selectedProduct?.imageUrl ? (
                  <img
                    src={targetProduct?.imageUrl || selectedProduct?.imageUrl}
                    alt={targetProduct?.title || selectedProduct?.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ShoppingBag className="w-5 h-5 text-[#B88E4F]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-[#1A1612] truncate">
                  {targetProduct?.title || selectedProduct?.title || selectedProduct?.name}
                </h4>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-[#7D715E]">
                  <span>
                    Giá bán:{' '}
                    <strong className="text-[#1A1612]">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                        targetProduct?.price ?? selectedProduct?.price ?? 0,
                      )}
                    </strong>
                  </span>
                  <span>
                    Hoa hồng cơ sở:{' '}
                    <strong className="text-[#8C6226]">
                      {targetProduct?.commissionRate ?? selectedProduct?.commissionRate ?? 10}%
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#EAE4D7] bg-[#FAF8F5] p-3 text-center text-xs text-[#7D715E]">
              Đang quét tự do toàn bộ hệ thống KOC (chưa khóa theo sản phẩm cụ thể).
            </div>
          )}
        </div>

        {/* Right: Smart Filter Controls (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-[#EAE4D7] bg-white p-4.5 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#B88E4F]" />
              <span className="text-xs font-bold text-[#1A1612] uppercase tracking-wider">
                2. Bộ lọc thuật toán Radar
              </span>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[#1A1612]">
                <input
                  type="checkbox"
                  checked={autoScan}
                  onChange={(e) => setAutoScan(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-[#EAE4D7] text-[#C59B58] focus:ring-[#C59B58]"
                />
                <span>Tự động quét (60s)</span>
              </label>

              <button
                type="button"
                onClick={() => void fetchRecommendations()}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] text-xs font-bold text-[#8C6226] hover:bg-[#F3EFE6] transition cursor-pointer disabled:opacity-50"
              >
                <RotateCcw size={13} className={loading ? 'animate-spin' : ''} />
                <span>Quét lại</span>
              </button>
            </div>
          </div>

          {/* Search bar and quick filters */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="sm:col-span-6 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7D715E]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm KOC theo tên, bio, danh mục..."
                className="w-full h-9 rounded-xl border border-[#EAE4D7] bg-white pl-9 pr-3 text-xs text-[#1A1612] placeholder:text-[#A89D8B] focus:border-[#C59B58] focus:outline-none focus:ring-2 focus:ring-[#C59B58]/15"
              />
            </div>

            <div className="sm:col-span-3">
              <Select
                aria-label="Cấp bậc KOC"
                value={selectedMinTier}
                onChange={(e) => setSelectedMinTier(e.target.value)}
                className="w-full text-xs h-9"
              >
                {TIERS.map((tier) => (
                  <option key={tier.value} value={tier.value}>
                    {tier.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="sm:col-span-3">
              <button
                type="button"
                onClick={() => setFiltersOpen(!filtersOpen)}
                className={`w-full h-9 inline-flex items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                  hasActiveFilters || filtersOpen
                    ? 'border-[#EEDFC6] bg-[#FBF5EB] text-[#8C6226]'
                    : 'border-[#EAE4D7] bg-white text-[#7D715E] hover:bg-[#FAF8F5]'
                }`}
              >
                <Filter size={13} />
                <span>Bộ lọc nâng cao {hasActiveFilters ? '•' : ''}</span>
              </button>
            </div>
          </div>

          {/* Expandable Advanced Filter Drawer */}
          {filtersOpen && (
            <div className="pt-3 border-t border-[#EAE4D7] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-150">
              <div>
                <label className="block text-[11px] font-semibold text-[#7D715E] mb-1">Ngành hàng KOC</label>
                <Select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full text-xs"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#7D715E] mb-1">Khoảng giá phù hợp</label>
                <Select
                  value={selectedPriceRange}
                  onChange={(e) => setSelectedPriceRange(e.target.value)}
                  className="w-full text-xs"
                >
                  {PRICE_RANGES.map((pr) => (
                    <option key={pr.value} value={pr.value}>
                      {pr.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#7D715E] mb-1">Số lượng gợi ý</label>
                <Select
                  value={String(limit)}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="w-full text-xs"
                >
                  <option value="3">Top 3 KOC</option>
                  <option value="6">Top 6 KOC</option>
                  <option value="12">Top 12 KOC</option>
                  <option value="24">Mở rộng 24 KOC</option>
                </Select>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#7D715E] mb-1">
                  <span>CR tối thiểu</span>
                  <span className="font-bold text-[#B88E4F]">{minConversionRate}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  step="0.5"
                  value={minConversionRate}
                  onChange={(e) => setMinConversionRate(parseFloat(e.target.value))}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#EAE4D7] accent-[#C59B58] mt-2"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Error Alert */}
      {scanError && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50/50 p-4 text-xs text-[#DC2626]">
          <span>{scanError}</span>
          <button
            type="button"
            onClick={() => void fetchRecommendations()}
            className="font-bold underline text-[#B88E4F]"
          >
            Thử quét lại
          </button>
        </div>
      )}

      {/* 4. Results Grid: State-of-the-art Matchmaker Cards */}
      <div className="kol-results-container">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="animate-pulse rounded-2xl border border-[#EAE4D7] bg-white p-5 space-y-4 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <div className="h-6 w-24 bg-[#F3EFE6] rounded-full" />
                  <div className="h-4 w-12 bg-[#F3EFE6] rounded-md" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#F3EFE6] rounded-2xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-[#F3EFE6] rounded" />
                    <div className="h-3 w-20 bg-[#F3EFE6] rounded" />
                  </div>
                </div>
                <div className="h-36 bg-[#FAF8F5] rounded-xl" />
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-10 bg-[#FAF8F5] rounded-xl" />
                  <div className="h-10 bg-[#FAF8F5] rounded-xl" />
                  <div className="h-10 bg-[#FAF8F5] rounded-xl" />
                </div>
                <div className="h-9 bg-[#F3EFE6] rounded-xl" />
              </div>
            ))}
          </div>
        ) : displayedKols.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#EAE4D7] bg-white p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#1A1612]">Không tìm thấy KOC phù hợp tiêu chí</h3>
            <p className="text-xs text-[#7D715E] max-w-md mx-auto leading-relaxed">
              Thử nới lỏng điều kiện lọc cấp bậc, khoảng giá hoặc đặt lại tỷ lệ chuyển đổi tối thiểu về 0%.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('Tất cả danh mục');
                setSelectedPriceRange('ALL');
                setSelectedMinTier('');
                setMinConversionRate(0);
                setSearchQuery('');
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C59B58] text-[#1A1612] font-bold text-xs hover:bg-[#B88E4F] transition shadow-xs cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Đặt lại bộ lọc</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4.5">
            {displayedKols.map((kol, idx) => {
              const isComparing = compareKolIds.includes(kol.collaboratorId);
              const isExpanded = Boolean(expandedEvidence[kol.collaboratorId]);

              return (
                <div
                  key={kol.collaboratorId || idx}
                  className={`relative overflow-hidden rounded-3xl border transition-all duration-200 bg-white p-5 flex flex-col justify-between shadow-xs hover:shadow-md min-h-[530px] ${
                    isComparing
                      ? 'border-[#C59B58] ring-2 ring-[#C59B58]/20 bg-[#FBF5EB]/10'
                      : 'border-[#EAE4D7] hover:border-[#C59B58]/60'
                  }`}
                >
                  {/* Top Bar: Rank Medal + Compare Checkbox */}
                  <div className="flex items-center justify-between gap-2">
                    {getRankBadge(idx)}

                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-[#7D715E] hover:text-[#1A1612] select-none">
                      <input
                        type="checkbox"
                        checked={isComparing}
                        onChange={() => toggleCompareKol(kol.collaboratorId)}
                        className="w-4 h-4 rounded border-[#EAE4D7] text-[#C59B58] focus:ring-[#C59B58] cursor-pointer"
                      />
                      <span>So sánh</span>
                    </label>
                  </div>

                  {/* Creator Identity Header */}
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      {kol.avatarUrl ? (
                        <img
                          src={kol.avatarUrl}
                          alt={kol.fullName}
                          className="w-12 h-12 rounded-2xl object-cover border border-[#EAE4D7] shadow-2xs"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] font-bold text-base flex items-center justify-center">
                          {kol.fullName.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm text-[#1A1612] truncate" title={kol.fullName}>
                        {kol.fullName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {getTierBadge(kol.tierName)}
                        <span
                          className="rounded-md border border-[#EAE4D7] bg-[#FAF8F5] px-2 py-0.5 text-[10px] font-semibold text-[#7D715E] truncate max-w-[150px]"
                          title={kol.matchedCategory || kol.lifetimeStats?.primaryCategory}
                        >
                          {kol.matchedCategory || kol.lifetimeStats?.primaryCategory || 'Chung'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 4-Axis AI Radar & Score Block */}
                  <div className="rounded-2xl border border-[#EAE4D7] bg-[#FAF8F5] p-4 flex items-center justify-between gap-2 my-2">
                    {/* Left: Overall Match Score */}
                    <div className="space-y-1.5 min-w-0">
                      <div className="text-[10px] uppercase tracking-wider font-bold text-[#7D715E]">
                        Độ phù hợp AI
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-[#8C6226] tabular-nums tracking-tight">
                          {kol.matchScore}
                        </span>
                        <span className="text-xs font-bold text-[#7D715E]">/100</span>
                      </div>
                      <div>{getMatchScorePill(kol.matchScore)}</div>
                      <div className="text-[10px] text-[#7D715E] font-medium pt-1">
                        {kol.categoryMatchSource === 'SALES' ? (
                          <span className="text-[#059669] font-bold">✓ Đã bán cùng ngành</span>
                        ) : kol.categoryMatchSource === 'PROFILE' ? (
                          <span className="text-[#B88E4F] font-bold">✓ Khớp hồ sơ & kênh</span>
                        ) : (
                          'Tiềm năng mở rộng'
                        )}
                      </div>
                    </div>

                    {/* Right: Embedded SVG Radar Chart */}
                    <div className="shrink-0 flex items-center justify-center">
                      <AiRadarChart scores={kol.scoreBreakdown} size={155} showLabels={true} />
                    </div>
                  </div>

                  {/* 3 Golden Metrics dl */}
                  <div className="grid grid-cols-3 gap-2.5 rounded-2xl bg-[#FAF8F5] p-3 text-center my-1.5 border border-[#EAE4D7]/40">
                    <div>
                      <div className="text-[10px] font-semibold text-[#7D715E] flex items-center justify-center gap-1">
                        <ShoppingBasket size={11} className="text-[#B88E4F]" />
                        <span>Đơn hàng</span>
                      </div>
                      <div className="mt-0.5 text-xs font-bold text-[#1A1612] tabular-nums">
                        {Number(kol.lifetimeStats?.totalOrders || 0).toLocaleString('vi-VN')}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-semibold text-[#7D715E] flex items-center justify-center gap-1">
                        <MousePointerClick size={11} className="text-[#B88E4F]" />
                        <span>Nhấp</span>
                      </div>
                      <div className="mt-0.5 text-xs font-bold text-[#1A1612] tabular-nums">
                        {Number(kol.lifetimeStats?.totalClicks || 0).toLocaleString('vi-VN')}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-semibold text-[#7D715E] flex items-center justify-center gap-1">
                        <TrendingUp size={11} className="text-[#059669]" />
                        <span>CR%</span>
                      </div>
                      <div className="mt-0.5 text-xs font-black text-[#059669] tabular-nums">
                        {kol.lifetimeStats?.conversionRate || 0}%
                      </div>
                    </div>
                  </div>

                  {/* Primary & Secondary Action CTAs */}
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleNegotiateDeal(kol)}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-[#1A1612] font-bold text-xs shadow-xs transition cursor-pointer"
                      title="Mở khung chat thỏa thuận deal độc quyền"
                    >
                      <MessageSquare size={14} />
                      <span>Thương lượng Deal VIP</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setInviteMessage('');
                          setInvitingKol(kol);
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-[#EAE4D7] bg-white hover:bg-[#FAF8F5] text-xs font-semibold text-[#7D715E] hover:text-[#1A1612] transition cursor-pointer shadow-2xs"
                      >
                        <Send size={13} className="text-[#B88E4F]" />
                        <span>Mời hợp tác</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedEvidence((prev) => ({
                            ...prev,
                            [kol.collaboratorId]: !prev[kol.collaboratorId],
                          }))
                        }
                        className="inline-flex items-center gap-1 py-2 px-3 rounded-xl border border-[#EAE4D7] bg-white hover:bg-[#FAF8F5] text-xs font-semibold text-[#7D715E] hover:text-[#1A1612] transition cursor-pointer shadow-2xs"
                      >
                        <span>Chi tiết</span>
                        <ChevronDown
                          size={13}
                          className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* In-Card Slide-Up Details Overlay (Slides up and covers card cleanly with full reasoning and no ugly scrollbar) */}
                  {isExpanded && (
                    <div className="absolute inset-0 z-20 bg-white p-4.5 rounded-3xl flex flex-col justify-between overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden animate-in slide-in-from-bottom-6 duration-200 border-2 border-[#C59B58] shadow-xl">
                      <div className="space-y-2.5">
                        {/* Overlay Header */}
                        <div className="flex items-center justify-between border-b border-[#EAE4D7] pb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center">
                              <BarChart3 size={14} />
                            </div>
                            <div>
                              <h4 className="font-bold text-xs text-[#1A1612]">Căn cứ & Đánh giá chi tiết</h4>
                              <span className="text-[10px] text-[#7D715E] block -mt-0.5 truncate max-w-[170px]">{kol.fullName}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setExpandedEvidence((prev) => ({ ...prev, [kol.collaboratorId]: false }))}
                            className="w-7 h-7 rounded-full border border-[#EAE4D7] bg-[#FAF8F5] text-[#7D715E] hover:text-[#1A1612] hover:bg-white flex items-center justify-center cursor-pointer transition"
                            title="Thu gọn chi tiết"
                          >
                            <X size={14} />
                          </button>
                        </div>

                        {/* AI Reasoning */}
                        <div className="rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] p-2.5 space-y-1">
                          <span className="font-bold text-[#1A1612] text-[10px] uppercase tracking-wider block">
                            Căn cứ thuật toán đề xuất:
                          </span>
                          <p className="text-[11px] text-[#7D715E] leading-relaxed">
                            {kol.aiReasoning || 'Phù hợp dựa trên lịch sử chốt đơn và hồ sơ eKYC.'}
                          </p>
                        </div>

                        {/* 4-Axis Scores Breakdown in 2x2 Grid */}
                        <div className="space-y-1.5 rounded-xl border border-[#EAE4D7] bg-white p-2.5">
                          <span className="font-bold text-[#1A1612] text-[10px] uppercase tracking-wider block">
                            Điểm 4 trục Radar:
                          </span>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                            <div>
                              <div className="flex justify-between text-[10px]">
                                <span className="text-[#7D715E]">1. Ngành (35%)</span>
                                <strong className="text-[#1A1612] tabular-nums">{kol.scoreBreakdown?.categoryScore || 0}</strong>
                              </div>
                              <div className="h-1 w-full bg-[#FAF8F5] rounded-full overflow-hidden mt-0.5 border border-[#EAE4D7]/50">
                                <div
                                  className="h-full bg-[#C59B58] rounded-full"
                                  style={{ width: `${kol.scoreBreakdown?.categoryScore || 0}%` }}
                                />
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between text-[10px]">
                                <span className="text-[#7D715E]">2. CR% (25%)</span>
                                <strong className="text-[#1A1612] tabular-nums">{kol.scoreBreakdown?.conversionRateScore || 0}</strong>
                              </div>
                              <div className="h-1 w-full bg-[#FAF8F5] rounded-full overflow-hidden mt-0.5 border border-[#EAE4D7]/50">
                                <div
                                  className="h-full bg-[#C59B58] rounded-full"
                                  style={{ width: `${kol.scoreBreakdown?.conversionRateScore || 0}%` }}
                                />
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between text-[10px]">
                                <span className="text-[#7D715E]">3. Giá (20%)</span>
                                <strong className="text-[#1A1612] tabular-nums">{kol.scoreBreakdown?.priceFitScore || 0}</strong>
                              </div>
                              <div className="h-1 w-full bg-[#FAF8F5] rounded-full overflow-hidden mt-0.5 border border-[#EAE4D7]/50">
                                <div
                                  className="h-full bg-[#C59B58] rounded-full"
                                  style={{ width: `${kol.scoreBreakdown?.priceFitScore || 0}%` }}
                                />
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between text-[10px]">
                                <span className="text-[#7D715E]">4. Cấp bậc (20%)</span>
                                <strong className="text-[#1A1612] tabular-nums">{kol.scoreBreakdown?.tierAndSocialScore || 0}</strong>
                              </div>
                              <div className="h-1 w-full bg-[#FAF8F5] rounded-full overflow-hidden mt-0.5 border border-[#EAE4D7]/50">
                                <div
                                  className="h-full bg-[#C59B58] rounded-full"
                                  style={{ width: `${kol.scoreBreakdown?.tierAndSocialScore || 0}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Social Channels List */}
                        {Boolean(kol.socialChannels?.length) && (
                          <div>
                            <span className="font-bold text-[#1A1612] text-[10px] uppercase tracking-wider block mb-1">
                              Kênh MXH đã xác thực:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {kol.socialChannels.map((channel, cIdx) => (
                                <span
                                  key={cIdx}
                                  className="inline-flex items-center gap-1 rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] px-2 py-0.5 text-[10px] text-[#7D715E]"
                                >
                                  <span className="font-bold text-[#1A1612]">{channel.platform}:</span>
                                  <strong>{Number(channel.followerCount || 0).toLocaleString('vi-VN')}</strong> followers
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Bottom Actions inside overlay */}
                      <div className="pt-2.5 border-t border-[#EAE4D7] flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setExpandedEvidence((prev) => ({ ...prev, [kol.collaboratorId]: false }));
                            handleNegotiateDeal(kol);
                          }}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-[#1A1612] font-bold text-xs shadow-xs transition cursor-pointer"
                        >
                          <MessageSquare size={13} />
                          <span>Thương lượng Deal VIP</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setExpandedEvidence((prev) => ({ ...prev, [kol.collaboratorId]: false }))}
                          className="inline-flex items-center justify-center py-2 px-3 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] hover:bg-white text-xs font-semibold text-[#7D715E] hover:text-[#1A1612] transition cursor-pointer"
                        >
                          <span>Đóng</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Floating Bottom Dock for KOC Comparison */}
      <KolComparisonDock
        selectedKols={selectedCompareKols}
        onOpenCompare={() => setIsCompareModalOpen(true)}
        onClear={() => setCompareKolIds([])}
      />

      {/* 6. Comparison Modal (Overlaid Multi-Radar & Matrix) */}
      <KolComparisonModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        selectedKols={selectedCompareKols}
        onNegotiateDeal={handleNegotiateDeal}
      />

      {/* 7. AI Mechanism Info Modal */}
      {showInfoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#231D15]/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setShowInfoModal(false)}
        >
          <div
            className="w-full max-w-lg bg-white border border-[#EAE4D7] rounded-3xl p-6 shadow-2xl text-left space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#EAE4D7] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center">
                  <Radar className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-[#1A1612]">Cơ chế Đối sánh Đa trục (AI Radar)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="w-8 h-8 rounded-full border border-[#EAE4D7] bg-white text-[#7D715E] hover:text-[#1A1612] flex items-center justify-center cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#7D715E] leading-relaxed">
              <div className="rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] p-3 space-y-2">
                <p>
                  <strong className="text-[#1A1612]">1. Trùng khớp ngành hàng (35%):</strong> Đánh giá mức độ liên quan
                  giữa danh mục sản phẩm của Shop với lịch sử đơn hàng hoàn tất và chuyên môn nội dung của KOC.
                </p>
                <p>
                  <strong className="text-[#1A1612]">2. Hiệu suất chuyển đổi CR% (25%):</strong> Dựa trên tỷ lệ chốt đơn
                  thực tế từ lượt click hợp lệ, có triệt tiêu click ảo (Anti-Fraud).
                </p>
                <p>
                  <strong className="text-[#1A1612]">3. Phân khúc giá sản phẩm (20%):</strong> So sánh giá bán với giá
                  trị đơn trung bình (AOV) mà KOC thường chốt thành công.
                </p>
                <p>
                  <strong className="text-[#1A1612]">4. Cấp bậc & Tương tác mạng xã hội (20%):</strong> Điểm uy tín từ cấp
                  bậc (Kim Cương, Vàng, Bạc, Đồng) và lượng người theo dõi thực tế đã eKYC.
                </p>
              </div>

              <div className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3 text-[11px] text-[#8C6226] space-y-1">
                <p>
                  <strong>✨ Cơ chế khởi đầu mới (Cold-Start):</strong> KOC mới tham gia chưa có đơn được đánh giá dựa trên
                  chuyên môn hồ sơ eKYC, phân ngành đăng ký và độ tương tác thực của kênh MXH.
                </p>
                <p className="text-[10.5px] text-[#7D715E]">
                  • Thuật toán quét và đối soát tự động trên <strong>{totalScanned || 16}</strong> hồ sơ KOC hoạt động toàn sàn.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="px-4 py-2 rounded-xl bg-[#231D15] text-white text-xs font-bold hover:bg-[#1A1612] transition cursor-pointer"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. VIP Invitation Modal */}
      {invitingKol && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#231D15]/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg space-y-4 rounded-3xl border border-[#EAE4D7] bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EAE4D7] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1A1612]">Gửi lời mời hợp tác KOC</h3>
                  <p className="text-xs text-[#7D715E]">Lời mời sẽ được gửi đến hòm thư thông báo của KOC</p>
                </div>
              </div>
              <button
                type="button"
                disabled={isSendingInvite}
                onClick={() => setInvitingKol(null)}
                className="w-8 h-8 rounded-full border border-[#EAE4D7] bg-white text-[#7D715E] hover:text-[#1A1612] flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center gap-3 rounded-2xl border border-[#EAE4D7] bg-[#FAF8F5] p-3">
                {invitingKol.avatarUrl ? (
                  <img
                    src={invitingKol.avatarUrl}
                    alt={invitingKol.fullName}
                    className="h-11 w-11 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FBF5EB] font-bold text-[#B88E4F]">
                    {invitingKol.fullName.charAt(0)}
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-[#1A1612]">{invitingKol.fullName}</h4>
                  <p className="text-[11px] text-[#7D715E]">{invitingKol.bio || 'Nhà sáng tạo tiềm năng'}</p>
                </div>
                <div className="ml-auto text-right">
                  <span className="font-bold text-[#8C6226]">{invitingKol.matchScore}/100 phù hợp</span>
                </div>
              </div>

                            {selectedProduct && (
                <div className="flex items-center gap-3 rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB]/60 p-2.5">
                  {selectedProduct.thumbnailUrl ? (
                    <img
                      src={selectedProduct.thumbnailUrl}
                      alt={selectedProduct.title}
                      className="h-10 w-10 shrink-0 rounded-xl object-cover border border-[#EAE4D7]"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-[#EAE4D7] text-xs font-bold text-[#B88E4F]">
                      SP
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-[#8C6226] uppercase tracking-wider block">Sản phẩm tiếp thị mục tiêu</span>
                    <h5 className="font-bold text-[#1A1612] truncate text-xs">{selectedProduct.title}</h5>
                    <span className="text-[11px] text-[#7D715E] font-medium">
                      {selectedProduct.price ? `${selectedProduct.price.toLocaleString('vi-VN')} ₫` : 'Giá liên hệ'}
                    </span>
                  </div>
                </div>
              )}

              {/* Commission Rate Tier Selector */}
              <div>
                <label className="mb-1.5 block font-semibold text-[#1A1612]">
                  Mức thù lao đề xuất cho sản phẩm này:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[10, 12, 14, 16].map((rate) => {
                    const isSelected = inviteCommissionRate === rate;
                    return (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => setInviteCommissionRate(rate)}
                        className={`py-2 px-2 rounded-xl text-xs font-bold transition cursor-pointer border flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-[#C59B58] text-[#1A1612] border-[#B88E4F] shadow-xs'
                            : 'bg-white text-[#7D715E] border-[#EAE4D7] hover:border-[#C59B58]'
                        }`}
                      >
                        <span className="text-sm">{rate}%</span>
                        <span className="text-[9px] font-normal opacity-85">
                          {rate === 10 ? 'Cơ bản' : rate === 16 ? 'Trần tối đa' : `+${rate - 10}%`}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10.5px] text-[#7D715E] mt-1">
                  * Nằm trong khung tự trị của Shop Manager (10% - 16%). Hợp đồng kích hoạt ngay khi KOC đồng ý.
                </p>
              </div>

              {/* Free Sample Seeding Toggle */}
              <label className="flex items-center gap-2.5 p-2.5 rounded-2xl border border-[#EAE4D7] bg-[#FAF8F5] cursor-pointer hover:border-[#C59B58] transition">
                <input
                  type="checkbox"
                  checked={inviteIncludeSample}
                  onChange={(e) => setInviteIncludeSample(e.target.checked)}
                  className="rounded text-[#C59B58] focus:ring-[#C59B58] w-4 h-4 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-[#1A1612] block">Tài trợ Sản phẩm mẫu 0đ (Giao GHN)</span>
                  <span className="text-[10.5px] text-[#7D715E]">KOC cam kết trải nghiệm và đăng video review trong thời hạn 14 ngày SLA.</span>
                </div>
              </label>

              <div>
                <label className="mb-1 block font-semibold text-[#1A1612]">Thông điệp cá nhân hóa gửi KOC:</label>
                <textarea
                  rows={3}
                  maxLength={255}
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder={`Chào ${invitingKol.fullName}, shop rất ấn tượng với phong cách nội dung của bạn và muốn gửi lời mời hợp tác tiếp thị cho sản phẩm…`}
                  className="w-full rounded-2xl border border-[#EAE4D7] p-3 text-xs text-[#1A1612] placeholder:text-[#A89D8B] focus:border-[#C59B58] focus:outline-none focus:ring-2 focus:ring-[#C59B58]/15"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[#EAE4D7] pt-3">
              <button
                type="button"
                disabled={isSendingInvite}
                onClick={() => setInvitingKol(null)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-[#7D715E] hover:bg-[#FAF8F5] cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSendVipInvite}
                disabled={isSendingInvite}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#C59B58] px-4 py-2 text-xs font-bold text-[#1A1612] hover:bg-[#B88E4F] transition disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isSendingInvite ? 'Đang gửi...' : 'Gửi lời mời'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Detailed 1-on-1 Analysis Modal */}
      {analyzingKol && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#231D15]/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-3xl border border-[#EAE4D7] bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EAE4D7] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1A1612]">Báo cáo Đối Sánh 1-1 Chuyên Sâu</h3>
                  <p className="text-xs text-[#7D715E]">Mức độ phù hợp giữa sản phẩm và nhà sáng tạo {analyzingKol.fullName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAnalyzingKol(null)}
                className="w-8 h-8 rounded-full border border-[#EAE4D7] bg-white text-[#7D715E] hover:text-[#1A1612] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Radar chart in 1-1 modal */}
            <div className="rounded-2xl border border-[#EAE4D7] bg-[#FAF8F5] p-4 flex flex-col items-center">
              <span className="text-xs font-bold text-[#8C6226] uppercase tracking-wider mb-2">
                Đa giác năng lực KOC (Radar 4 Trục)
              </span>
              <AiRadarChart scores={analyzingKol.scoreBreakdown} size={200} showLabels={true} />
            </div>

            {/* Comparison Cards Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#FBF5EB] p-4 border border-[#EEDFC6] space-y-1.5">
                <span className="text-[10px] font-bold text-[#B88E4F] uppercase tracking-wider">
                  Sản Phẩm Mục Tiêu
                </span>
                <h4 className="text-xs font-bold text-[#1A1612] truncate">
                  {targetProduct?.title || selectedProduct?.title || 'Sản phẩm đang chọn'}
                </h4>
                <div className="space-y-0.5 text-[11px] text-[#7D715E]">
                  <div>Ngành hàng: <strong className="text-[#1A1612]">{targetProduct?.category || selectedProduct?.categoryName}</strong></div>
                  <div>
                    Giá bán:{' '}
                    <strong className="text-[#1A1612]">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                        targetProduct?.price || selectedProduct?.price || 0,
                      )}
                    </strong>
                  </div>
                  <div>Hoa hồng: <strong className="text-[#8C6226]">{targetProduct?.commissionRate || 10}%</strong></div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#EAE4D7] bg-[#FAF8F5] p-4 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C6226]">
                  Hồ sơ nhà sáng tạo
                </span>
                <h4 className="text-xs font-bold text-[#1A1612] truncate">{analyzingKol.fullName}</h4>
                <div className="space-y-0.5 text-[11px] text-[#7D715E]">
                  <div>Cấp bậc: <strong className="text-[#1A1612]">{analyzingKol.tierName}</strong></div>
                  <div>Ngành thế mạnh: <strong className="text-[#1A1612]">{analyzingKol.lifetimeStats?.primaryCategory || 'Chung'}</strong></div>
                  <div>Tỷ lệ CR%: <strong className="text-[#059669]">{analyzingKol.lifetimeStats?.conversionRate}%</strong></div>
                </div>
              </div>
            </div>

            {/* AI Reasoning Conclusion */}
            <div className="rounded-2xl bg-[#FBF5EB] border border-[#EEDFC6] p-4 text-[#1A1612] text-xs space-y-2">
              <div className="flex items-center gap-2 text-[#8C6226] font-bold">
                <Radar className="h-4 w-4" />
                <span>Căn cứ thuật toán:</span>
              </div>
              <p className="text-[#7D715E] leading-relaxed">{analyzingKol.aiReasoning}</p>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setAnalyzingKol(null);
                  handleNegotiateDeal(analyzingKol);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-[#1A1612] text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <MessageSquare size={13} />
                <span>Thương lượng Deal VIP</span>
              </button>

              <button
                type="button"
                onClick={() => setAnalyzingKol(null)}
                className="rounded-xl bg-[#FAF8F5] border border-[#EAE4D7] px-4 py-2 text-xs font-semibold text-[#7D715E] hover:bg-[#F3EFE6] cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
