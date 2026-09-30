export interface ChatUser {
  id: string;
  fullName: string;
  role: string;
  avatarUrl?: string | null;
  collaboratorProfile?: {
    avatarUrl?: string | null;
  } | null;
}

export type ChatAttachmentType = 'IMAGE' | 'VIDEO' | 'DOCUMENT';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  messageText: string;
  mediaUrl?: string;
  mediaType?: ChatAttachmentType;
  mediaName?: string;
  isRead: boolean;
  createdAt: string;
  sender: ChatUser;
}

export interface Conversation {
  id: string;
  storeId: string;
  collaboratorId: string;
  lastMessageAt: string;
  createdAt: string;
  store: {
    id: string;
    name: string;
    slug?: string;
    logoUrl?: string;
    owner?: {
      id?: string;
      fullName?: string;
      avatarUrl?: string | null;
    };
  };
  collaborator: ChatUser;
  chatMessages: {
    messageText: string;
    mediaType?: ChatAttachmentType;
    mediaName?: string;
    createdAt: string;
    senderId: string;
    isRead: boolean;
  }[];
}
