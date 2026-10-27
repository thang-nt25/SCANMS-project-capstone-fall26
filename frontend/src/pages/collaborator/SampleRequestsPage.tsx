import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Copy,
  ExternalLink,
  Package,
  Search,
  Truck,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';
import { useWorkspaceResource } from '@/hooks/useWorkspaceResource';
import {
  WorkspaceState,
  workspaceButton,
  workspaceInput,
} from '@/components/ui/FeatureWorkspace';
import './SampleRequestsPage.css';
import { useSandboxSampleState, type SandboxSampleState } from '@/components/shipping/useSandboxSampleState';
import { SandboxSampleReceipt } from '@/components/shipping/SandboxSampleReceipt';
import type { SampleRequest } from '@/types/samples.types';
import {
  canSubmitSampleVideo,
  SAMPLE_STATUS_LABELS,
  sampleDeadline,
  sampleNeedsAttention,
  sampleSandboxCode,
  withSampleSandboxState,
  sampleShopLink,
} from '@/utils/sample-workspace';

function SandboxStateBridge({ code, onState }: { code: string; onState: (code: string, state: SandboxSampleState | null) => void }) {
  const { state } = useSandboxSampleState(code);
  useEffect(() => onState(code, state), [code, state, onState]);
  return null;
}

const date = (value?: string | number | null) =>
    value == null || !Number.isFinite(new Date(value).getTime())
    ? 'Chưa cập nhật'
    : new Date(value).toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        dateStyle: 'short',
        timeStyle: 'short',
      });
type Action = 'video' | 'issue' | 'cancel';

