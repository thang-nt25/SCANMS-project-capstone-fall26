import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Clock3, FlaskConical, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { Modal } from '../ui/Modal';
import { BidvSandboxHistory, type BidvSandboxEvent } from './BidvSandboxHistory';

interface Configuration {
  configured: boolean;
  message: string;
  grossAmount: string;
  taxAmount: string;
  fixture: { credit: string; bankCode: string; beneficiaryName: string; amount: string };
}
interface Run {
  runId: string;
  createdAt: string;
  status: string;
  request: { transDate: string; amount: string; credit?: string; bankCode?: string; beneficiaryName?: string };
  correlation: { idempotencyKey: string; interactionId: string };
  events: BidvSandboxEvent[];
}
const labels: Record<string, string> = {
  SENDING: 'Đang chờ phản hồi',
  VERIFY_REQUIRED: 'Chờ xác minh kết quả',
  UNKNOWN: 'Chưa xác định kết quả',
  NOT_SENT: 'Chưa gửi được lệnh nghiệp vụ',
};
const money = (value: string) => `${Number(value).toLocaleString('vi-VN')} ₫`;
const dateTime = (value: string) => new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
const pendingKey = 'scanms.bidv-sandbox.pending-run';
const fresh = { headers: { 'x-skip-cache': 'true' } };
async function get<T>(path: string): Promise<T> {
  const result: any = await api.get(`/admin/payouts/bidv-sandbox/${path}`, fresh);
  return result.data ?? result;
}
async function post<T>(path: string, body: object): Promise<T> {
  const result: any = await api.post(`/admin/payouts/bidv-sandbox/${path}`, body, { timeout: 50000 });
  return result.data ?? result;
}

