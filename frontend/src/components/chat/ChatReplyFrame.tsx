import type { ReactNode } from 'react';
import { CornerUpLeft } from 'lucide-react';
import type { ChatReply } from '@/types/chat.types';
import { ChatReplyQuote } from './ChatReplyQuote';

export function ChatReplyFrame({ id, mine, quote, currentUserId, onReply, onLocate, children, enabled }: {
  id: string; mine: boolean; quote?: ChatReply | null; currentUserId?: string;
  onReply: () => void; onLocate: (message: ChatReply) => void; children: ReactNode;
  enabled: boolean;
}) {
  return <div id={`floating-chat-message-${id}`} className={`min-w-0 space-y-1 ${mine ? 'text-right' : 'text-left'}`} onClick={event => {
    if ((event.target as HTMLElement).closest('button, a, video, input, [role="button"]') || window.getSelection()?.toString()) return;
    onReply();
  }}>
    {quote && <ChatReplyQuote message={quote} currentUserId={currentUserId} onLocate={() => onLocate(quote)} />}
    {children}
    {enabled && <button type="button" className="chat-reply-action" onClick={onReply} aria-label="Trả lời tin nhắn"><CornerUpLeft size={13} aria-hidden="true" />Trả lời</button>}
  </div>;
}
