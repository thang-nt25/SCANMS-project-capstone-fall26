import { useState } from 'react';
import { Sparkles, ChevronDown, ExternalLink, Copy, Check, Clock3 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../services/api';

export function ExclusiveDealCardBubble({ card, isMine, isShop, compact = false }: { card: any; isMine: boolean; isShop: boolean; compact?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [decision, setDecision] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState<string | null>(card.shortUrl || null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const status = decision || card.status;
  const isDecision = card.type === 'EXCLUSIVE_DEAL_DECISION';
  const approved = status === 'APPROVED';
  const rejected = status === 'REJECTED';
  const rate = card.approvedCommissionRate ?? card.proposedCommissionRate;
  const canReview = !isDecision && status === 'PENDING' && isShop && !isMine;

  const decide = async (approve: boolean) => {
    if (!card.proposalId || loading) return;
    setLoading(true);
    setError(null);
    try {
      const response: any = await api.patch(`/affiliate-deals/${card.proposalId}/${approve ? 'approve' : 'reject'}`, approve ? {} : { reason: '' });
      const result = response?.data?.data || response?.data || response;
      setDecision(approve ? 'APPROVED' : 'REJECTED');
      if (result?.shortUrl) setLinkUrl(result.shortUrl);
      toast.success(approve ? 'Đã duyệt deal và tạo link VIP.' : 'Đã từ chối đề xuất deal.');
    } catch (actionError: any) {
      setError(actionError?.response?.data?.message || 'Không thể xử lý đề xuất lúc này.');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!linkUrl) return;
    try {
      await navigator.clipboard.writeText(linkUrl);
      setCopied(true);
      toast.success('Đã sao chép link tiếp thị độc quyền!');
    } catch {
      toast.error('Không sao chép được link. Vui lòng thử lại.');
    }
  };

  return (
    <article className={`${compact ? 'w-72' : 'w-80'} max-w-[min(100%,calc(100vw-48px))] overflow-hidden border border-[#EAE4D7] rounded-xl bg-white text-[#1A1612] text-left shadow-[0_2px_8px_rgba(35,29,21,0.02)]`}>
      <header className="flex items-center gap-1.5 px-3 py-2.5 border-b border-[#EAE4D7] bg-white">
        <span className="w-6 h-6 grid place-items-center shrink-0 rounded-[7px] bg-[#FBF5EB] text-[#B88E4F]"><Sparkles size={14} /></span>
        <strong className="text-xs font-semibold text-[#1A1612]">Deal độc quyền</strong>
        <span className={`inline-flex items-center gap-1 shrink-0 ml-auto px-1.5 py-1 border rounded-md text-[9px] leading-tight font-medium ${rejected ? 'bg-white border-[#EAE4D7] text-[#7D715E]' : 'border-[#EEDFC6] bg-[#FBF5EB] text-[#8C6226]'}`}>
          {approved ? <Check size={11} className="text-[#059669]" /> : !rejected ? <Clock3 size={11} className="text-[#B88E4F]" /> : null}
          {approved ? 'Đã duyệt' : rejected ? 'Đã từ chối' : 'Chờ duyệt'}
        </span>
      </header>
      <div className="p-2.5 sm:px-3">
        <h3 className="m-0 text-xs leading-relaxed font-semibold break-words text-[#1A1612]">{card.productTitle || 'Sản phẩm'}</h3>
        {card.storeName && <p className="m-0 mt-1 text-[#7D715E] text-[10px] leading-relaxed break-words">Gian hàng <strong className="ml-1 text-[#1A1612] font-normal">{card.storeName}</strong></p>}
        {(card.publicCommissionRate != null || rate != null) && (
          <div className="grid grid-cols-2 mt-2.5 p-2 px-2.5 rounded-lg bg-[#FBF5EB]">
            <div>
              <span className="text-[#7D715E] text-[10px]">Hoa hồng sàn</span>
              <strong className="block mt-0.5 text-xl leading-tight font-semibold tabular-nums text-[#1A1612]">{card.publicCommissionRate ?? '—'}<small className="text-[13px] ml-0.5 font-normal">%</small></strong>
            </div>
            <div className="pl-3 border-l border-[#EEDFC6]">
              <span className="text-[#8C6226] text-[10px]">Hoa hồng độc quyền</span>
              <strong className="block mt-0.5 text-xl leading-tight font-semibold tabular-nums text-[#B88E4F]">{rate ?? '—'}<small className="text-[13px] ml-0.5 font-normal">%</small></strong>
            </div>
          </div>
        )}
        {card.isRevision && card.currentCommissionRate != null && <p className="mt-2 text-[#7D715E] text-[10px] leading-relaxed">Mức đang áp dụng <strong className="ml-1 text-[#1A1612] font-medium">{card.currentCommissionRate}%</strong></p>}
        {!isDecision && status === 'PENDING' && card.isRevision && <p className="mt-2 text-[#7D715E] text-[10px] leading-relaxed">{isMine ? 'Mức hiện tại vẫn áp dụng trong lúc gian hàng xem xét đề xuất.' : 'Mức mới áp dụng cho đơn hàng mới sau khi duyệt. Đơn đã tạo giữ nguyên mức cũ.'}</p>}
        {isDecision && card.message && (
          <details className="mt-2 bg-white text-xs group">
            <summary className="flex items-center justify-between gap-2 py-1 list-none text-[#7D715E] text-[10px] cursor-pointer hover:text-[#1A1612] hover:bg-[#FAF8F5] rounded-md transition-colors select-none">
              Chi tiết phản hồi<ChevronDown size={13} className="group-open:rotate-180 transition-transform text-[#B88E4F]" />
            </summary>
            <p className="m-0 mt-1 pb-1 text-[11px] leading-relaxed whitespace-pre-wrap break-words text-[#7D715E]">{card.message}</p>
          </details>
        )}
        {card.salesCommitment && (
          <details className="mt-2 bg-white text-xs group">
            <summary className="flex items-center justify-between gap-2 py-1 list-none text-[#7D715E] text-[10px] cursor-pointer hover:text-[#1A1612] hover:bg-[#FAF8F5] rounded-md transition-colors select-none">
              Cam kết doanh số<ChevronDown size={13} className="group-open:rotate-180 transition-transform text-[#B88E4F]" />
            </summary>
            <p className="m-0 mt-1 pb-1 text-[11px] leading-relaxed whitespace-pre-wrap break-words text-[#7D715E]">{card.salesCommitment}</p>
          </details>
        )}
        {card.shopResponse && (
          <details className="mt-2 bg-white text-xs group">
            <summary className="flex items-center justify-between gap-2 py-1 list-none text-[#7D715E] text-[10px] cursor-pointer hover:text-[#1A1612] hover:bg-[#FAF8F5] rounded-md transition-colors select-none">
              Phản hồi gian hàng<ChevronDown size={13} className="group-open:rotate-180 transition-transform text-[#B88E4F]" />
            </summary>
            <p className="m-0 mt-1 pb-1 text-[11px] leading-relaxed whitespace-pre-wrap break-words text-[#7D715E]">{card.shopResponse}</p>
          </details>
        )}
        {error && <p className="mt-2 text-[11px] leading-relaxed text-[#DC2626]" role="alert">{error}</p>}
      </div>
      {(canReview || (approved && linkUrl) || (!isDecision && isMine && status === 'PENDING')) && (
        <footer className="px-3 py-2 border-t border-[#EAE4D7] bg-white">
          {approved && linkUrl && (
            <div className="flex items-center gap-2">
              <a href={linkUrl} target="_blank" rel="noreferrer" className="flex flex-1 items-center gap-2 min-w-0 text-[#1A1612] text-[11px] font-medium no-underline hover:underline">
                <ExternalLink size={14} className="text-[#B88E4F] shrink-0" /><span>Link tiếp thị độc quyền</span>
              </a>
              <button type="button" onClick={() => void copyLink()} title={copied ? 'Đã sao chép' : 'Sao chép link tiếp thị'} aria-label={copied ? 'Đã sao chép link' : 'Sao chép link tiếp thị'} className="grid place-items-center w-8 h-8 border border-[#EAE4D7] rounded-lg bg-white text-[#7D715E] hover:text-[#8C6226] hover:border-[#C59B58] transition-colors cursor-pointer">
                {copied ? <Check size={14} className="text-[#059669]" /> : <Copy size={14} />}
              </button>
            </div>
          )}
          {canReview && (
            <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-2">
              <button type="button" disabled={loading} onClick={() => void decide(false)} className="min-h-[32px] px-2 py-1.5 border border-[#EAE4D7] rounded-lg bg-white text-[#7D715E] text-[11px] font-medium hover:bg-[#F3EFE6] cursor-pointer disabled:opacity-50">Từ chối</button>
              <button type="button" disabled={loading} onClick={() => void decide(true)} className="min-h-[32px] px-2 py-1.5 border border-[#EEDFC6] rounded-lg bg-[#FBF5EB] text-[#1A1612] text-[11px] font-semibold hover:bg-[#F3EFE6] cursor-pointer disabled:opacity-50">{loading ? 'Đang xử lý…' : card.isRevision ? 'Duyệt đổi deal' : 'Duyệt & tạo link'}</button>
            </div>
          )}
          {!isDecision && isMine && status === 'PENDING' && <p className="flex items-center gap-1.5 m-0 text-[10px] text-[#7D715E]"><Clock3 size={13} className="text-[#B88E4F] shrink-0" />Đã gửi · Chờ gian hàng phản hồi</p>}
        </footer>
      )}
    </article>
  );
}
