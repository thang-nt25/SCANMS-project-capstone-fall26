import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { WorkspaceHero } from '@/components/ui/FeatureWorkspace';
import {
  Gift,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Search,
  AlertCircle,
  TrendingUp,
  Share2,
  Check,
  Flame,
  ShoppingBag,
  Coins,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import type { CampaignParticipant } from '@/types/campaigns.types';

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string; icon: any }
> = {
  INVITED: {
    label: 'Chờ phản hồi',
    badgeClass: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
    icon: Clock,
  },
  ACCEPTED: {
    label: 'Đã tham gia',
    badgeClass: 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]',
    icon: CheckCircle2,
  },
  REJECTED: {
    label: 'Đã từ chối',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: XCircle,
  },
};

const fmtDate = (d: string) => {
  try {
    return format(new Date(d), 'dd/MM/yyyy');
  } catch {
    return d;
  }
};

export interface ExploreCampaign {
  id: string;
  name: string;
  storeId: string;
  bonusCommissionRate: number;
  bonusBudgetTotal: number;
  bonusBudgetUsed: number;
  budgetRemaining: number;
  budgetProgressPct: number;
  isBudgetExhausted: boolean;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isJoined?: boolean;
  isInvited?: boolean;
  participantId?: string | null;
  store: {
    id: string;
    name: string;
    slug?: string;
    logoUrl?: string;
    categoryName?: string;
    defaultCommissionRate?: number;
  };
  campaignProducts?: Array<{
    product: {
      id: string;
      title: string;
      price: number;
      imageUrl?: string;
    };
  }>;
}

