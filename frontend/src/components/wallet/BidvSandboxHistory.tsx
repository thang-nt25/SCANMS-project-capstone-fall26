import { ChevronDown, Search, Send } from 'lucide-react';

export interface BidvSandboxEvent {
  id: string;
  action: string;
  operation?: string;
  operationId?: string;
  createdAt: string;
  status?: string;
  message?: string;
  rootSource?: string;
  correlationMatched?: boolean;
  bankReference?: string | null;
  httpStatus?: number | null;
  response?: { httpStatus: number; errorCode: string | null; errorDesc: string | null; listValid: boolean;
    transactions: { rootRequestId: string; amount: string; detailCode: string; accountingDate: string; bidvId: string }[] };
}

const dateTime = (value: string) => new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
const time = (value: string) => new Date(value).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', second: '2-digit' });

export function BidvSandboxHistory({ events, runId }: { events: BidvSandboxEvent[]; runId: string }) {
  // Pair by persisted operation ID, never by adjacent timestamps. Older inquiry
  // events without an ID remain separate so that no response is misattributed.
  const groups = new Map<string, { operation: string; events: BidvSandboxEvent[] }>();
  for (const event of events) {
    const operation = event.action.endsWith('TRANSFER_STARTED') ? 'transfer'
      : event.action.endsWith('INQUIRY_STARTED') ? 'inquiry' : event.operation ?? 'other';
    const key = operation === 'transfer' ? `transfer:${runId}` : `${operation}:${event.operationId ?? event.id}`;
    const group = groups.get(key) ?? { operation, events: [] };
    group.events.push(event);
    groups.set(key, group);
  }

  return <details className="payout-disclosure">
    <summary tabIndex={0}>Lịch sử xử lý <span className="bidv-count">{groups.size}</span><ChevronDown size={16} aria-hidden="true" /></summary>
    <ol aria-label="Lịch sử gửi và vấn tin" className="payout-disclosure-body bidv-timeline">
      {[...groups].map(([key, group]) => {
        const first = group.events[0];
        const result = group.events.filter(event => event.action === 'BIDV_SANDBOX_RESULT').at(-1);
        const response = result?.response;
        const source = group.events.find(event => event.rootSource)?.rootSource;
        const Icon = group.operation === 'inquiry' ? Search : Send;
        const status = response ? 'Có phản hồi' : result?.status === 'NOT_SENT' ? 'Chưa gửi được'
          : result ? 'Chưa xác định' : 'Chờ phản hồi';
        return <li key={key} className="bidv-operation">
          <div className="bidv-operation-heading">
            <span className="bidv-operation-icon"><Icon size={15} aria-hidden="true" /></span>
            <div><strong>{group.operation === 'inquiry' ? 'Vấn tin lượt thử' : group.operation === 'transfer' ? 'Gửi chi hộ mẫu' : 'Sự kiện'}</strong>
              <time dateTime={first.createdAt} title={dateTime(first.createdAt)}>{dateTime(first.createdAt)}</time></div>
            <span className="bidv-operation-status">{status}</span>
          </div>
          <div className="bidv-operation-content">
            {response && <p className="bidv-operation-response"><span>Phản hồi mẫu</span><strong>{response.errorCode ?? 'Không có mã'}</strong>{response.errorDesc && <span>{response.errorDesc}</span>}<small>HTTP {response.httpStatus}</small></p>}
            {!response && result?.message && <p className="bidv-caption">{result.message}</p>}
            {group.operation === 'inquiry' && response && <>
              <p className="bidv-match-note">{result?.correlationMatched ? 'Khớp mã gốc và số tiền · Chưa xác nhận hạch toán' : 'Chưa khớp mã gốc và số tiền'}</p>
              {response.transactions.map((transaction, index) => <dl className="bidv-transaction" key={index}>
                <div><dt>Số tiền phản hồi</dt><dd>{Number(transaction.amount).toLocaleString('vi-VN')} ₫</dd></div>
                <div><dt>Mã chi tiết</dt><dd>{transaction.detailCode || 'Chưa có'}</dd></div>
                <div><dt>Ngày hạch toán</dt><dd>{transaction.accountingDate || 'Chưa có'}</dd></div>
                <div><dt>BIDVID</dt><dd>{transaction.bidvId || 'Chưa có'}</dd></div>
                <div className="bidv-transaction-root"><dt>Mã gốc phản hồi</dt><dd><code>{transaction.rootRequestId || 'Chưa có'}</code></dd></div>
              </dl>)}
            </>}
            <details className="bidv-event-log">
              <summary tabIndex={0}>Nhật ký chi tiết <span>({group.events.length})</span><ChevronDown size={14} aria-hidden="true" /></summary>
              {source && <p>Nguồn vấn tin: {source === 'IDEMPOTENCY_KEY' ? 'X-Idempotency-Key' : source === 'INTERACTION_ID' ? 'X-API-Interaction-ID' : source}</p>}
              {group.events.map(event => <div key={event.id}>
                <time dateTime={event.createdAt} title={dateTime(event.createdAt)}>{time(event.createdAt)}</time>
                <p>{event.action.endsWith('_STARTED') ? 'Ghi nhận gửi yêu cầu' : 'Nhận kết quả'}{event.message ? ` · ${event.message}` : ''}
                  {event.status && <span> · {event.status}</span>}{(event.response?.httpStatus ?? event.httpStatus) && <span> · HTTP {event.response?.httpStatus ?? event.httpStatus}</span>}
                  {event.response && <span> · {event.response.errorCode ?? 'Không có mã'} {event.response.errorDesc}</span>}</p>
              </div>)}
            </details>
          </div>
        </li>;
      })}
    </ol>
  </details>;
}
