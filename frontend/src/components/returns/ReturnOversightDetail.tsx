import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ExternalLink, FileText, History, Info, Package, Scale, Truck } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { returnService, type ReturnDetail } from '@/services/return.service';
import { toast } from '@/utils/toast';
import { returnReasonLabel, returnStatusLabel } from '@/utils/return-status.utils';
import { ReturnTimeline } from './ReturnTimeline';
import { caseProducts, CaseProductImage, returnDate, returnMoney } from './ReturnCaseProducts';

type Ruling = 'APPROVE_REFUND' | 'APPROVE_EXCHANGE' | 'UPHOLD_SHOP';
type Liability = 'LOGISTICS_FAULT' | 'SHOP_FAULT' | 'CUSTOMER_REASON';
export type ReturnDetailPanel = 'products' | 'evidence' | 'shipping' | 'handling' | 'history';
const reasonLabels: Record<string,string> = { SHOP_REQUESTED_REVIEW: 'Shop đề nghị xem xét', CUSTOMER_DISAGREES: 'Khách không đồng ý với Shop', MANAGER_REVIEW_SHOP_REJECTION: 'Xem xét quyết định từ chối của Shop' };
const rulingLabels: Record<string,string> = { APPROVE_REFUND: 'Chấp thuận hoàn tiền', APPROVE_EXCHANGE: 'Chấp thuận đổi hàng', UPHOLD_SHOP: 'Giữ quyết định của Shop' };
const rulingSelectClass = 'h-[42px] min-h-[42px] w-full rounded-lg py-0 shadow-none [&>span]:leading-tight';
const rulingMenuClass = 'rounded-xl p-1 [&_[role=option]]:min-h-10 [&_[role=option]]:rounded-md [&_[role=option]]:py-1.5 [&_[role=option]]:pr-2 [&_[role=option]]:pl-8 [&_[role=option]]:relative [&_[role=option]>svg]:absolute [&_[role=option]>svg]:left-2 [&_[role=option]:disabled]:opacity-75 [&_[aria-selected=true]]:text-[#795A2D]';