export default function KolCampaignsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTabParam = searchParams.get('tab');
  const [pageMode, setPageMode] = useState<'EXPLORE' | 'TARGETED'>(
    currentTabParam === 'targeted' ? 'TARGETED' : 'EXPLORE'
  );

  const [exploreCampaigns, setExploreCampaigns] = useState<ExploreCampaign[]>([]);
  const [loadingExplore, setLoadingExplore] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const [invitations, setInvitations] = useState<CampaignParticipant[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(true);
  const [activeInviteFilter, setActiveInviteFilter] = useState<'ALL' | 'INVITED' | 'ACCEPTED' | 'REJECTED'>('ALL');

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [search, setSearch] = useState('');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // 1. Tải danh sách chiến dịch mở (Explore)
  const loadExplore = useCallback(async () => {
    setLoadingExplore(true);
    try {
      const res: any = await api.get('/campaigns/explore', { headers: { 'x-skip-cache': '1' } });
      const data = res?.data || res || [];
      setExploreCampaigns(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Lỗi tải chiến dịch mở:', err);
    } finally {
      setLoadingExplore(false);
    }
  }, []);

  // 2. Tải danh sách lời mời riêng (Targeted)
  const loadInvitations = useCallback(async () => {
    setLoadingInvitations(true);
    try {
      const res: any = await api.get('/campaigns/my-invitations', { headers: { 'x-skip-cache': '1' } });
      const data = res?.data || res || [];
      setInvitations(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Lỗi tải danh sách lời mời riêng:', err);
    } finally {
      setLoadingInvitations(false);
    }
  }, []);

  useEffect(() => {
    loadExplore();
    loadInvitations();
  }, [loadExplore, loadInvitations]);

  // 1-Click Tham Gia Chiến Dịch Mở (Open Broadcast)
  const handleJoinCampaign = async (campaign: ExploreCampaign) => {
    setActionLoading(campaign.id);
    try {
      await api.post(`/campaigns/${campaign.id}/join`);
      showToast(`🎉 Chúc mừng! Bạn đã tham gia thành công chiến dịch "${campaign.name}". Hãy lấy link tiếp thị ngay!`);
      // Update local explore state
      setExploreCampaigns((prev) =>
        prev.map((c) => (c.id === campaign.id ? { ...c, isJoined: true } : c))
      );
      loadInvitations();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Không thể tham gia chiến dịch lúc này.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Xử lý Lời Mời Riêng
  const handleAcceptInvite = async (participantId: string, campaignName: string) => {
    setActionLoading(participantId + '-accept');
    try {
      await api.patch(`/campaigns/invitations/${participantId}/accept`, {});
      showToast(`🎉 Đã chấp nhận tham gia chiến dịch "${campaignName}"!`);
      loadInvitations();
      loadExplore();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Không thể chấp nhận lời mời.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectInvite = async (participantId: string, campaignName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn từ chối lời mời chiến dịch "${campaignName}"?`)) return;
    setActionLoading(participantId + '-reject');
    try {
      await api.patch(`/campaigns/invitations/${participantId}/reject`, {});
      showToast('Đã gửi thông báo từ chối tới nhãn hàng đối tác.');
      loadInvitations();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Không thể từ chối lời mời.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Điều hướng sinh link tiếp thị có gắn campaignId
  const handleGetLink = (campaignId: string, storeId: string) => {
    navigate(`/collaborator/marketing?tab=links&campaignId=${campaignId}&storeId=${storeId}&create=1`);
  };

  // Bộ lọc danh mục cửa hàng
  const categories = Array.from(
    new Set(
      exploreCampaigns
        .map((c) => c.store?.categoryName || 'Khác')
        .filter(Boolean)
    )
  );

  const filteredExplore = exploreCampaigns.filter((item) => {
    const matchesSearch =
      `${item.name} ${item.store?.name || ''}`
        .toLocaleLowerCase('vi-VN')
        .includes(search.trim().toLocaleLowerCase('vi-VN'));
    const matchesCat =
      selectedCategory === 'ALL' || (item.store?.categoryName || 'Khác') === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const filteredInvitations = invitations.filter((item) => {
    const matchesSearch =
      `${item.campaign?.name || ''} ${item.campaign?.store?.name || ''}`
        .toLocaleLowerCase('vi-VN')
        .includes(search.trim().toLocaleLowerCase('vi-VN'));
    if (activeInviteFilter === 'ALL') return matchesSearch;
    return matchesSearch && item.status === activeInviteFilter;
  });

  const pendingCount = invitations.filter((i) => i.status === 'INVITED').length;
  const acceptedCount = invitations.filter((i) => i.status === 'ACCEPTED').length;

  return (
    <div className="max-w-[1520px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6" id="kol-campaigns-page">
      <WorkspaceHero
        eyebrow="SCANMS / CHIẾN DỊCH KÍCH CẦU DOANH SỐ"
        title="Chiến dịch kích cầu & Cơ hội thù lao"
        description="Tham gia các chiến dịch kích cầu toàn sàn của các nhãn hàng đối tác để nhận thêm +1% đến +2% thù lao trên mỗi đơn hàng hoàn tất. Không áp lực KPI, bán bao nhiêu hưởng thưởng bấy nhiêu."
      />

      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-3 rounded-2xl text-xs font-bold shadow-2xl z-50 border flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-4 duration-200 ${
            toast.type === 'success'
              ? 'bg-white text-[#1A1612] border-[#EEDFC6]'
              : 'bg-white text-rose-700 border-rose-200'
          }`}
          role="alert"
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#059669] flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Top Main Mode Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-1.5 border border-[#EAE4D7] rounded-2xl bg-white shadow-2xs">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setPageMode('EXPLORE');
              setSearchParams({ tab: 'explore' });
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              pageMode === 'EXPLORE'
                ? 'bg-[#C59B58] text-white shadow-xs'
                : 'bg-transparent text-[#7D715E] hover:bg-[#FAF8F5] hover:text-[#1A1612]'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Khám Phá Chiến Dịch Sự Kiện ({exploreCampaigns.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPageMode('TARGETED');
              setSearchParams({ tab: 'targeted' });
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              pageMode === 'TARGETED'
                ? 'bg-[#C59B58] text-white shadow-xs'
                : 'bg-transparent text-[#7D715E] hover:bg-[#FAF8F5] hover:text-[#1A1612]'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>Lời Mời Riêng Từ Brand ({invitations.length})</span>
            {pendingCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#D97706] text-white text-[10px] grid place-items-center font-black">
                {pendingCount}
              </span>
            )}
          </button>
        </div>

        {/* Search input */}
        <div className="flex items-center gap-2 pr-1.5">
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-[#7D715E] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              aria-label="Tìm chiến dịch hoặc nhãn hàng"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm chiến dịch, nhãn hàng…"
              className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl pl-9 pr-3.5 py-2 text-xs text-[#1A1612] outline-none focus:border-[#C59B58]"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (pageMode === 'EXPLORE') loadExplore();
              else loadInvitations();
            }}
            className="px-3.5 py-2 border border-[#EEDFC6] bg-[#FBF5EB] hover:bg-[#F3EFE6] text-[#8C6226] text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0"
          >
            Làm mới
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: KHÁM PHÁ CHIẾN DỊCH SỰ KIỆN (1-TO-MANY BROADCAST)
      ───────────────────────────────────────────────────────────── */}
      {pageMode === 'EXPLORE' && (
        <div className="space-y-6">
          {/* Top Metric Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-[#EAE4D7] rounded-2xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[#7D715E] uppercase tracking-wider">
                  Chiến Dịch Đang Mở
                </div>
                <div className="text-3xl font-black text-[#1A1612] mt-1">
                  {exploreCampaigns.length}
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6] flex items-center justify-center font-bold">
                <Flame className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white border border-[#EAE4D7] rounded-2xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[#7D715E] uppercase tracking-wider">
                  Thù Lao Thưởng Thêm
                </div>
                <div className="text-3xl font-black text-[#B88E4F] mt-1">
                  +1% ~ +2%
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6] flex items-center justify-center font-bold">
                <Coins className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white border border-[#EAE4D7] rounded-2xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[#7D715E] uppercase tracking-wider">
                  Cơ Chế Tham Gia
                </div>
                <div className="text-sm font-bold text-[#059669] mt-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                  <span>Không áp lực chỉ tiêu đơn</span>
                </div>
                <div className="text-[11px] text-[#7D715E] mt-0.5">Nhận thưởng theo từng đơn giao thành công</div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6] flex items-center justify-center font-bold">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Category Filter Pills */}
          {categories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="font-semibold text-[#7D715E] shrink-0 mr-1">Ngành hàng:</span>
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  selectedCategory === 'ALL'
                    ? 'bg-[#1A1612] text-white'
                    : 'bg-white border border-[#EAE4D7] text-[#7D715E] hover:bg-[#FAF8F5]'
                }`}
              >
                Tất cả ngành
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#1A1612] text-white'
                      : 'bg-white border border-[#EAE4D7] text-[#7D715E] hover:bg-[#FAF8F5]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Campaign List */}
          {loadingExplore ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-[#7D715E]">
              <div className="w-8 h-8 border-3 border-[#C59B58]/20 border-t-[#C59B58] rounded-full animate-spin" />
              <span className="text-xs font-semibold">Đang tải danh sách chiến dịch mở toàn sàn...</span>
            </div>
          ) : filteredExplore.length === 0 ? (
            <div className="text-center py-16 bg-white border border-[#EAE4D7] rounded-3xl p-8 shadow-xs space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6] mx-auto flex items-center justify-center">
                <Flame className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-[#1A1612]">Không tìm thấy chiến dịch phù hợp</h3>
              <p className="text-xs text-[#7D715E] max-w-md mx-auto">
                Hiện tại chưa có chiến dịch mở nào trong danh mục đã chọn. Hãy thử chọn danh mục khác hoặc quay lại sau.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredExplore.map((campaign) => {
                const isJoined = Boolean(campaign.isJoined);
                const hasProducts = Boolean(campaign.campaignProducts && campaign.campaignProducts.length > 0);

                return (
                  <div
                    key={campaign.id}
                    className="bg-white border border-[#EAE4D7] hover:border-[#C59B58] rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Store Header & Rate Badge */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {campaign.store?.logoUrl ? (
                            <img
                              src={campaign.store.logoUrl}
                              alt={campaign.store.name}
                              className="w-10 h-10 rounded-xl border border-[#EAE4D7] object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] font-black flex items-center justify-center text-sm shrink-0">
                              {campaign.store?.name?.[0] || 'S'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[#1A1612] truncate">
                              {campaign.store?.name || 'Nhãn hàng đối tác'}
                            </div>
                            <div className="text-[10px] text-[#7D715E] truncate">
                              {campaign.store?.categoryName || 'Bán lẻ đa ngành'}
                            </div>
                          </div>
                        </div>

                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6] shrink-0">
                          <Flame className="w-3.5 h-3.5 text-[#B88E4F]" />
                          +{campaign.bonusCommissionRate}% thù lao
                        </span>
                      </div>

                      {/* Campaign Title & Dates */}
                      <div>
                        <h3 className="text-sm font-extrabold text-[#1A1612] line-clamp-2" title={campaign.name}>
                          {campaign.name}
                        </h3>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#7D715E] mt-1">
                          <Calendar className="w-3.5 h-3.5 text-[#B88E4F]" />
                          <span>Thời hạn: {fmtDate(campaign.startDate)} → {fmtDate(campaign.endDate)}</span>
                        </div>
                      </div>

                      {/* Budget Progress Bar */}
                      <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7] space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[#7D715E]">Quỹ thưởng chiến dịch:</span>
                          <span className="font-extrabold text-[#1A1612]">
                            {Number(campaign.bonusBudgetUsed || 0).toLocaleString('vi-VN')} / {Number(campaign.bonusBudgetTotal || 0).toLocaleString('vi-VN')} ₫
                          </span>
                        </div>
                        <div className="w-full bg-[#F3EFE6] rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              campaign.isBudgetExhausted ? 'bg-rose-500' : 'bg-[#C59B58]'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, campaign.budgetProgressPct || 0))}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-[#7D715E]">
                          <span>Đã giải ngân {campaign.budgetProgressPct}%</span>
                          {campaign.isBudgetExhausted ? (
                            <span className="font-bold text-rose-600">Đã hết ngân sách</span>
                          ) : (
                            <span className="font-semibold text-[#059669]">
                              Còn {(campaign.budgetRemaining || 0).toLocaleString('vi-VN')} ₫
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Products preview if available */}
                      {hasProducts && (
                        <div className="pt-2 border-t border-[#EAE4D7] space-y-1">
                          <div className="text-[10px] font-semibold text-[#7D715E] uppercase tracking-wider">
                            Sản phẩm áp dụng ({campaign.campaignProducts!.length}):
                          </div>
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            {campaign.campaignProducts!.slice(0, 3).map((cp) => (
                              <div
                                key={cp.product.id}
                                className="flex items-center gap-1 bg-[#FAF8F5] border border-[#EAE4D7] rounded-lg p-1 text-[10px] text-[#1A1612] truncate max-w-[140px]"
                                title={cp.product.title}
                              >
                                {cp.product.imageUrl ? (
                                  <img src={cp.product.imageUrl} alt="" className="w-4 h-4 rounded object-cover" />
                                ) : (
                                  <ShoppingBag className="w-3 h-3 text-[#B88E4F]" />
                                )}
                                <span className="truncate">{cp.product.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 border-t border-[#EAE4D7]">
                      {isJoined ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6] text-[11px] font-bold shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Đã tham gia
                          </span>
                          <button
                            type="button"
                            onClick={() => { if (campaign?.id && campaign?.storeId) handleGetLink(campaign.id, campaign.storeId); }}
                            className="flex-1 py-2 px-3 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>Lấy liên kết tiếp thị</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={actionLoading === campaign.id || campaign.isBudgetExhausted}
                          onClick={() => handleJoinCampaign(campaign)}
                          className="w-full py-2.5 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {actionLoading === campaign.id ? (
                            <span>Đang kích hoạt...</span>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Tham gia nhận thưởng ngay</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: LỜI MỜI RIÊNG TỪ BRAND (TARGETED VIP INVITATIONS)
      ───────────────────────────────────────────────────────────── */}
      {pageMode === 'TARGETED' && (
        <div className="space-y-6">
          {/* Sub-tabs filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setActiveInviteFilter('ALL')}
              className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                activeInviteFilter === 'ALL'
                  ? 'bg-[#C59B58] text-white shadow-xs'
                  : 'bg-white text-[#7D715E] hover:bg-[#FAF8F5] border border-[#EAE4D7]'
              }`}
            >
              Tất cả ({invitations.length})
            </button>
            <button
              onClick={() => setActiveInviteFilter('INVITED')}
              className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                activeInviteFilter === 'INVITED'
                  ? 'bg-[#C59B58] text-white shadow-xs'
                  : 'bg-white text-[#7D715E] hover:bg-[#FAF8F5] border border-[#EAE4D7]'
              }`}
            >
              Chờ phản hồi ({pendingCount})
            </button>
            <button
              onClick={() => setActiveInviteFilter('ACCEPTED')}
              className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                activeInviteFilter === 'ACCEPTED'
                  ? 'bg-[#C59B58] text-white shadow-xs'
                  : 'bg-white text-[#7D715E] hover:bg-[#FAF8F5] border border-[#EAE4D7]'
              }`}
            >
              Đang tham gia ({acceptedCount})
            </button>
            <button
              onClick={() => setActiveInviteFilter('REJECTED')}
              className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                activeInviteFilter === 'REJECTED'
                  ? 'bg-[#C59B58] text-white shadow-xs'
                  : 'bg-white text-[#7D715E] hover:bg-[#FAF8F5] border border-[#EAE4D7]'
              }`}
            >
              Đã từ chối
            </button>
          </div>

          {loadingInvitations ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-[#7D715E]">
              <div className="w-8 h-8 border-3 border-[#C59B58]/20 border-t-[#C59B58] rounded-full animate-spin" />
              <span className="text-xs font-semibold">Đang tải danh sách lời mời riêng...</span>
            </div>
          ) : filteredInvitations.length === 0 ? (
            <div className="text-center py-16 bg-white border border-[#EAE4D7] rounded-3xl p-8 shadow-xs space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6] mx-auto flex items-center justify-center">
                <Gift className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-[#1A1612]">Không có lời mời nào trong mục này</h3>
              <p className="text-xs text-[#7D715E] max-w-md mx-auto">
                Khi các nhãn hàng gửi thẻ mời VIP qua khung Chat hoặc hệ thống, các chiến dịch sẽ tự động hiển thị ở đây.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredInvitations.map((inv) => {
                const statusInfo = STATUS_CONFIG[inv.status] || STATUS_CONFIG.INVITED;
                const expired = !inv.campaign?.isActive || new Date(inv.campaign.endDate) <= new Date();
                const isPending = inv.status === 'INVITED' && !expired;
                const isAccepted = inv.status === 'ACCEPTED';
                const campaign = inv.campaign;

                return (
                  <div
                    key={inv.id}
                    id={`invitation-${inv.id}`}
                    className="bg-white border border-[#EAE4D7] hover:border-[#C59B58] rounded-2xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          {campaign?.store?.logoUrl ? (
                            <img
                              src={campaign.store.logoUrl}
                              alt={campaign.store.name}
                              className="w-11 h-11 rounded-xl border border-[#EAE4D7] object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center font-black text-sm shrink-0">
                              {campaign?.store?.name?.[0] || 'S'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-[#1A1612] truncate">
                              {campaign?.store?.name || 'Nhãn hàng đối tác'}
                            </div>
                            <div className="text-xs text-[#7D715E] truncate">
                              Hoa hồng gốc: {campaign?.store?.defaultCommissionRate || 10}%
                            </div>
                          </div>
                        </div>

                        <span className={`px-3 py-1 rounded-full text-xs font-bold border shrink-0 ${statusInfo.badgeClass}`}>
                          {statusInfo.label}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-[#1A1612]">{campaign?.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-[#7D715E] mt-1">
                          <Calendar className="w-3.5 h-3.5 text-[#B88E4F]" />
                          <span>Hạn chiến dịch: {fmtDate(campaign?.startDate || '')} → {fmtDate(campaign?.endDate || '')}</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] flex items-center justify-between">
                        <span className="text-xs font-bold text-[#7D715E]">Thù lao thưởng thêm:</span>
                        <span className="text-base font-black text-[#B88E4F]">
                          +{campaign?.bonusCommissionRate}% thù lao
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#EAE4D7]">
                      {isPending && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={Boolean(actionLoading)}
                            onClick={() => handleRejectInvite(inv.id, campaign?.name || 'Chiến dịch')}
                            className="flex-1 py-2 px-3 rounded-xl border border-[#EAE4D7] text-xs font-bold text-[#7D715E] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                          >
                            Từ chối
                          </button>
                          <button
                            type="button"
                            disabled={Boolean(actionLoading)}
                            onClick={() => handleAcceptInvite(inv.id, campaign?.name || 'Chiến dịch')}
                            className="flex-1 py-2 px-3 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Chấp nhận</span>
                          </button>
                        </div>
                      )}

                      {isAccepted && (
                        <button
                          type="button"
                          onClick={() => { if (campaign?.id && campaign?.storeId) handleGetLink(campaign.id, campaign.storeId); }}
                          className="w-full py-2 px-3 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Lấy liên kết tiếp thị ngay</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
