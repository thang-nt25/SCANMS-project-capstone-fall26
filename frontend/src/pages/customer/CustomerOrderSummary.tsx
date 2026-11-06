import { MessageCircle, Store, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CircleHelp, Truck } from 'lucide-react';
import type { CustomerOrder } from '../../services/customer.service';

export function CustomerOrderSummary({ order, statusLabel, statusIcon: StatusIcon, onChat }: {
  order: CustomerOrder;
  statusLabel: string;
  statusIcon: LucideIcon;
  onChat: () => void;
}) {
  return (
    <header className="block min-w-0 text-left">
      <div className="flex items-center flex-wrap gap-2.5 p-3 sm:px-4.5 sm:py-3.5 border-b border-[#eae4d7]">
        <div className="inline-flex min-w-0 max-w-full items-center gap-2 text-sm"><Store size={16} aria-hidden="true" className="shrink-0 text-[#b88e4f]" /><strong className="truncate font-semibold">{order.store?.name || 'Gian hàng đối tác'}</strong></div>
        <div className="inline-flex items-center gap-1.5 [&_:is(a,button)]:inline-flex [&_:is(a,button)]:min-h-[28px] [&_:is(a,button)]:items-center [&_:is(a,button)]:justify-center [&_:is(a,button)]:gap-1.25 [&_:is(a,button)]:px-2 [&_:is(a,button)]:py-1 [&_:is(a,button)]:border [&_:is(a,button)]:border-[#eae4d7] [&_:is(a,button)]:rounded-[3px] [&_:is(a,button)]:bg-white [&_:is(a,button)]:text-[#7d715e] [&_:is(a,button)]:text-[11px] [&_:is(a,button)]:no-underline [&_:is(a,button)]:cursor-pointer hover:[&_:is(a,button)]:border-[#b88e4f] hover:[&_:is(a,button)]:text-[#b88e4f] [&_button]:border-[#eedfc6] [&_button]:bg-[#fbf5eb] [&_button]:text-[#8a642c]">
          <button type="button" onClick={onChat}><MessageCircle size={13} aria-hidden="true" />Chat</button>
          <Link to={`/shops/${order.store?.slug || order.storeId}`}><Store size={13} aria-hidden="true" />Xem Shop</Link>
        </div>
        <span className="inline-flex items-center gap-1.5 ml-auto text-xs font-medium text-[#b88e4f] data-[status=CANCELLED]:text-[#dc2626] data-[status=COMPLETED]:flex-wrap data-[status=COMPLETED]:gap-2.5 max-sm:basis-full max-sm:ml-0 max-sm:text-[11px]" data-status={order.status}>
          {order.status === 'COMPLETED' && !order.returnRequest ? <>
            <span className="customer-order-delivery-success"><Truck size={16} aria-hidden="true" />Giao hàng thành công<span title="Đơn hàng đã được xác nhận hoàn thành." aria-label="Đơn hàng đã được xác nhận hoàn thành."><CircleHelp size={13} aria-hidden="true" /></span></span>
            <span className="customer-order-completed-label">Hoàn thành</span>
          </> : <><StatusIcon size={14} aria-hidden="true" />{statusLabel}</>}
        </span>
      </div>
    </header>
  );
}
