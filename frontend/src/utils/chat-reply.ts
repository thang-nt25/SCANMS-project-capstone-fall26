import type { ChatReply } from '@/types/chat.types';
import { chatContentText } from './chat-explorer';

export function chatReplyPreview(message: Pick<ChatReply, 'messageText' | 'mediaType' | 'mediaName'>) {
  const body = message.messageText?.trim();
  if (body) return chatContentText(body).replace(/\s+/g, ' ').slice(0, 220);
  const labels: Record<string, string> = { IMAGE: 'Hình ảnh', VIDEO: 'Video', DOCUMENT: 'Tài liệu' };
  return [labels[message.mediaType || ''] || 'Tin nhắn', message.mediaName].filter(Boolean).join(' · ');
}
