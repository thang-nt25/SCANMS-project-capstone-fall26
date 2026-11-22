import { BadRequestException } from '@nestjs/common';

export const CHAT_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'] as const;
export function validateChatReaction(value: unknown): string {
  if (typeof value !== 'string' || !(CHAT_REACTIONS as readonly string[]).includes(value)) {
    throw new BadRequestException('Cảm xúc không hợp lệ.');
  }
  return value;
}
export type ChatReactionSummary = { messageId: string; emoji: string; count: number; mine: boolean };
