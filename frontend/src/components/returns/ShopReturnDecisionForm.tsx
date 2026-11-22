import { ReturnActionDialog } from './ReturnActionDialog';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { orderService } from '../../services/order.service';
import { uploadService } from '../../services/upload.service';
import { toast } from '../../utils/toast';
import { buildShopApprovalResponse } from '../../utils/return-actions';
import type { ReturnDetail } from '../../services/return.service';
import { returnReasonLabel } from '../../utils/return-status.utils';
import { handleProductImageError } from '../../utils/image-fallback.utils';
import { Image as ImageIcon, Info, Plus, Video, X } from 'lucide-react';

type Decision = 'APPROVE' | 'REJECT';
type RejectionReason = NonNullable<Parameters<typeof orderService.respondReturnRequest>[1]['rejectionReason']>;
type Result = Awaited<ReturnType<typeof orderService.respondReturnRequest>>;
interface Props {
  orderId: string;
  request: ReturnDetail;
  onProcessed?: (decision: Decision, result: Result) => void;
}

const input = 'mt-1 min-h-11 w-full min-w-0 rounded-xl border border-[#EAE4D7] bg-white p-3 text-sm font-normal text-[#1A1612] outline-none focus:border-[#C59B58] disabled:opacity-50';
const reasons: Array<[RejectionReason, string]> = [
  ['EVIDENCE_MISMATCH', 'Chưa đủ căn cứ xác nhận lỗi'],
  ['PRODUCT_MISMATCH', 'Sản phẩm không khớp đơn hàng'],
  ['OUTSIDE_POLICY', 'Chưa đáp ứng điều kiện đổi trả'], ['OTHER', 'Lý do khác'],
];

export function EvidencePreview({ file, disabled, onRemove }: { file: File; disabled: boolean; onRemove: () => void }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const preview = URL.createObjectURL(file);
    setUrl(preview);
    return () => URL.revokeObjectURL(preview);
  }, [file]);
  const video = file.type.startsWith('video/');
  return <div className="shop-rejection-evidence" title={file.name}>
    <div className="shop-rejection-thumbnail">{url && (video ? <><video src={url} muted playsInline preload="metadata" aria-label={file.name} /><Video size={16} className="shop-rejection-video-icon" aria-hidden="true" /></> : <img src={url} alt={file.name} />)}</div>
    <button type="button" disabled={disabled} onClick={onRemove} aria-label={`Xóa tệp ${file.name}`}><X size={12} aria-hidden="true" /></button>
    <span>{video ? 'Video' : 'Ảnh'}</span>
  </div>;
}

