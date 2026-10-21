import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ShieldAlert, X, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../utils/toast';
import { getPendingSampleReport, hasSampleDeadlineViolation, type SampleModerationRequest } from '../../utils/sampleModeration';

export default function SampleViolationAction({ request, blocked, onSuccess }: { request: SampleModerationRequest; blocked?: boolean; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const report = getPendingSampleReport(request);
  if (blocked) return <span className="sample-violation-state text-[#7D715E]! text-[length:11px]! leading-[1.6]! ">Admin đã khóa quyền nhận mẫu</span>;
  if (report) return <span className="sample-violation-state text-[#7D715E]! text-[length:11px]! leading-[1.6]! " title={report.details?.reason}>Đã báo cáo · Chờ Admin xét duyệt</span>;
  const canReport = hasSampleDeadlineViolation(request);
  if (!canReport) {
    if (!['RECEIVED', 'REVISION_REQUIRED'].includes(request.status)) return null;
    const deadline = request.revisionDeadlineAt || request.deadlineAt;
    const deadlineLabel = deadline ? new Date(deadline).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : null;
    return <div className="sample-violation-unavailable flex! flex-col! [align-items:flex-end]! gap-[5px]! max-w-full! [&_small]:text-[#7D715E]! [&_small]:text-[length:10px]! [&_small]:leading-[1.5]! [&_small]:text-right! ">
      <button type="button" disabled className="sample-violation-button inline-flex! items-center! gap-[6px]! p-[8px_11px]! [border:1px_solid_#EEDFC6]! rounded-[9px]! bg-[#FBF5EB]! text-[#B88E4F]! text-[length:12px]! cursor-pointer! [&:hover:not(:disabled)]:border-[#C59B58]! [&:disabled]:bg-[#FAF8F5]! [&:disabled]:border-[#EAE4D7]! [&:disabled]:text-[#7D715E]! [&:disabled]:cursor-not-allowed! [&:focus-visible]:[outline:2px_solid_#C59B58]! [&:focus-visible]:outline-offset-[2px]! " title={deadlineLabel ? `Có thể báo cáo khi KOL chưa nộp video sau hạn ${deadlineLabel}.` : 'Chưa xác lập hạn nộp video.'}><ShieldAlert size={14} />Báo cáo quá hạn</button>
      <small>{deadlineLabel ? `Chưa quá hạn · ${deadlineLabel}` : 'Chưa xác lập hạn video'}</small>
    </div>;
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || !reason.trim()) return;
    setSaving(true);
    try {
      await api.post(`/sample-requests/${request.id}/report-violation`, { reason: reason.trim() });
      toast.success('Đã gửi báo cáo để Admin xem xét.');
      setOpen(false);
      setReason('');
      onSuccess();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Không thể gửi báo cáo.');
    } finally { setSaving(false); }
  };

  return <>
    <button type="button" className="sample-violation-button inline-flex! items-center! gap-[6px]! p-[8px_11px]! [border:1px_solid_#EEDFC6]! rounded-[9px]! bg-[#FBF5EB]! text-[#B88E4F]! text-[length:12px]! cursor-pointer! [&:hover:not(:disabled)]:border-[#C59B58]! [&:disabled]:bg-[#FAF8F5]! [&:disabled]:border-[#EAE4D7]! [&:disabled]:text-[#7D715E]! [&:disabled]:cursor-not-allowed! [&:focus-visible]:[outline:2px_solid_#C59B58]! [&:focus-visible]:outline-offset-[2px]! " onClick={() => setOpen(true)}><ShieldAlert size={14} />Báo cáo quá hạn</button>
    {open && createPortal(<div className="sample-violation-overlay fixed! inset-[0]! z-[150]! grid! place-items-center! p-[16px]! bg-[rgb(35_29_21_/_.35)]! [backdrop-filter:blur(3px)]! " onKeyDown={event => { if (event.key === 'Escape' && !saving) setOpen(false); }}>
      <form className="sample-violation-dialog w-full! max-w-[460px]! max-h-[85dvh]! overflow-auto! p-[20px]! [border:1px_solid_#EAE4D7]! rounded-[18px]! bg-[#FFFFFF]! text-[#1A1612]! [box-shadow:0_20px_60px_rgb(35_29_21_/_.15)]! text-left! [&_header]:flex! [&_header]:items-center! [&_header]:gap-[10px]! [&_header]:pb-[15px]! [&_header]:[border-bottom:1px_solid_#EAE4D7]! [&_header_h2]:m-[0]! [&_header_h2]:text-[length:16px]! [&_header_h2]:font-[600]! [&_header_p]:m-[4px_0_0]! [&_header_p]:text-[length:11px]! [&_header_p]:text-[#7D715E]! [&_header_button]:ml-[auto]! [&_header_button]:[border:0]! [&_header_button]:bg-[#FAF8F5]! [&_header_button]:rounded-[8px]! [&_header_button]:p-[6px]! [&_header_button]:text-[#7D715E]! [&_header_button]:cursor-pointer! [&_label]:block! [&_label]:mb-[7px]! [&_label]:text-[length:13px]! [&_label]:font-[500]! [&_label_span]:text-[#DC2626]! [&_textarea]:w-full! [&_textarea]:[border:1px_solid_#EAE4D7]! [&_textarea]:rounded-[10px]! [&_textarea]:p-[12px]! [&_textarea]:bg-[#FFFFFF]! [&_textarea]:text-[#1A1612]! [&_textarea]:text-[length:13px]! [&_textarea]:leading-[1.6]! [&_textarea]:resize-y! [&_textarea]:outline-none! [&_textarea:focus]:border-[#C59B58]! [&_small]:block! [&_small]:mt-[4px]! [&_small]:text-right! [&_small]:text-[length:10px]! [&_small]:text-[#7D715E]! [&_footer]:flex! [&_footer]:justify-end! [&_footer]:gap-[8px]! [&_footer]:[border-top:1px_solid_#EAE4D7]! [&_footer]:pt-[15px]! [&_footer]:mt-[16px]! [&_footer_button]:inline-flex! [&_footer_button]:items-center! [&_footer_button]:justify-center! [&_footer_button]:gap-[5px]! [&_footer_button]:min-h-[36px]! [&_footer_button]:p-[8px_13px]! [&_footer_button]:[border:1px_solid_#EAE4D7]! [&_footer_button]:rounded-[9px]! [&_footer_button]:bg-[#FFFFFF]! [&_footer_button]:text-[#7D715E]! [&_footer_button]:text-[length:12px]! [&_footer_button]:cursor-pointer! [&_footer_button[type=submit]]:bg-[#C59B58]! [&_footer_button[type=submit]]:text-[#231D15]! [&_footer_button[type=submit]]:border-[#C59B58]! [&_button:disabled]:opacity-[.5]! [&_button:disabled]:cursor-default! [&_button:focus-visible]:[outline:2px_solid_#C59B58]! [&_button:focus-visible]:outline-offset-[2px]! " role="dialog" aria-modal="true" aria-labelledby="sample-violation-title" onSubmit={submit}>
        <header><span className="sample-violation-modal-icon grid! place-items-center! w-[38px]! h-[38px]! shrink-0! [border:1px_solid_#EEDFC6]! rounded-[11px]! text-[#B88E4F]! bg-[#FBF5EB]! "><ShieldAlert size={19} /></span><div><h2 id="sample-violation-title">Đề nghị xử lý KOL quá hạn</h2><p>Yêu cầu mẫu #{request.id.slice(0, 8).toUpperCase()}</p></div><button type="button" aria-label="Đóng báo cáo" disabled={saving} onClick={() => setOpen(false)}><X size={18} /></button></header>
        <p className="sample-violation-explanation m-[16px_0]! p-[12px]! rounded-[10px]! bg-[#FBF5EB]! text-[#7D715E]! text-[length:12px]! leading-[1.7]! ">Admin sẽ kiểm tra bằng chứng và quyết định khóa, gia hạn hoặc không chấp nhận báo cáo. Gửi báo cáo chưa khóa quyền nhận mẫu của KOL.</p>
        <label htmlFor="sample-violation-reason">Lý do và bằng chứng <span>*</span></label>
        <textarea autoFocus id="sample-violation-reason" required maxLength={500} rows={4} value={reason} onChange={event => setReason(event.target.value)} placeholder="Mô tả việc quá hạn, trao đổi với KOL và đường dẫn bằng chứng (nếu có)…" />
        <small>{reason.length}/500 ký tự</small>
        <footer><button type="button" disabled={saving} onClick={() => setOpen(false)}>Hủy bỏ</button><button type="submit" disabled={saving || !reason.trim()}>{saving && <Loader2 size={14} className="animate-spin" />}{saving ? 'Đang gửi…' : 'Gửi Admin xét duyệt'}</button></footer>
      </form>
    </div>, document.body)}
  </>;
}
