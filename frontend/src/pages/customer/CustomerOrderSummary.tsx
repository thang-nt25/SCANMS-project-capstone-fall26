import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  MessageCircle,
  RotateCcw,
  Store,
  Truck,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { CustomerOrder } from '../../services/customer.service';

function renderStatusPill(order: CustomerOrder, statusLabel: string, StatusIcon: LucideIcon) {
  const isPending = order.status === 'PENDING';
  const awaitingPayment =
    isPending && order.rawPayload?.paymentMethod === 'PAYOS' && order.rawPayload?.paymentStatus !== 'PAID';
  const isShipping = order.status === 'SHIPPING';
  const isDelivered = order.status === 'DELIVERED';
  const isCompleted = order.status === 'COMPLETED';
  const isCancelled = order.status === 'CANCELLED';
  const hasReturnRequest =
    Boolean(order.returnRequest) || ['RETURN_REQUESTED', 'DISPUTED', 'RETURNED'].includes(order.status);

  if (hasReturnRequest) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200 shadow-2xs">
        <RotateCcw size={13} className="shrink-0 text-purple-600" />
        <span>{statusLabel}</span>
      </span>
    );
  }

  if (isCancelled) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 shadow-2xs">
        <XCircle size={13} className="shrink-0 text-red-500" />
        <span>{statusLabel}</span>
      </span>
    );
  }

  if (isCompleted) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
          <Truck size={13} className="shrink-0 text-emerald-600" />
          <span>Giao thành công</span>
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FBF5EB] text-[#8F682E] border border-[#EEDFC6]">
          <span>Hoàn thành</span>
        </span>
      </div>
    );
  }

  if (isDelivered) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
        <CheckCircle2 size={13} className="shrink-0 text-emerald-600" />
        <span>{statusLabel}</span>
      </span>
    );
  }

  if (isShipping) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs">
        <Truck size={13} className="shrink-0 text-blue-600" />
        <span>{statusLabel}</span>
      </span>
    );
  }

  if (awaitingPayment) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs animate-pulse">
        <Clock size={13} className="shrink-0 text-amber-600" />
        <span>Chờ thanh toán QR</span>
      </span>
    );
  }

  if (isPending) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
        <Clock size={13} className="shrink-0 text-amber-600" />
        <span>{statusLabel}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FBF5EB] text-[#8F682E] border border-[#EEDFC6] shadow-2xs">
      <StatusIcon size={13} className="shrink-0 text-[#B88E4F]" />
      <span>{statusLabel}</span>
    </span>
  );
}

export function CustomerOrderSummary({
  order,
  statusLabel,
  statusIcon: StatusIcon,
  onChat,
}: {
  order: CustomerOrder;
  statusLabel: string;
  statusIcon: LucideIcon;
  onChat: () => void;
}) {
  return (
    <header className="block min-w-0 text-left">
      <div className="flex items-center justify-between flex-wrap gap-2.5 p-3.5 sm:px-4.5 sm:py-3.5 bg-[#FAF8F5]/60 border-b border-[#EAE4D7]">
        <div className="flex items-center flex-wrap gap-2.5 min-w-0">
          <div className="inline-flex min-w-0 max-w-full items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center shrink-0 shadow-2xs">
              <Store size={15} />
            </span>
            <strong className="truncate font-bold text-sm text-[#1A1612]">
              {order.store?.name || 'Cửa hàng chính hãng'}
            </strong>
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6]">
              Chính hãng
            </span>
          </div>
          <div className="inline-flex items-center gap-1.5">
            <button
              type="button"
              onClick={onChat}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] hover:bg-[#F3EFE6] text-[#8A642C] text-xs font-medium transition-colors cursor-pointer"
            >
              <MessageCircle size={13} />
              <span>Chat</span>
            </button>
            <Link
              to={`/shops/${order.store?.slug || order.storeId}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#EAE4D7] bg-white hover:bg-[#FAF8F5] hover:border-[#C59B58] text-[#7D715E] hover:text-[#1A1612] text-xs font-medium transition-colors"
            >
              <span>Xem Shop</span>
            </Link>
          </div>
        </div>

        <div className="ml-auto shrink-0">
          {renderStatusPill(order, statusLabel, StatusIcon)}
        </div>
      </div>
    </header>
  );
}
