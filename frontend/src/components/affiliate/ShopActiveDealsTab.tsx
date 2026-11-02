import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  UserCheck,
  FileCheck,
  Percent,
  Coins,
  CheckCircle2,
  Clock,
  Archive,
  MessageSquare,
  Copy,
  Check,
  RotateCcw,
  Search,
  Filter,
  Layers,
  Table as TableIcon,
  ShoppingBag,
  Ban,
  X,
  Loader2,
  Inbox,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react';
import { analyticsService, type ActiveDealPartnerItem } from '../../services/analytics.service';
import { referralLinksService, type ExclusiveDealProposal } from '../../services/referral-links.service';
import { toast } from '../../utils/toast';

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
type VipTerms = typeof defaultVipTerms;

export default function ShopActiveDealsTab({ onSelectKolForChat }: Props) {
  // Main Tab: 'ACTIVE' | 'PENDING' | 'HISTORY'
  const [activeSubTab, setActiveSubTab] = useState<'ACTIVE' | 'PENDING' | 'HISTORY'>('ACTIVE');

  // Active Deals Data
  const [activeData, setActiveData] = useState<{
    totalPartners: number;
    totalActiveDeals: number;
    averageCommissionRate: number;
    deals: ActiveDealPartnerItem[];
  }>({
    totalPartners: 0,
    totalActiveDeals: 0,
    averageCommissionRate: 10,
    deals: [],
  });

  // All Proposals from backend (including pending & history)
  const [allProposals, setAllProposals] = useState<ExclusiveDealProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filters for active view
  const [searchQuery, setSearchQuery] = useState('');
  const [rateFilter, setRateFilter] = useState<string>('ALL');
  const [displayMode, setDisplayMode] = useState<'CREATOR' | 'TABLE'>('CREATOR');

  // Processing & Terminate states
  const [busyId, setBusyId] = useState<string | null>(null);
  const [voucherTermsById, setVoucherTermsById] = useState<Record<string, VipTerms>>({});
  const [selectedDealToTerminate, setSelectedDealToTerminate] = useState<any | null>(null);
  const [terminateReason, setTerminateReason] = useState('KOL không đạt chỉ tiêu đơn hàng/doanh số sau chu kỳ cam kết');
  const [escalateDispute, setEscalateDispute] = useState(false);
  const [submittingTerminate, setSubmittingTerminate] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [activeRes, proposalsRes] = await Promise.all([
        analyticsService.getShopActivePartners(true),
        referralLinksService.getShopExclusiveDeals(),
      ]);

      setActiveData({
        totalPartners: activeRes.totalPartners || 0,
        totalActiveDeals: activeRes.totalActiveDeals || 0,
        averageCommissionRate: activeRes.averageCommissionRate || 10,
        deals: activeRes.deals || [],
      });

      setAllProposals(proposalsRes || []);
    } catch (err) {
      console.error('Lỗi tải dữ liệu thỏa thuận độc quyền:', err);
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
      return p.status === 'REJECTED' || isTerminated || !p.isCurrentDeal || !!p.closedAt;
    });
  }, [allProposals]);

  // Handle Approve / Reject Pending
  const handleDecideProposal = async (proposalId: string, approve: boolean) => {
    setBusyId(proposalId);
    try {
      if (approve) {
        const terms = voucherTermsById[proposalId] || defaultVipTerms;
        await referralLinksService.approveExclusiveDeal(proposalId, terms);
        toast.success('Đã chấp thuận Thỏa thuận Độc quyền và kích hoạt link tiếp thị.');
      } else {
        await referralLinksService.rejectExclusiveDeal(proposalId);
        toast.info('Đã từ chối đề xuất Deal.');
      }
      await fetchAll();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể xử lý đề xuất lúc này.');
    } finally {
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

  const handleCopyLink = (deal: ActiveDealPartnerItem) => {
    if (!deal.referralLink?.shortCode) {
      toast.error('Chưa có mã liên kết tiếp thị');
      return;
    }
    const url = `${window.location.origin}/r/${deal.referralLink.shortCode}`;
    navigator.clipboard.writeText(url);
    setCopiedId(deal.id);
    toast.success('Đã sao chép link thỏa thuận độc quyền!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const totalRevenue = useMemo(() => {
    return (activeData.deals || []).reduce((sum, d) => sum + (d.progress?.validRevenue || 0), 0);
  }, [activeData.deals]);

  // Filtered active deals
  const filteredActiveDeals = useMemo(() => {
    return activeData.deals.filter((deal) => {
      const matchSearch =
        searchQuery.trim() === '' ||
        deal.collaboratorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (deal.productTitle && deal.productTitle.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchRate =
        rateFilter === 'ALL' ||
        (rateFilter === '11' && deal.dealCommissionRate === 11) ||
        (rateFilter === '12' && deal.dealCommissionRate === 12) ||
        (rateFilter === '13' && deal.dealCommissionRate === 13);

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



  return (
    <div className="space-y-4 animate-in fade-in-50 duration-200">
      {/* 1. Top Priority Alert: PENDING PROPOSALS (If any) */}
      {pendingProposals.length > 0 && activeSubTab !== 'PENDING' && (
        <div className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3 shadow-2xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Inbox className="w-4 h-4 text-[#B88E4F]" />
            <span className="text-xs font-bold text-[#1A1612]">
              Có {pendingProposals.length} đề xuất Thỏa thuận Độc quyền từ đối tác đang chờ duyệt
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveSubTab('PENDING')}
            className="px-3 py-1 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-[#231D15] text-xs font-bold transition shadow-2xs cursor-pointer shrink-0"
          >
            Xem ngay
          </button>
        </div>
      )}

      {/* 3. Top Metrics Row (Clean, Crisp, Professional Icons, No Verbose Subtexts) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-[#EEDFC6] bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#7D715E]">
              KOL Đối Tác
            </span>
            <UserCheck className="h-4 w-4 text-[#B88E4F]" />
          </div>
          <div className="text-2xl font-black text-[#1A1612]">
            {activeData.totalPartners}
          </div>
        </div>

        <div className="rounded-xl border border-[#EEDFC6] bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#7D715E]">
              Hợp Đồng Hiệu Lực
            </span>
            <FileCheck className="h-4 w-4 text-[#B88E4F]" />
          </div>
          <div className="text-2xl font-black text-[#1A1612]">
            {activeData.totalActiveDeals}
          </div>
        </div>

        <div className="rounded-xl border border-[#EEDFC6] bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#7D715E]">
              Hoa Hồng Deal TB
            </span>
            <Percent className="h-4 w-4 text-[#B88E4F]" />
          </div>
          <div className="text-2xl font-black text-[#B88E4F]">
            {activeData.averageCommissionRate}%
          </div>
        </div>

        <div className="rounded-xl border border-[#EEDFC6] bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#7D715E]">
              Doanh Số Từ Deal
            </span>
            <Coins className="h-4 w-4 text-[#B88E4F]" />
          </div>
          <div className="text-2xl font-black text-[#1A1612]">
            {totalRevenue.toLocaleString('vi-VN')} ₫
          </div>
        </div>
      </div>

      {/* 3. Unified Sub-Tabs Navigation (Sharp Icons, Compact) */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EAE4D7] pb-2.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveSubTab('ACTIVE')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'ACTIVE'
                ? 'bg-[#C59B58] text-[#231D15] shadow-2xs'
                : 'text-[#7D715E] hover:text-[#1A1612] hover:bg-[#FAF8F5]'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Đang hiệu lực ({activeData.totalActiveDeals})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('PENDING')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'PENDING'
                ? 'bg-[#C59B58] text-[#231D15] shadow-2xs'
                : 'text-[#7D715E] hover:text-[#1A1612] hover:bg-[#FAF8F5]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Đề xuất chờ duyệt</span>
            {pendingProposals.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-black">
                {pendingProposals.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('HISTORY')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'HISTORY'
                ? 'bg-[#C59B58] text-[#231D15] shadow-2xs'
                : 'text-[#7D715E] hover:text-[#1A1612] hover:bg-[#FAF8F5]'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Lịch sử & Đã đóng ({historyProposals.length})</span>
          </button>
        </div>

        <button
          type="button"
          onClick={fetchAll}
          className="flex items-center gap-1.5 rounded-xl border border-[#EAE4D7] bg-white hover:bg-[#FBF5EB] hover:border-[#C59B58] px-3 py-1.5 text-xs font-bold text-[#1A1612] transition cursor-pointer shadow-2xs shrink-0"
          title="Làm mới dữ liệu thỏa thuận"
        >
          <RotateCcw className={`w-3.5 h-3.5 text-[#B88E4F] ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ACTIVE DEALS                                                       */}
      {/* ========================================================================= */}
      {activeSubTab === 'ACTIVE' && (
        <div className="space-y-3.5">
          {/* Controls Bar: Search, Filters & View Toggle */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-[#FAF8F5] p-2.5 rounded-xl border border-[#EAE4D7]">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7D715E]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo KOL, sản phẩm..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#EAE4D7] bg-white text-xs text-[#1A1612] placeholder-[#7D715E]/70 focus:outline-hidden focus:border-[#C59B58] transition"
                />
              </div>

              <div className="flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-[#7D715E]" />
                <select
                  value={rateFilter}
                  onChange={(e) => setRateFilter(e.target.value)}
                  className="rounded-lg border border-[#EAE4D7] bg-white px-2.5 py-1.5 text-xs font-medium text-[#1A1612] focus:outline-hidden focus:border-[#C59B58] transition cursor-pointer"
                >
                  <option value="ALL">Tất cả mức Deal</option>
                  <option value="11">Deal 11%</option>
                  <option value="12">Deal 12%</option>
                  <option value="13">Deal 13%</option>
                </select>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 self-end sm:self-auto bg-white p-0.5 rounded-lg border border-[#EAE4D7]">
              <button
                type="button"
                onClick={() => setDisplayMode('CREATOR')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                  displayMode === 'CREATOR'
                    ? 'bg-[#C59B58] text-[#231D15] shadow-2xs'
                    : 'text-[#7D715E] hover:text-[#1A1612]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Theo KOL ({groupedByCreator.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('TABLE')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                  displayMode === 'TABLE'
                    ? 'bg-[#C59B58] text-[#231D15] shadow-2xs'
                    : 'text-[#7D715E] hover:text-[#1A1612]'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Bảng ({filteredActiveDeals.length})</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="rounded-xl border border-[#EAE4D7] bg-white py-12 px-6 text-center text-xs text-[#7D715E] flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 text-[#C59B58] animate-spin" />
              <span>Đang tải danh sách...</span>
            </div>
          ) : filteredActiveDeals.length === 0 ? (
            <div className="rounded-xl border border-[#EAE4D7] bg-white py-12 px-6 text-center text-xs text-[#7D715E]">
              Không có thỏa thuận nào phù hợp với bộ lọc.
            </div>
          ) : displayMode === 'CREATOR' ? (
            /* Sub-view 1A: Grouped By Creator */
            <div className="space-y-3">
              {groupedByCreator.map(({ creator, deals }) => (
                <div
                  key={creator.collaboratorId}
                  className="rounded-xl border border-[#EEDFC6] bg-white shadow-2xs overflow-hidden"
                >
                  {/* Creator Card Header */}
                  <div className="border-b border-[#EAE4D7] bg-[#FAF8F5]/80 p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#F3EFE6] border border-[#EEDFC6] overflow-hidden shrink-0 flex items-center justify-center text-[#B88E4F] font-bold text-xs">
                        {creator.collaboratorAvatar ? (
                          <img
                            src={creator.collaboratorAvatar}
                            alt={creator.collaboratorName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          creator.collaboratorName.charAt(0)
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <strong className="text-xs font-bold text-[#1A1612]">
                            {creator.collaboratorName}
                          </strong>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${getTierColor(creator.collaboratorTier)}`}>
                            {creator.collaboratorTier}
                          </span>
                          <span className="text-[11px] text-[#7D715E]">
                            • {deals.length} sản phẩm
                          </span>
                        </div>

                        {creator.primaryChannel && (
                          <div className="flex items-center gap-1 text-[11px] text-[#7D715E] mt-0.5">
                            <SocialIcon platform={creator.primaryChannel.platformName} className="w-3 h-3" />
                            <span>
                              {creator.primaryChannel.platformName}: {creator.primaryChannel.channelName || 'Kênh KOL'} ({creator.primaryChannel.followerCount?.toLocaleString()})
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Creator Header Actions */}
                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                      {onSelectKolForChat && (
                        <button
                          type="button"
                          onClick={() => onSelectKolForChat(creator.collaboratorId)}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] hover:bg-[#EEDFC6] text-xs font-bold text-[#8A642C] transition cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Nhắn tin</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Products under this Creator */}
                  <div className="p-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {deals.map((deal) => {
                        const p = deal.progress;
                        const revenueKpi = Boolean(deal.targetRevenue || p.targetRevenue);
                        const target = Number(deal.targetRevenue || p.targetRevenue || deal.targetOrders || p.targetOrders || 0);
                        const completed = revenueKpi ? p.validRevenue || 0 : p.completedOrders || 0;
                        const percent = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0;

                        return (
                          <div
                            key={deal.id}
                            className="rounded-lg border border-[#EAE4D7] bg-[#FAF8F5]/50 p-3 flex flex-col justify-between gap-2.5"
                          >
                            {/* Product & Rate */}
                            <div className="flex items-start justify-between gap-2.5">
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                {deal.productImage ? (
                                  <img
                                    src={deal.productImage}
                                    alt={deal.productTitle || ''}
                                    className="w-10 h-10 rounded-lg object-cover shrink-0 border border-[#EAE4D7] bg-white"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg border border-[#EAE4D7] bg-white flex items-center justify-center text-[#B88E4F]">
                                    <ShoppingBag className="w-4 h-4" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-xs font-bold text-[#1A1612] truncate m-0" title={deal.productTitle}>
                                    {deal.productTitle || 'Sản phẩm áp dụng'}
                                  </h4>
                                  <span className="text-[11px] font-semibold text-[#7D715E] block mt-0.5">
                                    {deal.productPrice.toLocaleString('vi-VN')} ₫
                                  </span>
                                </div>
                              </div>

                              <span className="px-2.5 py-1 rounded-full bg-[#FBF5EB] border border-[#EEDFC6] text-xs font-black text-[#B88E4F] shrink-0">
                                {deal.dealCommissionRate}%
                              </span>
                            </div>

                            {/* KPI Commitment */}
                            <div className="flex items-center justify-between text-xs py-1 border-t border-[#EAE4D7]/70">
                              <span className="text-[#7D715E]">Tiến độ cam kết:</span>
                              {target > 0 ? (
                                <span className="font-bold text-[#1A1612]">
                                  {completed.toLocaleString('vi-VN')}/{target.toLocaleString('vi-VN')} {revenueKpi ? '\u0111' : '\u0111\u01a1n'} ({percent}%)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                                  Không giới hạn
                                </span>
                              )}
                            </div>

                            {/* Revenue & Actions */}
                            <div className="flex items-center justify-between pt-1 border-t border-[#EAE4D7]/70 text-xs gap-2">
                              <div>
                                <span className="text-[10px] text-[#7D715E] block">Doanh số:</span>
                                <strong className="text-xs font-black text-[#1A1612]">
                                  {(p.validRevenue || 0).toLocaleString('vi-VN')} ₫
                                </strong>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleCopyLink(deal)}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#EAE4D7] bg-white hover:bg-[#FBF5EB] text-xs font-bold text-[#1A1612] transition cursor-pointer"
                                  title="Sao chép link tiếp thị"
                                >
                                  {copiedId === deal.id ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-[#059669]" />
                                      <span className="text-[#059669]">Đã chép</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5 text-[#B88E4F]" />
                                      <span>Copy link</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  disabled={busyId === deal.id}
                                  onClick={() => handleReviewTermination(deal)}
                                  className="p-1 rounded-lg border border-neutral-200 bg-white hover:bg-rose-50 text-neutral-500 hover:text-rose-600 transition cursor-pointer"
                                  title="Đóng deal do vi phạm cam kết"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Sub-view 1B: Table View */
            <div className="rounded-xl border border-[#EAE4D7] bg-white shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#EAE4D7] bg-[#FAF8F5] text-[#7D715E] font-bold text-[11px] uppercase tracking-wider">
                      <th className="p-3 pl-4">KOL / Nhà Sáng Tạo</th>
                      <th className="p-3">Sản phẩm</th>
                      <th className="p-3 text-center">Hoa hồng</th>
                      <th className="p-3">Tiến độ KPI</th>
                      <th className="p-3 text-right">Doanh số</th>
                      <th className="p-3 text-right pr-4">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAE4D7]">
                    {filteredActiveDeals.map((deal) => {
                      const p = deal.progress;
                      const revenueKpi = Boolean(deal.targetRevenue || p.targetRevenue);
                        const target = Number(deal.targetRevenue || p.targetRevenue || deal.targetOrders || p.targetOrders || 0);
                      const completed = revenueKpi ? p.validRevenue || 0 : p.completedOrders || 0;
                      const percent = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0;

                      return (
                        <tr key={deal.id} className="hover:bg-[#FAF8F5]/80 transition">
                          <td className="p-3 pl-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-[#F3EFE6] border border-[#EEDFC6] overflow-hidden shrink-0 flex items-center justify-center text-[#B88E4F] font-bold text-xs">
                                {deal.collaboratorAvatar ? (
                                  <img
                                    src={deal.collaboratorAvatar}
                                    alt={deal.collaboratorName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  deal.collaboratorName.charAt(0)
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <strong className="text-xs font-bold text-[#1A1612]">
                                    {deal.collaboratorName}
                                  </strong>
                                  <span className={`px-1 py-0.2 rounded text-[9px] font-bold border ${getTierColor(deal.collaboratorTier)}`}>
                                    {deal.collaboratorTier}
                                  </span>
                                </div>
                                {deal.primaryChannel && (
                                  <div className="flex items-center gap-1 text-[10px] text-[#7D715E] mt-0.5">
                                    <SocialIcon platform={deal.primaryChannel.platformName} className="w-3 h-3" />
                                    <span>
                                      {deal.primaryChannel.channelName || 'Kênh KOL'} ({deal.primaryChannel.followerCount?.toLocaleString()})
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="p-3">
                            <div className="flex items-center gap-2 min-w-0 max-w-[200px]">
                              {deal.productImage && (
                                <img
                                  src={deal.productImage}
                                  alt=""
                                  className="w-8 h-8 rounded-lg object-cover shrink-0 border border-[#EAE4D7]"
                                />
                              )}
                              <div className="min-w-0">
                                <span className="truncate block font-bold text-[#1A1612]" title={deal.productTitle}>
                                  {deal.productTitle || 'Sản phẩm'}
                                </span>
                                <span className="text-[10px] text-[#7D715E]">
                                  {deal.productPrice.toLocaleString('vi-VN')} ₫
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-[#FBF5EB] border border-[#EEDFC6] text-xs font-black text-[#B88E4F]">
                              {deal.dealCommissionRate}%
                            </span>
                          </td>

                          <td className="p-3">
                            {target > 0 ? (
                              <span className="font-bold text-[#1A1612]">
                                {completed.toLocaleString('vi-VN')}/{target.toLocaleString('vi-VN')} {revenueKpi ? '\u0111' : '\u0111\u01a1n'} ({percent}%)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                                Không giới hạn
                              </span>
                            )}
                          </td>

                          <td className="p-3 text-right">
                            <div className="font-bold text-[#1A1612]">
                              {(p.validRevenue || 0).toLocaleString('vi-VN')} ₫
                            </div>
                          </td>

                          <td className="p-3 pr-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {onSelectKolForChat && (
                                <button
                                  type="button"
                                  onClick={() => onSelectKolForChat(deal.collaboratorId)}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#EAE4D7] bg-white hover:bg-[#FAF8F5] text-xs font-bold text-[#7D715E] hover:text-[#1A1612] transition"
                                  title="Nhắn tin"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>Nhắn tin</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleCopyLink(deal)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#EAE4D7] bg-white hover:bg-[#FAF8F5] text-xs font-bold text-[#1A1612] transition"
                                title="Copy link"
                              >
                                {copiedId === deal.id ? (
                                  <Check className="w-3.5 h-3.5 text-[#059669]" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                                <span>{copiedId === deal.id ? 'Đã chép' : 'Copy link'}</span>
                              </button>
                              <button
                                type="button"
                                disabled={busyId === deal.id}
                                onClick={() => handleReviewTermination(deal)}
                                className="p-1 rounded-lg border border-neutral-200 bg-white hover:bg-rose-50 text-neutral-500 hover:text-rose-600 transition"
                                title="Đóng deal"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PENDING PROPOSALS                                                  */}
      {/* ========================================================================= */}
      {activeSubTab === 'PENDING' && (
        <div className="space-y-3">
          {pendingProposals.length === 0 ? (
            <div className="rounded-xl border border-[#EAE4D7] bg-white py-12 px-6 text-center text-xs text-[#7D715E]">
              Hiện không có đề xuất nào đang chờ duyệt.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingProposals.map((item) => {
                const terms = voucherTermsById[item.id] || defaultVipTerms;
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-[#EEDFC6] bg-white p-4 space-y-3 shadow-2xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EAE4D7] pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-lg bg-[#FAF8F5] border border-[#EAE4D7] overflow-hidden shrink-0 flex items-center justify-center">
                          {item.product?.imageUrl ? (
                            <img src={item.product.imageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <ShoppingBag className="w-4 h-4 text-[#B88E4F]" />
                          )}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-[#1A1612] m-0">
                            {item.product?.title || 'Sản phẩm'}
                          </h4>
                          <span className="text-[11px] text-[#7D715E]">
                            KOL: <strong className="text-[#1A1612]">{item.collaborator?.fullName}</strong> · Giá: {item.product?.price?.toLocaleString('vi-VN')} ₫
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#7D715E]">Đề xuất:</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#FBF5EB] border border-[#EEDFC6] text-xs font-black text-[#B88E4F]">
                          {item.proposedCommissionRate}%
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-700">
                          Chờ duyệt
                        </span>
                      </div>
                    </div>

                    {item.salesCommitment && (
                      <div className="text-xs text-[#7D715E] bg-[#FAF8F5] p-2.5 rounded-lg border border-[#EAE4D7]">
                        <strong className="text-[#1A1612]">Cam kết: </strong>
                        <em>"{item.salesCommitment}"</em>
                      </div>
                    )}

                    {/* Voucher Terms Config */}
                    <div className="rounded-lg border border-[#EEDFC6] bg-[#FBF5EB]/40 p-3 space-y-2">
                      <span className="text-xs font-bold text-[#1A1612] block">
                        Cấu hình Voucher độc quyền đi kèm:
                      </span>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                        <label className="flex flex-col gap-1 text-[11px] text-[#7D715E]">
                          Giảm (%)
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={terms.discountPercent}
                            onChange={(e) =>
                              setVoucherTermsById((curr) => ({
                                ...curr,
                                [item.id]: { ...terms, discountPercent: Number(e.target.value) },
                              }))
                            }
                            className="rounded border border-[#EAE4D7] bg-white px-2 py-1 text-xs"
                          />
                        </label>

                        <label className="flex flex-col gap-1 text-[11px] text-[#7D715E]">
                          Đơn tối thiểu (₫)
                          <input
                            type="number"
                            min={0}
                            step={10000}
                            value={terms.minimumOrderAmount}
                            onChange={(e) =>
                              setVoucherTermsById((curr) => ({
                                ...curr,
                                [item.id]: { ...terms, minimumOrderAmount: Number(e.target.value) },
                              }))
                            }
                            className="rounded border border-[#EAE4D7] bg-white px-2 py-1 text-xs"
                          />
                        </label>

                        <label className="flex flex-col gap-1 text-[11px] text-[#7D715E]">
                          Giảm tối đa (₫)
                          <input
                            type="number"
                            min={1000}
                            step={5000}
                            value={terms.maximumDiscountAmount}
                            onChange={(e) =>
                              setVoucherTermsById((curr) => ({
                                ...curr,
                                [item.id]: { ...terms, maximumDiscountAmount: Number(e.target.value) },
                              }))
                            }
                            className="rounded border border-[#EAE4D7] bg-white px-2 py-1 text-xs"
                          />
                        </label>

                        <label className="flex flex-col gap-1 text-[11px] text-[#7D715E]">
                          Lượt dùng
                          <input
                            type="number"
                            min={1}
                            value={terms.usageLimitTotal}
                            onChange={(e) =>
                              setVoucherTermsById((curr) => ({
                                ...curr,
                                [item.id]: { ...terms, usageLimitTotal: Number(e.target.value) },
                              }))
                            }
                            className="rounded border border-[#EAE4D7] bg-white px-2 py-1 text-xs"
                          />
                        </label>

                        <label className="flex flex-col gap-1 text-[11px] text-[#7D715E]">
                          Ngân sách (₫)
                          <input
                            type="number"
                            min={10000}
                            step={100000}
                            value={terms.budgetTotal}
                            onChange={(e) =>
                              setVoucherTermsById((curr) => ({
                                ...curr,
                                [item.id]: { ...terms, budgetTotal: Number(e.target.value) },
                              }))
                            }
                            className="rounded border border-[#EAE4D7] bg-white px-2 py-1 text-xs"
                          />
                        </label>

                        <label className="flex flex-col gap-1 text-[11px] text-[#7D715E]">
                          Hiệu lực (ngày)
                          <input
                            type="number"
                            min={1}
                            max={365}
                            value={terms.validDays}
                            onChange={(e) =>
                              setVoucherTermsById((curr) => ({
                                ...curr,
                                [item.id]: { ...terms, validDays: Number(e.target.value) },
                              }))
                            }
                            className="rounded border border-[#EAE4D7] bg-white px-2 py-1 text-xs"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      {onSelectKolForChat && (
                        <button
                          type="button"
                          onClick={() => item.collaboratorId && onSelectKolForChat(item.collaboratorId)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#EAE4D7] bg-white text-xs font-bold text-[#7D715E] hover:text-[#1A1612]"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Chat</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => handleDecideProposal(item.id, false)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-neutral-600 text-xs font-bold hover:bg-neutral-50 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Từ chối</span>
                      </button>

                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => handleDecideProposal(item.id, true)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-[#231D15] text-xs font-bold transition shadow-2xs cursor-pointer"
                      >
                        {busyId === item.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>Phê duyệt</span>
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
          {historyProposals.length === 0 ? (
            <div className="rounded-xl border border-[#EAE4D7] bg-white py-12 px-6 text-center text-xs text-[#7D715E]">
              Không có lịch sử hợp đồng nào.
            </div>
          ) : (
            <div className="rounded-xl border border-[#EAE4D7] bg-white shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#EAE4D7] bg-[#FAF8F5] text-[#7D715E] font-bold text-[11px] uppercase tracking-wider">
                      <th className="p-3 pl-4">KOL / Nhà Sáng Tạo</th>
                      <th className="p-3">Sản phẩm</th>
                      <th className="p-3 text-center">Hoa hồng</th>
                      <th className="p-3">Trạng thái</th>
                      <th className="p-3 text-right pr-4">Thời gian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAE4D7]">
                    {historyProposals.map((item) => {
                      const isTerminated = item.shopResponse?.startsWith('[ĐÃ ĐÓNG DEAL / CHẾ TÀI]') || item.referralLink?.status === 'BLOCKED';
                      return (
                        <tr key={item.id} className="hover:bg-[#FAF8F5]/80 transition">
                          <td className="p-3 pl-4">
                            <strong className="text-xs font-bold text-[#1A1612]">
                              {item.collaborator?.fullName || 'KOL'}
                            </strong>
                          </td>
                          <td className="p-3">
                            <span className="font-semibold text-[#1A1612]">
                              {item.product?.title || 'Sản phẩm'}
                            </span>
                          </td>
                          <td className="p-3 text-center font-bold text-[#7D715E]">
                            {item.proposedCommissionRate}%
                          </td>
                          <td className="p-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isTerminated
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : item.status === 'REJECTED'
                                  ? 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                                  : 'bg-[#F3EFE6] text-[#7D715E] border border-[#EAE4D7]'
                            }`}>
                              {isTerminated
                                ? 'Đã đóng deal'
                                : item.status === 'REJECTED'
                                  ? 'Từ chối'
                                  : 'Deal cũ'}
                            </span>
                          </td>
                          <td className="p-3 pr-4 text-right text-[11px] text-[#7D715E]">
                            {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('vi-VN') : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

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
