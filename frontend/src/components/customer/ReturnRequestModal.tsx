import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ImagePlus, Loader2, Upload, Video, X } from 'lucide-react';
import { customerService, type CustomerOrder, type CustomerReturnRequest } from '../../services/customer.service';
import { uploadService } from '../../services/upload.service';
import { toast } from '../../utils/toast';
import { Select } from '../ui/Select';

interface Props {
  order: CustomerOrder;
  onClose: () => void;
  onSubmitted: (request: CustomerReturnRequest) => void;
}

const reasons: Array<{ value: CustomerReturnRequest['reason']; label: string }> = [
  { value: 'DAMAGED', label: 'Sản phẩm hư hỏng' },
  { value: 'WRONG_ITEM', label: 'Giao sai sản phẩm' },
  { value: 'EXPIRED', label: 'Sản phẩm hết hạn' },
  { value: 'CHANGE_OF_MIND', label: 'Đổi ý / không còn nhu cầu' },
  { value: 'OTHER', label: 'Lý do khác' },
];

export function ReturnRequestModal({ order, onClose, onSubmitted }: Props) {
  const dialogRef = useRef<HTMLFormElement>(null);
  const alreadyRequested = useMemo(() => {
    const quantities = new Map<string, number>();
    for (const request of order.returnRequests || (order.returnRequest ? [order.returnRequest] : [])) {
      if (!['COMPLETED', 'REFUNDED'].includes(request.status)) continue;
      for (const item of request.items || []) quantities.set(item.orderItemId, (quantities.get(item.orderItemId) || 0) + item.quantity);
    }
    return quantities;
  }, [order.returnRequests, order.returnRequest]);
  const remainingQuantity = (orderItemId: string, purchased: number) => Math.max(0, purchased - (alreadyRequested.get(orderItemId) || 0));
  const [reason, setReason] = useState<CustomerReturnRequest['reason']>('DAMAGED');
  const [preferredResolution, setPreferredResolution] = useState<'REFUND' | 'EXCHANGE'>('EXCHANGE');
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>(
    () => order.orderItems.length === 1 ? { [order.orderItems[0].id]: Math.max(0, order.orderItems[0].quantity - (alreadyRequested.get(order.orderItems[0].id) || 0)) } : {},
  );
  const [details, setDetails] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const daysLeft = useMemo(() => {
    const anchor = new Date(order.deliveredAt || order.completedAt || 0).getTime();
    return Math.max(0, Math.ceil((anchor + 14 * 24 * 60 * 60 * 1000 - Date.now()) / 86400000));
  }, [order.deliveredAt, order.completedAt]);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector<HTMLElement>('button')?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const items = Object.entries(selectedItems).filter(([, quantity]) => quantity > 0)
      .map(([orderItemId, quantity]) => ({ orderItemId, quantity }));
    if (!items.length) { toast.error('Vui lòng chọn ít nhất một sản phẩm cần đổi trả'); return; }
    if (images.length === 0 || (reason === 'DAMAGED' && !video)) {
      toast.error(reason === 'DAMAGED' ? 'Vui lòng cung cấp ảnh và video mở hộp' : 'Vui lòng cung cấp ít nhất 1 ảnh tình trạng sản phẩm');
      return;
    }
    setSubmitting(true);
    try {
      const imageUrls = await Promise.all(
        images.map((file) => uploadService.uploadImage(file, `scanms/returns/${order.id}/images`)),
      );
      const unboxingVideoUrl = video ? await uploadService.uploadVideo(video, `scanms/returns/${order.id}/video`) : undefined;
      const result = await customerService.createReturnRequest(order.id, {
        reason,
        preferredResolution,
        items,
        details: details.trim() || undefined,
        imageUrls,
        unboxingVideoUrl,
      });
      toast.success('Đã gửi yêu cầu trả hàng/hoàn tiền tới gian hàng');
      onSubmitted(result.returnRequest);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Không thể gửi yêu cầu trả hàng');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-[#231D15]/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4" onClick={() => { if (!submitting) onClose(); }}>
      <form ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="return-request-title" aria-describedby="return-request-help"
        onSubmit={submit} onClick={event => event.stopPropagation()}
        onKeyDown={event => {
          if (event.key === 'Escape' && !submitting) { event.preventDefault(); onClose(); }
          if (event.key !== 'Tab') return;
          const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]') || []);
          const first = focusable[0], last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }}
        className="w-full max-w-xl max-h-[min(92vh,900px)] overflow-y-auto overscroll-contain rounded-2xl bg-white border border-[#EAE4D7] shadow-2xl px-4 sm:px-6 text-left">
        <div className="sticky top-0 z-10 -mx-4 flex items-start justify-between gap-4 border-b border-[#EAE4D7] bg-white px-4 py-4 sm:-mx-6 sm:px-6">
          <div>
            <h2 id="return-request-title" className="text-lg font-black text-[#1A1612]">Yêu cầu trả hàng / hoàn tiền</h2>
            <p className="text-xs text-[#7D715E] mt-1">Đơn #{order.externalOrderSn} · còn khoảng {daysLeft} ngày trong thời hạn 14 ngày</p>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} className="p-2 rounded-full bg-[#F3EFE6] text-[#7D715E] disabled:opacity-50" aria-label="Đóng"><X className="w-4 h-4" /></button>
        </div>

        <div id="return-request-help" className="mt-4 rounded-2xl bg-[#FBF5EB] border border-[#EEDFC6] p-3 flex gap-2 text-xs leading-relaxed text-[#7D715E]">
          <AlertTriangle className="w-4 h-4 text-[#B88E4F] shrink-0" />
          <span>Cần ảnh tình trạng sản phẩm. Nếu hàng hư hỏng, hãy kèm video mở hộp để xác định nguyên nhân; video là tùy chọn với lý do khác.</span>
        </div>

        <div className="mt-4 space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-xs font-bold text-[#1A1612]">Sản phẩm và số lượng cần đổi trả</legend>
            <p className="text-xs text-[#7D715E]">Bạn có thể tạo hồ sơ riêng cho sản phẩm còn lại trong 14 ngày, sau khi hồ sơ hiện tại kết thúc.</p>
            {order.orderItems.map(item => <div key={item.id} className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 text-xs ${selectedItems[item.id] ? 'border-[#C59B58] bg-[#FBF5EB]' : 'border-[#EAE4D7] bg-white'}`}>
              <input type="checkbox" checked={Boolean(selectedItems[item.id])} disabled={remainingQuantity(item.id, item.quantity) === 0} aria-label={`Chọn ${item.product?.title || 'sản phẩm'}`}
                onChange={event => setSelectedItems(current => ({ ...current, [item.id]: event.target.checked ? remainingQuantity(item.id, item.quantity) : 0 }))} />
              <span className="min-w-[120px] flex-1 break-words leading-relaxed text-[#1A1612]">{item.product?.title || 'Sản phẩm'}{item.variant?.name ? ` · ${item.variant.name}` : ''}</span>
              <input type="number" min={1} max={remainingQuantity(item.id, item.quantity)} disabled={!selectedItems[item.id]}
                value={selectedItems[item.id] === 0 ? '' : (selectedItems[item.id] ?? '')} aria-label={`Số lượng trả ${item.product?.title || 'sản phẩm'}`}
                onChange={event => setSelectedItems(current => ({ ...current, [item.id]: event.target.value === '' ? ('' as unknown as number) : Number(event.target.value) }))}
                onBlur={() => setSelectedItems(current => ({ ...current, [item.id]: Math.max(1, Math.min(remainingQuantity(item.id, item.quantity), Number(current[item.id]) || 1)) }))}
                className="w-14 rounded-lg border border-[#EAE4D7] p-2 text-center" />
              <span className="text-[#7D715E]">/ {remainingQuantity(item.id, item.quantity)} còn lại</span>
            </div>)}
          </fieldset>
          <label className="block text-xs font-bold text-[#1A1612]">Lý do
            <div className="mt-1.5">
              <Select value={reason} onChange={(e) => { const next = e.target.value as CustomerReturnRequest['reason']; setReason(next); if (next === 'CHANGE_OF_MIND') setPreferredResolution('REFUND'); }} className="w-full text-xs font-medium">
                {reasons.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </Select>
            </div>
          </label>
          <label className="block text-xs font-bold text-[#1A1612]">Bạn muốn được xử lý thế nào?
            <div className="mt-1.5">
              <Select value={preferredResolution} onChange={(e) => setPreferredResolution(e.target.value as 'REFUND' | 'EXCHANGE')} className="w-full text-xs font-medium">
                <option value="EXCHANGE">Đổi sản phẩm mới</option>
                <option value="REFUND">Hoàn tiền vào Ví SCANMS</option>
              </Select>
            </div>
          </label>
          <label className="block text-xs font-bold text-[#1A1612]">Mô tả chi tiết
            <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={4} maxLength={2000} placeholder="Mô tả lỗi, tình trạng bao bì và mong muốn xử lý..." className="mt-1.5 w-full rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] p-3 outline-none focus:border-[#C59B58]" />
          </label>

          <label className="block cursor-pointer rounded-2xl border border-dashed border-[#C59B58] bg-[#FBF5EB]/60 p-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#B88E4F]">
            <span className="flex items-center gap-2 text-xs font-bold text-[#1A1612]"><ImagePlus className="w-4 h-4 text-[#B88E4F]" /> Ảnh bằng chứng (bắt buộc, tối đa 5)</span>
            <span className="block text-[11px] text-[#7D715E] mt-1">JPG, PNG hoặc WEBP · tối đa 5MB/ảnh</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length > 5) { toast.error('Chỉ chọn tối đa 5 ảnh bằng chứng'); e.target.value = ''; return; }
              if (files.some(file => file.size > 5 * 1024 * 1024)) { toast.error('Mỗi ảnh phải nhỏ hơn 5MB'); e.target.value = ''; return; }
              setImages(files);
            }} />
            {images.length > 0 && <span className="block mt-2 text-xs text-[#B88E4F] font-bold">Đã chọn {images.length} ảnh: {images.map(file => file.name).join(', ')}</span>}
          </label>

          <label className="block cursor-pointer rounded-2xl border border-dashed border-[#C59B58] bg-[#FBF5EB]/60 p-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#B88E4F]">
            <span className="flex items-center gap-2 text-xs font-bold text-[#1A1612]"><Video className="w-4 h-4 text-[#B88E4F]" /> Video mở hộp {reason === 'DAMAGED' ? '(bắt buộc)' : '(nếu có)'}</span>
            <span className="block text-[11px] text-[#7D715E] mt-1">MP4, MOV hoặc WEBM · tối đa 100MB</span>
            <input type="file" accept="video/mp4,video/quicktime,video/webm" className="sr-only" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && file.size > 100 * 1024 * 1024) { toast.error('Video phải nhỏ hơn 100MB'); e.target.value = ''; return; }
              setVideo(file || null);
            }} />
            {video && <span className="block mt-2 text-xs text-[#B88E4F] font-bold truncate">{video.name}</span>}
          </label>
        </div>

        <div className="sticky bottom-0 z-10 -mx-4 mt-6 flex gap-2 border-t border-[#EAE4D7] bg-white px-4 py-4 shadow-[0_-8px_20px_rgba(35,29,21,.05)] sm:-mx-6 sm:px-6">
          <button type="button" onClick={onClose} disabled={submitting} className="flex-1 py-3 rounded-xl bg-[#F3EFE6] text-[#7D715E] text-xs font-bold">Đóng</button>
          <button type="submit" disabled={submitting || !Object.values(selectedItems).some(quantity => quantity > 0) || !images.length || (reason === 'DAMAGED' && !video)} className="flex-[2] py-3 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] disabled:opacity-50 text-[#231D15] text-xs font-bold flex items-center justify-center gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {submitting ? 'Đang tải bằng chứng...' : 'Gửi yêu cầu'}
          </button>
        </div>
      </form>
    </div>
  );
}
