import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, ChevronDown, ChevronLeft, ChevronRight, Eye, Flag, History, Image, Paperclip, Video } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { getSafeProductImageUrl } from '../../utils/marketplace.utils';
import { handleProductImageError } from '../../utils/image-fallback.utils';
import { toast } from '../../utils/toast';
import {
  productReportReasons, productReportStatuses, productReportsService,
  type ProductReportDecision, type ProductReportItem,
} from '../../services/product-reports.service';

const dateTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' });
const button = 'inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-[#EAE4D7] bg-white px-3 py-1.5 text-center text-xs font-semibold leading-tight text-[#715126] transition-colors hover:bg-[#FBF5EB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B88E4F] disabled:opacity-45';
const select = 'flex h-10 w-full min-w-0 cursor-pointer appearance-none items-center truncate rounded-lg border border-[#EAE4D7] bg-white py-0 text-sm leading-5 [&::picker-icon]:hidden';
const arrow = 'pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-[#7D715E]';
const rowColumns = 'xl:grid-cols-[minmax(0,2.3fr)_minmax(0,1.25fr)_minmax(0,0.9fr)_minmax(0,1.2fr)_8.5rem] xl:gap-4';

const statusTone: Record<ProductReportItem['status'], string> = {
  PENDING: 'border-[#EEDFC6] bg-[#FBF5EB] text-[#8C6226]',
  ESCALATED: 'border-[#EEDFC6] bg-[#FBF5EB] text-[#715126]',
  DISMISSED: 'border-[#EAE4D7] bg-[#FAF8F5] text-[#625744]',
  CORRECTION_REQUESTED: 'border-[#EEDFC6] bg-[#F3EFE6] text-[#715126]',
  HIDDEN: 'border-[#F4D4D4] bg-[#FFF5F5] text-[#A42626]',
};

