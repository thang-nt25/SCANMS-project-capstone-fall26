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

  return (
    <div className="grid gap-[12px] min-w-0 text-left">
      {error && (
        <p className="m-0 p-[10px_12px] border border-[#EAE4D7] rounded-[8px] bg-[#FAF8F5] text-[#DC2626] text-[12px] leading-[1.5]" role="alert">
          {error}
        </p>
      )}
      {ready && available === false ? (
        <p className="m-0 text-[12px] text-[#7D715E]">Thanh toán payOS hiện chưa sẵn sàng. Vui lòng thử lại sau.</p>
      ) : (
        <>
          {request && !open && (
            <div className="flex items-center flex-wrap gap-[7px] p-[10px_12px] rounded-[8px] bg-[#FBF5EB] border border-[#EEDFC6] text-[#7D715E] text-[12px]" role="status" data-status={request.status}>
              <ShieldCheck size={15} className="text-[#B88E4F]" />
              <strong className="font-[550] text-[#1A1612]">{LABELS[request.status]}</strong>
              <span className="ml-auto font-[600] text-[#1A1612]">{formatMoney(request.amount)}</span>
            </div>
          )}
            <div className="grid items-stretch gap-4 lg:grid-cols-2">
              <div className="flex min-w-0 flex-col gap-5 rounded-2xl border border-[#EAE4D7] bg-white p-4 sm:p-5">
              <div className="flex items-center gap-2.5 border-b border-[#EAE4D7] pb-4">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#FBF5EB] text-xs font-semibold text-[#B88E4F]">1</span>
                <h3 className="m-0 text-sm font-semibold text-[#1A1612]">Số tiền nạp</h3>
                {open && <span className="ml-auto text-xs text-[#7D715E]">Đã tạo mã</span>}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2" role="group" aria-label="Chọn mức nạp payOS">
                {AMOUNTS.map((value) => (
                  <button
                    type="button"
                    key={value}
                    disabled={!ready || creating || open}
                    aria-pressed={(open && request ? String(request.amount) : amount) === String(value)}
                    onClick={() => setAmount(String(value))}
                    className={`min-h-11 p-2 border rounded-xl text-xs sm:text-sm font-semibold cursor-pointer transition disabled:cursor-default ${
                      (open && request ? String(request.amount) : amount) === String(value)
                        ? 'bg-[#FBF5EB] border-[#C59B58] text-[#B88E4F] font-bold shadow-2xs'
                        : 'bg-white border-[#EAE4D7] text-[#1A1612] hover:bg-[#FAF8F5]'
                    }`}
                  >
                    +{value >= 1000000 ? value / 1000000 + 'M' : value / 1000 + 'k'}
                  </button>
                ))}
              </div>

              <div className="flex flex-1 flex-col gap-5">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="cw-payos-amount" className="block text-xs font-semibold text-[#1A1612]">
                      Số tiền muốn nạp
                    </label>
                    <span className="text-[11px] text-[#7D715E]">VNĐ</span>
                  </div>
                  <div className="flex items-center gap-2 min-h-[44px] px-3.5 border border-[#EAE4D7] focus-within:border-[#C59B58] focus-within:ring-2 focus-within:ring-[#C59B58]/15 rounded-xl bg-white transition-all">
                    <input
                      id="cw-payos-amount"
                      type="text"
                      inputMode="numeric"
                      value={amount ? Number(open && request ? request.amount : amount).toLocaleString('vi-VN') : ''}
                      disabled={!ready || creating || open}
                      onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                      placeholder="Tối thiểu 10.000"
                      className="w-full min-w-0 py-3 border-0 outline-none bg-transparent text-[#1A1612] text-2xl font-bold tabular-nums disabled:opacity-100 disabled:text-[#1A1612]"
                    />
                    <span className="text-base font-semibold text-[#7D715E] shrink-0">₫</span>
                  </div>
                </div>

                <p className="m-0 text-xs leading-relaxed text-[#7D715E]">{open ? 'Đổi số tiền để tạo mã thanh toán mới.' : 'Chọn mức nạp hoặc nhập số tiền của bạn.'}</p>
                <div className="mt-auto grid gap-3 pt-3">
                  <button
                    type="button"
                    className="inline-flex w-full items-center justify-center gap-2 min-h-[48px] px-5 py-3 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] hover:bg-[#F3EFE6] text-[#1A1612] text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-wait transition-colors"
                    disabled={!ready || creating || changingAmount || checking || available !== true}
                    onClick={() => void (open ? changeAmount() : createPayment())}
                  >
                    {!ready || creating || changingAmount ? <RefreshCw size={15} className="animate-spin" /> : open ? <ArrowLeft size={15} /> : <QrCode size={15} />}
                    <span role="status">{!ready ? 'Đang kiểm tra payOS…' : changingAmount ? 'Đang đổi...' : creating ? 'Đang tạo mã...' : open ? 'Đổi số tiền nạp' : 'Tạo mã nạp tiền'}</span>
                  </button>
                </div>
              </div>
              </div>
              {!open && <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-2xl border border-[#EAE4D7] bg-[#FAF8F5] p-5 text-center">
                <span className="grid size-16 place-items-center rounded-2xl border border-[#EAE4D7] bg-white text-[#C59B58]"><QrCode size={32} strokeWidth={1.5} /></span>
                <strong className="text-sm font-semibold text-[#1A1612]">Mã thanh toán sẽ hiện tại đây</strong>
                <p className="m-0 max-w-[260px] text-xs leading-relaxed text-[#7D715E]">Số dư cập nhật sau khi hệ thống xác nhận thanh toán.</p>
              </div>}
          {open && request && (
            <>
              <div className="grid content-start gap-4 min-w-0 w-full p-4 sm:p-5 border border-[#EAE4D7] rounded-2xl bg-white @container">
                <div className="flex items-center gap-2.5 border-b border-[#EAE4D7] pb-4">
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#FBF5EB] text-xs font-semibold text-[#B88E4F]">2</span>
                  <h3 className="m-0 text-sm font-semibold text-[#1A1612]">Thanh toán QR</h3>
                  <span className="ml-auto text-xs font-medium text-[#B88E4F]">payOS</span>
                </div>
                <div className="grid items-center gap-4 @min-[380px]:grid-cols-[160px_minmax(0,1fr)]">
                <div className="grid content-start justify-items-center gap-2 justify-self-center">
                  {qrImage ? (
                    <img src={qrImage} alt="Mã QR nạp tiền payOS" className="block size-[160px] max-w-full border border-[#EAE4D7] rounded-xl bg-white [image-rendering:pixelated]" />
                  ) : (
                    <div className="grid place-content-center justify-items-center gap-2 size-[160px] max-w-full bg-[#FAF8F5] text-[#7D715E] text-[11px] rounded-xl border border-[#EAE4D7]">
                      <QrCode size={32} />
                      <span>Đang chuẩn bị mã QR</span>
                    </div>
                  )}
                </div>
                <div className="grid content-center gap-3 min-w-0 text-center @min-[380px]:text-left">
                  <div className="justify-self-center @min-[380px]:justify-self-start flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#FBF5EB] border border-[#EEDFC6] text-[11px] text-[#7D715E]" role="status" data-status={request.status}>
                    <ShieldCheck size={13} className="text-[#B88E4F]" />
                    <strong className="text-[#1A1612] font-[550]">{LABELS[request.status]}</strong>
                  </div>
                  <div className="grid gap-1">
                    <span className="text-[11px] text-[#7D715E]">Số tiền nạp</span>
                    <strong className="text-2xl leading-tight font-bold tabular-nums tracking-tight break-words text-[#1A1612]">{formatMoney(request.amount)}</strong>
                  </div>
                  <p className="m-0 text-[11px] text-[#7D715E]">Hết hạn {new Date(request.expiresAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })}</p>
                  <div className="flex flex-wrap gap-[8px] pt-[2px]">
                    <button
                      type="button"
                      className="inline-flex w-full items-center justify-center gap-2 min-h-11 px-3 py-2 border border-[#EEDFC6] rounded-xl bg-white hover:bg-[#FBF5EB] hover:border-[#C59B58] text-[#1A1612] text-xs font-semibold cursor-pointer transition disabled:opacity-50"
                      disabled={checking || changingAmount}
                      onClick={() => void checkPayment(true)}
                    >
                      <RefreshCw size={14} className={checking ? 'animate-spin text-[#B88E4F]' : 'text-[#B88E4F]'} />
                      <span>Kiểm tra thanh toán</span>
                    </button>
                    {request.status === 'CREATING' && error && (
                      <button
                        type="button"
                        className="inline-flex items-center justify-center gap-[6px] min-h-[32px] px-[9px] py-[6px] border border-[#EAE4D7] rounded-[8px] bg-white hover:bg-[#FBF5EB] hover:border-[#C59B58] text-[#1A1612] text-[11px] font-[550] cursor-pointer transition disabled:opacity-50"
                        disabled={creating || checking}
                        onClick={() => void createPayment()}
                      >
                        {creating ? 'Đang tạo lại...' : 'Thử tạo mã lại'}
                      </button>
                    )}
                  </div>
                </div>
                </div>
                  <details key={request.id} className="block border border-[#EAE4D7] rounded-xl overflow-hidden [&[open]>summary_svg]:rotate-180">
                    <summary className="flex items-center gap-2 min-h-11 px-3 py-2 bg-[#FAF8F5] hover:bg-[#FBF5EB] text-xs text-[#7D715E] cursor-pointer list-none select-none [&::-webkit-details-marker]:hidden">
                      <span>Thông tin chuyển khoản</span>
                      <span className="text-[#B88E4F] text-[10px] font-medium ml-auto mr-[4px]">{bank?.shortName || request.bin || ''}</span>
                      <ChevronDown size={13} className="text-[#7D715E] transition-transform duration-200" />
                    </summary>
                    <dl className="grid gap-[9px] m-0 p-[11px_12px] border-t border-[#EAE4D7] bg-[#FAF8F5]">
                      <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-[10px] text-[12px] @max-[599px]:grid-cols-[84px_minmax(0,1fr)] @max-[599px]:text-[11px]">
                        <dt className="text-[#7D715E]">Ngân hàng</dt>
                        <dd className="m-0 text-right font-[550] break-words text-[#1A1612]">{bank?.shortName || request.bin || 'Đang cập nhật'}</dd>
                      </div>
                      <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-[10px] text-[12px] @max-[599px]:grid-cols-[84px_minmax(0,1fr)] @max-[599px]:text-[11px]">
                        <dt className="text-[#7D715E]">Số tài khoản</dt>
                        <dd className="m-0 text-right font-[550] font-mono break-words text-[#1A1612]">{request.accountNumber || 'Đang cập nhật'}</dd>
                      </div>
                      <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-[10px] text-[12px] @max-[599px]:grid-cols-[84px_minmax(0,1fr)] @max-[599px]:text-[11px]">
                        <dt className="text-[#7D715E]">Chủ tài khoản</dt>
                        <dd className="m-0 text-right font-[550] break-words text-[#1A1612]">{request.accountName || 'Đang cập nhật'}</dd>
                      </div>
                      <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-[10px] text-[12px] @max-[599px]:grid-cols-[84px_minmax(0,1fr)] @max-[599px]:text-[11px]">
                        <dt className="text-[#7D715E]">Số tiền</dt>
                        <dd className="m-0 text-right font-[600] break-words text-[#1A1612]">{formatMoney(request.amount)}</dd>
                      </div>
                      <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-[10px] text-[12px] pt-[9px] border-t border-[#EAE4D7] @max-[599px]:grid-cols-[84px_minmax(0,1fr)] @max-[599px]:text-[11px]">
                        <dt className="text-[#7D715E]">Nội dung</dt>
                        <dd className="m-0 flex items-center justify-end gap-[7px] text-[#B88E4F] font-mono font-[550]">
                          <span>{request.description || 'Đang cập nhật'}</span>
                          {request.description && (
                            <button
                              type="button"
                              disabled={changingAmount}
                              onClick={() => void copyDescription()}
                              aria-label="Sao chép nội dung chuyển khoản"
                              className="inline-flex items-center justify-center shrink-0 w-[28px] h-[28px] border border-[#EAE4D7] rounded-[6px] bg-white text-[#B88E4F] hover:border-[#C59B58] transition cursor-pointer"
                            >
                              {copied ? <Check size={13} /> : <Copy size={13} />}
                            </button>
                          )}
                        </dd>
                      </div>
                    </dl>
                  </details>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[#7D715E] text-[11px]">
                    <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} className="text-[#B88E4F]" />Tự cập nhật sau xác nhận</span>
                    {safeCheckout && !changingAmount && (
                      <a href={safeCheckout} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-[4px] text-[#B88E4F] no-underline hover:underline font-medium">
                        <span>Mở payOS</span>
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
              </div>
            </>
          )}
            </div>
        </>
      )}
    </div>
  );
}
