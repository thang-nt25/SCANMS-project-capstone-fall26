import { useState } from 'react';
import { Check, Copy, Download, ExternalLink, Loader2, QrCode, Store } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import type { ReferralLinkItem } from '../../services/referral-links.service';
import { getSafeProductImageUrl, handleProductImageError } from '../../utils/marketplace.utils';
import { toast } from '../../utils/toast';

interface Props {
  link: ReferralLinkItem;
  targetUrl: string;
  qrDataUrl: string | null;
  qrLoading: boolean;
  qrError: boolean;
  retryQr: () => void;
  pngSize: 512 | 1024 | 2048;
  onSizeChange: (size: 512 | 1024 | 2048) => void;
  downloading: boolean;
  downloadError: string | null;
  onDownload: (format: 'png' | 'svg') => void;
  onClose: () => void;
}

export function ReferralShareDialog({ link, targetUrl, qrDataUrl, qrLoading, qrError, retryQr, pngSize, onSizeChange, downloading, downloadError, onDownload, onClose }: Props) {
  const [tab, setTab] = useState<'qr' | 'caption' | 'download'>('qr');
  const [copied, setCopied] = useState<'link' | 'caption' | null>(null);
  const [caption, setCaption] = useState(() => `${link.product?.title || 'Sản phẩm'}\n${link.customCouponCode ? `Mã ưu đãi: ${link.customCouponCode}\n` : ''}Xem sản phẩm: ${targetUrl}\n#SCANMS`);
  const copy = async (value: string, type: 'link' | 'caption') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(type);
      toast.success(type === 'link' ? 'Đã sao chép liên kết' : 'Đã sao chép nội dung');
    } catch { toast.error('Chưa thể sao chép. Vui lòng chọn và sao chép thủ công.'); }
  };

  return <Modal isOpen stickyHeader onClose={onClose} title="Công cụ chia sẻ" icon={<QrCode size={20} />} maxWidth="2xl" className="referral-share-dialog" bodyClassName="referral-share-body">
    <div className="referral-share-product">
      <img src={getSafeProductImageUrl(link.product?.imageUrl)} onError={handleProductImageError} alt={link.product?.title || 'Sản phẩm'} />
      <div><h4>{link.product?.title}</h4><p><Store size={13} /><span>{link.store?.name || link.product?.store?.name}</span></p></div>
    </div>
    <div className="referral-share-tabs" role="group" aria-label="Nội dung công cụ chia sẻ">
      {([{ key: 'qr', label: 'Mã QR' }, { key: 'caption', label: 'Nội dung' }, { key: 'download', label: 'Tải xuống' }] as const).map(item => <button key={item.key} type="button" aria-pressed={tab === item.key} onClick={() => setTab(item.key)}>{item.label}</button>)}
    </div>
    <div className="referral-share-url">
      <input aria-label="Liên kết chia sẻ đầy đủ" readOnly value={targetUrl} onFocus={event => event.currentTarget.select()} />
      <button type="button" aria-label="Sao chép liên kết chia sẻ" title={copied === 'link' ? 'Đã sao chép' : 'Sao chép liên kết'} onClick={() => void copy(targetUrl, 'link')}>{copied === 'link' ? <Check size={17} /> : <Copy size={17} />}</button>
    </div>
    {tab === 'qr' && <div className="referral-share-qr">
      {qrLoading ? <div role="status"><Loader2 size={26} className="animate-spin" /><span>Đang tạo QR…</span></div> : qrError ? <div role="alert"><span>Chưa thể tạo QR</span><button type="button" onClick={retryQr}>Thử lại</button></div> : qrDataUrl ? <img src={qrDataUrl} alt={`Mã QR của ${link.product?.title || 'sản phẩm'}`} /> : <span>Đang tạo QR…</span>}
    </div>}
    {tab === 'caption' && <div className="referral-share-caption">
      <label htmlFor="referral-caption">Nội dung chia sẻ</label>
      <textarea id="referral-caption" value={caption} onChange={event => { setCaption(event.target.value); setCopied(null); }} rows={5} />
      <button type="button" className="referral-share-primary" disabled={!caption.trim()} onClick={() => void copy(caption, 'caption')}>{copied === 'caption' ? <Check size={16} /> : <Copy size={16} />}{copied === 'caption' ? 'Đã sao chép' : 'Sao chép nội dung'}</button>
    </div>}
    {tab === 'download' && <div className="referral-share-download">
      <span className="referral-share-label">Kích thước PNG</span>
      <div className="referral-share-sizes" role="group" aria-label="Kích thước PNG">
        {([512, 1024, 2048] as const).map(size => <button key={size} type="button" aria-pressed={pngSize === size} onClick={() => onSizeChange(size)}>{size} px</button>)}
      </div>
      {downloadError && <p role="alert" className="referral-share-error">{downloadError}</p>}
      <div className="referral-share-download-buttons">
        <button type="button" className="referral-share-primary" disabled={downloading} onClick={() => onDownload('png')}>{downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}Tải PNG</button>
        <button type="button" disabled={downloading} onClick={() => onDownload('svg')}><Download size={16} />Tải SVG</button>
      </div>
      <a className="referral-share-preview" href={targetUrl} target="_blank" rel="noopener noreferrer">Mở liên kết thử <ExternalLink size={13} /></a>
    </div>}
  </Modal>;
}
