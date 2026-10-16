import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ChevronDown, Copy, Ticket, Store, Clock3 } from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../utils/toast';
import { formatMoney } from '../../utils/marketplace.utils';
import './CustomerVouchersTab.css';

interface AvailableVoucher {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  minimumOrderAmount: number;
  maximumDiscountAmount: number | null;
  remainingUses: number | null;
  expiresAt: string | null;
  scopeType: string;
  fundingSource: string;
  benefitType: 'GOODS' | 'SHIPPING';
  store: { id: string; name: string; slug: string };
}

export function CustomerVouchersTab() {
  const [vouchers, setVouchers] = useState<AvailableVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState('');
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [savingId, setSavingId] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get('/coupons/available', { headers: { 'x-skip-cache': 'true' } }),
      api.get('/coupons/saved', { headers: { 'x-skip-cache': 'true' } }),
      api.get('/coupons/saved/details', { headers: { 'x-skip-cache': 'true' } }),
    ]).then(([availableResponse, savedResponse, savedDetailsResponse]: any[]) => {
        const data = availableResponse?.data?.data || availableResponse?.data || availableResponse;
        const saved = savedResponse?.data?.data || savedResponse?.data || savedResponse;
        const savedDetails = savedDetailsResponse?.data?.data || savedDetailsResponse?.data || savedDetailsResponse;
        if (active) {
          const merged = [...(Array.isArray(data) ? data : []), ...(Array.isArray(savedDetails) ? savedDetails : [])];
          setVouchers([...new Map(merged.map((voucher: AvailableVoucher) => [voucher.id, voucher])).values()]);
          setSavedIds(Array.isArray(saved) ? saved : []);
        }
      })
      .catch(() => { if (active) setError('Chưa tải được voucher. Vui lòng thử lại sau.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const toggleSaved = async (voucher: AvailableVoucher) => {
    setSavingId(voucher.id);
    try {
      if (savedIds.includes(voucher.id)) {
        await api.delete(`/coupons/saved/${voucher.id}`);
        setSavedIds((ids) => ids.filter((id) => id !== voucher.id));
      } else {
        await api.post(`/coupons/saved/${voucher.id}`);
        setSavedIds((ids) => [...ids, voucher.id]);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Chưa lưu được voucher. Vui lòng thử lại.');
    } finally {
      setSavingId('');
    }
  };

  const visibleVouchers = showSaved ? vouchers.filter((voucher) => savedIds.includes(voucher.id)) : vouchers;

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
          <p>Ưu đãi đang có hiệu lực từ các gian hàng đối tác SCANMS.</p>
        </div>
      </header>
      <div className="flex gap-2 pb-4">
        <button type="button" aria-pressed={!showSaved} onClick={() => setShowSaved(false)} className={`rounded-full px-4 py-2 text-sm ${!showSaved ? 'bg-[#C59B58] text-white' : 'bg-[#F3EFE6] text-[#1A1612]'}`}>Tất cả ({vouchers.length})</button>
        <button type="button" aria-pressed={showSaved} onClick={() => setShowSaved(true)} className={`rounded-full px-4 py-2 text-sm ${showSaved ? 'bg-[#C59B58] text-white' : 'bg-[#F3EFE6] text-[#1A1612]'}`}>Đã lưu ({savedIds.filter((id) => vouchers.some((voucher) => voucher.id === id)).length})</button>
      </div>
      {loading && <p>Đang tải voucher...</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && visibleVouchers.length === 0 && <p>{showSaved ? 'Bạn chưa lưu voucher khả dụng nào.' : 'Hiện chưa có voucher khả dụng.'}</p>}
      <div className="cv-grid">
        {visibleVouchers.map((voucher) => {
          const copied = copiedCode === voucher.code;
          const value = voucher.discountType === 'PERCENTAGE'
            ? `${voucher.discountValue}%` : formatMoney(voucher.discountValue);
          const minimum = voucher.minimumOrderAmount > 0
            ? `Đơn từ ${formatMoney(voucher.minimumOrderAmount)}` : 'Không yêu cầu đơn tối thiểu';
          const expiry = voucher.expiresAt
            ? new Date(voucher.expiresAt).toLocaleDateString('vi-VN') : 'Không giới hạn';
          return (
            <article className="cv-card" key={voucher.id}>
              <div className="cv-discount"><strong>{value}</strong><span>{voucher.benefitType === 'SHIPPING' ? 'Cước GHN' : 'Tiền hàng'}</span></div>
              <div className="cv-body">
                <span className="cv-category"><Store size={13} aria-hidden="true" />{voucher.store.name}</span>
                <h2>{voucher.fundingSource === 'PLATFORM_FUNDED' ? 'Voucher sàn SCANMS' : 'Ưu đãi tại ' + voucher.store.name}</h2>
                <p className="cv-minimum">{minimum}</p>
              </div>
              <div className="cv-actions">
                <button type="button" disabled={savingId === voucher.id} onClick={() => void toggleSaved(voucher)} className="rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-3 py-2 text-xs font-semibold text-[#1A1612] disabled:opacity-50">{savedIds.includes(voucher.id) ? 'Bỏ lưu' : 'Lưu mã'}</button>
                <button type="button" className={`cv-code${copied ? ' is-copied' : ''}`}
                  onClick={() => void copyCode(voucher.code)} aria-label={`Sao chép mã ${voucher.code}`}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{voucher.code}</span>
                </button>
                <Link className="cv-use" to={`/shop/${voucher.store.slug}`}>
                  Dùng ngay <ArrowRight size={13} />
                </Link>
              </div>
              <details className="cv-details">
                <summary aria-label={`Điều kiện mã ${voucher.code}, hạn dùng ${expiry}`}>
                  <span className="cv-details-label">Điều kiện<ChevronDown size={13} aria-hidden="true" /></span>
                  <span className="cv-expiry"><Clock3 size={12} aria-hidden="true" />HSD: {expiry}</span>
                </summary>
                <dl>
                  <div><dt>Áp dụng</dt><dd>{voucher.store.name}</dd></div>
                  <div><dt>Giá trị đơn</dt><dd>{minimum}</dd></div>
                  {voucher.maximumDiscountAmount !== null && <div><dt>Giảm tối đa</dt><dd>{formatMoney(voucher.maximumDiscountAmount)}</dd></div>}
                  {voucher.remainingUses !== null && <div><dt>Lượt còn</dt><dd>{voucher.remainingUses}</dd></div>}
                </dl>
              </details>
            </article>
          );
        })}
      </div>
    </section>
  );
}
