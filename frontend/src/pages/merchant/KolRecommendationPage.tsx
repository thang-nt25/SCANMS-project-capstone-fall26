import { KolMatchAnalysisDialog } from '../../components/ai/KolMatchAnalysisDialog';
import { Modal } from '../../components/ui/Modal';
import { handleProductImageError, handleAvatarImageError } from '@/utils/image-fallback.utils';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Search,
  Filter,
  Medal,
  Gem,
  Award,
  Send,
  BarChart3,
  Package,
  X,
  MessageSquare,
  Info,
  RotateCcw,
  TrendingUp,
  UserPlus,
} from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  aiRecommendationService,
  type KolMatchResult,
  type TargetProductSummary,
} from '../../services/ai-recommendation.service';
import api from '../../services/api';
import { Select } from '../../components/ui/Select';
import { KolComparisonModal, KolComparisonDock } from '../../components/ai/KolComparisonPanel';
import { getKolPriceComparison } from '../../utils/ai-price.utils';

const PRICE_RANGES = [
  { label: 'Tất cả khoảng giá', value: 'ALL' },
  { label: 'Dưới 200.000đ', value: 'UNDER_200K' },
  { label: '200.000đ - 500.000đ', value: 'FROM_200K_TO_500K' },
  { label: '500.000đ - 1.000.000đ', value: 'FROM_500K_TO_1M' },
  { label: 'Trên 1.000.000đ', value: 'OVER_1M' },
];

const TIERS = [
  { label: 'Tất cả cấp bậc', value: '' },
  { label: 'Đồng trở lên', value: 'BRONZE' },
  { label: 'Bạc trở lên', value: 'SILVER' },
  { label: 'Vàng trở lên', value: 'GOLD' },
  { label: 'Kim Cương', value: 'DIAMOND' },
];

