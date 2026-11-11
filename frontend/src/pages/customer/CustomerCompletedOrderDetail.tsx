import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, CircleX, FileText, MessageCircle, PackageCheck, RotateCcw, ShieldCheck, Star, Store, Truck } from 'lucide-react';
import { customerService, type CustomerOrder, type CustomerOrderItem } from '../../services/customer.service';
import { GhnTrackingTimeline, type TrackingEvent } from '../../components/shipping/GhnTrackingTimeline';
import { OrderProductLink } from '../../components/customer/OrderProductLink';
import { getCustomerOrderActions } from '../../utils/customer-order-actions';
import { getGhnTrackingCode } from '../../utils/ghn-tracking';
import { isGeneratedGhnTestTrackingCode } from '../../utils/ghn-tracking-code';
import { formatMoney, getSafeProductImageUrl, handleProductImageError } from '../../utils/marketplace.utils';

const dateLabel = (value?: string | null) => value && Number.isFinite(Date.parse(value))
  ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', hourCycle: 'h23' }) : null;
const statusLabels: Record<string, string> = { PENDING: 'Chờ Shop xác nhận', SHIPPING: 'Đang vận chuyển', DELIVERED: 'Đã giao hàng', COMPLETED: 'Đơn hàng đã hoàn thành', CANCELLED: 'Đơn hàng đã hủy', RETURN_REQUESTED: 'Đang xử lý đổi trả', DISPUTED: 'Đang khiếu nại', RETURNED: 'Đã trả hàng' };
const paymentLabels: Record<string, string> = { WALLET: 'Ví SCANMS', E_WALLET: 'Ví SCANMS', PAYOS: 'Chuyển khoản qua PayOS', COD: 'Thanh toán khi nhận hàng', BANK_TRANSFER: 'Chuyển khoản ngân hàng' };

