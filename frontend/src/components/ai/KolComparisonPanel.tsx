import { handleAvatarImageError } from '@/utils/image-fallback.utils';
import type { KolMatchResult } from '@/services/ai-recommendation.service';
import { downloadReport } from '@/utils/report-export';
import { MultiAiRadarChart } from './AiRadarChart';
import { Award, MessageSquare, Download, Gem, Medal } from 'lucide-react';
import { Modal } from '../ui/Modal';

interface KolComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedKols: KolMatchResult[];
  onNegotiateDeal: (kol: KolMatchResult) => void;
  onViewAnalysis?: (kol: KolMatchResult) => void;
  productTitle?: string;
}
const COLORS = ['#B88E4F', '#231D15', '#D97706'];
const number = (value?: number | null) => value == null ? '—' : value.toLocaleString('vi-VN');
const cold = (kol: KolMatchResult) => kol.scoringMode === 'COLD_START' || (!kol.scoringMode && kol.lifetimeStats.totalOrders < 5);
const weights = (kol: KolMatchResult) => kol.scoringWeights || (cold(kol)
  ? { categoryScore: .7, conversionRateScore: 0, priceFitScore: 0, tierAndSocialScore: .3 }
  : { categoryScore: .35, conversionRateScore: .25, priceFitScore: .2, tierAndSocialScore: .2 });

