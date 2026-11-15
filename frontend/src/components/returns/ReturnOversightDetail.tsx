import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ExternalLink, FileText, History, Package, Scale, Truck } from 'lucide-react';
import { returnService, type ReturnDetail } from '@/services/return.service';
import { toast } from '@/utils/toast';
import { returnReasonLabel, returnStatusLabel } from '@/utils/return-status.utils';
import { ReturnTimeline } from './ReturnTimeline';
import { caseProducts, CaseProductImage, claimLabels, returnDate, returnMoney } from './ReturnCaseProducts';

type Ruling = 'APPROVE_REFUND' | 'APPROVE_EXCHANGE' | 'UPHOLD_SHOP';
type Liability = 'LOGISTICS_FAULT' | 'SHOP_FAULT' | 'CUSTOMER_REASON';
export type ReturnDetailPanel = 'products' | 'evidence' | 'shipping' | 'handling' | 'history';
const reasonLabels: Record<string,string> = { SHOP_REQUESTED_REVIEW: 'Shop đề nghị xem xét', CUSTOMER_DISAGREES: 'Khách không đồng ý với Shop', MANAGER_REVIEW_SHOP_REJECTION: 'Xem xét quyết định từ chối của Shop' };
const rulingLabels: Record<string,string> = { APPROVE_REFUND: 'Chấp thuận hoàn tiền', APPROVE_EXCHANGE: 'Chấp thuận đổi hàng', UPHOLD_SHOP: 'Giữ quyết định của Shop' };

