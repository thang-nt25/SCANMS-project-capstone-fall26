import { useEffect, useRef } from 'react';
import { Star, X } from 'lucide-react';
import type { CustomerOrder } from '../../services/customer.service';

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
  return <dialog ref={dialogRef} aria-labelledby="order-reviews-title" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }} className="fixed inset-0 m-auto w-[min(760px,calc(100%-32px))] max-h-[min(760px,calc(100dvh-48px))] p-0 overflow-hidden border border-[#EAE4D7] rounded-2xl bg-white text-[#1A1612] shadow-[0_24px_70px_rgb(35_29_21_/_18%)] open:flex open:flex-col backdrop:bg-[rgb(35_29_21_/_36%)] backdrop:backdrop-blur-xs">
    <header className="flex shrink-0 items-start justify-between gap-5 p-5 sm:px-7 sm:pt-6.5 sm:pb-5.5 [&_h2]:m-0 [&_h2]:text-[19px] sm:[&_h2]:text-[22px] [&_h2]:font-semibold [&_h2]:leading-snug [&_p]:mt-1.5 [&_p]:text-xs [&_p]:text-[#7D715E] [&_p]:[overflow-wrap:anywhere]">
      <div><h2 id="order-reviews-title">Đánh giá của bạn</h2><p>{order.store?.name || 'Gian hàng'} · Đơn #{order.externalOrderSn}</p></div>
      <button type="button" autoFocus onClick={onClose} aria-label="Đóng đánh giá" className="grid place-items-center shrink-0 w-[34px] h-[34px] border-0 rounded-full bg-white text-[#7D715E] cursor-pointer hover:bg-[#FAF8F5] focus-visible:outline-2 focus-visible:outline-[#B88E4F] focus-visible:outline-offset-[3px]"><X size={20} /></button>
    </header>
    <div className="min-h-[160px] overflow-y-auto [overscroll-behavior:contain] px-5 sm:px-7">
      {(order.productReviews || []).map(review => {
        const item = order.orderItems.find(item => item.productId === review.productId);
        const rating = Math.max(0, Math.min(5, Number(review.rating) || 0));
        const name = review.customerName?.trim() || reviewer?.fullName?.trim() || order.customerName?.trim() || 'Bạn';
        const createdAt = review.createdAt && Number.isFinite(Date.parse(review.createdAt)) ? new Date(review.createdAt) : null;
        const status = review.status === 'PENDING' ? 'Đang chờ kiểm duyệt' : ['HIDDEN', 'REJECTED'].includes(review.status) ? 'Không hiển thị công khai' : 'Đã đăng';
        const images = Array.isArray(review.images) && review.images.length ? review.images.filter((image: unknown): image is string => typeof image === 'string') : review.reviewImageUrl ? [review.reviewImageUrl] : [];
        return <section key={review.id || review.productId} className="grid grid-cols-[36px_minmax(0,1fr)] sm:grid-cols-[44px_minmax(0,1fr)] gap-2.5 sm:gap-4 py-5 sm:py-6 border-t border-[#EAE4D7]">
          <div className="relative grid place-items-center w-[36px] h-[36px] sm:w-[44px] sm:h-[44px] overflow-hidden border border-[#EEDFC6] rounded-full bg-[#FBF5EB] text-[#B88E4F] text-[17px] sm:text-[20px] [&_img]:absolute [&_img]:inset-0 [&_img]:z-[1] [&_img]:w-full [&_img]:h-full [&_img]:object-cover" aria-hidden="true">
            {reviewer?.avatarUrl && <img src={reviewer.avatarUrl} alt="" onError={event => { event.currentTarget.style.display = 'none'; }} />}
            <span>{name.charAt(0).toLocaleUpperCase('vi-VN')}</span>
          </div>
          <div className="order-review-main">
            <div className="flex flex-wrap justify-between items-center gap-2 [&_strong]:text-sm [&_strong]:font-semibold [&_span]:text-[11px] [&_span]:text-[#7D715E]"><strong>{name}</strong><span>{status}</span></div>
            <div className="flex gap-0.5 mt-1.5 text-[#EAE4D7] [&_.is-filled]:fill-[#C59B58] [&_.is-filled]:text-[#C59B58]" aria-label={`${rating} trên 5 sao`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} size={19} aria-hidden="true" className={index < rating ? 'is-filled' : ''} />)}</div>
            <div className="flex flex-col gap-1.25 mt-2.5 text-xs text-[#7D715E] leading-normal">
              {createdAt && <time dateTime={createdAt.toISOString()}>{createdAt.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', hourCycle: 'h23' })}</time>}
              <span>{item?.product?.title || 'Sản phẩm trong đơn hàng'}{item?.variant?.name ? ` · ${item.variant.name}` : ''}</span>
            </div>
            {review.comment && <p className="mt-4 text-[15px] leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">{review.comment}</p>}
            {images.length > 0 && <div className="flex flex-wrap gap-2 mt-3.5 [&_img]:w-20 [&_img]:h-20 [&_img]:object-cover [&_img]:border [&_img]:border-[#EAE4D7] [&_img]:rounded-md">{images.map((url: string, index: number) => <a key={`${url}-${index}`} href={url} target="_blank" rel="noopener noreferrer" aria-label={`Xem ảnh đánh giá ${index + 1}`}><img src={url} alt={`Ảnh đánh giá ${index + 1}`} /></a>)}</div>}
            {review.video && <video className="block w-[min(100%,320px)] max-h-[240px] mt-3.5 rounded-md focus-visible:outline-2 focus-visible:outline-[#B88E4F] focus-visible:outline-offset-[3px]" controls preload="metadata" src={review.video} aria-label="Video đánh giá" />}
            {review.rejectionReason && <p className="flex flex-col gap-1.5 mt-4 px-4 py-3.5 bg-[#FAF8F5] rounded-md text-[13px] leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere] [&_strong]:font-medium"><strong>Phản hồi kiểm duyệt</strong>{review.rejectionReason}</p>}
          </div>
        </section>;
      })}
      {!order.productReviews?.length && <p className="my-5 text-[#7D715E] text-sm">Chưa có đánh giá cho đơn hàng này.</p>}
    </div>
    <footer className="flex shrink-0 justify-end px-5 py-3.5 sm:px-7 sm:pt-4.5 sm:pb-6.5 [&_button]:min-w-[140px] [&_button]:min-h-[40px] [&_button]:border [&_button]:border-[#EEDFC6] [&_button]:rounded-md [&_button]:bg-[#FBF5EB] [&_button]:text-[#795A2D] [&_button]:text-sm [&_button]:font-medium [&_button]:cursor-pointer hover:[&_button]:bg-[#F3EFE6] focus-visible:[&_button]:outline-2 focus-visible:[&_button]:outline-[#B88E4F] focus-visible:[&_button]:outline-offset-[3px]"><button type="button" onClick={onClose}>OK</button></footer>
  </dialog>;
}
