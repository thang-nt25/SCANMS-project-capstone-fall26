import { useEffect, useRef, useState } from 'react';
import { useSandboxSampleState, sandboxSampleStatusLabel } from './useSandboxSampleState';
import api from '../../services/api';
import { createPortal } from 'react-dom';
import { CheckCircle2, Circle, Loader2, PackageCheck, Video } from 'lucide-react';
import { SubmitKolVideoModal } from '../media/SubmitKolVideoModal';

const deliverySteps = [
  { key: 'WAITING_PICKUP', title: 'Chờ bưu tá lấy hàng', offset: 0 },
  { key: 'IN_TRANSIT', title: 'Đang vận chuyển', offset: 60_000 },
  { key: 'DELIVERED', title: 'Đã giao thành công', offset: 120_000 },
] as const;

const formatDateTime = (value?: string | null) => value && Number.isFinite(Date.parse(value))
  ? new Date(value).toLocaleString('vi-VN')
  : 'Chưa cập nhật';

function DeliveryCountdown({ at }: { at: number }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.ceil((at - Date.now()) / 1000)));
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      clearTimeout(timer);
      const milliseconds = Math.max(0, at - Date.now());
      setRemaining(Math.ceil(milliseconds / 1000));
      if (milliseconds > 0) timer = setTimeout(tick, Math.max(20, milliseconds % 1000 || 1000));
    };
    const onVisible = () => { if (!document.hidden) tick(); };
    tick();
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [at]);
  return <span data-countdown-seconds={remaining} className="tabular-nums" aria-live="off">
    {remaining > 0 ? <>Tự cập nhật sau <span className="inline-block min-w-[2ch] font-medium">{remaining}</span> giây</> : 'Đang đồng bộ trạng thái…'}
  </span>;
}

