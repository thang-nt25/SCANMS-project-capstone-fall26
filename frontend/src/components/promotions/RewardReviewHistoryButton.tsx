import { useState } from 'react';
import { createPortal } from 'react-dom';
import { History } from 'lucide-react';
import type { RewardPolicy } from '../../services/monthly-rewards.service';
import { Modal } from '../ui/Modal';

type ReviewEntry = NonNullable<RewardPolicy['reviewHistory']>[number];
function formatDate(value: string | null | undefined) {
  return value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric',
  }) : null;
}
const money = (value: string | null) => value !== null && Number.isFinite(Number(value)) ? `${Number(value).toLocaleString('vi-VN')} ₫` : 'Chưa ghi nhận';

export function RewardReviewHistoryButton({entries, month}: {entries?: ReviewEntry[]; month: string}) {
  const [open, setOpen] = useState(false);
  if (!entries?.length) return null;
  const ordered = [...entries].sort((a, b) => (Date.parse(b.resubmittedAt) || 0) - (Date.parse(a.resubmittedAt) || 0));
  return <>
    <button type="button" aria-label={`Lịch sử xét duyệt tháng ${month}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)} className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[#EAE4D7] bg-white px-2.5 text-xs font-medium text-[#7D715E] transition-colors hover:bg-[#FBF5EB] hover:text-[#715126] focus-visible:outline-2 focus-visible:outline-[#C59B58]">
      <History size={14}/><span>Lịch sử · {entries.length}</span>
    </button>
    {open && createPortal(<Modal isOpen title="Lịch sử xét duyệt" subtitle={`Tháng ${month.split('-').reverse().join('/')}`} maxWidth="xl" stickyHeader className="sm:max-w-[560px]" bodyClassName="p-0!" onClose={() => setOpen(false)}>
      <ol aria-label="Lịch sử gửi lại chính sách" className="m-0 list-none divide-y divide-[#EAE4D7] p-0">
        {ordered.map(entry => <li key={entry.id} className="px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><strong className="inline-flex items-center gap-2 text-sm font-semibold text-[#1A1612]"><span aria-hidden="true" className="size-2 rounded-full bg-[#C59B58]"/>Đã gửi lại</strong>{formatDate(entry.resubmittedAt) ? <time dateTime={entry.resubmittedAt} className="text-xs tabular-nums text-[#7D715E]">{formatDate(entry.resubmittedAt)}</time> : <span className="text-xs text-[#7D715E]">Chưa ghi nhận thời gian</span>}</div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#7D715E]"><span>Kết quả trước đó: <strong className="font-medium text-[#715126]">Đã từ chối</strong></span>{formatDate(entry.reviewedAt) && <time dateTime={entry.reviewedAt!}>Từ chối: {formatDate(entry.reviewedAt)}</time>}</div>
          <div className="mt-3"><span className="text-xs text-[#7D715E]">Lý do</span><p className="m-0 mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-[#1A1612]">{entry.reviewNote || 'Chưa lưu ghi chú chi tiết.'}</p></div>
          {entry.name && <p className="mb-0 mt-3 text-xs text-[#7D715E]">Tên mốc cũ: <span className="text-[#1A1612]">{entry.name}</span></p>}
          <dl className="mb-0 mt-4 grid grid-cols-2 divide-x divide-[#EAE4D7] border-t border-[#EAE4D7] pt-3 text-sm"><div className="pr-3"><dt className="text-xs text-[#7D715E]">Mốc doanh số cũ</dt><dd className="m-0 mt-1 break-words font-semibold tabular-nums text-[#1A1612]">{money(entry.targetRevenue)}</dd></div><div className="pl-4"><dt className="text-xs text-[#7D715E]">Tiền thưởng cũ</dt><dd className="m-0 mt-1 break-words font-semibold tabular-nums text-[#715126]">{money(entry.rewardAmount)}</dd></div></dl>
        </li>)}
      </ol>
    </Modal>, document.body)}
  </>;
}
