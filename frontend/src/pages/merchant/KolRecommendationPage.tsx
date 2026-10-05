import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Sparkles,
  Search,
  Filter,
  Award,
  Send,
  BarChart3,
  X,
  ShoppingBag,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  aiRecommendationService,
  type KolMatchResult,
  type TargetProductSummary,
} from '../../services/ai-recommendation.service';
import api from '../../services/api';
import { Select } from '../../components/ui/Select';

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

export default function KolRecommendationPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [targetProduct, setTargetProduct] = useState<TargetProductSummary | null>(null);
  const [kols, setKols] = useState<KolMatchResult[]>([]);
  const [totalScanned, setTotalScanned] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [analyzingKol, setAnalyzingKol] = useState<KolMatchResult | null>(null);

  const [productsReady, setProductsReady] = useState(false);
  const [autoScan, setAutoScan] = useState(true);
  const [calculatedAt, setCalculatedAt] = useState('');
  const [scanError, setScanError] = useState('');
  const scanVersion = useRef(0);
  const scanBusy = useRef(false);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả danh mục');
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('ALL');
  const [selectedMinTier, setSelectedMinTier] = useState<string>('');
  const [minConversionRate, setMinConversionRate] = useState<number>(0);
  const [limit, setLimit] = useState<number>(10);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // VIP Invitation Modal State
  const [invitingKol, setInvitingKol] = useState<KolMatchResult | null>(null);
  const [inviteMessage, setInviteMessage] = useState<string>('');
  const [isSendingInvite, setIsSendingInvite] = useState<boolean>(false);

  // 1. Fetch Merchant Products to populate dropdown
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res: any = await api.get('/products', { params: { limit: 100 } });
        const body = res?.data?.data || res?.data || res;
        const list = (Array.isArray(body) ? body : body?.items || []).filter((p: any) => p.moderationStatus === 'APPROVED' && p.isActive !== false && !p.isDeleted);
        if (Array.isArray(list) && list.length > 0) {
          setProducts(list);
          setSelectedProductId(list[0].id);
        }
      } catch {
        toast.error('Không tải được sản phẩm của shop. Bạn vẫn có thể quét hồ sơ KOL chung.');
      } finally {
        setProductsReady(true);
      }
    };
    fetchProducts();
  }, []);

  // 2. Fetch recommendations whenever product or filters change
  const fetchRecommendations = useCallback(async () => {
    const version = ++scanVersion.current;
    scanBusy.current = true;
    setScanError('');
    setLoading(true);
    try {
      const params: any = {
        limit,
      };
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
      setCalculatedAt(res.calculatedAt || '');
      setKols(res.recommendedKols || []);
      setTotalScanned(res.totalKolsScanned || 0);
      setTargetProduct(res.targetProduct || null);
    } catch (err: any) {
      if (version !== scanVersion.current) return;
      setKols([]);
      setTargetProduct(null);
      setTotalScanned(0);
      setScanError(err.message || 'Không kết nối được máy chủ để quét KOL.');
    } finally {
      if (version === scanVersion.current) { scanBusy.current = false; setLoading(false); }
    }
  }, [selectedProductId, selectedCategory, selectedPriceRange, selectedMinTier, minConversionRate, limit]);

  useEffect(() => {
    if (!productsReady) return;
    const debounce = setTimeout(() => { void fetchRecommendations(); }, 300);
    const timer = autoScan ? setInterval(() => {
      if (document.visibilityState === 'visible' && !scanBusy.current) void fetchRecommendations();
    }, 60000) : undefined;
    const onVisible = () => { if (autoScan && document.visibilityState === 'visible' && !scanBusy.current) void fetchRecommendations(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearTimeout(debounce); clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); scanVersion.current += 1; scanBusy.current = false; };
  }, [productsReady, autoScan, fetchRecommendations]);

  // Filtered KOLs by search
  const displayedKols = useMemo(() => {
    if (!searchQuery.trim()) return kols;
    const q = searchQuery.toLowerCase();
    return kols.filter(
      (k) =>
        k.fullName.toLowerCase().includes(q) ||
        k.bio?.toLowerCase().includes(q) ||
        k.tierName.toLowerCase().includes(q) ||
        k.lifetimeStats?.primaryCategory?.toLowerCase().includes(q)
    );
  }, [kols, searchQuery]);

  // Handle VIP Invitation Submission
  const handleSendVipInvite = async () => {
    if (!invitingKol) return;
    setIsSendingInvite(true);
    try {
      const result: any = await api.post('/store-collaborators/invite', { email: invitingKol.email, note: inviteMessage.trim() || undefined });
      const body = result?.data || result;
      if (!body?.invitation?.id) throw new Error('Máy chủ chưa xác nhận lời mời.');
      toast.success('Đã gửi lời mời hợp tác trên SCANMS. KOL cần xác nhận để tham gia.');
      setInvitingKol(null);
    } catch (err: any) {
      toast.error('Gửi lời mời thất bại: ' + (err.message || 'Lỗi'));
    } finally {
      setIsSendingInvite(false);
    }
  };

  const getTierBadge = (tierName: string) => {
    const tier = (tierName || '').toUpperCase();
    const label = tier.includes('DIAMOND') || tier.includes('KIM CƯƠNG') ? 'Kim cương'
      : tier.includes('PLATINUM') || tier.includes('BẠCH KIM') ? 'Bạch kim'
      : tier.includes('GOLD') || tier.includes('VÀNG') ? 'Vàng'
      : tier.includes('SILVER') || tier.includes('BẠC') ? 'Bạc'
      : tier.includes('BRONZE') || tier.includes('ĐỒNG') ? 'Đồng' : 'Chưa xếp hạng';
    return <span className="inline-flex rounded-full border border-[#EEDFC6] bg-[#FBF5EB] px-2.5 py-0.5 text-xs font-semibold text-[#8C6226]">{label}</span>;
  };

  const getScoreColor = (score: number) => score >= 78
    ? { ring: 'text-[#B88E4F]', bg: 'bg-[#FBF5EB]', text: 'text-[#8C6226]', badge: 'bg-[#FBF5EB] text-[#8C6226] border-[#EEDFC6]' }
    : { ring: 'text-[#C59B58]', bg: 'bg-[#FAF8F5]', text: 'text-[#7D715E]', badge: 'bg-[#FAF8F5] text-[#7D715E] border-[#EAE4D7]' };

  return (
    <div className="space-y-6 pb-12">


      <div className="rounded-xl border border-[#EAE4D7] bg-white px-4 py-3 text-xs text-[#7D715E] flex flex-wrap items-center justify-between gap-3">
        <div><p className="font-semibold text-[#1A1612]">Tự động đối sánh KOL từ dữ liệu thật trên SCANMS</p><p className="mt-1">Hồ sơ KYC, đơn đã giao/hoàn tất và lượt nhấp hợp lệ. Điểm /100 là xếp hạng tham khảo; không quét trực tiếp TikTok/YouTube.</p>{calculatedAt && <p className="mt-1">Lần quét gần nhất: {new Date(calculatedAt).toLocaleString('vi-VN')}</p>}</div>
        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={autoScan} onChange={(event) => setAutoScan(event.target.checked)} className="accent-[#C59B58]" />Tự cập nhật mỗi 60 giây khi mở trang</label>
      </div>
      {scanError && <div role="alert" className="rounded-xl border border-[#EEDFC6] bg-white p-4 text-sm text-[#DC2626]">{scanError}<button type="button" onClick={() => void fetchRecommendations()} className="ml-3 text-[#B88E4F] underline">Thử quét lại</button></div>}
      {/* 2. Target Product Selector & Profile Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Product Dropdown & Quick Config */}
        <div className="lg:col-span-1 rounded-2xl bg-white p-5 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-semibold text-slate-800 text-sm">
            <ShoppingBag className="h-4 w-4 text-[#B88E4F] " />
            <span>Chọn sản phẩm mục tiêu cần đẩy mạnh:</span>
          </div>

          <div>
            <Select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full text-sm font-medium"
            >
              <option value="">{productsReady ? "Quét hồ sơ KOL chung" : "Đang tải sản phẩm…"}</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title || p.name} ({new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p.price || 0)})
                </option>
              ))}
            </Select>
          </div>

          {targetProduct && (
            <div className="rounded-xl bg-gradient-to-br from-[#FBF5EB] to-white p-4 border border-[#EEDFC6] space-y-3">
              <div className="flex min-h-[52px] items-start gap-3">
                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-white border border-[#EEDFC6] shadow-sm flex items-center justify-center">
                  {targetProduct.imageUrl ? (
                    <img src={targetProduct.imageUrl} alt={targetProduct.title} className="h-full w-full object-cover" />
                  ) : (
                    <ShoppingBag className="h-8 w-8 text-[#B88E4F]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 truncate" title={targetProduct.title}>
                    {targetProduct.title}
                  </h4>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded-md bg-[#FBF5EB] px-2 py-0.5 text-xs font-semibold text-[#B88E4F]">
                      {targetProduct.category || 'Mặc định'}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-xs">
                    <span className="font-bold text-rose-600">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(targetProduct.price)}
                    </span>
                    <span className="font-medium text-slate-600">
                      Hoa hồng: <strong className="text-[#B88E4F]">{targetProduct.commissionRate}%</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Smart Filter Toolbar */}
        <div className="lg:col-span-2 rounded-2xl bg-white p-5 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-slate-800 text-sm">
              <Filter className="h-4 w-4 text-[#B88E4F]" />
              <span>Điều kiện tìm KOL:</span>
            </div>
            <button
              onClick={() => void fetchRecommendations()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#FBF5EB] px-3 py-1.5 text-xs font-semibold text-[#B88E4F] hover:bg-[#FBF5EB] transition-colors"
            >
              <Sparkles className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Quét & Tính Điểm Lại
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-slate-500 font-medium mb-1">Ngành hàng lọc thêm</label>
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
              <label className="block text-slate-500 font-medium mb-1">Khoảng giá phù hợp</label>
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
              <label className="block text-slate-500 font-medium mb-1">Hạng KOL tối thiểu</label>
              <Select
                value={selectedMinTier}
                onChange={(e) => setSelectedMinTier(e.target.value)}
                className="w-full text-xs"
              >
                {TIERS.map((tier) => (
                  <option key={tier.value} value={tier.value}>
                    {tier.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">
                Tỷ lệ chuyển đổi CR% tối thiểu: <span className="font-bold text-[#B88E4F]">{minConversionRate}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="15"
                step="0.5"
                value={minConversionRate}
                onChange={(e) => setMinConversionRate(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">Số lượng gợi ý hiển thị</label>
              <Select
                value={String(limit)}
                onChange={(e) => setLimit(parseInt(e.target.value))}
                className="w-full text-xs"
              >
                <option value="3">Top 3 KOLs xuất sắc nhất</option>
                <option value="5">Top 5 KOLs phù hợp nhất</option>
                <option value="10">Top 10 KOLs tiềm năng</option>
                <option value="20">Top 20 KOLs mở rộng</option>
              </Select>
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">Tìm nhanh theo tên / bio</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Gõ tên KOL..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2 py-1.5 text-slate-700 focus:border-[#EEDFC6] focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Results Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>Nhà sáng tạo được gợi ý</span>
              <span className="rounded-full bg-[#FBF5EB] px-2.5 py-0.5 text-xs font-semibold text-[#B88E4F]">
                {displayedKols.length} kết quả
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Đã quét qua {totalScanned} hồ sơ KOL đang hoạt động trên hệ thống SCANMS
            </p>
          </div>

          <p className="text-[11px] text-[#7D715E]">Điểm /100 · Chỉ dùng để tham khảo</p>

        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-slate-200"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/3"></div>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-slate-200"></div>
                </div>
                <div className="h-16 bg-slate-100 rounded-xl"></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-8 bg-slate-100 rounded"></div>
                  <div className="h-8 bg-slate-100 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : displayedKols.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
            <div className="mx-auto h-12 w-12 rounded-full bg-[#FBF5EB] text-[#B88E4F] flex items-center justify-center">
              <Search className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">Không tìm thấy KOL phù hợp tiêu chí</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Hãy thử nới lỏng bộ lọc (giảm tỷ lệ CR% hoặc mở rộng ngành hàng) để AI tiếp cận thêm nhiều nhà sáng tạo tiềm năng.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('Tất cả danh mục');
                setSelectedPriceRange('ALL');
                setSelectedMinTier('');
                setMinConversionRate(0);
                setSearchQuery('');
              }}
              className="mt-2 rounded-xl bg-[#C59B58] px-4 py-2 text-xs font-semibold text-[#231D15] hover:bg-[#B88E4F] transition"
            >
              Đặt lại toàn bộ bộ lọc
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 items-start gap-3">
            {displayedKols.map((kol, idx) => {
              const colorInfo = getScoreColor(kol.matchScore);
              const breakdown = [
                { label: 'Ngành hàng', weight: 35, value: kol.scoreBreakdown?.categoryScore },
                { label: 'Chuyển đổi', weight: 25, value: kol.scoreBreakdown?.conversionRateScore },
                { label: 'Hạng & kênh', weight: 20, value: kol.scoreBreakdown?.tierAndSocialScore },
                { label: 'Khoảng giá', weight: 20, value: kol.scoreBreakdown?.priceFitScore },
              ];
              return (
                <article key={kol.collaboratorId || idx} className="min-w-0 rounded-xl border border-[#EAE4D7] bg-white p-4 shadow-[0_2px_8px_rgba(35,29,21,0.025)]">
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      {kol.avatarUrl ? <img src={kol.avatarUrl} alt={kol.fullName} className="h-10 w-10 rounded-full object-cover border border-[#EAE4D7]" /> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FBF5EB] text-sm font-semibold text-[#8C6226]">{kol.fullName.charAt(0)}</div>}
                      <span className="absolute -bottom-1 -right-1 rounded-full border border-white bg-[#F3EFE6] px-1 text-[10px] font-semibold text-[#7D715E]">#{idx + 1}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold leading-5 text-[#1A1612]">{kol.fullName}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">{getTierBadge(kol.tierName)}</div>
                    </div>
                    <span className={'shrink-0 rounded-lg border px-2 py-1 text-sm font-bold ' + colorInfo.badge}>{kol.matchScore}<span className="text-[10px] font-normal">/100</span></span>
                  </div>
                  <p className="mt-2 min-h-[40px] text-xs text-[#7D715E] leading-5">{kol.lifetimeStats?.primaryCategory || 'Chưa có lịch sử ngành hàng'}<span className="mx-1.5">·</span>{kol.matchLevel}</p>
                  <dl className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-[#FAF8F5] px-3 py-2.5">
                    <div><dt className="text-[11px] text-[#7D715E]">Đơn hoàn tất</dt><dd className="mt-0.5 text-sm font-semibold text-[#1A1612]">{Number(kol.lifetimeStats?.totalOrders || 0).toLocaleString('vi-VN')}</dd></div>
                    <div><dt className="text-[11px] text-[#7D715E]">Nhấp hợp lệ</dt><dd className="mt-0.5 text-sm font-semibold text-[#1A1612]">{Number(kol.lifetimeStats?.totalClicks || 0).toLocaleString('vi-VN')}</dd></div>
                    <div><dt className="text-[11px] text-[#7D715E]">Đơn / nhấp</dt><dd className="mt-0.5 text-sm font-semibold text-[#1A1612]">{kol.lifetimeStats?.conversionRate || 0}%</dd></div>
                  </dl>
                  <p className="mt-2 text-[11px] leading-4 text-[#7D715E]">{kol.lifetimeStats?.dataConfidence === 'HIGH' ? 'Đủ dữ liệu bán hàng để đối sánh' : kol.lifetimeStats?.dataConfidence === 'MEDIUM' ? 'Dữ liệu ở mức tham khảo' : 'Dữ liệu còn ít · Nên xem hồ sơ trước khi mời'}</p>
                  <details className="mt-3 border-t border-[#EAE4D7] pt-2.5 text-xs">
                    <summary className="w-fit cursor-pointer font-medium text-[#8C6226]">Căn cứ & điểm thành phần</summary>
                    <div className="mt-3 space-y-3">
                      <p className="leading-relaxed text-[#7D715E]">{kol.aiReasoning}</p>
                      <div className="grid grid-cols-2 gap-3">
                        {breakdown.map((criterion) => <div key={criterion.label}>
                          <div className="mb-1 flex justify-between gap-2 text-[11px] text-[#7D715E]"><span>{criterion.label} ({criterion.weight}%)</span><strong className="text-[#8C6226]">{criterion.value || 0}/100</strong></div>
                          <div className="h-1 rounded-full bg-[#F3EFE6]"><div className="h-full rounded-full bg-[#C59B58]" style={{ width: (criterion.value || 0) + '%' }} /></div>
                        </div>)}
                      </div>
                      {!!kol.socialChannels?.length && <div className="flex flex-wrap gap-1.5">{kol.socialChannels.map((channel, channelIdx) => <span key={channelIdx} className="rounded-md bg-[#FAF8F5] px-2 py-1 text-[11px] text-[#7D715E]">{channel.platform} · {Number(channel.followerCount || 0).toLocaleString('vi-VN')} người theo dõi</span>)}</div>}
                    </div>
                  </details>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => { setInviteMessage(''); setInvitingKol(kol); }} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#C59B58] px-3 py-2 text-xs font-semibold text-[#231D15] hover:bg-[#B88E4F] transition"><Send className="h-3.5 w-3.5" />Mời hợp tác</button>
                    <button type="button" onClick={() => setAnalyzingKol(kol)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#EAE4D7] bg-white px-3 py-2 text-xs font-medium text-[#7D715E] hover:bg-[#FAF8F5] transition" title="Xem phân tích đối sánh chi tiết"><BarChart3 className="h-3.5 w-3.5" />Phân tích</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. VIP Invitation Modal */}
      {invitingKol && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Mời KOL hợp tác</h3>
                  <p className="text-xs text-slate-500">Lời mời gửi trong SCANMS, chờ KOL xác nhận</p>
                </div>
              </div>
              <button
                onClick={() => setInvitingKol(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/80 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[#FBF5EB] text-[#B88E4F] font-bold flex items-center justify-center flex-shrink-0">
                  {invitingKol.fullName.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{invitingKol.fullName}</h4>
                  <p className="text-slate-500 text-[11px]">{invitingKol.bio || 'Nhà sáng tạo tiềm năng'}</p>
                </div>
                <div className="ml-auto text-right">
                  <span className="font-bold text-[#B88E4F]">{invitingKol.matchScore}/100 Phù hợp</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Thông điệp cá nhân hóa gửi KOL:
                </label>
                <textarea
                  rows={3}
                  maxLength={255}
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder={`Chào ${invitingKol.fullName}, shop rất ấn tượng với phong cách nội dung của bạn và muốn gửi lời mời hợp tác cho sản phẩm…`}
                  className="w-full rounded-xl border border-slate-200 p-3 text-slate-800 placeholder-slate-400 focus:border-[#EEDFC6] focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setInvitingKol(null)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSendVipInvite}
                disabled={isSendingInvite}
                className="flex items-center gap-1.5 rounded-xl bg-[#FBF5EB] px-4 py-2 text-xs font-semibold text-white hover:bg-[#FBF5EB] transition shadow-sm disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {isSendingInvite ? 'Đang gửi...' : 'Gửi lời mời hợp tác'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Detailed 1-on-1 Analysis Modal */}
      {analyzingKol && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 md:p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-2xl bg-[#FBF5EB] text-[#B88E4F] flex items-center justify-center">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Báo Cáo Đối Sánh Chuyên Sâu 1-1</h3>
                  <p className="text-xs text-slate-500">Phân tích mức độ tương thích giữa Sản phẩm & Nhà sáng tạo</p>
                </div>
              </div>
              <button
                onClick={() => setAnalyzingKol(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Comparison Cards Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-[#FBF5EB] p-4 border border-[#EEDFC6] space-y-2">
                <span className="text-[11px] font-bold text-[#B88E4F] uppercase tracking-wider">Sản Phẩm Mục Tiêu</span>
                <h4 className="font-bold text-slate-900 text-sm">{targetProduct?.title || 'Sản phẩm đang chọn'}</h4>
                <div className="text-xs text-slate-600 space-y-1">
                  <div>Ngành hàng: <strong>{targetProduct?.category}</strong></div>
                  <div>Giá bán: <strong>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(targetProduct?.price || 0)}</strong></div>
                  <div>Hoa hồng: <strong>{targetProduct?.commissionRate}%</strong></div>
                </div>
              </div>

              <div className="rounded-2xl bg-purple-50/60 p-4 border border-purple-100 space-y-2">
                <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Hồ Sơ Nhà Sáng Tạo</span>
                <h4 className="font-bold text-slate-900 text-sm">{analyzingKol.fullName}</h4>
                <div className="text-xs text-slate-600 space-y-1">
                  <div>Cấp bậc: <strong>{analyzingKol.tierName}</strong></div>
                  <div>Ngành thế mạnh: <strong>{analyzingKol.lifetimeStats?.primaryCategory}</strong></div>
                  <div>Tỷ lệ CR%: <strong className="text-[#B88E4F]">{analyzingKol.lifetimeStats?.conversionRate}%</strong></div>
                </div>
              </div>
            </div>

            {/* Deep Metric Analysis Breakdown */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 text-sm">Điểm số chi tiết từng tiêu chuẩn thuật toán:</h4>
              <div className="space-y-2.5 text-xs">
                <div className="rounded-xl border border-slate-200 p-3 space-y-1.5">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-700">1. Độ tương đồng ngành hàng (Category Affinity - 35%):</span>
                    <span className="text-[#B88E4F] font-bold">{analyzingKol.scoreBreakdown?.categoryScore}%</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Đối chiếu ngành hàng từng bán trên SCANMS với ngành của sản phẩm.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-3 space-y-1.5">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-700">2. Năng lực chuyển đổi đơn hàng (Conversion Rate - 25%):</span>
                    <span className="text-[#B88E4F] font-bold">{analyzingKol.scoreBreakdown?.conversionRateScore}%</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Dựa trên đơn đã giao/hoàn tất và lượt nhấp hợp lệ duy nhất trên SCANMS; giảm trọng số khi dữ liệu ít.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-3 space-y-1.5">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-700">3. Cấp bậc danh hiệu & Quy mô người theo dõi (20%):</span>
                    <span className="text-purple-600 font-bold">{analyzingKol.scoreBreakdown?.tierAndSocialScore}%</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Dựa trên tổng followers trên các nền tảng TikTok, YouTube, Instagram và cấp bậc hệ thống.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-3 space-y-1.5">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-700">4. Mức độ phù hợp phân khúc giá (Price Fit - 20%):</span>
                    <span className="text-amber-600 font-bold">{analyzingKol.scoreBreakdown?.priceFitScore}%</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    So sánh giá sản phẩm với giá trị sản phẩm KOL từng bán trên SCANMS.
                  </p>
                </div>
              </div>
            </div>

            {/* AI Recommendation Conclusion */}
            <div className="rounded-2xl bg-[#FBF5EB] border border-[#EEDFC6] p-4 text-[#1A1612] text-xs space-y-2">
              <div className="flex items-center gap-2 text-[#8F682E] font-bold">
                <Sparkles className="h-4 w-4" />
                <span>Căn cứ đề xuất:</span>
              </div>
              <p className="text-[#7D715E] leading-relaxed">
                {analyzingKol.aiReasoning}
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setAnalyzingKol(null)}
                className="rounded-xl bg-slate-100 px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                Đóng báo cáo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
