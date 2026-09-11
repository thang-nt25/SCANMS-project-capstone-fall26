import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import api from '../../services/api';
import type { CampaignParticipant } from '../../types/campaigns';
import './KolCampaignsPage.css';

const STATUS_LABEL: Record<string, string> = {
  INVITED: 'Chờ phản hồi', ACCEPTED: 'Đã tham gia', REJECTED: 'Đã từ chối',
};
const STATUS_COLOR: Record<string, string> = {
  INVITED: 'badge-pending', ACCEPTED: 'badge-approved', REJECTED: 'badge-rejected',
};
const STATUS_ICON: Record<string, string> = {
  INVITED: '💌', ACCEPTED: '✅', REJECTED: '❌',
};
const fmtDate = (d: string) => format(new Date(d), 'dd/MM/yyyy');

export default function KolCampaignsPage() {
  const [invitations, setInvitations] = useState<CampaignParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/campaigns/my-invitations');
      setInvitations(res.data || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAccept = async (participantId: string) => {
    setActionLoading(participantId + '-accept');
    try {
      await api.patch(`/campaigns/invitations/${participantId}/accept`, {});
      showToast('🎉 Đã chấp nhận tham gia chiến dịch!');
      load();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Thất bại', 'error');
    } finally { setActionLoading(null); }
  };

  const handleReject = async (participantId: string) => {
    if (!confirm('Bạn chắc chắn từ chối lời mời này?')) return;
    setActionLoading(participantId + '-reject');
    try {
      await api.patch(`/campaigns/invitations/${participantId}/reject`, {});
      showToast('Đã từ chối lời mời.');
      load();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Thất bại', 'error');
    } finally { setActionLoading(null); }
  };

  const pending = invitations.filter(i => i.status === 'INVITED');
  const others = invitations.filter(i => i.status !== 'INVITED');

  return (
    <div className="kc-page" id="kol-campaigns-page">
      {toast && <div className={`kc-toast ${toast.type}`} role="alert">{toast.msg}</div>}

      <div className="kc-header">
        <h1 className="kc-title"><span>💌</span> Chiến Dịch Được Mời</h1>
        <p className="kc-subtitle">Xem và phản hồi lời mời chiến dịch VIP từ các cửa hàng</p>
      </div>

      {/* Stats */}
      <div className="kc-stats">
        <div className="kc-stat-item">
          <span className="kc-stat-num">{pending.length}</span>
          <span className="kc-stat-label">⏳ Chờ phản hồi</span>
        </div>
        <div className="kc-stat-item accepted">
          <span className="kc-stat-num">{invitations.filter(i => i.status === 'ACCEPTED').length}</span>
          <span className="kc-stat-label">✅ Đang tham gia</span>
        </div>
        <div className="kc-stat-item total">
          <span className="kc-stat-num">{invitations.length}</span>
          <span className="kc-stat-label">📋 Tổng lời mời</span>
        </div>
      </div>

      {loading ? (
        <div className="kc-loading"><div className="kc-spinner" /><span>Đang tải...</span></div>
      ) : invitations.length === 0 ? (
        <div className="kc-empty">
          <div className="kc-empty-icon">📭</div>
          <h3>Chưa có lời mời nào</h3>
          <p>Khi cửa hàng mời bạn tham gia chiến dịch VIP, thẻ mời sẽ xuất hiện ở đây</p>
        </div>
      ) : (
        <>
          {/* Pending invitations */}
          {pending.length > 0 && (
            <section>
              <h2 className="kc-section-title">💌 Đang chờ phản hồi ({pending.length})</h2>
              <div className="kc-cards">
                {pending.map(inv => (
                  <div key={inv.id} className="kc-card vip" id={`invitation-${inv.id}`}>
                    <div className="kc-card-badge">🌟 VIP</div>
                    <div className="kc-card-store">
                      {inv.campaign?.store?.logoUrl ? (
                        <img src={inv.campaign.store.logoUrl} alt="" className="kc-store-logo" />
                      ) : (
                        <div className="kc-store-avatar">{inv.campaign?.store?.name?.[0] || '?'}</div>
                      )}
                      <div>
                        <div className="kc-store-name">{inv.campaign?.store?.name}</div>
                        <small className="kc-invite-label">gửi lời mời chiến dịch VIP</small>
                      </div>
                    </div>

                    <div className="kc-campaign-name">🎯 {inv.campaign?.name}</div>

                    <div className="kc-commission-highlight">
                      <div className="kc-commission-label">Hoa hồng thưởng thêm</div>
                      <div className="kc-commission-value">+{inv.campaign?.bonusCommissionRate}%</div>
                      <div className="kc-commission-sub">ngoài hoa hồng mặc định của cửa hàng</div>
                    </div>

                    <div className="kc-dates">
                      📅 {inv.campaign ? fmtDate(inv.campaign.startDate) : ''} → {inv.campaign ? fmtDate(inv.campaign.endDate) : ''}
                    </div>

                    <div className="kc-actions">
                      <button
                        id={`btn-accept-${inv.id}`}
                        className="kc-btn kc-btn-accept"
                        onClick={() => handleAccept(inv.id)}
                        disabled={!!actionLoading}
                      >
                        {actionLoading === inv.id + '-accept' ? '⏳' : '✅ Chấp nhận tham gia'}
                      </button>
                      <button
                        id={`btn-reject-${inv.id}`}
                        className="kc-btn kc-btn-reject"
                        onClick={() => handleReject(inv.id)}
                        disabled={!!actionLoading}
                      >
                        {actionLoading === inv.id + '-reject' ? '⏳' : '❌ Từ chối'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* History */}
          {others.length > 0 && (
            <section>
              <h2 className="kc-section-title">📋 Lịch sử lời mời</h2>
              <div className="kc-history-list">
                {others.map(inv => (
                  <div key={inv.id} className="kc-history-row" id={`history-${inv.id}`}>
                    <div className="kc-history-icon">{STATUS_ICON[inv.status]}</div>
                    <div className="kc-history-info">
                      <div className="kc-history-campaign">{inv.campaign?.name}</div>
                      <div className="kc-history-store">{inv.campaign?.store?.name} · +{inv.campaign?.bonusCommissionRate}%</div>
                    </div>
                    <span className={`kc-badge ${STATUS_COLOR[inv.status]}`}>{STATUS_LABEL[inv.status]}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