export default function SampleRequestsPage() {
  const { data, loading, error, refresh, updatedAt } = useWorkspaceResource<
    SampleRequest[]
  >('/sample-requests/my');
  const [sandboxStates, setSandboxStates] = useState<Record<string, SandboxSampleState | null>>({});
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  const onSandboxState = useCallback((code: string, state: SandboxSampleState | null) => {
    setSandboxStates(previous => previous[code] === state ? previous : { ...previous, [code]: state });
  }, []);
  const requests = useMemo(() => (data || []).map(item => withSampleSandboxState(item, sandboxStates[sampleSandboxCode(item) || ''])), [data, sandboxStates]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [action, setAction] = useState<Action>('video');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const lock = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const selected = requests.find((item) => item.id === selectedId);
  const visible = useMemo(
    () =>
      requests
        .filter(
          (item) =>
            (status === 'ALL' || item.status === status) &&
            `${item.product.title} ${item.product.store.name} ${item.trackingNumber || ''} ${item.shippingCharges?.filter(charge => charge.environment === 'TEST').map(charge => charge.trackingNumber).join(' ') || ''}`
              .toLocaleLowerCase('vi-VN')
              .includes(search.trim().toLocaleLowerCase('vi-VN')),
        )
        .sort(
          (a, b) =>
            Number(sampleNeedsAttention(b, now)) - Number(sampleNeedsAttention(a, now)) ||
            (sampleDeadline(a) ?? Infinity) - (sampleDeadline(b) ?? Infinity),
        ),
    [requests, status, search, now],
  );

  function open(item: SampleRequest, next: Action) {
    setSelectedId(item.id);
    setAction(next);
    setTitle(item.videoTitle || `Review ${item.product.title}`);
    setUrl(item.videoUrl || '');
    setReason('');
    setActionError('');
    dialog.current?.showModal();
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || lock.current) return;
    lock.current = true;
    setBusy(true);
    setActionError('');
    try {
      if (action === 'video')
        await api.post(`/sample-requests/${selected.id}/video`, {
          title: title.trim(),
          videoUrl: url.trim(),
        });
      if (action === 'issue')
        await api.patch(`/sample-requests/${selected.id}/delivery-issue`, {
          reason: reason.trim(),
        });
      if (action === 'cancel')
        await api.patch(`/sample-requests/${selected.id}/cancel`, {});
      dialog.current?.close();
      toast.success('Đã cập nhật yêu cầu mẫu.');
      refresh();
    } catch (cause) {
      setActionError(
        cause instanceof Error
          ? cause.message
          : 'Không thể cập nhật. Vui lòng thử lại.',
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <main className="samples-page flex w-full min-w-0 flex-col bg-[#FAF8F5]">
      {(data || []).map(item => {
        const code = sampleSandboxCode(item);
        return code ? <SandboxStateBridge key={code} code={code} onState={onSandboxState} /> : null;
      })}
      <div className="samples-page-metrics">
        {[
          { label: 'Tổng yêu cầu', value: requests.length },
          { label: 'Đang giao', value: requests.filter(item => item.status === 'SHIPPED').length },
          { label: 'Cần chú ý', value: requests.filter(item => sampleNeedsAttention(item, now)).length, attention: true },
          { label: 'Hoàn thành', value: requests.filter(item => item.status === 'COMPLETED').length },
        ].map(metric => <div key={metric.label} className="samples-page-metric" data-attention={Boolean(metric.attention && metric.value > 0)}>
          <p>{metric.label}</p><strong>{!data ? '—' : metric.value}</strong>
        </div>)}
      </div>
      <section
        aria-label="Bộ lọc yêu cầu"
        className="samples-page-filters flex flex-wrap gap-3 rounded-2xl border border-[#EAE4D7] bg-white p-4"
      >
        <label className="relative min-w-52 flex-1">
          <span className="sr-only">Tìm sản phẩm, gian hàng, mã vận đơn</span>
          <Search
            size={15}
            className="absolute left-3 top-3.5 text-[#7D715E]"
          />
          <input
            className={`${workspaceInput} pl-9`}
            placeholder="Sản phẩm, gian hàng, mã vận đơn…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <select
          aria-label="Trạng thái yêu cầu"
          className={`${workspaceInput} sm:!w-52`}
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="ALL">Tất cả trạng thái</option>
          {Object.entries(SAMPLE_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </section>
      {error && (
        <WorkspaceState
          error
          title="Không tải được yêu cầu"
          description={error}
          action="Thử lại"
          onAction={refresh}
        />
      )}
      {loading && !data ? (
        <WorkspaceState
          title="Đang tải yêu cầu…"
          description="Đang đồng bộ trạng thái từ các gian hàng."
        />
      ) : !error && visible.length === 0 ? (
        <WorkspaceState
          title="Không có yêu cầu phù hợp"
          description="Bỏ bộ lọc hoặc mở Hợp tác & Nhận mẫu Shop để gửi yêu cầu đầu tiên."
          action="Xóa bộ lọc"
          onAction={() => {
            setSearch('');
            setStatus('ALL');
          }}
        />
      ) : (
        <div className="samples-page-grid grid gap-4 xl:grid-cols-2">
          {visible.map((item) => {
            const deadline = sampleDeadline(item);
            const needsAttention = sampleNeedsAttention(item, now);
            const original = data?.find(request => request.id === item.id);
            const sandboxCode = original ? sampleSandboxCode(original) : null;
            return (
              <article
                key={item.id}
                className={`samples-page-card rounded-2xl border bg-white p-5 ${needsAttention ? 'border-[#C59B58]' : 'border-[#EAE4D7]'}`}
              >
                <div className="samples-page-product flex items-start gap-3">
                  {item.product.imageUrl ? (
                    <img
                      src={item.product.imageUrl}
                      alt=""
                      loading="lazy"
                      className="h-16 w-16 rounded-xl bg-white object-contain"
                      onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/assets/product-placeholder.svg'; }}
                    />
                  ) : (
                    <Package className="h-16 w-16 rounded-xl bg-[#F3EFE6] p-4 text-[#B88E4F]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="m-0 text-[11px] text-[#7D715E]">
                      {item.product.store.name}
                    </p>
                    <h2 className="my-1 text-sm font-bold text-[#1A1612]">
                      {item.product.title}
                    </h2>
                    <span data-status={item.status} className="samples-page-status inline-block rounded-full border border-[#EEDFC6] bg-[#FBF5EB] px-2 py-1 text-[10px] font-semibold text-[#8C6226]">
                      {SAMPLE_STATUS_LABELS[item.status]}
                    </span>
                    {sandboxCode && <span className="samples-sandbox-label">Sandbox</span>}
                  </div>
                </div>
                <dl className="samples-page-dates mb-0 mt-4 grid grid-cols-2 gap-4 rounded-xl bg-[#FAF8F5] p-3 text-xs">
                  <div>
                    <dt className="text-[#7D715E]">Ngày yêu cầu</dt>
                    <dd className="ml-0 mt-1 text-[#1A1612]">
                      {date(item.createdAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#7D715E]">
                      {item.revisionDeadlineAt
                        ? 'Hạn sửa video'
                        : 'Hạn nộp video'}
                    </dt>
                    <dd
                      className={`ml-0 mt-1 font-semibold ${needsAttention ? 'text-[#DC2626]' : 'text-[#1A1612]'}`}
                    >
                      {['CANCELLED', 'REJECTED'].includes(item.status) ? 'Không áp dụng'
                        : deadline === null && ['PENDING', 'APPROVED', 'SHIPPED', 'DELIVERY_ISSUE'].includes(item.status)
                        ? 'Tính sau khi giao thành công' : date(deadline)}
                    </dd>
                  </div>
                </dl>
                {item.trackingNumber && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#7D715E]">
                    <Truck size={15} />
                    <span>
                      {item.carrier || 'Vận chuyển'} ·{' '}
                      <strong className="text-[#1A1612]">
                        {item.trackingNumber}
                      </strong>
                    </span>
                    <button
                      className="rounded-lg p-2 hover:bg-[#F3EFE6]"
                      aria-label="Sao chép mã vận đơn"
                      onClick={() =>
                        void navigator.clipboard
                          .writeText(item.trackingNumber!)
                          .then(() => toast.success('Đã sao chép mã vận đơn.'))
                          .catch(() =>
                            toast.error(
                              'Không sao chép được. Hãy chọn mã để sao chép thủ công.',
                            ),
                          )
                      }
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                )}
                {(item.videoRejectionReason || item.rejectedReason) && (
                  <p className="mt-3 rounded-xl border border-[#EEDFC6] p-3 text-xs leading-5 text-[#7D715E]">
                    Phản hồi: {item.videoRejectionReason || item.rejectedReason}
                  </p>
                )}
                <div className="samples-page-actions mt-4 flex flex-wrap gap-2">
                  <Link className={workspaceButton} to={sampleShopLink(item)}>Xem yêu cầu tại Shop<ExternalLink size={13} /></Link>
                  {!sandboxCode && canSubmitSampleVideo(item.status) && (
                    <button
                      className={`${workspaceButton} !bg-[#C59B58]`}
                      onClick={() => open(item, 'video')}
                    >
                      {item.status === 'REVISION_REQUIRED'
                        ? 'Nộp video chỉnh sửa'
                        : 'Nộp video'}
                    </button>
                  )}
                  {!sandboxCode && item.status === 'SHIPPED' && (
                    <button
                      className={workspaceButton}
                      onClick={() => open(item, 'issue')}
                    >
                      Báo sự cố giao hàng
                    </button>
                  )}
                  {item.status === 'PENDING' && (
                    <button
                      className={workspaceButton}
                      onClick={() => open(item, 'cancel')}
                    >
                      Hủy yêu cầu
                    </button>
                  )}
                  {!sandboxCode && item.videoUrl && /^https:\/\//i.test(item.videoUrl) && (
                    <a
                      className={workspaceButton}
                      href={item.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Xem video
                      <ExternalLink size={13} />
                    </a>
                  )}
                </div>
                {sandboxCode && <div className="samples-sandbox-receipt"><SandboxSampleReceipt code={sandboxCode} role="kol" productId={item.productId} productTitle={item.product.title} sampleRequestId={item.id} expanded hideStatusSummary /></div>}
              </article>
            );
          })}
        </div>
      )}
      {updatedAt && (
        <p className="m-0 text-right text-[10px] text-[#7D715E]">
          Đồng bộ lúc {date(updatedAt.getTime())} · {visible.length}/
          {requests.length} yêu cầu
        </p>
      )}
      <dialog
        ref={dialog}
        aria-labelledby="sample-action-title"
        onCancel={(event) => {
          if (busy) event.preventDefault();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-[#EAE4D7] bg-white p-6 text-[#1A1612] shadow-xl backdrop:bg-black/40"
      >
        <form onSubmit={submit} className="space-y-4">
          <h2 id="sample-action-title" className="m-0 text-lg font-bold">
            {action === 'video'
              ? 'Nộp video review'
              : action === 'issue'
                ? 'Báo sự cố giao hàng'
                : 'Hủy yêu cầu mẫu?'}
          </h2>
          <p className="text-xs leading-5 text-[#7D715E]">
            {selected?.product.title} · {selected?.product.store.name}
          </p>
          {action === 'video' && (
            <>
              <label className="block text-xs">
                Tiêu đề video
                <input
                  autoFocus
                  required
                  maxLength={255}
                  className={`${workspaceInput} mt-2`}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>
              <label className="block text-xs">
                Liên kết video công khai
                <input
                  required
                  type="url"
                  pattern="https://.*"
                  maxLength={2000}
                  placeholder="https://…"
                  className={`${workspaceInput} mt-2`}
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                />
              </label>
              <p className="text-xs text-[#7D715E]">
                Dùng HTTPS trên nền tảng đã cam kết. Shop kiểm duyệt trước khi
                nghiệm thu.
              </p>
            </>
          )}
          {action === 'issue' && (
            <label className="block text-xs">
              Mô tả sự cố
              <textarea
                autoFocus
                required
                minLength={3}
                maxLength={500}
                rows={4}
                className={`${workspaceInput} mt-2 py-3`}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
          )}
          {action === 'cancel' && (
            <p className="text-xs text-[#7D715E]">
              Chỉ yêu cầu đang chờ duyệt mới có thể hủy. Bạn có thể xin mẫu lại
              khi đủ điều kiện.
            </p>
          )}
          {actionError && (
            <p role="alert" className="text-xs text-[#DC2626]">
              {actionError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              className={workspaceButton}
              onClick={() => dialog.current?.close()}
            >
              Đóng
            </button>
            <button
              disabled={
                busy ||
                (action === 'issue' && !reason.trim()) ||
                (action === 'video' && !title.trim())
              }
              className={`${workspaceButton} !bg-[#C59B58]`}
            >
              {busy ? 'Đang gửi…' : 'Xác nhận'}
            </button>
          </div>
        </form>
      </dialog>
    </main>
  );
}
