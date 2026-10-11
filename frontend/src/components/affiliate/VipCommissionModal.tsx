import { useEffect, useRef, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Crown, X, Check, CheckCircle2, Info, Loader2, ArrowRight, ChevronDown } from 'lucide-react';
import './VipCommissionModal.css';

interface Props {
  creator: { fullName: string; avatarUrl?: string; handle?: string; email: string; tier?: string; kycStatus?: string; commissionRate?: number };
  rate: number;
  saving: boolean;
  onRateChange: (rate: number) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}

const money = (amount: number) => `${Math.round(amount).toLocaleString('vi-VN')} ₫`;
const tiers: Record<string, string> = { GOLD: 'Vàng', SILVER: 'Bạc', BRONZE: 'Đồng', DIAMOND: 'Kim cương' };

export function VipCommissionModal({ creator, rate, saving, onRateChange, onClose, onSubmit }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const currentRate = creator.commissionRate ?? 18;
  const difference = (rate - currentRate) * 5000;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, []);

  return createPortal(
    <div className="vip-commission-overlay" onClick={() => { if (!saving) onClose(); }}>
      <div ref={dialogRef} className="vip-commission-dialog" role="dialog" aria-modal="true" aria-labelledby="vip-commission-title" tabIndex={-1} onClick={event => event.stopPropagation()} onKeyDown={event => {
        if (event.key === 'Escape') { event.stopPropagation(); if (!saving) onClose(); }
        if (event.key === 'Tab') {
          const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), summary')).filter(item => item.getClientRects().length);
          const first = items[0], last = items[items.length - 1];
          if (!first) { event.preventDefault(); return; }
          if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && (document.activeElement === last || document.activeElement === event.currentTarget)) { event.preventDefault(); first.focus(); }
        }
      }}>
        <header className="vip-commission-header">
          <span className="vip-commission-symbol"><Crown size={17} /></span>
          <div><h3 id="vip-commission-title">Hoa hồng VIP</h3></div>
          <button type="button" disabled={saving} aria-label="Đóng hoa hồng VIP" onClick={onClose}><X size={17} /></button>
        </header>
        <form onSubmit={onSubmit} className="vip-commission-form">
          <div className="vip-commission-body">
            <section className="vip-commission-creator" aria-label="Đối tác nhận hoa hồng">
              <span className="vip-commission-avatar">{creator.avatarUrl ? <img src={creator.avatarUrl} alt="" /> : creator.fullName.charAt(0)}</span>
              <div className="vip-commission-identity"><div><strong>{creator.fullName}</strong>{creator.kycStatus === 'VERIFIED' && <CheckCircle2 size={13} aria-label="Đã xác minh danh tính" />}</div><p>Đối tác nhận tỷ lệ riêng</p></div>
            </section>
            <section className="vip-commission-control">
              <div className="vip-commission-rate-heading"><div className="vip-commission-current"><span>Hiện tại</span><strong>{currentRate}<span>%</span></strong></div><ArrowRight size={16} aria-hidden="true" /><div className="vip-commission-next"><label htmlFor="vip-commission-rate">Tỷ lệ VIP mới</label><output htmlFor="vip-commission-rate">{rate}<span>%</span></output></div></div>
              <input id="vip-commission-rate" type="range" min={10} max={45} step={1} value={rate} disabled={saving} onChange={event => onRateChange(Number(event.target.value))} style={{ background: `linear-gradient(to right, #C59B58 ${Math.max(0, Math.min(100, (rate - 10) / 35 * 100))}%, #EAE4D7 0)` }} />
              <div className="vip-commission-range-labels"><span>Tối thiểu 10%</span><span>Tối đa 45%</span></div>
              <div className="vip-commission-presets" role="group" aria-label="Chọn nhanh tỷ lệ hoa hồng">{[18, 22, 28, 35].map(value => <button key={value} type="button" aria-pressed={rate === value} disabled={saving} onClick={() => onRateChange(value)}>{value}%</button>)}</div>
            </section>
            <details className="vip-commission-details"><summary>Xem dự tính hoa hồng <ChevronDown size={14} aria-hidden="true" /></summary>
            <div className="vip-commission-partner-meta"><span>{(creator.handle || creator.email).replace(/^@+/, '@')}</span>{creator.tier && <span className="vip-commission-tier">{tiers[creator.tier] || creator.tier}</span>}</div>
            <section className="vip-commission-preview" aria-label="Hoa hồng dự tính" aria-live="polite">
              <div><strong>Hoa hồng dự tính</strong><p>Với đơn hàng 500.000 ₫</p></div><div><strong>{money(500000 * rate / 100)}</strong>{difference !== 0 && <p className={difference > 0 ? 'vip-commission-increase' : ''}>{difference > 0 ? '+' : '−'}{money(Math.abs(difference))} so với hiện tại</p>}</div>
            </section>
            <p className="vip-commission-note"><Info size={14} /><span>Tỷ lệ riêng cho đơn tiếp thị liên kết và phiên Live của KOL này.</span></p>
            </details>
          </div>
          <footer className="vip-commission-footer"><button type="button" disabled={saving} onClick={onClose}>Hủy</button><button type="submit" className="vip-commission-save" disabled={saving}>{saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}{saving ? 'Đang lưu…' : `Lưu tỷ lệ ${rate}%`}</button></footer>
        </form>
      </div>
    </div>, document.body
  );
}
