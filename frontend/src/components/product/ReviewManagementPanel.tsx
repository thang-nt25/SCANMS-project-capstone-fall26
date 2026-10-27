import { useEffect, useRef, useState } from 'react';
import { Star, X } from 'lucide-react';
import api from '@/services/api';
import { toast } from '@/utils/toast';
import { getSafeProductImageUrl } from '@/utils/marketplace.utils';
import { useSearchParams } from 'react-router-dom';
import { EvidenceImageViewer, ReviewEvidenceImages, type ReviewEvidenceImage } from './ReviewEvidenceImages';

const unwrap = (res: any) => res?.data?.data ?? res?.data ?? res;
export function ReviewManagementDialog({ admin, onClose }: { admin: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLElement>(null);
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; dialog.current?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const controls = [...(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href]') || [])].filter(el => el.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keyboard);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keyboard); if (previous?.isConnected) previous.focus(); };
  }, []);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#231D15]/50 p-3">
    <section ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="review-management-title" className="flex max-h-[88dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white">
      <div className="relative z-10 h-0 shrink-0"><button type="button" aria-label="Đóng quản lý đánh giá" onClick={onClose} className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-[#EAE4D7] bg-white text-[#7D715E] shadow-sm hover:bg-[#FBF5EB] focus-visible:outline-2 focus-visible:outline-[#C59B58]"><X size={18} /></button></div>
      <div data-review-management-scroll className="min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5">
        <h2 id="review-management-title" className="mb-4 min-h-9 pr-12 text-lg font-semibold text-[#1A1612]">Đánh giá khách hàng</h2>
        <ReviewManagementPanel admin={admin} />
      </div>
    </section>
  </div>;
}
export function ReviewManagementPanel({ admin = false }: { admin?: boolean }) {
  const [params] = useSearchParams();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(() => admin && params.get('filter') === 'PENDING' ? 'PENDING' : 'ALL');
  const [action, setAction] = useState<{ id: string; kind: 'reply' | 'report' | 'resolve'; decision?: 'KEEP' | 'HIDE' } | null>(null);
  const [text, setText] = useState('');
  const [reason, setReason] = useState('ABUSE');
  const [evidence, setEvidence] = useState('');
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<ReviewEvidenceImage[]>([]);
  const imagesRef = useRef(images);
  const changeImages = (next: ReviewEvidenceImage[]) => {
    for (const image of imagesRef.current) if (!next.some(item => item.id === image.id)) URL.revokeObjectURL(image.preview);
    imagesRef.current = next;
    setImages(next);
  };
  useEffect(() => () => { imagesRef.current.forEach(image => URL.revokeObjectURL(image.preview)); }, []);
  const [videos, setVideos] = useState<ReviewEvidenceImage[]>([]);
  const videosRef = useRef(videos);
  const changeVideos = (next: ReviewEvidenceImage[]) => {
    for (const video of videosRef.current) if (!next.some(item => item.id === video.id)) URL.revokeObjectURL(video.preview);
    videosRef.current = next;
    setVideos(next);
  };
  useEffect(() => () => { videosRef.current.forEach(video => URL.revokeObjectURL(video.preview)); }, []);
  const [uploadProgress, setUploadProgress] = useState('');
  const [viewingEvidence, setViewingEvidence] = useState<string | null>(null);
  const [viewingVideo, setViewingVideo] = useState<string | null>(null);
  const targetReview = admin ? params.get('review') : null;
  useEffect(() => {
    if (!admin) return;
    if (params.get('filter') === 'PENDING') setFilter('PENDING');
    if (!targetReview || loading) return;
    const timer = requestAnimationFrame(() => document.getElementById(`review-${targetReview}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
    return () => cancelAnimationFrame(timer);
  }, [admin, params, targetReview, loading]);
  const load = async () => {
    setLoading(true);
    try { const data = unwrap(await api.get('/products/reviews/moderation', { headers: { 'x-skip-cache': 'true' } })); setReviews(Array.isArray(data) ? data : []); }
    catch (error: any) { toast.error(error.message || 'Không tải được đánh giá'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const open = (id: string, kind: 'reply' | 'report' | 'resolve', decision?: 'KEEP' | 'HIDE') => { if (saving) return; setAction({ id, kind, decision }); setText(''); setEvidence(''); changeImages([]); changeVideos([]); setReason('ABUSE'); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (!action || saving) return;
    setSaving(true);
    try {
      const links = evidence.split(/\n/).map(url => url.trim()).filter(Boolean);
      if (action.kind === 'report' && (links.length > 3 || links.some(url => { try { return new URL(url).protocol !== 'https:'; } catch { return true; } }))) throw new Error('Nhập tối đa 3 liên kết HTTPS hợp lệ, mỗi dòng một liên kết.');
      const uploadFiles = async (files: typeof imagesRef, change: typeof changeImages, label: string) => {
        const uploaded: string[] = [];
        for (let index = 0; index < files.current.length; index++) {
        let image = files.current[index];
        setUploadProgress(`Đang tải ${label} ${index + 1}/${files.current.length}…`);
        if (!image.uploadedUrl) {
          const form = new FormData(); form.append('file', image.file);
          const result = unwrap(await api.post(`/products/reviews/${action.id}/evidence`, form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 180000 }));
          if (!result?.secureUrl?.startsWith('https://')) throw new Error('Máy chủ chưa xác nhận tệp bằng chứng. Vui lòng thử lại.');
          image = { ...image, uploadedUrl: result.secureUrl };
          change(files.current.map(item => item.id === image.id ? image : item));
        }
        uploaded.push(image.uploadedUrl!);
      }
        return uploaded;
      };
      const uploadedImages = action.kind === 'report' ? await uploadFiles(imagesRef, changeImages, 'ảnh') : [];
      const uploadedVideos = action.kind === 'report' ? await uploadFiles(videosRef, changeVideos, 'video') : [];
      setUploadProgress('');
      const body = action.kind === 'reply' ? { comment: text.trim() } : action.kind === 'report'
        ? { reason, details: text.trim(), evidence: links, images: uploadedImages, videos: uploadedVideos }
        : { decision: action.decision, reason: text.trim() };
      const data = unwrap(await api.post(`/products/reviews/${action.id}/${action.kind}`, body));
      toast.success(data.message); setAction(null); changeImages([]); changeVideos([]); await load();
    } catch (error: any) { toast.error(error.message || 'Không xử lý được yêu cầu'); }
    finally { setSaving(false); setUploadProgress(''); }
  };
  const pending = (review: any) => review.status === 'PENDING' || review.reports?.some((report: any) => !report.resolved);
  const shown = reviews.filter(review => filter === 'ALL' || (filter === 'PENDING' ? pending(review) : filter === 'LOW' ? review.rating <= 2 : review.status === filter));
  const btn = 'rounded-lg border border-[#EAE4D7] bg-white px-3 py-2 text-xs font-semibold text-[#1A1612] hover:bg-[#FBF5EB] disabled:opacity-50';
  return <div className="space-y-4 text-left text-[#1A1612]">
    {admin && <p className="text-sm leading-relaxed text-[#7D715E]">Đánh giá của người mua được đăng ngay. Sàn xem xét nội dung và bằng chứng trước khi quyết định ẩn; nhận xét tiêu cực hợp lệ phải được giữ nguyên.</p>}
    <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc quản lý đánh giá">{[['ALL', 'Tất cả'], ['PENDING', 'Cần sàn xử lý'], ['APPROVED', 'Đang hiển thị'], ['LOW', '1–2 sao'], ['HIDDEN', 'Đã ẩn']].map(([key, label]) => <button type="button" key={key} onClick={() => setFilter(key)} aria-pressed={filter === key} className={`${btn} ${filter === key ? 'border-[#C59B58] bg-[#FBF5EB]' : ''}`}>{label}</button>)}<button type="button" onClick={() => void load()} className={btn}>Làm mới</button></div>
    {loading ? <p className="py-8 text-center text-sm text-[#7D715E]">Đang tải đánh giá…</p> : !shown.length ? <p className="py-8 text-center text-sm text-[#7D715E]">Chưa có đánh giá trong mục này.</p> : shown.map(review => <article key={review.id} id={`review-${review.id}`} className={`rounded-xl border bg-white p-4 ${targetReview === review.id ? "border-[#C59B58] ring-2 ring-[#FBF5EB]" : "border-[#EAE4D7]"}`}>
      <div className="flex gap-3"><img src={getSafeProductImageUrl(review.product?.imageUrl, review.product?.title)} alt={review.product?.title || 'Sản phẩm'} className="h-14 w-14 shrink-0 rounded-lg border border-[#EAE4D7] object-contain" /><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">{review.product?.title}</h3><p className="mt-1 text-xs text-[#7D715E]">{review.customerName} · {new Date(review.createdAt).toLocaleDateString('vi-VN')} · {({ APPROVED: 'Đang công khai', PENDING: 'Sàn đang kiểm tra', HIDDEN: 'Sàn đã ẩn', REJECTED: 'Sàn từ chối' } as Record<string, string>)[review.status]}</p><span className="mt-1 inline-flex items-center gap-0.5 text-[#B88E4F]" aria-label={`${review.rating} trên 5 sao`}>{[1,2,3,4,5].map(value => <Star size={13} key={value} className={value <= review.rating ? 'fill-[#C59B58]' : 'text-[#EAE4D7]'} />)}</span></div></div>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm">{review.comment}</p>
      <div className="mt-2 flex flex-wrap gap-2">{[...new Set([...(review.images || []), review.reviewImageUrl].filter(Boolean))].slice(0, 5).map((url: any) => <a key={url} href={url} target="_blank" rel="noreferrer"><img src={url} alt="Ảnh khách hàng" className="h-16 w-16 rounded-lg border border-[#EAE4D7] object-cover" /></a>)}</div>
      {review.reply && <p className="mt-3 rounded-lg bg-[#FAF8F5] p-3 text-xs"><strong>Shop: </strong>{review.reply.comment}</p>}
      {review.rejectionReason && <p className="mt-3 text-xs text-[#7D715E]">Lý do kiểm tra: {review.rejectionReason}</p>}
      {review.reports?.map((report: any) => <div key={report.id} className="mt-3 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] p-3 text-xs"><strong>{report.resolved ? 'Báo cáo đã xử lý' : 'Báo cáo chờ sàn xử lý'} · {report.reason}</strong><p className="mt-1 whitespace-pre-wrap break-words">{report.details}</p>{report.images?.length > 0 && <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">{report.images.map((url: string, index: number) => <button key={`${url}-${index}`} type="button" aria-label={`Xem ảnh báo cáo ${index + 1}`} onClick={() => setViewingEvidence(url)} className="aspect-square overflow-hidden rounded-lg border border-[#EEDFC6] bg-white"><img src={url} alt={`Ảnh bằng chứng ${index + 1}`} loading="lazy" className="h-full w-full object-cover" /></button>)}</div>}{report.videos?.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{report.videos.map((url: string, index: number) => <button key={`${url}-${index}`} type="button" aria-label={`Xem video báo cáo ${index + 1}`} onClick={() => setViewingVideo(url)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#EEDFC6] bg-white px-3 text-xs font-medium text-[#795A2D]">Video bằng chứng {index + 1}</button>)}</div>}{report.evidence?.map((url: string, index: number) => <a key={url} href={url} target="_blank" rel="noreferrer" className="mr-3 inline-block mt-2 underline text-[#8C6B32]">Bằng chứng {index + 1}</a>)}</div>)}
      {review.resolution && <p className="mt-2 text-xs text-[#7D715E]">Quyết định của sàn: {review.resolution.decision === 'KEEP' ? 'Giữ đánh giá' : 'Ẩn vi phạm'} · {review.resolution.reason}</p>}
      <div className="mt-3 flex flex-wrap gap-2">{admin ? <><button type="button" className={btn} onClick={() => open(review.id, 'resolve', 'KEEP')}>Giữ / công khai đánh giá</button><button type="button" className={btn} onClick={() => open(review.id, 'resolve', 'HIDE')}>Ẩn nội dung vi phạm</button></> : <>{review.isApproved && <button type="button" className={btn} onClick={() => open(review.id, 'reply')}>{review.reply ? 'Cập nhật phản hồi' : 'Trả lời khách hàng'}</button>}<button type="button" className={btn} onClick={() => open(review.id, 'report')}>Báo cáo vi phạm</button></>}</div>
      {action && action.id === review.id && <form onSubmit={submit} className="mt-4 space-y-3 rounded-xl bg-[#FAF8F5] p-3">
        <label className="block text-xs font-semibold">{action.kind === 'reply' ? 'Phản hồi công khai của Shop' : action.kind === 'report' ? 'Lý do báo cáo' : action.decision === 'KEEP' ? 'Lý do giữ / công khai đánh giá' : 'Lý do ẩn và căn cứ vi phạm'}
          {action.kind === 'report' && <select value={reason} onChange={event => setReason(event.target.value)} className="mt-2 w-full rounded-lg border border-[#EAE4D7] bg-white p-2">{[['ABUSE','Xúc phạm, đe dọa'],['PERSONAL_DATA','Lộ thông tin cá nhân'],['SPAM','Spam, quảng cáo'],['FAKE','Nghi ngờ giả mạo (cần bằng chứng)'],['UNRELATED','Không liên quan sản phẩm'],['OTHER','Vi phạm khác']].map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select>}
          <textarea autoFocus required minLength={action.kind === 'reply' ? 3 : 10} maxLength={action.kind === 'reply' ? 1000 : 2000} value={text} onChange={event => setText(event.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-[#EAE4D7] bg-white p-3 text-sm font-normal outline-[#C59B58]" /></label>
        {action.kind === 'report' && <>
          <ReviewEvidenceImages images={images} onChange={changeImages} disabled={saving} />
          <ReviewEvidenceImages kind="video" images={videos} onChange={changeVideos} disabled={saving} />
          <div className="rounded-xl border border-[#EAE4D7] bg-white p-3"><label className="block text-xs font-semibold text-[#795A2D]">Thêm liên kết khác (tùy chọn)<span className="mt-1.5 block text-[11px] font-normal text-[#7D715E]">Video hoặc tài liệu · Tối đa 3 liên kết HTTPS, mỗi dòng một liên kết</span><textarea aria-label="Liên kết video hoặc tài liệu bằng chứng" disabled={saving} rows={2} value={evidence} onChange={event => setEvidence(event.target.value)} placeholder="https://..." className="mt-2 w-full rounded-lg border border-[#EAE4D7] bg-white p-2 font-normal text-[#1A1612] outline-[#C59B58]" /></label></div>
        </>}
        <div className="flex gap-2"><button disabled={saving} type="submit" className={`${btn} bg-[#FBF5EB]`}>{saving ? uploadProgress || 'Đang gửi…' : 'Xác nhận'}</button><button disabled={saving} type="button" onClick={() => { setAction(null); changeImages([]); changeVideos([]); }} className={btn}>Hủy</button></div>
      </form>}
    </article>)}
    <p className="text-xs text-[#7D715E]">100 đánh giá gần đây và các đánh giá đang có báo cáo chờ xử lý. Mọi báo cáo và quyết định đều được lưu lịch sử.</p>
    {viewingEvidence && <EvidenceImageViewer url={viewingEvidence} onClose={() => setViewingEvidence(null)} />}
    {viewingVideo && <EvidenceImageViewer url={viewingVideo} video onClose={() => setViewingVideo(null)} />}
  </div>;
}