function formatFollowersCompact(count: number): string {
  if (!count || count <= 0) return '0';
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return count.toLocaleString('vi-VN');
}

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
  const navigate = useNavigate();
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
  const lastSuccessfulScan = useRef('');
  const scanVersion = useRef(0);
  const scanBusy = useRef(false);

  // Filters & Mode Tabs
  const urlKolTab = searchParams.get('kolTab');
  const [activeMode, setActiveMode] = useState<'PERFORMANCE' | 'COLD_START'>(
    urlKolTab === 'COLD_START' ? 'COLD_START' : 'PERFORMANCE',
  );
  const [summaryCounts, setSummaryCounts] = useState<{ performanceCount: number; coldStartCount: number }>({
    performanceCount: 0,
    coldStartCount: 0,
  });
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('ALL');
  const [selectedMinTier, setSelectedMinTier] = useState<string>('');
  const [minConversionRate, setMinConversionRate] = useState<number>(0);
  const [limit, setLimit] = useState<number>(6);
  const [totalScanned, setTotalScanned] = useState(0);
  const invitationLock = useRef(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [relations, setRelations] = useState<Record<string,string>>({});
  const [relationsReady, setRelationsReady] = useState(false);

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
    if (!invitingKol && !analyzingKol && !isCompareModalOpen && !filtersOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || isSendingInvite) return;
      setInvitingKol(null);
      setAnalyzingKol(null);
      setFiltersOpen(false);
      setIsCompareModalOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [invitingKol, analyzingKol, isCompareModalOpen, isSendingInvite, filtersOpen]);

  useEffect(() => {
    let active = true;
    api.get('/store-collaborators/shop').then(response => {
      const data = response.data?.data || response.data;
      const next: Record<string,string> = {};
      for (const member of [...(data?.members || []), ...(data?.pendingRequests || []), ...(data?.pendingInvitations || []), ...(data?.invitations || [])]) {
        if (member.collaboratorId && ['APPROVED','PENDING'].includes(member.status)) next[member.collaboratorId] = member.status;
      }
      if (active) { setRelations(next); setRelationsReady(true); }
    }).catch(() => { if (active) setRelationsReady(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => { setCompareKolIds([]); setAnalyzingKol(null); }, [activeMode, selectedProductId]);

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
  const fetchRecommendations = useCallback(async (isManualRefresh = false) => {
    const version = ++scanVersion.current;
    const scanKey = JSON.stringify([selectedProductId, selectedPriceRange, selectedMinTier, minConversionRate, limit, activeMode]);
    scanBusy.current = true;
    setScanError('');
    setLoading(true);
    try {
      const params: any = { limit, mode: activeMode };
      if (activeMode !== 'COLD_START') {
        if (selectedPriceRange && selectedPriceRange !== 'ALL') {
          params.priceRange = selectedPriceRange;
        }
        if (minConversionRate > 0) {
          params.minConversionRate = minConversionRate;
        }
      }
      if (selectedMinTier) {
        params.minTier = selectedMinTier;
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
      setCalculatedAt(isManualRefresh ? new Date().toISOString() : (res.calculatedAt || new Date().toISOString()));
      setTotalScanned(res.totalKolsScanned || 0);
      setKols(res.recommendedKols || []);
      if (res.summaryCounts) {
        setSummaryCounts(res.summaryCounts);
      }
      setTargetProduct(res.targetProduct || null);
      lastSuccessfulScan.current = scanKey;
    } catch (err: any) {
      if (version !== scanVersion.current) return;
      if (lastSuccessfulScan.current !== scanKey) {
        setKols([]);
        setTargetProduct(null);
      }
      setScanError(err.message || 'Không kết nối được máy chủ để quét KOL.');
    } finally {
      if (version === scanVersion.current) {
        scanBusy.current = false;
        setLoading(false);
      }
    }
  }, [selectedProductId, selectedPriceRange, selectedMinTier, minConversionRate, limit, activeMode]);

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
    navigate(`/merchant/kol-hub?kol=${kol.collaboratorId}&tab=messages`);
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
      setRelations(previous=>({...previous,[invitingKol.collaboratorId]:'PENDING'}));
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
      <span className="inline-flex items-center gap-[5px] rounded-full border border-[#EEDFC6] bg-[#FBF5EB] px-2.5 py-0.5 text-[11px] font-bold text-[#8C6226]">
        {label === 'Kim cương' ? <Gem size={14}/> : <Medal size={14}/>} {label}
      </span>
    );
  };

  const getRankBadge = (idx: number) => <span className="text-xs font-semibold tabular-nums text-[#7D715E]">#{idx + 1}</span>;

  const getMatchScorePill = (score: number) => {
    if (score >= 85) {
      return (
        <span className="rounded-full border border-[#EEDFC6] bg-[#FBF5EB] px-2.5 py-0.5 text-[10px] font-bold text-[#8C6226]">
          Rất phù hợp
        </span>
      );
    }
    if (score >= 70) {
      return (
        <span className="rounded-full border border-[#EAE4D7] bg-[#FAF8F5] px-2.5 py-0.5 text-[10px] font-bold text-[#7D715E]">
          Phù hợp
        </span>
      );
    }
    return (
      <span className="rounded-full border border-[#EAE4D7] bg-[#FAF8F5] px-2.5 py-0.5 text-[10px] font-semibold text-[#7D715E]">
        Tiềm năng
      </span>
    );
  };

  const activeFilterCount = Number(Boolean(selectedMinTier)) + Number(limit !== 6)
    + (activeMode === 'PERFORMANCE' ? Number(selectedPriceRange !== 'ALL') + Number(minConversionRate > 0) : 0);
  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className="kol-recommendation-page space-y-5">
      <div className="radar-commandbar">
        <div className="radar-product-toolbar">
          <Select aria-label="Sản phẩm đối sánh" value={selectedProductId} onChange={event=>setSelectedProductId(event.target.value)}
            triggerContent={selectedProduct ? <span className="flex min-w-0 items-center gap-2 text-left">
              <img src={selectedProduct.imageUrl || selectedProduct.thumbnailUrl || '/assets/product-placeholder.svg'} alt="" onError={handleProductImageError} className="size-7 shrink-0 rounded border border-[#EAE4D7] bg-white object-contain" />
              <span className="min-w-0"><span className="block truncate text-xs font-medium" title={selectedProduct.title || selectedProduct.name}>{selectedProduct.title || selectedProduct.name}</span><span className="block text-[10px] leading-3 text-[#7D715E] tabular-nums">{Number(selectedProduct.price || 0).toLocaleString('vi-VN')} ₫</span></span>
            </span> : undefined}
            options={[{ value: '', label: productsReady ? 'Tất cả hồ sơ KOC' : 'Đang tải sản phẩm…' }, ...products.map(product => ({ value: String(product.id), label: `${product.title || product.name} · ${Number(product.price || 0).toLocaleString('vi-VN')} ₫`, content: <span className="flex min-w-0 items-center gap-2"><img src={product.imageUrl || product.thumbnailUrl || '/assets/product-placeholder.svg'} alt="" onError={handleProductImageError} className="size-7 shrink-0 rounded border border-[#EAE4D7] bg-white object-contain" /><span className="min-w-0"><span className="block text-xs">{product.title || product.name}</span><span className="text-[11px] text-[#7D715E]">{Number(product.price || 0).toLocaleString('vi-VN')} ₫</span></span></span> }))]} />
          <div className="radar-command-heading"><button type="button" aria-label="Cơ chế đối sánh" title="Cơ chế đối sánh" onClick={() => setShowInfoModal(true)}><Info size={15}/><span>Cách tính điểm</span></button>
          <button type="button" className="radar-rescan" aria-label="Quét lại gợi ý KOC"
            title={`Quét lại${calculatedAt ? ` · Cập nhật ${new Date(calculatedAt).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}` : ''}`}
            onClick={()=>{if (!scanBusy.current) void fetchRecommendations();}} disabled={loading}>
            <RotateCcw size={16} aria-hidden="true" className={loading?'animate-spin':''}/>
          </button>          </div>
        </div>
        <div className="radar-results-toolbar">
          <div className="radar-mode-tabs" role="group" aria-label="Nhóm KOC"><div>
            <button type="button" aria-pressed={activeMode === 'PERFORMANCE'} onClick={() => setActiveMode('PERFORMANCE')}><TrendingUp size={14}/><span>Đã có hiệu suất</span><span className="tabular-nums">{summaryCounts.performanceCount}</span></button>
            <button type="button" aria-pressed={activeMode === 'COLD_START'} onClick={() => setActiveMode('COLD_START')}><UserPlus size={14}/><span>KOC mới</span><span className="tabular-nums">{summaryCounts.coldStartCount}</span></button>
          </div></div>
          <label className="radar-search"><Search size={15}/><input aria-label="Tìm KOC" value={searchQuery} onChange={event=>setSearchQuery(event.target.value)} placeholder="Tìm KOC…"/></label>
          <div className="relative"><button className="radar-advanced" type="button" aria-expanded={filtersOpen} onClick={()=>setFiltersOpen(!filtersOpen)}><Filter size={14}/>Bộ lọc{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}</button>
              {filtersOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setFiltersOpen(false)}
                    aria-hidden="true"
                  />
                  <div role="dialog" aria-label="Bộ lọc KOC" className="radar-filter-popover absolute right-0 top-full mt-2 z-30 w-80 max-w-[calc(100vw-32px)] rounded-xl border border-[#EAE4D7] bg-white p-4 shadow-xl space-y-3 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between border-b border-[#EAE4D7] pb-2">
                      <span className="text-xs font-bold text-[#1A1612]">Bộ lọc</span>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPriceRange('ALL');
                            setSelectedMinTier('');
                            setMinConversionRate(0);
                            setLimit(6);
                          }}
                          className="text-[11px] font-semibold text-[#B88E4F] hover:text-[#8C6226] cursor-pointer"
                        >
                          Đặt lại
                        </button>

                      )}
                    </div>

                    <div><span className="mb-1 block text-[11px] font-semibold text-[#7D715E]">Cấp bậc</span>
          <Select aria-label="Cấp bậc KOC" portal value={selectedMinTier} onChange={event=>setSelectedMinTier(event.target.value)} options={TIERS.map(tier => ({ value: tier.value, label: tier.label, content: <span className="flex items-center gap-2 whitespace-nowrap text-xs">{tier.value && (tier.value === 'DIAMOND' ? <Gem size={14} aria-hidden="true"/> : <Medal size={14} aria-hidden="true"/>)}{tier.label}</span> }))} />
                    </div>
                    <div className={activeMode === 'COLD_START' ? 'hidden' : ''}>
                      <label className="block text-[11px] font-semibold text-[#7D715E] mb-1">
                        Khoảng giá phù hợp {activeMode === 'COLD_START' && <span className="text-[10px] font-normal">(Không áp dụng KOL mới)</span>}
                      </label>
                      <Select
                        value={selectedPriceRange}
                        onChange={(e) => setSelectedPriceRange(e.target.value)}
                        disabled={activeMode === 'COLD_START'}
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
                      <label className="block text-[11px] font-semibold text-[#7D715E] mb-1">Số gợi ý</label>
                      <Select
                        value={String(limit)}
                        onChange={(e) => setLimit(Number(e.target.value))}
                        className="w-full text-xs"
                      >
                        <option value="3">3 KOC</option>
                        <option value="6">6 KOC</option>
                        <option value="12">12 KOC</option>
                        <option value="24">24 KOC</option>
                      </Select>
                    </div>

                    <div className={activeMode === 'COLD_START' ? 'hidden' : ''}>
                      <div className="flex items-center justify-between text-[11px] font-semibold text-[#7D715E] mb-1">
                        <span>Chuyển đổi tối thiểu</span>
                        <span className="font-bold text-[#B88E4F] tabular-nums">{minConversionRate}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="15"
                        step="0.5"
                        value={minConversionRate}
                        disabled={activeMode === 'COLD_START'}
                        onChange={(e) => setMinConversionRate(parseFloat(e.target.value))}
                        className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#EAE4D7] accent-[#C59B58] mt-1.5"
                      />
                    </div>
                    <label className="flex items-center justify-between gap-2 border-t border-[#EAE4D7] pt-3 text-xs text-[#655A49]">Tự cập nhật mỗi 60 giây<input aria-label="Tự cập nhật mỗi 60 giây" type="checkbox" checked={autoScan} onChange={event=>setAutoScan(event.target.checked)} className="size-4 accent-[#C59B58]"/></label>
                  </div>
                </>
              )}
          </div>
        </div>
      </div>

      {/* 3. Error Alert */}
      {scanError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EAE4D7] px-4 py-2 text-xs text-[#DC2626]">
          <span title={scanError}>Không cập nhật được.</span>
          <button
            type="button"
            onClick={() => void fetchRecommendations()}
            className="font-bold underline text-[#B88E4F]"
          >
            Thử lại
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
            <div className="w-10 h-10 rounded-lg bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#1A1612]">
              {activeMode === 'COLD_START'
                ? 'Chưa có KOL mới tiềm năng phù hợp tiêu chí'
                : 'Không tìm thấy KOC phù hợp tiêu chí'}
            </h3>

            <button
              type="button"
              onClick={() => {
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {displayedKols.map((kol, idx) => {
              const isComparing = compareKolIds.includes(kol.collaboratorId);
              const isColdStart =
                kol.scoringMode === 'COLD_START' ||
                Boolean(kol.isRisingStar) ||
                Number(kol.lifetimeStats?.totalOrders || 0) < 5;
              const priceComp = getKolPriceComparison(
                kol.lifetimeStats?.avgSellingPrice,
                targetProduct?.price,
              );
              const totalFollowers = (kol.socialChannels || []).reduce(
                (sum, ch) => sum + Number(ch.followerCount || 0),
                0,
              );
              const primaryPlatform =
                kol.socialChannels?.find((ch) => ch.isPrimary)?.platform ||
                kol.socialChannels?.[0]?.platform ||
                'Chưa liên kết';
              return (
                <div
                  key={kol.collaboratorId || idx}
                  className={`radar-result-card relative overflow-hidden rounded-3xl border transition-[border-color,box-shadow,background-color] duration-200 bg-white p-5 flex flex-col justify-between gap-3 shadow-[0_2px_10px_rgba(35,29,21,0.04)] hover:shadow-[0_10px_28px_rgba(35,29,21,0.08)] ${isComparing
                    ? 'border-[#C59B58] ring-2 ring-[#C59B58]/20 bg-[#FBF5EB]/15'
                    : 'border-[#EAE4D7] hover:border-[#C59B58]/70'
                    }`}
                >
                  {/* Top Bar: Rank Medal + Compare Checkbox */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {getRankBadge(idx)}
                    </div>

                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-[#7D715E] hover:text-[#1A1612] select-none shrink-0">
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
                          src={kol.avatarUrl} onError={handleAvatarImageError}
                          alt={kol.fullName}
                          className="w-10 h-10 rounded-lg object-cover ring-1 ring-black/10 shadow-2xs"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] font-bold text-base flex items-center justify-center">
                          {kol.fullName.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm text-[#1A1612] truncate leading-snug" title={kol.fullName}>
                        {kol.fullName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {getTierBadge(kol.tierName)}
                        <span
                          className="rounded-md border border-[#EAE4D7] bg-[#FAF8F5] px-2 py-0.5 text-[10px] font-semibold text-[#7D715E] truncate max-w-[155px]"
                          title={
                            kol.lifetimeStats?.primaryCategory &&
                              kol.lifetimeStats.primaryCategory !== 'Chưa có lịch sử bán hàng'
                              ? kol.lifetimeStats.primaryCategory
                              : kol.categoryMatchSource === 'PROFILE' && kol.matchedCategory
                                ? `Hồ sơ: ${kol.matchedCategory}`
                                : 'Chưa có đơn hàng'
                          }
                        >
                          {kol.lifetimeStats?.primaryCategory &&
                            kol.lifetimeStats.primaryCategory !== 'Chưa có lịch sử bán hàng'
                            ? kol.lifetimeStats.primaryCategory
                            : kol.categoryMatchSource === 'PROFILE' && kol.matchedCategory
                              ? `Hồ sơ: ${kol.matchedCategory}`
                              : 'Chưa có đơn hàng'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="radar-card-score"><span>Điểm phù hợp</span><div><strong>{kol.matchScore}</strong><span>/100</span>{getMatchScorePill(kol.matchScore)}</div></div>


                  <div className="radar-card-metrics">
                    {(isColdStart ? [
                      {label:'Người theo dõi',value:kol.socialChannels?.length?formatFollowersCompact(totalFollowers):'—'},
                      {label:'Kênh liên kết',value:primaryPlatform},
                      {label:'Ngành hàng',value:kol.matchedCategory || kol.lifetimeStats?.primaryCategory || '—'},
                    ] : [
                      {label:'Đơn hàng',value:kol.lifetimeStats?.totalOrders != null?kol.lifetimeStats.totalOrders.toLocaleString('vi-VN'):'—'},
                      {label:'Lượt nhấp',value:kol.lifetimeStats?.totalClicks != null?kol.lifetimeStats.totalClicks.toLocaleString('vi-VN'):'—'},
                      {label:'Chuyển đổi',value:kol.lifetimeStats?.conversionRate != null?`${Number(kol.lifetimeStats.conversionRate).toLocaleString('vi-VN',{maximumFractionDigits:2})}%`:'—'},
                    ]).map(metric=><div key={metric.label}><span>{metric.label}</span><strong title={String(metric.value)}>{metric.value}</strong></div>)}
                  </div>
                  <div className="radar-card-price">
                    <div><span>Giá bán TB đã ghi nhận</span><strong>{!isColdStart && priceComp.hasData?priceComp.formattedAvgPrice:'—'}</strong></div>
                    <div><span>So với sản phẩm đang chọn</span><strong>{!isColdStart && priceComp.hasData?priceComp.badgeText.replace('Cao hơn SP +','Cao hơn ').replace(/Thấp hơn SP -/,'Thấp hơn ').replace('Ngang tầm giá SP','Tương đương'):'—'}</strong></div>
                  </div>

                  {/* Primary & Secondary Action CTAs */}
                  <div className="radar-card-actions space-y-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleNegotiateDeal(kol)}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-[#1A1612] font-bold text-xs shadow-xs active:scale-[0.96] transition-[transform,background-color] duration-150 cursor-pointer"
                      title="Mở khung chat thỏa thuận deal độc quyền"
                    >
                      <MessageSquare size={14} strokeWidth={2} />
                      <span>Nhắn tin</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!relationsReady || !!relations[kol.collaboratorId]}
                        onClick={() => {
                          setInviteMessage('');
                          setInvitingKol(kol);
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-[#EAE4D7] bg-white hover:bg-[#FAF8F5] hover:border-[#C59B58]/50 text-xs font-semibold text-[#7D715E] hover:text-[#1A1612] active:scale-[0.96] transition-[transform,background-color,border-color,color] duration-150 cursor-pointer shadow-2xs"
                      >
                        <Send size={13} strokeWidth={1.75} className="text-[#B88E4F]" />
                        <span>{relations[kol.collaboratorId]==='APPROVED'?'Đã hợp tác':relations[kol.collaboratorId]==='PENDING'?'Đã gửi lời mời':relationsReady?'Mời hợp tác':'Chưa xác định hợp tác'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAnalyzingKol(kol)}
                        className="inline-flex items-center gap-1 py-2 px-3 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] hover:bg-[#F3EFE6] text-xs font-semibold text-[#715126] active:scale-[0.96] transition-[transform,background-color,border-color,color] duration-150 cursor-pointer shadow-2xs"
                      >
                        <span>Xem phân tích ↗</span>
                      </button>
                    </div>

                    {/* Compact On-Card Radar Breakdown (At-a-glance without opening overlay) */}
                    {isColdStart ? (
                      <div className="grid grid-cols-2 gap-2 pt-1 text-[10px]">
                        <div className="rounded-lg bg-[#FAF8F5] border border-[#EAE4D7] px-2 py-1 flex items-center justify-between">
                          <span className="text-[#7D715E]">Ngành &amp; Hồ sơ</span>
                          <strong className="text-[#1A1612] tabular-nums">{kol.scoreBreakdown?.categoryScore || 0}</strong>
                        </div>
                        <div className="rounded-lg bg-[#FAF8F5] border border-[#EAE4D7] px-2 py-1 flex items-center justify-between">
                          <span className="text-[#7D715E]">Follower MXH</span>
                          <strong className="text-[#1A1612] tabular-nums">{kol.scoreBreakdown?.tierAndSocialScore || 0}</strong>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-1.5 pt-1 text-[10px]">
                        {[
                          { label: 'Ngành', val: kol.scoreBreakdown?.categoryScore || 0 },
                          { label: 'CR%', val: kol.scoreBreakdown?.conversionRateScore || 0 },
                          { label: 'Giá', val: kol.scoreBreakdown?.priceFitScore || 0 },
                          { label: 'Hạng', val: kol.scoreBreakdown?.tierAndSocialScore || 0 },
                        ].map((ax) => (
                          <div key={ax.label} className="rounded-lg bg-[#FAF8F5] border border-[#EAE4D7] px-1.5 py-1 text-center">
                            <span className="text-[#7D715E] block leading-tight">{ax.label}</span>
                            <strong className="text-[#1A1612] tabular-nums">{ax.val}</strong>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>


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
        onViewAnalysis={setAnalyzingKol}
        productTitle={selectedProduct?.title || selectedProduct?.name}
      />

      {/* 7. AI Mechanism Info Modal */}
      <Modal isOpen={showInfoModal} onClose={() => setShowInfoModal(false)} title="Cách tính điểm phù hợp" maxWidth="xl" stickyHeader className="radar-score-info max-w-[560px]!">
        <div className="space-y-4 text-xs text-[#655A49]">
          <div><h4 className="mb-2 font-semibold text-[#1A1612]">KOC đã có hiệu suất · Từ 5 đơn</h4>
            <dl className="divide-y divide-[#EAE4D7]">{[
              ['Ngành hàng', '35%', 'Độ liên quan với sản phẩm'], ['Chuyển đổi', '25%', 'Đơn / lượt nhấp hợp lệ'], ['Phân khúc giá', '20%', 'So với giá trị đơn trung bình'], ['Cấp bậc & mạng xã hội', '20%', 'Hạng và dữ liệu kênh liên kết'],
            ].map(([label, weight, description]) => <div key={label} className="grid grid-cols-[minmax(0,1fr)_40px] gap-x-3 gap-y-1 py-2 sm:grid-cols-[minmax(0,1fr)_40px_minmax(0,1.1fr)]"><dt className="font-medium text-[#1A1612]">{label}</dt><dd className="text-right font-semibold tabular-nums text-[#90682F]">{weight}</dd><dd className="col-span-2 text-[#7D715E] sm:col-span-1">{description}</dd></div>)}</dl>
          </div>
          <div className="border-t border-[#EAE4D7] pt-3"><h4 className="font-semibold text-[#1A1612]">KOC mới · Dưới 5 đơn</h4><p className="mt-1 leading-relaxed">Ngành hàng 70% · Người theo dõi kênh liên kết 30%.</p></div>
          <p className="border-t border-[#EAE4D7] pt-3 text-[11px] text-[#7D715E]">Điểm dùng để tham khảo, không bảo đảm doanh số.{totalScanned > 0 && <> Đã quét {totalScanned} hồ sơ.</>}</p>
        </div>
      </Modal>

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
                    src={invitingKol.avatarUrl} onError={handleAvatarImageError}
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
                      src={selectedProduct.thumbnailUrl} onError={handleProductImageError}
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
                        className={`py-2 px-2 rounded-xl text-xs font-bold transition cursor-pointer border flex flex-col items-center justify-center ${isSelected
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

      {/* 9. Detailed 1-on-1 Analysis Modal (Fits cleanly in 1 viewport, no cramped card scroll) */}
      {analyzingKol && (
        <KolMatchAnalysisDialog
          kol={analyzingKol}
          product={targetProduct}
          onClose={() => setAnalyzingKol(null)}
          onMessage={() => {
            handleNegotiateDeal(analyzingKol);
            setAnalyzingKol(null);
          }}
          onInvite={relationsReady && !relations[analyzingKol.collaboratorId]
            ? () => {
                setInviteMessage('');
                setInvitingKol(analyzingKol);
                setAnalyzingKol(null);
              }
            : undefined}
        />
      )}
    </div>
  );
}
