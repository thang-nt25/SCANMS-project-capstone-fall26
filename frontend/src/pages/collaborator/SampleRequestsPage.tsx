import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import api from '../../services/api';
import type { SampleRequest, SampleRequestStatus } from '../../types/samples';
import './SampleRequestsPage.css';

// ─── Helpers ────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<SampleRequestStatus, string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  SHIPPED: 'Đang giao',
};

const STATUS_COLOR: Record<SampleRequestStatus, string> = {
  PENDING: 'badge-pending',
  APPROVED: 'badge-approved',
  REJECTED: 'badge-rejected',
  SHIPPED: 'badge-shipped',
};

const STATUS_ICON: Record<SampleRequestStatus, string> = {
  PENDING: '⏳',
  APPROVED: '✅',
  REJECTED: '❌',
  SHIPPED: '🚚',
};

function formatDate(d: string) {
  return format(new Date(d), 'dd/MM/yyyy HH:mm', { locale: vi });
}

// ─── KOL: Form xin mẫu ──────────────────────────────────────────────────
function RequestModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [productId, setProductId] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId.trim() || !shippingAddress.trim()) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/sample-requests', { productId: productId.trim(), shippingAddress: shippingAddress.trim() });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gửi yêu cầu thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sr-modal-overlay" onClick={onClose}>
      <div className="sr-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="sr-modal-header">
          <h2>📦 Xin Sản Phẩm Mẫu</h2>
          <button className="sr-modal-close" onClick={onClose} id="btn-close-modal">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="sr-modal-form">
          <div className="sr-form-group">
            <label htmlFor="sr-product-id">ID Sản phẩm muốn xin mẫu</label>
            <input
              id="sr-product-id"
              type="text"
              className="sr-input"
              placeholder="Dán UUID sản phẩm vào đây..."
              value={productId}
              onChange={e => setProductId(e.target.value)}
              required
            />
            <small>Lấy ID từ danh sách sản phẩm của cửa hàng bạn đang hợp tác</small>
          </div>

          <div className="sr-form-group">
            <label htmlFor="sr-address">Địa chỉ nhận hàng mẫu</label>
            <textarea
              id="sr-address"
              className="sr-input sr-textarea"
              placeholder="Ví dụ: 123 Nguyễn Văn A, P.Bến Nghé, Q.1, TP.HCM"
              value={shippingAddress}
              onChange={e => setShippingAddress(e.target.value)}
              rows={3}
              required
              minLength={10}
            />
          </div>

          {error && <div className="sr-error">{error}</div>}

          <div className="sr-modal-actions">
            <button type="button" className="sr-btn sr-btn-outline" onClick={onClose}>
              Hủy
            </button>
            <button
              type="submit"
              id="btn-submit-sample"
              className="sr-btn sr-btn-primary"
              disabled={loading || !productId.trim() || !shippingAddress.trim()}
            >
              {loading ? '⏳ Đang gửi...' : '📤 Gửi yêu cầu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── KOL Page ────────────────────────────────────────────────────────────
export default function SampleRequestsPage() {
  const [requests, setRequests] = useState<SampleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<SampleRequestStatus | 'ALL'>('ALL');

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/sample-requests/my');
      setRequests(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  const filtered = filterStatus === 'ALL'
    ? requests
    : requests.filter(r => r.status === filterStatus);

  const counts = {
    ALL: requests.length,
    PENDING: requests.filter(r => r.status === 'PENDING').length,
    APPROVED: requests.filter(r => r.status === 'APPROVED').length,
    SHIPPED: requests.filter(r => r.status === 'SHIPPED').length,
    REJECTED: requests.filter(r => r.status === 'REJECTED').length,
  };

  return (
    <div className="sr-page" id="kol-sample-requests-page">
      {/* Header */}
      <div className="sr-header">
        <div className="sr-header-left">
          <h1 className="sr-title">
            <span>📦</span> Sản Phẩm Mẫu Dùng Thử
          </h1>
          <p className="sr-subtitle">Theo dõi trạng thái yêu cầu xin mẫu của bạn</p>
        </div>
        <button
          id="btn-new-sample-request"
          className="sr-btn sr-btn-primary"
          onClick={() => setShowModal(true)}
        >
          + Xin mẫu mới
        </button>
      </div>

      {/* Filter tabs */}
      <div className="sr-filter-tabs" role="tablist">
        {(['ALL', 'PENDING', 'APPROVED', 'SHIPPED', 'REJECTED'] as const).map(s => (
          <button
            key={s}
            id={`tab-${s.toLowerCase()}`}
            role="tab"
            aria-selected={filterStatus === s}
            className={`sr-tab ${filterStatus === s ? 'active' : ''}`}
            onClick={() => setFilterStatus(s)}
          >
            {s === 'ALL' ? '📋 Tất cả' : `${STATUS_ICON[s]} ${STATUS_LABEL[s]}`}
            <span className="sr-tab-count">{counts[s]}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="sr-loading">
          <div className="sr-spinner" />
          <span>Đang tải dữ liệu...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="sr-empty">
          <div className="sr-empty-icon">📭</div>
          <h3>Chưa có yêu cầu nào</h3>
          <p>Nhấn <strong>+ Xin mẫu mới</strong> để gửi yêu cầu đến cửa hàng</p>
        </div>
      ) : (
        <div className="sr-cards">
          {filtered.map(req => (
            <div key={req.id} className="sr-card" id={`request-${req.id}`}>
              {/* Product info */}
              <div className="sr-card-product">
                {req.product.imageUrl ? (
                  <img src={req.product.imageUrl} alt={req.product.title} className="sr-product-img" />
                ) : (
                  <div className="sr-product-placeholder">🛍️</div>
                )}
                <div className="sr-product-info">
                  <div className="sr-product-name">{req.product.title}</div>
                  <div className="sr-product-meta">
                    SKU: <code>{req.product.sku}</code>
                    <span>·</span>
                    {req.product.store.name}
                  </div>
                </div>
                <div className={`sr-badge ${STATUS_COLOR[req.status]}`}>
                  {STATUS_ICON[req.status]} {STATUS_LABEL[req.status]}
                </div>
              </div>

              {/* Details */}
              <div className="sr-card-body">
                <div className="sr-info-row">
                  <span className="sr-info-label">📍 Địa chỉ nhận</span>
                  <span className="sr-info-value">{req.shippingAddress}</span>
                </div>
                <div className="sr-info-row">
                  <span className="sr-info-label">📅 Ngày gửi</span>
                  <span className="sr-info-value">{formatDate(req.createdAt)}</span>
                </div>

                {/* Tracking number */}
                {req.trackingNumber && (
                  <div className="sr-tracking-box">
                    <span className="sr-tracking-label">🚚 Mã vận đơn</span>
                    <code className="sr-tracking-code">{req.trackingNumber}</code>
                    <a
                      href={`https://ghtk.vn/tracking?order_code=${req.trackingNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sr-tracking-link"
                      id={`tracking-link-${req.id}`}
                    >
                      Tra cứu GHTK →
                    </a>
                  </div>
                )}

                {/* Status timeline */}
                <div className="sr-timeline">
                  {(['PENDING', 'APPROVED', 'SHIPPED'] as SampleRequestStatus[]).map((s, i) => {
                    const idx = ['PENDING', 'APPROVED', 'SHIPPED'].indexOf(req.status);
                    const done = req.status !== 'REJECTED' && i <= idx;
                    return (
                      <div key={s} className={`sr-timeline-step ${done ? 'done' : ''}`}>
                        <div className="sr-timeline-dot" />
                        {i < 2 && <div className="sr-timeline-line" />}
                        <span>{STATUS_LABEL[s]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <RequestModal onClose={() => setShowModal(false)} onSuccess={loadRequests} />
      )}
    </div>
  );
}
