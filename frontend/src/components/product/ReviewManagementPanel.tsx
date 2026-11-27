import { handleProductImageError } from '@/utils/image-fallback.utils';
import { useEffect, useRef, useState } from 'react';
import { Star, X, Search, ExternalLink, MessageSquareQuote, AlertTriangle, Send, Flag, Clock } from 'lucide-react';
import api from '@/services/api';
import { toast } from '@/utils/toast';
import { getSafeProductImageUrl } from '@/utils/marketplace.utils';
import { Select } from '@/components/ui/Select';

const unwrap = (res: any) => res?.data?.data ?? res?.data ?? res;

export function ReviewManagementDialog({ admin, onClose }: { admin: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();

    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close.current();
      }
      if (event.key !== 'Tab') return;
      const controls = [
        ...(dialog.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href]'
        ) || []),
      ].filter((el) => el.getClientRects().length);
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener('keydown', keyboard);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', keyboard);
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#231D15]/50 p-3 sm:p-4 backdrop-blur-xs">
      <section
        ref={dialog}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-management-title"
        className="review-management-dialog flex max-h-[90dvh] w-full max-w-[1040px] flex-col overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EAE4D7] px-5 py-4 bg-[#FAF8F5]">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F]">
              <MessageSquareQuote size={18} />
            </div>
            <div>
              <h2 id="review-management-title" className="text-base font-bold text-[#1A1612] m-0">
                Đánh giá khách hàng
              </h2>
            </div>
          </div>
          <button
            type="button"
            aria-label="Đóng quản lý đánh giá"
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-full border border-[#EAE4D7] bg-white text-[#7D715E] hover:text-[#1A1612] hover:bg-[#FAF8F5] transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body Content */}
        <div className="review-dialog-body overflow-y-auto p-4 sm:p-5 space-y-4">
          <ReviewManagementPanel admin={admin} />
        </div>
      </section>
    </div>
  );
}

