import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  Ticket,
  Truck,
  Store,
  Gift,
  Clock3,
} from 'lucide-react';
import { toast } from '../../utils/toast';
import './CustomerVouchersTab.css';

const vouchers = [
  {
    code: 'SCANMS15',
    title: 'Giảm 15% đơn hàng đối tác',
    value: '15%',
    label: 'Giảm giá',
    minimum: 'Đơn từ 200.000₫',
    expiry: '31/12/2026',
    scope: 'Toàn bộ gian hàng chính hãng',
    category: 'Đối tác',
    icon: Ticket,
  },
  {
    code: 'FREESHIP50K',
    title: 'Miễn phí vận chuyển toàn sàn',
    value: '50K',
    label: 'Tối đa',
    minimum: 'Đơn từ 150.000₫',
    expiry: '31/12/2026',
    scope: 'Áp dụng cho mọi đơn hàng',
    category: 'Vận chuyển',
    icon: Truck,
  },
  {
    code: 'KOLWELCOME',
    title: 'Ưu đãi khách mới SCANMS',
    value: '30K',
    label: 'Giảm giá',
    minimum: 'Không yêu cầu giá trị tối thiểu',
    expiry: '31/12/2026',
    scope: 'Khách hàng đăng ký mới',
    category: 'Khách mới',
    icon: Gift,
  },
  {
    code: 'SORASKIN20',
    title: 'Giảm 20% tại Sora Skin',
    value: '20%',
    label: 'Giảm giá',
    minimum: 'Đơn từ 350.000₫',
    expiry: '30/11/2026',
    scope: 'Sora Skin Official Store',
    category: 'Gian hàng',
    icon: Store,
  },
];

export function CustomerVouchersTab() {
  const [copiedCode, setCopiedCode] = useState('');
  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success(`Đã sao chép mã ${code}`);
    } catch {
      toast.error('Chưa thể sao chép. Bạn có thể nhập mã khi thanh toán.');
    }
  };

  return (
    <section className="customer-vouchers" aria-labelledby="customer-vouchers-title">
      <header className="cv-heading">
        <span className="cv-heading-icon" aria-hidden="true"><Ticket size={21} /></span>
        <div>
          <div className="cv-title-row">
            <h1 id="customer-vouchers-title">Kho voucher</h1>
            <span className="cv-count">{vouchers.length} ưu đãi</span>
          </div>
          <p>Ưu đãi từ SCANMS và các gian hàng đối tác.</p>
        </div>
      </header>
      <div className="cv-grid">
        {vouchers.map((voucher) => {
          const Icon = voucher.icon;
          const copied = copiedCode === voucher.code;
          return (
            <article className="cv-card" key={voucher.code}>
              <div className="cv-discount">
                <strong>{voucher.value}</strong>
                <span>{voucher.label}</span>
              </div>
              <div className="cv-body">
                <span className="cv-category"><Icon size={13} aria-hidden="true" />{voucher.category}</span>
                <h2>{voucher.title}</h2>
                <p className="cv-minimum">{voucher.minimum}</p>
              </div>
              <div className="cv-actions">
                <button
                  type="button"
                  className={`cv-code${copied ? ' is-copied' : ''}`}
                  onClick={() => void copyCode(voucher.code)}
                  aria-label={`Sao chép mã ${voucher.code}`}
                  title={copied ? 'Đã sao chép' : 'Sao chép mã'}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{voucher.code}</span>
                </button>
                <Link className="cv-use" to="/marketplace">
                  Dùng ngay <ArrowRight size={13} />
                </Link>
              </div>
              <details className="cv-details">
                <summary aria-label={`Điều kiện mã ${voucher.code}, hạn dùng ${voucher.expiry}`}>
                  <span className="cv-details-label">Điều kiện<ChevronDown size={13} aria-hidden="true" /></span>
                  <span className="cv-expiry"><Clock3 size={12} aria-hidden="true" />HSD: {voucher.expiry}</span>
                </summary>
                <dl>
                  <div><dt>Áp dụng</dt><dd>{voucher.scope}</dd></div>
                  <div><dt>Giá trị đơn</dt><dd>{voucher.minimum}</dd></div>
                </dl>
              </details>
            </article>
          );
        })}
      </div>
    </section>
  );
}
