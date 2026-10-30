import { useEffect, useId, useRef, useState } from 'react';
import { Truck, RefreshCw, Phone, Check, Clock, PackageCheck, UserRound, ChevronDown } from 'lucide-react';
import api from '../../services/api';
import { GHN_MILESTONES } from '../../utils/ghn-tracking';

export interface TrackingEvent {
  status: string; title: string; time: string | null;
  warehouse?: string | null; shipperName?: string | null; shipperPhone?: string | null;
}
interface Tracking {
  orderCode: string; status: string; statusText: string; environment?: 'LIVE' | 'TEST';
  trackingError?: 'ORDER_NOT_FOUND' | null; expectedDeliveryTime: string | null;
  shipperName: string | null; shipperPhone: string | null; timeline: TrackingEvent[];
  isStale?: boolean; lastCheckedAt?: string | null; lastKnownStatusText?: string | null;
  isSimulation?: boolean; nextEventAt?: string | null;
  shipperPhoneDisplay?: string | null; shipperCanCall?: boolean;
}
const formatTime = (value?: string | null) => value && Number.isFinite(Date.parse(value))
  ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : null;
const phoneHref = (phone: string) => `tel:${phone.replace(/[^+\d]/g, '')}`;

export function GhnTrackingTimeline({ orderCode, sampleRequestId, onSampleDelivered, onTrackingStatusChange, onTimelineChange, environment }: {
  orderCode: string; sampleRequestId?: string; onSampleDelivered?: () => void;
  onTrackingStatusChange?: (status: string, isFresh: boolean) => void;
  onTimelineChange?: (events: TrackingEvent[]) => void;
  environment?: 'LIVE' | 'TEST';
}) {
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [journeyExpanded, setJourneyExpanded] = useState(true);
  const journeyDetailsId = useId();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const [lastPollAt, setLastPollAt] = useState<number | null>(null);
  const [pollIntervalMs, setPollIntervalMs] = useState(30000);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [serverClockOffset, setServerClockOffset] = useState(0);
  const deliveredCallback = useRef(onSampleDelivered);
  deliveredCallback.current = onSampleDelivered;
  const trackingStatusCallback = useRef(onTrackingStatusChange);
  trackingStatusCallback.current = onTrackingStatusChange;
  const timelineCallback = useRef(onTimelineChange);
  timelineCallback.current = onTimelineChange;
  const syncedSample = useRef('');
  const previousCode = useRef('');
  useEffect(() => { setJourneyExpanded(true); }, [orderCode, environment, sampleRequestId]);

  useEffect(() => {
    const clock = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(clock);
  }, []);

  useEffect(() => {
    let active = true, inFlight = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let simulation = false;
    const controller = new AbortController();
    const trackingKey = `${environment || 'AUTO'}:${orderCode}:${sampleRequestId || ''}`;
    if (previousCode.current !== trackingKey) { setTracking(null); previousCode.current = trackingKey; syncedSample.current = ''; }
    setError('');
    const fetchTracking = async () => {
      if (!active || inFlight || document.hidden) return;
      clearTimeout(timer); inFlight = true; setBusy(true);
      let terminal = false;
      let pollInterval = simulation ? 5000 : 30000;
      try {
        const response: any = await api.get(`/shipping/ghn/track/${encodeURIComponent(orderCode)}`, {
          params: environment ? { environment } : undefined,
          headers: { 'x-skip-cache': 'true' }, signal: controller.signal,
        });
        const data = response?.data?.data || response?.data || response;
        if (!data || typeof data.status !== 'string' || !Array.isArray(data.timeline)) throw new Error('Invalid tracking response');
        if (!active) return;
        setTracking(data); setError('');
        timelineCallback.current?.(data.timeline);
        const serverNow = Date.parse(data.lastCheckedAt || '');
        setServerClockOffset(Number.isFinite(serverNow) ? serverNow - Date.now() : 0);
        trackingStatusCallback.current?.(data.status, !data.isStale);
        simulation = Boolean(data.isSimulation);
        pollInterval = simulation ? 5000 : 30000;
        const nextEvent = Date.parse(data.nextEventAt || '');
        if (simulation && Number.isFinite(nextEvent) && Number.isFinite(serverNow)) {
          // Refresh at the next saved milestone, without trusting the device clock
          // or marking a delivery complete before the API confirms it.
          pollInterval = Math.min(pollInterval, Math.max(1000, nextEvent - serverNow + 150));
        }
        terminal = !data.isStale && ['delivered', 'returned', 'cancel', 'lost', 'damage', 'scrap'].includes(data.status);
        if (sampleRequestId && environment !== 'TEST' && data.environment !== 'TEST' && data.status === 'delivered' && !data.isStale && syncedSample.current !== sampleRequestId) {
          try {
            const response: any = await api.post(`/shipping/ghn/sync-sample/${encodeURIComponent(sampleRequestId)}`);
            const receipt = response?.data?.data || response?.data || response;
            if (active && ['RECEIVED', 'VIDEO_SUBMITTED', 'REVISION_REQUIRED', 'OVERDUE', 'COMPLETED'].includes(receipt?.status)) {
              syncedSample.current = sampleRequestId; deliveredCallback.current?.();
            } else if (active) {
              terminal = false;
              setError('GHN báo đã giao; hệ thống đang xác minh thời điểm nhận mẫu. Hạn video chưa bắt đầu.');
            }
          } catch { terminal = false; if (active) setError('Đã tải hành trình; chưa đồng bộ được xác nhận nhận mẫu. Hệ thống sẽ thử lại.'); }
        }
      } catch {
        if (active) setError('Chưa cập nhật được hành trình từ GHN. Dữ liệu đang hiển thị có thể chưa phải mới nhất.');
      } finally {
        inFlight = false;
        if (active) {
          setBusy(false);
          setLastPollAt(Date.now());
          setPollIntervalMs(pollInterval);
          if (!terminal) timer = setTimeout(fetchTracking, pollInterval);
        }
      }
    };
    const onVisible = () => { if (!document.hidden) void fetchTracking(); };
    document.addEventListener('visibilitychange', onVisible);
    void fetchTracking();
    return () => { active = false; clearTimeout(timer); controller.abort(); document.removeEventListener('visibilitychange', onVisible); };
  }, [orderCode, sampleRequestId, reload, environment]);

  const milestones = tracking?.isSimulation
    ? [{ title: 'Chờ lấy hàng', statuses: ['ready_to_pick', 'picking'] }, ...GHN_MILESTONES]
    : [{ title: 'Chờ bưu tá lấy hàng tại Shop', statuses: ['ready_to_pick', 'picking', 'money_collect_picking'] }, ...GHN_MILESTONES];
  const pending = tracking?.status === 'unavailable';
  const terminalStatuses = ['delivered', 'returned', 'cancel', 'lost', 'damage', 'scrap'];
  const refreshCountdown = tracking && lastPollAt !== null &&
    !(terminalStatuses.includes(tracking.status) && !tracking.isStale)
    ? Math.max(0, Math.ceil((lastPollAt + pollIntervalMs - clockNow) / 1000))
    : null;
  const nextEventTime = Date.parse(tracking?.nextEventAt || '');
  const milestoneCountdown = tracking?.isSimulation && !tracking.isStale && !terminalStatuses.includes(tracking.status) && Number.isFinite(nextEventTime)
    ? Math.max(0, Math.ceil((nextEventTime - (clockNow + serverClockOffset)) / 1000))
    : null;
  const refreshLabel = busy
    ? <>Đang làm mới…</>
    : milestoneCountdown !== null
      ? milestoneCountdown > 0
        ? <>Mốc tiếp theo sau <strong>{milestoneCountdown}</strong> giây</>
        : <>Đang chờ cập nhật mốc mới…</>
    : refreshCountdown !== null
      ? <>Kiểm tra GHN sau <strong>{refreshCountdown}</strong> giây</>
      : <>{tracking?.isSimulation ? 'Đã hoàn tất' : 'GHN đã kết thúc hành trình'}</>;
  const trackingNote = !tracking
    ? ''
    : tracking.isStale || error
      ? 'Dữ liệu có thể chưa cập nhật'
      : tracking.isSimulation && tracking.status !== 'delivered'
        ? 'Mỗi mốc cách nhau 1 phút; tự cập nhật khi đến mốc'
        : '';
  return (
    <section className="ghn-journey min-w-0 rounded-2xl border border-[#EAE4D7] bg-white p-[18px] text-[12px] text-[#1A1612] [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-[3px] [&_button:focus-visible]:outline-[#B88E4F] [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-[3px] [&_a:focus-visible]:outline-[#B88E4F] [&_summary:focus-visible]:outline-2 [&_summary:focus-visible]:outline-offset-[3px] [&_summary:focus-visible]:outline-[#B88E4F] [&_button:disabled]:text-[#7D715E] [&_button:disabled]:opacity-60 [&_button:disabled]:cursor-default [@media(max-width:480px)]:p-3.5 [.ghn-tracking-dialog_&]:rounded-none [.ghn-tracking-dialog_&]:border-0 [.ghn-tracking-dialog_&]:p-0" aria-label={`Hành trình GHN ${orderCode}`}>
      <div className="ghn-journey__header flex items-center gap-[11px]">
        <span className="ghn-journey__carrier-icon flex shrink-0 items-center justify-center text-[#8C6B32] size-[42px] rounded-xl bg-[#FBF5EB]"><Truck size={21} aria-hidden="true" /></span>
        <div className="ghn-journey__identity min-w-0 flex-1 [&_strong]:text-[13px] [&_p]:mt-[3px] [&_p]:text-[11px] [&_p]:text-[#7D715E] [&_code]:ml-[5px] [&_code]:font-semibold [&_code]:text-[#231D15] [&_code]:[overflow-wrap:anywhere]"><strong>Giao Hàng Nhanh</strong><p>Mã vận đơn <code>{orderCode}</code></p></div>
        <button type="button" disabled={busy} onClick={() => setReload(value => value + 1)} className="ghn-journey__refresh inline-flex min-h-9 cursor-pointer items-center justify-center gap-[7px] whitespace-nowrap rounded-[9px] border border-[#EAE4D7] bg-white px-[11px] py-2 text-[11px] font-semibold text-[#795A2D] no-underline transition-[background] duration-150 ease-[ease] hover:bg-[#FBF5EB] [@media(max-width:480px)]:[&>span]:hidden" aria-label={busy ? 'Đang cập nhật' : 'Làm mới'} title="Cập nhật hành trình"><RefreshCw size={15} className={busy ? 'animate-spin' : ''} /><span>Làm mới</span></button>
      </div>
      {(error || pending || tracking?.isStale) && <div role="status" className="mt-2.5 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] p-2.5 text-[11px] leading-relaxed text-[#7D715E]">
        {tracking?.trackingError === 'ORDER_NOT_FOUND' ? 'GHN không tìm thấy vận đơn này. Vui lòng liên hệ Shop kiểm tra mã vận đơn.' : error || 'GHN chưa trả dữ liệu mới. Lịch sử lưu trước đó chỉ dùng để tham khảo.'}
        {sampleRequestId && <p className="m-0">Chỉ xác nhận nhận mẫu và bắt đầu hạn nộp video sau khi kiểm tra giao thành công với GHN.</p>}
      </div>}
      {!tracking && !error && <p className="text-[#7D715E]">Đang tra cứu GHN...</p>}
      {tracking && <div aria-live="polite">
        <div className="ghn-journey__status mt-3.5 flex items-center gap-3 rounded-xl bg-[#FBF5EB] p-[15px] [&_h4]:my-[3px] [&_h4]:text-base [&_h4]:font-bold [&_h4]:leading-[1.35] [&_p]:text-[10px] [&_p]:text-[#7D715E] [@media(max-width:480px)]:p-3 [@media(max-width:480px)]:[&_h4]:text-[15px]">
          <span className="ghn-journey__status-icon flex shrink-0 items-center justify-center text-[#8C6B32] size-10 rounded-full border border-[#EEDFC6] bg-white">{tracking.status === 'delivered' && !pending ? <PackageCheck size={25} /> : <Truck size={25} />}</span>
          <div><span className="ghn-journey__caption text-[10px] font-normal text-[#7D715E]">{tracking.isSimulation ? 'Trạng thái mô phỏng' : tracking.isStale || pending ? 'Trạng thái lưu trước đó' : 'Trạng thái bưu kiện'}</span><h4>{pending ? tracking.lastKnownStatusText || 'Chưa có trạng thái GHN' : tracking.statusText}</h4>
            {tracking.status === 'delivered'
              ? formatTime(tracking.timeline.find(event => event.status === 'delivered')?.time) && <p>Hoàn tất lúc {formatTime(tracking.timeline.find(event => event.status === 'delivered')?.time)}</p>
              : formatTime(tracking.expectedDeliveryTime) && <p>Dự kiến: {formatTime(tracking.expectedDeliveryTime)}</p>}
          </div>
        <button type="button" aria-expanded={journeyExpanded} aria-controls={journeyDetailsId}
          onClick={() => setJourneyExpanded(value => !value)}
          className="ghn-journey__toggle ml-auto shrink-0 inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-[#EAE4D7] bg-white px-3 py-1.5 text-[11px] font-medium text-[#795A2D] hover:bg-[#FAF8F5] cursor-pointer">
          {journeyExpanded ? 'Thu gọn' : 'Xem hành trình'}<ChevronDown size={14} aria-hidden="true" className={journeyExpanded ? 'rotate-180' : ''} />
        </button>
        </div>
        <div id={journeyDetailsId} hidden={!journeyExpanded}>
        <ol className="ghn-journey__steps my-[17px] list-none p-0" aria-label="Các mốc giao hàng">
          {milestones.map(stage => {
            const evidence = tracking.timeline.find(event => stage.statuses.includes(event.status));
            const current = !pending && stage.statuses.includes(tracking.status);
            const confirmed = Boolean(evidence || current);
            return <li key={stage.title} className={`ghn-journey__step relative grid grid-cols-[22px_minmax(0,1fr)_auto] items-start gap-x-2.5 pb-[19px] text-[#7D715E] last:pb-0 [&:not(:last-child)]:before:absolute [&:not(:last-child)]:before:left-2.5 [&:not(:last-child)]:before:top-[23px] [&:not(:last-child)]:before:bottom-0.5 [&:not(:last-child)]:before:w-px [&:not(:last-child)]:before:bg-[#EAE4D7] [&:not(:last-child)]:before:content-[''] [&.is-confirmed:not(:last-child)]:before:bg-[#EEDFC6] [&.is-confirmed>:first-child]:text-[#795A2D] [&.is-confirmed>:first-child]:border-[#EEDFC6] [&.is-confirmed>:first-child]:bg-[#FBF5EB] [&.is-current>:first-child]:text-[#231D15] [&.is-current>:first-child]:bg-(--color-brand) [&.is-current>:first-child]:border-[#C59B58] [&.is-confirmed>:nth-child(2)]:text-[#231D15] [&.is-current>:nth-child(2)]:font-bold [@media(max-width:480px)]:grid-cols-[22px_minmax(0,1fr)] [@media(max-width:480px)]:[&:not(:last-child)]:pb-[15px] ${confirmed ? 'is-confirmed' : ''} ${current ? 'is-current' : ''}`} aria-current={current ? 'step' : undefined}>
              <span className="ghn-journey__step-icon flex size-[22px] items-center justify-center rounded-full border border-[#EAE4D7] bg-[#FAF8F5]">{confirmed ? <Check size={13} /> : <Clock size={12} />}</span>
              <p className="ghn-journey__step-title pt-[3px] text-[11px] font-medium leading-[1.5]">{stage.title}</p><span className="ghn-journey__step-time max-w-[150px] pt-1 text-right text-[10px] leading-[1.5] tabular-nums [@media(max-width:480px)]:col-start-2 [@media(max-width:480px)]:max-w-none [@media(max-width:480px)]:pt-0.5 [@media(max-width:480px)]:text-left">{formatTime(evidence?.time) || (current ? tracking.isStale ? 'Trạng thái lưu trước đó' : tracking.isSimulation ? 'Trạng thái mô phỏng hiện tại' : 'Trạng thái hiện tại theo GHN' : evidence ? 'GHN chưa cung cấp thời gian' : tracking.isSimulation ? stage.statuses.includes('delivered') && formatTime(tracking.expectedDeliveryTime) ? `Dự kiến ${formatTime(tracking.expectedDeliveryTime)}` : 'Chờ đến mốc mô phỏng' : 'Chưa có xác nhận từ GHN')}</span>
            </li>;
          })}
        </ol>
        {(['delivering', 'money_collect_delivering'].includes(tracking.status) || (tracking.isSimulation && tracking.status === 'delivered')) && <div className="ghn-journey__driver flex items-center gap-2.5 rounded-xl border border-[#EAE4D7] p-3">
          <span className="ghn-journey__avatar flex shrink-0 items-center justify-center text-[#8C6B32] size-[35px] rounded-full bg-[#F3EFE6]"><UserRound size={20} aria-hidden="true" /></span>
          <div className="ghn-journey__driver-info min-w-0 flex-1 [&_strong]:my-0.5 [&_strong]:block [&_strong]:text-[12px] [&_strong]:[overflow-wrap:anywhere] [&>p:last-child]:text-[10px] [&>p:last-child]:text-[#7D715E]"><p className="ghn-journey__caption text-[10px] font-normal text-[#7D715E]">{tracking.isSimulation ? 'Shipper mô phỏng' : 'Shipper phụ trách giao hàng'}</p><strong>{tracking.shipperName || 'GHN chưa cung cấp tên shipper'}</strong><p>{tracking.isSimulation ? tracking.shipperPhoneDisplay || '09xx xxx xxx' : tracking.shipperPhone || 'Đang chờ GHN cập nhật SĐT liên hệ.'}</p></div>
          {tracking.isSimulation ? <button type="button" disabled className="ghn-journey__call [&:is(a)]:text-[#795A2D]! inline-flex min-h-9 cursor-pointer items-center justify-center gap-[7px] whitespace-nowrap rounded-[9px] border border-[#EAE4D7] bg-white px-[11px] py-2 text-[11px] font-semibold text-[#795A2D] no-underline transition-[background] duration-150 ease-[ease] hover:bg-[#FBF5EB] [@media(max-width:480px)]:w-[34px] [@media(max-width:480px)]:p-2 [@media(max-width:480px)]:[&>span]:hidden" aria-label="Gọi shipper" title="Số điện thoại mô phỏng, không hỗ trợ gọi"><Phone size={14} /><span>Gọi shipper</span></button> : tracking.shipperPhone ? <a href={phoneHref(tracking.shipperPhone)} className="ghn-journey__call [&:is(a)]:text-[#795A2D]! inline-flex min-h-9 cursor-pointer items-center justify-center gap-[7px] whitespace-nowrap rounded-[9px] border border-[#EAE4D7] bg-white px-[11px] py-2 text-[11px] font-semibold text-[#795A2D] no-underline transition-[background] duration-150 ease-[ease] hover:bg-[#FBF5EB] [@media(max-width:480px)]:w-[34px] [@media(max-width:480px)]:p-2 [@media(max-width:480px)]:[&>span]:hidden" aria-label="Gọi shipper"><Phone size={14} /><span>Gọi shipper</span></a> : null}
        </div>}
        {tracking.timeline.length ? <details className="ghn-journey__history mt-[15px] border-t border-[#EAE4D7] [&_summary]:flex [&_summary]:min-h-[42px] [&_summary]:cursor-pointer [&_summary]:list-none [&_summary]:items-center [&_summary]:justify-between [&_summary]:gap-2.5 [&_summary]:text-[11px] [&_summary]:font-semibold [&_summary]:text-[#231D15] [&_summary::-webkit-details-marker]:hidden [&_summary>span]:flex [&_summary>span]:items-center [&_summary>span]:gap-[7px] [&_summary>span]:text-[10px] [&_summary>span]:font-normal [&_summary>span]:text-[#7D715E] [&[open]_summary_svg]:rotate-180 [&_ol]:mb-3.5"><summary>Lịch sử vận chuyển <span>{tracking.timeline.length} mốc vận chuyển<ChevronDown size={14} /></span></summary><ol className="mt-3 space-y-3 border-l border-[#EEDFC6] pl-4" aria-label="Lịch sử vận chuyển">
          {tracking.timeline.map((event, index) => <li key={`${event.status}-${event.time || index}`} className="relative">
            <span className="ghn-journey__history-marker absolute -left-[27px] top-0.5 flex h-[19px] w-[19px] items-center justify-center rounded-full border border-[#EEDFC6] bg-white text-[#B88E4F]">
              {formatTime(event.time) ? <Check size={12} aria-label="Đã ghi nhận" /> : <Clock size={11} aria-label="Chưa có thời gian xác nhận" />}
            </span><strong className="text-xs">{event.title}</strong>
            <p className="text-xs text-[#7D715E]">{formatTime(event.time) || 'GHN chưa cung cấp thời gian'}{event.warehouse ? ` · ${event.warehouse}` : ''}</p>
            {(event.shipperName || event.shipperPhone) && <p className="text-xs text-[#7D715E]">Shipper: {event.shipperName || 'Chưa có tên'}{event.shipperPhone && <> · <a className="text-[#8C6B32] underline" href={phoneHref(event.shipperPhone)}>{event.shipperPhone}</a></>}</p>}
          </li>)}
        </ol></details> : <p className="ghn-journey__empty my-3 text-[11px] leading-[1.6] text-[#7D715E]">GHN chưa gửi thêm lịch sử. Các mốc phía dưới chỉ đổi khi GHN xác nhận trạng thái mới.</p>}
        </div>
        <p className="ghn-journey__updated flex flex-wrap items-center justify-between gap-2 border-t border-[#EAE4D7] pt-2.5 text-[9px] leading-[1.7] text-[#7D715E]">
          <span>{formatTime(tracking.lastCheckedAt) ? `Cập nhật: ${formatTime(tracking.lastCheckedAt)}` : ''}{trackingNote ? `${formatTime(tracking.lastCheckedAt) ? ' · ' : ''}${trackingNote}` : ''}</span>
          <span className="ghn-journey__countdown inline-flex items-center gap-1 whitespace-nowrap rounded-[999px] border border-[#EEDFC6] bg-[#FBF5EB] px-2 py-[3px] text-[10px] text-[#795A2D] [&_strong]:min-w-[17px] [&_strong]:text-center [&_strong]:text-[11px] [&_strong]:text-[#231D15] [&_strong]:tabular-nums" role="timer">{refreshLabel}</span>
        </p>
      </div>}
    </section>
  );
}
