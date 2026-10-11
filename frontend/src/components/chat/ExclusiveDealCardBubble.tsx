import { useState } from 'react';
import { Sparkles, ChevronDown, ExternalLink, Copy, Check, Clock3 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../services/api';
import './ExclusiveDealCardBubble.css';

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
    <article className={`deal-chat-card${compact ? ' is-compact' : ''}`}>
      <header className="deal-chat-header"><span className="deal-chat-icon"><Sparkles size={14} /></span><strong>Deal độc quyền</strong><span className={`deal-chat-status${rejected ? ' is-rejected' : ''}`}>{approved ? <Check size={11} /> : !rejected ? <Clock3 size={11} /> : null}{approved ? 'Đã duyệt' : rejected ? 'Đã từ chối' : 'Chờ duyệt'}</span></header>
      <div className="deal-chat-content">
        <h3>{card.productTitle || 'Sản phẩm'}</h3>
        {card.storeName && <p className="deal-chat-store">Gian hàng <strong>{card.storeName}</strong></p>}
        {(card.publicCommissionRate != null || rate != null) && <div className="deal-chat-rates"><div><span>Hoa hồng sàn</span><strong>{card.publicCommissionRate ?? '—'}<small>%</small></strong></div><div><span>Hoa hồng độc quyền</span><strong>{rate ?? '—'}<small>%</small></strong></div></div>}
        {card.isRevision && card.currentCommissionRate != null && <p className="deal-chat-revision">Mức đang áp dụng <strong>{card.currentCommissionRate}%</strong></p>}
        {!isDecision && status === 'PENDING' && card.isRevision && <p className="deal-chat-note">{isMine ? 'Mức hiện tại vẫn áp dụng trong lúc gian hàng xem xét đề xuất.' : 'Mức mới áp dụng cho đơn hàng mới sau khi duyệt. Đơn đã tạo giữ nguyên mức cũ.'}</p>}
        {isDecision && card.message && <details className="deal-chat-details"><summary>Chi tiết phản hồi<ChevronDown size={13} /></summary><p>{card.message}</p></details>}
        {card.salesCommitment && <details className="deal-chat-details"><summary>Cam kết doanh số<ChevronDown size={13} /></summary><p>{card.salesCommitment}</p></details>}
        {card.shopResponse && <details className="deal-chat-details"><summary>Phản hồi gian hàng<ChevronDown size={13} /></summary><p>{card.shopResponse}</p></details>}
        {error && <p className="deal-chat-error" role="alert">{error}</p>}
      </div>
      {(canReview || (approved && linkUrl) || (!isDecision && isMine && status === 'PENDING')) && <footer className="deal-chat-footer">
        {approved && linkUrl && <div className="deal-chat-link"><a href={linkUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} /><span>Link tiếp thị độc quyền</span></a><button type="button" onClick={() => void copyLink()} title={copied ? 'Đã sao chép' : 'Sao chép link tiếp thị'} aria-label={copied ? 'Đã sao chép link' : 'Sao chép link tiếp thị'}>{copied ? <Check size={14} /> : <Copy size={14} />}</button></div>}
        {canReview && <div className="deal-chat-actions"><button type="button" disabled={loading} onClick={() => void decide(false)}>Từ chối</button><button type="button" disabled={loading} onClick={() => void decide(true)}>{loading ? 'Đang xử lý…' : card.isRevision ? 'Duyệt đổi deal' : 'Duyệt & tạo link'}</button></div>}
        {!isDecision && isMine && status === 'PENDING' && <p className="deal-chat-pending"><Clock3 size={13} />Đã gửi · Chờ gian hàng phản hồi</p>}
      </footer>}
    </article>
  );
}
