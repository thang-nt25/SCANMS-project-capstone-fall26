import { useEffect, useRef, useState } from 'react';
import { Star, X, RotateCw, MessageSquareQuote, AlertTriangle, Send, Flag } from 'lucide-react';
import api from '@/services/api';
import { toast } from '@/utils/toast';
import { getSafeProductImageUrl } from '@/utils/marketplace.utils';

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
        className="flex max-h-[90dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EAE4D7] px-5 py-4 bg-[#FAF8F5]">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F]">
              <MessageSquareQuote size={18} />
            </div>
            <div>
              <h2 id="review-management-title" className="text-base font-bold text-[#1A1612] m-0">
                Quản lý Đánh giá Khách hàng
              </h2>
              <span className="text-xs text-[#7D715E]">
                {admin ? 'Kiểm duyệt đánh giá toàn hệ thống' : 'Theo dõi và phản hồi nhận xét của người mua'}
              </span>
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
        <div className="overflow-y-auto p-5 sm:p-6 space-y-5">
          <ReviewManagementPanel admin={admin} />
        </div>
      </section>
    </div>
  );
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
    try {
      const data = unwrap(await api.get('/products/reviews/moderation', { headers: { 'x-skip-cache': 'true' } }));
      setReviews(Array.isArray(data) ? data : []);
    } catch (error: any) {
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
  const countApproved = reviews.filter((r) => r.status === 'APPROVED').length;
  const countLow = reviews.filter((r) => r.rating <= 2).length;
  const countHidden = reviews.filter((r) => r.status === 'HIDDEN').length;

  const shown = reviews.filter((review) => {
    if (filter === 'ALL') return true;
    if (filter === 'PENDING') return pending(review);
    if (filter === 'LOW') return review.rating <= 2;
    return review.status === filter;
  });

  // Calculate metrics
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviews.length).toFixed(1)
    : '0.0';

  const filterTabs = [
    { key: 'ALL', label: 'Tất cả', count: reviews.length },
    { key: 'PENDING', label: 'Cần sàn xử lý', count: countPending },
    { key: 'APPROVED', label: 'Đang hiển thị', count: countApproved },
    { key: 'LOW', label: '1–2 sao', count: countLow },
    { key: 'HIDDEN', label: 'Đã ẩn', count: countHidden },
  ];

  return (
    <div className="space-y-4 text-left text-[#1A1612]">
      {/* 3 Thẻ chỉ số tổng quan nhanh */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white border border-[#EAE4D7] flex items-center justify-center text-[#B88E4F] font-bold text-sm shadow-2xs">
            ⭐
          </div>
          <div>
            <span className="text-[11px] text-[#7D715E] block">Điểm trung bình</span>
            <strong className="text-base font-bold text-[#1A1612]">{avgRating} / 5.0</strong>
          </div>
        </div>

        <div className="p-3 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white border border-[#EAE4D7] flex items-center justify-center text-[#B88E4F] font-bold text-sm shadow-2xs">
            💬
          </div>
          <div>
            <span className="text-[11px] text-[#7D715E] block">Tổng đánh giá</span>
            <strong className="text-base font-bold text-[#1A1612]">{reviews.length} nhận xét</strong>
          </div>
        </div>

        <div className="p-3 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white border border-[#EAE4D7] flex items-center justify-center text-[#D97706] font-bold text-sm shadow-2xs">
            ⚠️
          </div>
          <div>
            <span className="text-[11px] text-[#7D715E] block">Cần lưu ý / 1–2 sao</span>
            <strong className={`text-base font-bold ${countLow > 0 ? 'text-[#D97706]' : 'text-[#1A1612]'}`}>
              {countLow} đánh giá
            </strong>
          </div>
        </div>
      </div>

      {/* Toolbar: Bộ lọc tab bên trái + Nút Làm mới bên phải */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0" role="group" aria-label="Bộ lọc đánh giá">
          {filterTabs.map((tab) => {
            const isSelected = filter === tab.key;
            return (
              <button
                type="button"
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                  isSelected
                    ? 'bg-[#FBF5EB] border-[#C59B58] text-[#B88E4F] shadow-2xs'
                    : 'bg-white border-[#EAE4D7] text-[#7D715E] hover:text-[#1A1612] hover:bg-[#FAF8F5]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? 'bg-[#C59B58] text-white' : 'bg-[#EAE4D7]/70 text-[#7D715E]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#EAE4D7] bg-white text-xs font-semibold text-[#7D715E] hover:text-[#1A1612] hover:bg-[#FAF8F5] transition cursor-pointer self-end sm:self-auto shrink-0"
        >
          <RotateCw size={13} className={loading ? 'animate-spin text-[#B88E4F]' : ''} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Danh sách bài đánh giá */}
      {loading ? (
        <div className="py-12 text-center text-xs text-[#7D715E]">Đang tải dữ liệu đánh giá…</div>
      ) : !shown.length ? (
        <div className="py-12 text-center space-y-2 border border-dashed border-[#EAE4D7] rounded-xl bg-[#FAF8F5]/80">
          <Star className="w-8 h-8 mx-auto text-[#C59B58]/40 stroke-1" />
          <h4 className="text-xs font-bold text-[#1A1612] m-0">Chưa có đánh giá nào trong danh mục này</h4>
          <p className="text-[11px] text-[#7D715E] max-w-sm mx-auto m-0">
            Các đánh giá mới từ khách mua hàng hoặc khiếu nại chất lượng sẽ tự động hiển thị tại đây.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((review) => {
            const statusConfig = {
              APPROVED: { label: 'Đang công khai', bg: 'bg-[#FBF5EB]', text: 'text-[#059669]', border: 'border-[#EEDFC6]' },
              PENDING: { label: 'Chờ sàn duyệt', bg: 'bg-[#FAF8F5]', text: 'text-[#D97706]', border: 'border-[#EAE4D7]' },
              HIDDEN: { label: 'Đã ẩn vi phạm', bg: 'bg-[#FDF2F2]', text: 'text-[#DC2626]', border: 'border-[#F8D7DA]' },
              REJECTED: { label: 'Đã từ chối', bg: 'bg-[#FDF2F2]', text: 'text-[#DC2626]', border: 'border-[#F8D7DA]' },
            }[review.status as string] || { label: review.status, bg: 'bg-white', text: 'text-[#7D715E]', border: 'border-[#EAE4D7]' };

            return (
              <article key={review.id} className="rounded-xl border border-[#EAE4D7] bg-white p-4 space-y-3 shadow-2xs">
                {/* Hàng thông tin khách + sản phẩm */}
                <div className="flex items-start gap-3">
                  <img
                    src={getSafeProductImageUrl(review.product?.imageUrl, review.product?.title)}
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
                <p className="text-xs sm:text-[13px] text-[#1A1612] whitespace-pre-wrap break-words leading-relaxed m-0 bg-[#FAF8F5]/50 p-2.5 rounded-lg border border-[#EAE4D7]/60">
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
                <div className="flex items-center gap-2 pt-1 border-t border-[#EAE4D7]/60">
                  {admin ? (
                    <>
                      <button
                        type="button"
                        onClick={() => open(review.id, 'resolve', 'KEEP')}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FBF5EB] border border-[#EEDFC6] text-[#8F682E] hover:bg-[#F3EFE6] transition cursor-pointer"
                      >
                        Giữ / Duyệt công khai
                      </button>
                      <button
                        type="button"
                        onClick={() => open(review.id, 'resolve', 'HIDE')}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#F8D7DA] text-[#DC2626] hover:bg-[#FDF2F2] transition cursor-pointer"
                      >
                        Ẩn vi phạm
                      </button>
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