export function ShopReturnDecisionForm({ orderId, request, onProcessed }: Props) {
  const client = useQueryClient();
  const busy = useRef(false);
  const [working, setWorking] = useState<Decision | null>(null);
  const [approvalNote, setApprovalNote] = useState('');
  const [rejectionNote, setRejectionNote] = useState('');
  const [reason, setReason] = useState<RejectionReason | ''>('');
  const [files, setFiles] = useState<File[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [processed, setProcessed] = useState<Decision | null>(null);
  const exchange = request.preferredResolution === 'EXCHANGE';
  const refund = request.preferredResolution === 'REFUND';
  const approvalLabel = exchange ? 'Chấp thuận đổi hàng' : refund ? 'Chấp thuận trả hàng / hoàn tiền' : 'Chấp thuận đổi trả';
  const approvalFormId = `approve-return-${request.id}`;
  const rejectionFormId = `reject-return-${request.id}`;
  const rejectionValid = Boolean(reason) && rejectionNote.trim().length >= 20 && rejectionNote.trim().length <= 850 && files.length >= 1 && files.length <= 5;
  const products = request.items?.length ? request.items.map(line => ({
    id: line.id, title: line.orderItem.product.title, imageUrl: line.orderItem.product.imageUrl,
    variantName: line.orderItem.variant?.name, quantity: line.quantity,
  })) : request.order.products ?? [];

  async function decide(decision: Decision) {
    if (busy.current || processed || request.status !== 'REQUESTED') return;
    if (decision === 'REJECT' && (!reason || rejectionNote.trim().length < 20 || rejectionNote.trim().length > 850 || files.length < 1 || files.length > 5)) {
      setError('Để từ chối, hãy chọn lý do, giải thích ít nhất 20 ký tự và đính kèm 1–5 ảnh/video.');
      return;
    }
    busy.current = true;
    setWorking(decision);
    setError('');
    try {
      const response = decision === 'APPROVE' ? buildShopApprovalResponse(request.preferredResolution, approvalNote) : rejectionNote.trim();
      const evidenceUrls = decision === 'REJECT' ? await Promise.all(files.map(async file =>
        (await uploadService.uploadMedia(file, `scanms/returns/${request.id}/shop-evidence`)).url)) : undefined;
      const result = await orderService.respondReturnRequest(orderId, { decision, response,
        ...(decision === 'REJECT' ? { rejectionReason: reason as RejectionReason, escalateToManager: true, evidenceUrls } : {}),
      });
      setProcessed(decision);
      toast.success(decision === 'APPROVE' ? 'Đã chấp thuận · Chờ khách gửi hàng trả' : 'Đã chuyển vận hành xem xét');
      await Promise.allSettled([
        client.invalidateQueries({ queryKey: ['return-detail', request.id] }),
        client.invalidateQueries({ queryKey: ['shop-returns'] }),
        client.invalidateQueries({ queryKey: ['admin-return-disputes'] }),
        client.invalidateQueries({ queryKey: ['return-disputes'] }),
      ]);
      onProcessed?.(decision, result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Chưa xử lý được yêu cầu. Vui lòng thử lại.');
    } finally { busy.current = false; setWorking(null); }
  }

  if (processed) return <div role="status" className="space-y-2 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-4 text-sm">
    <p>{processed === 'APPROVE' ? 'Chờ khách gửi hàng trả' : 'Đã chuyển vận hành xem xét'}</p>
    <Link to={`/merchant/returns/${request.id}`} className="inline-flex min-h-11 items-center rounded-xl border border-[#EEDFC6] bg-white px-3 py-2 font-semibold text-[#8A6736]">Mở hồ sơ đổi trả →</Link>
  </div>;
  if (request.status !== 'REQUESTED') return null;

  return <div className="shop-return-decisions min-w-0" aria-label="Shop phản hồi yêu cầu đổi trả">
    <ReturnActionDialog title={approvalLabel} subtitle={`Mã đơn: ${request.order.externalOrderSn || orderId}`} busy={Boolean(working)} onSelect={() => setError('')}
      confirmation={{ formId: approvalFormId, label: 'Xác nhận chấp thuận', busyLabel: 'Đang xác nhận…' }}>
    <form id={approvalFormId} onSubmit={event => { event.preventDefault(); void decide('APPROVE'); }} className="min-w-0 space-y-5">
      <section aria-label="Thông tin yêu cầu" className="space-y-3">
        <h4 className="text-sm font-bold text-[#1A1612]">Thông tin yêu cầu</h4>
        {products.map(product => <div key={product.id} className="flex min-w-0 items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#EAE4D7] bg-white text-[#B88E4F]">
            {product.imageUrl ? <img src={product.imageUrl} alt={product.title} onError={handleProductImageError} className="h-full w-full object-contain" /> : <ImageIcon size={22} aria-label="Chưa có ảnh sản phẩm" />}
          </span>
          <div className="min-w-0 text-sm">
            <p className="font-semibold text-[#1A1612]">{product.title}</p>
            <p className="mt-1 text-xs text-[#7D715E]">{product.variantName || 'Không phân loại'} · Số lượng: {product.quantity}</p>
          </div>
        </div>)}
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="min-w-0 rounded-xl border border-[#EAE4D7] p-3">
            <dt className="text-xs text-[#7D715E]">Lý do đổi trả</dt>
            <dd className="mt-1 font-medium text-[#1A1612]">{returnReasonLabel(request.reason)}</dd>
            {request.details && <dd className="mt-1 whitespace-pre-wrap text-xs text-[#7D715E]">{request.details}</dd>}
          </div>
          <div className="min-w-0 rounded-xl border border-[#EAE4D7] p-3">
            <dt className="text-xs text-[#7D715E]">Phương án yêu cầu</dt>
            <dd className="mt-1 font-medium text-[#1A1612]">{exchange ? 'Đổi hàng' : refund ? 'Trả hàng / Hoàn tiền' : 'Chưa ghi nhận'}</dd>
          </div>
        </dl>
      </section>
      <label className="block text-sm font-semibold">Ghi chú cho khách <span className="font-normal text-[#7D715E]">· Không bắt buộc</span>
        <textarea disabled={Boolean(working)} rows={2} maxLength={850} value={approvalNote} onChange={event => setApprovalNote(event.target.value)} placeholder="Nhập lời nhắn cho khách…" className={`${input} h-20 min-h-20 resize-none`} />
      </label>
      <p className="flex items-start gap-2 rounded-lg bg-[#FBF5EB] p-3 text-xs leading-relaxed text-[#7D715E]"><Info size={16} className="shrink-0" />Sau khi chấp thuận, khách có thể gửi hàng trả về Shop.</p>
      {error && <p role="alert" className="text-sm text-[#DC2626]">{error}</p>}
    </form>
    </ReturnActionDialog>
    <ReturnActionDialog title="Từ chối yêu cầu" subtitle={`Mã đơn: ${request.order.externalOrderSn || orderId}`} busy={Boolean(working)} onSelect={() => setError('')}
      choices={[{ label: 'Từ chối & chuyển xử lý', dialogTitle: 'Từ chối yêu cầu', value: 'REJECT', danger: true }]}
      confirmation={{ formId: rejectionFormId, label: 'Từ chối & chuyển xử lý', busyLabel: 'Đang gửi…', disabled: !rejectionValid, width: 640, danger: true }}>
      <form id={rejectionFormId} onSubmit={event => { event.preventDefault(); void decide('REJECT'); }} className="shop-rejection-form">
        <section className="shop-rejection-products" aria-label="Sản phẩm trong yêu cầu">{products.map(product => <div key={product.id} className="shop-rejection-product"><span className="shop-rejection-product-image">{product.imageUrl ? <img src={product.imageUrl} alt={product.title} onError={handleProductImageError} /> : <ImageIcon size={20} aria-label="Chưa có ảnh sản phẩm" />}</span><div><strong>{product.title}</strong><p>{product.variantName ? `${product.variantName} · ` : ''}Số lượng: {product.quantity}</p></div></div>)}<p className="shop-rejection-preference">Khách yêu cầu: <strong>{exchange ? 'Đổi sản phẩm mới' : refund ? 'Trả hàng / Hoàn tiền' : 'Chưa ghi nhận'}</strong></p></section>
        <label className="shop-rejection-field">Lý do từ chối <span aria-hidden="true">*</span>
          <select disabled={Boolean(working)} required value={reason} onChange={event => setReason(event.target.value as RejectionReason | '')} className="shop-rejection-select">
            <option value="" disabled>Chọn lý do</option>{reasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="shop-rejection-field"><span className="shop-rejection-field-heading"><span>Giải thích cho khách <span aria-hidden="true">*</span></span><small>20–850 ký tự</small></span>
          <textarea disabled={Boolean(working)} required minLength={20} maxLength={850} rows={3} value={rejectionNote} onChange={event => setRejectionNote(event.target.value)} placeholder="Mô tả tình trạng và căn cứ từ chối…" aria-describedby={`${rejectionFormId}-counter`} className="shop-rejection-note" />
          <span id={`${rejectionFormId}-counter`} className="shop-rejection-counter">{rejectionNote.length}/850</span>
        </label>
        <section aria-label="Bằng chứng từ chối" className="shop-rejection-attachments">
          <div className="shop-rejection-field-heading"><h4>Bằng chứng <span aria-hidden="true">*</span></h4><small>{files.length}/5 tệp · Tối thiểu 1</small></div>
          <input ref={fileInput} disabled={Boolean(working)} type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" className="sr-only" aria-label="Chọn ảnh hoặc video bằng chứng" onChange={event => {
            const chosen = Array.from(event.target.files || []);
            const combined = [...files, ...chosen.filter(file => !files.some(current => current.name === file.name && current.size === file.size && current.lastModified === file.lastModified))];
            if (combined.length > 5) setError('Chỉ chọn tối đa 5 tệp bằng chứng.');
            else if (chosen.some(file => !['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'].includes(file.type))) setError('Chọn ảnh JPG, PNG, WEBP hoặc video MP4, MOV, WEBM.');
            else { setFiles(combined); setError(''); }
            event.target.value = '';
          }} />
          <div className="shop-rejection-files"><button type="button" className="shop-rejection-add" disabled={Boolean(working) || files.length >= 5} onClick={() => fileInput.current?.click()}><Plus size={16} aria-hidden="true" />Thêm ảnh/video</button>{files.map((file, index) => <EvidencePreview key={`${file.name}-${file.size}-${file.lastModified}`} file={file} disabled={Boolean(working)} onRemove={() => { setFiles(current => current.filter((_, position) => position !== index)); setError(''); }} />)}</div>
        </section>
        <p className="shop-rejection-info"><Info size={15} aria-hidden="true" />Khách được thông báo; hồ sơ chuyển vận hành xem xét.</p>
        {error && <p role="alert" className="text-sm text-[#DC2626]">{error}</p>}
      </form>
    </ReturnActionDialog>

  </div>;
}