export function ReturnOversightDetail({ snapshot, onChanged, activePanel, onPanelChange, handlingActions, shippingActions }: {
  snapshot: ReturnDetail; onChanged: (openDispute?: boolean) => Promise<void>;
  activePanel?: ReturnDetailPanel; onPanelChange?: (panel: ReturnDetailPanel) => void;
  handlingActions?: (request: ReturnDetail) => ReactNode; shippingActions?: (request: ReturnDetail) => ReactNode;
}) {
  const [panel, setPanel] = useState<ReturnDetailPanel>(activePanel || 'products');
  useEffect(() => { if (activePanel) setPanel(activePanel); }, [activePanel]);
  const [ruling, setRuling] = useState<Ruling>('APPROVE_REFUND');
  const [liability, setLiability] = useState<Liability | ''>('');
  const [notes, setNotes] = useState('');
  const detail = useQuery({ queryKey: ['return-detail', snapshot.id], queryFn: () => returnService.getOne(snapshot.id), staleTime: 0 });
  const request = detail.data;
  const resolve = useMutation({ mutationFn: (data: { id: string; ruling: Ruling; liability: Liability; notes: string }) => returnService.resolveDispute(data.id, { ruling: data.ruling, liability: data.liability, notes: data.notes }),
    onSuccess: async () => { await onChanged(); toast.success('Đã lưu quyết định phân xử.'); },
    onError: (error: Error) => toast.error(error.message || 'Không thể lưu quyết định.') });
  const openReview = useMutation({ mutationFn: () => returnService.openRejectedReview(snapshot.id),
    onSuccess: async () => { await onChanged(true); toast.success('Đã mở hồ sơ phân xử.'); },
    onError: (error: Error) => toast.error(error.message || 'Không thể mở phân xử.') });
  const busy = resolve.isPending || openReview.isPending;
  const canUphold = !request?.customerShipment?.receivedAt;
  const missingTracking = liability === 'LOGISTICS_FAULT' && !request?.order.outboundGhnTrackingNumber;
  const invalidRuling = ruling === 'UPHOLD_SHOP' && (!canUphold || liability === 'LOGISTICS_FAULT');
  const canResolve = request?.dispute?.status === 'OPEN';
  function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !request?.dispute || !canResolve || !liability || notes.trim().length < 20 || invalidRuling || missingTracking) return;
    resolve.mutate({ id: request.dispute.id, ruling, liability, notes: notes.trim() });
  }
  const products = request ? caseProducts(request) : [];
  const shopEvidence = request?.events.filter(event => event.type === 'SHOP_EVIDENCE_SUBMITTED') ?? [];
  const tabs = <div className="return-detail-tabs" role="tablist" aria-label="Nội dung hồ sơ">{([{ id:'products', label:'Đơn & sản phẩm', icon:Package },{ id:'evidence', label:'Bằng chứng', icon:FileText },{ id:'shipping', label:'Vận chuyển & GHN', icon:Truck },{ id:'handling', label:'Xử lý', icon:Scale },{ id:'history', label:'L\u1ecbch s\u1eed', icon:History }] as const).map(tab => <button key={tab.id} type="button" role="tab" aria-selected={panel === tab.id} disabled={busy} onClick={() => { setPanel(tab.id); onPanelChange?.(tab.id); }}><tab.icon size={15}/>{tab.label}</button>)}</div>;
  const content = <>
    {detail.isLoading ? <p role="status">Đang tải hồ sơ…</p> : detail.isError || !request ? <p role="alert">Không tải được hồ sơ. <button type="button" onClick={() => void detail.refetch()}>Thử lại</button></p> : <div className={`return-detail-panel return-detail-panel--${panel}`}>
      {panel === 'products' && <>
        <dl className="return-detail-facts">{[['Khách hàng', request.order.customerName || 'Chưa có thông tin'],['Điện thoại', request.order.customerPhone || 'Chưa có thông tin'],['Ngày gửi', returnDate(request.submittedAt)],['Trạng thái', returnStatusLabel(request.status)]].map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        {!request.items.length && <p className="return-muted">Sản phẩm bên dưới thuộc đơn gốc; hồ sơ chưa ghi riêng sản phẩm yêu cầu đổi trả.</p>}
        {products.length ? <div className="return-detail-products">{products.map(product => <article key={product.id}><CaseProductImage product={product} size={64}/><div><strong>{product.title}</strong><span>{product.variantName || 'Phân loại tiêu chuẩn'} · Số lượng {product.quantity}</span></div><b>{returnMoney(Number(product.unitPrice) * product.quantity)}</b></article>)}</div> : <p className="return-muted">Hồ sơ chưa có sản phẩm liên kết.</p>}
        <div className="return-detail-context"><section className="return-detail-box"><h4>Lý do đổi trả</h4><p>{returnReasonLabel(request.reason)}</p>{request.details && <p>{request.details}</p>}{request.preferredResolution && <p>Khách đề nghị: {request.preferredResolution === 'REFUND' ? 'Hoàn tiền vào ví' : 'Đổi sản phẩm'}</p>}</section>
        <section className="return-detail-box"><h4>Địa chỉ nhận hàng</h4><p>{request.order.shippingAddress || 'Chưa có địa chỉ nhận hàng'}</p></section></div>
        {request.refund && <section className="return-detail-box"><h4>Khoản hoàn cho khách</h4><strong>{returnMoney(request.refund.amount)}</strong><p>{({PENDING:'Chờ hoàn',PROCESSING:'Đang hoàn',SUCCEEDED:'Đã hoàn',FAILED:'Hoàn thất bại'})[request.refund.status]}</p>{request.refund.failureReason && <p className="return-warning">{request.refund.failureReason}</p>}</section>}
      </>}
      {panel === 'evidence' && <>
        <section className="return-detail-box"><h4>Khách hàng cung cấp</h4>{request.imageUrls.length ? <div className="return-evidence-images">{request.imageUrls.map((url,index) => <a key={url} href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt={`Bằng chứng khách hàng ${index + 1}`}/></a>)}</div> : <p>Chưa có ảnh bằng chứng.</p>}{request.unboxingVideoUrl && <a className="return-file-link" href={request.unboxingVideoUrl} target="_blank" rel="noopener noreferrer">Video mở hộp <ExternalLink size={13}/></a>}</section>
        <section className="return-detail-box"><h4>Phản hồi & bằng chứng Shop</h4><p>{request.shopResponse || 'Chưa có phản hồi của Shop.'}</p>{shopEvidence.map(event => <div key={event.id} className="return-shop-evidence"><p>{event.data?.details || 'Bằng chứng đính kèm'}</p><div className="return-file-links">{event.data?.evidenceUrls?.map((url,index) => <a key={url} href={url} target="_blank" rel="noopener noreferrer">Tệp Shop {index + 1} <ExternalLink size={13}/></a>)}</div></div>)}{!shopEvidence.length && <p>Chưa có bằng chứng Shop gửi.</p>}</section>
        {request.inspectionNotes && <section className="return-detail-box"><h4>Kết quả kiểm tra hàng</h4><p>{request.inspectionNotes}</p></section>}
      </>}
      {panel === 'shipping' && <>
        {shippingActions?.(request)}
        <section className="return-detail-box"><h4>Vận chuyển đơn gốc</h4><p>Vận đơn GHN: {request.order.outboundGhnTrackingNumber || 'Chưa có'}</p></section>
        {[{title:'Hàng khách trả về', shipment:request.customerShipment},{title:'Hàng đổi gửi khách',shipment:request.exchangeShipment}].map(({title,shipment}) => <section key={title} className="return-detail-box"><h4>{title}</h4>{shipment ? <><p>{shipment.carrierName} · {shipment.trackingNumber}</p><p>Gửi {returnDate(shipment.shippedAt)} · Nhận {returnDate(shipment.receivedAt)}</p>{shipment.receiptImageUrl && <a className="return-file-link" href={shipment.receiptImageUrl} target="_blank" rel="noopener noreferrer">Biên nhận vận chuyển <ExternalLink size={13}/></a>}</> : <p>Chưa có thông tin vận chuyển.</p>}</section>)}
        <section className="return-detail-box"><h4>Bồi hoàn GHN</h4>{request.ghnClaim ? <><p>{claimLabels[request.ghnClaim.status]}</p><dl className="return-detail-facts">{[['Mã yêu cầu',request.ghnClaim.ghnReference || 'Chưa gửi'],['Yêu cầu bồi hoàn',request.ghnClaim.claimedAmount == null ? 'Chưa xác định' : returnMoney(request.ghnClaim.claimedAmount)],['GHN chấp thuận',request.ghnClaim.approvedAmount == null ? 'Chưa xác định' : returnMoney(request.ghnClaim.approvedAmount)],['Cập nhật',returnDate(request.ghnClaim.updatedAt)]].map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{request.ghnClaim.notes && <p>{request.ghnClaim.notes}</p>}<div className="return-file-links">{request.ghnClaim.evidenceUrls.map((url,index) => <a key={url} href={url} target="_blank" rel="noopener noreferrer">Bằng chứng GHN {index + 1}</a>)}{request.ghnClaim.proofUrl && <a href={request.ghnClaim.proofUrl} target="_blank" rel="noopener noreferrer">Chứng từ thanh toán</a>}</div></> : <p>Chưa có yêu cầu bồi hoàn GHN.</p>}<p className="return-inline-note">Bồi hoàn cho Shop và xử lý cho khách là hai luồng riêng.</p></section>
      </>}
      {panel === 'handling' && <>
        {handlingActions?.(request)}
        {request.dispute && <section className="return-detail-box"><h4>{request.dispute.status === 'OPEN' ? 'Nội dung cần phân xử' : 'Kết quả phân xử'}</h4><p>{reasonLabels[request.dispute.reason] || request.dispute.reason}</p><p>{request.dispute.details}</p>{request.dispute.ruling && <strong>{rulingLabels[request.dispute.ruling] || request.dispute.ruling}</strong>}{request.dispute.resolutionNotes && <p>{request.dispute.resolutionNotes}</p>}</section>}
        {request.status === 'SHOP_REJECTED' && !request.dispute && <section className="return-detail-box"><h4>Xem xét quyết định của Shop</h4><p>Mở phân xử để xác minh thêm; thao tác này chưa kết luận bên nào có lỗi.</p><button type="button" className="return-primary" disabled={busy} onClick={() => openReview.mutate()}>{openReview.isPending ? 'Đang mở…' : 'Mở phân xử'}</button></section>}
        {canResolve && <form className="return-ruling-form" onSubmit={submit}><h4>Quyết định phân xử</h4>
          <label>Quyết định<select value={ruling} disabled={busy} onChange={event => setRuling(event.target.value as Ruling)}><option value="APPROVE_REFUND">Chấp thuận hoàn tiền</option><option value="APPROVE_EXCHANGE">Chấp thuận đổi hàng</option>{canUphold && <option value="UPHOLD_SHOP" disabled={liability === 'LOGISTICS_FAULT'}>Giữ quyết định của Shop</option>}</select></label>
          <label>Bên chịu trách nhiệm<select value={liability} disabled={busy} onChange={event => { const next=event.target.value as Liability; setLiability(next); if(next==='LOGISTICS_FAULT' && ruling==='UPHOLD_SHOP')setRuling('APPROVE_REFUND'); }}><option value="">Chọn bên chịu trách nhiệm</option><option value="LOGISTICS_FAULT" disabled={!request.order.outboundGhnTrackingNumber}>GHN / vận chuyển</option><option value="SHOP_FAULT">Shop / hàng hóa</option><option value="CUSTOMER_REASON">Khách đổi ý</option></select></label>
          <label className="return-ruling-notes">Căn cứ phân xử<textarea value={notes} required minLength={20} maxLength={3000} rows={3} disabled={busy} onChange={event=>setNotes(event.target.value)}/><small>Tối thiểu 20 ký tự · {notes.trim().length}/3000</small></label>
          {!request.order.outboundGhnTrackingNumber && <p className="return-warning">Chưa có vận đơn GHN gốc; chưa thể quy trách nhiệm cho GHN.</p>}
          {!canUphold && <p className="return-warning">Shop đang giữ hàng khách trả; cần phương án trả hàng hoặc bồi hoàn trước khi đóng hồ sơ.</p>}
          <details className="return-process-help"><summary>Nguyên tắc xử lý</summary><p>Chỉ kết luận khi đã kiểm tra bằng chứng. Hoàn cho khách không chờ GHN bồi hoàn cho Shop. Hoàn tiền và thu hồi thu nhập được ghi cùng giao dịch khi ví khách sẵn sàng; nếu chưa, hồ sơ tiếp tục chờ đối soát.</p></details>
          <button type="submit" className="return-primary" disabled={busy || !liability || notes.trim().length<20 || invalidRuling || missingTracking}>{resolve.isPending ? 'Đang lưu…' : 'Lưu quyết định'}</button>
        </form>}
      </>}
      {panel === 'history' && <ReturnTimeline request={request} compact/>}
    </div>}
  </>;
  return <section className="return-oversight-modal return-embedded-detail">{tabs}<div className="modal-scroll-body">{content}</div></section>;
}
