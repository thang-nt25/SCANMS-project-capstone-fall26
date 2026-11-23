import { createPortal } from 'react-dom';
import { Gem, Medal, MessageSquare, ExternalLink } from 'lucide-react';
import type { KolMatchResult, TargetProductSummary } from '../../services/ai-recommendation.service';
import { handleAvatarImageError } from '../../utils/image-fallback.utils';
import { getKolPriceComparison } from '../../utils/ai-price.utils';
import { Modal } from '../ui/Modal';

function channelUrl(value?: string) {
  try {
    const url = new URL(value || '');
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined;
  } catch { return undefined; }
}
const number = (value?: number | null) => value == null ? '—' : value.toLocaleString('vi-VN');

export function KolMatchAnalysisDialog({ kol, product, onClose, onMessage }: {
  kol: KolMatchResult; product?: TargetProductSummary | null; onClose: () => void; onMessage: () => void;
}) {
  const cold = kol.scoringMode === 'COLD_START' || (!kol.scoringMode && (kol.lifetimeStats?.totalOrders ?? 0) < 5);
  const weights = kol.scoringWeights || (cold
    ? { categoryScore: .7, conversionRateScore: 0, priceFitScore: 0, tierAndSocialScore: .3 }
    : { categoryScore: .35, conversionRateScore: .25, priceFitScore: .2, tierAndSocialScore: .2 });
  const axes = [
    { key: 'categoryScore', label: 'Ngành hàng' },
    { key: 'conversionRateScore', label: 'Chuyển đổi' },
    { key: 'priceFitScore', label: 'Phân khúc giá' },
    { key: 'tierAndSocialScore', label: cold ? 'Người theo dõi' : 'Cấp bậc & MXH' },
  ] as const;
  const price = getKolPriceComparison(kol.lifetimeStats?.avgSellingPrice, product?.price);
  const evidence = [
    ['Ngành hàng', kol.categoryMatchSource === 'SALES' ? 'Có đơn đã giao/hoàn tất cùng ngành' : kol.categoryMatchSource === 'PROFILE' ? 'Khớp hồ sơ / kênh liên kết' : 'Chưa ghi nhận bằng chứng cùng ngành'],
    ['Đơn ghi nhận', number(kol.lifetimeStats?.totalOrders)],
    ['Chuyển đổi', cold || kol.lifetimeStats?.conversionRate == null ? '—' : `${number(kol.lifetimeStats.conversionRate)}%`],
    ['Giá bán TB', !cold && price.hasData ? `${price.formattedAvgPrice} · ${price.badgeText.replace('Cao hơn SP +', 'Cao hơn ').replace('Thấp hơn SP -', 'Thấp hơn ').replace('Ngang tầm giá SP', 'Ngang tầm sản phẩm')}` : '—'],
  ];
  return createPortal(<Modal isOpen onClose={onClose} title="Phân tích độ phù hợp" stickyHeader maxWidth="3xl" className="kol-match-analysis max-w-[720px]! max-h-[85dvh]!" bodyClassName="p-5! space-y-4"
    footer={<div className="flex items-center justify-between gap-3"><span className="text-[11px] text-[#7D715E]">Điểm tham khảo.</span><button type="button" onClick={onMessage} className="inline-flex h-[38px]! items-center justify-center gap-1.5 rounded-lg! border border-[#B88E4F] bg-[#C59B58] px-4 text-xs font-semibold text-[#231D15] hover:bg-[#B88E4F]"><MessageSquare size={14}/>Nhắn tin</button></div>}>
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5"><span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-[#EAE4D7] bg-[#F3EFE6] text-[#90682F]">{kol.avatarUrl ? <img src={kol.avatarUrl} onError={handleAvatarImageError} alt="" className="size-full object-cover"/> : kol.fullName.charAt(0)}</span><div className="min-w-0"><strong className="block break-words text-sm">{kol.fullName}</strong><span className="mt-0.5 flex items-center gap-1 text-[11px] text-[#90682F]">{/DIAMOND|KIM CƯƠNG/i.test(kol.tierName) ? <Gem size={14}/> : <Medal size={14}/>} {kol.tierName}</span></div></div>
      <strong className="shrink-0 text-2xl font-bold tabular-nums text-[#90682F]">{number(kol.matchScore)}<small className="text-xs font-normal text-[#7D715E]">/100</small></strong>
    </div>
    {product?.title && <p className="line-clamp-2 text-xs text-[#7D715E]" title={product.title}>Sản phẩm: {product.title}</p>}
    <section className="border-t border-[#EAE4D7] pt-3"><h4 className="mb-3 text-xs font-semibold">Điểm theo tiêu chí</h4>
      <div className="grid grid-cols-2 gap-y-4">{axes.filter(axis => weights[axis.key] > 0).map((axis, index) => {
        const value = kol.scoreBreakdown?.[axis.key];
        return <div key={axis.key} className={`min-w-0 ${index % 2 ? 'border-l border-[#EAE4D7] pl-4' : 'pr-4'}`}>
          <div className="flex flex-wrap items-center justify-between gap-1 text-xs"><span className="text-[#655A49]">{axis.label} · {Math.round(weights[axis.key] * 100)}%</span><strong className="tabular-nums">{number(value)}{value != null ? '/100' : ''}</strong></div>
          {value != null && <progress aria-label={`Điểm ${axis.label}`} value={Math.max(0, Math.min(100, value))} max={100} className="deal-kpi-progress mt-2 h-1!"/>}
        </div>;
      })}</div>
    </section>
    <section className="border-t border-[#EAE4D7] pt-3"><h4 className="mb-2 text-xs font-semibold">Căn cứ đánh giá</h4><dl className="space-y-2 text-xs">{evidence.map(([label, value]) => <div key={label} className="grid grid-cols-[100px_minmax(0,1fr)] gap-3"><dt className="text-[#7D715E]">{label}</dt><dd className="break-words tabular-nums text-[#1A1612]">{value}</dd></div>)}</dl></section>
    {kol.socialChannels?.length > 0 && <section className="border-t border-[#EAE4D7] pt-3"><h4 className="mb-2 text-xs font-semibold">Kênh liên kết</h4><div className="divide-y divide-[#EAE4D7]">{kol.socialChannels.map((channel, index) => <div key={`${channel.platform}-${index}`} className="flex items-center justify-between gap-3 py-2 text-xs">
      <div className="min-w-0"><strong className="font-medium">{channel.platform}</strong>{channel.channelName && <span className="ml-2 break-all text-[#7D715E]">@{channel.channelName.replace(/^@/, '')}</span>}<span className="mt-1 block text-[11px] tabular-nums text-[#7D715E]">{number(channel.followerCount)} người theo dõi</span></div>
      {channelUrl(channel.channelUrl) && <a href={channelUrl(channel.channelUrl)} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1 text-[#90682F]">Mở kênh <ExternalLink size={13}/></a>}
    </div>)}</div></section>}
    {kol.aiReasoning && <section className="border-t border-[#EAE4D7] pt-3"><h4 className="mb-1 text-xs font-semibold">Ghi chú phân tích</h4><p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-[#7D715E]">{kol.aiReasoning}</p></section>}
  </Modal>, document.body);
}
