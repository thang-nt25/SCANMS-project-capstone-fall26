import { CornerUpLeft, X } from 'lucide-react';
import type { ChatReply } from '@/types/chat.types';
import { chatReplyPreview } from '@/utils/chat-reply';

export function ChatReplyQuote({ message, currentUserId, onCancel, onLocate }: {
  message: ChatReply; currentUserId?: string; onCancel?: () => void; onLocate?: () => void;
}) {
  const name = message.senderId === currentUserId ? 'Bạn' : message.sender?.fullName || 'Người gửi';
  const content = <><strong className="text-[11px] font-semibold leading-4 text-[#795A2D]">{onCancel ? `Đang trả lời ${name}` : name}</strong><span className="line-clamp-2 text-xs leading-[18px] [overflow-wrap:anywhere]">{chatReplyPreview(message)}</span></>;
  const summaryClass = 'chat-reply-summary grid min-w-0 flex-1 gap-[3px] border-0 bg-transparent p-0 text-left text-inherit focus-visible:outline-2 focus-visible:outline-[#C59B58] focus-visible:outline-offset-2';
  return <div className={`chat-reply-quote flex min-w-0 max-w-full items-center gap-[9px] rounded-[9px] border border-l-[3px] border-l-[#C59B58] px-[11px] py-[9px] text-left text-[#7D715E] ${onCancel ? 'chat-reply-draft mb-2.5 border-[#EEDFC6] bg-[#FBF5EB]' : 'border-[#EAE4D7] bg-[#F3EFE6]'}`} role={onCancel ? 'status' : undefined}>
    {onCancel && <CornerUpLeft size={16} aria-hidden="true" />}
    {onLocate ? <button type="button" className={`${summaryClass} cursor-pointer`} onClick={onLocate} aria-label={`Xem tin nhắn gốc của ${name}`}>{content}</button> : <div className={summaryClass}>{content}</div>}
    {onCancel && <button type="button" className="chat-reply-cancel grid size-[30px] shrink-0 cursor-pointer place-items-center rounded-[7px] border-0 bg-transparent p-1 text-[#7D715E] hover:bg-[#F3EFE6] focus-visible:outline-2 focus-visible:outline-[#C59B58] focus-visible:outline-offset-2" onClick={onCancel} aria-label="Hủy trả lời"><X size={17} /></button>}
  </div>;
}
