import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, ChevronDown, Copy, ExternalLink, QrCode, RefreshCw, ShieldCheck } from 'lucide-react';
import { walletService, type PayosWalletTopUp } from '../../services/wallet.service';
import { VIETNAM_BANKS } from '../../config/banks.config';
import { formatMoney } from '../../utils/marketplace.utils';
import { toast } from '../../utils/toast';

const OPEN = ['CREATING', 'PENDING', 'UNDERPAID', 'PROCESSING'];
const AMOUNTS = [100000, 200000, 500000, 1000000, 2000000, 5000000];
const LABELS: Record<PayosWalletTopUp['status'], string> = {
  CREATING: 'Đang kiểm tra giao dịch', PENDING: 'Chờ thanh toán', PROCESSING: 'Đang xử lý',
  UNDERPAID: 'Chưa nhận đủ số tiền', PAID: 'Đã nạp tiền vào ví', CANCELLED: 'Giao dịch đã hủy',
  EXPIRED: 'Mã thanh toán đã hết hạn', FAILED: 'Giao dịch không thành công',
};

export default function CustomerPayosTopUp({ onPaid }: { onPaid: () => Promise<void> }) {
  const [, setSearchParams] = useSearchParams();
  const [amount, setAmount] = useState('500000');
  const [request, setRequest] = useState<PayosWalletTopUp | null>(null);
  const [qrImage, setQrImage] = useState('');
  const [available, setAvailable] = useState<boolean | null>(null);
  const [ready, setReady] = useState(false);
  const [creating, setCreating] = useState(false);
  const [checking, setChecking] = useState(false);
  const [changingAmount, setChangingAmount] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const checkingRef = useRef(false);
  const requestRef = useRef<PayosWalletTopUp | null>(null);
  const paidRef = useRef<string | null>(null);
  const onPaidRef = useRef(onPaid);
  const mounted = useRef(false);
  useEffect(() => { onPaidRef.current = onPaid; }, [onPaid]);

  const updateRequest = (next: PayosWalletTopUp | null) => {
    requestRef.current = next;
    setRequest(next);
    if (next) setAmount(String(next.amount));
  };

  useEffect(() => {
    let active = true;
    mounted.current = true;
    const restore = async () => {
      try {
        const availability = await walletService.payosAvailability();
        if (!active) return;
        setAvailable(availability.available);
        if (!availability.available) return;
        const id = new URLSearchParams(window.location.search).get('topup');
        const saved = id ? await walletService.payosTopUpStatus(id) : await walletService.pendingPayosTopUp();
        if (active) {
          updateRequest(saved);
          if (saved?.status === 'PAID') { paidRef.current = saved.id; void onPaidRef.current(); }
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Không thể tải giao dịch payOS.');
      } finally { if (active) setReady(true); }
    };
    void restore();
    return () => { active = false; mounted.current = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setQrImage('');
    if (request?.qrCode && OPEN.includes(request.status)) {
      void QRCode.toDataURL(request.qrCode, { width: 320, margin: 2, errorCorrectionLevel: 'M' })
        .then(image => { if (active) setQrImage(image); })
        .catch(() => { if (active) setError('Không hiển thị được QR. Bạn có thể mở trang thanh toán payOS.'); });
    }
    return () => { active = false; };
  }, [request?.qrCode, request?.status]);

  const checkPayment = async (notify = false) => {
    const current = requestRef.current;
    if (!current || checkingRef.current) return;
    checkingRef.current = true;
    setChecking(true);
    try {
      const next = await walletService.payosTopUpStatus(current.id);
      if (!mounted.current || requestRef.current?.id !== current.id) return;
      updateRequest(next);
      setError('');
      if (next.status === 'PAID' && paidRef.current !== next.id) {
        paidRef.current = next.id;
        toast.success(`Đã nạp ${formatMoney(next.amount)} vào ví qua payOS.`);
        await onPaidRef.current();
      } else if (notify && OPEN.includes(next.status)) {
        toast.info(LABELS[next.status]);
      }
    } catch (err) {
      if (mounted.current) setError(err instanceof Error ? err.message : 'Chưa kiểm tra được thanh toán.');
    } finally { checkingRef.current = false; if (mounted.current) setChecking(false); }
  };

  useEffect(() => {
    if (!request || !OPEN.includes(request.status)) return;
    void checkPayment();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void checkPayment(); }, 8000);
    const checkOnFocus = () => { void checkPayment(); };
    window.addEventListener('focus', checkOnFocus);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', checkOnFocus); };
  }, [request?.id, request?.status]);

  const createPayment = async () => {
    const value = Number(amount);
    if (!Number.isSafeInteger(value) || value < 10000 || value > 50000000) {
      setError('Nhập số tiền từ 10.000 đến 50.000.000 ₫, không có phần thập phân.'); return;
    }
    setCreating(true); setError('');
    try {
      const result = await walletService.createPayosTopUp(value);
      if (mounted.current) {
        updateRequest(result);
        setSearchParams(previous => { previous.set('topup', result.id); return previous; }, { replace: true });
        if (result.status === 'PAID' && paidRef.current !== result.id) {
          paidRef.current = result.id;
          await onPaidRef.current();
        }
      }
    } catch (err) {
      if (mounted.current) setError(err instanceof Error ? err.message : 'Không tạo được mã payOS.');
    } finally { if (mounted.current) setCreating(false); }
  };

  const changeAmount = async () => {
    const current = requestRef.current;
    if (!current || checkingRef.current) return;
    checkingRef.current = true;
    setChangingAmount(true);
    setError('');
    try {
      const result = await walletService.cancelPayosTopUp(current.id);
      if (!mounted.current || requestRef.current?.id !== current.id) return;
      if (result.status === 'PAID') {
        updateRequest(result);
        if (paidRef.current !== result.id) {
          paidRef.current = result.id;
          toast.success(`Đã nạp ${formatMoney(result.amount)} vào ví qua payOS.`);
          await onPaidRef.current();
        }
      } else if (['CANCELLED', 'EXPIRED', 'FAILED'].includes(result.status)) {
        updateRequest(null);
        setQrImage('');
        setCopied(false);
        setSearchParams(previous => { previous.delete('topup'); return previous; }, { replace: true });
        window.requestAnimationFrame(() => document.getElementById('cw-payos-amount')?.focus());
      } else {
        setError('Mã hiện tại chưa được hủy. Vui lòng thử lại.');
      }
    } catch (err) {
      if (mounted.current) setError(err instanceof Error ? err.message : 'Không đổi được số tiền. Vui lòng thử lại.');
    } finally {
      checkingRef.current = false;
      if (mounted.current) setChangingAmount(false);
    }
  };

  const copyDescription = async () => {
    if (!request?.description) return;
    try { await navigator.clipboard.writeText(request.description); setCopied(true); toast.success('Đã sao chép nội dung chuyển khoản.'); }
    catch { toast.error('Không sao chép được. Vui lòng chọn và sao chép nội dung chuyển khoản.'); }
  };
  const open = Boolean(request && OPEN.includes(request.status));
  const bank = VIETNAM_BANKS.find(b => b.bin === request?.bin);
  const safeCheckout = request?.checkoutUrl?.startsWith('https://pay.payos.vn/') ? request.checkoutUrl : null;

  return <div className="cw-payos">
    {error && <p className="cw-payos-error" role="alert">{error}</p>}
    {!ready ? <p className="cw-demo-note" role="status">Đang tải payOS...</p> : available === false ? (
      <p className="cw-demo-note">Thanh toán payOS hiện chưa sẵn sàng. Vui lòng thử lại sau.</p>
    ) : <>
      {request && !open && <div className="cw-payos-status" role="status" data-status={request.status}>
        <ShieldCheck size={15} /><strong>{LABELS[request.status]}</strong><span>{formatMoney(request.amount)}</span>
      </div>}
      {!open && <>
        <div className="cw-quick" role="group" aria-label="Chọn mức nạp payOS">
          {AMOUNTS.map(value => <button type="button" key={value} disabled={creating} aria-pressed={amount === String(value)} onClick={() => setAmount(String(value))}>
            +{value >= 1000000 ? value / 1000000 + 'M' : value / 1000 + 'k'}
          </button>)}
        </div>
        <div className="cw-amount-row">
          <div className="cw-input-wrap"><label htmlFor="cw-payos-amount">Số tiền muốn nạp</label><div className="cw-input">
            <input id="cw-payos-amount" type="number" min={10000} max={50000000} step={10000} value={amount} disabled={creating} onChange={e => setAmount(e.target.value)} /><span>VNĐ</span>
          </div></div>
          <button type="button" className="cw-button cw-primary" disabled={creating || available !== true} onClick={() => void createPayment()}>
            {creating ? <RefreshCw size={15} className="animate-spin" /> : <QrCode size={15} />}{creating ? 'Đang tạo mã...' : 'Tạo mã payOS'}
          </button>
        </div>
        <p className="cw-demo-note">Quét mã bằng ứng dụng ngân hàng để nạp tiền vào ví SCANMS.</p>
      </>}
      {open && request && <>
        <div className="cw-payos-payment">
          <div className="cw-payos-qr">
            {qrImage ? <img src={qrImage} alt="Mã QR nạp tiền payOS" /> : <div className="cw-payos-qr-placeholder"><QrCode size={32} /><span>Đang chuẩn bị mã QR</span></div>}
            <span><ShieldCheck size={13} /> Thanh toán qua payOS</span>
          </div>
          <div className="cw-payos-transfer">
            <div className="cw-payos-status" role="status" data-status={request.status}><ShieldCheck size={13} /><strong>{LABELS[request.status]}</strong></div>
            <div className="cw-payos-total"><span>Số tiền nạp</span><strong>{formatMoney(request.amount)}</strong></div>
            <p className="cw-demo-note">Quét QR bằng ứng dụng ngân hàng.</p>
            <div className="cw-payos-links">
              <button type="button" className="cw-button cw-change-amount" disabled={checking || changingAmount || creating} onClick={() => void changeAmount()}>
                {changingAmount ? <RefreshCw size={14} className="animate-spin" /> : <ArrowLeft size={14} />}{changingAmount ? 'Đang đổi...' : 'Đổi số tiền'}
              </button>
              <button type="button" className="cw-button" disabled={checking || changingAmount} onClick={() => void checkPayment(true)}><RefreshCw size={14} className={checking ? 'animate-spin' : ''} />Kiểm tra thanh toán</button>
              {request.status === 'CREATING' && error && <button type="button" className="cw-button" disabled={creating || checking} onClick={() => void createPayment()}>{creating ? 'Đang tạo lại...' : 'Thử tạo mã lại'}</button>}
            </div>
            <details key={request.id} className="cw-payos-details">
              <summary><span>Thông tin chuyển khoản</span><span className="cw-payos-bank-name">{bank?.shortName || request.bin || ''}</span><ChevronDown size={13} /></summary>
              <dl>
                <div><dt>Ngân hàng</dt><dd>{bank?.shortName || request.bin || 'Đang cập nhật'}</dd></div>
                <div><dt>Số tài khoản</dt><dd>{request.accountNumber || 'Đang cập nhật'}</dd></div>
                <div><dt>Chủ tài khoản</dt><dd>{request.accountName || 'Đang cập nhật'}</dd></div>
                <div><dt>Số tiền</dt><dd>{formatMoney(request.amount)}</dd></div>
                <div className="cw-payos-description"><dt>Nội dung</dt><dd>{request.description || 'Đang cập nhật'}{request.description && <button type="button" disabled={changingAmount} onClick={() => void copyDescription()} aria-label="Sao chép nội dung chuyển khoản">{copied ? <Check size={13} /> : <Copy size={13} />}</button>}</dd></div>
              </dl>
            </details>
            <div className="cw-payos-footer">
              <span>Hạn: {new Date(request.expiresAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })}</span>
              {safeCheckout && !changingAmount && <a href={safeCheckout} target="_blank" rel="noopener noreferrer">Mở payOS<ExternalLink size={11} /></a>}
            </div>
            <p className="cw-payos-auto-note">Ví tự cập nhật khi payOS xác nhận.</p>
          </div>
        </div>
      </>}
    </>}
  </div>;
}