export function ReturnOversightDetail({ snapshot, onChanged, activePanel, onPanelChange, handlingActions, shippingActions }: {
  snapshot: ReturnDetail; onChanged: (openDispute?: boolean) => Promise<void>;
  activePanel?: ReturnDetailPanel; onPanelChange?: (panel: ReturnDetailPanel) => void;
  handlingActions?: (request: ReturnDetail) => ReactNode; shippingActions?: (request: ReturnDetail) => ReactNode;
}) {
  const [panel, setPanel] = useState<ReturnDetailPanel>(activePanel || 'products');
  useEffect(() => { if (activePanel) setPanel(activePanel); }, [activePanel]);
  const [ruling, setRuling] = useState<Ruling | ''>('');
  const [liability, setLiability] = useState<Liability | ''>('');
  const [notes, setNotes] = useState('');
  const [notesTouched, setNotesTouched] = useState(false);
  const detail = useQuery({ queryKey: ['return-detail', snapshot.id], queryFn: () => returnService.getOne(snapshot.id), staleTime: 0 });
  const request = detail.data;
  const resolve = useMutation({ mutationFn: (data: { id: string; ruling: Ruling; liability: Liability; notes: string }) => returnService.resolveDispute(data.id, { ruling: data.ruling, liability: data.liability, notes: data.notes }),
    onSuccess: async () => { await onChanged(); toast.success('Đã lưu quyết định phân xử.'); } });
  const openReview = useMutation({ mutationFn: () => returnService.openRejectedReview(snapshot.id),
    onSuccess: async () => { await onChanged(true); toast.success('Đã mở hồ sơ phân xử.'); },
    onError: (error: Error) => toast.error(error.message || 'Không thể mở phân xử.') });
  const busy = resolve.isPending || openReview.isPending;
  const canUphold = !request?.customerShipment?.receivedAt;
  const hasTracking = Boolean(request?.order.outboundGhnTrackingNumber);
  const upholdBlockedReason = !canUphold ? 'Shop đã nhận hàng trả' : liability === 'LOGISTICS_FAULT' ? 'GHN chịu trách nhiệm' : '';
  const canResolve = request?.dispute?.status === 'OPEN';
  const notesTooShort = notes.trim().length < 20;
  const notesError = notesTouched && notesTooShort;
  const canSave = !busy && Boolean(ruling && liability) && !notesTooShort
    && !(ruling === 'UPHOLD_SHOP' && upholdBlockedReason) && !(liability === 'LOGISTICS_FAULT' && !hasTracking);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSave || !request?.dispute || !canResolve || !ruling || !liability) return;
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
        <section className="return-shipping-strip"><h4>Vận chuyển</h4><div><section><h5>Giao ban đầu</h5><p>{request.order.outboundGhnTrackingNumber ? `GHN · ${request.order.outboundGhnTrackingNumber}` : 'Chưa ghi nhận'}</p></section>
        {[{title:'Khách gửi trả',shipment:request.customerShipment},{title:'Giao hàng đổi',shipment:request.exchangeShipment}].map(({title,shipment})=><section key={title}><h5>{title}</h5>{shipment?<><p>{shipment.carrierName.replace(/\s*Demo/gi,'')} · {shipment.trackingNumber}</p><p><small>Gửi {returnDate(shipment.shippedAt)} · Nhận {returnDate(shipment.receivedAt)}</small></p>{shipment.receiptImageUrl&&<a className="return-file-link" href={shipment.receiptImageUrl} target="_blank" rel="noopener noreferrer">Biên nhận <ExternalLink size={13}/></a>}</>:<p>{title==='Giao hàng đổi' && request.resolution==='REFUND'?'Không áp dụng':'Chưa ghi nhận'}</p>}</section>)}</div></section>
        {!request.ghnClaim && <p className="return-muted">Chưa có yêu cầu bồi hoàn GHN.</p>}
      </>}
      {panel === 'handling' && <>
        {handlingActions?.(request)}
        {request.dispute && <section className="return-arbitration-result" aria-label="Kết quả phân xử">
          <header><h4>Kết quả phân xử</h4><span>{request.dispute.status === 'RESOLVED' && request.dispute.ruling ? 'Đã phân xử' : 'Chờ phân xử'}</span></header>
          <div className="return-arbitration-columns"><section><h5>{request.dispute.reason === 'CUSTOMER_DISAGREES' ? 'Ý kiến khách hàng' : 'Phản hồi của Shop'}</h5><strong>{reasonLabels[request.dispute.reason] || request.dispute.reason}</strong><p className="return-arbitration-original">{request.dispute.details}</p></section>
            <section><h5>Kết luận vận hành</h5><strong>{request.dispute.ruling ? rulingLabels[request.dispute.ruling] || request.dispute.ruling : 'Chưa có quyết định'}</strong>{request.dispute.resolutionNotes && <div className="return-arbitration-notes"><h6>Ghi chú quyết định</h6><p>{request.dispute.resolutionNotes}</p></div>}</section></div>
        </section>}
        {request.status === 'SHOP_REJECTED' && !request.dispute && <section className="return-detail-box"><h4>Xem xét quyết định của Shop</h4><p>Mở phân xử để xác minh thêm; thao tác này chưa kết luận bên nào có lỗi.</p><button type="button" className="return-primary" disabled={busy} onClick={() => openReview.mutate()}>{openReview.isPending ? 'Đang mở…' : 'Mở phân xử'}</button></section>}
        {canResolve && (
          <form className="return-ruling-form rounded-xl border border-[#EAE4D7] bg-white" onSubmit={submit} aria-busy={resolve.isPending}>
            <h4 className="border-b border-[#EAE4D7] px-4 py-3 text-sm font-semibold sm:px-5">Quyết định phân xử</h4>
            <div className="grid gap-4 px-4 py-4 sm:grid-cols-2 sm:px-5">
              <div className="grid min-w-0 content-start gap-1.5">
                <label htmlFor="return-ruling-choice" className="text-xs font-semibold text-[#514737]">Quyết định <span className="text-[#DC2626]">*</span></label>
                <Select
                  id="return-ruling-choice" value={ruling} placeholder="Chọn quyết định"
                  disabled={busy} portal className={rulingSelectClass} menuClassName={rulingMenuClass}
                  options={[
                    { value: 'APPROVE_REFUND', label: rulingLabels.APPROVE_REFUND },
                    { value: 'APPROVE_EXCHANGE', label: rulingLabels.APPROVE_EXCHANGE },
                    {
                      value: 'UPHOLD_SHOP', label: rulingLabels.UPHOLD_SHOP, disabled: Boolean(upholdBlockedReason),
                      content: upholdBlockedReason ? (
                        <span className="grid gap-0.5 leading-tight">
                          {rulingLabels.UPHOLD_SHOP}
                          <span className="text-[11px]">{upholdBlockedReason}</span>
                        </span>
                      ) : undefined,
                    },
                  ]}
                  onChange={event => { setRuling(event.target.value as Ruling); resolve.reset(); }}
                />
              </div>
              <div className="grid min-w-0 content-start gap-1.5">
                <label htmlFor="return-ruling-liability" className="text-xs font-semibold text-[#514737]">Bên chịu trách nhiệm <span className="text-[#DC2626]">*</span></label>
                <Select
                  id="return-ruling-liability" value={liability} placeholder="Chọn bên chịu trách nhiệm"
                  disabled={busy} portal className={rulingSelectClass} menuClassName={rulingMenuClass}
                  options={[
                    {
                      value: 'LOGISTICS_FAULT', label: 'GHN / vận chuyển', disabled: !hasTracking,
                      content: !hasTracking ? (
                        <span className="grid gap-0.5 leading-tight">
                          GHN / vận chuyển
                          <span className="text-[11px]">Chưa có vận đơn GHN gốc</span>
                        </span>
                      ) : undefined,
                    },
                    { value: 'SHOP_FAULT', label: 'Shop / hàng hóa' },
                    { value: 'CUSTOMER_REASON', label: 'Khách đổi ý' },
                  ]}
                  onChange={event => {
                    const next = event.target.value as Liability;
                    setLiability(next);
                    if (next === 'LOGISTICS_FAULT' && ruling === 'UPHOLD_SHOP') setRuling('');
                    resolve.reset();
                  }}
                />
              </div>
              <div className="grid min-w-0 gap-1.5 sm:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="return-ruling-notes" className="text-xs font-semibold text-[#514737]">Căn cứ phân xử <span className="text-[#DC2626]">*</span></label>
                  <span className="text-[11px] tabular-nums text-[#7D715E]">{notes.length.toLocaleString('vi-VN')}/3.000</span>
                </div>
                <textarea
                  id="return-ruling-notes" value={notes} required minLength={20} maxLength={3000} rows={3} disabled={busy}
                  aria-invalid={notesError} aria-describedby={notesError ? 'return-ruling-notes-error' : undefined}
                  placeholder="Nhập kết luận và bằng chứng làm căn cứ…"
                  className="min-h-20 w-full resize-y rounded-lg border border-[#EAE4D7] bg-white px-3 py-2 text-sm text-[#1A1612] outline-none focus:border-[#C59B58] aria-invalid:border-[#DC2626]"
                  onBlur={() => setNotesTouched(true)}
                  onChange={event => { setNotes(event.target.value); if (resolve.isError) resolve.reset(); }}
                />
                {notesError && <p id="return-ruling-notes-error" className="text-xs text-[#DC2626]">Nhập ít nhất 20 ký tự.</p>}
              </div>
              {resolve.isError && <p role="alert" className="text-xs text-[#DC2626] sm:col-span-2">{resolve.error.message || 'Không thể lưu quyết định.'}</p>}
            </div>
            <div className="flex flex-wrap items-start justify-between gap-3 border-t border-[#EAE4D7] px-4 py-3 sm:flex-nowrap sm:px-5">
              <details className="return-process-help min-w-0">
                <summary className="min-h-[42px]"><Info size={15} aria-hidden="true" />Nguyên tắc xử lý</summary>
                <p>Kiểm tra bằng chứng trước khi kết luận. Hoàn tiền cho khách độc lập với bồi hoàn GHN. Khi ví sẵn sàng, khoản hoàn và phần thu nhập bị thu hồi được ghi cùng giao dịch. Hồ sơ chờ đối soát nếu ví chưa sẵn sàng.</p>
              </details>
              <button type="submit" className="ml-auto h-[42px] shrink-0 cursor-pointer rounded-lg border border-[#C59B58] bg-[#C59B58] px-4 text-xs font-semibold text-[#231D15] transition-colors hover:bg-[#B88E4F] disabled:cursor-not-allowed disabled:border-[#EAE4D7] disabled:bg-[#F3EFE6] disabled:text-[#7D715E]" disabled={!canSave}>{resolve.isPending ? 'Đang lưu…' : 'Lưu quyết định'}</button>
            </div>
          </form>
        )}
      </>}
      {panel === 'history' && <ReturnTimeline request={request} compact/>}
    </div>}
  </>;
  return <section className="return-oversight-modal return-embedded-detail">{tabs}<div className="modal-scroll-body">{content}</div></section>;
}
