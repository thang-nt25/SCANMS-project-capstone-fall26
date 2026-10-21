import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Star, X } from 'lucide-react';
import { customerService, type CustomerOrder } from '../../services/customer.service';
import { uploadService } from '../../services/upload.service';
import { toast } from '../../utils/toast';
import { Select } from '../ui/Select';
import { getSafeProductImageUrl } from '../../utils/marketplace.utils';

interface Props {
  order: CustomerOrder;
  onClose: () => void;
  onSubmitted: () => void;
}

export function VerifiedReviewModal({ order, onClose, onSubmitted }: Props) {
  const reviewedIds = new Set((order.productReviews || []).map((review: any) => review.productId));
  const products = order.orderItems.filter((item, index, items) => item.product && !reviewedIds.has(item.productId) && items.findIndex(row => row.productId === item.productId) === index);
  const [productId, setProductId] = useState(products[0]?.productId || '');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const selected = products.find(item => item.productId === productId);
  useEffect(() => {
    const urls = images.map(file => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [images]);
  const chooseImages = (files: File[]) => {
    if (files.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      toast.error('Chọn ảnh JPG, PNG hoặc WebP, tối đa 5 MB mỗi ảnh'); return;
    }
    if (files.length + images.length > 5) { toast.error('Mỗi đánh giá tối đa 5 ảnh'); return; }
    setImages(previous => [...previous, ...files]);
  };
  const [submitting, setSubmitting] = useState(false);
  const dialog = useRef<HTMLFormElement>(null);
  const busy = useRef(false);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (!busy.current) close.current(); }
      if (event.key !== 'Tab') return;
      const controls = [...(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), textarea:not(:disabled), select:not(:disabled), input:not(:disabled)') || [])].filter(el => el.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keyboard, true);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keyboard, true); if (previous?.isConnected) previous.focus(); };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy.current || !productId || order.status !== 'COMPLETED') return;
    if (rating < 1 || rating > 5) return toast.error('Vui lòng chọn số sao đánh giá');
    if (comment.trim().length < 10) return toast.error('Nội dung đánh giá cần ít nhất 10 ký tự');
    busy.current = true;
    setSubmitting(true);
    try {
      const imageUrls = await Promise.all(images.map((file) => uploadService.uploadImage(file, `scanms/reviews/${order.id}`)));
      const result = await customerService.submitVerifiedReview(order.id, { productId, rating, comment: comment.trim(), images: imageUrls });
      toast.success(result.message || 'Đã gửi đánh giá');
      onSubmitted();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Không thể đăng đánh giá');
    } finally {
      setSubmitting(false);
      busy.current = false;
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-[#231D15]/60 backdrop-blur-sm flex items-center justify-center p-4">
      <form ref={dialog} role="dialog" aria-modal="true" aria-labelledby="verified-review-title" aria-busy={submitting} tabIndex={-1} onSubmit={submit} className="w-full max-w-lg max-h-[92dvh] overflow-y-auto rounded-3xl bg-white border border-[#EAE4D7] shadow-2xl p-5 sm:p-6 text-left">
        <div className="flex justify-between gap-4 pb-4 border-b border-[#EAE4D7]">
          <div><h2 id="verified-review-title" className="text-lg font-black text-[#1A1612]">Đánh giá sản phẩm</h2><p className="text-xs text-[#7D715E] mt-1">Đã mua và nhận hàng · #{order.externalOrderSn}</p></div>
          <button type="button" disabled={submitting} aria-label="Đóng đánh giá" onClick={onClose} className="p-2 rounded-full bg-[#F3EFE6] text-[#7D715E]"><X className="w-4 h-4" /></button>
        </div>
        {products.length === 0 ? <p className="py-8 text-center text-sm text-[#7D715E]">Bạn đã đánh giá tất cả sản phẩm trong đơn này.</p> : <div className="space-y-4 mt-5">
          <label className="block text-xs font-bold">Sản phẩm
            <div className="mt-1.5">
              <Select disabled={submitting} value={productId} onChange={(e) => { setProductId(e.target.value); setRating(0); setComment(''); setImages([]); }} className="w-full text-xs font-medium">
                {products.map((item) => <option key={item.productId} value={item.productId}>{item.product?.title}</option>)}
              </Select>
            </div>
          </label>
          <div className="flex items-center gap-3 rounded-xl border border-[#EAE4D7] p-3" data-review-product>
            <img src={getSafeProductImageUrl(selected?.product?.imageUrl, selected?.product?.title)} alt={selected?.product?.title || 'Sản phẩm'} className="h-14 w-14 shrink-0 rounded-lg border border-[#EAE4D7] object-contain" />
            <div className="min-w-0"><p className="text-sm font-semibold leading-snug">{selected?.product?.title}</p><p className="mt-1 text-xs text-[#7D715E]">{selected?.variant?.name || 'Phân loại tiêu chuẩn'} · Đã mua hàng</p></div>
          </div>
          <div className="rounded-2xl bg-[#FBF5EB] border border-[#EEDFC6] p-4 text-center"><span className="text-xs font-bold">Chất lượng sản phẩm</span><div role="group" aria-label="Chọn số sao" className="flex justify-center gap-1 mt-2">{[1,2,3,4,5].map((value) => <button type="button" disabled={submitting} key={value} className="p-1.5 rounded-lg focus-visible:outline-2 focus-visible:outline-[#C59B58]" onClick={() => setRating(value)} aria-pressed={rating === value} aria-label={`${value} sao`}><Star className={`w-8 h-8 ${value <= rating ? 'fill-[#C59B58] text-[#C59B58]' : 'text-[#C59B58]/40'}`} /></button>)}</div><p aria-live="polite" className="mt-1 text-xs text-[#8C6B32]">{rating === 0 ? 'Chọn số sao để đánh giá' : <>{rating}/5 · {['Rất không hài lòng', 'Không hài lòng', 'Bình thường', 'Hài lòng', 'Rất hài lòng'][rating - 1]}</>}</p></div>
          <label className="block text-xs font-bold">Nhận xét
            <textarea disabled={submitting} required minLength={10} maxLength={1000} rows={4} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Chia sẻ trải nghiệm thực tế về sản phẩm (ít nhất 10 ký tự)..." className="mt-1.5 w-full rounded-xl border border-[#EAE4D7] bg-white p-3 outline-none focus:border-[#C59B58]" />
          </label>
          <div><div className="flex items-center justify-between text-xs"><span className="font-semibold">Ảnh trải nghiệm</span><span className="text-[#7D715E]">{images.length}/5 ảnh · Tối đa 5 MB/ảnh</span></div>
            <div className="mt-2 flex flex-wrap gap-2">{previews.map((url, index) => <div key={url} className="relative h-20 w-20">
              <img src={url} alt={`Ảnh đánh giá ${index + 1}`} className="h-full w-full rounded-xl border border-[#EAE4D7] object-cover" />
              <button type="button" disabled={submitting} aria-label={`Xóa ảnh ${index + 1}`} onClick={() => setImages(previous => previous.filter((_, i) => i !== index))} className="absolute -right-1 -top-1 rounded-full border border-[#EAE4D7] bg-white p-1"><X size={13} /></button>
            </div>)}{images.length < 5 && <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#C59B58] bg-[#FBF5EB] text-[#8C6B32]"><ImagePlus size={22} /><span className="text-[11px]">Thêm ảnh</span><input disabled={submitting} aria-label="Thêm ảnh đánh giá" type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={event => { chooseImages(Array.from(event.target.files || [])); event.target.value = ''; }} /></label>}</div>
          </div>
        </div>}
        <p className="mt-4 text-xs leading-relaxed text-[#7D715E]">Đánh giá hợp lệ được công khai, kể cả 1–2 sao. Nội dung có dấu hiệu vi phạm sẽ do sàn kiểm tra. Mỗi sản phẩm trong đơn được đánh giá một lần.</p>
        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-[#EAE4D7]"><button type="button" disabled={submitting} onClick={onClose} className="py-3 rounded-xl bg-[#F3EFE6] text-xs font-bold text-[#7D715E]">Để sau</button>{products.length > 0 && <button type="submit" disabled={submitting || !productId || rating === 0 || comment.trim().length < 10} className="py-3 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] disabled:opacity-50 text-[#1A1612] text-xs font-bold flex justify-center items-center gap-2">{submitting && <Loader2 className="w-4 h-4 animate-spin" />}Gửi đánh giá</button>}</div>
      </form>
    </div>
  );
}