export function ReviewManagementPanel({ admin = false, standalone = false }: { admin?: boolean; standalone?: boolean }) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError,setLoadError] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [visibility, setVisibility] = useState('ALL');
  const [search,setSearch] = useState('');
  const [action, setAction] = useState<{ id: string; kind: 'reply' | 'report' | 'resolve'; decision?: 'KEEP' | 'HIDE' } | null>(null);
  const [text, setText] = useState('');
  const [reason, setReason] = useState('ABUSE');
  const [evidence, setEvidence] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = unwrap(await api.get('/products/reviews/moderation'));
      if (!Array.isArray(data)) throw new Error('Không đọc được danh sách đánh giá.');
      setReviews(data);
    } catch (error: any) {
      setLoadError(error.message || 'Không tải được danh sách đánh giá');
      toast.error(error.message || 'Không tải được danh sách đánh giá');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const open = (id: string, kind: 'reply' | 'report' | 'resolve', decision?: 'KEEP' | 'HIDE') => {
    setAction({ id, kind, decision });
    setText('');
    setEvidence('');
    setReason('ABUSE');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!action || saving) return;
    setSaving(true);
    try {
      const body =
        action.kind === 'reply'
          ? { comment: text.trim() }
          : action.kind === 'report'
            ? { reason, details: text.trim(), evidence: evidence.split(/\n/).map((url) => url.trim()).filter(Boolean) }
            : { decision: action.decision, reason: text.trim() };
      const data = unwrap(await api.post(`/products/reviews/${action.id}/${action.kind}`, body));
      toast.success(data.message || 'Xử lý thành công');
      setAction(null);
      await load();
    } catch (error: any) {
      toast.error(error.message || 'Không xử lý được yêu cầu');
    } finally {
      setSaving(false);
    }
  };

  const pending = (review: any) => review.status === 'PENDING' || review.reports?.some((report: any) => !report.resolved);
  const countPending = reviews.filter(pending).length;
  const countUnreplied = reviews.filter(review => !review.reply).length;
  const countApproved = reviews.filter((r) => r.status === 'APPROVED').length;
  const countLow = reviews.filter((r) => r.rating <= 2).length;
  const countHidden = reviews.filter((r) => r.status === 'HIDDEN').length;

  const shown = reviews.filter((review) => {
    const term=search.trim().toLocaleLowerCase('vi');
    if(term && ![review.product?.title,review.customerName,review.comment].some(value=>String(value||'').toLocaleLowerCase('vi').includes(term)))return false;
    if (visibility !== 'ALL' && review.status !== visibility) return false;
    if (filter === 'ALL') return true;
    if (filter === 'PENDING') return admin ? pending(review) : !review.reply;
    if (filter === 'LOW') return review.rating <= 2;
    return review.status === filter;
  });

  // Calculate metrics
  const rated = reviews.filter(review => Number.isFinite(Number(review.rating)) && Number(review.rating)>=1 && Number(review.rating)<=5);
  const avgRating = rated.length > 0 ? (rated.reduce((sum,review)=>sum+Number(review.rating),0)/rated.length).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—';

  const filterTabs = [
    { key: 'ALL', label: 'Tất cả', count: reviews.length },
    { key: 'PENDING', label: admin ? 'Cần xử lý' : 'Chưa phản hồi', count: admin ? countPending : countUnreplied },
    { key: 'LOW', label: '1–2 sao', count: countLow },
  ];

  const hasMetrics = !loading && !(loadError && !reviews.length);
  const metrics = [
    { label: 'Điểm trung bình', value: avgRating, icon: Star, rating: true },
    { label: 'Tổng đánh giá', value: reviews.length, icon: MessageSquareQuote },
    { label: admin ? 'Cần xử lý' : 'Chưa phản hồi', value: admin ? countPending : countUnreplied, icon: Clock },
  ];
  const searchField = (
    <label className="flex h-10 min-w-0 items-center gap-2 rounded-lg border border-[#EAE4D7] bg-white px-3 text-[#B88E4F] focus-within:border-[#C59B58]">
      <Search size={16} aria-hidden="true" className="shrink-0" /><span className="sr-only">Tìm đánh giá</span>
      <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm sản phẩm, khách hàng, nội dung…" className="h-full min-w-0 flex-1 bg-transparent text-[13px] text-[#1A1612] outline-none" />
      {search && <button type="button" aria-label="Xóa tìm kiếm" onClick={() => setSearch('')} className="flex size-8 shrink-0 items-center justify-center rounded-md hover:bg-[#FBF5EB]"><X size={14} /></button>}
    </label>
  );

  return (
    <div className={`review-management space-y-4 text-left text-[#1A1612] ${standalone ? 'review-management-standalone' : ''}`}>
      <section aria-label="Tổng quan và bộ lọc đánh giá" className={standalone ? 'grid gap-3' : 'overflow-hidden rounded-xl border border-[#EAE4D7] bg-white'}>
        <dl className={`m-0 grid grid-cols-3 ${standalone ? 'gap-2 sm:gap-3' : 'divide-x divide-[#EAE4D7]'} ${admin && !standalone ? 'admin-stat-grid' : ''}`}>
          {metrics.map(({ label, value, icon: Icon, rating }) => (
            <div key={label} className={`flex min-w-0 flex-col justify-center gap-2 ${standalone ? 'min-h-[88px] rounded-xl border border-[#EAE4D7] bg-white px-2.5 py-2.5 sm:px-4' : 'min-h-20 px-3 py-3 sm:px-4'}`}>
              <dt className="flex min-w-0 items-center justify-between gap-1 text-xs leading-4 text-[#7D715E]">
                <span>{label}</span>
                {standalone && <span aria-hidden="true" className="hidden size-7 shrink-0 place-items-center rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F] sm:grid"><Icon size={15} /></span>}
              </dt>
              <dd className="m-0 flex items-baseline gap-1.5 text-xl font-bold leading-none tabular-nums sm:text-2xl">
                {rating && !standalone && <Star size={16} aria-hidden="true" className="hidden shrink-0 self-center text-[#B88E4F] sm:block" />}
                {hasMetrics ? value : '—'}
                {rating && <span className="whitespace-nowrap text-xs font-normal text-[#7D715E] sm:text-sm">/ 5</span>}
              </dd>
            </div>
          ))}
        </dl>
        <div className={`grid items-center gap-2 ${standalone ? 'rounded-xl border border-[#EAE4D7] bg-white p-2.5 sm:grid-cols-[minmax(0,1fr)_180px] xl:grid-cols-[minmax(220px,1fr)_minmax(300px,0.9fr)_180px]' : 'grid-cols-2 border-t border-[#EAE4D7] p-2 sm:grid-cols-[minmax(0,1fr)_180px] sm:px-3'}`}>
          {standalone && <div className="min-w-0 sm:col-span-2 xl:col-span-1">{searchField}</div>}
          <div role="group" aria-label="Bộ lọc đánh giá" className={`grid grid-cols-3 ${standalone ? 'gap-1.5' : 'col-span-2 divide-x divide-[#EAE4D7] sm:col-span-1'}`}>
            {filterTabs.map((tab) => (
              <div key={tab.key} className={standalone ? 'min-w-0' : 'min-w-0 px-1'}>
                <button type="button" onClick={() => setFilter(tab.key)} aria-pressed={filter === tab.key}
                  className={`flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-1 text-xs font-medium transition-colors sm:text-[13px] ${standalone ? 'min-h-10' : 'min-h-[38px]'} ${filter === tab.key ? 'border-[#EEDFC6] bg-[#FBF5EB] font-semibold text-[#805B27]' : `${standalone ? 'border-[#EAE4D7]' : 'border-transparent'} bg-white text-[#655A49] hover:bg-[#FAF8F5]`}`}>
                  <span>{tab.label}</span><span className="tabular-nums">{hasMetrics ? tab.count : '—'}</span>
                </button>
              </div>
            ))}
          </div>
          <div className={standalone ? 'min-w-0' : 'col-span-2 min-w-0 sm:col-span-1 sm:border-l sm:border-[#EAE4D7] sm:pl-3'}>
            <Select
              aria-label="Trạng thái hiển thị đánh giá"
              value={visibility}
              onChange={({ target }) => setVisibility(target.value)}
              options={[
                { value: 'ALL', label: 'Tất cả trạng thái' },
                { value: 'APPROVED', label: `Đang hiển thị (${countApproved})` },
                { value: 'HIDDEN', label: `Đã ẩn (${countHidden})` },
              ]}
              className={`min-h-0 w-full rounded-lg px-3 py-0 shadow-none sm:text-[13px] ${standalone ? 'h-10' : 'h-[38px]'}`}
              menuClassName="rounded-xl"
              align="right"
              portal
            />
          </div>
        </div>
        {!standalone && <div className="border-t border-[#EAE4D7] p-3">{searchField}</div>}
      </section>

      {/* Danh sách bài đánh giá */}
      {loading ? (
        <div className="py-12 text-center text-xs text-[#7D715E]">Đang tải dữ liệu đánh giá…</div>
      ) : loadError ? <div role="alert" className="review-empty">Không tải được đánh giá.<button type="button" onClick={()=>void load()}>Thử lại</button></div> : !shown.length ? (
        <div className="review-empty">
          <Star className="w-8 h-8 mx-auto text-[#C59B58]/40 stroke-1" />
          <h4 className="text-xs font-medium text-[#1A1612] m-0">{search || filter!=='ALL' || visibility !== 'ALL' ? 'Không có đánh giá phù hợp' : 'Chưa có đánh giá'}</h4>
        </div>
      ) : (
        <div className="review-list">
          {shown.map((review) => {
            const statusConfig = {
              APPROVED: { label: 'Đang công khai', bg: 'bg-[#FBF5EB]', text: 'text-[#805B27]', border: 'border-[#EEDFC6]' },
              PENDING: { label: 'Chờ duyệt', bg: 'bg-[#FAF8F5]', text: 'text-[#D97706]', border: 'border-[#EAE4D7]' },
              HIDDEN: { label: 'Đã ẩn vi phạm', bg: 'bg-[#FDF2F2]', text: 'text-[#DC2626]', border: 'border-[#F8D7DA]' },
              REJECTED: { label: 'Đã từ chối', bg: 'bg-[#FDF2F2]', text: 'text-[#DC2626]', border: 'border-[#F8D7DA]' },
            }[review.status as string] || { label: review.status, bg: 'bg-white', text: 'text-[#7D715E]', border: 'border-[#EAE4D7]' };

            return (
              <article key={review.id} className="review-row rounded-xl border border-[#EAE4D7] bg-white p-4 space-y-3 shadow-2xs">
                {/* Hàng thông tin khách + sản phẩm */}
                <div className="review-row-header flex items-start gap-3">
                  <img
                    src={getSafeProductImageUrl(review.product?.imageUrl, review.product?.title)} onError={handleProductImageError}
                    alt={review.product?.title || 'Sản phẩm'}
                    className="h-12 w-12 shrink-0 rounded-lg border border-[#EAE4D7] object-contain bg-[#FAF8F5]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-[#1A1612] truncate m-0">
                        {review.product?.title || 'Sản phẩm trực thuộc'}
                      </h4>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                        {statusConfig.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-[#7D715E]">
                      <span className="font-semibold text-[#1A1612]">{review.customerName || 'Khách hàng'}</span>
                      <span>·</span>
                      <span>{new Date(review.createdAt).toLocaleDateString('vi-VN')}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-0.5 text-[#B88E4F]">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <Star
                            size={12}
                            key={value}
                            className={value <= review.rating ? 'fill-[#C59B58] text-[#C59B58]' : 'text-[#EAE4D7]'}
                          />
                        ))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Nội dung nhận xét của khách */}
                <p className="review-comment text-xs sm:text-[13px] text-[#1A1612] whitespace-pre-wrap break-words leading-relaxed m-0">
                  {review.comment}
                </p>

                {/* Ảnh khách hàng đính kèm */}
                {review.images && review.images.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {review.images.slice(0, 5).map((url: string) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer">
                        <img
                          src={url}
                          alt="Ảnh khách hàng"
                          className="h-14 w-14 rounded-lg border border-[#EAE4D7] object-cover hover:opacity-90 transition"
                        />
                      </a>
                    ))}
                  </div>
                )}

                {/* Phản hồi từ Shop */}
                {review.reply && (
                  <div className="rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] p-3 text-xs space-y-1">
                    <strong className="block text-[#8F682E] font-bold">Phản hồi từ Nhãn hàng:</strong>
                    <p className="text-[#1A1612] m-0 leading-relaxed">{review.reply.comment}</p>
                  </div>
                )}

                {/* Báo cáo vi phạm đang chờ xử lý */}
                {review.reports?.map((report: any) => (
                  <div
                    key={report.id}
                    className="rounded-lg border border-[#F8D7DA] bg-[#FDF2F2] p-3 text-xs space-y-1"
                  >
                    <div className="flex items-center gap-1.5 text-[#DC2626] font-bold">
                      <AlertTriangle size={13} />
                      <span>{report.resolved ? 'Báo cáo đã xử lý' : 'Báo cáo vi phạm đang chờ sàn thẩm định'}</span>
                    </div>
                    <p className="text-[#1A1612] m-0">{report.details}</p>
                  </div>
                ))}

                {/* Hàng nút hành động */}
                <div className="review-actions flex items-center gap-2">
                  {review.status === 'APPROVED' && (review.product?.sku || review.product?.id || review.productId) && <a className="review-public-link" href={`/products/${encodeURIComponent(review.product?.sku || review.product?.id || review.productId)}?review=${encodeURIComponent(review.id)}#review-${encodeURIComponent(review.id)}`} target="_blank" rel="noreferrer">Xem tại sản phẩm<ExternalLink size={13}/></a>}
                  {admin ? (
                    <>
                      {(review.status !== 'APPROVED' || pending(review)) && <button
                        type="button"
                        onClick={() => open(review.id, 'resolve', 'KEEP')}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FBF5EB] border border-[#EEDFC6] text-[#8F682E] hover:bg-[#F3EFE6] transition cursor-pointer"
                      >
                        {review.status==='HIDDEN'?'Khôi phục':review.status==='APPROVED'?'Giữ công khai':'Duyệt công khai'}
                      </button>}
                      {review.status !== 'HIDDEN' && <button
                        type="button"
                        onClick={() => open(review.id, 'resolve', 'HIDE')}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#F8D7DA] text-[#DC2626] hover:bg-[#FDF2F2] transition cursor-pointer"
                      >
                        Ẩn đánh giá
                      </button>}
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => open(review.id, 'reply')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FBF5EB] border border-[#EEDFC6] text-[#8F682E] hover:bg-[#F3EFE6] transition cursor-pointer"
                      >
                        <Send size={12} />
                        <span>{review.reply ? 'Sửa phản hồi' : 'Trả lời khách hàng'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => open(review.id, 'report')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#EAE4D7] text-[#7D715E] hover:text-[#DC2626] hover:border-[#F8D7DA] transition cursor-pointer"
                      >
                        <Flag size={12} />
                        <span>Báo cáo vi phạm</span>
                      </button>
                    </>
                  )}
                </div>

                {/* Form thao tác phản hồi / báo cáo */}
                {action && action.id === review.id && (
                  <form onSubmit={submit} className="mt-3 space-y-3 rounded-xl bg-[#FAF8F5] p-3.5 border border-[#EAE4D7]">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-[#1A1612]">
                        {action.kind === 'reply'
                          ? 'Nội dung phản hồi công khai của Nhãn hàng'
                          : action.kind === 'report'
                            ? 'Lý do báo cáo vi phạm gửi Ban Quản Trị'
                            : action.decision === 'KEEP'
                              ? 'Lý do phê duyệt công khai đánh giá'
                              : 'Căn cứ ẩn nội dung vi phạm'}
                      </label>
                      <button
                        type="button"
                        onClick={() => setAction(null)}
                        className="text-xs text-[#7D715E] hover:text-[#1A1612]"
                      >
                        Đóng
                      </button>
                    </div>

                    {action.kind === 'report' && (
                      <select
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        className="w-full rounded-lg border border-[#EAE4D7] bg-white p-2 text-xs text-[#1A1612] outline-none"
                      >
                        {[
                          ['ABUSE', 'Xúc phạm, thóa mạ, ngôn từ không phù hợp'],
                          ['PERSONAL_DATA', 'Lộ thông tin cá nhân, số điện thoại, địa chỉ'],
                          ['SPAM', 'Spam, quảng cáo dịch vụ khác'],
                          ['FAKE', 'Nghi ngờ cạnh tranh không lành mạnh / đánh giá ảo'],
                          ['UNRELATED', 'Không liên quan đến chất lượng sản phẩm'],
                          ['OTHER', 'Vi phạm quy chế khác'],
                        ].map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    )}

                    {action.kind === 'reply' && (
                      <div className="flex flex-wrap gap-1.5 text-[11px]">
                        <span className="text-[#7D715E]">Mẫu nhanh:</span>
                        <button
                          type="button"
                          onClick={() =>
                            setText(
                              'Dạ cảm ơn quý khách đã tin tưởng và ủng hộ sản phẩm của Nhãn hàng. Chúc bạn luôn có trải nghiệm tuyệt vời ạ!'
                            )
                          }
                          className="px-2 py-0.5 rounded bg-white border border-[#EAE4D7] text-[#7D715E] hover:text-[#1A1612]"
                        >
                          Cảm ơn
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setText(
                              'Dạ Shop rất tiếc vì sự cố đóng gói làm móp hộp sản phẩm. Shop đã liên hệ qua tin nhắn để gửi tặng sản phẩm bù mới ngay hôm nay ạ!'
                            )
                          }
                          className="px-2 py-0.5 rounded bg-white border border-[#EAE4D7] text-[#7D715E] hover:text-[#1A1612]"
                        >
                          Hỗ trợ bù hàng
                        </button>
                      </div>
                    )}

                    <textarea
                      autoFocus
                      required
                      minLength={action.kind === 'reply' ? 3 : 10}
                      maxLength={action.kind === 'reply' ? 1000 : 2000}
                      value={text}
                      onChange={(event) => setText(event.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-[#EAE4D7] bg-white p-2.5 text-xs text-[#1A1612] outline-none focus:border-[#C59B58]"
                      placeholder={
                        action.kind === 'reply'
                          ? 'Nhập nội dung phản hồi lịch sự, nhã nhặn…'
                          : 'Mô tả cụ thể lý do kèm bằng chứng vi phạm…'
                      }
                    />

                    {action.kind === 'report' && (
                      <label className="block text-[11px] text-[#7D715E]">
                        Liên kết bằng chứng HTTPS (tối đa 3, mỗi dòng một liên kết):
                        <textarea
                          rows={2}
                          value={evidence}
                          onChange={(event) => setEvidence(event.target.value)}
                          className="mt-1 w-full rounded-lg border border-[#EAE4D7] bg-white p-2 text-xs"
                          placeholder="https://..."
                        />
                      </label>
                    )}

                    <div className="flex items-center gap-2 justify-end">
                      <button
                        disabled={saving}
                        type="button"
                        onClick={() => setAction(null)}
                        className="px-3 py-1.5 rounded-lg border border-[#EAE4D7] bg-white text-xs text-[#7D715E] hover:text-[#1A1612]"
                      >
                        Hủy
                      </button>
                      <button
                        disabled={saving}
                        type="submit"
                        className="px-4 py-1.5 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition shadow-2xs disabled:opacity-50"
                      >
                        {saving ? 'Đang gửi…' : 'Xác nhận gửi'}
                      </button>
                    </div>
                  </form>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
