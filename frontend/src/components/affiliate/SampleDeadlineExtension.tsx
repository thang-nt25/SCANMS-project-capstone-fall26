import { useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarPlus, Loader2, X } from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../utils/toast';
import { getPendingSampleReport, type SampleModerationRequest } from '../../utils/sampleModeration';

export default function SampleDeadlineExtension({ request, onSuccess }: { request: SampleModerationRequest; onSuccess: () => void }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const current = request.revisionDeadlineAt || request.deadlineAt;
  if (!['RECEIVED', 'REVISION_REQUIRED', 'OVERDUE'].includes(request.status) || !current) return null;
  if (getPendingSampleReport(request)) return <span className="sample-violation-state text-[#7D715E]! text-[length:11px]! leading-[1.6]! ">Gia hạn: đề nghị Admin xử lý báo cáo đang chờ</span>;
  const validDate = date && new Date(date).getTime() > Math.max(Date.now(), Date.parse(current));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || !validDate || !reason.trim()) return;
    setSaving(true);
    try {
      await api.patch(`/sample-requests/${request.id}/extend-deadline`, { deadlineAt: new Date(date).toISOString(), reason: reason.trim() });
      toast.success('Đã gia hạn và gửi thông báo cho KOL.');
      setOpen(false); setDate(''); setReason(''); onSuccess();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể gia hạn. Vui lòng tải lại và thử lại.');
    } finally { setSaving(false); }
  };
  return <>
    <button type="button" className="sample-violation-button inline-flex! items-center! gap-[6px]! p-[8px_11px]! [border:1px_solid_#EEDFC6]! rounded-[9px]! bg-[#FBF5EB]! text-[#B88E4F]! text-[length:12px]! cursor-pointer! [&:hover:not(:disabled)]:border-[#C59B58]! [&:disabled]:bg-[#FAF8F5]! [&:disabled]:border-[#EAE4D7]! [&:disabled]:text-[#7D715E]! [&:disabled]:cursor-not-allowed! [&:focus-visible]:[outline:2px_solid_#C59B58]! [&:focus-visible]:outline-offset-[2px]! " onClick={() => setOpen(true)}><CalendarPlus size={14} />Gia hạn</button>
    {open && createPortal(<div className="sample-violation-overlay fixed! inset-[0]! z-[150]! grid! place-items-center! p-[16px]! bg-[rgb(35_29_21_/_.35)]! [backdrop-filter:blur(3px)]! " onKeyDown={event => { if (event.key === 'Escape' && !saving) setOpen(false); }}>
      <form className="sample-violation-dialog w-full! max-w-[460px]! max-h-[85dvh]! overflow-auto! p-[20px]! [border:1px_solid_#EAE4D7]! rounded-[18px]! bg-[#FFFFFF]! text-[#1A1612]! [box-shadow:0_20px_60px_rgb(35_29_21_/_.15)]! text-left! [&_header]:flex! [&_header]:items-center! [&_header]:gap-[10px]! [&_header]:pb-[15px]! [&_header]:[border-bottom:1px_solid_#EAE4D7]! [&_header_h2]:m-[0]! [&_header_h2]:text-[length:16px]! [&_header_h2]:font-[600]! [&_header_p]:m-[4px_0_0]! [&_header_p]:text-[length:11px]! [&_header_p]:text-[#7D715E]! [&_header_button]:ml-[auto]! [&_header_button]:[border:0]! [&_header_button]:bg-[#FAF8F5]! [&_header_button]:rounded-[8px]! [&_header_button]:p-[6px]! [&_header_button]:text-[#7D715E]! [&_header_button]:cursor-pointer! [&_label]:block! [&_label]:mb-[7px]! [&_label]:text-[length:13px]! [&_label]:font-[500]! [&_label_span]:text-[#DC2626]! [&_textarea]:w-full! [&_textarea]:[border:1px_solid_#EAE4D7]! [&_textarea]:rounded-[10px]! [&_textarea]:p-[12px]! [&_textarea]:bg-[#FFFFFF]! [&_textarea]:text-[#1A1612]! [&_textarea]:text-[length:13px]! [&_textarea]:leading-[1.6]! [&_textarea]:resize-y! [&_textarea]:outline-none! [&_textarea:focus]:border-[#C59B58]! [&_small]:block! [&_small]:mt-[4px]! [&_small]:text-right! [&_small]:text-[length:10px]! [&_small]:text-[#7D715E]! [&_footer]:flex! [&_footer]:justify-end! [&_footer]:gap-[8px]! [&_footer]:[border-top:1px_solid_#EAE4D7]! [&_footer]:pt-[15px]! [&_footer]:mt-[16px]! [&_footer_button]:inline-flex! [&_footer_button]:items-center! [&_footer_button]:justify-center! [&_footer_button]:gap-[5px]! [&_footer_button]:min-h-[36px]! [&_footer_button]:p-[8px_13px]! [&_footer_button]:[border:1px_solid_#EAE4D7]! [&_footer_button]:rounded-[9px]! [&_footer_button]:bg-[#FFFFFF]! [&_footer_button]:text-[#7D715E]! [&_footer_button]:text-[length:12px]! [&_footer_button]:cursor-pointer! [&_footer_button[type=submit]]:bg-[#C59B58]! [&_footer_button[type=submit]]:text-[#231D15]! [&_footer_button[type=submit]]:border-[#C59B58]! [&_button:disabled]:opacity-[.5]! [&_button:disabled]:cursor-default! [&_button:focus-visible]:[outline:2px_solid_#C59B58]! [&_button:focus-visible]:outline-offset-[2px]! " role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} onSubmit={submit}>
        <header><span className="sample-violation-modal-icon grid! place-items-center! w-[38px]! h-[38px]! shrink-0! [border:1px_solid_#EEDFC6]! rounded-[11px]! text-[#B88E4F]! bg-[#FBF5EB]! "><CalendarPlus size={19} /></span><div><h2 id={`${id}-title`}>Gia hạn {request.revisionDeadlineAt ? 'sửa' : 'nộp'} video</h2><p>Mẫu #{request.id.slice(0, 8).toUpperCase()}</p></div><button type="button" aria-label="Đóng gia hạn" disabled={saving} onClick={() => setOpen(false)}><X size={18} /></button></header>
        <p className="sample-violation-explanation m-[16px_0]! p-[12px]! rounded-[10px]! bg-[#FBF5EB]! text-[#7D715E]! text-[length:12px]! leading-[1.7]! ">Hạn hiện tại: {new Date(current).toLocaleString('vi-VN')}. Hạn mới phải muộn hơn hạn hiện tại và thời điểm bây giờ. Gia hạn được lưu lịch sử, thông báo cho KOL và không tự mở khóa quyền xin mẫu.</p>
        <label htmlFor={`${id}-date`}>Hạn mới <span>*</span></label>
        <input className="sample-deadline-input w-full! p-[11px]! mb-[16px]! [border:1px_solid_#EAE4D7]! rounded-[10px]! text-[#1A1612]! bg-[#FFFFFF]! [color-scheme:light]! [&:focus]:[outline:2px_solid_#EEDFC6]! [&:focus]:border-[#C59B58]! " id={`${id}-date`} type="datetime-local" required autoFocus value={date} onChange={event => setDate(event.target.value)} />
        {date && !validDate && <p className="sample-deadline-error text-[#DC2626]! text-[length:12px]! mb-[12px]! ">Chọn thời điểm muộn hơn hạn hiện tại và bây giờ.</p>}
        <label htmlFor={`${id}-reason`}>Lý do gia hạn <span>*</span></label>
        <textarea id={`${id}-reason`} required maxLength={500} rows={3} value={reason} onChange={event => setReason(event.target.value)} placeholder="Ghi lý do đã thống nhất với KOL…" />
        <small>{reason.length}/500 ký tự</small>
        <footer><button type="button" disabled={saving} onClick={() => setOpen(false)}>Hủy bỏ</button><button type="submit" disabled={saving || !validDate || !reason.trim()}>{saving && <Loader2 size={14} className="animate-spin" />}{saving ? 'Đang lưu…' : 'Xác nhận gia hạn'}</button></footer>
      </form>
    </div>, document.body)}
  </>;
}
