import { useRef, useState, type FormEvent } from 'react';
import { Info, RefreshCw, RotateCcw, X } from 'lucide-react';
import { ReturnActionDialog } from './ReturnActionDialog';
import { CaseProductImage, caseProducts } from './ReturnCaseProducts';
import { useReturnAction } from '../../hooks/useReturnDetail';
import { returnService, type ReturnDetail } from '../../services/return.service';
import { returnReasonLabel } from '../../utils/return-status.utils';

type Resolution = 'REFUND' | 'EXCHANGE' | 'REJECT';
type Liability = 'LOGISTICS_FAULT' | 'SHOP_FAULT' | 'CUSTOMER_REASON';
const resultLabels = { REFUND: 'Hoàn tiền vào Ví SCANMS', EXCHANGE: 'Đổi sản phẩm mới', REJECT: 'Từ chối yêu cầu' };
const liabilityLabels = { LOGISTICS_FAULT: 'Lỗi vận chuyển · GHN', SHOP_FAULT: 'Lỗi từ Shop / sản phẩm', CUSTOMER_REASON: 'Lý do từ khách hàng' };

export function ShopReturnInspectionDialog({ request }: { request: ReturnDetail }) {
  const reviewed = [...request.events].reverse().find(event => event.type === 'LIABILITY_ASSESSED' && event.data?.source === 'SYSTEM_MANAGER_REVIEW')?.data?.liability as Liability | undefined;
  const [resolution, setResolution] = useState<Resolution>(request.preferredResolution || 'REFUND');
  const [liability, setLiability] = useState<Liability>(request.reason === 'CHANGE_OF_MIND' ? 'CUSTOMER_REASON' : 'SHOP_FAULT');
  const [notes, setNotes] = useState('');
  const lock = useRef(false);
  const action = useReturnAction(request.id, returnService.submitInspection);
  const formId = `inspection-${request.id}`;
  const changed = Boolean(request.preferredResolution && resolution !== request.preferredResolution);
  const products = caseProducts(request);
  const allowed = notes.trim().length >= 10 && notes.trim().length <= 2000;
  const confirmationLabel = resolution === 'EXCHANGE' ? 'Xác nhận đổi hàng' : resolution === 'REFUND' ? 'Xác nhận hoàn tiền' : 'Xác nhận từ chối';
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || action.isPending || !allowed || request.status !== 'INSPECTING') return;
    lock.current = true;
    try { await action.mutateAsync({ resolution, liability: reviewed || liability, notes: notes.trim() }); }
    catch { /* Keep the inspection notes for retry. */ }
    finally { lock.current = false; }
  }
  return <ReturnActionDialog title="Kết quả kiểm tra" compactChoices busy={action.isPending}
    subtitle={`Mã đơn: ${request.order.externalOrderSn}`}
    choices={[
      { label: 'Hoàn tiền', value: 'REFUND', icon: <RotateCcw aria-hidden="true" />, dialogTitle: 'Chấp thuận hoàn tiền' },
      { label: 'Đổi sản phẩm', value: 'EXCHANGE', icon: <RefreshCw aria-hidden="true" />, dialogTitle: 'Chấp thuận đổi sản phẩm' },
      { label: 'Từ chối yêu cầu', value: 'REJECT', icon: <X aria-hidden="true" />, dialogTitle: 'Từ chối sau kiểm tra', danger: true },
    ]}
    onSelect={value => { setResolution(value as Resolution); action.reset(); }}
    confirmation={{ formId, label: confirmationLabel, busyLabel: 'Đang xác nhận…', disabled: !allowed, width: 640, danger: resolution === 'REJECT' }}>
    <form id={formId} onSubmit={event => void submit(event)} className="return-inspection-form">
      <section aria-label="Sản phẩm kiểm tra">
        <h4>{request.items?.length ? 'Sản phẩm kiểm tra' : 'Sản phẩm trong đơn gốc'}</h4>
        <div className="return-inspection-products">{products.map(product => <div key={product.id} className="return-inspection-product"><CaseProductImage product={product} size={48} /><div><strong>{product.title}</strong><p>{product.variantName ? `${product.variantName} · ` : ''}Số lượng: {product.quantity}</p></div></div>)}</div>
        <p className="return-inspection-reason">Lý do: {returnReasonLabel(request.reason)}</p>
      </section>
      <dl className="return-inspection-resolution"><div><dt>Khách yêu cầu</dt><dd>{request.preferredResolution ? resultLabels[request.preferredResolution] : 'Chưa ghi nhận'}</dd></div><div><dt>Kết quả xử lý</dt><dd>{resultLabels[resolution]}</dd></div></dl>
      <div><label htmlFor={`${formId}-liability`}>Bên chịu trách nhiệm</label>
        {reviewed ? <div className="return-inspection-reviewed"><strong>{liabilityLabels[reviewed]}</strong><span>System Manager đã xác minh</span></div> : <select id={`${formId}-liability`} value={liability} disabled={action.isPending} onChange={event => setLiability(event.target.value as Liability)}>
          <option value="SHOP_FAULT">Lỗi từ Shop / sản phẩm</option>
          <option value="CUSTOMER_REASON">{request.reason === 'CHANGE_OF_MIND' ? 'Khách đổi ý' : 'Lý do từ khách hàng'}</option>
        </select>}
      </div>
      <div><label htmlFor={`${formId}-notes`}>Ghi chú kiểm tra <span className="text-[#DC2626]">*</span></label>
        <textarea id={`${formId}-notes`} required minLength={10} maxLength={2000} disabled={action.isPending} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Mô tả tình trạng hàng và căn cứ quyết định…" aria-describedby={`${formId}-notes-hint`} />
        <div id={`${formId}-notes-hint`} className="return-inspection-note-meta"><span>{changed ? 'Ghi rõ lý do thay đổi phương án.' : 'Nội dung được thông báo cho khách.'}</span><span className="tabular-nums">{notes.length}/2.000</span></div>
      </div>
      <p className="return-inspection-info"><Info size={16} aria-hidden="true" /><span>{resolution === 'EXCHANGE' ? 'Sau khi xác nhận, Shop chuẩn bị hàng đổi và tạo vận đơn.' : resolution === 'REFUND' ? 'Khách cần xác nhận đồng ý để nhận tiền hoàn vào Ví SCANMS.' : 'Khách có thể yêu cầu SCANMS xem xét lại kết quả.'}</span></p>
      {action.error && <p role="alert" className="text-sm text-[#DC2626]">{action.error instanceof Error ? action.error.message : 'Chưa lưu được kết quả. Vui lòng thử lại.'}</p>}
    </form>
  </ReturnActionDialog>;
}
