import { RotateCcw } from 'lucide-react';
import { Select } from '../../components/ui/Select';
import type { EligibleProduct } from '../../services/referral-links.service';
import { getSafeProductImageUrl, handleProductImageError } from '../../utils/marketplace.utils';

interface Props {
  product: EligibleProduct; deal: boolean; channel: string; label: string;
  onChannel: (value: string) => void; onLabel: (value: string) => void; onChangeProduct: () => void;
  source: string; medium: string; campaign: string; content: string;
  onSource: (value: string) => void; onMedium: (value: string) => void; onCampaign: (value: string) => void; onContent: (value: string) => void;
}
export function ReferralLinkSetup(props: Props) {
  const { product } = props;
  return <div className="kol-link-setup">
    <section className="kol-link-setup-product" aria-label="Sản phẩm đã chọn">
      <img src={getSafeProductImageUrl(product.imageUrl)} onError={handleProductImageError} alt={product.title} />
      <div><strong>{product.title}</strong><p>{product.store.name} · <span>{Number(product.price).toLocaleString('vi-VN')} đ</span></p></div>
      <div className="kol-link-setup-product-actions"><span>{props.deal ? 'Deal' : 'Thù lao'} {product.estimatedCommissionRate}%</span><button type="button" onClick={props.onChangeProduct}><RotateCcw size={13} />Đổi sản phẩm</button></div>
    </section>
    <section className="kol-link-setup-fields" aria-label="Thông tin liên kết">
      <h4>Thông tin liên kết</h4>
      <div className="kol-link-setup-main">
        <div><label>Kênh chia sẻ *</label><Select aria-label="Kênh chia sẻ" value={props.channel} onChange={e => props.onChannel(e.target.value)}>
          {['TIKTOK', 'YOUTUBE', 'FACEBOOK', 'INSTAGRAM', 'THREADS', 'ZALO', 'OTHER'].map((value, index) => <option key={value} value={value}>{['TikTok', 'YouTube', 'Facebook', 'Instagram', 'Threads', 'Zalo', 'Khác'][index]}</option>)}
        </Select></div>
        <div><label htmlFor="kol-link-name">Tên liên kết *</label><input id="kol-link-name" value={props.label} onChange={e => props.onLabel(e.target.value)} maxLength={150} placeholder="Ví dụ: Video review serum" required minLength={2} /></div>
      </div>
      <section className="kol-link-setup-advanced" aria-label="Thông tin theo dõi"><h5>Thông tin theo dõi</h5>
        <div>{[
          ['Nguồn', props.source, props.onSource], ['Định dạng', props.medium, props.onMedium],
          ['Nhãn chiến dịch UTM', props.campaign, props.onCampaign], ['Vị trí nội dung', props.content, props.onContent],
        ].map(([label, value, setter]) => <label key={label as string}>{label as string}<input aria-label={label as string} value={value as string} onChange={e => (setter as (value: string) => void)(e.target.value)} maxLength={100} /></label>)}</div>
      </section>
    </section>
  </div>;
}
