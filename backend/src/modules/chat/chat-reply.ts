export const chatReplySelect = {
  id: true,
  conversationId: true,
  senderId: true,
  messageText: true,
  mediaUrl: true,
  mediaType: true,
  mediaName: true,
  createdAt: true,
  sender: { select: { id: true, fullName: true, role: true } },
} as const;

export const chatMessageSelect = {
  ...chatReplySelect,
  isRead: true,
  sender: { select: { id: true, fullName: true, role: true, avatarUrl: true, collaboratorProfile: { select: { avatarUrl: true } } } },
} as const;
