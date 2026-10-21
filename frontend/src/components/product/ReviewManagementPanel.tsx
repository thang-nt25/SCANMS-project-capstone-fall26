import { useEffect, useRef, useState } from 'react';
import { Star, X } from 'lucide-react';
import api from '@/services/api';
import { toast } from '@/utils/toast';
import { getSafeProductImageUrl } from '@/utils/marketplace.utils';

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
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#231D15]/50 p-3"><section ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="review-management-title" className="flex max-h-[88dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white p-4 sm:p-5"><div className="mb-4 flex items-center justify-between gap-3"><h2 id="review-management-title" className="text-lg font-semibold text-[#1A1612]">Đánh giá khách hàng</h2><button type="button" aria-label="Đóng quản lý đánh giá" onClick={onClose} className="rounded-full border border-[#EAE4D7] p-2"><X size={18} /></button></div><div className="overflow-y-auto"><ReviewManagementPanel admin={admin} /></div></section></div>;
}
export function ReviewManagementPanel({ admin = false }: { admin?: boolean }) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [action, setAction] = useState<{ id: string; kind: 'reply' | 'report' | 'resolve'; decision?: 'KEEP' | 'HIDE' } | null>(null);
  const [text, setText] = useState('');
  const [reason, setReason] = useState('ABUSE');
  const [evidence, setEvidence] = useState('');
  const [saving, setSaving] = useState(false);
  const load = async () => {
    setLoading(true);
    try { const data = unwrap(await api.get('/products/reviews/moderation', { headers: { 'x-skip-cache': 'true' } })); setReviews(Array.isArray(data) ? data : []); }
    catch (error: any) { toast.error(error.message || 'Không tải được đánh giá'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const open = (id: string, kind: 'reply' | 'report' | 'resolve', decision?: 'KEEP' | 'HIDE') => { setAction({ id, kind, decision }); setText(''); setEvidence(''); setReason('ABUSE'); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (!action || saving) return;
    setSaving(true);
    try {
      const body = action.kind === 'reply' ? { comment: text.trim() } : action.kind === 'report'
        ? { reason, details: text.trim(), evidence: evidence.split(/\n/).map(url => url.trim()).filter(Boolean) }
        : { decision: action.decision, reason: text.trim() };
      const data = unwrap(await api.post(`/products/reviews/${action.id}/${action.kind}`, body));
      toast.success(data.message); setAction(null); await load();
    } catch (error: any) { toast.error(error.message || 'Không xử lý được yêu cầu'); }
    finally { setSaving(false); }
  };
  const pending = (review: any) => review.status === 'PENDING' || review.reports?.some((report: any) => !report.resolved);
  const shown = reviews.filter(review => filter === 'ALL' || (filter === 'PENDING' ? pending(review) : filter === 'LOW' ? review.rating <= 2 : review.status === filter));
  const btn = 'rounded-lg border border-[#EAE4D7] bg-white px-3 py-2 text-xs font-semibold text-[#1A1612] hover:bg-[#FBF5EB] disabled:opacity-50';
  return <div className="space-y-4 text-left text-[#1A1612]">
    <p className="text-sm leading-relaxed text-[#7D715E]">{admin ? 'Đánh giá của người mua được đăng ngay. Sàn xem xét nội dung và bằng chứng trước khi quyết định ẩn; nhận xét tiêu cực hợp lệ phải được giữ nguyên.' : 'Đánh giá của người mua được đăng ngay. Shop chỉ được phản hồi hoặc báo cáo kèm lý do và bằng chứng. Trong lúc chờ sàn xử lý, đánh giá vẫn hiển thị và giữ nguyên điểm sao.'}</p>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc quản lý đánh giá">{[['ALL', 'Tất cả'], ['PENDING', 'Cần sàn xử lý'], ['APPROVED', 'Đang hiển thị'], ['LOW', '1–2 sao'], ['HIDDEN', 'Đã ẩn']].map(([key, label]) => <button type="button" key={key} onClick={() => setFilter(key)} aria-pressed={filter === key} className={`${btn} ${filter === key ? 'border-[#C59B58] bg-[#FBF5EB]' : ''}`}>{label}</button>)}<button type="button" onClick={() => void load()} className={btn}>Làm mới</button></div>
    {loading ? <p className="py-8 text-center text-sm text-[#7D715E]">Đang tải đánh giá…</p> : !shown.length ? <p className="py-8 text-center text-sm text-[#7D715E]">Chưa có đánh giá trong mục này.</p> : shown.map(review => <article key={review.id} className="rounded-xl border border-[#EAE4D7] bg-white p-4">
      <div className="flex gap-3"><img src={getSafeProductImageUrl(review.product?.imageUrl, review.product?.title)} alt={review.product?.title || 'Sản phẩm'} className="h-14 w-14 shrink-0 rounded-lg border border-[#EAE4D7] object-contain" /><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">{review.product?.title}</h3><p className="mt-1 text-xs text-[#7D715E]">{review.customerName} · {new Date(review.createdAt).toLocaleDateString('vi-VN')} · {({ APPROVED: 'Đang công khai', PENDING: 'Sàn đang kiểm tra', HIDDEN: 'Sàn đã ẩn', REJECTED: 'Sàn từ chối' } as Record<string, string>)[review.status]}</p><span className="mt-1 inline-flex items-center gap-0.5 text-[#B88E4F]" aria-label={`${review.rating} trên 5 sao`}>{[1,2,3,4,5].map(value => <Star size={13} key={value} className={value <= review.rating ? 'fill-[#C59B58]' : 'text-[#EAE4D7]'} />)}</span></div></div>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm">{review.comment}</p>
      <div className="mt-2 flex flex-wrap gap-2">{[...new Set([...(review.images || []), review.reviewImageUrl].filter(Boolean))].slice(0, 5).map((url: any) => <a key={url} href={url} target="_blank" rel="noreferrer"><img src={url} alt="Ảnh khách hàng" className="h-16 w-16 rounded-lg border border-[#EAE4D7] object-cover" /></a>)}</div>
      {review.reply && <p className="mt-3 rounded-lg bg-[#FAF8F5] p-3 text-xs"><strong>Shop: </strong>{review.reply.comment}</p>}
      {review.rejectionReason && <p className="mt-3 text-xs text-[#7D715E]">Lý do kiểm tra: {review.rejectionReason}</p>}
      {review.reports?.map((report: any) => <div key={report.id} className="mt-3 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] p-3 text-xs"><strong>{report.resolved ? 'Báo cáo đã xử lý' : 'Báo cáo chờ sàn xử lý'} · {report.reason}</strong><p className="mt-1 whitespace-pre-wrap break-words">{report.details}</p>{report.evidence?.map((url: string, index: number) => <a key={url} href={url} target="_blank" rel="noreferrer" className="mr-3 inline-block mt-2 underline text-[#8C6B32]">Bằng chứng {index + 1}</a>)}</div>)}
      {review.resolution && <p className="mt-2 text-xs text-[#7D715E]">Quyết định của sàn: {review.resolution.decision === 'KEEP' ? 'Giữ đánh giá' : 'Ẩn vi phạm'} · {review.resolution.reason}</p>}
      <div className="mt-3 flex flex-wrap gap-2">{admin ? <><button type="button" className={btn} onClick={() => open(review.id, 'resolve', 'KEEP')}>Giữ / công khai đánh giá</button><button type="button" className={btn} onClick={() => open(review.id, 'resolve', 'HIDE')}>Ẩn nội dung vi phạm</button></> : <>{review.isApproved && <button type="button" className={btn} onClick={() => open(review.id, 'reply')}>{review.reply ? 'Cập nhật phản hồi' : 'Trả lời khách hàng'}</button>}<button type="button" className={btn} onClick={() => open(review.id, 'report')}>Báo cáo vi phạm</button></>}</div>
      {action && action.id === review.id && <form onSubmit={submit} className="mt-4 space-y-3 rounded-xl bg-[#FAF8F5] p-3">
        <label className="block text-xs font-semibold">{action.kind === 'reply' ? 'Phản hồi công khai của Shop' : action.kind === 'report' ? 'Lý do báo cáo' : action.decision === 'KEEP' ? 'Lý do giữ / công khai đánh giá' : 'Lý do ẩn và căn cứ vi phạm'}
          {action.kind === 'report' && <select value={reason} onChange={event => setReason(event.target.value)} className="mt-2 w-full rounded-lg border border-[#EAE4D7] bg-white p-2">{[['ABUSE','Xúc phạm, đe dọa'],['PERSONAL_DATA','Lộ thông tin cá nhân'],['SPAM','Spam, quảng cáo'],['FAKE','Nghi ngờ giả mạo (cần bằng chứng)'],['UNRELATED','Không liên quan sản phẩm'],['OTHER','Vi phạm khác']].map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select>}
          <textarea autoFocus required minLength={action.kind === 'reply' ? 3 : 10} maxLength={action.kind === 'reply' ? 1000 : 2000} value={text} onChange={event => setText(event.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-[#EAE4D7] bg-white p-3 text-sm font-normal outline-[#C59B58]" /></label>
        {action.kind === 'report' && <label className="block text-xs text-[#7D715E]">Liên kết bằng chứng HTTPS (tối đa 3, mỗi dòng một liên kết)<textarea rows={2} value={evidence} onChange={event => setEvidence(event.target.value)} className="mt-1 w-full rounded-lg border border-[#EAE4D7] bg-white p-2" /></label>}
        <div className="flex gap-2"><button disabled={saving} type="submit" className={`${btn} bg-[#FBF5EB]`}>{saving ? 'Đang gửi…' : 'Xác nhận'}</button><button disabled={saving} type="button" onClick={() => setAction(null)} className={btn}>Hủy</button></div>
      </form>}
    </article>)}
    <p className="text-xs text-[#7D715E]">100 đánh giá gần đây và các đánh giá đang có báo cáo chờ xử lý. Mọi báo cáo và quyết định đều được lưu lịch sử.</p>
  </div>;
}
