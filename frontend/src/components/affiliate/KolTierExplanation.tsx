import type { TierStatus } from '../../services/tier.service';

export function KolTierExplanation({ status }: { status: TierStatus }) {
  const { currentTier, qualifiedTier } = status;
  const higher = Number(qualifiedTier.minRevenueThreshold) > Number(currentTier.minRevenueThreshold);
  const lower = Number(qualifiedTier.minRevenueThreshold) < Number(currentTier.minRevenueThreshold);
  if (!higher && !lower) return null;
  return <section className="tier-assessment mb-4 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3 text-xs leading-relaxed" aria-label="Căn cứ xếp hạng KOL">
    {(higher || lower) && <p className="mt-1 text-[#7D715E]">{higher
      ? `Bạn đang hưởng quyền lợi hạng ${currentTier.name} (+${currentTier.extraBonusPercentage}%). Thưởng hạng ${qualifiedTier.name} (+${qualifiedTier.extraBonusPercentage}%) áp dụng cho đơn mới đủ điều kiện sau khi hệ thống cập nhật hạng.`
      : lower
        ? `Bạn vẫn đang ở hạng ${currentTier.name} (+${currentTier.extraBonusPercentage}%). GMV kỳ này tương ứng hạng ${qualifiedTier.name}; hệ thống có thể điều chỉnh giảm khi xét hạng.`
        : ''}</p>}
  </section>;
}
