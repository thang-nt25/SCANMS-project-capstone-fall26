import type { SampleRequestItem } from '../../pages/merchant/ShopKolHubPage';
import { SampleSandboxWaybills } from './SampleGhnEnvironmentPicker';
import { ExternalLink, Truck, Video } from 'lucide-react';
import SampleSubmittedVideo from '../affiliate/SampleSubmittedVideo';

export function PartnerSampleDetails({ item }: { item: SampleRequestItem }) {
  const channelUrl = item.socialChannelUrlSnapshot || item.socialChannel?.channelUrl;
  const previousAssets = (item.videoAssets || []).filter(asset => asset.urlOrContent !== item.reviewVideoUrl);
  const liveCharges = item.shippingCharges?.filter(charge => charge.environment !== 'TEST') || [];
  return <div className="partner-sample-details">
    <div className="partner-sample-columns">
      <section aria-label="Vận chuyển mẫu">
        <h5><Truck size={14} />Vận chuyển</h5>
        <SampleSandboxWaybills charges={item.shippingCharges} role="shop" compact
          productId={item.product.id} productTitle={item.product.title} sampleRequestId={item.id} />
        {item.trackingCode && <div className="partner-live-waybill">
          <strong>{item.carrier || 'Vận chuyển'} · {item.trackingCode}</strong>
          <dl><div><dt>Cước Shop trả</dt><dd>{liveCharges.some(charge => charge.amount != null)
            ? `${liveCharges.filter(charge => charge.amount != null).reduce((sum, charge) => sum + Number(charge.amount), 0).toLocaleString('vi-VN')} ₫${liveCharges.some(charge => charge.amount == null) ? ' · Chưa đủ cước' : ''}`
            : 'Chưa ghi nhận'}</dd></div><div><dt>Thu hộ từ KOL</dt><dd>0 ₫</dd></div></dl>
        </div>}
        {!item.trackingCode && !item.shippingCharges?.some(charge => charge.environment === 'TEST') && <p className="partner-sample-muted">Chưa có vận đơn</p>}
      </section>
      <section aria-label="Nhận mẫu và nội dung cam kết">
        <h5>Nhận mẫu & nội dung</h5>
        <strong>{item.recipientName || item.collaboratorInfo?.fullName || 'Chưa có người nhận'}{item.recipientPhone ? ` · ${item.recipientPhone}` : ''}</strong>
        <p>{item.shippingAddress || 'Chưa có địa chỉ nhận mẫu'}</p>
        {(item.socialPlatformSnapshot || item.socialChannel) && <div className="partner-sample-channel">
          {channelUrl ? <a href={channelUrl} target="_blank" rel="noreferrer">{item.socialPlatformSnapshot || item.socialChannel?.platformName} · {item.socialChannelNameSnapshot || item.socialChannel?.channelName || 'Kênh đã chọn'} <ExternalLink size={12} /></a>
            : <strong>{item.socialPlatformSnapshot || item.socialChannel?.platformName} · {item.socialChannelNameSnapshot || item.socialChannel?.channelName}</strong>}
          <span>{Number(item.socialFollowerSnapshot ?? item.socialChannel?.followerCount ?? 0).toLocaleString('vi-VN')} người theo dõi</span>
        </div>}
        {item.note && <div><span className="partner-sample-muted">Cam kết nội dung</span><p>{item.note}</p></div>}
      </section>
    </div>
    <SampleSubmittedVideo sample={item} />
    {previousAssets.length > 0 && <section className="partner-sample-videos" aria-label="Lịch sử video đã nộp">
      <h5><Video size={14} />Lịch sử video</h5>
      {previousAssets.map(asset => <div key={asset.id}>
        <a href={asset.urlOrContent} target="_blank" rel="noreferrer"><Video size={14} />{asset.title || 'Xem video'}<ExternalLink size={12} /></a>
        <span>{asset.status === 'APPROVED' ? 'Đã duyệt' : asset.status === 'REJECTED' ? 'Cần chỉnh sửa' : 'Chờ duyệt'}</span>
        {asset.rejectionReason && <p>{asset.rejectionReason}</p>}
      </div>)}
    </section>}
  </div>;
}
