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
import './CustomerCompletedOrderDetail.css';
import './CustomerOrderLightTheme.css';

const dateLabel = (value?: string | null) => value && Number.isFinite(Date.parse(value))
  ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', hourCycle: 'h23' }) : null;
const statusLabels: Record<string, string> = { PENDING: 'Chờ Shop xác nhận', SHIPPING: 'Đang vận chuyển', DELIVERED: 'Đã giao hàng', COMPLETED: 'Đơn hàng đã hoàn thành', CANCELLED: 'Đơn hàng đã hủy', RETURN_REQUESTED: 'Đang xử lý đổi trả', DISPUTED: 'Đang khiếu nại', RETURNED: 'Đã trả hàng' };
const paymentLabels: Record<string, string> = { WALLET: 'Ví SCANMS', E_WALLET: 'Ví SCANMS', PAYOS: 'Chuyển khoản qua PayOS', COD: 'Thanh toán khi nhận hàng', BANK_TRANSFER: 'Chuyển khoản ngân hàng' };

export function CustomerCompletedOrderDetail({ orderId, refreshVersion = 0, onChat, onReorder, onReview, onViewReviews, onReturn, onCancel }: {
  orderId: string;
  refreshVersion?: number;
  onChat: (order: CustomerOrder, item?: CustomerOrderItem) => void;
  onReorder: (order: CustomerOrder) => void;
  onReview: (order: CustomerOrder) => void;
  onViewReviews: (order: CustomerOrder) => void;
  onReturn: (order: CustomerOrder) => void;
  onCancel: (order: CustomerOrder) => void;
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

  if (!order) return <section className="customer-purchase-detail purchase-load-state">
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
    { title: 'Shop xác nhận', Icon: ShieldCheck, reached: !['PENDING', 'CANCELLED'].includes(order.status), time: order.rawPayload?.shopConfirmedAt || order.rawPayload?.ghnShippedAt },
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

  return <article className="customer-purchase-detail">
    <header className="purchase-detail-top">
      <Link to="/customer/orders" state={{ returnedOrderCode: order.externalOrderSn, clearOrderSearch: true }}><ArrowLeft size={16} /> Trở lại</Link>
      <div><span>Mã đơn hàng: <strong>{order.externalOrderSn}</strong></span><span className="purchase-detail-status">{statusLabels[order.status] || 'Đang xử lý'}</span></div>
    </header>

    <ol className={`purchase-detail-progress${cancelled ? ' purchase-detail-progress-cancelled' : ''}`} aria-label="Tiến trình đơn hàng">
      {steps.map(({ title, Icon, reached, time }, index) => <li key={title} className={reached ? 'is-reached' : ''} aria-current={index === currentStepIndex ? 'step' : undefined}>
        <span className="purchase-step-icon"><Icon size={25} aria-hidden="true" />{reached && !(cancelled && index === 1) && <Check className="purchase-step-check" size={12} />}</span>
        <strong>{title}</strong>{reached && dateLabel(time) ? <time dateTime={time!}>{dateLabel(time)}</time> : reached && !cancelled && <span className="purchase-step-time-missing">Chưa có thời gian xác nhận</span>}
      </li>)}
    </ol>

    <section className="purchase-detail-actions" aria-label="Thao tác đơn hàng">
      <p>{cancelled ? 'Đơn hàng đã hủy. Bạn có thể mua lại hoặc liên hệ người bán.' : completed ? 'Cảm ơn bạn đã mua sắm tại SCANMS!' : order.status === 'SHIPPING' ? 'Đơn hàng đang được vận chuyển. Bạn có thể theo dõi hành trình giao hàng bên dưới.' : pending ? awaitingPayment ? 'Đơn hàng đang chờ bạn thanh toán.' : 'Đơn hàng đang chờ Shop xác nhận và chuẩn bị hàng.' : 'Theo dõi thông tin và trạng thái đơn hàng của bạn.'}</p>
      <div>
        {awaitingPayment && <Link className="purchase-primary" to={`/payment/payos-return?order=${encodeURIComponent(order.externalOrderSn)}`}>Thanh toán bằng QR</Link>}
        {actions.reorder && <button type="button" className="purchase-primary" onClick={() => onReorder(order)}><RotateCcw size={15} /> Mua lại</button>}
        <button type="button" onClick={() => onChat(order)}><MessageCircle size={15} /> Liên hệ người bán</button>
        {actions.cancel && <button type="button" className="purchase-cancel-action" onClick={() => onCancel(order)}>Hủy đơn</button>}
        {actions.review ? <button type="button" onClick={() => onReview(order)}><Star size={15} /> Đánh giá sản phẩm</button> : savedReviews && <button type="button" onClick={() => onViewReviews(order)}><Star size={15} /> Xem đánh giá</button>}
      </div>
      {actions.requestReturn && <button type="button" className="purchase-return-action" onClick={() => onReturn(order)}>Trả hàng / Hoàn tiền</button>}
      {order.returnRequest && <Link className="purchase-return-action" to={`/customer/returns/${order.returnRequest.id}`}>Xem yêu cầu đổi trả</Link>}
    </section>

    {cancelled && <section className="purchase-cancellation" aria-label="Thông tin hủy đơn">
      <h2>Thông tin hủy đơn</h2>
      <p><strong>Lý do hủy:</strong> {order.overrideReason || 'Chưa có lý do hủy được ghi nhận.'}</p>
    </section>}

    <section className="purchase-detail-delivery" aria-label="Địa chỉ và vận chuyển">
      <div className="purchase-delivery-heading"><h2>Địa chỉ nhận hàng</h2>{trackingCode && <span>Giao Hàng Nhanh · <strong>{trackingCode}</strong></span>}</div>
      <div className="purchase-delivery-columns">
        <address><strong>{order.customerName || 'Chưa có tên người nhận'}</strong><span>{order.customerPhone || 'Chưa có số điện thoại'}</span><p>{order.shippingAddress || 'Chưa có địa chỉ nhận hàng'}</p></address>
        <div>{!cancelled && realTracking ? <GhnTrackingTimeline orderCode={trackingCode} onTimelineChange={setTrackingEvents} environment={['TEST', 'LIVE'].includes(order.rawPayload?.ghnEnvironment) ? order.rawPayload.ghnEnvironment : undefined} /> : <p className="purchase-no-tracking">{cancelled ? 'Đơn hàng đã hủy, không tiếp tục giao hàng.' : pending ? 'Shop chưa bàn giao đơn cho đơn vị vận chuyển.' : trackingCode ? 'Mã vận đơn thử nội bộ, chưa có hành trình giao hàng thực tế.' : 'Chưa có thông tin vận chuyển.'}</p>}</div>
      </div>
    </section>

    <section className="purchase-detail-products" aria-label="Sản phẩm trong đơn">
      <header><strong><Store size={17} />{order.store?.name || 'Gian hàng đối tác'}</strong><button type="button" onClick={() => onChat(order)}><MessageCircle size={14} /> Chat</button><Link to={`/shop/${order.store?.slug || order.storeId}`}>Xem Shop</Link></header>
      {order.orderItems.map(item => {
        const review = order.productReviews?.find(review => review.productId === item.productId);
        return <div key={item.id} className="purchase-detail-product">
          <OrderProductLink productId={item.productId || item.product?.id} title={item.product?.title} className="purchase-product-image"><img src={getSafeProductImageUrl(item.product?.imageUrl, item.product?.title)} alt={item.product?.title || 'Sản phẩm trong đơn'} onError={handleProductImageError} /></OrderProductLink>
          <div><h3><OrderProductLink productId={item.productId || item.product?.id} title={item.product?.title}>{item.product?.title || 'Sản phẩm trong đơn'}</OrderProductLink></h3>{item.variant?.name && <p>Phân loại hàng: {item.variant.name}</p>}<span>x{item.quantity}</span></div>
          <strong className="purchase-product-price">{formatMoney(Number(item.unitPrice) * item.quantity)}</strong>
          {review && <button type="button" className="purchase-product-review" onClick={() => onViewReviews(order)} aria-label={`Xem đánh giá ${review.rating} sao cho ${item.product?.title || 'sản phẩm'}`}><span>Đánh giá của bạn</span><span className="purchase-review-stars">{Array.from({ length: 5 }, (_, index) => <Star key={index} size={15} className={index < Number(review.rating) ? 'is-filled' : ''} />)}</span></button>}
        </div>;
      })}
    </section>

    <section className="purchase-detail-payment" aria-label="Thanh toán đơn hàng">
      <dl>
        <div><dt>Tổng tiền hàng</dt><dd>{formatMoney(order.subtotalAmount)}</dd></div>
        <div><dt>Phí vận chuyển</dt><dd>{formatMoney(order.shippingFee)}</dd></div>
        {Number(order.discountAmount) > 0 && <div><dt>Giảm giá</dt><dd>−{formatMoney(order.discountAmount)}</dd></div>}
        <div className="purchase-payment-total"><dt>Thành tiền</dt><dd>{formatMoney(order.finalAmount)}</dd></div>
        <div><dt>Phương thức thanh toán</dt><dd>{paymentLabels[method] || 'Chưa có thông tin'}</dd></div>
        <div><dt>Trạng thái thanh toán</dt><dd>{paid ? 'Đã thanh toán' : 'Chưa ghi nhận thanh toán'}</dd></div>
      </dl>
    </section>
  </article>;
}