export function KolComparisonModal({ isOpen, onClose, selectedKols, onNegotiateDeal, onViewAnalysis, productTitle }: KolComparisonModalProps) {
  const kols = selectedKols.slice(0, 3);
  if (!isOpen || !kols.length) return null;
  const sameMode = kols.every(kol => cold(kol) === cold(kols[0]));
  const score = (kol: KolMatchResult, axis: keyof KolMatchResult['scoreBreakdown']) => weights(kol)[axis] > 0 ? `${number(kol.scoreBreakdown[axis])}/100 · ${Math.round(weights(kol)[axis] * 100)}%` : 'Không áp dụng';
  const summary = [
    { label: 'Điểm phù hợp', value: (kol: KolMatchResult) => `${number(kol.matchScore)}/100` },
    { label: 'Đơn đã ghi nhận', value: (kol: KolMatchResult) => number(kol.lifetimeStats.totalOrders) },
    { label: 'Lượt nhấp hợp lệ', value: (kol: KolMatchResult) => cold(kol) ? '—' : number(kol.lifetimeStats.totalClicks) },
    { label: 'Chuyển đổi', value: (kol: KolMatchResult) => cold(kol) || kol.lifetimeStats.conversionRate == null ? '—' : `${number(kol.lifetimeStats.conversionRate)}%` },
  ];
  const metrics = [
    { label: 'Ngành hàng', value: (kol: KolMatchResult) => score(kol, 'categoryScore') },
    { label: 'Điểm chuyển đổi', value: (kol: KolMatchResult) => score(kol, 'conversionRateScore') },
    { label: 'Phân khúc giá', value: (kol: KolMatchResult) => score(kol, 'priceFitScore') },
    { label: 'Cấp bậc & mạng xã hội', value: (kol: KolMatchResult) => score(kol, 'tierAndSocialScore') },
    { label: 'Giá bán TB ghi nhận', value: (kol: KolMatchResult) => cold(kol) || kol.lifetimeStats.avgSellingPrice == null ? '—' : `${number(kol.lifetimeStats.avgSellingPrice)} ₫` },
    { label: 'Căn cứ ngành hàng', value: (kol: KolMatchResult) => kol.categoryMatchSource === 'SALES' ? 'Đơn thực tế cùng ngành' : kol.categoryMatchSource === 'PROFILE' ? 'Hồ sơ / kênh liên kết' : 'Chưa ghi nhận bằng chứng' },
    { label: 'Kênh / Người theo dõi', value: (kol: KolMatchResult) => kol.socialChannels?.length ? kol.socialChannels.map(channel => `${channel.platform} · ${number(channel.followerCount)}`).join(' / ') : '—' },
  ];
  const table = (rows: typeof metrics, withProfiles: boolean) => <div className="overflow-x-auto"><table className="kol-comparison-table w-full table-fixed text-left text-xs">
    <colgroup><col style={{ width: '28%' }}/>{kols.map(kol => <col key={kol.collaboratorId} style={{ width: `${72 / kols.length}%` }}/>)}</colgroup>
    <thead><tr className="border-b border-[#EAE4D7] bg-[#FAF8F5]"><th className="p-3 font-medium text-[#7D715E]">{withProfiles ? 'Tiêu chí' : 'Chỉ số'}</th>{kols.map((kol, index) => <th key={kol.collaboratorId} className="border-l border-[#EAE4D7] p-3 font-semibold">
      <div className="flex items-center gap-2">{withProfiles && <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-[#F3EFE6] text-[#90682F]">{kol.avatarUrl ? <img src={kol.avatarUrl} onError={handleAvatarImageError} alt="" className="size-full object-cover"/> : kol.fullName.charAt(0)}</span>}
      <div className="min-w-0"><span className="inline-block size-2 rounded-full align-middle" style={{ background: COLORS[index] }}/> <span className="break-words">{kol.fullName}</span>
        {withProfiles && <span className="mt-1 flex items-center gap-1 text-[10px] font-medium text-[#90682F]">{/DIAMOND|KIM CƯƠNG/i.test(kol.tierName) ? <Gem size={14}/> : <Medal size={14}/>} {kol.tierName}</span>}
      </div></div>
    </th>)}</tr></thead>
    <tbody>{rows.map(row => <tr key={row.label} className="border-b border-[#EAE4D7] last:border-0"><th className="p-3 font-medium text-[#655A49]">{row.label}</th>{kols.map(kol => <td key={kol.collaboratorId} className="border-l border-[#EAE4D7] p-3 tabular-nums">{row.value(kol)}</td>)}</tr>)}</tbody>
  </table></div>;
  return <Modal isOpen={isOpen} onClose={onClose} title="So sánh KOC" subtitle={productTitle ? `Sản phẩm: ${productTitle}` : undefined} maxWidth="5xl" stickyHeader className="kol-comparison-dialog max-w-[960px]!" bodyClassName="p-4! space-y-4"
    footer={<div className="flex flex-wrap items-center justify-between gap-2">
      <button type="button" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#EAE4D7] px-3 text-xs text-[#655A49]" onClick={() => downloadReport('SCANMS_KOL_Comparison.csv', [
        ['Sản phẩm', productTitle || '—'], ['Tiêu chí', ...kols.map(kol => kol.fullName)], ...[...summary, ...metrics].map(row => [row.label, ...kols.map(row.value)]), ['Lý giải đầy đủ', ...kols.map(kol => kol.aiReasoning || '—')],
      ])}><Download size={14}/>Xuất CSV</button>
      <div className="flex flex-wrap gap-2">{kols.map(kol => <button key={kol.collaboratorId} type="button" title={`Nhắn tin về Deal với ${kol.fullName}`} onClick={() => { onClose(); onNegotiateDeal(kol); }} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-3 py-1 text-xs font-semibold text-[#231D15]"><MessageSquare size={14}/>Nhắn {kol.fullName}</button>)}</div>
    </div>}>
    {!sameMode && <p className="text-xs text-[#90682F]">Các KOC thuộc nhóm chấm điểm khác nhau; điểm tổng không dùng để xếp hạng trực tiếp.</p>}
    <div className="grid items-center gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <MultiAiRadarChart datasets={kols.map((kol, index) => ({ name: kol.fullName, scores: kol.scoreBreakdown, color: COLORS[index], fillColor: `${COLORS[index]}25` }))} size={220}
        axisLabels={['Ngành hàng', 'Chuyển đổi', 'Cấp bậc & MXH', 'Phân khúc giá']} />
      {table(summary, false)}
    </div>
    <div className="border-y border-[#EAE4D7]">{table(metrics, true)}</div>
    <section><h4 className="mb-2 text-sm font-semibold">Căn cứ đánh giá</h4><div className="grid gap-3 divide-[#EAE4D7] sm:grid-flow-col sm:auto-cols-fr sm:divide-x">
      {kols.map(kol => <div key={kol.collaboratorId} className="min-w-0 sm:px-3 first:pl-0"><strong className="text-xs">{kol.fullName}</strong>
        <p className="mt-1 text-xs leading-relaxed text-[#7D715E]">{kol.matchedCategory || kol.lifetimeStats.primaryCategory || 'Chưa ghi nhận ngành hàng'} · {cold(kol) ? 'Hồ sơ KOC mới' : `${number(kol.lifetimeStats.totalOrders)} đơn · Chuyển đổi ${number(kol.lifetimeStats.conversionRate)}%`}</p>
        {onViewAnalysis && <button type="button" className="mt-2 text-xs font-medium text-[#90682F] underline" onClick={() => { onClose(); onViewAnalysis(kol); }}>Xem phân tích ↗</button>}
      </div>)}
    </div></section>
  </Modal>;
}

/**
 * Floating Dock at bottom of screen when >= 2 KOLs are selected for comparison
 */
export function KolComparisonDock({
  selectedKols,
  onOpenCompare,
  onClear,
}: {
  selectedKols: KolMatchResult[];
  onOpenCompare: () => void;
  onClear: () => void;
}) {
  if (selectedKols.length < 1) return null;

  return (
    <div className="kol-comparison-dock fixed bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-24px)] bg-white text-[#1A1612] px-4 py-2 rounded-xl shadow-lg border border-[#EAE4D7] flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center gap-2.5">
        <span className="w-6 h-6 rounded-full bg-[#C59B58] text-[#1A1612] text-xs font-bold flex items-center justify-center">
          {selectedKols.length}
        </span>
        <div className="text-xs">
          <span className="whitespace-nowrap font-semibold">Đã chọn {selectedKols.length} KOC</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={selectedKols.length < 2}
          onClick={onOpenCompare}
          className="px-3 py-1.5 bg-[#C59B58] hover:bg-[#B88E4F] text-[#1A1612] font-semibold text-xs rounded-lg transition cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-default whitespace-nowrap"
        >
          <Award size={14} />
          So sánh
        </button>
        <button
          type="button"
          onClick={onClear}
          className="px-2 py-1.5 whitespace-nowrap text-xs text-[#7D715E] hover:text-[#1A1612] rounded-lg transition cursor-pointer"
        >
          Bỏ chọn
        </button>
      </div>
    </div>
  );
}
