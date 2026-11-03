import { MessageCircle, Store, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CircleHelp, Truck } from 'lucide-react';
import type { CustomerOrder } from '../../services/customer.service';
import './CustomerOrders.css';

export function CustomerOrderSummary({ order, statusLabel, statusIcon: StatusIcon, onChat }: {
  order: CustomerOrder;
  statusLabel: string;
  statusIcon: LucideIcon;
  onChat: () => void;
}) {
  return (
    <header className="customer-order-summary">
      <div className="customer-order-summary-header">
        <div className="customer-order-summary-shop"><Store size={16} aria-hidden="true" /><strong>{order.store?.name || 'Gian hàng đối tác'}</strong></div>
        <div className="customer-order-summary-shop-actions">
          <button type="button" onClick={onChat}><MessageCircle size={13} aria-hidden="true" />Chat</button>
          <Link to={`/shops/${order.store?.slug || order.storeId}`}><Store size={13} aria-hidden="true" />Xem Shop</Link>
        </div>
        <span className="customer-order-summary-status" data-status={order.status}>
          {order.status === 'COMPLETED' && !order.returnRequest ? <>
            <span className="customer-order-delivery-success"><Truck size={16} aria-hidden="true" />Giao hàng thành công<span title="Đơn hàng đã được xác nhận hoàn thành." aria-label="Đơn hàng đã được xác nhận hoàn thành."><CircleHelp size={13} aria-hidden="true" /></span></span>
            <span className="customer-order-completed-label">Hoàn thành</span>
          </> : <><StatusIcon size={14} aria-hidden="true" />{statusLabel}</>}
        </span>
      </div>
    </header>
  );
}