export function SandboxSampleReceipt({ code, role, productId, productTitle, sampleRequestId, expanded = false, hideStatusSummary = false, hideTestingControls = false }: {
  code: string;
  role: 'shop' | 'kol';
  productId?: string;
  productTitle?: string;
  sampleRequestId?: string;
  expanded?: boolean;
  hideStatusSummary?: boolean;
  hideTestingControls?: boolean;
}) {
  const { state, setState, error: trackingError } = useSandboxSampleState(code);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [revisionFormOpen, setRevisionFormOpen] = useState(false);
  const [revisionReason, setRevisionReason] = useState('');
  const decisionPending = useRef(false);

  async function reviewVideo(status: 'APPROVED' | 'REJECTED') {
    if (decisionPending.current || !state?.videoUrl || state.status !== 'VIDEO_SUBMITTED') return;
    if (status === 'REJECTED' && revisionReason.trim().length < 5) {
      setError('Vui lòng nhập lý do cần sửa video (ít nhất 5 ký tự).');
      return;
    }
    decisionPending.current = true;
    setBusy(true);
    setError('');
    try {
      const response: any = await api.post(`/shipping/ghn/sandbox-sample/${encodeURIComponent(code)}/review-video`, {
        status, videoUrl: state.videoUrl, revision: state.videoRevision || 1,
        ...(status === 'REJECTED' ? { rejectionReason: revisionReason.trim() } : {}),
      });
      setState(response?.data?.data || response?.data || response);
      setRevisionFormOpen(false);
      setRevisionReason('');
    } catch (err: any) {
      setError(String(err?.response?.data?.message || 'Chưa lưu được kết quả nghiệm thu. Vui lòng thử lại.'));
    } finally {
      decisionPending.current = false;
      setBusy(false);
    }
  }

  async function submit(action: 'start' | 'expire') {
    setBusy(true);
    setError('');
    try {
      const res: any = await api.post(`/shipping/ghn/sandbox-sample/${encodeURIComponent(code)}/${action}`, {});
      setState(res?.data?.data || res?.data || res);
    } catch (err: any) {
      setError(String(err?.response?.data?.message || 'Không lưu được thao tác.'));
    } finally {
      setBusy(false);
    }
  }

  const displayError = error || trackingError;
  const simulationStartedAt = state?.simulationStartedAt;
  const deliveryIndex = deliverySteps.findIndex(step => step.key === (state?.deliveryStatus || (state?.receivedAt ? 'DELIVERED' : 'NOT_STARTED')));
  const delivered = Boolean(state?.receivedAt);
  const overdue = state?.status === 'OVERDUE';
  const needsVideo = !state?.videoUrl || state?.status === 'REVISION_REQUIRED';

  return (
    <section
      className="sample-receipt text-xs text-[#1A1612]"
      aria-label="Tiến độ giao hàng đơn mẫu"
    >
      {(!hideStatusSummary || (role === 'kol' && delivered && !state?.videoUrl) || (role === 'shop' && !simulationStartedAt && !delivered)) && <div className="sample-receipt-overview flex flex-wrap items-center justify-between gap-2 pl-[46px]">
        {!hideStatusSummary && <div className="min-w-0">
          <div>
            <p className={overdue && !state?.videoUrl ? 'm-0 text-xs font-semibold text-[#DC2626]' : 'm-0 text-xs font-semibold text-[#231D15]'} role="status">
              {sandboxSampleStatusLabel(state)}
            </p>
            {state?.deadlineAt && !state.videoUrl && <p className="mt-0.5 text-[11px] text-[#7D715E]">Hạn video: {formatDateTime(state.deadlineAt)}</p>}
          </div>
        </div>}
        <div className="flex items-center gap-2">
          {role === 'shop' && !simulationStartedAt && !delivered && <button type="button" disabled={busy || !state} onClick={() => void submit('start')} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#C59B58] px-3 text-[11px] font-semibold text-[#231D15] hover:bg-[#B88E4F] disabled:opacity-50">{busy ? <Loader2 size={14} className="animate-spin" /> : <PackageCheck size={14} />}Bắt đầu hành trình</button>}
          {role === 'kol' && delivered && needsVideo && <button type="button" onClick={() => setVideoModalOpen(true)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#C59B58] px-3 text-[11px] font-semibold text-[#231D15] hover:bg-[#B88E4F]"><Video size={14} />{state?.status === 'REVISION_REQUIRED' ? 'Nộp lại video kiểm thử' : 'Nộp video kiểm thử'}</button>}
        </div>
      </div>}
      {state?.videoUrl && <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 pl-[46px]">
        <a
          href={state.videoUrl}
          target="_blank"
          rel="noreferrer"
          data-sandbox-video-link={code}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-3 py-2 text-xs font-semibold text-[#795A2D] hover:border-[#C59B58] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C59B58]"
        ><Video size={14} aria-hidden="true" />Xem video đã nộp</a>
        <span className="text-[11px] text-[#7D715E]">{state.status === 'COMPLETED' ? 'Video sandbox · đã nghiệm thu' : state.status === 'REVISION_REQUIRED' ? 'Video sandbox · cần chỉnh sửa' : 'Video sandbox · chờ Shop nghiệm thu'}</span>
      </div>}
      {state?.videoReview?.rejectionReason && <p className="mb-0 mt-2 pl-[46px] text-xs text-[#DC2626]">Yêu cầu chỉnh sửa: {state.videoReview.rejectionReason}</p>}
      {role === 'shop' && state?.videoUrl && state.status === 'VIDEO_SUBMITTED' && <div className="ml-[46px] mt-3 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3" data-sandbox-video-review={code}>
        <p className="m-0 text-[11px] leading-relaxed text-[#7D715E]">Nghiệm thu kiểm thử chỉ áp dụng cho vận đơn sandbox này, không đăng video công khai hoặc giải ngân thù lao.</p>
        {revisionFormOpen && <label className="mt-2 block text-xs font-semibold text-[#1A1612]">Nội dung cần KOL chỉnh sửa
          <textarea value={revisionReason} onChange={event => setRevisionReason(event.target.value)} maxLength={2000} disabled={busy} rows={3} className="mt-1 w-full rounded-lg border border-[#EAE4D7] bg-white p-2 font-normal outline-none focus:border-[#C59B58]" />
        </label>}
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => revisionFormOpen ? void reviewVideo('REJECTED') : setRevisionFormOpen(true)} className="min-h-9 rounded-lg border border-[#EEDFC6] bg-white px-3 py-2 text-xs font-semibold text-[#795A2D] disabled:opacity-50">{revisionFormOpen ? 'Gửi yêu cầu sửa' : 'Yêu cầu sửa (sandbox)'}</button>
          {revisionFormOpen ? <button type="button" disabled={busy} onClick={() => setRevisionFormOpen(false)} className="px-3 py-2 text-xs text-[#7D715E]">Hủy</button>
            : <button type="button" disabled={busy} onClick={() => void reviewVideo('APPROVED')} className="min-h-9 rounded-lg bg-[#C59B58] px-3 py-2 text-xs font-semibold text-[#231D15] hover:bg-[#B88E4F] disabled:opacity-50">{busy ? 'Đang lưu...' : 'Nghiệm thu (sandbox)'}</button>}
        </div>
      </div>}
      {expanded && <div className="sample-receipt-details mt-3 space-y-2 border-t border-[#EAE4D7] pt-3">
        {simulationStartedAt ? (
          <ol className="sample-delivery-steps grid grid-cols-3 py-1" aria-label="Các mốc giao hàng">
            {deliverySteps.map((step, index) => {
              const done = deliveryIndex >= index;
              const current = done && index === deliveryIndex && !delivered;
              const at = new Date(Date.parse(simulationStartedAt) + step.offset);
              const nextStep = index === deliveryIndex + 1;

              return (
                <li
                  key={step.key}
                  data-complete={done}
                  aria-current={current ? 'step' : undefined}
                  className="relative flex min-w-0 flex-col items-center gap-1.5 px-1 text-center"
                >
                  {index < deliverySteps.length - 1 && <span aria-hidden="true" className={`absolute left-1/2 top-2 h-px w-full ${deliveryIndex > index ? 'bg-[#C59B58]' : 'bg-[#EAE4D7]'}`} />}
                  {done
                    ? <CheckCircle2 size={17} className={`relative shrink-0 rounded-full bg-white ${current ? 'text-[#B88E4F]' : 'text-[#C59B58]'}`} aria-hidden="true" />
                    : <Circle size={17} className="relative shrink-0 rounded-full bg-white text-[#B8AE9E]" aria-hidden="true" />}
                  <span className="min-w-0">
                    <strong className={`block text-[11px] leading-snug ${done ? 'text-[#795A2D]' : 'text-[#7D715E]'}`}>{step.title}</strong>
                    <small className="mt-1 block text-[10px] leading-snug text-[#7D715E]">
                      {done
                        ? at.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        : nextStep ? <DeliveryCountdown at={at.getTime()} /> : 'Đang chờ'}
                    </small>
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="flex items-start gap-3 rounded-xl border border-dashed border-[#EEDFC6] bg-[#FFFCF7] px-3.5 py-3">
            <PackageCheck size={17} className="mt-0.5 shrink-0 text-[#B88E4F]" aria-hidden="true" />
            <div>
              <p className="m-0 text-xs font-semibold text-[#231D15]">Sẵn sàng bắt đầu hành trình</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-[#7D715E]">Các mốc giao hàng và thời hạn video sẽ tính từ lúc Shop bắt đầu.</p>
            </div>
          </div>
        )}

        {state?.videoUrl && <a href={state.videoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#795A2D] underline underline-offset-2"><Video size={14} aria-hidden="true" />Video Review</a>}
        {!hideTestingControls && role === 'shop' && delivered && !state?.videoUrl && !overdue && <details className="text-[11px] text-[#7D715E]">
          <summary className="w-fit cursor-pointer rounded-md py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C59B58]">Kiểm thử quá hạn video</summary>
          <button type="button" disabled={busy} onClick={() => void submit('expire')} className="mt-1 rounded-lg border border-[#EAE4D7] px-2.5 py-2 text-[11px] font-medium text-[#795A2D] hover:bg-[#FBF5EB] disabled:opacity-50">Chuyển quá hạn</button>
        </details>}

        {displayError && <p role="alert" className="m-0 rounded-lg border border-[#FECACA] bg-[#FFF8F7] px-3 py-2 text-xs text-[#DC2626]">{displayError}</p>}
      </div>}
      {!expanded && displayError && <p role="alert" className="mt-2 text-xs text-[#DC2626]">{displayError}</p>}

      {videoModalOpen && createPortal(
        <SubmitKolVideoModal
          isOpen
          initialProductId={productId}
          initialProductTitle={productTitle}
          sampleRequestId={sampleRequestId}
          sandboxOrderCode={code}
          onClose={() => setVideoModalOpen(false)}
          onSuccess={(response: any) => {
            setState(response?.data?.data || response?.data || response);
            setVideoModalOpen(false);
          }}
        />,
        document.body,
      )}
    </section>
  );
}
