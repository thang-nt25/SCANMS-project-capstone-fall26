import { useRef, useState, type FormEvent } from 'react';
import { FileText, Info, Plus } from 'lucide-react';
import { ReturnActionDialog } from './ReturnActionDialog';
import { EvidencePreview } from './ShopReturnDecisionForm';
import { useReturnAction } from '../../hooks/useReturnDetail';
import { returnService, type ReturnDetail } from '../../services/return.service';
import { uploadService } from '../../services/upload.service';

export function ShopEvidencePanel({ request }: { request: ReturnDetail }) {
  const [details, setDetails] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [saved, setSaved] = useState<{ count: number; at: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const lock = useRef(false);
  const action = useReturnAction(request.id, returnService.escalateShopRejection);
  const submissions = request.events.filter(event => event.type === 'SHOP_EVIDENCE_SUBMITTED');
  const last = submissions[submissions.length - 1];
  const lastCount = last?.data?.evidenceUrls?.length;
  const count = typeof lastCount === 'number' ? lastCount : saved?.count;
  const at = last?.createdAt || saved?.at;
  const canSend = (request.status === 'SHOP_REJECTED' && !request.dispute) || (request.status === 'DISPUTED' && request.dispute?.status === 'OPEN');
  const busy = uploading || action.isPending;
  const valid = details.trim().length >= 20 && details.trim().length <= 2000 && files.length >= 1 && files.length <= 5;
  const formId = `shop-evidence-${request.id}`;
  if (!canSend || submissions.length >= 10) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current || busy || !valid) return;
    lock.current = true; setUploading(true); setError('');
    try {
      const evidenceUrls = await Promise.all(files.map(async file => (await uploadService.uploadMedia(file, `scanms/returns/${request.id}/shop-evidence`)).url));
      await action.mutateAsync({ details: details.trim(), evidenceUrls });
      setSaved({ count: files.length, at: new Date().toISOString() });
      setDetails(''); setFiles([]); setRevision(value => value + 1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Chưa gửi được bằng chứng. Vui lòng thử lại.'); }
    finally { lock.current = false; setUploading(false); }
  }
  return <section className="shop-evidence-panel" aria-label="Bằng chứng bổ sung">
    <div className="shop-evidence-summary"><span className="shop-evidence-icon"><FileText size={18} aria-hidden="true" /></span><div><h3>Bằng chứng bổ sung</h3><p>{count != null && at ? <>Đã gửi {count} tệp · <time dateTime={at}>{new Date(at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</time></> : 'Ảnh, video và ghi chú cho vận hành'}</p></div></div>
    <ReturnActionDialog key={revision} title="Bổ sung bằng chứng" subtitle={`Mã đơn: ${request.order.externalOrderSn}`} busy={busy}
      choices={[{ value: 'EVIDENCE', label: count != null ? 'Gửi bổ sung' : 'Bổ sung bằng chứng', dialogTitle: 'Bổ sung bằng chứng', icon: <Plus size={16} /> }]}
      confirmation={{ formId, label: 'Gửi bằng chứng', busyLabel: 'Đang gửi…', width: 640, disabled: !valid }}>
      <form id={formId} onSubmit={event => void submit(event)} className="shop-rejection-form">
        {request.order.outboundGhnTrackingNumber && <p className="shop-evidence-waybill">Vận đơn giao ban đầu <strong>{request.order.outboundGhnTrackingNumber}</strong></p>}
        <label className="shop-rejection-field"><span className="shop-rejection-field-heading"><span>Ghi chú <span aria-hidden="true">*</span></span><small>20–2.000 ký tự</small></span>
          <textarea required minLength={20} maxLength={2000} disabled={busy} value={details} onChange={event => setDetails(event.target.value)} placeholder="Mô tả bằng chứng và thông tin cần đối chiếu…" className="shop-rejection-note" aria-describedby={`${formId}-counter`} />
          <span id={`${formId}-counter`} className="shop-rejection-counter">{details.length}/2.000</span>
        </label>
        <section aria-label="Tệp bằng chứng"><div className="shop-rejection-field-heading"><h4>Ảnh/video <span aria-hidden="true">*</span></h4><small>{files.length}/5 tệp · Tối thiểu 1</small></div>
          <input ref={input} type="file" multiple disabled={busy} accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" className="sr-only" aria-label="Chọn tệp bằng chứng" onChange={event => {
            const chosen = Array.from(event.target.files || []);
            const combined = [...files, ...chosen.filter(file => !files.some(old => old.name === file.name && old.size === file.size && old.lastModified === file.lastModified))];
            if (combined.length > 5) setError('Chỉ chọn tối đa 5 tệp bằng chứng.');
            else if (chosen.some(file => !['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm'].includes(file.type))) setError('Chọn ảnh JPG, PNG, WEBP hoặc video MP4, MOV, WEBM.');
            else { setFiles(combined); setError(''); }
            event.target.value = '';
          }} />
          <div className="shop-rejection-files"><button type="button" className="shop-rejection-add" disabled={busy || files.length >= 5} onClick={() => input.current?.click()}><Plus size={16} />Thêm ảnh/video</button>{files.map((file, index) => <EvidencePreview key={`${file.name}-${file.size}-${file.lastModified}`} file={file} disabled={busy} onRemove={() => { setFiles(current => current.filter((_, position) => position !== index)); setError(''); }} />)}</div>
        </section>
        <p className="shop-rejection-info"><Info size={15} aria-hidden="true" />Bằng chứng được gửi cho vận hành để xem xét hồ sơ.</p>
        {error && <p role="alert" className="text-sm text-[#DC2626]">{error}</p>}
      </form>
    </ReturnActionDialog>
  </section>;
}
