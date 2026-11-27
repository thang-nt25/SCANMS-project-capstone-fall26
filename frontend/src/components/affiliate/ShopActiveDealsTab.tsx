import { publicWebsiteUrl } from '@/utils/public-url';
import { handleAvatarImageError, handleProductImageError } from '@/utils/image-fallback.utils';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  MessageSquare,
  Copy,
  Check,
  Search,
  ShoppingBag,
  MoreHorizontal,
  Medal,
  Gem,
  X,
  Loader2,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react';
import { analyticsService, type ActiveDealPartnerItem } from '../../services/analytics.service';
import { referralLinksService, type ExclusiveDealProposal } from '../../services/referral-links.service';
import { toast } from '../../utils/toast';
import { Modal } from '../ui/Modal';

function historyDealState(item: ExclusiveDealProposal) {
  if (item.status === 'REJECTED') return 'Đã từ chối';
  if (item.closedAt || item.shopResponse?.startsWith('[ĐÃ ĐÓNG DEAL / CHẾ TÀI]') || item.referralLink?.status === 'BLOCKED') return 'Đã đóng';
  if (item.isCurrentDeal === false) return 'Đã thay thế';
  if (item.commitmentEndsAt && Date.parse(item.commitmentEndsAt) <= Date.now()) return 'Đã hết hạn';
  return 'Đã lưu lịch sử';
}
function dealDate(value?: string | null) {
  return value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—';
}

interface Props {
  onSelectKolForChat?: (kolId: string) => void;
}

function SocialIcon({ platform, className = 'w-3.5 h-3.5' }: { platform?: string; className?: string }) {
  const p = (platform || '').toUpperCase();
  if (p === 'TIKTOK') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.86.12V9.42a6.34 6.34 0 0 0-.86-.06 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.28 8.28 0 0 0 4.84 1.55V6.85a4.85 4.85 0 0 1-1.07-.16z" />
      </svg>
    );
  }
  if (p === 'YOUTUBE') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#DC2626" />
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
  return <ExternalLink className={className} />;
}

const getTierColor = (tier: string) => {
  const t = (tier || '').toUpperCase();
  if (t.includes('KIM CƯƠNG') || t.includes('DIAMOND')) {
    return 'bg-blue-50 text-blue-700 border-blue-200';
  }
  if (t.includes('VÀNG') || t.includes('GOLD')) {
    return 'bg-[#FBF5EB] text-[#B88E4F] border-[#EEDFC6]';
  }
  if (t.includes('BẠC') || t.includes('SILVER')) {
    return 'bg-slate-100 text-slate-700 border-slate-300';
  }
  return 'bg-[#F3EFE6] text-[#7D715E] border-[#EAE4D7]';
};

const defaultVipTerms = {
  discountPercent: 5,
  minimumOrderAmount: 200000,
  maximumDiscountAmount: 50000,
  usageLimitTotal: 20,
  budgetTotal: 1000000,
  validDays: 30,
};