function ReportEvidence({ reportId, kind }: { reportId: string; kind: 'image' | 'video' }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const isVideo = kind === 'video';
  const label = isVideo ? 'video' : 'ảnh';

  useEffect(() => {
    const abort = new AbortController();
    let objectUrl: string | undefined;
    productReportsService.evidence(reportId, kind, abort.signal).then(blob => {
      if (abort.signal.aborted) return;
      if (blob.type !== (isVideo ? 'video/mp4' : 'image/webp')) throw new Error('Định dạng bằng chứng không hợp lệ.');
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    }).catch(() => { if (!abort.signal.aborted) setError(`Chưa tải được ${label} bằng chứng.`); });
    return () => {
      abort.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [reportId, kind, isVideo, label]);

  if (error || !url) return <p role="status" className="grid min-h-36 place-items-center px-4 text-center text-sm text-[#7D715E]">{error || `Đang tải ${label}…`}</p>;
  const previewClass = 'max-h-[min(62dvh,32rem)] w-full rounded-lg object-contain';
  return isVideo
    ? <video src={url} controls playsInline aria-label="Video bằng chứng" className={previewClass}
        onError={() => setError('Không phát được video bằng chứng.')} />
    : <img src={url} alt="Ảnh bằng chứng từ người báo cáo" className={previewClass}
        onError={() => setError('Không hiển thị được ảnh bằng chứng.')} />;
}

function ProductReportDetail({ report, admin, onClose, onChanged, onHistory }: {
  report: ProductReportItem;
  admin: boolean;
  onClose: () => void;
  onChanged: () => void;
  onHistory: () => void;
}) {
  const [viewEvidence, setViewEvidence] = useState<'image' | 'video' | null>(null);
  const evidenceTrigger = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const canReview = report.status === 'PENDING' || (admin && report.status === 'ESCALATED');
  const attachments = [
    { kind: 'image', label: 'Ảnh', icon: Image, available: report.evidenceMime },
    { kind: 'video', label: 'Video', icon: Video, available: report.evidenceVideoMime },
  ] as const;
  const availableAttachments = attachments.filter(attachment => attachment.available);
  const firstAttachment = availableAttachments[0];

  function closeEvidence() {
    setViewEvidence(null);
    requestAnimationFrame(() => evidenceTrigger.current?.focus({ preventScroll: true }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const decision = String(data.get('decision')) as ProductReportDecision;
    const note = String(data.get('note') || '').trim();
    if (note.length < 3) { setError('Vui lòng nhập lý do xử lý.'); return; }
    setBusy(true);
    setError('');
    try {
      await productReportsService.resolve(report.id, decision, note);
      toast.success('Đã cập nhật báo cáo.');
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Chưa cập nhật được báo cáo.');
    } finally {
      setBusy(false);
    }
  }

  const detail = (
    <Modal isOpen title="Chi tiết báo cáo sản phẩm" subtitle={report.product.title} maxWidth="xl" stickyHeader onClose={() => { if (!busy) onClose(); }}>
      <div className="space-y-3 text-sm text-[#1A1612]">
        <dl className="divide-y divide-[#EAE4D7] rounded-xl border border-[#EAE4D7] [&>div]:grid [&>div]:grid-cols-[minmax(85px,1fr)_2fr] [&>div]:gap-2 [&>div]:px-3 [&>div]:py-2 [&_dt]:text-[#7D715E] [&_dd]:min-w-0 [&_dd]:wrap-anywhere">
          <div><dt>Gian hàng</dt><dd>{report.product.store.name}</dd></div>
          <div><dt>SKU sản phẩm</dt><dd className="font-mono text-xs">{report.product.sku}</dd></div>
          <div><dt>Phân loại</dt><dd>{report.variantName || 'Chưa chọn'}{report.variantSku && <span className="ml-2 font-mono text-xs text-[#7D715E]">{report.variantSku}</span>}</dd></div>
          <div><dt>Lý do</dt><dd className="font-semibold">{productReportReasons[report.reason]}</dd></div>
          {report.details && <div><dt>Ghi chú</dt><dd className="whitespace-pre-wrap">{report.details}</dd></div>}
          <div><dt>Đã gửi</dt><dd>{dateTime.format(new Date(report.createdAt))}</dd></div>
          <div><dt>Trạng thái</dt><dd className="font-semibold text-[#715126]">{productReportStatuses[report.status]}</dd></div>
        </dl>
        <div className="grid auto-cols-fr grid-flow-col gap-2">
          {report.product.isActive && <Link target="_blank" rel="noreferrer" className={button} to={`/products/${report.product.id}`}>Xem sản phẩm <ArrowUpRight size={13} className="shrink-0" aria-hidden="true" /></Link>}
          <button type="button" className={button} onClick={onHistory}><History size={14} className="shrink-0" aria-hidden="true" /> Lịch sử báo cáo</button>
          {firstAttachment && (
            <button type="button" className={button} aria-haspopup="dialog" onClick={event => {
              evidenceTrigger.current = event.currentTarget;
              setViewEvidence(firstAttachment.kind);
            }}><Paperclip size={14} className="shrink-0" aria-hidden="true" /> Xem bằng chứng</button>
          )}
        </div>
        {report.decisionNote && <div className="rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] p-3">
          <p className="text-xs font-semibold text-[#715126]">{report.reviewedAt ? dateTime.format(new Date(report.reviewedAt)) : 'Ghi chú xử lý'}</p>
          <p className="mt-1 whitespace-pre-wrap wrap-anywhere">{report.decisionNote}</p>
        </div>}
        {canReview && (
          <form onSubmit={submit} className="space-y-3 border-t border-[#EAE4D7] pt-3">
            <label className="block font-medium">Quyết định
              <span className="relative mt-1 block">
                <select name="decision" required defaultValue="" className={`${select} justify-center px-9 text-center font-normal`}>
                  <option value="" disabled>Chọn kết quả</option>
                  <option value="DISMISSED">Không phát hiện vi phạm</option>
                  <option value="CORRECTION_REQUESTED">Yêu cầu gian hàng chỉnh sửa</option>
                  {!admin && <option value="ESCALATED">Chuyển Admin xem xét</option>}
                  {admin && <option value="HIDDEN">Ẩn sản phẩm</option>}
                </select>
                <ChevronDown className={arrow} aria-hidden="true" />
              </span>
            </label>
            <label className="block font-medium">Lý do xử lý
              <textarea name="note" required minLength={3} maxLength={1000} rows={1}
                className="mt-1 block min-h-10 max-h-40 w-full resize-y overflow-y-auto rounded-lg border border-[#EAE4D7] bg-white px-3 py-[9px] text-sm leading-5 font-normal outline-none [field-sizing:content] focus:border-[#C59B58] focus:ring-2 focus:ring-[#C59B58]/20 supports-[field-sizing:content]:resize-none" />
            </label>
            {error && <p role="alert" className="text-xs text-[#DC2626]">{error}</p>}
            <button type="submit" disabled={busy} className="rounded-lg bg-[#C59B58] px-3 py-2 text-xs font-semibold text-[#231D15] hover:bg-[#B88E4F] disabled:opacity-50">
              {busy ? 'Đang lưu…' : 'Lưu quyết định'}
            </button>
          </form>
        )}
      </div>
    </Modal>
  );

  return <>
    <div inert={viewEvidence !== null}>{detail}</div>
    {viewEvidence && (
      <Modal isOpen title="Xem bằng chứng" subtitle={report.product.title} icon={<Paperclip size={16} aria-hidden="true" />}
        onClose={closeEvidence} maxWidth="2xl" stickyHeader bodyClassName="space-y-3 p-3 sm:p-4">
        {availableAttachments.length === 2 && (
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Loại bằng chứng">
            {availableAttachments.map(({ kind, label, icon: Icon }) => (
              <button key={kind} type="button" className={`${button} aria-pressed:border-[#C59B58] aria-pressed:bg-[#FBF5EB]`}
                aria-pressed={viewEvidence === kind} onClick={() => setViewEvidence(kind)}><Icon size={14} aria-hidden="true" /> {label}</button>
            ))}
          </div>
        )}
        <div className="grid min-h-36 place-items-center rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] p-2">
          <ReportEvidence key={viewEvidence} reportId={report.id} kind={viewEvidence} />
        </div>
      </Modal>
    )}
  </>;
}

export default function ProductReportsPanel({ admin }: { admin: boolean }) {
  const [params, setParams] = useSearchParams();
  const target = params.get('report');
  const product = params.get('product');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ items: ProductReportItem[]; total: number; pageSize: number }>();
  const [error, setError] = useState('');
  const [openedReport, setOpenedReport] = useState<ProductReportItem | null>(null);
  const selected = target ? result?.items.find(item => item.id === target) : openedReport;

  useEffect(() => {
    const abort = new AbortController();
    setResult(undefined);
    setError('');
    productReportsService.list(status, page, target, product, abort.signal).then(data => {
      if (abort.signal.aborted) return;
      setResult(data);
    }).catch(() => { if (!abort.signal.aborted) setError('Chưa tải được báo cáo sản phẩm.'); });
    return () => abort.abort();
  }, [page, product, revision, status, target]);

  function clearTarget() {
    setOpenedReport(null);
    if (!target) return;
    setParams(previous => {
      const next = new URLSearchParams(previous);
      next.delete('report');
      next.delete('status');
      return next;
    }, { replace: true });
  }

  function showHistory(productId: string) {
    setOpenedReport(null);
    setStatus('ALL');
    setPage(1);
    setParams(previous => {
      const next = new URLSearchParams(previous);
      next.delete('report');
      next.delete('status');
      next.set('product', productId);
      return next;
    }, { replace: true });
  }

  return (
    <section aria-label="Báo cáo sản phẩm" className="min-w-0 overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white">
      <header className="flex flex-col gap-3 border-b border-[#EAE4D7] px-4 py-3.5 sm:px-5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F]">
            <Flag size={17} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base leading-tight font-semibold text-[#1A1612]">Báo cáo sản phẩm</h2>
            {result && <p className="mt-1 text-xs tabular-nums text-[#7D715E]">{result.total} báo cáo</p>}
          </div>
        </div>
        <div className="grid auto-cols-fr grid-flow-col gap-2 md:auto-cols-[12.5rem]">
          {target
            ? <button type="button" className={button} onClick={clearTarget}>Xem danh sách</button>
            : <div className="relative min-w-0">
              <select aria-label="Trạng thái báo cáo" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }} className={`${select} pr-8 pl-3`}>
                <option value="">Đang xử lý</option>
                {Object.entries(productReportStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                <option value="ALL">Tất cả trạng thái</option>
              </select>
              <ChevronDown className={arrow} aria-hidden="true" />
            </div>}
          {product && <button type="button" className={button} onClick={() => {
            setStatus('');
            setPage(1);
            setParams(previous => {
              const next = new URLSearchParams(previous);
              next.delete('product');
              return next;
            }, { replace: true });
          }}>Bỏ lọc sản phẩm</button>}
        </div>
      </header>
      {error ? <p role="alert" className="px-5 py-8 text-center text-sm text-[#DC2626]">{error}</p>
        : !result ? <p role="status" className="px-5 py-8 text-center text-sm text-[#7D715E]">Đang tải báo cáo…</p>
        : !result.items.length ? <p className="px-5 py-8 text-center text-sm text-[#7D715E]">Không có báo cáo phù hợp.</p>
        : <>
            <div aria-hidden="true" className={`hidden border-b border-[#EAE4D7] bg-[#FAF8F5] px-5 py-2.5 text-xs font-semibold text-[#7D715E] xl:grid ${rowColumns}`}>
              <span>Sản phẩm</span><span>Lý do & bằng chứng</span><span>Thời gian gửi</span><span>Trạng thái</span><span className="text-center">Thao tác</span>
            </div>
            <ul className="divide-y divide-[#EAE4D7]">
              {result.items.map(report => <li key={report.id} className={`grid min-w-0 grid-cols-2 items-center gap-x-3 gap-y-2.5 px-4 py-3.5 text-sm transition-colors hover:bg-[#FAF8F5]/60 sm:px-5 ${rowColumns}`}>
                <div className="col-span-2 flex min-w-0 items-center gap-3 xl:col-span-1">
                  <img loading="lazy" alt="" src={getSafeProductImageUrl(report.product.imageUrl, report.product.title)} onError={handleProductImageError}
                    className="size-12 shrink-0 rounded-lg border border-[#EAE4D7] bg-white object-contain" />
                  <div className="min-w-0">
                    <p className="font-semibold leading-snug wrap-anywhere text-[#1A1612]">{report.product.title}</p>
                    <p className="mt-0.5 text-xs leading-snug wrap-anywhere text-[#7D715E]">{report.product.store.name}{report.variantName && ` · ${report.variantName}`}</p>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="font-medium leading-snug wrap-anywhere text-[#1A1612]">{productReportReasons[report.reason]}</p>
                  {(report.evidenceMime || report.evidenceVideoMime) && <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-[#7D715E]">
                    {report.evidenceMime && <span className="inline-flex items-center gap-1"><Image size={13} aria-hidden="true" /> Ảnh</span>}
                    {report.evidenceVideoMime && <span className="inline-flex items-center gap-1"><Video size={13} aria-hidden="true" /> Video</span>}
                  </div>}
                </div>
                <time dateTime={report.createdAt} className="text-xs leading-snug tabular-nums text-[#7D715E]">{dateTime.format(new Date(report.createdAt))}</time>
                <span className={`w-fit max-w-full rounded-lg border px-2 py-1 text-xs font-medium leading-snug ${statusTone[report.status]}`}>{productReportStatuses[report.status]}</span>
                <button type="button" className={`${button} border-[#EEDFC6] bg-[#FBF5EB] hover:border-[#C59B58] hover:bg-[#F3EFE6]`} onClick={() => setOpenedReport(report)}>
                  <Eye size={15} className="shrink-0" aria-hidden="true" /> Xem báo cáo
                </button>
              </li>)}
            </ul>
          </>}
      {!target && result && (page > 1 || result.total > result.pageSize) && (
        <footer className="border-t border-[#EAE4D7] px-4 py-3 sm:px-5">
          <div className="ml-auto grid max-w-64 grid-cols-[1fr_auto_1fr] items-center gap-3 text-xs tabular-nums text-[#7D715E]">
            <button type="button" className={button} disabled={page <= 1} onClick={() => setPage(n => n - 1)}><ChevronLeft size={15} aria-hidden="true" /> Trước</button>
            <span>{page} / {Math.max(1, Math.ceil(result.total / result.pageSize))}</span>
            <button type="button" className={button} disabled={page * result.pageSize >= result.total} onClick={() => setPage(n => n + 1)}>Sau <ChevronRight size={15} aria-hidden="true" /></button>
          </div>
        </footer>
      )}
      {selected && <ProductReportDetail key={selected.id} report={selected} admin={admin} onClose={clearTarget} onChanged={() => { clearTarget(); setRevision(n => n + 1); }} onHistory={() => showHistory(selected.product.id)} />}
    </section>
  );
}
