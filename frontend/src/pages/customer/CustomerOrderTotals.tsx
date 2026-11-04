import type { CustomerOrder } from '../../services/customer.service';
import { formatMoney } from '../../utils/marketplace.utils';

export function CustomerOrderTotals({ order }: { order: CustomerOrder }) {
  return (
    <dl className="customer-order-totals" aria-label="Thành tiền đơn hàng">
      <div className="customer-order-totals-final"><dt>Thành tiền:</dt><dd>{formatMoney(order.finalAmount)}</dd></div>
    </dl>
  );
}
