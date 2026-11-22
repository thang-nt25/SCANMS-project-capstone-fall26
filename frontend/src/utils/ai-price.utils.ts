export interface KolPriceComparison {
  hasData: boolean;
  formattedAvgPrice: string;
  formattedTargetPrice: string;
  badgeText: string;
  direction: 'MATCH' | 'ABOVE' | 'BELOW' | 'NONE';
}

/** Formats a KOL's historical average unit selling price against the target product price. */
export function getKolPriceComparison(
  avgSellingPrice?: number,
  targetPrice?: number,
): KolPriceComparison {
  const avg = Number(avgSellingPrice || 0);
  const target = Number(targetPrice || 0);

  if (avg <= 0) {
    return {
      hasData: false,
      formattedAvgPrice: 'Chưa có dữ liệu',
      formattedTargetPrice: target > 0 ? `${Math.round(target).toLocaleString('vi-VN')}₫` : '',
      badgeText: 'Chưa có lịch sử giá',
      direction: 'NONE',
    };
  }

  const formattedAvgPrice = `${Math.round(avg).toLocaleString('vi-VN')}₫`;
  const formattedTargetPrice = target > 0 ? `${Math.round(target).toLocaleString('vi-VN')}₫` : '';

  if (target <= 0) {
    return {
      hasData: true,
      formattedAvgPrice,
      formattedTargetPrice,
      badgeText: 'Giá bán TB/sp',
      direction: 'NONE',
    };
  }

  const diffPct = Math.round(((avg - target) / target) * 100);
  if (Math.abs(diffPct) <= 10) {
    return {
      hasData: true,
      formattedAvgPrice,
      formattedTargetPrice,
      badgeText: 'Ngang tầm giá SP',
      direction: 'MATCH',
    };
  }
  if (diffPct > 10) {
    return {
      hasData: true,
      formattedAvgPrice,
      formattedTargetPrice,
      badgeText: `Cao hơn SP +${diffPct}%`,
      direction: 'ABOVE',
    };
  }
  return {
    hasData: true,
    formattedAvgPrice,
    formattedTargetPrice,
    badgeText: `Thấp hơn SP ${diffPct}%`,
    direction: 'BELOW',
  };
}
