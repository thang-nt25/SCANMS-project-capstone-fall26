import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ChevronDown, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { Modal } from '../ui/Modal';

interface Evidence {
  name: string; requestStatus: string; passedChecks: number; totalChecks: number; checkedAt: string;
  rejectedReason?: string | null;
  checks: { code: string; label: string; passed: boolean; blocking: boolean; detail: string[]; missing: string | null; documents: { label: string; url: string | null }[] }[];
}
export function PayoutEvidenceDialog({ id, focusCode, onClose, onReject }: { id: string; focusCode?: string; onClose: () => void; onReject?: (reason: string) => void }) {
  const checksRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<Evidence | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true; setData(null); setError(false);
    api.get(`/admin/payouts/${id}/evidence`, { headers: { 'x-skip-cache': 'true' } }).then(response => {
      if (live) setData(response.data?.data ?? response.data);
    }).catch(() => { if (live) setError(true); });
    return () => { live = false; };
  }, [id, retry]);
  useEffect(() => {
    if (!data || !focusCode) return;
    const target = Array.from(checksRef.current?.querySelectorAll<HTMLDetailsElement>('details') ?? []).find(element => element.dataset.checkCode === focusCode);
    if (!target) return;
    target.open = true;
    target.scrollIntoView({ block: 'nearest' });
    target.querySelector('summary')?.focus({ preventScroll: true });
  }, [data, focusCode]);
  const missing = data?.checks.filter(check => !check.passed) ?? [];
  const showCheck = (code: string) => {
    const target = Array.from(checksRef.current?.querySelectorAll<HTMLDetailsElement>('details') ?? []).find(element => element.dataset.checkCode === code);
    if (!target) return;
    target.open = true;
    target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    target.querySelector('summary')?.focus({ preventScroll: true });
  };
  return <Modal isOpen title="Điều kiện chi trả" subtitle={data ? `${data.name} · ${data.passedChecks}/${data.totalChecks} điều kiện đạt` : undefined} onClose={onClose} maxWidth="2xl" stickyHeader footer={onReject && data?.requestStatus === 'PENDING' ? <div className="flex justify-end"><button type="button" className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm text-red-600" onClick={() => onReject?.(missing.map(check => check.missing).filter(Boolean).join('\n'))}>Từ chối / Yêu cầu bổ sung</button></div> : undefined}>
    {error ? <p role="alert" className="text-sm text-red-600">Không tải được thông tin. <button onClick={() => setRetry(value => value + 1)} className="underline">Thử lại</button></p> : !data ? <p role="status" className="flex items-center gap-2 text-sm text-[#7D715E]"><Loader2 size={16} className="animate-spin"/>Đang kiểm tra…</p> : <div className="grid gap-2">
      {missing.length > 0 && <div className="flex flex-wrap gap-2 rounded-xl border border-[#EEDFC6] bg-[#FFFDFA] p-3">{missing.map(check => <button type="button" key={check.code} onClick={() => showCheck(check.code)} className="rounded-lg border border-[#EAE4D7] bg-white px-3 py-2 text-xs text-[#805b27]">{check.label} · Xem hồ sơ ↗</button>)}</div>}
      {data.requestStatus === 'REJECTED' && data.rejectedReason && <div className="rounded-xl border border-red-100 bg-[#FFFCFC] px-4 py-3 text-xs"><strong className="font-medium text-red-600">Lý do đã từ chối</strong><p className="mb-0 mt-1 whitespace-pre-line text-[#7D715E]">{data.rejectedReason}</p></div>}
      <div ref={checksRef} className="grid gap-2">{[...data.checks].sort((a, b) => Number(a.passed) - Number(b.passed)).map(check => <details key={check.code} data-check-code={check.code} className={`group rounded-xl border bg-white ${check.code === focusCode ? 'border-[#C59B58] ring-2 ring-[#FBF5EB]' : 'border-[#EAE4D7]'}`} open={!check.passed || check.code === focusCode || undefined}>
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm [&::-webkit-details-marker]:hidden">{check.passed ? <CheckCircle2 size={17} className="shrink-0 text-[#B88E4F]"/> : <AlertCircle size={17} className="shrink-0 text-red-600"/>}<span className="flex-1 font-medium">{check.label}</span><span className={`text-xs ${check.passed ? 'text-[#7D715E]' : 'text-red-600'}`}>{check.passed ? 'Xem hồ sơ ↗' : check.blocking ? 'Chưa đạt' : 'Cần bổ sung'}</span><ChevronDown size={14} className="text-[#7D715E] group-open:rotate-180"/></summary>
        <div className="grid gap-2 border-t border-[#EAE4D7] px-4 py-3 text-xs leading-relaxed text-[#7D715E]">{check.missing && <p className="m-0 text-red-600">{check.missing}</p>}{check.detail.map((line, index) => <p key={index} className="m-0 break-words">{line}</p>)}{check.documents.length > 0 && <div className="flex flex-wrap gap-2 pt-1">{check.documents.map(document => document.url ? <a key={document.label} href={document.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-3 py-2 text-[#715126]">{document.label}<ExternalLink size={12}/></a> : <span key={document.label} className="rounded-lg border border-red-100 px-3 py-2 text-red-600">{document.label}: chưa bổ sung</span>)}</div>}</div>
      </details>)}</div><p className="m-0 text-xs text-[#7D715E]">Kết quả điều kiện không thay thế chứng từ chuyển khoản hoặc xác nhận an toàn giao dịch.</p>
      <p className="mb-0 mt-2 text-[11px] text-[#7D715E]">Kiểm tra hiện tại · {new Date(data.checkedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
    </div>}
  </Modal>;
}
