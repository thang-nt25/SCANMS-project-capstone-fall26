import type { Creator } from './marketplace.types';
interface CreatorCardProps {
  creator: Creator; selected: boolean; copied: boolean;
  onSelect: () => void; onCopy: () => void; onTerms: () => void; onProfile: () => void;
}
export default function CreatorCard({ creator, selected, copied, onSelect, onCopy, onTerms, onProfile }: CreatorCardProps) {
  return <article className={`mp-creator-card ${selected ? 'selected' : ''}`}>
    <div className="mp-creator-top">
      <span className="react-monogram" aria-hidden="true">{creator.name.split(' ').slice(-2).map(part => part[0]).join('')}</span>
      <div className="mp-creator-meta"><strong className="mp-creator-name">{creator.name}</strong>
        <span className="mp-creator-platform-text"><i className={`ph ${creator.platformIcon}`} aria-hidden="true" />{creator.platform}</span></div>
    </div>
    <p className="mp-niche-tag"><i className={`ph ${creator.id === 'tuan' ? 'ph-devices' : 'ph-sparkle'}`} aria-hidden="true" />{creator.niche}</p>
    <div className="mp-creator-voucher-strip"><strong className="mp-voucher-discount-text">Giảm {creator.voucherInfo.discount}</strong>
      <div className="mp-voucher-code-group"><code className="mp-voucher-code">{creator.coupon}</code>
        <button type="button" className="mp-voucher-copy-btn" onClick={onCopy} aria-label={`Sao chép mã ${creator.coupon}`}><i className={`ph ${copied ? 'ph-check' : 'ph-copy'}`} aria-hidden="true" />{copied ? 'Đã sao chép' : 'Sao chép'}</button></div></div>
    <button type="button" className="mp-terms-link" onClick={onTerms}>Điều kiện áp dụng</button>
    <button type="button" className={`mp-creator-select-btn ${selected ? 'active' : ''}`} onClick={onSelect} aria-pressed={selected}>{selected ? '✓ Đã chọn' : 'Chọn ưu đãi'}</button>
    <button type="button" className="mp-creator-profile-link" onClick={onProfile}>Xem hồ sơ →</button>
  </article>;
}
