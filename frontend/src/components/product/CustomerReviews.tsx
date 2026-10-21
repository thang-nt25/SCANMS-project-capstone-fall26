import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Star, X } from 'lucide-react';
import { getSafeProductImageUrl } from '@/utils/marketplace.utils';

export interface CustomerReview {
  id: string; customerName: string; rating: number; comment: string; createdAt: string;
  isVerifiedBuyer: boolean; reviewImageUrl?: string | null; images?: string[];
  reply?: { comment: string; createdAt: string } | null;
}
export function CustomerReviews({ reviews, product }: {
  reviews: { averageRating: number | null; totalReviews: number; photoReviewCount?: number; starDistribution: Record<number, number>; items: CustomerReview[] };
  product: { title: string; imageUrl?: string | null };
}) {
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [photo, setPhoto] = useState<string | null>(null);
  const close = useRef<HTMLButtonElement>(null);
  const imagesOf = (review: CustomerReview) => [...new Set([...(review.images || []), review.reviewImageUrl].filter((url): url is string => Boolean(url)))].slice(0, 5);
  useEffect(() => {
    if (!photo) return;
    const previous = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; close.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPhoto(null);
      if (event.key === 'Tab') { event.preventDefault(); close.current?.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', key); if (previous?.isConnected) previous.focus(); };
  }, [photo]);
  const shown = reviews.items.filter(review => filter === 'all' || review.rating === Number(filter))
    .sort((a, b) => (sort === 'newest' ? -1 : 1) * (Date.parse(a.createdAt) - Date.parse(b.createdAt)));
  const filters = [
    { key: 'all', label: 'Tất cả', count: reviews.totalReviews },
    ...[5, 4, 3, 2, 1].map(value => ({ key: String(value), label: `${value} sao`, count: reviews.starDistribution[value] || 0 })),
  ];
  const stars = (rating: number, size = 14) => <span className="inline-flex gap-0.5" aria-label={`${rating} trên 5 sao`}>{[1, 2, 3, 4, 5].map(value => <Star key={value} size={size} aria-hidden="true" className={value <= rating ? 'fill-[#C59B58] text-[#B88E4F]' : 'text-[#EAE4D7]'} />)}</span>;
  return <section className="min-w-0 rounded-2xl border border-[#EAE4D7] bg-white p-4 sm:p-5" aria-labelledby="product-customer-reviews-title">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EAE4D7] pb-4">
      <div className="flex min-w-0 items-center gap-3"><img src={getSafeProductImageUrl(product.imageUrl, product.title)} alt={product.title} className="h-14 w-14 shrink-0 rounded-xl border border-[#EAE4D7] object-contain" />
        <div className="min-w-0"><h2 id="product-customer-reviews-title" className="text-lg font-semibold text-[#1A1612]">Đánh giá khách hàng</h2><p className="mt-1 line-clamp-1 text-xs text-[#7D715E]">{product.title}</p></div></div>
      <div className="flex items-center gap-3" data-review-summary><strong className="text-3xl font-semibold tabular-nums text-[#1A1612]">{reviews.averageRating == null ? '—' : reviews.averageRating.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}<span className="ml-1 text-xs font-normal text-[#7D715E]">/5</span></strong>
        <div>{stars(Math.round(reviews.averageRating || 0))}<p className="text-xs text-[#7D715E]">{reviews.totalReviews} đánh giá</p></div></div>
    </div>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc đánh giá">{filters.map(({ key, label, count }) => <button type="button" key={key} aria-pressed={filter === key} onClick={() => setFilter(key)} className={`rounded-lg border px-3 py-2 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-[#C59B58] ${filter === key ? 'border-[#C59B58] bg-[#FBF5EB] text-[#8C6B32]' : count === 0 ? 'border-[#EAE4D7] text-[#7D715E]/65 hover:bg-[#FAF8F5]' : 'border-[#EAE4D7] text-[#7D715E] hover:bg-[#FAF8F5]'}`}>{label} ({count})</button>)}</div>
      <label className="flex items-center gap-2 text-xs text-[#7D715E]">Sắp xếp
        <select aria-label="Sắp xếp đánh giá" value={sort} onChange={event => setSort(event.target.value)} className="rounded-lg border border-[#EAE4D7] bg-white px-3 py-2 text-[#1A1612] focus:outline-[#C59B58]">
          <option value="newest">Mới nhất</option><option value="oldest">Cũ nhất</option>
        </select>
      </label>
    </div>
    <div className="mt-1 divide-y divide-[#EAE4D7]">{shown.map(review => <article key={review.id} data-customer-review className="py-4">
      <div className="flex items-start gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#FBF5EB] text-xs font-semibold text-[#8C6B32]">{review.customerName.trim().charAt(0) || 'K'}</span>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-[#1A1612]">{review.customerName}</strong><time className="text-[11px] text-[#7D715E]">{new Date(review.createdAt).toLocaleDateString('vi-VN')}</time></div>
          <div className="mt-1 flex flex-wrap items-center gap-2">{stars(review.rating)}{review.isVerifiedBuyer && <span className="inline-flex items-center gap-1 text-[10px] text-[#7D715E]"><CheckCircle2 size={12} className="text-[#B88E4F]" />Đã mua hàng</span>}</div>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#1A1612]">{review.comment}</p>
          {imagesOf(review).length > 0 && <div className="mt-3 flex flex-wrap gap-2">{imagesOf(review).map((url, index) => <button type="button" key={url} aria-label={`Xem ảnh đánh giá ${index + 1} của ${review.customerName}`} onClick={() => setPhoto(url)} className="overflow-hidden rounded-xl border border-[#EAE4D7] focus-visible:outline-2 focus-visible:outline-[#C59B58]"><img loading="lazy" src={url} alt={`Ảnh trải nghiệm ${index + 1}`} className="h-20 w-20 object-cover sm:h-24 sm:w-24" /></button>)}</div>}
          {review.reply && <div className="mt-3 rounded-xl bg-[#FAF8F5] p-3"><strong className="text-xs text-[#8C6B32]">Phản hồi của Shop</strong><p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-[#1A1612]">{review.reply.comment}</p></div>}
        </div></div>
    </article>)}</div>
    {!shown.length && <p className="py-8 text-center text-sm text-[#7D715E]">{reviews.totalReviews ? 'Chưa có đánh giá trong bộ lọc này.' : 'Chưa có đánh giá. Hãy chia sẻ trải nghiệm sau khi nhận hàng.'}</p>}
    {reviews.totalReviews > reviews.items.length && <p className="mt-2 text-xs text-[#7D715E]">Đang hiển thị {reviews.items.length} đánh giá mới nhất. Điểm sao được tính từ toàn bộ đánh giá công khai.</p>}
    {photo && <div role="dialog" aria-modal="true" aria-label="Ảnh đánh giá phóng lớn" className="fixed inset-0 z-[90] flex items-center justify-center bg-[#231D15]/85 p-5" onClick={() => setPhoto(null)}><button ref={close} type="button" aria-label="Đóng ảnh đánh giá" onClick={() => setPhoto(null)} className="absolute right-4 top-4 rounded-full bg-white p-3 text-[#1A1612]"><X size={20} /></button><img src={photo} alt="Ảnh trải nghiệm phóng lớn" onClick={event => event.stopPropagation()} className="max-h-[85dvh] max-w-full rounded-xl object-contain" /></div>}
  </section>;
}
