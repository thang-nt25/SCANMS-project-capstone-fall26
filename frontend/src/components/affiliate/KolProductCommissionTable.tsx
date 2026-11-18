import { useState } from 'react';
import { ShoppingBag, Info } from 'lucide-react';
import type { ProductCommissionBreakdownItem } from '../../services/analytics.service';
import { Modal } from '../ui/Modal';
import { formatMoney, getSafeProductImageUrl, handleProductImageError } from '../../utils/marketplace.utils';

export default function KolProductCommissionTable({ items, loading }: { items: ProductCommissionBreakdownItem[]; loading?: boolean }) {
  const [selected, setSelected] = useState<ProductCommissionBreakdownItem | null>(null);
  if (loading) return <p className="kol-report-empty" role="status">Đang tải số liệu sản phẩm…</p>;
  return <div className="kol-product-report">
    {!items.length ? <div className="kol-report-empty"><ShoppingBag size={24}/><span>Chưa có sản phẩm ghi nhận doanh số</span></div> : <div className="overflow-x-auto"><table className="kol-products-table"><thead><tr><th>Sản phẩm / Cửa hàng</th><th>Số lượng đặt</th><th>Doanh số</th><th>Mức tham chiếu</th><th>Thù lao ghi nhận</th></tr></thead><tbody>{items.map(product => <tr key={product.productId}>
      <td><div className="kol-report-product"><img src={getSafeProductImageUrl(product.productImage, product.productTitle)} alt={product.productTitle} onError={handleProductImageError}/><div><strong title={product.productTitle}>{product.productTitle}</strong><span>{product.storeName}</span></div></div></td>
      <td><strong>{product.unitsSold.toLocaleString('vi-VN')} món</strong><small>{product.ordersCount} đơn</small></td><td>{formatMoney(product.grossRevenue)}</td>
      <td><button type="button" className="kol-rate-button" onClick={() => setSelected(product)} aria-label={`Xem mức thù lao ${product.productTitle}`}>{product.rateBreakdown.finalRate}% <Info size={13}/></button></td><td>{formatMoney(product.commissionEarned)}</td>
    </tr>)}</tbody></table></div>}
    {selected && <Modal isOpen onClose={() => setSelected(null)} title="Mức thù lao tham chiếu" subtitle={selected.productTitle} maxWidth="lg"><dl className="kol-rate-details"><div><dt>Tiêu chuẩn · {selected.rateBreakdown.tierName}</dt><dd>{selected.rateBreakdown.baseRate + selected.rateBreakdown.tierBonus}%</dd></div>{selected.rateBreakdown.hasExclusiveDeal && <><div><dt>Deal độc quyền</dt><dd>{selected.rateBreakdown.baseRate + selected.rateBreakdown.tierBonus + selected.rateBreakdown.dealBonus}%</dd></div><div><dt>Chênh lệch chờ KPI</dt><dd>{selected.rateBreakdown.dealBonus}%</dd></div></>}<div><dt>Thù lao ghi nhận lũy kế</dt><dd>{formatMoney(selected.commissionEarned)}</dd></div></dl><p className="text-xs leading-6 text-[#7D715E]">Deal thay thế mức tiêu chuẩn, không cộng dồn với bậc. Phần chênh lệch cần đủ KPI và điều kiện đối soát. Mỗi đơn giữ mức áp dụng tại thời điểm phát sinh; mức tham chiếu có thể khác các đơn cũ.</p></Modal>}
  </div>;
}
