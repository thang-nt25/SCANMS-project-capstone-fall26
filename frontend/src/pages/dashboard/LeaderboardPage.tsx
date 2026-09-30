import { useState, useEffect } from 'react';
import {
  Trophy,
  Crown,
  Medal,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Award,
  Zap,
  DollarSign,
  ShoppingBag,
  RefreshCw,
  ChevronRight,
  Filter,
  X,
} from 'lucide-react';
import { leaderboardService } from '../../services/leaderboard.service';
import type {
  LeaderboardFullResponse,
  LeaderboardMetric,
  LeaderboardTimeRange,
  CreatorHallOfFameProfile,
} from '../../services/leaderboard.service';

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardFullResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [metric, setMetric] = useState<LeaderboardMetric>('REVENUE');
  const [timeRange, setTimeRange] = useState<LeaderboardTimeRange>('this_month');
  const [scope, setScope] = useState<'GLOBAL' | 'STORE'>('GLOBAL');

  // Creator Modal
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<CreatorHallOfFameProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const res = await leaderboardService.getLeaderboard({
        metric,
        timeRange,
        scope,
        limit: 20,
      });
      setData(res);
    } catch (err) {
      console.error('Lỗi khi tải bảng vinh danh Leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [metric, timeRange, scope]);

  const handleOpenCreatorModal = async (creatorId: string) => {
    try {
      setSelectedCreatorId(creatorId);
      setLoadingProfile(true);
      const profile = await leaderboardService.getCreatorProfile(creatorId);
      setCreatorProfile(profile);
    } catch (err) {
      console.error('Lỗi khi tải hồ sơ creator:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedCreatorId(null);
    setCreatorProfile(null);
  };

  const formatVND = (val?: number) => {
    if (val === undefined || val === null) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const formatNumber = (val?: number) => {
    if (val === undefined || val === null) return '0';
    return new Intl.NumberFormat('vi-VN').format(val);
  };

  const podium = data?.podium;
  const rankings = data?.rankings || [];
  const myRank = data?.myRankStatus;

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1612] p-4 sm:p-6 lg:p-8 space-y-8 antialiased pb-28">
      {/* ─── 1. TOP HEADER & GAMIFICATION BANNER ──────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#FBF5EB] via-white to-[#F3EFE6] border border-[#EEDFC6] p-6 sm:p-8 shadow-2xl shadow-amber-500/5">
        <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-[#FBF5EB] rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-0 right-1/4 w-40 h-40 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500 to-yellow-400 text-[#1A1612] shadow-md shadow-amber-500/20">
                <Trophy className="w-3.5 h-3.5" />
                <span>FR-29 GAMIFIED LEADERBOARD</span>
              </span>
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FBF5EB] text-[#8F682E] border border-[#EEDFC6]">
                <Sparkles className="w-3.5 h-3.5 text-[#8F682E]" />
                <span>{data?.periodLabel || 'Tháng 9/2026'}</span>
              </span>
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#059669]/10 text-[#059669] border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span>{data?.totalParticipants || 0} Creators đang đua top</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#1A1612] tracking-tight">
              Bảng Vinh Danh Top Creators & Đối Tác Xuất Sắc
            </h1>
            <p className="text-sm text-[#7D715E] max-w-2xl leading-relaxed">
              Vinh danh những nhà sáng tạo nội dung dẫn đầu hệ sinh thái SCANMS. Đạt Top 1-3 nhận thưởng nóng tiền mặt lên đến{' '}
              <strong className="text-[#8F682E] font-semibold">+5.000.000 ₫</strong> và đặc quyền nhận mẫu thử VIP không giới hạn.
            </p>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2 bg-white border border-[#EAE4D7] p-2 rounded-2xl shadow-lg self-start lg:self-center">
            <div className="flex bg-[#FAF8F5] rounded-xl p-1 border border-[#EAE4D7] text-xs font-semibold">
              <button
                onClick={() => setTimeRange('this_month')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  timeRange === 'this_month' ? 'bg-amber-500 text-[#1A1612] font-bold shadow-md' : 'text-[#7D715E] hover:text-[#1A1612]'
                }`}
              >
                Tháng này
              </button>
              <button
                onClick={() => setTimeRange('last_month')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  timeRange === 'last_month' ? 'bg-amber-500 text-[#1A1612] font-bold shadow-md' : 'text-[#7D715E] hover:text-[#1A1612]'
                }`}
              >
                Tháng trước
              </button>
              <button
                onClick={() => setTimeRange('this_quarter')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  timeRange === 'this_quarter' ? 'bg-amber-500 text-[#1A1612] font-bold shadow-md' : 'text-[#7D715E] hover:text-[#1A1612]'
                }`}
              >
                Quý này
              </button>
              <button
                onClick={() => setTimeRange('all_time')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  timeRange === 'all_time' ? 'bg-amber-500 text-[#1A1612] font-bold shadow-md' : 'text-[#7D715E] hover:text-[#1A1612]'
                }`}
              >
                Toàn thời gian
              </button>
            </div>

            <button
              onClick={fetchLeaderboard}
              disabled={loading}
              className="p-2 bg-[#F3EFE6] hover:bg-[#F3EFE6] text-[#1A1612] rounded-xl transition-transform active:scale-95 disabled:opacity-50"
              title="Làm mới bảng xếp hạng"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#8F682E]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Metric Selector Tabs */}
        <div className="mt-6 pt-6 border-t border-[#EAE4D7] flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[#7D715E] uppercase tracking-wider mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-[#8F682E]" />
              <span>Xếp hạng theo:</span>
            </span>
            <button
              onClick={() => setMetric('REVENUE')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
                metric === 'REVENUE'
                  ? 'bg-[#FBF5EB] text-[#8F682E] border border-[#EEDFC6] shadow-sm'
                  : 'bg-white text-[#7D715E] border border-[#EAE4D7] hover:text-[#1A1612]'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Doanh Thu (GMV)</span>
            </button>
            <button
              onClick={() => setMetric('ORDERS')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
                metric === 'ORDERS'
                  ? 'bg-[#FBF5EB] text-[#8F682E] border border-blue-500/40 shadow-sm'
                  : 'bg-white text-[#7D715E] border border-[#EAE4D7] hover:text-[#1A1612]'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Số Lượng Đơn Hàng</span>
            </button>
            <button
              onClick={() => setMetric('CONVERSION_RATE')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
                metric === 'CONVERSION_RATE'
                  ? 'bg-[#059669]/10 text-[#059669] border border-emerald-500/40 shadow-sm'
                  : 'bg-white text-[#7D715E] border border-[#EAE4D7] hover:text-[#1A1612]'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Tỷ Lệ Chốt Đơn (CR%)</span>
            </button>
            <button
              onClick={() => setMetric('COMMISSION')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
                metric === 'COMMISSION'
                  ? 'bg-purple-500/20 text-[#8F682E] border border-purple-500/40 shadow-sm'
                  : 'bg-white text-[#7D715E] border border-[#EAE4D7] hover:text-[#1A1612]'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Hoa Hồng Thực Nhận</span>
            </button>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="text-[#7D715E]">Phạm vi:</span>
            <button
              onClick={() => setScope(scope === 'GLOBAL' ? 'STORE' : 'GLOBAL')}
              className="px-3 py-1 bg-[#F3EFE6] hover:bg-[#F3EFE6] text-[#1A1612] rounded-lg border border-[#EAE4D7] font-medium transition-colors"
            >
              {scope === 'GLOBAL' ? '🌐 Toàn Sàn SCANMS' : '🏪 Gian Hàng Của Tôi'}
            </button>
          </div>
        </div>
      </div>

      {/* ─── 2. BỤC VINH DANH PODIUM TOP 1 - 2 - 3 ──────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-6">
        {/* RANK 2: Á QUÂN 1 (SILVER MEDAL) */}
        <div
          onClick={() => podium?.rank2 && handleOpenCreatorModal(podium.rank2.collaboratorId)}
          className={`cursor-pointer group relative bg-gradient-to-b from-white to-[#FAF8F5] border border-[#EAE4D7] hover:border-[#C59B58] rounded-3xl p-6 text-center space-y-4 shadow-xl transition-all hover:-translate-y-2 order-2 md:order-1 ${
            podium?.rank2?.isCurrentUser ? 'ring-2 ring-[#C59B58] bg-white' : ''
          }`}
        >
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-slate-400 to-slate-200 text-[#1A1612] font-black text-lg shadow-lg">
            2
          </div>

          <div className="pt-3">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-slate-600 to-slate-300 p-1 shadow-md">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden text-2xl font-bold text-[#1A1612]">
                {podium?.rank2?.avatarUrl ? (
                  <img src={podium.rank2.avatarUrl} alt={podium.rank2.fullName} className="w-full h-full object-cover" />
                ) : (
                  podium?.rank2?.fullName?.charAt(0) || '2'
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="font-bold text-base text-[#1A1612] group-hover:text-[#1A1612] flex items-center justify-center gap-1.5">
              <span>{podium?.rank2?.fullName || 'Chưa có đối tác'}</span>
              {podium?.rank2?.isCurrentUser && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FBF5EB] text-[#8F682E] border border-[#EEDFC6]">Bạn</span>
              )}
            </h3>
            <p className="text-xs text-[#7D715E]">{podium?.rank2?.primaryChannelHandle || '@creator • TikTok'}</p>
          </div>

          <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#EAE4D7] space-y-1">
            <span className="text-[11px] text-[#7D715E] font-medium">Doanh Số Ghi Nhận</span>
            <div className="text-xl font-extrabold text-[#1A1612]">{formatVND(podium?.rank2?.grossRevenue)}</div>
            <div className="flex items-center justify-center gap-2 text-[11px] text-[#7D715E] pt-1 border-t border-[#EAE4D7]">
              <span>{podium?.rank2?.totalOrders || 0} đơn</span>
              <span>•</span>
              <span className="text-[#059669]">{podium?.rank2?.conversionRate || 0}% CR</span>
            </div>
          </div>

          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FBF5EB] text-[#7D715E] border border-[#EAE4D7]">
            <Medal className="w-3.5 h-3.5 text-[#7D715E]" />
            <span>{podium?.rank2?.tierName || 'Cấp Bạc'}</span>
          </div>

          <div className="p-2.5 bg-[#F3EFE6] rounded-xl border border-[#EAE4D7] text-xs font-semibold text-[#7D715E]">
            🎁 Thưởng nóng: <strong className="text-[#8F682E]">+2.500.000 ₫</strong>
          </div>
        </div>

        {/* RANK 1: QUÁN QUÂN (GOLD CROWN / DIAMOND GLOW) */}
        <div
          onClick={() => podium?.rank1 && handleOpenCreatorModal(podium.rank1.collaboratorId)}
          className={`cursor-pointer group relative bg-gradient-to-b from-[#FBF5EB] via-white to-[#F3EFE6] border-2 border-[#C59B58] hover:border-[#B88E4F] rounded-3xl p-6 lg:p-8 text-center space-y-4 shadow-2xl shadow-amber-500/20 transition-all hover:-translate-y-3 order-1 md:order-2 ${
            podium?.rank1?.isCurrentUser ? 'ring-4 ring-amber-400/50' : ''
          }`}
        >
          {/* Crown & Floating Badge */}
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <Crown className="w-8 h-8 text-[#8F682E] drop-shadow-[0_0_12px_rgba(245,158,11,0.8)] animate-bounce" />
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-300 text-[#1A1612] font-black text-xl shadow-xl shadow-amber-500/40 border-2 border-yellow-200">
              1
            </div>
          </div>

          <div className="pt-6">
            <div className="w-28 h-28 mx-auto rounded-full bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-600 p-1.5 shadow-2xl shadow-amber-500/30">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden text-3xl font-extrabold text-[#8F682E]">
                {podium?.rank1?.avatarUrl ? (
                  <img src={podium.rank1.avatarUrl} alt={podium.rank1.fullName} className="w-full h-full object-cover" />
                ) : (
                  podium?.rank1?.fullName?.charAt(0) || '1'
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="font-extrabold text-lg text-[#1A1612] group-hover:text-[#8F682E] flex items-center justify-center gap-1.5">
              <span>{podium?.rank1?.fullName || 'Chưa có Quán Quân'}</span>
              {podium?.rank1?.isCurrentUser && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-[#1A1612] font-bold">BẠN</span>
              )}
            </h3>
            <p className="text-xs text-[#7D715E] font-medium">{podium?.rank1?.primaryChannelHandle || '@top.creator • YouTube/TikTok'}</p>
          </div>

          <div className="p-4 bg-[#FBF5EB] rounded-2xl border border-[#EEDFC6] space-y-1 shadow-inner">
            <span className="text-xs text-[#8F682E] font-semibold uppercase tracking-wider">Quán Quân Doanh Số</span>
            <div className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
              {formatVND(podium?.rank1?.grossRevenue)}
            </div>
            <div className="flex items-center justify-center gap-3 text-xs text-[#7D715E] pt-2 border-t border-[#EAE4D7]">
              <span><strong>{podium?.rank1?.totalOrders || 0}</strong> đơn</span>
              <span>•</span>
              <span><strong>{formatNumber(podium?.rank1?.totalClicks)}</strong> clicks</span>
              <span>•</span>
              <span className="text-[#059669] font-bold">{podium?.rank1?.conversionRate || 0}% CR</span>
            </div>
          </div>

          <div className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#FBF5EB] text-[#8F682E] border border-[#EEDFC6] shadow-md">
            <Sparkles className="w-3.5 h-3.5 text-[#8F682E]" />
            <span>{podium?.rank1?.tierName || 'Cấp Kim Cương'}</span>
          </div>

          <div className="p-3 bg-gradient-to-r from-amber-500/20 to-yellow-500/10 rounded-xl border border-[#EEDFC6] text-xs font-bold text-[#8F682E] shadow-md">
            👑 Thưởng nóng: <span className="text-[#1A1612]">+5.000.000 ₫</span> &amp; <span className="text-[#059669]">+5% Thưởng VIP</span>
          </div>
        </div>

        {/* RANK 3: Á QUÂN 2 (BRONZE SHIELD) */}
        <div
          onClick={() => podium?.rank3 && handleOpenCreatorModal(podium.rank3.collaboratorId)}
          className={`cursor-pointer group relative bg-gradient-to-b from-white to-[#FAF8F5] border border-[#EEDFC6] hover:border-[#B88E4F] rounded-3xl p-6 text-center space-y-4 shadow-xl transition-all hover:-translate-y-2 order-3 ${
            podium?.rank3?.isCurrentUser ? 'ring-2 ring-[#C59B58] bg-white' : ''
          }`}
        >
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#C59B58] to-[#B88E4F] text-[#1A1612] font-black text-lg shadow-lg">
            3
          </div>

          <div className="pt-3">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-[#C59B58] to-[#B88E4F] p-1 shadow-md">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden text-2xl font-bold text-[#8F682E]">
                {podium?.rank3?.avatarUrl ? (
                  <img src={podium.rank3.avatarUrl} alt={podium.rank3.fullName} className="w-full h-full object-cover" />
                ) : (
                  podium?.rank3?.fullName?.charAt(0) || '3'
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="font-bold text-base text-[#1A1612] group-hover:text-[#8F682E] flex items-center justify-center gap-1.5">
              <span>{podium?.rank3?.fullName || 'Chưa có đối tác'}</span>
              {podium?.rank3?.isCurrentUser && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FBF5EB] text-[#8F682E] border border-[#EEDFC6]">Bạn</span>
              )}
            </h3>
            <p className="text-xs text-[#7D715E]">{podium?.rank3?.primaryChannelHandle || '@creator • Facebook'}</p>
          </div>

          <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#EAE4D7] space-y-1">
            <span className="text-[11px] text-[#7D715E] font-medium">Doanh Số Ghi Nhận</span>
            <div className="text-xl font-extrabold text-[#8F682E]">{formatVND(podium?.rank3?.grossRevenue)}</div>
            <div className="flex items-center justify-center gap-2 text-[11px] text-[#7D715E] pt-1 border-t border-[#EAE4D7]">
              <span>{podium?.rank3?.totalOrders || 0} đơn</span>
              <span>•</span>
              <span className="text-[#059669]">{podium?.rank3?.conversionRate || 0}% CR</span>
            </div>
          </div>

          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FBF5EB] text-[#8F682E] border border-[#EEDFC6]">
            <Shield className="w-3.5 h-3.5 text-amber-500" />
            <span>{podium?.rank3?.tierName || 'Cấp Đồng'}</span>
          </div>

          <div className="p-2.5 bg-[#F3EFE6] rounded-xl border border-[#EAE4D7] text-xs font-semibold text-[#7D715E]">
            🎁 Thưởng nóng: <strong className="text-[#8F682E]">+1.000.000 ₫</strong>
          </div>
        </div>
      </div>

      {/* ─── 3. BẢNG XẾP HẠNG TOP 4 - 20 (RANKING TABLE) ───────────────── */}
      <div className="bg-white border border-[#EAE4D7] rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-[#EAE4D7] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-[#1A1612] flex items-center gap-2">
              <Award className="w-5 h-5 text-[#8F682E]" />
              <span>Bảng Xếp Hạng Top 4 — Top 20</span>
            </h2>
            <p className="text-xs text-[#7D715E]">Danh sách các đối tác tiếp thị xuất sắc nhất theo số liệu xác thực từ CSDL.</p>
          </div>
          <span className="text-xs text-[#7D715E]">Tự động cập nhật mỗi 30 giây</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F3EFE6] text-[#7D715E] border-b border-[#EAE4D7] font-semibold">
                <th className="py-4 px-6 text-center w-20">Hạng</th>
                <th className="py-4 px-6">Creator / Đối Tác</th>
                <th className="py-4 px-6">Cấp Bậc</th>
                <th className="py-4 px-6 text-right">Lượt Click</th>
                <th className="py-4 px-6 text-right">Đơn Hàng</th>
                <th className="py-4 px-6 text-right">Tỷ Lệ Chốt (CR%)</th>
                <th className="py-4 px-6 text-right font-bold text-[#1A1612]">Doanh Số (GMV)</th>
                <th className="py-4 px-6 text-right">Hoa Hồng</th>
                <th className="py-4 px-6 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {rankings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#7D715E]">
                    Chưa có thêm đối tác trong khoảng thời gian này.
                  </td>
                </tr>
              ) : (
                rankings.map((item) => (
                  <tr
                    key={item.collaboratorId}
                    className={`hover:bg-[#F3EFE6] transition-colors group ${
                      item.isCurrentUser ? 'bg-[#FBF5EB] hover:bg-amber-500/15' : ''
                    }`}
                  >
                    {/* Rank Number & Delta */}
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <span className="font-extrabold text-sm text-[#7D715E]">
                          #{item.rank < 10 ? `0${item.rank}` : item.rank}
                        </span>
                        {item.rankDelta > 0 && (
                          <span className="flex items-center text-[10px] text-[#059669] font-bold" title={`Tăng ${item.rankDelta} bậc`}>
                            <TrendingUp className="w-3 h-3" />
                            <span>{item.rankDelta}</span>
                          </span>
                        )}
                        {item.rankDelta < 0 && (
                          <span className="flex items-center text-[10px] text-[#DC2626] font-bold" title={`Giảm ${Math.abs(item.rankDelta)} bậc`}>
                            <TrendingDown className="w-3 h-3" />
                            <span>{Math.abs(item.rankDelta)}</span>
                          </span>
                        )}
                        {item.rankDelta === 0 && (
                          <span className="text-[#7D715E] text-[10px]">
                            <Minus className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Creator Info */}
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-full bg-[#F3EFE6] flex items-center justify-center text-xs font-bold text-[#7D715E] border border-[#EAE4D7] overflow-hidden flex-shrink-0">
                          {item.avatarUrl ? (
                            <img src={item.avatarUrl} alt={item.fullName} className="w-full h-full object-cover" />
                          ) : (
                            item.fullName?.charAt(0) || 'K'
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-[#1A1612] group-hover:text-[#8F682E] transition-colors flex items-center gap-1.5">
                            <span>{item.fullName}</span>
                            {item.isCurrentUser && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500 text-[#1A1612] text-[10px] font-bold">Bạn</span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#7D715E]">{item.primaryChannelHandle || '@creator'}</p>
                        </div>
                      </div>
                    </td>

                    {/* Tier */}
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F3EFE6] text-[#7D715E] border border-[#EAE4D7]">
                        {item.tierName}
                      </span>
                    </td>

                    {/* Clicks */}
                    <td className="py-4 px-6 text-right font-medium text-[#7D715E]">
                      {formatNumber(item.totalClicks)}
                    </td>

                    {/* Orders */}
                    <td className="py-4 px-6 text-right font-medium text-[#7D715E]">
                      {item.totalOrders} đơn
                    </td>

                    {/* Conversion Rate */}
                    <td className="py-4 px-6 text-right">
                      <span className="font-bold text-[#059669]">{item.conversionRate}%</span>
                    </td>

                    {/* GMV */}
                    <td className="py-4 px-6 text-right font-extrabold text-[#8F682E] text-sm">
                      {formatVND(item.grossRevenue)}
                    </td>

                    {/* Commission */}
                    <td className="py-4 px-6 text-right font-semibold text-[#7D715E]">
                      {formatVND(item.totalCommission)}
                    </td>

                    {/* Action */}
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleOpenCreatorModal(item.collaboratorId)}
                        className="px-3 py-1.5 bg-[#F3EFE6] hover:bg-amber-500 hover:text-[#1A1612] text-[#7D715E] font-semibold rounded-xl text-xs transition-all flex items-center space-x-1 mx-auto"
                      >
                        <span>Hồ sơ</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── 4. THANH VỊ TRÍ CỦA TÔI (MY RANK STICKY BAR) ──────────────── */}
      {myRank && (
        <div className="fixed bottom-4 left-4 right-4 max-w-5xl mx-auto z-40">
          <div className="bg-gradient-to-r from-[#FBF5EB] via-white to-[#F3EFE6] border-2 border-[#EEDFC6] rounded-2xl p-4 shadow-2xl backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500 text-[#1A1612] font-black text-xl shadow-lg shadow-amber-500/30 flex-shrink-0">
                #{myRank.myRank}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-[#1A1612] text-sm">Vị Trí Của Bạn Trong {myRank.currentPeriodLabel}</h4>
                  {myRank.rankDelta > 0 && (
                    <span className="text-[#059669] text-xs font-bold">↑ Tăng {myRank.rankDelta} bậc</span>
                  )}
                </div>
                <p className="text-xs text-[#7D715E]">
                  Doanh số hiện tại: <strong className="text-[#8F682E] font-bold">{formatVND(myRank.myRevenue)}</strong> ({myRank.myOrders} đơn)
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {myRank.myRank > 10 ? (
                <div className="text-right">
                  <span className="text-[11px] text-[#7D715E]">Cần thêm để vào Top 10:</span>
                  <div className="text-sm font-bold text-[#8F682E]">+{formatVND(myRank.gapToTop10Revenue)}</div>
                </div>
              ) : (
                <div className="px-3 py-1 bg-[#059669]/10 text-[#059669] border border-emerald-500/30 rounded-xl text-xs font-bold">
                  ✓ ĐANG NẰM TRONG TOP 10
                </div>
              )}

              <button
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-yellow-400 text-[#1A1612] font-bold rounded-xl text-xs shadow-md transition-transform active:scale-95"
              >
                Đua Top Ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 5. MODAL HỒ SƠ VINH DANH CREATOR (CREATOR HALL OF FAME) ─────── */}
      {selectedCreatorId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-[#EEDFC6] rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl shadow-amber-500/10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EAE4D7] pb-4">
              <div className="flex items-center space-x-2">
                <Trophy className="w-6 h-6 text-[#8F682E]" />
                <h3 className="text-lg font-bold text-[#1A1612]">Hồ Sơ Vinh Danh Creator (Hall of Fame)</h3>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1.5 rounded-xl text-[#7D715E] hover:text-[#1A1612] hover:bg-[#F3EFE6] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingProfile || !creatorProfile ? (
              <div className="py-12 text-center text-[#7D715E] space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#8F682E]" />
                <p className="text-xs">Đang tải hồ sơ thành tích...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Creator Header Info */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 p-1 flex-shrink-0 shadow-lg">
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-2xl font-bold text-[#8F682E] overflow-hidden">
                      {creatorProfile.avatarUrl ? (
                        <img src={creatorProfile.avatarUrl} alt={creatorProfile.fullName} className="w-full h-full object-cover" />
                      ) : (
                        creatorProfile.fullName?.charAt(0)
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <h4 className="text-xl font-extrabold text-[#1A1612]">{creatorProfile.fullName}</h4>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FBF5EB] text-[#8F682E] border border-[#EEDFC6]">
                        {creatorProfile.tierName}
                      </span>
                    </div>
                    <p className="text-xs text-[#7D715E]">{creatorProfile.bio}</p>
                    <p className="text-xs text-[#7D715E]">{creatorProfile.email}</p>
                  </div>
                </div>

                {/* Lifetime Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#EAE4D7] text-center">
                    <span className="text-[11px] text-[#7D715E]">Tổng Đơn Hàng</span>
                    <div className="text-base font-bold text-[#1A1612]">{formatNumber(creatorProfile.lifetimeStats.totalOrders)}</div>
                  </div>
                  <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#EAE4D7] text-center">
                    <span className="text-[11px] text-[#7D715E]">Tổng Doanh Thu</span>
                    <div className="text-base font-bold text-[#8F682E]">{formatVND(creatorProfile.lifetimeStats.totalRevenue)}</div>
                  </div>
                  <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#EAE4D7] text-center">
                    <span className="text-[11px] text-[#7D715E]">Tổng Hoa Hồng</span>
                    <div className="text-base font-bold text-[#059669]">{formatVND(creatorProfile.lifetimeStats.totalCommission)}</div>
                  </div>
                  <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#EAE4D7] text-center">
                    <span className="text-[11px] text-[#7D715E]">Mẫu Thử Đã Nhận</span>
                    <div className="text-base font-bold text-blue-400">{creatorProfile.lifetimeStats.totalSamplesReceived} mẫu</div>
                  </div>
                </div>

                {/* Badges */}
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-[#7D715E] uppercase tracking-wider">Huy Hiệu Danh Dự</h5>
                  <div className="flex flex-wrap gap-2">
                    {creatorProfile.badges.map((b) => (
                      <span
                        key={b.id}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#FBF5EB] text-[#8F682E] border border-[#EEDFC6] flex items-center space-x-1.5"
                      >
                        <Award className="w-3.5 h-3.5 text-[#8F682E]" />
                        <span>{b.name}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Social Channels */}
                {creatorProfile.socialChannels.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-[#7D715E] uppercase tracking-wider">Kênh Mạng Xã Hội</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {creatorProfile.socialChannels.map((s, idx) => (
                        <div key={idx} className="p-2.5 bg-[#FAF8F5] rounded-xl border border-[#EAE4D7] flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-[#1A1612]">{s.platform}</span>
                            <p className="text-[#7D715E] text-[11px]">{s.channelName ? `@${s.channelName}` : 'Chưa đặt tên'}</p>
                          </div>
                          <span className="text-[#7D715E] font-medium">{formatNumber(s.followerCount)} theo dõi</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-[#EAE4D7]">
                  <button
                    onClick={handleCloseModal}
                    className="px-4 py-2 bg-[#F3EFE6] hover:bg-[#F3EFE6] text-[#7D715E] text-xs font-semibold rounded-xl transition-colors"
                  >
                    Đóng
                  </button>
                  <button
                    onClick={() => {
                      alert(`Đã gửi lời mời hợp tác độc quyền tới Creator ${creatorProfile.fullName}!`);
                      handleCloseModal();
                    }}
                    className="px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-[#1A1612] text-xs font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-transform active:scale-95"
                  >
                    👑 Mời Vào Chiến Dịch VIP (FR-27)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
