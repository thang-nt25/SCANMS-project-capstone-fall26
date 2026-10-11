import { useState } from 'react';
import { Crown, Gift, CheckCircle2, XCircle, Clock3, CalendarDays } from 'lucide-react';
import api from '../../services/api';
import './CampaignCardBubble.css';

function campaignDate(value?: string) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return { date: 'Chưa xác định', time: '' };
  const date = new Date(value);
  return {
    date: date.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' }),
    time: date.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false }),
  };
}

export function CampaignCardBubble({ card, isMine, participantId, onRespond }: {
  card: any;
  isMine: boolean;
  participantId?: string;
  onRespond?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [statusOverride, setStatusOverride] = useState<'ACCEPTED' | 'REJECTED' | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const effectiveParticipantId = participantId || card.participantId;

  const respond = async (decision: 'ACCEPTED' | 'REJECTED') => {
    if (!effectiveParticipantId) {
      setFeedbackError('Không tìm thấy mã định danh lời mời.');
      return;
    }
    setLoading(true);
    setFeedbackError(null);
    try {
      await api.patch(`/campaigns/invitations/${effectiveParticipantId}/${decision === 'ACCEPTED' ? 'accept' : 'reject'}`, {});
      setStatusOverride(decision);
      onRespond?.();
    } catch (error: any) {
      setFeedbackError(error?.response?.data?.message || 'Không thể phản hồi lời mời lúc này.');
    } finally {
      setLoading(false);
    }
  };

  const status = statusOverride || (card.type === 'CAMPAIGN_ACCEPTED' ? 'ACCEPTED' : card.type === 'CAMPAIGN_REJECTED' ? 'REJECTED' : 'PENDING');
  const isExpired = !!card.endDate && new Date(card.endDate) < new Date();
  const start = campaignDate(card.startDate);
  const end = campaignDate(card.endDate);

  if (status !== 'PENDING') return (
    <div className={`vip-chat-response ${status === 'ACCEPTED' ? 'is-accepted' : 'is-rejected'}`} role="status">
      {status === 'ACCEPTED' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
      <div><strong>{status === 'ACCEPTED' ? 'Đã chấp nhận chiến dịch' : 'Đã từ chối chiến dịch'}</strong><p>{card.campaignName}</p><span>{status === 'ACCEPTED' ? 'Hoa hồng thưởng thêm đã được kích hoạt.' : 'Phản hồi đã được gửi tới đối tác.'}</span></div>
    </div>
  );

  return (
    <div className="vip-chat-card">
      <header className="vip-chat-card-header"><span className="vip-chat-crown"><Crown size={18} /></span><div><span>Lời mời hợp tác</span><strong>Chiến dịch VIP</strong></div><span className="vip-chat-tag">VIP</span></header>
      <div className="vip-chat-card-body">
        <h3>{card.campaignName}</h3>
        {card.storeName && <p className="vip-chat-store">Gian hàng <strong>{card.storeName}</strong></p>}
        <div className="vip-chat-bonus"><span><Gift size={16} /><span>Hoa hồng thưởng thêm<small>Cộng vào hoa hồng sản phẩm</small></span></span><strong>+{card.bonusCommissionRate}<small>%</small></strong></div>
        {card.personalMessage && <blockquote className="vip-chat-note">{card.personalMessage}</blockquote>}
        <div className="vip-chat-period"><div><span><CalendarDays size={12} />Bắt đầu</span><strong>{start.date}</strong><small>{start.time}</small></div><div><span>Kết thúc</span><strong>{end.date}</strong><small>{end.time}</small></div></div>
        {feedbackError && <p className="vip-chat-error" role="alert">{feedbackError}</p>}
      </div>
      <footer className="vip-chat-card-footer">
        {isExpired ? <div className="vip-chat-status"><Clock3 size={13} /><span>Chiến dịch đã kết thúc</span></div> : isMine ? <div className="vip-chat-status"><Clock3 size={13} /><span>Đã gửi lời mời<small>Đang chờ đối tác phản hồi</small></span></div> : <div className="vip-chat-actions"><button type="button" id={`btn-reject-campaign-${card.campaignId}`} disabled={loading} onClick={() => void respond('REJECTED')}>Từ chối</button><button type="button" id={`btn-accept-campaign-${card.campaignId}`} disabled={loading} onClick={() => void respond('ACCEPTED')}>{loading ? 'Đang xử lý…' : 'Chấp nhận lời mời'}</button></div>}
      </footer>
    </div>
  );
}
