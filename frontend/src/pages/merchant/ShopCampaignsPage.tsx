import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import api from '../../services/api';
import type { Campaign } from '../../types/campaigns';
import './CampaignsPage.css';

// ─── Helpers ─────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  INVITED: 'Đã mời', ACCEPTED: 'Đã tham gia', REJECTED: 'Từ chối',
};
const STATUS_COLOR: Record<string, string> = {
  INVITED: 'badge-pending', ACCEPTED: 'badge-approved', REJECTED: 'badge-rejected',
};
const fmtDate = (d: string) => format(new Date(d), 'dd/MM/yyyy', { locale: vi });
const isExpired = (endDate: string) => new Date(endDate) < new Date();

// ─── Create Campaign Modal ───────────────────────────────────────────────
function CreateCampaignModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ name: '', bonusCommissionRate: 5, startDate: '', endDate: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/campaigns', form);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Tạo chiến dịch thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cp-overlay" onClick={onClose}>
      <div className="cp-modal" onClick={e => e.stopPropagation()}>
        <div className="cp-modal-header">
          <h2>🎯 Tạo Chiến Dịch Mới</h2>
          <button className="cp-modal-close" onClick={onClose} id="btn-close-create-campaign">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="cp-modal-form">
          <div className="cp-form-group">
            <label>Tên chiến dịch</label>
            <input id="campaign-name" className="cp-input" placeholder="VD: Flash Sale Tháng 9 — KOL VIP" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="cp-form-group">
            <label>% Hoa hồng thưởng thêm</label>
            <div className="cp-input-addon">
              <input id="campaign-rate" className="cp-input" type="number" min={0} max={100} step={0.5} value={form.bonusCommissionRate} onChange={e => setForm(f => ({ ...f, bonusCommissionRate: +e.target.value }))} required />
              <span className="cp-addon-text">%</span>
            </div>
            <small>Mức hoa hồng thưởng thêm ngoài % mặc định của cửa hàng</small>
          </div>
          <div className="cp-form-row">
            <div className="cp-form-group">
              <label>Ngày bắt đầu</label>
              <input id="campaign-start" className="cp-input" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required />
            </div>
            <div className="cp-form-group">
              <label>Ngày kết thúc</label>
              <input id="campaign-end" className="cp-input" type="date" value={form.endDate} min={form.startDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} required />
            </div>
          </div>
          {error && <div className="cp-error">{error}</div>}
          <div className="cp-modal-actions">
            <button type="button" className="cp-btn cp-btn-outline" onClick={onClose}>Hủy</button>
            <button id="btn-create-campaign" type="submit" className="cp-btn cp-btn-primary" disabled={loading}>
              {loading ? '⏳ Đang tạo...' : '🚀 Tạo chiến dịch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Invite KOL Modal ────────────────────────────────────────────────────
function InviteKolModal({
  campaign, onClose, onSuccess,
}: { campaign: Campaign; onClose: () => void; onSuccess: () => void }) {
  const [collaboratorId, setCollaboratorId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post(`/campaigns/${campaign.id}/invite`, { collaboratorId: collaboratorId.trim() });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gửi lời mời thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cp-overlay" onClick={onClose}>
      <div className="cp-modal" onClick={e => e.stopPropagation()}>
        <div className="cp-modal-header">
          <h2>💌 Mời KOL/CTV Tham Gia</h2>
          <button className="cp-modal-close" onClick={onClose} id="btn-close-invite">✕</button>
        </div>

        <div className="cp-invite-campaign-info">
          <div className="cp-campaign-badge">🎯 {campaign.name}</div>
          <div className="cp-campaign-rate">+{campaign.bonusCommissionRate}% hoa hồng thưởng</div>
          <div className="cp-campaign-dates">{fmtDate(campaign.startDate)} → {fmtDate(campaign.endDate)}</div>
        </div>

        <form onSubmit={handleInvite} className="cp-modal-form">
          <div className="cp-form-group">
            <label>ID của KOL/CTV muốn mời</label>
            <input
              id="invite-collaborator-id"
              className="cp-input"
              placeholder="Dán UUID của KOL vào đây..."
              value={collaboratorId}
              onChange={e => setCollaboratorId(e.target.value)}
              required
            />
            <small>Thẻ mời VIP sẽ được gửi thẳng vào hộp chat của KOL này</small>
          </div>
          {error && <div className="cp-error">{error}</div>}
          <div className="cp-modal-actions">
            <button type="button" className="cp-btn cp-btn-outline" onClick={onClose}>Hủy</button>
            <button id="btn-send-invite" type="submit" className="cp-btn cp-btn-vip" disabled={loading || !collaboratorId.trim()}>
              {loading ? '⏳ Đang gửi...' : '💌 Gửi thẻ mời VIP'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Campaign Card (Shop side) ───────────────────────────────────────────
function CampaignCard({ campaign, onInvite }: { campaign: Campaign; onInvite: (c: Campaign) => void }) {
  const expired = isExpired(campaign.endDate);
  const accepted = campaign.participants?.filter(p => p.status === 'ACCEPTED').length || 0;
  const invited = campaign.participants?.filter(p => p.status === 'INVITED').length || 0;

  return (
    <div className={`cp-card ${expired ? 'expired' : ''}`} id={`campaign-${campaign.id}`}>
      <div className="cp-card-header">
        <div className="cp-card-title">
          <span className="cp-card-icon">🎯</span>
          <div>
            <div className="cp-card-name">{campaign.name}</div>
            <div className="cp-card-dates">{fmtDate(campaign.startDate)} → {fmtDate(campaign.endDate)}</div>
          </div>
        </div>
        <div className={`cp-status-tag ${expired ? 'ended' : 'active'}`}>
          {expired ? '🔴 Đã kết thúc' : '🟢 Đang chạy'}
        </div>
      </div>

      <div className="cp-card-body">
        <div className="cp-rate-badge">
          <span className="cp-rate-label">Hoa hồng thưởng</span>
          <span className="cp-rate-value">+{campaign.bonusCommissionRate}%</span>
        </div>

        <div className="cp-participants-row">
          <div className="cp-part-stat">
            <span>{accepted}</span>
            <small>Đã tham gia</small>
          </div>
          <div className="cp-part-stat pending">
            <span>{invited}</span>
            <small>Chờ phản hồi</small>
          </div>
        </div>

        {/* Danh sách KOL tham gia */}
        {(campaign.participants?.length || 0) > 0 && (
          <div className="cp-participants-list">
            {campaign.participants?.slice(0, 5).map(p => (
              <div key={p.id} className="cp-participant-row" id={`participant-${p.id}`}>
                <div className="cp-part-avatar">{p.collaborator?.fullName?.[0] || '?'}</div>
                <div className="cp-part-info">
                  <span className="cp-part-name">{p.collaborator?.fullName}</span>
                  <span className="cp-part-email">{p.collaborator?.email}</span>
                </div>
                <span className={`cp-badge ${STATUS_COLOR[p.status]}`}>{STATUS_LABEL[p.status]}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="cp-card-footer">
        <button
          id={`btn-invite-${campaign.id}`}
          className="cp-btn cp-btn-vip"
          onClick={() => onInvite(campaign)}
          disabled={expired}
        >
          💌 Mời KOL
        </button>
      </div>
    </div>
  );
}

// ─── Shop Campaigns Page ──────────────────────────────────────────────────
export default function ShopCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [inviteTarget, setInviteTarget] = useState<Campaign | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/campaigns/shop');
      setCampaigns(res.data || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="cp-page" id="shop-campaigns-page">
      {toast && <div className="cp-toast success" role="alert">{toast}</div>}

      <div className="cp-header">
        <div>
          <h1 className="cp-title"><span>🎯</span> Chiến Dịch Affiliate</h1>
          <p className="cp-subtitle">Tạo chiến dịch VIP và mời Top KOL tham gia nhận hoa hồng thưởng</p>
        </div>
        <button id="btn-new-campaign" className="cp-btn cp-btn-primary" onClick={() => setShowCreate(true)}>
          + Tạo chiến dịch
        </button>
      </div>

      {loading ? (
        <div className="cp-loading"><div className="cp-spinner" /><span>Đang tải...</span></div>
      ) : campaigns.length === 0 ? (
        <div className="cp-empty">
          <div className="cp-empty-icon">📋</div>
          <h3>Chưa có chiến dịch nào</h3>
          <p>Tạo chiến dịch đầu tiên để mời KOL tham gia và nhận hoa hồng thưởng</p>
          <button className="cp-btn cp-btn-primary" onClick={() => setShowCreate(true)}>+ Tạo ngay</button>
        </div>
      ) : (
        <div className="cp-grid">
          {campaigns.map(c => (
            <CampaignCard key={c.id} campaign={c} onInvite={target => { setInviteTarget(target); }} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateCampaignModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => { load(); showToast('✅ Đã tạo chiến dịch thành công!'); }}
        />
      )}
      {inviteTarget && (
        <InviteKolModal
          campaign={inviteTarget}
          onClose={() => setInviteTarget(null)}
          onSuccess={() => { load(); showToast('💌 Đã gửi thẻ mời VIP vào chat của KOL!'); }}
        />
      )}
    </div>
  );
}
