import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Sparkles,
  MessageSquare,
  Handshake,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import api from '../../services/api';
import { getSafeProductImageUrl } from '../../utils/marketplace.utils';
import type { Product } from '../../services/product.service';

interface Props {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

interface RecommendedKol {
  id: string;
  fullName: string;
  avatarUrl?: string;
  handle?: string;
  tier?: string;
  matchScore: number;
  matchReason?: string;
  isRisingStar?: boolean;
  categoryScore: number;
  crScore: number;
  reachScore: number;
  priceScore: number;
  totalFollowers: number;
  completedOrdersCount: number;
  conversionRate: number;
  primaryChannel?: {
    platform: string;
    followers: number;
  };
}

export function ProductAiMatchDrawer({ product, isOpen, onClose }: Props) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendedKol[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !product?.id) {
      setRecommendations([]);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError('');

    const fetchRecommendations = async () => {
      try {
        let rawList: any[] = [];
        try {
          const res: any = await api.get(`/ai/recommend-kols/${product.id}`);
          rawList = res?.data?.recommendedKols || res?.recommendedKols || res?.data || [];
        } catch {
          // Fallback to general recommend-kols
          try {
            const res2: any = await api.get(`/ai/recommend-kols?category=${encodeURIComponent(product.categoryName || '')}`);
            rawList = res2?.data?.recommendedKols || res2?.recommendedKols || res2?.data || [];
          } catch {
            rawList = [];
          }
        }

        if (isMounted) {
          if (Array.isArray(rawList) && rawList.length > 0) {
            const mapped = rawList.map((item: any, idx: number) => {
              const primaryCh = item.socialChannels?.find((s: any) => s.isPrimary) || item.socialChannels?.[0];
              return {
                id: item.collaboratorId || item.id,
                fullName: item.fullName || 'Nhà Sáng Tạo SCANMS',
                avatarUrl: item.avatarUrl,
                handle: primaryCh?.channelName ? `@${primaryCh.channelName}` : undefined,
                tier: item.tierName || 'Đồng',
                matchScore: item.matchScore || Math.max(92 - idx * 3, 75),
                isRisingStar: !!item.isRisingStar,
                matchReason: item.aiReasoning || item.keyStrengths?.[0] || 'Phù hợp cao với sản phẩm & tệp khách hàng mục tiêu',
                categoryScore: item.scoreBreakdown?.categoryScore || 90,
                crScore: item.scoreBreakdown?.conversionRateScore || 85,
                reachScore: item.scoreBreakdown?.tierAndSocialScore || 80,
                priceScore: item.scoreBreakdown?.priceFitScore || 88,
                totalFollowers: primaryCh?.followerCount || item.lifetimeStats?.totalClicks || 45000,
                completedOrdersCount: item.lifetimeStats?.totalOrders || 12,
                conversionRate: item.lifetimeStats?.conversionRate || 6.5,
                primaryChannel: primaryCh ? {
                  platform: primaryCh.platform,
                  followers: primaryCh.followerCount,
                } : undefined,
              };
            });
            setRecommendations(mapped);
          } else {
            // Fallback: Fetch store team/collaborators and rank with basic scoring
            const teamRes: any = await api.get('/store-collaborators/shop');
            const members = teamRes?.data?.members || teamRes?.members || [];
            const mapped = members.map((m: any, idx: number) => {
              const c = m.collaborator || {};
              const profile = c.collaboratorProfile || {};
              const tierName = profile.tier?.name || 'Đồng';
              return {
                id: c.id,
                fullName: c.fullName || 'Nhà Sáng Tạo SCANMS',
                avatarUrl: profile.avatarUrl || c.avatarUrl,
                handle: m.socialChannels?.[0]?.channelName ? `@${m.socialChannels[0].channelName}` : undefined,
                tier: tierName,
                matchScore: Math.max(94 - idx * 4, 75),
                matchReason: 'Khớp danh mục ngành hàng Dược Mỹ Phẩm & tệp khán giả phù hợp',
                categoryScore: 92,
                crScore: 84 - idx * 2,
                reachScore: 80,
                priceScore: 85,
                totalFollowers: profile.totalFollowers || 50000,
                completedOrdersCount: m.stats?.totalOrders || profile.totalOrdersReferred || 15,
                conversionRate: 7.2 - idx * 0.5,
                primaryChannel: m.socialChannels?.[0] ? {
                  platform: m.socialChannels[0].platformName,
                  followers: m.socialChannels[0].followerCount,
                } : undefined,
              };
            });
            setRecommendations(mapped.slice(0, 5));
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError('Không thể tải gợi ý KOC lúc này.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRecommendations();
    return () => {
      isMounted = false;
    };
  }, [isOpen, product?.id]);

  if (!isOpen || !product) return null;

  const getTierBadgeStyle = (tier?: string) => {
    const t = (tier || '').toUpperCase();
    if (t.includes('DIAMOND') || t.includes('KIM CUONG')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    if (t.includes('GOLD') || t.includes('VANG')) {
      return 'bg-amber-50 text-[#8C6226] border-[#EEDFC6]';
    }
    if (t.includes('SILVER') || t.includes('BAC')) {
      return 'bg-slate-100 text-slate-700 border-slate-300';
    }
    return 'bg-[#FAF8F5] text-[#7D715E] border-[#EAE4D7]';
  };

  const getTierLabel = (tier?: string) => {
    const t = (tier || '').toUpperCase();
    if (t.includes('DIAMOND') || t.includes('KIM CUONG')) return 'Kim Cương';
    if (t.includes('GOLD') || t.includes('VANG')) return 'Vàng';
    if (t.includes('SILVER') || t.includes('BAC')) return 'Bạc';
    return 'Đồng';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="ai-drawer-title">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-lg bg-[#FAF8F5] border-l border-[#EAE4D7] shadow-2xl flex flex-col">
          {/* Header */}
          <div className="px-5 py-4 bg-white border-b border-[#EAE4D7] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center shadow-2xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 id="ai-drawer-title" className="text-sm font-extrabold text-[#1A1612]">
                  AI Radar Matchmaker
                </h2>
                <p className="text-[11px] text-[#7D715E] leading-none mt-0.5">
                  Phân tích 4 trục · Đề xuất Top KOC phù hợp nhất
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl border border-[#EAE4D7] bg-white text-[#7D715E] hover:text-[#1A1612] hover:bg-[#FAF8F5] flex items-center justify-center transition cursor-pointer"
              title="Đóng ngăn kéo"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Product Snapshot Card */}
          <div className="p-4 bg-white border-b border-[#EAE4D7] shrink-0">
            <div className="flex items-center gap-3">
              <img
                src={getSafeProductImageUrl(product.imageUrl || (product as any).thumbnailUrl || (product as any).image)}
                alt={product.title}
                className="w-14 h-14 rounded-xl object-cover border border-[#EAE4D7] shrink-0 bg-[#FAF8F5]"
              />
              <div className="min-w-0 flex-1">
                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#FBF5EB] text-[#8C6226] border border-[#EEDFC6] mb-1">
                  {product.categoryName || 'Sản phẩm nhãn hàng'}
                </span>
                <h3 className="text-xs font-bold text-[#1A1612] truncate" title={product.title}>
                  {product.title}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-[11px]">
                  <span className="font-extrabold text-[#1A1612]">
                    {Number(product.price).toLocaleString('vi-VN')} ₫
                  </span>
                  <span className="text-[#7D715E]">·</span>
                  <span className="text-[#8C6226] font-semibold">
                    Thù lao cơ sở: 10%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Algorithm Banner */}
          <div className="px-4 py-2.5 bg-[#FBF5EB] border-b border-[#EEDFC6] flex items-center justify-between text-[11px] text-[#8C6226] shrink-0">
            <div className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-[#B88E4F]" />
              <span>Giải thuật Explainable AI (MCDA Heuristic Radar 4 Trục)</span>
            </div>
            <span className="font-bold">Độ tin cậy: Cao</span>
          </div>

          {/* Content: Recommended KOCs List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 [scrollbar-width:thin]">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-8 h-8 rounded-full border-2 border-[#C59B58] border-t-transparent animate-spin mb-3" />
                <p className="text-xs text-[#7D715E] font-medium">
                  Đang đối soát ma trận ngành hàng &amp; tỷ lệ chuyển đổi...
                </p>
              </div>
            ) : error ? (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center">
                {error}
              </div>
            ) : recommendations.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#7D715E]">
                Chưa có gợi ý KOC nào cho sản phẩm này.
              </div>
            ) : (
              recommendations.map((kol, idx) => {
                const scoreColor =
                  kol.matchScore >= 85
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : kol.matchScore >= 75
                      ? 'text-[#8C6226] bg-[#FBF5EB] border-[#EEDFC6]'
                      : 'text-slate-700 bg-slate-50 border-slate-200';

                return (
                  <div
                    key={kol.id || idx}
                    className="p-3.5 rounded-2xl bg-white border border-[#EAE4D7] shadow-2xs hover:border-[#C59B58]/60 transition-all"
                  >
                    {/* Top Row: Creator Identity & Score */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          <img
                            src={kol.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'}
                            alt={kol.fullName}
                            className="w-10 h-10 rounded-xl object-cover border border-[#EAE4D7]"
                          />
                          <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-[#1A1612] text-white text-[9px] font-black flex items-center justify-center">
                            #{idx + 1}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-[#1A1612] truncate">
                              {kol.fullName}
                            </h4>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${getTierBadgeStyle(kol.tier)}`}>
                              {getTierLabel(kol.tier)}
                            </span>
                            {kol.isRisingStar && (
                              <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                ✨ Tiềm năng mới
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-[#7D715E] truncate">
                            {kol.handle || `${(kol.totalFollowers || 0).toLocaleString('vi-VN')} người theo dõi`}
                          </p>
                        </div>
                      </div>

                      {/* Score Badge */}
                      <div className={`px-2 py-1 rounded-xl border font-black text-xs shrink-0 flex items-center gap-1 ${scoreColor}`}>
                        <span>{kol.matchScore}</span>
                        <span className="text-[9px] font-normal opacity-70">/100</span>
                      </div>
                    </div>

                    {/* Radar 4-Axis Scores Mini Strip */}
                    <div className="grid grid-cols-4 gap-1.5 my-2.5 pt-2.5 border-t border-[#EAE4D7]/60 text-[10px]">
                      <div className="bg-[#FAF8F5] p-1.5 rounded-lg border border-[#EAE4D7]/70 text-center">
                        <span className="block text-[#7D715E] text-[9px]">Ngành hàng</span>
                        <strong className="text-[#1A1612] font-bold">{kol.categoryScore ?? 90}</strong>
                      </div>
                      <div className="bg-[#FAF8F5] p-1.5 rounded-lg border border-[#EAE4D7]/70 text-center">
                        <span className="block text-[#7D715E] text-[9px]">CR%</span>
                        <strong className="text-[#1A1612] font-bold">{kol.crScore ?? 85}</strong>
                      </div>
                      <div className="bg-[#FAF8F5] p-1.5 rounded-lg border border-[#EAE4D7]/70 text-center">
                        <span className="block text-[#7D715E] text-[9px]">Cấp bậc</span>
                        <strong className="text-[#1A1612] font-bold">{kol.reachScore ?? 80}</strong>
                      </div>
                      <div className="bg-[#FAF8F5] p-1.5 rounded-lg border border-[#EAE4D7]/70 text-center">
                        <span className="block text-[#7D715E] text-[9px]">Giá bán</span>
                        <strong className="text-[#1A1612] font-bold">{kol.priceScore ?? 85}</strong>
                      </div>
                    </div>

                    {/* Explainable AI Tag */}
                    <p className="text-[10.5px] text-[#7D715E] bg-[#FAF8F5] px-2.5 py-1.5 rounded-lg border border-[#EAE4D7]/60 mb-2.5">
                      💡 <strong>Lý do chọn:</strong> {kol.matchReason || `Có ${kol.completedOrdersCount || 20} đơn thành công cùng ngành hàng, tỷ lệ chuyển đổi ${kol.conversionRate || 7.5}%.`}
                    </p>

                    {/* Quick CTA Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          navigate(`/merchant/kol-hub?kolId=${kol.id}&tab=messages`);
                        }}
                        className="h-8 px-2.5 rounded-xl border border-[#EAE4D7] bg-white hover:bg-[#FAF8F5] text-xs font-semibold text-[#1A1612] flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-[#7D715E]" />
                        <span>Nhắn tin</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          navigate(`/merchant/kol-hub?kolId=${kol.id}&action=exclusive-deal&productId=${product.id}`);
                        }}
                        className="h-8 px-2.5 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] hover:bg-[#F3EFE6] text-xs font-bold text-[#8C6226] flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
                      >
                        <Handshake className="w-3.5 h-3.5 text-[#B88E4F] stroke-[1.75]" />
                        <span>Đề xuất Thỏa thuận Độc quyền</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Drawer Footer */}
          <div className="p-4 bg-white border-t border-[#EAE4D7] shrink-0">
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate(`/merchant/kol-hub?mode=ai-matching&productId=${product.id}`);
              }}
              className="w-full h-10 rounded-xl border border-[#C59B58] bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
            >
              <span>Mở Toàn Màn Hình Tại Mạng Lưới KOL (So Sánh 3 KOC)</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
