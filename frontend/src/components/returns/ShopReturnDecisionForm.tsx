import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { orderService } from '../../services/order.service';
import { uploadService } from '../../services/upload.service';
import { toast } from '../../utils/toast';
import { buildShopApprovalResponse } from '../../utils/return-actions';

type Decision = 'APPROVE' | 'REJECT';
type RejectionReason = NonNullable<Parameters<typeof orderService.respondReturnRequest>[1]['rejectionReason']>;
type Result = Awaited<ReturnType<typeof orderService.respondReturnRequest>>;
interface Props {
  orderId: string;
  request: { id: string; status: string; preferredResolution?: 'REFUND' | 'EXCHANGE' | null };
  onProcessed?: (decision: Decision, result: Result) => void;
}

const input = 'mt-1 min-h-11 w-full min-w-0 rounded-xl border border-[#EAE4D7] bg-white p-3 text-sm font-normal text-[#1A1612] outline-none focus:border-[#C59B58] disabled:opacity-50';
const reasons: Array<[RejectionReason, string]> = [
  ['EVIDENCE_MISMATCH', 'Bằng chứng chưa xác nhận lỗi được phản ánh'],
  ['PRODUCT_MISMATCH', 'Sản phẩm yêu cầu không khớp đơn hàng'],
  ['OUTSIDE_POLICY', 'Yêu cầu chưa đáp ứng điều kiện đổi trả'], ['OTHER', 'Lý do khác'],
];

