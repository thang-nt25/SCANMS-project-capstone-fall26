import type { ChatReply } from '@/types/chat.types';
import { useConversationDraft } from './useConversationDraft';
import { chatReplyPreview } from '@/utils/chat-reply';

export function useChatReply(userId?: string, conversationId?: string | null) {
  const [saved, setSaved] = useConversationDraft(userId, conversationId, 'reply');
  let selected: ChatReply | null = null;
  try {
    const parsed = saved ? JSON.parse(saved) : null;
    if (parsed?.id && parsed.conversationId === conversationId && typeof parsed.messageText === 'string' && parsed.sender?.id) selected = parsed;
  } catch { /* Discard incomplete drafts from older sessions. */ }
  const select = (message: ChatReply | null) => {
    // The server resolves the original from its ID; this snapshot is only a draft preview.
    setSaved(message ? JSON.stringify({
      id: message.id, conversationId: message.conversationId, senderId: message.senderId,
      messageText: chatReplyPreview(message), mediaType: message.mediaType, mediaName: message.mediaName?.slice(0, 255),
      createdAt: message.createdAt, sender: message.sender ? { id: message.sender.id, fullName: message.sender.fullName, role: message.sender.role } : { id: message.senderId, fullName: 'Người gửi', role: 'USER' },
    }) : '');
  };
  return [selected, select] as const;
}
