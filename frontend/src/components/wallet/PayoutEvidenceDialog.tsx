import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ChevronDown, ExternalLink, Loader2, AlertCircle, Check, Plus } from 'lucide-react';
import api from '../../services/api';
import { Modal } from '../ui/Modal';
import { PayoutPerson, PayoutEvidenceOverview, evidenceDate, type PayoutOverviewData } from './PayoutEvidenceOverview';
import { toast } from '../../utils/toast';

interface Evidence extends PayoutOverviewData {
  collaboratorId: string;
  informationRequest?: { sentAt: string; sentBy: string; codes: string[] } | null;
  name: string; requestStatus: string; passedChecks: number; totalChecks: number; checkedAt: string;
  rejectedReason?: string | null;
  checks: { code: string; label: string; passed: boolean; blocking: boolean; detail: string[]; missing: string | null; documents: { label: string; url: string | null }[] }[];
}
export function PayoutEvidenceDialog({ id, focusCode, onClose, onReject }: { id: string; focusCode?: string; onClose: () => void; onReject?: (reason: string) => void }) {
  const checksRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<Evidence | null>(null);
  const [error, setError] = useState(false);
  const [outdatedApi, setOutdatedApi] = useState(false);
  const [retry, setRetry] = useState(0);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [preview, setPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [panel, setPanel] = useState<'profile' | 'bank' | 'checks'>(focusCode ? 'checks' : 'profile');
  const kolCodes = ['VERIFIED_KYC', 'BENEFICIARY_MATCH', 'TAX_ID'];
  const requestable = (status: string, code: string) => ['PENDING', 'PROCESSING'].includes(status) ? kolCodes.includes(code) : status === 'APPROVED' && ['TAX_ID', 'BENEFICIARY_MATCH'].includes(code);
  useEffect(() => {
    let live = true; setData(null); setError(false); setOutdatedApi(false);
    api.get(`/admin/payouts/${id}/evidence`, { headers: { 'x-skip-cache': 'true' } }).then(response => {
      if (live) {
        const result: Evidence = response.data?.data ?? response.data;
        if (!result.contact || !result.profile || !result.payout) {
          setOutdatedApi(true);
          return;
        }
        setData(result);
        setSelectedCodes(result.checks.filter(check => !check.passed && requestable(result.requestStatus, check.code)).map(check => check.code));
        setPreview(false);
      }
    }).catch(() => { if (live) setError(true); });
    return () => { live = false; };
  }, [id, retry]);
  useEffect(() => {
    if (!data || !focusCode) return;
    setPanel('checks');
    const target = Array.from(checksRef.current?.querySelectorAll<HTMLDetailsElement>('details') ?? []).find(element => element.dataset.checkCode === focusCode);
    if (!target) return;
    target.open = true;
    target.scrollIntoView({ block: 'nearest' });
    target.querySelector('summary')?.focus({ preventScroll: true });
  }, [data, focusCode]);
  const missing = data?.checks.filter(check => !check.passed) ?? [];
  const canRequest = data && ['PENDING', 'PROCESSING', 'APPROVED'].includes(data.requestStatus);
  const profileUrl = (code: string) => data?.collaboratorId && kolCodes.includes(code)
    ? `/admin/kyc?userId=${encodeURIComponent(data.collaboratorId)}&section=${code === 'BENEFICIARY_MATCH' ? 'bank' : 'identity'}${code === 'TAX_ID' ? '&focus=tax' : ''}` : null;
  const sendRequest = async () => {
    if (!selectedCodes.length || sending) return;
    setSending(true);
    try {
      const response = await api.post(`/admin/payouts/${id}/request-information`, { codes: selectedCodes });
      const result = response.data?.data ?? response.data;
      toast.success(result.alreadySent ? 'Đã gửi các mục này trong 24 giờ qua' : 'Đã gửi yêu cầu bổ sung cho KOL');
      setRetry(value => value + 1);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Chưa gửi được yêu cầu. Vui lòng thử lại.');
    } finally { setSending(false); }
  };
  const showCheck = (code: string) => {
    setPanel('checks');
    const target = Array.from(checksRef.current?.querySelectorAll<HTMLDetailsElement>('details') ?? []).find(element => element.dataset.checkCode === code);
    if (!target) return;
    target.open = true;
    target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    target.querySelector('summary')?.focus({ preventScroll: true });
  };
  return <Modal isOpen title="Hồ sơ kiểm tra chi trả" subtitle={data ? `Đạt ${data.passedChecks}/${data.totalChecks} điều kiện kiểm tra` : undefined} onClose={sending ? () => {} : onClose} maxWidth="4xl" className="payout-evidence-dialog" stickyHeader footer={<div className="payout-evidence-footer"><span className="payout-evidence-checked-at">Kiểm tra: {evidenceDate(data?.checkedAt)}</span>
    {onReject && data?.requestStatus === 'PENDING' && <button type="button" disabled={sending} className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm text-red-600" onClick={() => onReject(missing.map(check => check.missing).filter(Boolean).join('\n'))}>Từ chối yêu cầu rút</button>}
    {canRequest && selectedCodes.length > 0 && <button type="button" disabled={sending} className="rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-4 py-2 text-sm font-medium text-[#715126] disabled:opacity-50" onClick={() => {setPanel('checks'); preview ? void sendRequest() : setPreview(true);}}>{sending ? 'Đang gửi…' : preview ? 'Xác nhận gửi cho KOL' : `Gửi yêu cầu · ${selectedCodes.length} mục đã chọn`}</button>}
    <button type="button" disabled={sending} onClick={onClose} className="payout-evidence-close">Đóng</button>
  </div>}>
    {outdatedApi ? <p role="alert" className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-4 text-sm text-[#7D715E]">Máy chủ chưa trả đầy đủ dữ liệu hồ sơ chi trả. Cần cập nhật backend để xem thông tin; đây không phải kết luận KOL thiếu hồ sơ. <button type="button" onClick={() => setRetry(value => value + 1)} className="underline">Tải lại</button></p> : error ? <p role="alert" className="text-sm text-red-600">Không tải được thông tin. <button onClick={() => setRetry(value => value + 1)} className="underline">Thử lại</button></p> : !data ? <p role="status" className="flex items-center gap-2 text-sm text-[#7D715E]"><Loader2 size={16} className="animate-spin"/>Đang kiểm tra…</p> : <div className="grid gap-2">
      <PayoutPerson data={data}/>
      <div className="payout-evidence-tabs" role="tablist" aria-label="Thông tin chi trả">{[{id:'profile',label:'Hồ sơ & chứng từ'},{id:'bank',label:'Ngân hàng & khoản chi'},{id:'checks',label:`Kiểm tra · ${data.passedChecks}/${data.totalChecks}`}].map(tab=><button type="button" key={tab.id} role="tab" id={`evidence-tab-${tab.id}`} aria-controls={`evidence-panel-${tab.id}`} aria-selected={panel===tab.id} onClick={()=>setPanel(tab.id as typeof panel)}>{tab.label}</button>)}</div>
      {panel !== 'checks' && <div role="tabpanel" id={`evidence-panel-${panel}`} aria-labelledby={`evidence-tab-${panel}`}><PayoutEvidenceOverview data={data} panel={panel} id={id}/></div>}
      <div hidden={panel !== 'checks'} role="tabpanel" id="evidence-panel-checks" aria-labelledby="evidence-tab-checks" className="payout-check-panel">
      {missing.length > 0 && !preview && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3"><div className="text-xs text-[#715126]">Hồ sơ này có <strong>{missing.length} vấn đề cần kiểm tra</strong>{canRequest && selectedCodes.length > 0 && <span className="mt-1 block">Đã chọn {selectedCodes.length} mục gửi cho {data.name}.</span>}</div>{canRequest && selectedCodes.length > 0 && <button type="button" onClick={() => {setPanel('checks');setPreview(true);}} className="rounded-lg border border-[#EEDFC6] bg-white px-3 py-2 text-xs font-medium text-[#715126]">Xem trước yêu cầu →</button>}</div>}
      {missing.length > 0 && <div className="flex flex-wrap gap-2 rounded-xl border border-[#EEDFC6] bg-[#FFFDFA] p-3">{missing.map(check => <button type="button" key={check.code} onClick={() => showCheck(check.code)} className="rounded-lg border border-[#EAE4D7] bg-white px-3 py-2 text-xs text-[#805b27]">{check.label} · Xem vấn đề ↓</button>)}</div>}
      {data.informationRequest && <div role="status" className="rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] p-3 text-xs text-[#7D715E]">Đã gửi yêu cầu bổ sung · {new Date(data.informationRequest.sentAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} · {data.informationRequest.sentBy}<p className="mb-0 mt-1">{data.informationRequest.codes.every(code => data.checks.find(check => check.code === code)?.passed) ? 'Các mục đã đạt điều kiện khi kiểm tra lại.' : 'Còn mục chưa đạt; cần kiểm tra hồ sơ cập nhật.'}</p></div>}
      {preview && <div className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-4 text-sm"><strong className="font-medium">Gửi cho {data.name}</strong><ul className="my-2 list-disc pl-4 text-xs text-[#7D715E]">{missing.filter(check => selectedCodes.includes(check.code)).map(check => <li key={check.code}>{check.missing}</li>)}</ul><p className="m-0 text-xs text-[#7D715E]">KOL nhận thông báo mở đúng phần hồ sơ cần bổ sung. Trạng thái và số tiền lệnh rút được giữ nguyên.</p><button type="button" onClick={() => setPreview(false)} className="mt-2 text-xs text-[#805b27] underline">Chọn lại nội dung</button></div>}
      {data.requestStatus === 'REJECTED' && data.rejectedReason && <div className="rounded-xl border border-red-100 bg-[#FFFCFC] px-4 py-3 text-xs"><strong className="font-medium text-red-600">Lý do đã từ chối</strong><p className="mb-0 mt-1 whitespace-pre-line text-[#7D715E]">{data.rejectedReason}</p></div>}
      <div ref={checksRef} className="grid gap-2">{[...data.checks].sort((a, b) => Number(a.passed) - Number(b.passed)).map(check => <details key={check.code} data-check-code={check.code} className={`group rounded-xl border bg-white ${check.code === focusCode ? 'border-[#C59B58] ring-2 ring-[#FBF5EB]' : 'border-[#EAE4D7]'}`} open={!check.passed || check.code === focusCode || undefined}>
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm [&::-webkit-details-marker]:hidden">{check.passed ? <CheckCircle2 size={17} className="shrink-0 text-[#B88E4F]"/> : <AlertCircle size={17} className="shrink-0 text-red-600"/>}<span className="flex-1 font-medium">{check.label}</span><span className={`text-xs ${check.passed ? 'text-[#7D715E]' : 'text-red-600'}`}>{check.passed ? 'Đã đạt' : check.blocking ? 'Chưa đạt' : 'Cần bổ sung'}</span><ChevronDown size={14} className="text-[#7D715E] group-open:rotate-180"/></summary>
        <div className="grid gap-2 border-t border-[#EAE4D7] px-4 py-3 text-xs leading-relaxed text-[#7D715E]">{check.missing && <p className="m-0 text-red-600">{check.missing}</p>}{check.detail.map((line, index) => <p key={index} className="m-0 break-words">{line}</p>)}<div className="payout-check-actions">{profileUrl(check.code) && <a href={profileUrl(check.code)!} target="_blank" rel="noopener noreferrer">Xem hồ sơ<ExternalLink size={14}/></a>}{!check.passed && (requestable(data.requestStatus, check.code) && canRequest ? <button type="button" aria-pressed={selectedCodes.includes(check.code)} disabled={sending} onClick={() => {setPreview(false);setSelectedCodes(current => current.includes(check.code) ? current.filter(code => code !== check.code) : [...current, check.code]);}}>{selectedCodes.includes(check.code) ? <Check size={15}/> : <Plus size={15}/>}<span>{check.code === 'BENEFICIARY_MATCH' ? 'Yêu cầu kiểm tra' : 'Yêu cầu bổ sung'}</span></button> : !kolCodes.includes(check.code) ? <span className="text-[#805b27]">Phụ trách: kế toán / vận hành</span> : null)}</div>{check.code === 'BENEFICIARY_MATCH' && data.requestStatus === 'APPROVED' && <p className="m-0 text-[11px] text-[#7D715E]">Đối chiếu tài khoản hiện tại với lệnh cũ; không thay đổi thông tin khoản đã chi.</p>}{check.documents.length > 0 && <div className="flex flex-wrap gap-2 pt-1">{check.documents.map(document => document.url ? <a key={document.label} href={document.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-3 py-2 text-[#715126]">{document.label}<ExternalLink size={12}/></a> : <span key={document.label} className="rounded-lg border border-red-100 px-3 py-2 text-red-600">{document.label}: chưa bổ sung</span>)}</div>}</div>
      </details>)}</div><p className="m-0 text-xs text-[#7D715E]">Kết quả điều kiện không thay thế chứng từ chuyển khoản hoặc xác nhận an toàn giao dịch.</p>
      </div>
    </div>}
  </Modal>;
}
