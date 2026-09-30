import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2, MessageSquare, Sparkles, X } from 'lucide-react';
import { referralLinksService } from '../../services/referral-links.service';

export interface ExclusiveDealInboxProps {
  onChat?: (item: any) => void;
}

export function ExclusiveDealInbox({ onChat }: ExclusiveDealInboxProps = {}) {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await referralLinksService.getShopExclusiveDeals());
    } catch (error: any) {
      setFeedback(error?.response?.data?.message || 'Không thể tải đề xuất deal.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const decide = async (id: string, approve: boolean) => {
    setBusyId(id);
    setFeedback('');
    try {
      if (approve) await referralLinksService.approveExclusiveDeal(id);
      else await referralLinksService.rejectExclusiveDeal(id);
      setFeedback(approve ? 'Đã duyệt. Link VIP đã được tạo và gửi cho KOL trong Chat.' : 'Đã từ chối và gửi phản hồi trong Chat.');
      await load();
    } catch (error: any) {
      setFeedback(error?.response?.data?.message || 'Không thể xử lý đề xuất.');
    } finally {
      setBusyId(null);
    }
  };

  const handleChat = (e: React.MouseEvent, item: any) => {
    e.preventDefault();
    if (onChat) {
      onChat(item);
      return;
    }
    const chatInput = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
      'input[placeholder*="Nhập tin nhắn"], textarea[placeholder*="Nhập tin nhắn"], #embedded-chat-input'
    );
    if (chatInput) {
      chatInput.focus();
      chatInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    const kolId = item.collaboratorId || item.collaborator?.id || item.collaborator?.userId;
    if (kolId) {
      navigate(`/merchant/kol-hub?tab=messages&kol=${kolId}`);
    } else {
      navigate('/merchant/kol-hub?tab=messages');
    }
  };

  const pendingCount = items.filter((item) => item.status === 'PENDING').length;

  return (
    <section className="rounded-2xl border border-[#EAE4D7] bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-base font-extrabold text-[#1A1612]"><Sparkles className="h-4 w-4 text-[#B88E4F]" /> Đề xuất Exclusive Deal</h2>
          <p className="mt-0.5 text-xs text-[#7D715E]">KOL đề xuất mức hoa hồng độc quyền và cam kết doanh số.</p>
        </div>
        <span className="rounded-full border border-[#EEDFC6] bg-[#FBF5EB] px-2.5 py-1 text-xs font-bold text-[#B88E4F]">{pendingCount} đang chờ</span>
      </div>

      {feedback && <div role="status" className="mt-2 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-3 py-1.5 text-xs text-[#7D715E]">{feedback}</div>}
      {loading ? (
        <div className="mt-2 flex items-center justify-center gap-2 py-4 text-sm text-[#7D715E]"><Loader2 className="h-4 w-4 animate-spin" /> Đang tải...</div>
      ) : items.length === 0 ? (
        <div className="mt-2 rounded-xl border border-dashed border-[#EAE4D7] bg-[#FAF8F5] p-3 text-center text-xs text-[#7D715E]">Chưa có đề xuất Exclusive Deal nào.</div>
      ) : (
        <div className="mt-2 grid gap-2">
          {items.map((item) => (
            <article key={item.id} className="rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-extrabold text-[#1A1612]">{item.product?.title || 'Sản phẩm'}</div>
                  <div className="truncate text-xs text-[#7D715E]">Đề xuất bởi <strong>{item.collaborator?.fullName || 'KOL'}</strong> · {item.store?.name}</div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${item.status === 'APPROVED' ? 'bg-[#FBF5EB] text-[#B88E4F]' : item.status === 'REJECTED' ? 'bg-rose-50 text-rose-700' : 'bg-[#F3EFE6] text-[#7D715E]'}`}>
                  {item.status === 'APPROVED' ? (item.isCurrentDeal ? 'Đang áp dụng' : 'Deal cũ') : item.status === 'REJECTED' ? 'Đã từ chối' : 'Chờ duyệt'}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-lg border border-[#EAE4D7] bg-white px-2 py-1 text-[#7D715E]">Hoa hồng sàn <strong className="ml-1 text-[#1A1612]">{item.publicCommissionRate ?? '—'}%</strong></span>
                <span className="rounded-lg border border-[#EEDFC6] bg-white px-2 py-1 text-[#7D715E]">Hoa hồng độc quyền <strong className="ml-1 text-[#B88E4F]">{item.proposedCommissionRate}%</strong></span>
                {item.status === 'PENDING' && item.currentCommissionRate != null && (
                  <span className="rounded-lg border border-[#EEDFC6] bg-white px-2 py-1 text-[#7D715E]">Đang áp dụng <strong className="ml-1 text-[#B88E4F]">{item.currentCommissionRate}%</strong></span>
                )}
                <span className="max-w-full truncate text-[#7D715E] sm:max-w-[260px]" title={item.salesCommitment}>Cam kết: <strong className="text-[#1A1612]">{item.salesCommitment}</strong></span>
              {item.status === 'APPROVED' && item.referralLink?.shortCode && (
                  <span className="break-all font-semibold text-[#B88E4F]">Link độc quyền: /r/{item.referralLink.shortCode}</span>
              )}
              {item.status === 'PENDING' && (
                  <span className="ml-auto flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => handleChat(e, item)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#EAE4D7] bg-white px-2 py-1.5 text-[11px] font-bold text-[#7D715E] hover:bg-[#F3EFE6] hover:text-[#1A1612] transition cursor-pointer"
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Chat
                    </button>
                    <button type="button" onClick={() => void decide(item.id, false)} disabled={busyId === item.id} className="inline-flex items-center gap-1 rounded-lg border border-[#EAE4D7] bg-white px-2 py-1.5 text-[11px] font-bold text-[#7D715E] hover:bg-[#F3EFE6] disabled:opacity-50"><X className="h-3.5 w-3.5" /> Từ chối</button>
                    <button type="button" onClick={() => void decide(item.id, true)} disabled={busyId === item.id} className="inline-flex items-center gap-1 rounded-lg bg-[#C59B58] px-2 py-1.5 text-[11px] font-bold text-white hover:bg-[#B88E4F] disabled:opacity-50">{busyId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Duyệt & tạo link</button>
                  </span>
              )}
              </div>
              {item.status === 'PENDING' && item.currentCommissionRate != null && (
                <p className="mt-2 text-[11px] leading-relaxed text-[#7D715E]">Mức hiện tại vẫn áp dụng cho đến khi bạn duyệt đề xuất mới. Đơn đã tạo giữ nguyên mức hoa hồng cũ.</p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
