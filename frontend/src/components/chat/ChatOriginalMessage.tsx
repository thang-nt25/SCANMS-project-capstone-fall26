import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { ChatReply } from '@/types/chat.types';
import { chatContentUrl } from '@/utils/chat-explorer';
import { ChatExplorerContent } from './ChatExplorerContent';

export function ChatOriginalMessage({ message, onClose }: { message: ChatReply; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = previous; };
  }, []);
  const url = chatContentUrl(message.mediaUrl, window.location.href);
  return createPortal(<dialog ref={ref} aria-labelledby="chat-original-title" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }} className="m-auto w-[calc(100%_-_32px)] max-w-lg max-h-[calc(100dvh_-_32px)] overflow-y-auto rounded-2xl border border-[#EAE4D7] bg-white p-5 text-[#1A1612] backdrop:bg-[#231D15]/40">
    <header className="mb-4 flex items-center justify-between gap-3"><h2 id="chat-original-title" className="text-sm font-semibold">Tin nhắn gốc</h2><button type="button" aria-label="Đóng tin nhắn gốc" onClick={onClose}><X size={19} /></button></header>
    <p className="mb-1 text-xs font-semibold">{message.sender?.fullName || 'Người gửi'}</p><p className="mb-3 text-xs text-[#7D715E]">{new Date(message.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
    <ChatExplorerContent text={message.messageText} query="" />
    {url && message.mediaType === 'IMAGE' && <img src={url} alt={message.mediaName || 'Hình ảnh đã gửi'} className="mt-3 max-h-80 w-full rounded-lg object-contain" />}
    {url && message.mediaType === 'VIDEO' && <video src={url} controls className="mt-3 max-h-80 w-full rounded-lg" />}
    {url && <a href={url} target="_blank" rel="noopener noreferrer" className="mt-3 block text-sm text-[#795A2D] underline">{message.mediaName || 'Mở tệp gốc'}</a>}
  </dialog>, document.body);
}
