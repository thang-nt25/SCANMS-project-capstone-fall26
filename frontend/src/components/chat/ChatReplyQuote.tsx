import { CornerUpLeft, X } from 'lucide-react';
import type { ChatReply } from '@/types/chat.types';
import { chatReplyPreview } from '@/utils/chat-reply';
import './ChatReply.css';

export function ChatReplyQuote({ message, currentUserId, onCancel, onLocate }: {
  message: ChatReply; currentUserId?: string; onCancel?: () => void; onLocate?: () => void;
}) {
  const name = message.senderId === currentUserId ? 'Bạn' : message.sender?.fullName || 'Người gửi';
  const content = <><strong>{onCancel ? `Đang trả lời ${name}` : name}</strong><span>{chatReplyPreview(message)}</span></>;
  return <div className={`chat-reply-quote${onCancel ? ' chat-reply-draft' : ''}`} role={onCancel ? 'status' : undefined}>
    {onCancel && <CornerUpLeft size={16} aria-hidden="true" />}
    {onLocate ? <button type="button" className="chat-reply-summary" onClick={onLocate} aria-label={`Xem tin nhắn gốc của ${name}`}>{content}</button> : <div className="chat-reply-summary">{content}</div>}
    {onCancel && <button type="button" className="chat-reply-cancel" onClick={onCancel} aria-label="Hủy trả lời"><X size={17} /></button>}
  </div>;
}