export function BidvSandboxDialog({ onClose }: { onClose: () => void }) {
  const [config, setConfig] = useState<Configuration | null>(null);
  const [history, setHistory] = useState<Run[]>([]);
  const [run, setRun] = useState<Run | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [rootSource, setRootSource] = useState('');
  const lock = useRef(false);
  const runId = useRef(sessionStorage.getItem(pendingKey) || crypto.randomUUID());

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const configuration = await get<Configuration>('configuration');
        if (!alive) return;
        setConfig(configuration);
        if (configuration.configured) {
          const result = await get<{ runs: Run[] }>('runs');
          if (!alive) return;
          setHistory(result.runs);
          const pending = sessionStorage.getItem(pendingKey);
          const selected = result.runs.find(item => item.runId === pending) ?? (!pending ? result.runs[0] : undefined);
          if (selected) { setRun(selected); runId.current = selected.runId; setAttempted(true); }
          else if (pending) {
            // Preserve the original identifier even if a delayed POST has not
            // reached the server yet. Any retry must reuse this same identifier.
            setAttempted(true);
          }
        }
      } catch (err) { if (alive) setError(err instanceof Error ? err.message : 'Không tải được BIDV Sandbox.'); }
      finally { if (alive) setBusy(false); }
    })();
    return () => { alive = false; };
  }, []);

  function remember(result: Run) {
    setRun(result);
    setHistory(previous => [result, ...previous.filter(item => item.runId !== result.runId)].slice(0, 20));
    setAttempted(true);
  }

  async function act(operation: 'transfer' | 'inquiry' | 'refresh') {
    if (lock.current || !config?.configured) return;
    lock.current = true; setBusy(true); setError('');
    try {
      if (operation === 'transfer') {
        if (attempted) return;
        sessionStorage.setItem(pendingKey, runId.current);
        setAttempted(true);
        remember(await post<Run>('runs', { runId: runId.current }));
      } else if (operation === 'inquiry') {
        if (!run || !rootSource) return;
        remember(await post<Run>(`runs/${run.runId}/inquiry`, { operationId: crypto.randomUUID(), rootSource }));
      } else {
        try { remember(await get<Run>(`runs/${runId.current}`)); }
        catch (err: any) {
          if (err.status === 404) {
            setRun(null); setAttempted(false);
            setError('Máy chủ chưa ghi nhận lượt thử. Bạn có thể gửi với cùng mã theo dõi; hệ thống sẽ chặn gửi trùng.');
          } else throw err;
        }
        const result = await get<{ runs: Run[] }>('runs');
        setHistory(result.runs);
      }
    } catch (err) {
      setError(`${err instanceof Error ? err.message : 'Không nhận được kết quả.'} Chọn “Tải lại kết quả” để kiểm tra lượt đã gửi.`);
    } finally { lock.current = false; setBusy(false); }
  }

  const latest = run?.events.filter(event => event.action === 'BIDV_SANDBOX_RESULT').at(-1);
  const canStartNew = run && run.events.some(event => event.action === 'BIDV_SANDBOX_RESULT') && !['UNKNOWN', 'SENDING'].includes(run.status);
  const amount = run?.request.amount ?? config?.fixture.amount;
  const resultNote = run?.status === 'UNKNOWN' || run?.status === 'SENDING'
    ? 'Tải lại kết quả của lượt đã gửi trước khi thử tiếp.'
    : run?.status === 'NOT_SENT'
      ? 'Lệnh chi hộ chưa được gửi. Xem lịch sử xử lý để kiểm tra nguyên nhân.'
      : latest?.operation === 'inquiry' && latest.response && !latest.correlationMatched
        ? ''
        : 'Đã nhận phản hồi từ BIDV. Chưa đủ thông tin để xác nhận hạch toán.';

  return <Modal isOpen onClose={() => { if (!busy) onClose(); }} title="BIDV Sandbox"
    subtitle="Giao dịch mẫu · Không chuyển tiền thật" icon={<FlaskConical size={19} aria-hidden="true" />}
    maxWidth="2xl" stickyHeader className="payout-review-dialog bidv-sandbox-dialog" footer={
      <div className="bidv-footer">
        {canStartNew && <button type="button" className="payout-text-button" disabled={busy} onClick={() => {
          runId.current = crypto.randomUUID(); sessionStorage.removeItem(pendingKey); setRun(null); setAttempted(false); setRootSource(''); setError('');
        }}>Tạo lượt thử mới</button>}
        <div className="payout-review-actions">
          <button type="button" className="payout-secondary" disabled={busy} onClick={onClose}>Đóng</button>
          {attempted ? <button type="button" className="payout-primary" disabled={busy || !config?.configured} onClick={() => void act('refresh')}>
            <RefreshCw size={16} aria-hidden="true" />Tải lại kết quả
          </button> : config?.configured && <button type="button" className="payout-primary" disabled={busy} onClick={() => void act('transfer')}>Gửi giao dịch mẫu</button>}
        </div>
      </div>
    }>
    <div className="payout-review-content">
      {config && amount && <section className="bidv-payment-summary" aria-label="Giao dịch mẫu">
        <div className="bidv-amount"><span>Số tiền chuyển thử</span><strong>{money(amount)}</strong></div>
        {!run && <dl className="bidv-calculation">
          <div><dt>Số tiền yêu cầu</dt><dd>{money(config.grossAmount)}</dd></div>
          <div><dt>Thuế mẫu (10%)</dt><dd>−{money(config.taxAmount)}</dd></div>
        </dl>}
        <dl className="bidv-beneficiary">
          <div><dt>Người nhận mẫu</dt><dd>{run?.request.beneficiaryName ?? config.fixture.beneficiaryName}</dd></div>
          <div><dt>Số tài khoản</dt><dd>{run?.request.credit ?? config.fixture.credit}</dd></div>
          <div><dt>Mã ngân hàng</dt><dd>{run?.request.bankCode ?? config.fixture.bankCode}</dd></div>
        </dl>
      </section>}
      {config && !config.configured && <p role="alert" className="payout-document-notice text-sm">{config.message}</p>}
      {config?.configured && !attempted && <p className="bidv-caption">Không cần nhập mã giao dịch hoặc tải chứng từ. Hệ thống tự lưu kết quả sau khi gửi.</p>}
      {error && <p role="alert" className="text-sm text-[#DC2626]">{error}</p>}
      {busy && <p role="status" className="bidv-caption">{!config ? 'Đang tải BIDV Sandbox…' : 'Đang xử lý BIDV Sandbox…'}</p>}
      {attempted && !run && !busy && <p role="status" className="payout-document-notice text-sm">Đang chờ kết quả lượt đã gửi. Chọn “Tải lại kết quả” để kiểm tra.</p>}
      {run && <>
        <section aria-label="Kết quả BIDV Sandbox" className="bidv-result" role="status">
          <Clock3 size={20} aria-hidden="true" />
          <div><h4>{labels[run.status] || 'Chờ xác minh'}</h4>{resultNote && <p>{resultNote}</p>}
            {latest?.response && <p className="bidv-response">Đã nhận phản hồi thử nghiệm. Xem chi tiết trong lịch sử xử lý.</p>}
          </div>
        </section>
        <div key={run.runId} className="bidv-details-group">
          <BidvSandboxHistory events={run.events} runId={run.runId} />
          <details className="payout-disclosure">
            <summary tabIndex={0}>Thông tin kỹ thuật &amp; vấn tin<ChevronDown size={16} aria-hidden="true" /></summary>
            <div className="payout-disclosure-body bidv-inquiry">
              <div className="bidv-inquiry-controls">
              <label className="grid gap-2 text-sm">Mã gốc dùng để vấn tin thử
                <select className="payout-review-input" value={rootSource} disabled={busy} onChange={event => setRootSource(event.target.value)}>
                  <option value="">Chọn mã để kiểm tra</option>
                  <option value="IDEMPOTENCY_KEY">Thử với X-Idempotency-Key</option>
                  <option value="INTERACTION_ID">Thử với X-API-Interaction-ID</option>
                </select>
              </label>
              <button type="button" className="payout-secondary" disabled={busy || !rootSource} onClick={() => void act('inquiry')}>Vấn tin thử BIDV</button>
              </div>
              <p className="bidv-caption">Thử mã gốc để đối chiếu phản hồi. Kết quả chưa xác nhận giải ngân.</p>
              <dl className="bidv-tracking">
                <div><dt>Mã lượt thử SCANMS</dt><dd><code>{run.runId}</code></dd></div>
                <div><dt>X-Idempotency-Key</dt><dd><code>{run.correlation.idempotencyKey}</code></dd></div>
                <div><dt>X-API-Interaction-ID</dt><dd><code>{run.correlation.interactionId}</code></dd></div>
                <div><dt>Ngày gốc · YYMMDD</dt><dd><code>{run.request.transDate}</code></dd></div>
              </dl>
              <details className="bidv-event-log"><summary tabIndex={0}>Quy ước vấn tin<ChevronDown size={14} aria-hidden="true" /></summary>
                <p>BIDV chưa xác nhận mã nào tương ứng rootRequestId. Vấn tin dùng ngày gốc đã lưu và type/terminalId từ mẫu.</p>
              </details>
            </div>
          </details>
        </div>
      </>}
      {!!history.length && <details className="payout-disclosure">
        <summary tabIndex={0}>Các lượt thử gần đây <span className="bidv-count">{history.length}</span><ChevronDown size={16} aria-hidden="true" /></summary>
        <label className="payout-disclosure-body grid gap-2 text-sm">Chọn lượt thử đã lưu
          <select className="payout-review-input" disabled={busy} value={run?.runId ?? ''} onChange={event => {
            const selected = history.find(item => item.runId === event.target.value);
            if (selected) { runId.current = selected.runId; remember(selected); sessionStorage.setItem(pendingKey, selected.runId); setRootSource(''); setError(''); }
          }}><option value="" disabled>Chọn lượt thử</option>{history.map(item => <option key={item.runId} value={item.runId}>{dateTime(item.createdAt)} · {item.runId.slice(0, 8)} · {labels[item.status] || item.status}</option>)}</select>
        </label>
      </details>}
    </div>
  </Modal>;
}
