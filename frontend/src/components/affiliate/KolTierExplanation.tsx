import { ArrowUpRight, CalendarDays, ShieldCheck, Clock } from 'lucide-react';
import type { TierStatus } from '../../services/tier.service';

const money = (value: number) => `${Number(value).toLocaleString('vi-VN')} đ`;
const month = (date: string) => new Date(date).toLocaleDateString('en-GB', { month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' });

export function KolTierExplanation({ status }: { status: TierStatus }) {
  const {
    currentTier,
    currentRevenue,
    nextTier,
    maintenanceThreshold = Math.round(Number(currentTier.minRevenueThreshold) * 0.6),
    isMaintained = currentRevenue >= maintenanceThreshold,
    revenueNeededToMaintain = Math.max(0, maintenanceThreshold - currentRevenue),
    cycleStatus = isMaintained ? 'MAINTAINED' : 'GRACE_PERIOD',
    daysRemaining = 30,
    stepDownTier,
  } = status;

  const isBronze = Number(currentTier.minRevenueThreshold) === 0;
  const period = status.assessmentPeriod ? `tháng ${month(status.assessmentPeriod.startsAt)}` : 'tháng trước';

  return (
    <section className="mb-4 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3.5 text-xs leading-relaxed" aria-label="Căn cứ xếp hạng KOL">
      <div className="flex items-center justify-between gap-2 font-semibold text-[#1A1612]">
        <div className="flex items-center gap-2">
          {cycleStatus === 'GRACE_PERIOD' ? (
            <Clock size={16} className="shrink-0 text-[#D97706]" />
          ) : (
            <ShieldCheck size={16} className="shrink-0 text-[#B88E4F]" />
          )}
          <h3>
            {isBronze
              ? 'Hạng đối tác khởi đầu (Đồng)'
              : cycleStatus === 'GRACE_PERIOD'
                ? `Đang áp dụng thời gian Ân hạn 30 ngày (Hạng ${currentTier.name})`
                : isMaintained
                  ? `Đã bảo toàn vị thế Hạng ${currentTier.name}`
                  : `Quy chế duy trì Hạng ${currentTier.name}`}
          </h3>
        </div>

        {cycleStatus === 'GRACE_PERIOD' && (
          <span className="rounded-full border border-[#F59E0B]/40 bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-bold text-[#B45309]">
            Còn {daysRemaining} ngày ân hạn
          </span>
        )}
      </div>

      <div className="mt-2.5 space-y-1.5 text-[#7D715E]">
        <p>
          GMV ghi nhận {period}: <strong className="font-semibold text-[#1A1612]">{money(currentRevenue)}</strong>.
          {!isBronze && (
            <>
              {' '}Ngưỡng duy trì hạng {currentTier.name} (60% GMV thăng hạng): <strong className="font-semibold text-[#1A1612]">{money(maintenanceThreshold)}</strong>.
            </>
          )}
        </p>

        {!isBronze && (
          <div className="rounded-lg bg-white/70 p-2.5 border border-[#EEDFC6]">
            {isMaintained ? (
              <p className="text-[#1A1612]">
                Bạn đã đạt ngưỡng duy trì doanh số ({money(currentRevenue)} ≥ {money(maintenanceThreshold)}).
                Vị thế <strong>{currentTier.name} (+{currentTier.extraBonusPercentage}% thù lao)</strong> được bảo đảm trong chu kỳ đánh giá tiếp theo.
              </p>
            ) : (
              <div className="space-y-1 text-[#1A1612]">
                <p>
                  Doanh số kỳ này chưa đạt ngưỡng duy trì. Hệ thống kích hoạt <strong>Cơ chế Ân hạn 30 ngày</strong>:
                  bạn vẫn được bảo lưu trọn vẹn quyền lợi <strong>+{currentTier.extraBonusPercentage}% thù lao</strong> trong chu kỳ này.
                </p>
                <p className="text-[11px] text-[#7D715E]">
                  Cần bổ sung thêm <strong className="text-[#B45309] font-semibold">{money(revenueNeededToMaintain)}</strong> trước ngày chốt sổ để hoàn tất điều kiện duy trì.
                  {stepDownTier && (
                    <span> Trường hợp không kịp bổ sung, hệ thống sẽ áp dụng quy chế chuyển tiếp bậc an toàn (hạ sang hạng {stepDownTier.name} +{stepDownTier.extraBonusPercentage}%), tránh rớt đột ngột nhiều cấp bậc.</span>
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        {nextTier && (
          <p className="flex items-start gap-1.5 pt-1 text-[#7D715E]">
            <ArrowUpRight size={15} className="mt-0.5 shrink-0 text-[#B88E4F]" />
            <span>
              Mục tiêu thăng hạng tiếp theo <strong>{nextTier.name} (+{nextTier.extraBonusPercentage}%)</strong>: cần tối thiểu {money(nextTier.minRevenueThreshold)} GMV trong một kỳ đánh giá (còn thiếu {money(Math.max(0, Number(nextTier.minRevenueThreshold) - Number(currentRevenue)))}).
            </span>
          </p>
        )}
      </div>

      <div className="mt-2.5 border-t border-[#EEDFC6] pt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#7D715E]">
        <span>Chỉ tính đơn tiếp thị đã giao / hoàn tất (không tính phí vận chuyển, đã trừ các khoản đổi trả & mã ưu đãi).</span>
        <span className="flex items-center gap-1">
          <CalendarDays size={13} className="text-[#B88E4F]" />
          Chốt sổ định kỳ lúc 00:15 ngày 1 mỗi tháng
        </span>
      </div>
    </section>
  );
}
