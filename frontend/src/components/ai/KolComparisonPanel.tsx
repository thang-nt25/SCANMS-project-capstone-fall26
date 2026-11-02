import { useMemo } from 'react';
import type { KolMatchResult } from '@/services/ai-recommendation.service';
import { downloadReport } from '@/utils/report-export';
import { MultiAiRadarChart } from './AiRadarChart';
import { X, Award, MessageSquare, Download, CheckCircle2 } from 'lucide-react';

interface KolComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedKols: KolMatchResult[];
  onNegotiateDeal: (kol: KolMatchResult) => void;
}

const COMPARISON_COLORS = [
  { stroke: '#C59B58', fill: 'rgba(197, 155, 88, 0.25)', label: 'Vàng ánh kim' },
  { stroke: '#231D15', fill: 'rgba(35, 29, 21, 0.20)', label: 'Đen sang trọng' },
  { stroke: '#D97706', fill: 'rgba(217, 119, 6, 0.22)', label: 'Hổ phách' },
];

export function KolComparisonModal({
  isOpen,
  onClose,
  selectedKols,
  onNegotiateDeal,
}: KolComparisonModalProps) {
  if (!isOpen || selectedKols.length === 0) return null;

  // Datasets for Multi-Radar
  const radarDatasets = useMemo(() => {
    return selectedKols.slice(0, 3).map((kol, idx) => ({
      name: kol.fullName,
      scores: kol.scoreBreakdown,
      color: COMPARISON_COLORS[idx % COMPARISON_COLORS.length].stroke,
      fillColor: COMPARISON_COLORS[idx % COMPARISON_COLORS.length].fill,
    }));
  }, [selectedKols]);

  const metrics: Array<{
    label: string;
    sublabel?: string;
    value: (kol: KolMatchResult) => string | number;
    isWinner?: (kol: KolMatchResult, all: KolMatchResult[]) => boolean;
  }> = [
    {
      label: 'Điểm phù hợp tổng thể',
      sublabel: 'Thang điểm 100',
      value: (kol) => `${kol.matchScore}/100`,
      isWinner: (kol, all) => kol.matchScore === Math.max(...all.map((k) => k.matchScore)),
    },
    {
      label: '1. Trùng khớp ngành hàng',
      sublabel: 'Trọng số 35%',
      value: (kol) => `${kol.scoreBreakdown.categoryScore}/100`,
      isWinner: (kol, all) => kol.scoreBreakdown.categoryScore === Math.max(...all.map((k) => k.scoreBreakdown.categoryScore)),
    },
    {
      label: '2. Tỷ lệ chuyển đổi CR%',
      sublabel: 'Trọng số 25%',
      value: (kol) => `${kol.scoreBreakdown.conversionRateScore}/100 (CR: ${kol.lifetimeStats.conversionRate}%)`,
      isWinner: (kol, all) => kol.lifetimeStats.conversionRate === Math.max(...all.map((k) => k.lifetimeStats.conversionRate)),
    },
    {
      label: '3. Phù hợp phân khúc giá',
      sublabel: 'Trọng số 20%',
      value: (kol) => `${kol.scoreBreakdown.priceFitScore}/100`,
      isWinner: (kol, all) => kol.scoreBreakdown.priceFitScore === Math.max(...all.map((k) => k.scoreBreakdown.priceFitScore)),
    },
    {
      label: '4. Cấp bậc & Mạng xã hội',
      sublabel: 'Trọng số 20%',
      value: (kol) => `${kol.scoreBreakdown.tierAndSocialScore}/100 (${kol.tierName})`,
    },
    {
      label: 'Tổng đơn hàng đã bán',
      value: (kol) => Number(kol.lifetimeStats.totalOrders || 0).toLocaleString('vi-VN'),
      isWinner: (kol, all) => kol.lifetimeStats.totalOrders === Math.max(...all.map((k) => k.lifetimeStats.totalOrders)),
    },
    {
      label: 'Lượt nhấp hợp lệ (Clicks)',
      value: (kol) => Number(kol.lifetimeStats.totalClicks || 0).toLocaleString('vi-VN'),
    },
    {
      label: 'Nguồn chứng minh ngành hàng',
      value: (kol) =>
        kol.categoryMatchSource === 'SALES'
          ? 'Đã có đơn thực tế cùng ngành'
          : kol.categoryMatchSource === 'PROFILE'
            ? 'Khớp chuyên môn hồ sơ/kênh'
            : 'Đang mở rộng tiềm năng',
    },
    {
      label: 'Kênh truyền thông chính',
      value: (kol) =>
        kol.socialChannels?.length
          ? kol.socialChannels.map((c) => `${c.platform}: ${Number(c.followerCount || 0).toLocaleString('vi-VN')}`).join(' | ')
          : 'Chưa cập nhật',
    },
    {
      label: 'Lý giải thuật toán AI',
      value: (kol) => kol.aiReasoning || 'Phù hợp theo tiêu chuẩn phân khúc',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#231D15]/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-3xl border border-[#EAE4D7] shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#EAE4D7] bg-[#FAF8F5] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center shadow-2xs">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1A1612]">
                Đối Sánh Năng Lực Trực Diện (AI Radar Comparison)
              </h3>
              <p className="text-xs text-[#7D715E]">
                So sánh đa giác năng lực 4 trục giữa {selectedKols.length} KOC sáng tạo tiềm năng
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-[#EAE4D7] bg-white text-[#7D715E] hover:text-[#1A1612] hover:bg-[#FAF8F5] flex items-center justify-center transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Overlaid Radar Chart Section */}
          <div className="rounded-2xl border border-[#EAE4D7] bg-[#FAF8F5] p-5">
            <div className="text-center mb-2">
              <span className="text-xs font-bold text-[#8C6226] uppercase tracking-wider">
                Đa giác đối sánh trực diện (Overlaid Radar)
              </span>
              <p className="text-[11px] text-[#7D715E]">
                Quan sát KOC nào bao phủ diện tích rộng hơn để đánh giá mức độ toàn diện
              </p>
            </div>
            <MultiAiRadarChart datasets={radarDatasets} size={260} />
          </div>

          {/* Detailed Side-by-Side Comparison Table */}
          <div className="overflow-x-auto rounded-2xl border border-[#EAE4D7] bg-white shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#EAE4D7] bg-[#FAF8F5]">
                  <th className="p-4 w-44 font-bold text-[#7D715E]">Tiêu chí đối sánh</th>
                  {selectedKols.map((kol, idx) => (
                    <th key={kol.collaboratorId} className="p-4 min-w-[200px]">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-xs shrink-0"
                          style={{ backgroundColor: COMPARISON_COLORS[idx % COMPARISON_COLORS.length].stroke }}
                        >
                          {kol.avatarUrl ? (
                            <img src={kol.avatarUrl} alt={kol.fullName} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            kol.fullName.charAt(0)
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-[#1A1612] truncate">{kol.fullName}</h4>
                          <span className="inline-block mt-0.5 rounded-md border border-[#EEDFC6] bg-[#FBF5EB] px-2 py-0.5 text-[10px] font-bold text-[#8C6226]">
                            {kol.tierName}
                          </span>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE4D7]">
                {metrics.map((m, mIdx) => (
                  <tr key={mIdx} className="hover:bg-[#FAF8F5]/60 transition">
                    <td className="p-4 font-semibold text-[#1A1612] bg-[#FAF8F5]/30">
                      <div>{m.label}</div>
                      {m.sublabel && <div className="text-[10px] text-[#7D715E] font-normal">{m.sublabel}</div>}
                    </td>
                    {selectedKols.map((kol) => {
                      const isWinning = m.isWinner?.(kol, selectedKols);
                      return (
                        <td
                          key={kol.collaboratorId}
                          className={`p-4 tabular-nums text-xs ${isWinning ? 'font-bold text-[#8C6226] bg-[#FBF5EB]/50' : 'text-[#1A1612]'}`}
                        >
                          <div className="flex items-center gap-1.5">
                            {isWinning && <CheckCircle2 size={13} className="text-[#B88E4F] shrink-0" />}
                            <span>{m.value(kol)}</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {/* Actions row */}
                <tr className="bg-[#FAF8F5]">
                  <td className="p-4 font-bold text-[#1A1612]">Thao tác hợp tác</td>
                  {selectedKols.map((kol) => (
                    <td key={kol.collaboratorId} className="p-4">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNegotiateDeal(kol);
                        }}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-[#1A1612] font-bold text-xs shadow-xs transition cursor-pointer"
                      >
                        <MessageSquare size={13} />
                        Thương lượng Deal VIP
                      </button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-[#EAE4D7] bg-[#FAF8F5] px-6 py-3.5">
          <button
            type="button"
            onClick={() =>
              downloadReport('SCANMS_KOL_Comparison.csv', [
                ['Tiêu chí đối sánh', ...selectedKols.map((k) => k.fullName)],
                ...metrics.map((m) => [m.label, ...selectedKols.map(m.value)]),
              ])
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#EAE4D7] bg-white text-xs font-semibold text-[#7D715E] hover:text-[#1A1612] hover:bg-[#FAF8F5] transition cursor-pointer"
          >
            <Download size={13} />
            Xuất bảng so sánh CSV
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#231D15] text-white hover:bg-[#1A1612] text-xs font-bold transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
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
  if (selectedKols.length < 2) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#231D15] text-white px-5 py-3 rounded-2xl shadow-2xl border border-[#C59B58]/40 flex items-center gap-4 animate-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center gap-2.5">
        <span className="w-6 h-6 rounded-full bg-[#C59B58] text-[#1A1612] text-xs font-bold flex items-center justify-center">
          {selectedKols.length}
        </span>
        <div className="text-xs">
          <span className="font-bold text-white">Đang chọn {selectedKols.length} KOC</span>
          <span className="text-[#C59B58] hidden sm:inline ml-1 font-medium">
            ({selectedKols.map((k) => k.fullName).join(', ')})
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenCompare}
          className="px-3.5 py-1.5 bg-[#C59B58] hover:bg-[#B88E4F] text-[#1A1612] font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
        >
          <Award size={14} />
          So sánh đối đầu
        </button>
        <button
          type="button"
          onClick={onClear}
          className="px-2.5 py-1.5 text-xs text-[#EAE4D7] hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
        >
          Hủy
        </button>
      </div>
    </div>
  );
}
