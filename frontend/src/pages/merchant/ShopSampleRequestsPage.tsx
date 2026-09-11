import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import api from '../../services/api';
import type { SampleRequest, SampleRequestStatus, ShopStats } from '../../types/samples';
import './ShopSampleRequestsPage.css';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  SHIPPED: 'Đã giao hàng',
  DELIVERED: 'Đã nhận',
  COMPLETED: 'Hoàn thành (Đã lên bài)',
  REJECTED: 'Đã từ chối',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'badge-pending',
  APPROVED: 'badge-approved',
  SHIPPED: 'badge-shipped',
  DELIVERED: 'badge-delivered',
  COMPLETED: 'badge-completed',
  REJECTED: 'badge-rejected',
};

const STATUS_ICON: Record<string, string> = {
  PENDING: '⏳',
  APPROVED: '✅',
  SHIPPED: '🚚',
  DELIVERED: '📦',
  COMPLETED: '🎉',
  REJECTED: '❌',
};

function formatDate(d: string) {
  if (!d) return '—';
  return format(new Date(d), 'dd/MM/yyyy HH:mm');
}

// ─── Tracking Number Modal ───────────────────────────────────────────────
function TrackingModal({
  request,
  onClose,
  onSuccess,
}: {
  request: SampleRequest;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('GHTK');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber.trim()) return;
    setLoading(true);
    setError('');
    try {
      await api.patch(`/sample-requests/${request.id}/ship`, { trackingNumber: trackingNumber.trim(), carrier });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Cập nhật thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sr-modal-overlay" onClick={onClose}>
      <div className="sr-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="sr-modal-header">
          <h2>🚚 Nhập Mã Vận Đơn</h2>
          <button className="sr-modal-close" onClick={onClose} id="btn-close-tracking-modal">✕</button>
        </div>

        <div className="sr-modal-info">
          <strong>{request.collaborator.fullName}</strong> — {request.product.title}
          <br />
          <small>📍 {request.shippingAddress}</small>
        </div>

        <form onSubmit={handleSubmit} className="sr-modal-form">
          <div className="sr-form-group">
            <label htmlFor="sr-carrier">Đơn vị vận chuyển</label>
            <select
              id="sr-carrier"
              className="sr-input"
              value={carrier}
              onChange={e => setCarrier(e.target.value)}
            >
              <option value="GHTK">GHTK — Giao Hàng Tiết Kiệm</option>
              <option value="GHN">GHN — Giao Hàng Nhanh</option>
              <option value="VNPOST">VN Post</option>
              <option value="VIETTELPOST">Viettel Post</option>
              <option value="OTHER">Khác</option>
            </select>
          </div>

          <div className="sr-form-group">
            <label htmlFor="sr-tracking-number">Mã vận đơn</label>
            <input
              id="sr-tracking-number"
              type="text"
              className="sr-input"
              placeholder="VD: GHTK123456789 hoặc GHN987654321"
              value={trackingNumber}
              onChange={e => setTrackingNumber(e.target.value.toUpperCase())}
              required
            />
          </div>

          {error && <div className="sr-error">{error}</div>}

          <div className="sr-modal-actions">
            <button type="button" className="sr-btn sr-btn-outline" onClick={onClose}>Hủy</button>
            <button
              type="submit"
              id="btn-confirm-ship"
              className="sr-btn sr-btn-ship"
              disabled={loading || !trackingNumber.trim()}
            >
              {loading ? '⏳ Đang lưu...' : '🚚 Xác nhận giao hàng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Shop Page ────────────────────────────────────────────────────────────
export default function ShopSampleRequestsPage() {
  const [requests, setRequests] = useState<SampleRequest[]>([]);
  const [stats, setStats] = useState<ShopStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<SampleRequestStatus | 'ALL'>('ALL');
  const [shippingTarget, setShippingTarget] = useState<SampleRequest | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [reqRes, statsRes]: any[] = await Promise.all([
        api.get('/sample-requests/shop'),
        api.get('/sample-requests/shop/stats'),
      ]);
      setRequests(reqRes.data || []);
      setStats(statsRes.data || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleApprove = async (id: string) => {
    setActionLoading(id + '-approve');
    try {
      await api.patch(`/sample-requests/${id}/approve`, {});
      showToast('✅ Đã duyệt yêu cầu xin mẫu');
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Bạn chắc chắn muốn từ chối yêu cầu này?')) return;
    setActionLoading(id + '-reject');
    try {
      await api.patch(`/sample-requests/${id}/reject`, {});
      showToast('❌ Đã từ chối yêu cầu xin mẫu');
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = filterStatus === 'ALL'
    ? requests
    : requests.filter(r => r.status === filterStatus);

  return (
    <div className="sr-page" id="shop-sample-requests-page">
      {/* Toast */}
      {toast && (
        <div className={`sr-toast ${toast.type}`} role="alert">
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="sr-header">
        <div className="sr-header-left">
          <h1 className="sr-title">
            <span>📋</span> Quản Lý Yêu Cầu Mẫu
          </h1>
          <p className="sr-subtitle">Duyệt, từ chối và nhập mã vận đơn cho KOL/CTV</p>
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="sr-stats-grid">
          <div className="sr-stat-card pending">
            <div className="sr-stat-icon">⏳</div>
            <div className="sr-stat-value">{stats.pending}</div>
            <div className="sr-stat-label">Chờ duyệt</div>
          </div>
          <div className="sr-stat-card approved">
            <div className="sr-stat-icon">✅</div>
            <div className="sr-stat-value">{stats.approved}</div>
            <div className="sr-stat-label">Đã duyệt</div>
          </div>
          <div className="sr-stat-card shipped">
            <div className="sr-stat-icon">🚚</div>
            <div className="sr-stat-value">{stats.shipped}</div>
            <div className="sr-stat-label">Đang giao</div>
          </div>
          <div className="sr-stat-card rejected">
            <div className="sr-stat-icon">❌</div>
            <div className="sr-stat-value">{stats.rejected}</div>
            <div className="sr-stat-label">Từ chối</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="sr-filter-tabs" role="tablist">
        {(['ALL', 'PENDING', 'APPROVED', 'SHIPPED', 'REJECTED'] as const).map(s => (
          <button
            key={s}
            id={`shop-tab-${s.toLowerCase()}`}
            role="tab"
            aria-selected={filterStatus === s}
            className={`sr-tab ${filterStatus === s ? 'active' : ''}`}
            onClick={() => setFilterStatus(s)}
          >
            {s === 'ALL' ? '📋 Tất cả' : `${STATUS_ICON[s as SampleRequestStatus]} ${STATUS_LABEL[s as SampleRequestStatus]}`}
            <span className="sr-tab-count">
              {s === 'ALL' ? requests.length : requests.filter(r => r.status === s).length}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="sr-loading"><div className="sr-spinner" /><span>Đang tải...</span></div>
      ) : filtered.length === 0 ? (
        <div className="sr-empty">
          <div className="sr-empty-icon">📭</div>
          <h3>Không có yêu cầu nào</h3>
          <p>Chưa có KOL/CTV nào gửi yêu cầu xin mẫu trong mục này</p>
        </div>
      ) : (
        <div className="sr-table-wrapper">
          <table className="sr-table" id="shop-requests-table">
            <thead>
              <tr>
                <th>KOL / CTV</th>
                <th>Sản phẩm</th>
                <th>Địa chỉ nhận</th>
                <th>Ngày gửi</th>
                <th>Mã vận đơn</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(req => (
                <tr key={req.id} id={`shop-row-${req.id}`}>
                  <td>
                    <div className="sr-table-user">
                      <div className="sr-table-avatar">{req.collaborator.fullName[0]}</div>
                      <div>
                        <div className="sr-table-name">{req.collaborator.fullName}</div>
                        <div className="sr-table-sub">{req.collaborator.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="sr-table-product">
                      {req.product.imageUrl && (
                        <img src={req.product.imageUrl} alt="" className="sr-table-thumb" />
                      )}
                      <div>
                        <div className="sr-table-name">{req.product.title}</div>
                        <div className="sr-table-sub">SKU: {req.product.sku}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="sr-address-cell">{req.shippingAddress}</span></td>
                  <td><span className="sr-table-date">{formatDate(req.createdAt)}</span></td>
                  <td>
                    {req.trackingNumber ? (
                      <code className="sr-tracking-chip">{req.trackingNumber}</code>
                    ) : (
                      <span className="sr-table-sub">—</span>
                    )}
                  </td>
                  <td>
                    <span className={`sr-badge ${STATUS_COLOR[req.status]}`}>
                      {STATUS_ICON[req.status]} {STATUS_LABEL[req.status]}
                    </span>
                  </td>
                  <td>
                    <div className="sr-table-actions">
                      {req.status === 'PENDING' && (
                        <>
                          <button
                            id={`btn-approve-${req.id}`}
                            className="sr-action-btn approve"
                            onClick={() => handleApprove(req.id)}
                            disabled={!!actionLoading}
                            title="Duyệt"
                          >
                            {actionLoading === req.id + '-approve' ? '⏳' : '✅ Duyệt'}
                          </button>
                          <button
                            id={`btn-reject-${req.id}`}
                            className="sr-action-btn reject"
                            onClick={() => handleReject(req.id)}
                            disabled={!!actionLoading}
                            title="Từ chối"
                          >
                            {actionLoading === req.id + '-reject' ? '⏳' : '❌ Từ chối'}
                          </button>
                        </>
                      )}
                      {req.status === 'APPROVED' && (
                        <button
                          id={`btn-ship-${req.id}`}
                          className="sr-action-btn ship"
                          onClick={() => setShippingTarget(req)}
                          title="Nhập mã vận đơn"
                        >
                          🚚 Nhập mã vận đơn
                        </button>
                      )}
                      {req.status === 'SHIPPED' && (
                        <a
                          href={`https://ghtk.vn/tracking?order_code=${req.trackingNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="sr-action-btn track"
                          id={`btn-track-${req.id}`}
                        >
                          🔍 Tra cứu
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {shippingTarget && (
        <TrackingModal
          request={shippingTarget}
          onClose={() => setShippingTarget(null)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
