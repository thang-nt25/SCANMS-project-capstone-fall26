import { useRef, useState, type FormEvent } from 'react';
import { ChevronDown, Flag, ImagePlus, Video, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { toast } from '../../utils/toast';
import { productReportReasons, productReportsService } from '../../services/product-reports.service';

function EvidenceField({ kind, required = false, onChange }: {
  kind: 'image' | 'video';
  required?: boolean;
  onChange: () => void;
}) {
  const [fileName, setFileName] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const isImage = kind === 'image';
  const media = isImage ? 'ảnh' : 'video';
  const Icon = isImage ? ImagePlus : Video;

  return (
    <div>
      <p className="font-medium">{isImage ? 'Ảnh đính kèm' : 'Video đính kèm'} <span className="text-xs font-normal text-[#7D715E]">
        ({required ? 'bắt buộc' : 'tùy chọn'} · {isImage ? 'tối đa 5 MB' : 'MP4, tối đa 10 MB'})
      </span></p>
      <div className="mt-1 flex min-h-11 items-center gap-2 rounded-xl border border-[#EAE4D7] px-2 focus-within:border-[#C59B58]">
        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-1.5">
          <input ref={input} type="file" name={isImage ? 'evidence' : 'evidenceVideo'} aria-label={`Chọn ${media} đính kèm`}
            aria-required={required} accept={isImage ? 'image/jpeg,image/png,image/webp' : 'video/mp4,.mp4'} className="sr-only"
            onChange={event => { setFileName(event.target.files?.[0]?.name ?? ''); onChange(); }} />
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#FBF5EB] px-2.5 py-1.5 font-medium text-[#715126]">
            <Icon size={15} aria-hidden="true" /> Chọn {media}
          </span>
          <span className="min-w-0 truncate text-xs text-[#7D715E]" aria-live="polite">{fileName || `Chưa chọn ${media}`}</span>
        </label>
        {fileName && (
          <button type="button" aria-label={`Gỡ ${media} đính kèm`} className="grid size-8 shrink-0 place-items-center rounded-lg text-[#7D715E] hover:bg-[#FBF5EB]"
            onClick={() => {
              if (!input.current) return;
              input.current.value = '';
              input.current.focus();
              setFileName('');
              onChange();
            }}>
            <X size={15} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

export function ProductReportDialog({ productId, title, variant, onClose }: {
  productId: string;
  title: string;
  variant?: { id: string; name: string };
  onClose: () => void;
}) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const requiresDetails = reason === 'SUSPECTED_COUNTERFEIT' || reason === 'OTHER';
  const requiresImage = reason === 'WRONG_IMAGE' || reason === 'SUSPECTED_COUNTERFEIT';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError('');
    const body = new FormData(event.currentTarget);
    const details = String(body.get('details') ?? '').trim();
    if (requiresDetails && !details) {
      setError('Vui lòng mô tả vấn đề cần kiểm tra.');
      return;
    }
    body.set('details', details);
    const file = body.get('evidence');
    if (file instanceof File && file.size) {
      if (file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setError('Chọn ảnh JPG, PNG hoặc WebP tối đa 5 MB.');
        return;
      }
    } else {
      if (requiresImage) {
        setError('Vui lòng đính kèm ảnh để đối chiếu báo cáo.');
        return;
      }
      body.delete('evidence');
    }
    const video = body.get('evidenceVideo');
    if (video instanceof File && video.size) {
      if (video.size > 10 * 1024 * 1024 || video.type !== 'video/mp4') {
        setError('Chọn video MP4 tối đa 10 MB.');
        return;
      }
    } else body.delete('evidenceVideo');
    if (variant) body.set('variantId', variant.id);
    setBusy(true);
    try {
      await productReportsService.submit(productId, body);
      toast.success('Đã gửi báo cáo sản phẩm.');
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Chưa gửi được báo cáo. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  }

  const field = 'mt-1 block w-full rounded-lg border border-[#EAE4D7] bg-white px-3 py-2 text-sm text-[#1A1612] focus-visible:outline-2 focus-visible:outline-[#B88E4F]';

  return (
    <Modal isOpen title="Báo cáo sản phẩm" subtitle={title} icon={<Flag size={16} />} onClose={() => { if (!busy) onClose(); }}>
      <form onSubmit={submit} className="space-y-3 text-sm text-[#1A1612]">
        {variant && <p className="rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-3 py-2 text-xs text-[#715126]">{variant.name}</p>}
        <label className="block font-medium">
          Lý do
          <span className="relative mt-1.5 block">
            <select
              name="reason"
              required
              value={reason}
              onChange={event => { setReason(event.target.value); setError(''); }}
              className="flex h-11 w-full cursor-pointer appearance-none items-center justify-center rounded-xl border border-[#EAE4D7] px-10 py-0 text-center text-sm font-medium leading-5 transition-colors hover:bg-[#FAF8F5]! [&::picker-icon]:hidden"
            >
              <option value="" disabled>Chọn lý do</option>
              {Object.entries(productReportReasons).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-2.5 grid size-6 -translate-y-1/2 place-items-center rounded-md bg-[#FBF5EB] text-[#8C6226]">
              <ChevronDown size={15} />
            </span>
          </span>
        </label>
        <label className="block font-medium">
          Ghi chú <span className="text-xs font-normal text-[#7D715E]">{requiresDetails ? '(bắt buộc)' : '(tùy chọn)'}</span>
          <textarea name="details" required={requiresDetails} maxLength={1000} rows={3} className={field}
            placeholder={requiresDetails ? 'Mô tả vấn đề cần kiểm tra' : undefined} />
        </label>
        <EvidenceField kind="image" required={requiresImage} onChange={() => setError('')} />
        <EvidenceField kind="video" onChange={() => setError('')} />
        {error && <p role="alert" className="text-xs text-[#DC2626]">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-[#EAE4D7] pt-3">
          <button type="button" disabled={busy} onClick={onClose} className="rounded-lg border border-[#EAE4D7] px-3 py-2 text-sm">Đóng</button>
          <button type="submit" disabled={busy} className="rounded-lg bg-[#C59B58] px-3 py-2 text-sm font-semibold text-[#231D15] hover:bg-[#B88E4F] disabled:opacity-50">
            {busy ? 'Đang gửi…' : 'Gửi báo cáo'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
