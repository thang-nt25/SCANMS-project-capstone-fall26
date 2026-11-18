import { BarChart3, Loader2, Globe, QrCode } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import type { ReferralLinkItem } from '../../services/referral-links.service';
import { getSafeProductImageUrl, handleProductImageError } from '../../utils/marketplace.utils';

interface Props { link: ReferralLinkItem; data: any; loading: boolean; error: string | null; channelLabel: string; onClose: () => void }
export function ReferralAnalyticsDialog({ link, data, loading, error, channelLabel, onClose }: Props) {
  const format = (value: unknown) => value == null ? '—' : Number(value).toLocaleString('vi-VN');
  const metrics = data ? [
    { label: 'Tổng lượt nhấp', value: data.rawClicks ?? link.totalClicks },
    { label: 'Nhấp hợp lệ', value: data.validClicks },
    { label: 'Nhấp duy nhất', value: data.uniqueClicks ?? link.uniqueClicks },
    { label: 'Nghi ngờ / Bị chặn', value: data.suspiciousClicks, warning: true },
    { label: 'Đơn ghi nhận', value: data.conversions ?? link.totalOrders },
    { label: 'Tỷ lệ chuyển đổi', value: data.conversionRate, percent: true },
  ] : [];
  return <Modal isOpen stickyHeader title="Thống kê liên kết" icon={<BarChart3 size={20} />} onClose={onClose} maxWidth="2xl" className="referral-analytics-dialog" bodyClassName="referral-analytics-body">
    <div className="referral-share-product">
      <img src={getSafeProductImageUrl(link.product?.imageUrl)} onError={handleProductImageError} alt={link.product?.title || 'Sản phẩm'} />
      <div><h4>{link.product?.title || 'Sản phẩm tiếp thị'}</h4><p>{link.store?.name}</p><p><span className="referral-analytics-code">{link.shortCode}</span><span>· {channelLabel}</span></p></div>
    </div>
    {loading ? <div className="referral-analytics-loading" role="status"><Loader2 size={24} className="animate-spin" />Đang tải thống kê…</div> : error ? <p role="alert" className="referral-share-error">{error}</p> : data ? <>
      <div className="referral-analytics-metrics">
        {metrics.map(metric => <div key={metric.label} className={metric.percent ? 'is-highlight' : ''}><span>{metric.label}</span><strong className={metric.warning && Number(metric.value) > 0 ? 'is-warning' : ''}>{format(metric.value)}{metric.percent && metric.value != null ? '%' : ''}</strong></div>)}
      </div>
      <div className="referral-analytics-sources"><h4>Nguồn truy cập</h4><div>
        <div><span><Globe size={16} />Qua liên kết</span><strong>{format(data.breakdownByVia?.link)}</strong></div>
        <div><span><QrCode size={16} />Qua mã QR</span><strong>{format(data.breakdownByVia?.qr)}</strong></div>
      </div></div>
      <p className="referral-analytics-note">Lũy kế · Ghi nhận theo lượt nhấp cuối trong 30 ngày.</p>
    </> : null}
  </Modal>;
}