export function CustomerCompletedOrderDetail({ orderId, refreshVersion = 0, onChat, onReorder, onReview, onViewReviews, onReturn, onCancel, onConfirmReceipt, confirmingOrderId }: {
  orderId: string;
  refreshVersion?: number;
  onChat: (order: CustomerOrder, item?: CustomerOrderItem) => void;
  onReorder: (order: CustomerOrder) => void;
  onReview: (order: CustomerOrder) => void;
  onViewReviews: (order: CustomerOrder) => void;
  onReturn: (order: CustomerOrder) => void;
  onCancel: (order: CustomerOrder) => void;
  onConfirmReceipt?: (order: CustomerOrder) => void;
  confirmingOrderId?: string | null;
}) {
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([]);
  useEffect(() => {
    let active = true;
    setOrder(null); setError(''); setTrackingEvents([]);
    customerService.getOrderDetails(orderId).then(value => {
      if (active) setOrder(value);
    }).catch(() => {
      if (active) setError('Không thể tải đơn hàng. Đơn có thể không tồn tại hoặc bạn không có quyền xem.');
    });
    return () => { active = false; };
  }, [orderId, retry, refreshVersion]);
  useEffect(() => {
    document.querySelector('.workspace-page-column')?.scrollTo({ top: 0 });
  }, [orderId]);

  if (!order) return <section className="customer-purchase-detail min-w-0 overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white text-[#1A1612] [&_button]:cursor-pointer [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-50 purchase-load-state space-y-4 p-5 [&>a]:inline-flex [&>a]:items-center [&>a]:gap-2 [&>button]:rounded-xl [&>button]:border [&>button]:border-[#EAE4D7] [&>button]:px-4 [&>button]:py-2">
    <Link to="/customer/orders"><ArrowLeft size={16} /> Trở lại đơn mua</Link>
    {error ? <><p role="alert">{error}</p><button type="button" onClick={() => setRetry(value => value + 1)}>Thử lại</button></> : <p role="status">Đang tải chi tiết đơn hàng…</p>}
  </section>;

  const actions = getCustomerOrderActions(order);
  const completed = order.status === 'COMPLETED';
  const cancelled = order.status === 'CANCELLED';
  const pending = order.status === 'PENDING';
  const awaitingPayment = pending && order.rawPayload?.paymentMethod === 'PAYOS' && order.rawPayload?.paymentStatus !== 'PAID';
  const shipping = ['SHIPPING', 'DELIVERED', 'COMPLETED'].includes(order.status);
  const delivered = ['DELIVERED', 'COMPLETED'].includes(order.status);
  const steps = cancelled ? [
    { title: 'Đơn hàng đã đặt', Icon: FileText, reached: true, time: order.createdAt },
    { title: 'Đơn hàng đã hủy', Icon: CircleX, reached: true, time: order.rawPayload?.cancelledAt || order.rawPayload?.canceledAt },
  ] : [
    { title: 'Đơn hàng đã đặt', Icon: FileText, reached: true, time: order.createdAt },
    { title: 'Shop xác nhận', Icon: ShieldCheck, reached: Boolean(order.rawPayload?.shopConfirmedAt) || !['PENDING', 'CANCELLED'].includes(order.status), time: order.rawPayload?.shopConfirmedAt || order.rawPayload?.ghnShippedAt },
    { title: 'Bàn giao vận chuyển', Icon: Truck, reached: shipping, time: trackingEvents.find(event => ['picked', 'money_collect_picked'].includes(event.status) && dateLabel(event.time))?.time || order.rawPayload?.carrierPickedUpAt },
    { title: 'Đã nhận hàng', Icon: PackageCheck, reached: delivered, time: order.deliveredAt },
    { title: 'Đơn hàng hoàn thành', Icon: Star, reached: completed, time: order.completedAt },
  ];
  const trackingCode = getGhnTrackingCode(order.rawPayload);
  const realTracking = trackingCode && !isGeneratedGhnTestTrackingCode(trackingCode);
  const payments = order.paymentTransactions || [];
  const successfulPayment = payments.find(payment => ['SUCCESS', 'SUCCEEDED', 'PAID'].includes(String(payment.status).toUpperCase()));
  const method = successfulPayment?.paymentMethod || order.rawPayload?.paymentMethod || payments[0]?.paymentMethod;
  const paid = Boolean(successfulPayment) || order.rawPayload?.paymentStatus === 'PAID';
  const savedReviews = Boolean(order.productReviews?.length);
  const currentStepIndex = steps.findLastIndex(step => step.reached);

  if (cancelled) {
    const cancelledAt = order.rawPayload?.cancelledAt || order.rawPayload?.canceledAt;
    const cancelledBy = ({ CUSTOMER: 'Người mua', SHOP_MANAGER: 'Gian hàng', SYSTEM_MANAGER: 'SCANMS', SYSTEM_ADMIN: 'SCANMS', SYSTEM: 'Hệ thống' } as Record<string, string>)[order.rawPayload?.cancelledBy];
    return <article className="customer-purchase-detail min-w-0 overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white text-[#1A1612] [&_button]:cursor-pointer [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-50 purchase-cancelled-detail">
      <header className="purchase-detail-top flex flex-wrap items-center justify-between gap-3 border-b border-[#EAE4D7] p-4 sm:p-5 text-sm [&>a]:inline-flex [&>a]:items-center [&>a]:gap-2 [&>a]:text-[#7D715E] [&>div]:flex [&>div]:flex-wrap [&>div]:items-center [&>div]:gap-3">
        <Link to="/customer/orders" state={{ returnedOrderCode: order.externalOrderSn, clearOrderSearch: true }}><ArrowLeft size={16} /> Trở lại</Link>
        <span>{dateLabel(cancelledAt) ? <>Hủy lúc: <time dateTime={cancelledAt}>{dateLabel(cancelledAt)}</time></> : <>Mã đơn hàng: {order.externalOrderSn}</>}</span>
      </header>
      <section className="purchase-cancelled-banner space-y-2 border-b border-[#EAE4D7] bg-[#FBF5EB] p-5 [&>h1]:text-xl [&>h1]:font-semibold [&>p]:text-sm [&>p]:text-[#7D715E]" aria-label="Trạng thái hủy đơn">
        <h1>Đã hủy đơn hàng</h1>
        <p>{dateLabel(cancelledAt) ? <>Vào {dateLabel(cancelledAt)}.</> : 'Đơn hàng không tiếp tục được xử lý.'}</p>
      </section>
      <section className="purchase-detail-products border-b border-[#EAE4D7] [&>header]:flex [&>header]:flex-wrap [&>header]:items-center [&>header]:gap-3 [&>header]:border-b [&>header]:border-[#EAE4D7] [&>header]:p-4 sm:[&>header]:px-5 [&>header>strong]:inline-flex [&>header>strong]:items-center [&>header>strong]:gap-2 [&>header>button]:inline-flex [&>header>button]:items-center [&>header>button]:gap-1 [&>header>button]:text-sm [&>header>a]:text-sm [&>header>a]:text-[#946B30]" aria-label="Sản phẩm trong đơn đã hủy">
        <header><strong><Store size={17} />{order.store?.name || 'Gian hàng đối tác'}</strong><Link to={`/shop/${order.store?.slug || order.storeId}`}>Xem Shop</Link></header>
        {order.orderItems.map(item => <div key={item.id} className="purchase-detail-product grid grid-cols-[64px_minmax(0,1fr)] items-center gap-3 border-b border-[#EAE4D7] p-4 last:border-b-0 sm:grid-cols-[80px_minmax(0,1fr)_auto] sm:p-5 [&_h3]:font-semibold [&_h3]:text-sm [&_p]:mt-1 [&_p]:text-xs [&_p]:text-[#7D715E] [&_div>span]:text-xs [&_div>span]:text-[#7D715E]">
          <OrderProductLink productId={item.productId || item.product?.id} title={item.product?.title} className="purchase-product-image block aspect-square w-full overflow-hidden rounded-xl border border-[#EAE4D7] bg-white [&>img]:h-full [&>img]:w-full [&>img]:object-contain"><img src={getSafeProductImageUrl(item.product?.imageUrl, item.product?.title)} alt={item.product?.title || 'Sản phẩm trong đơn'} onError={handleProductImageError} /></OrderProductLink>
          <div><h3><OrderProductLink productId={item.productId || item.product?.id} title={item.product?.title}>{item.product?.title || 'Sản phẩm trong đơn'}</OrderProductLink></h3>{item.variant?.name && <p>Phân loại hàng: {item.variant.name}</p>}<span>x{item.quantity}</span></div>
          <strong className="purchase-product-price col-start-2 text-sm font-semibold tabular-nums sm:col-start-auto">{formatMoney(Number(item.unitPrice) * item.quantity)}</strong>
        </div>)}
      </section>
      <section className="purchase-detail-payment p-4 sm:p-5 [&>dl]:ml-auto [&>dl]:w-full [&>dl]:max-w-xl [&_dl>div]:flex [&_dl>div]:justify-between [&_dl>div]:gap-4 [&_dl>div]:py-2 [&_dt]:text-sm [&_dt]:text-[#7D715E] [&_dd]:text-right [&_dd]:text-sm [&_dd]:font-medium [&_dd]:tabular-nums" aria-label="Thông tin hủy đơn">
        <dl>
          <div><dt>Yêu cầu bởi</dt><dd>{cancelledBy || 'Chưa có thông tin'}</dd></div>
          <div><dt>Phương thức thanh toán</dt><dd>{paymentLabels[method] || 'Chưa có thông tin'}</dd></div>
          <div><dt>Mã đơn hàng</dt><dd>{order.externalOrderSn}</dd></div>
        </dl>
      </section>
      <section className="purchase-cancelled-reason border-b border-[#EAE4D7] p-5 text-sm leading-relaxed"><strong>Lý do hủy:</strong> {order.overrideReason || 'Chưa có lý do hủy được ghi nhận.'}</section>
      <footer className="purchase-detail-actions flex flex-wrap items-center gap-3 border-b border-[#EAE4D7] p-4 sm:p-5 [&>p]:min-w-0 [&>p]:flex-1 [&>p]:text-sm [&>p]:leading-relaxed [&>p]:text-[#7D715E] [&>div]:flex [&>div]:flex-wrap [&>div]:gap-2 [&_button]:inline-flex [&_button]:min-h-11 [&_button]:items-center [&_button]:justify-center [&_button]:gap-2 [&_button]:rounded-xl [&_button]:border [&_button]:border-[#EAE4D7] [&_button]:bg-white [&_button]:px-3 [&_button]:py-2 [&_button]:text-sm" aria-label="Thao tác đơn đã hủy"><div>
        <button type="button" className="purchase-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#EEDFC6]! bg-[#FBF5EB]! px-4 py-2 text-sm font-semibold text-[#946B30]" onClick={() => onReorder(order)}><RotateCcw size={15} /> Mua lại</button>
        <button type="button" onClick={() => onChat(order)}><MessageCircle size={15} /> Liên hệ người bán</button>
      </div></footer>
    </article>;
  }

  return <article className="customer-purchase-detail min-w-0 overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white text-[#1A1612] [&_button]:cursor-pointer [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-50">
    <header className="purchase-detail-top flex flex-wrap items-center justify-between gap-3 border-b border-[#EAE4D7] p-4 sm:p-5 text-sm [&>a]:inline-flex [&>a]:items-center [&>a]:gap-2 [&>a]:text-[#7D715E] [&>div]:flex [&>div]:flex-wrap [&>div]:items-center [&>div]:gap-3">
      <Link to="/customer/orders" state={{ returnedOrderCode: order.externalOrderSn, clearOrderSearch: true }}><ArrowLeft size={16} /> Trở lại</Link>
      <div><span>Mã đơn hàng: <strong>{order.externalOrderSn}</strong></span><span className="purchase-detail-status rounded-full border border-[#EEDFC6] bg-[#FBF5EB] px-3 py-1.5 text-xs font-semibold text-[#946B30]">{pending && order.rawPayload?.shopConfirmedAt ? 'Shop đã xác nhận · Chuẩn bị hàng' : statusLabels[order.status] || 'Đang xử lý'}</span></div>
    </header>

    <ol className={`purchase-detail-progress grid grid-cols-1 gap-5 border-b border-[#EAE4D7] px-5 py-6 sm:grid-cols-5 sm:gap-3 sm:py-8 [&>li]:relative [&>li]:flex [&>li]:items-center [&>li]:gap-3 sm:[&>li]:flex-col sm:[&>li]:text-center [&_strong]:text-sm [&_strong]:font-medium [&_time]:text-xs [&_time]:text-[#7D715E] [&_.is-reached]:text-[#946B30]${cancelled ? ' purchase-detail-progress-cancelled' : ''}`} aria-label="Tiến trình đơn hàng">
      {steps.map(({ title, Icon, reached, time }, index) => <li key={title} className={reached ? 'is-reached' : ''} aria-current={index === currentStepIndex ? 'step' : undefined}>
        <span className="purchase-step-icon relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#EAE4D7] bg-[#FAF8F5] text-[#7D715E] sm:h-16 sm:w-16 [.is-reached_&]:border-[#EEDFC6] [.is-reached_&]:bg-[#FBF5EB] [.is-reached_&]:text-[#B88E4F]"><Icon size={25} aria-hidden="true" />{reached && !(cancelled && index === 1) && <Check className="purchase-step-check absolute -bottom-1 -right-1 rounded-full border border-[#EEDFC6] bg-white p-0.5 box-content" size={12} />}</span>
        <strong>{title}</strong>{reached && dateLabel(time) ? <time dateTime={time!}>{dateLabel(time)}</time> : reached && !cancelled && <span className="purchase-step-time-missing text-[11px] text-[#7D715E]">Chưa có thời gian xác nhận</span>}
      </li>)}
    </ol>

    <section className="purchase-detail-actions flex flex-wrap items-center gap-3 border-b border-[#EAE4D7] p-4 sm:p-5 [&>p]:min-w-0 [&>p]:flex-1 [&>p]:text-sm [&>p]:leading-relaxed [&>p]:text-[#7D715E] [&>div]:flex [&>div]:flex-wrap [&>div]:gap-2 [&_button]:inline-flex [&_button]:min-h-11 [&_button]:items-center [&_button]:justify-center [&_button]:gap-2 [&_button]:rounded-xl [&_button]:border [&_button]:border-[#EAE4D7] [&_button]:bg-white [&_button]:px-3 [&_button]:py-2 [&_button]:text-sm" aria-label="Thao tác đơn hàng">
      <p>{cancelled ? 'Đơn hàng đã hủy. Bạn có thể mua lại hoặc liên hệ người bán.' : completed ? 'Cảm ơn bạn đã mua sắm tại SCANMS!' : order.status === 'SHIPPING' ? 'Đơn hàng đang được vận chuyển. Bạn có thể theo dõi hành trình giao hàng bên dưới.' : pending ? awaitingPayment ? 'Đơn hàng đang chờ bạn thanh toán.' : 'Đơn hàng đang chờ Shop xác nhận và chuẩn bị hàng.' : 'Theo dõi thông tin và trạng thái đơn hàng của bạn.'}</p>
      <div>
        {awaitingPayment && <Link className="purchase-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#EEDFC6]! bg-[#FBF5EB]! px-4 py-2 text-sm font-semibold text-[#946B30]" to={`/payment/payos-return?order=${encodeURIComponent(order.externalOrderSn)}`}>Thanh toán bằng QR</Link>}
        {actions.reorder && <button type="button" className="purchase-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#EEDFC6]! bg-[#FBF5EB]! px-4 py-2 text-sm font-semibold text-[#946B30]" onClick={() => onReorder(order)}><RotateCcw size={15} /> Mua lại</button>}
        {actions.confirmReceipt && onConfirmReceipt && <button type="button" className="purchase-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#EEDFC6]! bg-[#FBF5EB]! px-4 py-2 text-sm font-semibold text-[#946B30]" disabled={confirmingOrderId === order.id} onClick={() => onConfirmReceipt(order)}><PackageCheck size={15} />{confirmingOrderId === order.id ? 'Đang xác nhận…' : 'Đã nhận hàng'}</button>}
        <button type="button" onClick={() => onChat(order)}><MessageCircle size={15} /> Liên hệ người bán</button>
        {actions.cancel && <button type="button" className="purchase-cancel-action" onClick={() => onCancel(order)}>Hủy đơn</button>}
        {actions.review ? <button type="button" onClick={() => onReview(order)}><Star size={15} /> Đánh giá sản phẩm</button> : savedReviews && <button type="button" onClick={() => onViewReviews(order)}><Star size={15} /> Xem đánh giá</button>}
      </div>
      {actions.requestReturn && <button type="button" className="purchase-return-action inline-flex min-h-11 items-center justify-center rounded-xl border border-[#EAE4D7] px-3 py-2 text-sm" onClick={() => onReturn(order)}>Trả hàng / Hoàn tiền</button>}
      {(order.returnRequests?.length ? order.returnRequests : order.returnRequest ? [order.returnRequest] : []).map((request, index) => <Link key={request.id} className="purchase-return-action inline-flex min-h-11 items-center justify-center rounded-xl border border-[#EAE4D7] px-3 py-2 text-sm" to={`/customer/returns/${request.id}`}>Hồ sơ đổi trả {index + 1}</Link>)}
    </section>

    {cancelled && <section className="purchase-cancellation space-y-2 border-b border-[#EAE4D7] p-5 text-sm" aria-label="Thông tin hủy đơn">
      <h2>Thông tin hủy đơn</h2>
      <p><strong>Lý do hủy:</strong> {order.overrideReason || 'Chưa có lý do hủy được ghi nhận.'}</p>
    </section>}

    <section className="purchase-detail-delivery border-b border-[#EAE4D7] p-4 sm:p-5" aria-label="Địa chỉ và vận chuyển">
      <div className="purchase-delivery-heading mb-4 flex flex-wrap items-center justify-between gap-2 [&>h2]:text-base [&>h2]:font-semibold [&>span]:text-xs [&>span]:text-[#7D715E]"><h2>Địa chỉ nhận hàng</h2>{trackingCode && <span>Giao Hàng Nhanh · <strong>{trackingCode}</strong></span>}</div>
      <div className="purchase-delivery-columns grid min-w-0 gap-5 lg:grid-cols-2 [&>address]:flex [&>address]:flex-col [&>address]:gap-2 [&>address]:not-italic [&>address]:text-sm [&_address>p]:leading-relaxed [&_address>p]:text-[#7D715E] [&>div]:min-w-0 lg:[&>div]:border-l lg:[&>div]:border-[#EAE4D7] lg:[&>div]:pl-5">
        <address><strong>{order.customerName || 'Chưa có tên người nhận'}</strong><span>{order.customerPhone || 'Chưa có số điện thoại'}</span><p>{order.shippingAddress || 'Chưa có địa chỉ nhận hàng'}</p></address>
        <div>{!cancelled && realTracking ? <GhnTrackingTimeline orderCode={trackingCode} onTimelineChange={setTrackingEvents} environment={['TEST', 'LIVE'].includes(order.rawPayload?.ghnEnvironment) ? order.rawPayload.ghnEnvironment : undefined} /> : <p className="purchase-no-tracking rounded-xl bg-[#FAF8F5] p-4 text-sm leading-relaxed text-[#7D715E]">{cancelled ? 'Đơn hàng đã hủy, không tiếp tục giao hàng.' : pending ? 'Shop chưa bàn giao đơn cho đơn vị vận chuyển.' : trackingCode ? 'Mã vận đơn thử nội bộ, chưa có hành trình giao hàng thực tế.' : 'Chưa có thông tin vận chuyển.'}</p>}</div>
      </div>
    </section>

    <section className="purchase-detail-products border-b border-[#EAE4D7] [&>header]:flex [&>header]:flex-wrap [&>header]:items-center [&>header]:gap-3 [&>header]:border-b [&>header]:border-[#EAE4D7] [&>header]:p-4 sm:[&>header]:px-5 [&>header>strong]:inline-flex [&>header>strong]:items-center [&>header>strong]:gap-2 [&>header>button]:inline-flex [&>header>button]:items-center [&>header>button]:gap-1 [&>header>button]:text-sm [&>header>a]:text-sm [&>header>a]:text-[#946B30]" aria-label="Sản phẩm trong đơn">
      <header><strong><Store size={17} />{order.store?.name || 'Gian hàng đối tác'}</strong><button type="button" onClick={() => onChat(order)}><MessageCircle size={14} /> Chat</button><Link to={`/shop/${order.store?.slug || order.storeId}`}>Xem Shop</Link></header>
      {order.orderItems.map(item => {
        const review = order.productReviews?.find(review => review.productId === item.productId);
        return <div key={item.id} className="purchase-detail-product grid grid-cols-[64px_minmax(0,1fr)] items-center gap-3 border-b border-[#EAE4D7] p-4 last:border-b-0 sm:grid-cols-[80px_minmax(0,1fr)_auto] sm:p-5 [&_h3]:font-semibold [&_h3]:text-sm [&_p]:mt-1 [&_p]:text-xs [&_p]:text-[#7D715E] [&_div>span]:text-xs [&_div>span]:text-[#7D715E]">
          <OrderProductLink productId={item.productId || item.product?.id} title={item.product?.title} className="purchase-product-image block aspect-square w-full overflow-hidden rounded-xl border border-[#EAE4D7] bg-white [&>img]:h-full [&>img]:w-full [&>img]:object-contain"><img src={getSafeProductImageUrl(item.product?.imageUrl, item.product?.title)} alt={item.product?.title || 'Sản phẩm trong đơn'} onError={handleProductImageError} /></OrderProductLink>
          <div><h3><OrderProductLink productId={item.productId || item.product?.id} title={item.product?.title}>{item.product?.title || 'Sản phẩm trong đơn'}</OrderProductLink></h3>{item.variant?.name && <p>Phân loại hàng: {item.variant.name}</p>}<span>x{item.quantity}</span></div>
          <strong className="purchase-product-price col-start-2 text-sm font-semibold tabular-nums sm:col-start-auto">{formatMoney(Number(item.unitPrice) * item.quantity)}</strong>
          {review && <button type="button" className="purchase-product-review col-start-2 flex flex-wrap items-center gap-2 text-xs text-[#7D715E]" onClick={() => onViewReviews(order)} aria-label={`Xem đánh giá ${review.rating} sao cho ${item.product?.title || 'sản phẩm'}`}><span>Đánh giá của bạn</span><span className="purchase-review-stars flex gap-0.5 text-[#C59B58] [&_.is-filled]:fill-[#C59B58]">{Array.from({ length: 5 }, (_, index) => <Star key={index} size={15} className={index < Number(review.rating) ? 'is-filled' : ''} />)}</span></button>}
        </div>;
      })}
    </section>

    <section className="purchase-detail-payment p-4 sm:p-5 [&>dl]:ml-auto [&>dl]:w-full [&>dl]:max-w-xl [&_dl>div]:flex [&_dl>div]:justify-between [&_dl>div]:gap-4 [&_dl>div]:py-2 [&_dt]:text-sm [&_dt]:text-[#7D715E] [&_dd]:text-right [&_dd]:text-sm [&_dd]:font-medium [&_dd]:tabular-nums" aria-label="Thanh toán đơn hàng">
      <dl>
        <div><dt>Tổng tiền hàng</dt><dd>{formatMoney(order.subtotalAmount)}</dd></div>
        <div><dt>Phí vận chuyển</dt><dd>{formatMoney(order.shippingFee)}</dd></div>
        {Number(order.discountAmount) > 0 && <div><dt>Giảm giá</dt><dd>−{formatMoney(order.discountAmount)}</dd></div>}
        <div className="purchase-payment-total my-2 border-y border-[#EAE4D7] py-4! [&>dd]:text-xl! [&>dd]:font-bold! [&>dd]:text-[#B88E4F]"><dt>Thành tiền</dt><dd>{formatMoney(order.finalAmount)}</dd></div>
        <div><dt>Phương thức thanh toán</dt><dd>{paymentLabels[method] || 'Chưa có thông tin'}</dd></div>
        <div><dt>Trạng thái thanh toán</dt><dd>{paid ? 'Đã thanh toán' : 'Chưa ghi nhận thanh toán'}</dd></div>
      </dl>
    </section>
  </article>;
}