export default function ShopActiveDealsTab({ onSelectKolForChat }: Props) {
  // Main Tab: 'ACTIVE' | 'PENDING' | 'HISTORY'
  const [voucherTermsById, setVoucherTermsById] = useState<Record<string, typeof defaultVipTerms>>({});
  const [activeSubTab, setActiveSubTab] = useState<'ACTIVE' | 'PENDING' | 'HISTORY'>('ACTIVE');

  // Active Deals Data
  const [activeData, setActiveData] = useState<{
    totalPartners: number;
    totalActiveDeals: number;
    averageCommissionRate: number | null;
    deals: ActiveDealPartnerItem[];
  }>({
    totalPartners: 0,
    totalActiveDeals: 0,
    averageCommissionRate: null,
    deals: [],
  });

  // All Proposals from backend (including pending & history)
  const [allProposals, setAllProposals] = useState<ExclusiveDealProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filters for active view
  const [searchQuery, setSearchQuery] = useState('');
  const [rateFilter, setRateFilter] = useState<string>('ALL');

  // Processing & Terminate states
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedDealToTerminate, setSelectedDealToTerminate] = useState<any | null>(null);
  const [terminateReason, setTerminateReason] = useState('KOL không đạt chỉ tiêu đơn hàng/doanh số sau chu kỳ cam kết');
  const [escalateDispute, setEscalateDispute] = useState(false);
  const [submittingTerminate, setSubmittingTerminate] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [activeRes, proposalsRes] = await Promise.all([
        analyticsService.getShopActivePartners(true),
        referralLinksService.getShopExclusiveDeals(),
      ]);

      setActiveData({
        totalPartners: activeRes.totalPartners || 0,
        totalActiveDeals: activeRes.totalActiveDeals || 0,
        averageCommissionRate: activeRes.totalActiveDeals > 0 && activeRes.averageCommissionRate != null ? Number(activeRes.averageCommissionRate) : null,
        deals: activeRes.deals || [],
      });

      setAllProposals(proposalsRes || []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Không tải được thỏa thuận. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  // Derived Proposal counts
  const pendingProposals = useMemo(() => {
    return allProposals.filter((p) => p.status === 'PENDING');
  }, [allProposals]);

  const historyProposals = useMemo(() => {
    return allProposals.filter((p) => {
      const isTerminated = p.shopResponse?.startsWith('[ĐÃ ĐÓNG DEAL / CHẾ TÀI]') || p.referralLink?.status === 'BLOCKED';
      return p.status === 'REJECTED' || isTerminated || p.isCurrentDeal === false || !!p.closedAt
        || (p.status === 'APPROVED' && !!p.commitmentEndsAt && Date.parse(p.commitmentEndsAt) <= Date.now());
    });
  }, [allProposals]);

  const proposalQuery = searchQuery.trim().toLocaleLowerCase('vi');
  const matchesProposal = (item: ExclusiveDealProposal) =>
    [item.collaborator?.fullName, item.product?.title].some(value => value?.toLocaleLowerCase('vi').includes(proposalQuery));
  const visiblePending = proposalQuery ? pendingProposals.filter(matchesProposal) : pendingProposals;
  const visibleHistory = proposalQuery ? historyProposals.filter(matchesProposal) : historyProposals;
  const [historyPage, setHistoryPage] = useState(1);
  const [selectedHistory, setSelectedHistory] = useState<ExclusiveDealProposal | null>(null);
  const [historyDetails, setHistoryDetails] = useState<ExclusiveDealProposal | null>(null);
  const [historyDetailError, setHistoryDetailError] = useState(false);
  const [historyRetry, setHistoryRetry] = useState(0);
  const historyPages = Math.max(1, Math.ceil(visibleHistory.length / 10));
  const safeHistoryPage = Math.min(historyPage, historyPages);
  const pageHistory = visibleHistory.slice((safeHistoryPage - 1) * 10, safeHistoryPage * 10);
  useEffect(() => { setHistoryPage(1); }, [searchQuery]);
  useEffect(() => {
    if (!selectedHistory) return;
    let active = true;
    setHistoryDetails(null);
    setHistoryDetailError(false);
    void referralLinksService.getExclusiveDealDetails(selectedHistory.id).then(data => {
      if (active) setHistoryDetails({ ...selectedHistory, ...data });
    }).catch(() => { if (active) setHistoryDetailError(true); });
    return () => { active = false; };
  }, [selectedHistory, historyRetry]);

  const proposalLock = useRef(false);
  // Handle Approve / Reject Pending
  const handleDecideProposal = async (proposalId: string, approve: boolean) => {
    if (proposalLock.current) return;
    proposalLock.current = true;
    setBusyId(proposalId);
    try {
      if (approve) {
        const terms = voucherTermsById[proposalId] || defaultVipTerms;
        const result = await referralLinksService.approveExclusiveDeal(proposalId, terms);
        toast.success(result?.status === 'PENDING_ADMIN_APPROVAL' ? 'Đã chấp thuận và chuyển Admin phê duyệt.' : 'Đã chấp thuận thỏa thuận độc quyền.');
      } else {
        await referralLinksService.rejectExclusiveDeal(proposalId);
        toast.info('Đã từ chối đề xuất Deal.');
      }
      await fetchAll();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể xử lý đề xuất lúc này.');
    } finally {
      proposalLock.current = false;
      setBusyId(null);
    }
  };

  // Handle Terminate Active Deal
  const handleConfirmTerminate = async () => {
    if (!selectedDealToTerminate || submittingTerminate) return;
    setSubmittingTerminate(true);
    try {
      await referralLinksService.terminateExclusiveDeal(selectedDealToTerminate.id, {
        reason: terminateReason,
        escalateDispute,
      });
      toast.success('Đã đóng deal độc quyền.');
      setSelectedDealToTerminate(null);
      await fetchAll();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Không thể đóng deal lúc này.');
    } finally {
      setSubmittingTerminate(false);
    }
  };

  const handleReviewTermination = async (deal: any) => {
    setBusyId(deal.id);
    try {
      const progress = await referralLinksService.getDealProgress(deal.id);
      if (!progress.canTerminate) {
        toast.warning('Chưa thể đóng deal: Chưa hết chu kỳ đối soát hoặc đã đạt KPI.');
        return;
      }
      setSelectedDealToTerminate(deal);
    } catch {
      toast.error('Không kiểm tra được tiến độ KPI.');
    } finally {
      setBusyId(null);
    }
  };

  const handleCopyLink = async (deal: ActiveDealPartnerItem) => {
    if (!deal.referralLink?.shortCode) {
      toast.error('Chưa có mã liên kết tiếp thị');
      return;
    }
    const url = publicWebsiteUrl(`/r/${deal.referralLink.shortCode}`);
    try { await navigator.clipboard.writeText(url); } catch { toast.error('Không thể sao chép link. Vui lòng thử lại.'); return; }
    setCopiedId(deal.id);
    toast.success('Đã sao chép link thỏa thuận độc quyền!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered active deals
  const filteredActiveDeals = useMemo(() => {
    return activeData.deals.filter((deal) => {
      const matchSearch =
        searchQuery.trim() === '' ||
        deal.collaboratorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (deal.productTitle && deal.productTitle.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchRate =
        rateFilter === 'ALL' ||
        Number(rateFilter) === Number(deal.dealCommissionRate);

      return matchSearch && matchRate;
    });
  }, [activeData.deals, searchQuery, rateFilter]);

  // Grouped by creator for active deals
  const groupedByCreator = useMemo(() => {
    const map = new Map<string, { creator: ActiveDealPartnerItem; deals: ActiveDealPartnerItem[] }>();
    for (const deal of filteredActiveDeals) {
      const existing = map.get(deal.collaboratorId);
      if (existing) {
        existing.deals.push(deal);
      } else {
        map.set(deal.collaboratorId, {
          creator: deal,
          deals: [deal],
        });
      }
    }
    return Array.from(map.values());
  }, [filteredActiveDeals]);


  const tierBadge = (tier: string) => <span className={`inline-flex h-6 items-center gap-[5px] rounded-full border px-2 text-[11px] font-semibold ${getTierColor(tier)}`}>{/DIAMOND|KIM CƯƠNG/i.test(tier) ? <Gem size={14}/> : <Medal size={14}/>}<span>{tier}</span></span>;
  const dealRow = (deal: ActiveDealPartnerItem) => {
    const progress = deal.progress;
    const revenueKpi = Number(deal.targetRevenue ?? progress.targetRevenue ?? 0) > 0;
    const target = revenueKpi ? Number(deal.targetRevenue ?? progress.targetRevenue) : Number(deal.targetOrders ?? progress.targetOrders ?? 0);
    const completed = Number(revenueKpi ? progress.validRevenue ?? 0 : progress.completedOrders ?? 0);
    const percent = target > 0 ? Math.max(0, Math.min(100, Math.round(completed / target * 100))) : 0;
    const end = deal.commitmentEndsAt ? new Date(deal.commitmentEndsAt) : null;
    return <div className="deal-product-row" key={deal.id}>
      <div className="deal-row-product flex min-w-0 items-center gap-2.5">
        <img src={deal.productImage || '/assets/product-placeholder.svg'} onError={handleProductImageError} alt="" className="size-8 shrink-0 rounded-md border border-[#EAE4D7] bg-white object-contain"/>
        <div className="min-w-0"><strong className="line-clamp-2 text-[13px] font-semibold" title={deal.productTitle}>{deal.productTitle || 'Sản phẩm áp dụng'}</strong><span className="mt-0.5 block text-[11px] text-[#7D715E]">{deal.productPrice.toLocaleString('vi-VN')} ₫</span></div>
      </div>
      <div className="deal-row-rate text-right font-semibold tabular-nums text-[#90682F]"><span className="deal-mobile-label">Thù lao </span>{deal.dealCommissionRate}%</div>
      <div className="deal-row-kpi min-w-0 text-right tabular-nums">
        <span className="deal-mobile-label">KPI </span><strong className="text-xs font-semibold">{target > 0 ? `${completed.toLocaleString('vi-VN')}/${target.toLocaleString('vi-VN')} ${revenueKpi ? '₫' : 'đơn'}` : 'Không giới hạn KPI'}</strong>
        {target > 0 && <div className="mt-1.5 flex items-center gap-2"><progress aria-label={`Tiến độ KPI ${deal.productTitle}`} max={100} value={percent} className="deal-kpi-progress"/><span className="text-[10px] text-[#7D715E]">{percent}%</span></div>}
        <small className="mt-1 block text-[11px] text-[#7D715E]">Doanh số: {(progress.validRevenue ?? 0).toLocaleString('vi-VN')} ₫</small>
      </div>
      <div className="deal-row-deadline text-right text-xs"><span className="deal-mobile-label">Thời hạn </span>{end && !Number.isNaN(end.getTime()) ? <time dateTime={deal.commitmentEndsAt}>{end.toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})}</time> : <span className="text-[#7D715E]">Chưa xác định</span>}{deal.isExpired && <small className="mt-1 block text-[#D97706]">Đã hết hạn</small>}</div>
      <div className="deal-row-actions flex items-center justify-end gap-2">
        <button type="button" title="Sao chép link" aria-label={`Sao chép link ${deal.productTitle}`} onClick={()=>void handleCopyLink(deal)} className="grid size-8! place-items-center rounded-lg! border border-[#EAE4D7] bg-white text-[#90682F] hover:bg-[#FBF5EB]">{copiedId===deal.id?<Check size={15}/>:<Copy size={15}/>}</button>
        <details className="relative"><summary aria-label={`Thao tác ${deal.productTitle}`} title="Thao tác" className="grid size-8! cursor-pointer list-none place-items-center rounded-lg! border border-[#EAE4D7] bg-white text-[#7D715E]"><MoreHorizontal size={16}/></summary><div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-lg border border-[#EAE4D7] bg-white p-1 shadow-lg"><button type="button" disabled={busyId===deal.id} onClick={event=>{event.currentTarget.closest('details')?.removeAttribute('open');void handleReviewTermination(deal);}} className="w-full rounded-md px-3 py-2 text-left text-xs text-[#DC2626] hover:bg-[#FAF8F5] disabled:opacity-40">{busyId===deal.id?'Đang kiểm tra…':'Đóng Deal do vi phạm cam kết'}</button></div></details>
      </div>
    </div>;
  };
  const rowHead = <div className="deal-product-head"><span>Sản phẩm</span><span>Thù lao</span><span>KPI & doanh số</span><span>Ngày kết thúc</span><span>Thao tác</span></div>;

  return (
    <div className="shop-active-deals space-y-4 animate-in fade-in-50 duration-200">
      {loadError && <div role="alert" className="rounded-xl border border-[#EEDFC6] bg-white p-4 text-sm text-[#DC2626]">
        {loadError} Dữ liệu đang hiển thị có thể chưa được cập nhật.
        <button type="button" disabled={loading} onClick={() => void fetchAll()} className="ml-2 inline-flex min-h-11 items-center font-semibold underline">Thử lại</button>
      </div>}
      <div className="deal-state-toolbar">
        <div className="deal-status-tabs" role="group" aria-label="Trạng thái Deal">
          {([
            ['ACTIVE', 'Hiệu lực', activeData.totalActiveDeals],
            ['PENDING', 'Chờ duyệt', pendingProposals.length],
            ['HISTORY', 'Lịch sử', historyProposals.length],
          ] as const).map(([status, label, count]) => (
            <button key={status} type="button" aria-pressed={activeSubTab === status} onClick={() => setActiveSubTab(status)}>
              {label} <span className={`tabular-nums ${status === 'PENDING' && count > 0 ? 'font-bold text-[#B88E4F]' : ''}`}>{count}</span>
            </button>
          ))}
        </div>
        <div className="deal-active-toolbar">
          <label className="relative block min-w-0">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#7D715E]" />
            <input
              type="search"
              aria-label="Tìm KOL, sản phẩm"
              placeholder="Tìm KOL, sản phẩm…"
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              className="w-full min-w-0 rounded-lg border border-[#EAE4D7] bg-white pl-9 pr-2 text-xs focus:border-[#C59B58] focus:outline-none"
            />
          </label>
          {activeSubTab === 'ACTIVE' && (
            <div className="deal-rate-filter">
              <select aria-label="Lọc mức thù lao" value={rateFilter} onChange={event => setRateFilter(event.target.value)}
                className="w-full rounded-lg border border-[#EAE4D7] bg-white text-xs text-[#1A1612] focus:border-[#C59B58] focus:outline-none">
                <option value="ALL">Thù lao</option>
                {Array.from({ length: 16 }, (_, index) => index + 10).map(rate => <option key={rate} value={String(rate)}>{rate}%</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {activeSubTab === 'ACTIVE' && (
        <div>
          {loading ? (
            <div className="rounded-xl border border-[#EAE4D7] bg-white py-12 px-6 text-center text-xs text-[#7D715E] flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 text-[#C59B58] animate-spin" />
              <span>Đang tải danh sách...</span>
            </div>
          ) : filteredActiveDeals.length === 0 ? (
            <div className="rounded-xl border border-[#EAE4D7] bg-white py-12 px-6 text-center text-xs text-[#7D715E]">
              {loadError ? 'Chưa xác định được danh sách thỏa thuận.' : 'Chưa có thỏa thuận phù hợp.'}
            </div>
          ) : (
            <div className="deal-creator-list">
              {groupedByCreator.map(({creator,deals})=><section key={creator.collaboratorId} className="deal-creator-group">
                <header className="flex items-center justify-between gap-3 border-b border-[#EAE4D7] bg-[#FAF8F5] px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full border border-[#EAE4D7] bg-[#F3EFE6] text-xs text-[#90682F]">{creator.collaboratorAvatar?<img src={creator.collaboratorAvatar} onError={handleAvatarImageError} alt="" className="size-full object-cover"/>:creator.collaboratorName.charAt(0)}</div>
                    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="text-[13px] font-semibold">{creator.collaboratorName}</strong>{tierBadge(creator.collaboratorTier)}<span className="text-[11px] text-[#7D715E]">{new Set(deals.map(deal=>deal.productId)).size} sản phẩm · {deals.length} Deal</span></div>
                      {creator.primaryChannel && <div className="mt-1 flex items-center gap-1 text-[11px] text-[#7D715E]"><SocialIcon platform={creator.primaryChannel.platformName} className="size-3"/><span>{creator.primaryChannel.platformName} · {creator.primaryChannel.channelName || 'Kênh KOL'}{creator.primaryChannel.followerCount != null && <> · {creator.primaryChannel.followerCount.toLocaleString('vi-VN')} người theo dõi</>}</span></div>}
                    </div>
                  </div>
                  {onSelectKolForChat && <button type="button" onClick={()=>onSelectKolForChat(creator.collaboratorId)} className="inline-flex h-[34px]! shrink-0 items-center gap-1.5 rounded-lg! border border-[#EEDFC6] bg-white px-3 text-xs text-[#79592C]"><MessageSquare size={14}/>Nhắn tin</button>}
                </header>
                {rowHead}{deals.map(deal=>dealRow(deal))}
              </section>)}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PENDING PROPOSALS                                                  */}
      {/* ========================================================================= */}
      {activeSubTab === 'PENDING' && (
        <div className="space-y-3">
          {visiblePending.length === 0 ? (
            <div className="rounded-xl border border-[#EAE4D7] bg-white py-12 px-6 text-center text-xs text-[#7D715E]">
              {loadError ? 'Chưa tải được đề xuất đang chờ duyệt.' : loading ? 'Đang tải đề xuất…' : proposalQuery ? 'Không có đề xuất phù hợp.' : 'Hiện không có đề xuất nào đang chờ duyệt.'}
            </div>
          ) : (
            <div className="space-y-3">
              {visiblePending.map((item) => {
                const terms = voucherTermsById[item.id] || defaultVipTerms;
                return (
                  <div
                    key={item.id}
                    className="deal-proposal-card rounded-xl border border-[#EAE4D7] bg-white p-4 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAE4D7] pb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7] overflow-hidden shrink-0 flex items-center justify-center">
                          {item.product?.imageUrl ? (
                            <img src={item.product.imageUrl} onError={handleProductImageError} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <ShoppingBag className="w-4 h-4 text-[#B88E4F]" />
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-[#1A1612] m-0">
                            {item.product?.title || 'Sản phẩm'}
                          </h4>
                          <span className="text-[11px] text-[#7D715E]">
                            <strong className="text-[#1A1612]">{item.collaborator?.fullName || item.collaboratorName || '—'}</strong> · {item.product?.price != null ? `${Number(item.product.price).toLocaleString('vi-VN')} ₫` : '—'}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span className="block text-[11px] text-[#7D715E]">Thù lao đề xuất</span>
                        <strong className="text-xl font-bold text-[#90682F] tabular-nums">{item.proposedCommissionRate}%</strong>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-[#EAE4D7] text-xs">
                      <div className="pr-3"><span className="block text-[11px] text-[#7D715E]">KPI cam kết</span>
                        <strong className="mt-1 block font-semibold tabular-nums">{item.targetRevenue != null ? `${Number(item.targetRevenue).toLocaleString('vi-VN')} ₫` : item.targetOrders != null ? `${item.targetOrders.toLocaleString('vi-VN')} đơn` : 'Chưa xác định'}</strong>
                      </div>
                      <div className="pl-3"><span className="block text-[11px] text-[#7D715E]">Thời hạn Deal</span><strong className="mt-1 block font-semibold">{item.commitmentDays != null ? `${item.commitmentDays} ngày` : 'Chưa xác định'}</strong></div>
                    </div>
                    {item.salesCommitment && <div className="text-xs leading-relaxed"><span className="mb-1 block text-[11px] text-[#7D715E]">Điều khoản</span><p className="whitespace-pre-wrap break-words text-[#1A1612]">{item.salesCommitment}</p></div>}

                    {/* Voucher Terms Config */}
                    <div className="border-t border-[#EAE4D7] pt-3 space-y-2">
                      <span className="text-xs font-bold text-[#1A1612] block">
                        Voucher độc quyền
                      </span>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <label className="flex flex-col gap-1 text-[11px] text-[#7D715E]">
                          Giảm (%)
                          <input
                            type="number" disabled={busyId !== null}
                            min={1}
                            max={20}
                            value={terms.discountPercent === 0 ? '' : (terms.discountPercent ?? '')}
                            onChange={(e) =>
                              setVoucherTermsById((curr) => ({
                                ...curr,
                                [item.id]: { ...terms, discountPercent: e.target.value === '' ? ('' as unknown as number) : Number(e.target.value) },
                              }))
                            }
                            className="h-[38px]! w-full min-w-0 rounded-lg! border border-[#EAE4D7] bg-white px-3 py-0 text-xs tabular-nums"
                          />
                        </label>

                        <label className="flex flex-col gap-1 text-[11px] text-[#7D715E]">
                          Đơn tối thiểu (₫)
                          <input
                            type="text" inputMode="numeric" disabled={busyId !== null}
                            min={0}
                            step={10000}
                            value={String(terms.minimumOrderAmount) === '' || terms.minimumOrderAmount == null ? '' : Number(terms.minimumOrderAmount).toLocaleString('vi-VN')}
                            onChange={(e) =>
                              setVoucherTermsById((curr) => ({
                                ...curr,
                                [item.id]: { ...terms, minimumOrderAmount: e.target.value.replace(/\D/g, '') === '' ? ('' as unknown as number) : Number(e.target.value.replace(/\D/g, '')) },
                              }))
                            }
                            className="h-[38px]! w-full min-w-0 rounded-lg! border border-[#EAE4D7] bg-white px-3 py-0 text-xs tabular-nums"
                          />
                        </label>

                        <label className="flex flex-col gap-1 text-[11px] text-[#7D715E]">
                          Giảm tối đa (₫)
                          <input
                            type="text" inputMode="numeric" disabled={busyId !== null}
                            min={1000}
                            step={5000}
                            value={String(terms.maximumDiscountAmount) === '' || terms.maximumDiscountAmount == null ? '' : Number(terms.maximumDiscountAmount).toLocaleString('vi-VN')}
                            onChange={(e) =>
                              setVoucherTermsById((curr) => ({
                                ...curr,
                                [item.id]: { ...terms, maximumDiscountAmount: e.target.value.replace(/\D/g, '') === '' ? ('' as unknown as number) : Number(e.target.value.replace(/\D/g, '')) },
                              }))
                            }
                            className="h-[38px]! w-full min-w-0 rounded-lg! border border-[#EAE4D7] bg-white px-3 py-0 text-xs tabular-nums"
                          />
                        </label>

                        <label className="flex flex-col gap-1 text-[11px] text-[#7D715E]">
                          Lượt dùng
                          <input
                            type="number" disabled={busyId !== null}
                            min={1}
                            value={terms.usageLimitTotal === 0 ? '' : (terms.usageLimitTotal ?? '')}
                            onChange={(e) =>
                              setVoucherTermsById((curr) => ({
                                ...curr,
                                [item.id]: { ...terms, usageLimitTotal: e.target.value === '' ? ('' as unknown as number) : Number(e.target.value) },
                              }))
                            }
                            className="h-[38px]! w-full min-w-0 rounded-lg! border border-[#EAE4D7] bg-white px-3 py-0 text-xs tabular-nums"
                          />
                        </label>

                        <label className="flex flex-col gap-1 text-[11px] text-[#7D715E]">
                          Ngân sách (₫)
                          <input
                            type="text" inputMode="numeric" disabled={busyId !== null}
                            min={10000}
                            step={100000}
                            value={String(terms.budgetTotal) === '' || terms.budgetTotal == null ? '' : Number(terms.budgetTotal).toLocaleString('vi-VN')}
                            onChange={(e) =>
                              setVoucherTermsById((curr) => ({
                                ...curr,
                                [item.id]: { ...terms, budgetTotal: e.target.value.replace(/\D/g, '') === '' ? ('' as unknown as number) : Number(e.target.value.replace(/\D/g, '')) },
                              }))
                            }
                            className="h-[38px]! w-full min-w-0 rounded-lg! border border-[#EAE4D7] bg-white px-3 py-0 text-xs tabular-nums"
                          />
                        </label>

                        <label className="flex flex-col gap-1 text-[11px] text-[#7D715E]">
                          Hiệu lực voucher (ngày)
                          <input
                            type="number" disabled={busyId !== null}
                            min={1}
                            max={365}
                            value={terms.validDays === 0 ? '' : (terms.validDays ?? '')}
                            onChange={(e) =>
                              setVoucherTermsById((curr) => ({
                                ...curr,
                                [item.id]: { ...terms, validDays: e.target.value === '' ? ('' as unknown as number) : Number(e.target.value) },
                              }))
                            }
                            className="h-[38px]! w-full min-w-0 rounded-lg! border border-[#EAE4D7] bg-white px-3 py-0 text-xs tabular-nums"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="deal-proposal-actions flex flex-wrap items-center justify-end gap-2 border-t border-[#EAE4D7] pt-3">
                      {onSelectKolForChat && (
                        <button
                          type="button"
                          onClick={() => item.collaboratorId && onSelectKolForChat(item.collaboratorId)}
                          className="mr-auto flex items-center gap-1 px-3 rounded-lg border border-[#EAE4D7] bg-white text-xs font-semibold text-[#655A49] hover:bg-[#FAF8F5]"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Nhắn tin</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() => handleDecideProposal(item.id, false)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#EAE4D7] bg-white text-[#DC2626] text-xs font-bold hover:bg-neutral-50 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Từ chối</span>
                      </button>

                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() => handleDecideProposal(item.id, true)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-[#231D15] text-xs font-bold transition shadow-2xs cursor-pointer"
                      >
                        {busyId === item.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>{busyId === item.id ? 'Đang xử lý…' : item.proposedCommissionRate > 16 ? 'Chấp thuận & trình Admin' : 'Phê duyệt'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: HISTORY DEALS                                                      */}
      {/* ========================================================================= */}
      {activeSubTab === 'HISTORY' && (
        <div className="space-y-3">
          {visibleHistory.length === 0 ? (
            <div className="rounded-xl border border-[#EAE4D7] bg-white py-12 px-6 text-center text-xs text-[#7D715E]">
              {loadError ? 'Chưa tải được lịch sử hợp đồng.' : 'Không có lịch sử hợp đồng nào.'}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-[#EAE4D7] bg-white">
              <div className="overflow-x-auto">
                <table className="deal-history-table w-full table-fixed border-collapse text-left text-xs">
                  <colgroup><col className="w-[20%]"/><col className="w-[43%]"/><col className="w-[9%]"/><col className="w-[15%]"/><col className="w-[13%]"/></colgroup>
                  <thead><tr className="border-b border-[#EAE4D7] bg-[#FAF8F5] text-[11px] text-[#7D715E]">
                    <th className="px-4 py-3 font-medium">KOL</th><th className="px-3 py-3 font-medium">Sản phẩm</th><th className="px-3 py-3 text-right font-medium">Thù lao</th><th className="px-3 py-3 font-medium">Kết quả</th><th className="px-4 py-3 text-right font-medium">Cập nhật</th>
                  </tr></thead>
                  <tbody className="divide-y divide-[#EAE4D7]">
                    {pageHistory.map(item => <tr key={item.id} className="cursor-pointer transition-colors hover:bg-[#FBF5EB]/50" onClick={() => setSelectedHistory(item)}>
                      <td className="px-4 py-3"><button type="button" onClick={() => setSelectedHistory(item)} className="flex min-h-10 w-full min-w-0 items-center gap-2 text-left" aria-label={`Xem Deal của ${item.collaborator?.fullName || item.collaboratorName || 'KOL'}`}>
                        <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full border border-[#EAE4D7] bg-[#F3EFE6] text-[11px] text-[#90682F]">{item.collaborator?.collaboratorProfile?.avatarUrl ? <img src={item.collaborator.collaboratorProfile.avatarUrl} onError={handleAvatarImageError} alt="" className="size-full object-cover"/> : (item.collaborator?.fullName || item.collaboratorName || 'K').charAt(0)}</span>
                        <strong className="min-w-0 break-words text-[13px] font-semibold">{item.collaborator?.fullName || item.collaboratorName || 'KOL'}</strong>
                      </button></td>
                      <td className="px-3 py-3"><div className="flex min-w-0 items-center gap-2"><img src={item.product?.imageUrl || '/assets/product-placeholder.svg'} onError={handleProductImageError} alt="" className="size-8 shrink-0 rounded-md border border-[#EAE4D7] bg-white object-contain"/><span className="line-clamp-2 text-[13px]">{item.scopeType === 'STORE_WIDE' ? 'Toàn cửa hàng' : item.product?.title || item.productTitle || 'Sản phẩm trong Deal'}</span></div></td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums text-[#90682F]">{item.approvedCommissionRate ?? item.proposedCommissionRate}%</td>
                      <td className="px-3 py-3"><span className="inline-flex rounded-md border border-[#EAE4D7] bg-[#F3EFE6] px-2 py-1 text-[11px] text-[#655A49]">{historyDealState(item)}</span></td>
                      <td className="px-4 py-3 text-right text-[11px] tabular-nums text-[#7D715E]">{dealDate(item.updatedAt)}</td>
                    </tr>)}
                  </tbody>
                </table>
              </div>
              {historyPages > 1 && <nav aria-label="Phân trang lịch sử Deal" className="flex items-center justify-between gap-2 border-t border-[#EAE4D7] px-4 py-3 text-xs text-[#7D715E]">
                <span>{(safeHistoryPage - 1) * 10 + 1}–{Math.min(safeHistoryPage * 10, visibleHistory.length)} / {visibleHistory.length} Deal</span>
                <div className="flex items-center gap-3"><button type="button" disabled={safeHistoryPage === 1} onClick={() => setHistoryPage(safeHistoryPage - 1)} className="h-8 rounded-lg border border-[#EAE4D7] px-3 disabled:opacity-40">Trước</button><span>{safeHistoryPage}/{historyPages}</span><button type="button" disabled={safeHistoryPage === historyPages} onClick={() => setHistoryPage(safeHistoryPage + 1)} className="h-8 rounded-lg border border-[#EAE4D7] px-3 disabled:opacity-40">Sau</button></div>
              </nav>}
            </div>
          )}
        </div>
      )}

      <Modal isOpen={!!selectedHistory} onClose={() => setSelectedHistory(null)} title="Chi tiết Deal" maxWidth="2xl" stickyHeader>
        {selectedHistory && <div className="space-y-4 text-sm">
          <div className="flex items-start gap-3"><img src={selectedHistory.product?.imageUrl || '/assets/product-placeholder.svg'} onError={handleProductImageError} alt="" className="size-10 shrink-0 rounded-lg border border-[#EAE4D7] object-contain"/><div><strong>{selectedHistory.product?.title || selectedHistory.productTitle || 'Sản phẩm trong Deal'}</strong><p className="mt-1 text-xs text-[#7D715E]">{selectedHistory.collaborator?.fullName || selectedHistory.collaboratorName || 'KOL'} · {historyDealState(selectedHistory)}</p></div></div>
          <dl className="grid grid-cols-2 gap-4 border-y border-[#EAE4D7] py-4">
            {[
              ['Thù lao', `${selectedHistory.approvedCommissionRate ?? selectedHistory.proposedCommissionRate}%`],
              ['KPI cam kết', selectedHistory.targetRevenue != null ? `${Number(selectedHistory.targetRevenue).toLocaleString('vi-VN')} ₫` : selectedHistory.targetOrders != null ? `${selectedHistory.targetOrders} đơn` : 'Chưa xác định'],
              ['Thời hạn Deal', selectedHistory.commitmentDays != null ? `${selectedHistory.commitmentDays} ngày` : 'Chưa xác định'],
              ['Ngày đề xuất', dealDate(selectedHistory.createdAt)], ['Ngày kết thúc cam kết', dealDate(selectedHistory.commitmentEndsAt)], ['Ngày đóng', dealDate(selectedHistory.closedAt)], ['Cập nhật', dealDate(selectedHistory.updatedAt)],
            ].map(([label, value]) => <div key={label}><dt className="text-xs text-[#7D715E]">{label}</dt><dd className="mt-1 font-medium tabular-nums">{value}</dd></div>)}
          </dl>
          {(historyDetails || selectedHistory).salesCommitment && <div><span className="text-xs text-[#7D715E]">Điều khoản</span><p className="mt-1 whitespace-pre-wrap break-words">{(historyDetails || selectedHistory).salesCommitment}</p></div>}
          {(historyDetails || selectedHistory).shopResponse && <div><span className="text-xs text-[#7D715E]">Phản hồi / Lý do xử lý</span><p className="mt-1 whitespace-pre-wrap break-words">{(historyDetails || selectedHistory).shopResponse}</p></div>}
          {!historyDetails && !historyDetailError && <p role="status" className="text-xs text-[#7D715E]">Đang tải thông tin voucher…</p>}
          {historyDetailError && <p role="alert" className="text-xs text-[#DC2626]">Chưa tải được chi tiết bổ sung. <button type="button" onClick={() => setHistoryRetry(value => value + 1)} className="underline">Thử lại</button></p>}
          {historyDetails && <div className="border-t border-[#EAE4D7] pt-3"><h4 className="font-semibold">Voucher độc quyền</h4><p className="mt-1 break-all text-xs">{historyDetails.vipVoucherCode || historyDetails.referralLink?.customCouponCode || 'Chưa ghi nhận mã voucher'}</p>
            {historyDetails.couponTerms && <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">{[
              ['Giảm', 'discountPercent', '%'], ['Đơn tối thiểu', 'minimumOrderAmount', ' ₫'], ['Giảm tối đa', 'maximumDiscountAmount', ' ₫'], ['Lượt dùng', 'usageLimitTotal', ''], ['Ngân sách', 'budgetTotal', ' ₫'], ['Hiệu lực voucher', 'validDays', ' ngày'],
            ].map(([label, key, unit]) => <div key={key}><dt className="text-[#7D715E]">{label}</dt><dd className="mt-1 tabular-nums">{historyDetails.couponTerms?.[key] != null ? `${Number(historyDetails.couponTerms[key]).toLocaleString('vi-VN')}${unit}` : '—'}</dd></div>)}</dl>}
          </div>}
        </div>}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: TERMINATION CONFIRMATION                                           */}
      {/* ========================================================================= */}
      {selectedDealToTerminate && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-[#231D15]/50 p-4 backdrop-blur-xs animate-in fade-in"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !submittingTerminate) setSelectedDealToTerminate(null);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-[#EAE4D7] bg-white shadow-2xl overflow-hidden text-left">
            <div className="flex items-center justify-between gap-4 border-b border-[#EAE4D7] px-5 py-3.5 bg-[#FAF8F5]">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-600" />
                <h3 className="text-sm font-black text-[#1A1612]">Xác Nhận Đóng Deal</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDealToTerminate(null)}
                disabled={submittingTerminate}
                className="rounded-lg p-1 text-[#7D715E] hover:bg-[#F3EFE6] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] p-3 space-y-1">
                <div className="font-bold text-[#1A1612]">
                  {selectedDealToTerminate.productTitle || selectedDealToTerminate.product?.title}
                </div>
                <div className="text-[#7D715E]">
                  KOL: <strong className="text-[#1A1612]">{selectedDealToTerminate.collaboratorName || selectedDealToTerminate.collaborator?.fullName}</strong>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1A1612] block mb-1">
                  Lý do đóng deal:
                </label>
                <textarea
                  rows={2}
                  value={terminateReason}
                  onChange={(e) => setTerminateReason(e.target.value)}
                  className="w-full rounded-lg border border-[#EAE4D7] bg-white p-2.5 text-xs text-[#1A1612] focus:outline-hidden focus:border-[#C59B58]"
                  placeholder="Nhập lý do..."
                />
              </div>

              <label className="flex items-start gap-2 cursor-pointer bg-[#FAF8F5] p-2.5 rounded-lg border border-[#EAE4D7]">
                <input
                  type="checkbox"
                  checked={escalateDispute}
                  onChange={(e) => setEscalateDispute(e.target.checked)}
                  className="mt-0.5 rounded border-[#EAE4D7] text-[#C59B58] focus:ring-[#C59B58]"
                />
                <span className="text-[11px] text-[#7D715E]">
                  Gửi khiếu nại lên Ban Quản Trị Sàn để thẩm định vi phạm cam kết.
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[#EAE4D7] px-5 py-3 bg-[#FAF8F5]">
              <button
                type="button"
                onClick={() => setSelectedDealToTerminate(null)}
                disabled={submittingTerminate}
                className="px-3 py-1.5 rounded-lg border border-[#EAE4D7] bg-white text-xs font-bold text-[#7D715E] cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={submittingTerminate}
                onClick={handleConfirmTerminate}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50"
              >
                {submittingTerminate && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Đóng deal</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
