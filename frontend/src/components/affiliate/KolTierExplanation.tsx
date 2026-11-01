import type { TierStatus } from '../../services/tier.service';

const money = (value: number) => `${Number(value).toLocaleString('vi-VN')} ₫`;
const validDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.getUTCFullYear() >= 2000 ? date : null;
};

export function KolTierExplanation({ status }: { status: TierStatus }) {
  const { currentTier, qualifiedTier, currentRevenue, nextTier } = status;
  const assessment = validDate(status.assessmentPeriod?.startsAt);
  const evaluation = validDate(status.nextEvaluationAt);
  const period = assessment ? assessment.toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }) : 'Các kỳ đã đóng';
  const remaining = nextTier ? Math.max(0, Number(nextTier.minRevenueThreshold) - Number(currentRevenue)) : 0;
  return (
    <section className="tier-assessment-compact" aria-label="Căn cứ xếp hạng KOL">
      <dl>
        <div><dt>Doanh số xét hạng <small>{period}</small></dt><dd>{money(currentRevenue)}</dd></div>
        {!status.assessmentIncomplete && nextTier && <div><dt>Mốc tiếp theo <small>{nextTier.name} · +{nextTier.extraBonusPercentage}%</small></dt><dd>{remaining > 0 ? `Còn ${money(remaining)}` : 'Đã đạt ngưỡng'}</dd></div>}
        <div><dt>Lần xét tiếp theo</dt><dd>{evaluation ? evaluation.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Ho_Chi_Minh' }) : '00:15 ngày 1 mỗi tháng'}</dd></div>
      </dl>
      {status.assessmentIncomplete ? <p>Cần đối soát {status.unassignedCompletedOrdersCount} đơn thiếu ngày hoàn tất; chưa kết luận hạng từ doanh số chưa đầy đủ.</p> : qualifiedTier.id !== currentTier.id && qualifiedTier.name !== currentTier.name && <p>Doanh số tương ứng hạng {qualifiedTier.name}; hạng đang áp dụng: {currentTier.name}.</p>}
      <p>Doanh số đơn đã giao/hoàn thành, trừ giảm giá và hoàn tiền, không gồm phí vận chuyển.</p>
    </section>
  );
}
