import { useEffect, useRef } from 'react';
import { Star, X } from 'lucide-react';
import type { CustomerOrder } from '../../services/customer.service';
import './CustomerOrderReviewsModal.css';

export function CustomerOrderReviewsModal({ order, onClose, reviewer }: {
  order: CustomerOrder; onClose: () => void;
  reviewer?: { fullName?: string | null; avatarUrl?: string | null } | null;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog?.showModal();
    return () => { if (dialog?.open) dialog.close(); document.body.style.overflow = previousOverflow; };
  }, []);
  return <dialog ref={dialogRef} aria-labelledby="order-reviews-title" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }} className="order-reviews-dialog">
    <header className="order-reviews-heading">
      <div><h2 id="order-reviews-title">Đánh giá của bạn</h2><p>{order.store?.name || 'Gian hàng'} · Đơn #{order.externalOrderSn}</p></div>
      <button type="button" autoFocus onClick={onClose} aria-label="Đóng đánh giá" className="order-reviews-close"><X size={20} /></button>
    </header>
    <div className="order-reviews-content">
      {(order.productReviews || []).map(review => {
        const item = order.orderItems.find(item => item.productId === review.productId);
        const rating = Math.max(0, Math.min(5, Number(review.rating) || 0));
        const name = review.customerName?.trim() || reviewer?.fullName?.trim() || order.customerName?.trim() || 'Bạn';
        const createdAt = review.createdAt && Number.isFinite(Date.parse(review.createdAt)) ? new Date(review.createdAt) : null;
        const status = review.status === 'PENDING' ? 'Đang chờ kiểm duyệt' : ['HIDDEN', 'REJECTED'].includes(review.status) ? 'Không hiển thị công khai' : 'Đã đăng';
        const images = Array.isArray(review.images) && review.images.length ? review.images.filter((image: unknown): image is string => typeof image === 'string') : review.reviewImageUrl ? [review.reviewImageUrl] : [];
        return <section key={review.id || review.productId} className="order-review-entry">
          <div className="order-review-avatar" aria-hidden="true">
            {reviewer?.avatarUrl && <img src={reviewer.avatarUrl} alt="" onError={event => { event.currentTarget.style.display = 'none'; }} />}
            <span>{name.charAt(0).toLocaleUpperCase('vi-VN')}</span>
          </div>
          <div className="order-review-main">
            <div className="order-review-author"><strong>{name}</strong><span>{status}</span></div>
            <div className="order-review-stars" aria-label={`${rating} trên 5 sao`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} size={19} aria-hidden="true" className={index < rating ? 'is-filled' : ''} />)}</div>
            <div className="order-review-context">
              {createdAt && <time dateTime={createdAt.toISOString()}>{createdAt.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', hourCycle: 'h23' })}</time>}
              <span>{item?.product?.title || 'Sản phẩm trong đơn hàng'}{item?.variant?.name ? ` · ${item.variant.name}` : ''}</span>
            </div>
            {review.comment && <p className="order-review-comment">{review.comment}</p>}
            {images.length > 0 && <div className="order-review-images">{images.map((url: string, index: number) => <a key={`${url}-${index}`} href={url} target="_blank" rel="noopener noreferrer" aria-label={`Xem ảnh đánh giá ${index + 1}`}><img src={url} alt={`Ảnh đánh giá ${index + 1}`} /></a>)}</div>}
            {review.video && <video className="order-review-video" controls preload="metadata" src={review.video} aria-label="Video đánh giá" />}
            {review.rejectionReason && <p className="order-review-moderation"><strong>Phản hồi kiểm duyệt</strong>{review.rejectionReason}</p>}
          </div>
        </section>;
      })}
      {!order.productReviews?.length && <p className="order-review-empty">Chưa có đánh giá cho đơn hàng này.</p>}
    </div>
    <footer className="order-reviews-footer"><button type="button" onClick={onClose}>OK</button></footer>
  </dialog>;
}
