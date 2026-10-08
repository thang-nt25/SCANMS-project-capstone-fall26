import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
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
    <section className="customer-vouchers" aria-labelledby="vouchers-heading">
      <header className="cv-header">
        <div className="cv-heading-group">
          <span className="cv-heading-icon" aria-hidden="true">
            <Ticket size={22} />
          </span>
          <div>
            <div className="cv-heading-line">
              <h1 id="vouchers-heading">Kho voucher</h1>
              <span className="cv-count">{vouchers.length} mã ưu đãi</span>
            </div>
            <p>Mã giảm giá từ SCANMS và các gian hàng đối tác.</p>
          </div>
        </div>
        <Link className="cv-shopping-link" to="/marketplace">
          Mua sắm ngay <ArrowRight size={16} />
        </Link>
      </header>
      <div className="cv-section-heading">
        <h2>Ưu đãi dành cho bạn</h2>
        <span>Sao chép mã để dùng khi thanh toán</span>
      </div>
      <div className="cv-grid">
        {vouchers.map((voucher) => {
          const Icon = voucher.icon;
          const copied = copiedCode === voucher.code;
          return (
            <article className="cv-card" key={voucher.code}>
              <div className="cv-discount">
                <Icon size={21} aria-hidden="true" />
                <strong>{voucher.value}</strong>
                <span>{voucher.label}</span>
              </div>
              <div className="cv-body">
                <span className="cv-category">{voucher.category}</span>
                <h3>{voucher.title}</h3>
                <p className="cv-minimum">{voucher.minimum}</p>
                <p className="cv-scope">{voucher.scope}</p>
                <div className="cv-footer">
                  <span className="cv-expiry">
                    <Clock3 size={12} />
                    HSD: {voucher.expiry}
                  </span>
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
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