export function ShopReturnDecisionForm({ orderId, request, onProcessed }: Props) {
  const client = useQueryClient();
  const busy = useRef(false);
  const [working, setWorking] = useState<Decision | null>(null);
  const [approvalNote, setApprovalNote] = useState('');
  const [rejectionNote, setRejectionNote] = useState('');
  const [reason, setReason] = useState<RejectionReason | ''>('');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [processed, setProcessed] = useState<Decision | null>(null);
  const exchange = request.preferredResolution === 'EXCHANGE';
  const refund = request.preferredResolution === 'REFUND';
  const approvalLabel = exchange ? 'Chấp nhận yêu cầu đổi sản phẩm' : refund ? 'Chấp nhận yêu cầu trả hàng / hoàn tiền' : 'Chấp nhận yêu cầu đổi trả';

  async function decide(decision: Decision) {
    if (busy.current || processed || request.status !== 'REQUESTED') return;
    if (decision === 'REJECT' && (!reason || rejectionNote.trim().length < 20 || files.length < 1 || files.length > 5)) {
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
      toast.success(decision === 'APPROVE' ? 'Đã chấp nhận yêu cầu; tiếp tục xử lý trong hồ sơ đổi trả' : 'Đã gửi bằng chứng cho Manager');
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
    <p>{processed === 'APPROVE' ? 'Đã chấp nhận yêu cầu. Tiếp tục nhận hàng trả và kiểm tra trong hồ sơ.' : 'Đã chuyển hồ sơ và bằng chứng cho Manager phân xử.'}</p>
    <Link to={`/merchant/returns/${request.id}`} className="inline-flex min-h-11 items-center rounded-xl border border-[#EEDFC6] bg-white px-3 py-2 font-semibold text-[#8A6736]">Mở hồ sơ đổi trả →</Link>
  </div>;
  if (request.status !== 'REQUESTED') return null;

  return <div className="min-w-0 space-y-4" aria-label="Shop phản hồi yêu cầu đổi trả">
    <form onSubmit={event => { event.preventDefault(); void decide('APPROVE'); }} className="min-w-0 space-y-3 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-4">
      <h3 className="text-sm font-bold text-[#1A1612]">Khách đề nghị: {exchange ? 'Đổi sản phẩm mới' : refund ? 'Trả hàng / Hoàn tiền' : 'Đổi trả sản phẩm'}</h3>
      <p className="text-sm leading-relaxed text-[#7D715E]">{exchange
        ? 'Chấp nhận để khách gửi hàng trả. Sau khi nhận và kiểm tra, Shop xác nhận đổi sản phẩm và tạo vận đơn giao hàng thay thế trong hồ sơ này.'
        : 'Chấp nhận để khách gửi hàng trả. Shop nhận, kiểm tra và xác nhận phương án xử lý trong hồ sơ. Tiền chỉ vào ví khi khách xác nhận đồng ý hoàn tiền.'}</p>
      <label className="block text-sm font-semibold">Ghi chú cho khách <span className="font-normal text-[#7D715E]">(không bắt buộc)</span>
        <textarea disabled={Boolean(working)} rows={2} maxLength={850} value={approvalNote} onChange={event => setApprovalNote(event.target.value)} placeholder="Có thể để trống; hệ thống sẽ gửi hướng dẫn nhận hàng trả cho khách." className={input} />
      </label>
      <button type="submit" disabled={Boolean(working)} className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#C59B58] px-4 py-2.5 text-sm font-bold text-[#231D15] hover:bg-[#B88E4F] disabled:cursor-wait disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B88E4F] sm:w-auto">
        {working === 'APPROVE' ? 'Đang chấp nhận…' : approvalLabel}
      </button>
      <p className="text-xs leading-relaxed text-[#7D715E]">Không cần chọn lý do từ chối hay đính kèm bằng chứng khi chấp nhận. Chưa giao hàng thay thế hoặc hoàn tiền ở bước này.</p>
    </form>
    <details className="min-w-0 rounded-xl border border-[#EAE4D7] bg-white p-4">
      <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-[#DC2626]">Từ chối yêu cầu và chuyển Manager phân xử</summary>
      <form onSubmit={event => { event.preventDefault(); void decide('REJECT'); }} className="mt-3 min-w-0 space-y-3">
        <label className="block text-sm font-semibold">Lý do từ chối
          <select disabled={Boolean(working)} required value={reason} onChange={event => setReason(event.target.value as RejectionReason | '')} className={input}>
            <option value="">Chọn lý do</option>{reasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="block text-sm font-semibold">Giải thích cho khách (ít nhất 20 ký tự)
          <textarea disabled={Boolean(working)} required minLength={20} maxLength={850} rows={3} value={rejectionNote} onChange={event => setRejectionNote(event.target.value)} className={input} />
        </label>
        <label className="block text-sm font-semibold">Bằng chứng từ chối (1–5 ảnh/video)
          <input disabled={Boolean(working)} type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" className={`${input} text-xs`} onChange={event => {
            const chosen = Array.from(event.target.files || []);
            if (chosen.length > 5) { setError('Chỉ chọn tối đa 5 tệp bằng chứng.'); event.target.value = ''; }
            else { setFiles(chosen); setError(''); }
          }} />
        </label>
        {files.length > 0 && <p className="text-xs text-[#7D715E] [overflow-wrap:anywhere]">Đã chọn: {files.map(file => file.name).join(', ')}</p>}
        <p className="text-xs leading-relaxed text-[#7D715E]">Lý do và bằng chứng sẽ chuyển ngay cho Manager để đối chiếu lỗi Shop hoặc vận chuyển; khách cũng nhận được thông báo.</p>
        <button type="submit" disabled={Boolean(working) || !reason || rejectionNote.trim().length < 20 || files.length < 1 || files.length > 5} className="min-h-11 w-full rounded-xl border border-[#DC2626] px-4 py-2.5 text-sm font-bold text-[#DC2626] disabled:opacity-50 sm:w-auto">
          {working === 'REJECT' ? 'Đang gửi bằng chứng…' : 'Từ chối & chuyển Manager'}
        </button>
      </form>
    </details>
    {error && <p role="alert" className="text-sm text-[#DC2626] [overflow-wrap:anywhere]">{error}</p>}
  </div>;
}
