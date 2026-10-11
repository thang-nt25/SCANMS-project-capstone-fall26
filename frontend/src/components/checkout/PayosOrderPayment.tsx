import { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { CheckCircle2, Clock3, ExternalLink, Loader2, QrCode, RefreshCw, ShieldCheck } from 'lucide-react';
import api from '../../services/api';
import { formatMoney } from '../../utils/marketplace.utils';
import './PaymentConfirmation.css';

type PaymentLink = {
  qrCode?: string; checkoutUrl?: string; accountNumber?: string;
  accountName?: string; amount?: number; paymentStatus?: string;
};
const requests = new Map<string, Promise<PaymentLink>>();
const unwrap = (response: any) => response?.data?.data || response?.data || response;

// React StrictMode and repeated mounts share the same in-flight request.
function createLink(code: string) {
  const active = requests.get(code);
  if (active) return active;
  const request = api.post(`/orders/payos/${encodeURIComponent(code)}/link`, {}, { timeout: 30000 })
    .then(unwrap).finally(() => requests.delete(code));
  requests.set(code, request);
  return request;
}

export function PayosOrderPayment({ orderCode, storeName, onPaid, showOrderHeading = true }: {
  orderCode: string; storeName?: string; onPaid?: () => void; showOrderHeading?: boolean;
}) {
  const [link, setLink] = useState<PaymentLink | null>(null);
  const [qr, setQr] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('WAITING_PAYMENT');
  const [providerStatus, setProviderStatus] = useState('');
  const paidCallback = useRef(onPaid);
  paidCallback.current = onPaid;
  const mounted = useRef(false);

  const prepare = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await createLink(orderCode);
      if (!mounted.current) return;
      if (result.paymentStatus === 'PAID') {
        setStatus('PAID'); paidCallback.current?.();
      } else if (!result.qrCode || !result.checkoutUrl) {
        throw new Error('Chưa nhận được mã QR PayOS. Vui lòng thử lại.');
      }
      setLink(result); setProviderStatus('');
    } catch (err: any) {
      if (err.status === 409) {
        try {
          const result = unwrap(await api.get(`/orders/payos/${encodeURIComponent(orderCode)}/status`, { headers: { 'x-skip-cache': 'true' }, timeout: 30000 }));
          if (mounted.current && result.paymentStatus === 'PAID') {
            setStatus('PAID'); paidCallback.current?.(); return;
          }
        } catch { /* Retain the original creation error for retry. */ }
      }
      if (mounted.current) setError(err.message || 'Không tạo được mã QR. Vui lòng thử lại.');
    } finally { if (mounted.current) setLoading(false); }
  }, [orderCode]);

  useEffect(() => {
    mounted.current = true;
    void prepare();
    return () => { mounted.current = false; };
  }, [prepare]);

  useEffect(() => {
    setQr('');
    if (!link?.qrCode) return;
    let active = true;
    QRCode.toDataURL(link.qrCode, { width: 320, margin: 2 })
      .then(image => { if (active) setQr(image); })
      .catch(() => { if (active) setError('Không hiển thị được QR. Bạn có thể mở trang thanh toán PayOS bên dưới.'); });
    return () => { active = false; };
  }, [link?.qrCode]);

  useEffect(() => {
    if (!link || status === 'PAID') return;
    let active = true;
    let timer: number;
    const check = async () => {
      let finished = false;
      try {
        const result = unwrap(await api.get(`/orders/payos/${encodeURIComponent(orderCode)}/status`, {
          headers: { 'x-skip-cache': 'true' }, timeout: 30000,
        }));
        if (!active) return;
        setError(''); setProviderStatus(result.providerStatus || '');
        if (result.paymentStatus === 'PAID') {
          setStatus('PAID'); paidCallback.current?.(); finished = true;
        } else if (result.orderStatus === 'CANCELLED') {
          setStatus('CANCELLED'); finished = true;
        } else if (['CANCELLED', 'EXPIRED'].includes(result.providerStatus)) {
          finished = true;
        }
      } catch {
        if (active) setError('Tạm thời chưa kiểm tra được thanh toán. Hệ thống sẽ kiểm tra lại tự động.');
      } finally {
        if (active && !finished) timer = window.setTimeout(check, 5000);
      }
    };
    void check();
    return () => { active = false; window.clearTimeout(timer); };
  }, [link, orderCode, status]);

  const expired = ['CANCELLED', 'EXPIRED'].includes(providerStatus);
  return (
    <section className="scanms-payos" aria-label={`Thanh toán PayOS ${orderCode}`}>
      {(showOrderHeading || status === 'PAID') && <div className="scanms-payos-header">
        <div>
          <h3 className="scanms-payos-title">
            {status === 'PAID' ? <CheckCircle2 size={20} className="scanms-payos-paid-icon" /> : <QrCode size={20} />}
            {status === 'PAID' ? 'Đã xác nhận thanh toán' : 'Quét mã QR để thanh toán'}
          </h3>
          <p className="scanms-payos-subtitle">{storeName ? `${storeName} · ` : ''}{orderCode}</p>
        </div>
        {status !== 'PAID' && status !== 'CANCELLED' && <span className="scanms-payos-status"><Clock3 size={12} />{expired ? 'Mã hết hiệu lực' : 'Chờ thanh toán'}</span>}
      </div>}
      {loading && <p className="scanms-payos-message" role="status"><Loader2 size={18} className="animate-spin" />Đang tạo mã thanh toán…</p>}
      {status !== 'PAID' && status !== 'CANCELLED' && !loading && link && !expired && (
        <>
          <div className="scanms-payos-grid">
            <div className="scanms-payos-qr">
              <span className="scanms-payos-qr-label">VIETQR · PAYOS</span>
              <div className="scanms-payos-qr-frame">
                {qr ? <img src={qr} alt={`Mã VietQR cho đơn ${orderCode}`} /> : <p className="scanms-payos-message">Đang chuẩn bị hình ảnh QR…</p>}
              </div>
              <p>Quét mã để chuyển khoản</p>
            </div>
            <div className="scanms-payos-details">
              <div className="scanms-payos-amount-panel">
                <p className="scanms-payos-amount-label">Số tiền cần thanh toán</p>
                <strong className="scanms-payos-amount">{formatMoney(link.amount ?? 0)}</strong>
              </div>
              <dl className="scanms-payos-bank">
                <div><dt>Chủ tài khoản</dt><dd>{link.accountName || 'Xem trên PayOS'}</dd></div>
                <div><dt>Số tài khoản</dt><dd>{link.accountNumber || 'Xem trên PayOS'}</dd></div>
              </dl>
              <ol className="scanms-payos-steps">
                <li><span>1</span>Mở ứng dụng ngân hàng, quét QR.</li>
                <li><span>2</span>Kiểm tra thông tin và chuyển khoản.</li>
                <li><span>3</span>Chờ xác nhận thanh toán tự động.</li>
              </ol>
              <a href={link.checkoutUrl} target="_blank" rel="noopener noreferrer" className="scanms-payment-button scanms-payment-button-primary scanms-payos-open-button"><ExternalLink size={15} />Mở trang thanh toán PayOS</a>
            </div>
          </div>
          <p className="scanms-payos-note"><ShieldCheck size={14} />Trạng thái tự động cập nhật khi PayOS xác nhận đã nhận đủ tiền.</p>
        </>
      )}
      {status === 'PAID' && <p className="scanms-payos-message">PayOS đã xác nhận nhận đủ tiền cho đơn hàng này.</p>}
      {status === 'CANCELLED' && <p className="scanms-payos-message">Đơn hàng đã hủy.</p>}
      {expired && status !== 'PAID' && status !== 'CANCELLED' && <p className="scanms-payos-message">Mã thanh toán đã hết hạn hoặc bị hủy. Bạn có thể tạo mã mới cho đơn này.</p>}
      {error && <p role="alert" className="scanms-payos-error">{error}</p>}
      {!loading && status !== 'PAID' && status !== 'CANCELLED' && (!link || expired) && (
        <button type="button" onClick={() => void prepare()} className="scanms-payment-button scanms-payment-button-primary scanms-payos-retry"><RefreshCw size={14} />Tạo lại mã QR</button>
      )}
    </section>
  );
}
