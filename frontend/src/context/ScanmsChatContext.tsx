import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { getChatSocket } from '../services/chat-socket.service';
import type {
  ChatAttachmentType,
  ChatProductInfo,
  ChatStoreInfo,
  ChatCouponVoucher,
  ChatExclusiveDeal,
  ChatMessageItem,
  ChatConversationItem,
  ScanmsChatContextType,
} from '@/types/chat.types';
import { toast } from '../utils/toast';

export type {
  ChatAttachmentType,
  ChatProductInfo,
  ChatStoreInfo,
  ChatCouponVoucher,
  ChatExclusiveDeal,
  ChatMessageItem,
  ChatConversationItem,
  ScanmsChatContextType,
};

const ScanmsChatContext = createContext<ScanmsChatContextType | undefined>(undefined);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getCurrentUserId(): string | undefined {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}')?.id;
  } catch {
    return undefined;
  }
}

function getChatStorageScope(): string {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user?.id ? `${user.id}:${user.role || 'unknown'}` : 'guest';
  } catch {
    return 'guest';
  }
}

function getChatStorageKey(scope = getChatStorageScope()): string {
  return `scanms_chat_conversations:${encodeURIComponent(scope)}`;
}

function formatTimeDisplay(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Hôm qua';
  }
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
}

function loadCachedConversations(scope: string): ChatConversationItem[] {
  try {
    const key = getChatStorageKey(scope);
    const saved = localStorage.getItem(key);
    if (!saved) return [];
    const parsed: ChatConversationItem[] = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    const filtered = parsed.filter(
      (c) =>
        c?.store?.name &&
        !c.store.name.toLowerCase().includes('marie.japan') &&
        !c.store.name.toLowerCase().includes('umizoku') &&
        c.id !== 'conv-marie-japan' &&
        c.id !== 'conv-umizoku' &&
        c.id !== 'conv-sora-skin' &&
        (UUID_REGEX.test(c.id) || c.messages?.length > 0 || Boolean(c.lastMessage && c.lastMessage !== 'Bắt đầu cuộc trò chuyện' && c.lastMessage !== 'Bắt đầu cuộc trò chuyện mới'))
    );
    return deduplicateConversations(filtered);
  } catch {
    return [];
  }
}

function parseProductInquiry(text: string): ChatProductInfo | undefined {
  try {
    const card = JSON.parse(text);
    if (card?.type !== 'PRODUCT_INQUIRY' || !card.productId || !card.productTitle) return;
    return {
      id: card.productId,
      title: card.productTitle,
      price: Number(card.productPrice || 0),
      imageUrl: card.productImage || undefined,
      sku: card.productSku || undefined,
    };
  } catch {
    return;
  }
}

function parseCouponVoucher(text: string): ChatCouponVoucher | undefined {
  try {
    const card = JSON.parse(text);
    if (card?.type !== 'COUPON_VOUCHER' || !card.couponId) return;
    return {
      id: card.couponId,
      code: card.couponCode || card.code || 'VOUCHER',
      benefitType: card.benefitType,
      fundingSource: card.fundingSource,
      discountType: card.discountType || 'PERCENTAGE',
      discountValue: Number(card.discountValue || 0),
      minimumOrderAmount: card.minimumOrderAmount == null ? null : Number(card.minimumOrderAmount),
      maximumDiscountAmount: card.maximumDiscountAmount == null ? null : Number(card.maximumDiscountAmount),
      remainingUses: card.remainingUses == null ? null : Number(card.remainingUses),
      expiresAt: card.expiresAt || null,
      scopeType: card.scopeType || 'STORE_WIDE',
      products: Array.isArray(card.products) ? card.products : [],
      categories: Array.isArray(card.categories) ? card.categories : [],
      storeName: card.storeName || 'Gian hàng',
    };
  } catch {
    return;
  }
}

export function parseExclusiveDealMessage(text?: string): ChatExclusiveDeal | undefined {
  if (!text) return;
  try {
    const card = JSON.parse(text);
    if (!['EXCLUSIVE_DEAL_PROPOSAL', 'EXCLUSIVE_DEAL_DECISION'].includes(card?.type)) return;
    return card as ChatExclusiveDeal;
  } catch {
    return;
  }
}

function getChatMessagePreview(messageText?: string, mediaName?: string) {
  if (!messageText) return mediaName ? `📎 ${mediaName}` : 'Bắt đầu cuộc trò chuyện';
  try {
    const parsed = JSON.parse(messageText);
    if (parsed.type === 'CAMPAIGN_INVITE') {
      const bonus = parsed.bonusCommissionRate ? ` (+${parsed.bonusCommissionRate}%)` : '';
      return `🎁 Thư mời chiến dịch VIP: ${parsed.campaignName || parsed.title || 'Chiến dịch'}${bonus}`;
    }
    if (parsed.type === 'CAMPAIGN_ACCEPTED') {
      return `✅ Đã tham gia chiến dịch: ${parsed.campaignName || parsed.title || 'Chiến dịch'}`;
    }
    if (parsed.type === 'CAMPAIGN_REJECTED') {
      return `❌ Đã từ chối chiến dịch: ${parsed.campaignName || parsed.title || 'Chiến dịch'}`;
    }
    if (parsed.type === 'COUPON_PROPOSAL') {
      return `🎟️ Đề xuất mã riêng: ${parsed.code || parsed.couponCode || 'Voucher VIP'}`;
    }
    if (parsed.type === 'COUPON_PROPOSAL_APPROVED') {
      return `✅ Đã kích hoạt mã riêng: ${parsed.code || parsed.couponCode || 'Voucher VIP'}`;
    }
    if (parsed.type === 'EXCLUSIVE_DEAL_PROPOSAL') {
      return `🤝 Đề xuất deal độc quyền: ${parsed.productTitle || 'Sản phẩm'}`;
    }
    if (parsed.type === 'EXCLUSIVE_DEAL_DECISION') {
      return parsed.status === 'APPROVED' ? '✅ Đã duyệt deal độc quyền' : '❌ Đã từ chối deal độc quyền';
    }
    if (parsed.type === 'PRODUCT_INQUIRY') {
      return `🛍️ Hỏi về: ${parsed.productTitle || 'sản phẩm'}`;
    }
    if (parsed.type === 'COUPON_VOUCHER') {
      return `🎟️ Voucher: ${parsed.couponCode || 'ưu đãi'}`;
    }
    return messageText;
  } catch {}
  const product = parseProductInquiry(messageText);
  if (product) return `Sản phẩm: ${product.title}`;
  const coupon = parseCouponVoucher(messageText);
  if (coupon) return `Mã giảm giá: ${coupon.code}`;
  const exclusiveDeal = parseExclusiveDealMessage(messageText);
  if (exclusiveDeal) {
    const productTitle = exclusiveDeal.productTitle || 'sản phẩm';
    return exclusiveDeal.type === 'EXCLUSIVE_DEAL_PROPOSAL'
      ? `Đề xuất Exclusive Deal: ${productTitle} · ${exclusiveDeal.proposedCommissionRate ?? '—'}%`
      : `Cập nhật Exclusive Deal: ${productTitle} · ${exclusiveDeal.status === 'APPROVED' ? 'đã duyệt' : 'đã từ chối'}`;
  }
  return messageText;
}

export function isUnsafeShopLogo(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return true;
  const lower = url.toLowerCase().trim();
  if (!lower) return true;
  return (
    lower.includes('unsplash.com') ||
    lower.includes('photo-1522337360788') ||
    lower.includes('photo-1571781926291') ||
    lower.includes('photo-1550009158') ||
    lower.includes('photo-1540420773') ||
    lower.includes('photo-1532413992')
  );
}

export function deduplicateConversations(list: ChatConversationItem[]): ChatConversationItem[] {
  const seenStores = new Set<string>();
  const seenIds = new Set<string>();
  const result: ChatConversationItem[] = [];

  for (const conv of list) {
    if (!conv || !conv.store) continue;

    const storeIdKey = (conv.store.id || '').trim().toLowerCase();
    const storeNameKey = (conv.store.name || '').trim().toLowerCase();
    const convIdKey = (conv.id || '').trim();

    const isStoreDuplicate =
      (storeIdKey && seenStores.has(storeIdKey)) ||
      (!storeIdKey && storeNameKey && seenStores.has(`name:${storeNameKey}`));
    const isIdDuplicate = convIdKey && seenIds.has(convIdKey);

    if (!isStoreDuplicate && !isIdDuplicate) {
      if (storeIdKey) seenStores.add(storeIdKey);
      if (!storeIdKey && storeNameKey) seenStores.add(`name:${storeNameKey}`);
      if (convIdKey) seenIds.add(convIdKey);

      result.push({
        ...conv,
        store: {
          ...conv.store,
          logoUrl: isUnsafeShopLogo(conv.store.logoUrl) ? undefined : conv.store.logoUrl,
        },
      });
    }
  }

  return result;
}

function mapServerConversation(raw: any): ChatConversationItem {
  const last = raw?.chatMessages?.[0];
  const rawLogo = raw.store?.logoUrl;
  return {
    id: raw.id,
    store: {
      id: raw.store?.id || raw.storeId,
      name: raw.store?.name || 'Cửa hàng',
      logoUrl: isUnsafeShopLogo(rawLogo) ? undefined : rawLogo,
    },
    lastMessage: getChatMessagePreview(last?.messageText, last?.mediaName),
    lastTime: last?.createdAt ? formatTimeDisplay(last.createdAt) : '',
    unreadCount: Number(raw._count?.chatMessages) || 0,
    messages: [],
  };
}

function mapServerMessage(raw: any, userId = getCurrentUserId()): ChatMessageItem {
  const content = raw.messageText || '';
  const product = parseProductInquiry(content);
  const coupon = parseCouponVoucher(content);
  return {
    id: raw.id,
    sender: raw.senderId === userId ? 'user' : 'shop',
    content,
    timestamp: new Date(raw.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    mediaUrl: raw.mediaUrl || undefined,
    mediaType: raw.mediaType || undefined,
    mediaName: raw.mediaName || undefined,
    senderId: raw.senderId,
    senderName: raw.sender?.fullName,
    replyToId: raw.replyToId,
    replyTo: raw.replyTo || null,
    ...(product ? { product, products: [product] } : {}),
    ...(coupon ? { coupon } : {}),
  };
}

export function ScanmsChatProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [conversations, setConversations] = useState<ChatConversationItem[]>(() =>
    loadCachedConversations(getChatStorageScope())
  );
  const [draftConversation, setDraftConversation] = useState<ChatConversationItem | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string>(() => {
    const cached = loadCachedConversations(getChatStorageScope());
    return cached[0]?.id || '';
  });
  const [activeProduct, setActiveProduct] = useState<ChatProductInfo | null>(null);
  const socketRef = useRef<ReturnType<typeof getChatSocket> | null>(null);
  const authScopeRef = useRef(getChatStorageScope());
  const openingConversations = useRef(new Map<string, Promise<any>>());
  const visibleChatRef = useRef({ isOpen: false, conversationId: activeConversationId });
  visibleChatRef.current = { isOpen: isOpen && !isMinimized, conversationId: activeConversationId };

  const ensureSocket = () => {
    const socket = getChatSocket();
    if (socketRef.current !== socket) {
      socket.on('new_message', (raw: any) => {
        const message = mapServerMessage(raw);
        if (message.sender !== 'user' && visibleChatRef.current.isOpen &&
            visibleChatRef.current.conversationId === raw.conversationId && document.visibilityState === 'visible') {
          void api.patch(`/chat/conversations/${raw.conversationId}/read`).catch(() => undefined);
        }
        setConversations((prev) => prev.map((conv) => {
          if (conv.id !== raw.conversationId || conv.messages.some((item) => item.id === message.id)) return conv;
          return {
            ...conv,
            lastMessage: getChatMessagePreview(message.content, message.mediaName),
            lastTime: message.timestamp,
            messages: [...conv.messages, message],
          };
        }));
      });
      socket.on('error', (error: { message?: string }) => {
        if (error?.message) toast.error(error.message);
      });
      socket.on('messages_read', (event: { readerId: string; conversationId: string }) => {
        if (event.readerId === getCurrentUserId()) {
          setConversations((prev) => prev.map((conv) => conv.id === event.conversationId ? { ...conv, unreadCount: 0 } : conv));
        }
      });
      socketRef.current = socket;
    }
    return socket;
  };

  useEffect(() => {
    let cancelled = false;

    const reloadConversations = () => {
      const currentScope = getChatStorageScope();
      if (authScopeRef.current !== currentScope) {
        authScopeRef.current = currentScope;
        const initial = loadCachedConversations(currentScope);
        setConversations(initial);
        setActiveConversationId(initial[0]?.id || '');
        setActiveProduct(null);
        setIsOpen(false);
        setIsMinimized(false);
      }
      if (!localStorage.getItem('token')) return;
      const requestedScope = currentScope;
      api.get('/chat/conversations')
        .then((result: any) => {
          const rawRows = Array.isArray(result) ? result : result?.data || [];
          if (cancelled || requestedScope !== getChatStorageScope() || !Array.isArray(rawRows)) return;
          // Empty server conversations are real conversations too.
          const rows = rawRows;
          const mapped = rows.map(mapServerConversation);
          setConversations((prev) => {
            const mergedMapped = mapped.map((srv) => {
              const localMatch = prev.find((p) => p.id === srv.id);
              return {
                ...srv,
                messages: srv.messages.length > 0 ? srv.messages : (localMatch?.messages || []),
                lastMessage: srv.lastMessage !== 'Bắt đầu cuộc trò chuyện' ? srv.lastMessage : (localMatch?.lastMessage || srv.lastMessage),
              };
            });
            const pendingOptimistic = prev.filter(
              (p) =>
                p.id !== 'conv-sora-skin' &&
                !p.id.startsWith('draft-') &&
                p.store?.id &&
                !mapped.some((m) => m.store?.id === p.store?.id) &&
                (UUID_REGEX.test(p.id) || p.messages?.length > 0 || Boolean(p.lastMessage && p.lastMessage !== 'Bắt đầu cuộc trò chuyện'))
            );
            return deduplicateConversations([...mergedMapped, ...pendingOptimistic]);
          });
          setActiveConversationId(current => current || mapped[0]?.id || '');
          ensureSocket();
        })
        .catch(() => {});
    };
    reloadConversations();
    const readVisibleChat = () => {
      const current = visibleChatRef.current;
      if (current.isOpen && document.visibilityState === 'visible' && UUID_REGEX.test(current.conversationId) && localStorage.getItem('token')) {
        void api.patch(`/chat/conversations/${current.conversationId}/read`).catch(() => undefined);
      }
    };
    window.addEventListener('auth-user-updated', reloadConversations);
    document.addEventListener('visibilitychange', readVisibleChat);
    return () => {
      cancelled = true;
      window.removeEventListener('auth-user-updated', reloadConversations);
      document.removeEventListener('visibilitychange', readVisibleChat);
    };
  }, []);

  useEffect(() => {
    if (!isOpen || isMinimized || !UUID_REGEX.test(activeConversationId) || !localStorage.getItem('token')) return;
    let cancelled = false;
    const socket = ensureSocket();
    socket.emit('join_conversation', { conversationId: activeConversationId });
    api.get(`/chat/conversations/${activeConversationId}/messages?take=50`, { headers: { 'x-skip-cache': '1' } })
      .then((result: any) => {
        const rows = Array.isArray(result) ? result : result?.data || [];
        if (cancelled || !Array.isArray(rows)) return;
        setConversations((prev) => prev.map((conv) => {
          if (conv.id !== activeConversationId) return conv;
          const fetched = rows.map((row: any) => mapServerMessage(row));
          const fetchedIds = new Set(fetched.map((message: ChatMessageItem) => message.id));
          const justArrived = conv.messages.filter((message) => !fetchedIds.has(message.id));
          return { ...conv, messages: [...fetched, ...justArrived] };
        }));
        if (document.visibilityState === 'visible') {
          void api.patch(`/chat/conversations/${activeConversationId}/read`).catch(() => undefined);
        }
      })
      .catch((error: any) => toast.error(error?.message || 'Không tải được lịch sử chat.'));
    return () => {
      cancelled = true;
      socket.emit('leave_conversation', { conversationId: activeConversationId });
    };
  }, [activeConversationId, isOpen, isMinimized]);

  useEffect(() => {
    try {
      const scope = authScopeRef.current;
      if (scope !== getChatStorageScope()) return;
      localStorage.setItem(getChatStorageKey(scope), JSON.stringify(conversations));
    } catch (e) {
      console.warn('Could not persist chat conversations', e);
    }
  }, [conversations]);

  const activeConversation =
    (draftConversation && draftConversation.id === activeConversationId ? draftConversation : null) ||
    conversations.find((c) => c.id === activeConversationId) ||
    draftConversation ||
    conversations[0] ||
    null;

  const openChat = (store?: ChatStoreInfo, product?: ChatProductInfo) => {
    setIsOpen(true);
    setIsMinimized(false);

    setActiveProduct(product || null);

    if (store) {
      const cleanStore: ChatStoreInfo = {
        ...store,
        logoUrl: isUnsafeShopLogo(store.logoUrl) ? undefined : store.logoUrl,
      };

      const normalizedStoreName = cleanStore.name.trim().toLowerCase();
      const existingConv = conversations.find(
        (c) =>
          UUID_REGEX.test(c.id) &&
          ((c.store.id && cleanStore.id && c.store.id.toLowerCase() === cleanStore.id.toLowerCase()) ||
          (!c.store.id && !cleanStore.id && c.store.name.trim().toLowerCase() === normalizedStoreName))
      );

      if (existingConv) {
        setDraftConversation(null);
        setActiveConversationId(existingConv.id);
        ensureSocket();
      } else {
        const draftId = `draft-${cleanStore.id || Date.now()}`;
        const draft: ChatConversationItem = {
          id: draftId,
          store: cleanStore,
          lastMessage: '',
          lastTime: '',
          unreadCount: 0,
          messages: [],
        };
        setDraftConversation(draft);
        setActiveConversationId(draftId);

        if (localStorage.getItem('token') && cleanStore.id) {
          const scope = getChatStorageScope();
          const requestKey = `${scope}:${cleanStore.id}`;
          let request = openingConversations.current.get(requestKey);
          if (!request) {
            request = api.post('/chat/conversations', { storeId: cleanStore.id });
            openingConversations.current.set(requestKey, request);
          }
          void request.then((result: any) => {
            if (scope !== getChatStorageScope()) return;
            const raw = result?.data || result;
            if (!raw?.id || !UUID_REGEX.test(raw.id)) throw new Error('Máy chủ chưa trả về hội thoại hợp lệ.');
            const conversation = mapServerConversation(raw);
            conversation.store = { ...cleanStore, ...conversation.store, id: raw.store?.id || cleanStore.id, name: raw.store?.name || cleanStore.name };
            setConversations(previous => deduplicateConversations([
              previous.find(item => item.id === conversation.id) || conversation,
              ...previous,
            ]));
            setDraftConversation(current => current?.id === draftId ? null : current);
            setActiveConversationId(current => current === draftId ? conversation.id : current);
            ensureSocket();
          }).catch((error: any) => {
            if (scope === getChatStorageScope()) toast.error(error?.message || 'Chưa mở được hội thoại với Shop. Vui lòng thử lại.');
          }).finally(() => {
            if (openingConversations.current.get(requestKey) === request) openingConversations.current.delete(requestKey);
          });
        }
      }
    }
  };

  const closeChat = () => {
    setIsOpen(false);
    if (draftConversation && draftConversation.messages.length === 0) {
      setDraftConversation(null);
    }
  };

  const toggleMinimize = () => {
    setIsMinimized((prev) => !prev);
  };

  const selectConversation = (id: string) => {
    if (draftConversation && id !== draftConversation.id) {
      setDraftConversation(null);
    }
    setActiveConversationId(id);
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
    );
  };

  const clearActiveProduct = () => {
    setActiveProduct(null);
  };

  const deleteConversation = async (conversationId: string): Promise<boolean> => {
    if (!conversationId) return false;

    if (UUID_REGEX.test(conversationId) && localStorage.getItem('token')) {
      try {
        await api.delete(`/chat/conversations/${conversationId}`);
      } catch (err: any) {
        console.warn('Backend delete conversation failed, proceeding with local removal:', err);
      }
    }

    setConversations((prev) => {
      const remaining = prev.filter((c) => c.id !== conversationId);
      return remaining;
    });

    setActiveConversationId((current) => {
      if (current === conversationId) {
        const remaining = conversations.filter((c) => c.id !== conversationId);
        return remaining.length > 0 ? remaining[0].id : '';
      }
      return current;
    });

    toast.success('Đã xóa cuộc trò chuyện khỏi danh sách.');
    return true;
  };

  const clearConversationMessages = async (conversationId: string): Promise<boolean> => {
    if (!conversationId) return false;

    if (UUID_REGEX.test(conversationId) && localStorage.getItem('token')) {
      try {
        await api.delete(`/chat/conversations/${conversationId}/messages`);
      } catch (err: any) {
        console.warn('Backend clear messages failed:', err);
      }
    }

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== conversationId) return c;
        return {
          ...c,
          messages: [],
          lastMessage: 'Bắt đầu cuộc trò chuyện',
        };
      })
    );

    toast.success('Đã xóa sạch lịch sử tin nhắn.');
    return true;
  };

  const clearAllConversations = () => {
    setConversations([]);
    setActiveConversationId('');
    setActiveProduct(null);
    const scope = authScopeRef.current;
    try {
      localStorage.removeItem(getChatStorageKey(scope));
    } catch {}
    toast.success('Đã xóa toàn bộ lịch sử các cuộc trò chuyện.');
  };

  const pendingReplyMessages = useRef(new Map<string, string>());
  const sendMessage = async (content: string, replyToId?: string): Promise<boolean> => {
    const trimmed = content.trim();
    if (!trimmed || !activeConversation) return false;

    if (activeConversation.id.startsWith('draft-')) {
      const storeId = activeConversation.store?.id;
      let serverConvId = '';

      if (localStorage.getItem('token') && storeId) {
        try {
          const result: any = await api.post('/chat/conversations', { storeId });
          const raw = result?.data || result;
          if (raw?.id) serverConvId = raw.id;
        } catch (err) {
          console.warn('Lỗi tạo hội thoại chat trên server:', err);
        }
      }

      const realConvId = serverConvId || `conv-${Date.now()}`;
      const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const userMsg: ChatMessageItem = {
        id: `msg-${Date.now()}`,
        sender: 'user',
        content: trimmed,
        timestamp: timeStr,
        product: activeProduct || undefined,
      };

      const promotedConv: ChatConversationItem = {
        ...activeConversation,
        id: realConvId,
        lastMessage: trimmed,
        lastTime: timeStr,
        unreadCount: 0,
        messages: [userMsg],
      };

      setDraftConversation(null);
      setActiveConversationId(realConvId);
      setConversations((prev) => deduplicateConversations([promotedConv, ...prev]));

      if (serverConvId && localStorage.getItem('token')) {
        const socket = ensureSocket();
        socket.emit('join_conversation', { conversationId: serverConvId });
        socket.emit('send_message', { conversationId: serverConvId, messageText: trimmed, replyToId, messageId: crypto.randomUUID() });
      }
      return true;
    }

    if (UUID_REGEX.test(activeConversation.id) && localStorage.getItem('token')) {
      const socket = ensureSocket();
      if (!socket.connected) { toast.error('Chat đang mất kết nối. Tin nhắn được giữ lại để bạn thử lại.'); return false; }
      socket.emit('join_conversation', { conversationId: activeConversation.id });
      const key = `${activeConversation.id}:${replyToId || ''}:${trimmed}`;
      const messageId = pendingReplyMessages.current.get(key) || crypto.randomUUID();
      pendingReplyMessages.current.set(key, messageId);
      return new Promise(resolve => socket.timeout(8000).emit('send_message', { conversationId: activeConversation.id, messageText: trimmed, replyToId, messageId }, (failure: Error | null, result?: { ok: boolean; error?: string }) => {
        if (failure || !result?.ok) { toast.error(result?.error || 'Chưa gửi được tin nhắn. Vui lòng thử lại.'); resolve(false); }
        else { pendingReplyMessages.current.delete(key); resolve(true); }
      }));
    }

    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessageItem = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      content: trimmed,
      timestamp: timeStr,
      product: activeProduct || undefined,
    };

    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id !== activeConversationId) return conv;
        return {
          ...conv,
          lastMessage: userMsg.content,
          lastTime: timeStr,
          messages: [...conv.messages, userMsg],
        };
      })
    );


    const currentStoreName = activeConversation.store.name;
    setTimeout(() => {
      const replies = [
        `Dạ ${currentStoreName} xin chào bạn! Shop đã ghi nhận tin nhắn: "${trimmed}". Shop sẽ kiểm tra và phản hồi kỹ hơn cho bạn ngay nhé!`,
        `Dạ sản phẩm chính hãng 100% được bảo hành đổi trả trong 14 ngày ạ. Bạn cần Shop hướng dẫn cách đặt mã giảm giá không ạ?`,
        `Dạ hàng có sẵn tại kho và đóng gói bàn giao đơn vị vận chuyển ngay trong ngày hôm nay bạn nhé!`,
      ];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      const shopMsg: ChatMessageItem = {
        id: `msg-shop-${Date.now()}`,
        sender: 'shop',
        content: randomReply,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };

      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id !== activeConversationId) return conv;
          return {
            ...conv,
            lastMessage: shopMsg.content,
            lastTime: shopMsg.timestamp,
            messages: [...conv.messages, shopMsg],
          };
        })
      );
    }, 1200);
    return true;
  };

  const sendAttachment = async (file: File, type: ChatAttachmentType, caption = '', replyToId?: string) => {
    if (!localStorage.getItem('token')) throw new Error('Vui lòng đăng nhập để gửi tệp trong chat.');
    if (!activeConversation) throw new Error('Không tìm thấy cuộc trò chuyện.');

    let convId = activeConversation.id;
    if (convId.startsWith('draft-')) {
      const storeId = activeConversation.store?.id;
      if (storeId) {
        try {
          const result: any = await api.post('/chat/conversations', { storeId });
          const raw = result?.data || result;
          if (raw?.id) {
            convId = raw.id;
            const promotedConv: ChatConversationItem = {
              ...activeConversation,
              id: convId,
            };
            setDraftConversation(null);
            setActiveConversationId(convId);
            setConversations((prev) => deduplicateConversations([promotedConv, ...prev]));
          }
        } catch (err: any) {
          throw new Error(err?.response?.data?.message || 'Không thể tạo cuộc trò chuyện trên máy chủ.');
        }
      }
    }

    if (!UUID_REGEX.test(convId)) {
      throw new Error('Cuộc trò chuyện chưa kết nối với máy chủ. Hãy đóng và mở lại chat của Shop.');
    }

    const formData = new FormData();
    formData.append('file', file);
    const result: any = await api.post(
      `/chat/conversations/${convId}/attachments`,
      formData,
      { timeout: 120000, headers: { 'Content-Type': 'multipart/form-data' } },
    );
    const attachment = result?.data || result;
    if (!attachment?.url) throw new Error('Máy chủ chưa trả về đường dẫn tệp đã tải lên.');

    const socket = ensureSocket();
    socket.emit('join_conversation', { conversationId: convId });
    await new Promise<void>((resolve, reject) => socket.timeout(12000).emit('send_message', {
      conversationId: convId,
      messageText: caption.trim(),
      mediaUrl: attachment.url,
      mediaType: type,
      mediaName: attachment.fileName || file.name,
      replyToId,
      messageId: crypto.randomUUID(),
    }, (failure: Error | null, result?: { ok: boolean; error?: string }) => {
      if (failure || !result?.ok) reject(new Error(result?.error || 'Chưa gửi được tệp. Vui lòng thử lại.'));
      else resolve();
    }));
  };

  const sendProductsInquiry = async (productsToSend: ChatProductInfo[]) => {
    if (!productsToSend || productsToSend.length === 0 || !activeConversation) return false;

    let targetConvId = activeConversation.id;

    if (targetConvId.startsWith('draft-')) {
      const storeId = activeConversation.store?.id;
      let serverConvId = '';
      if (localStorage.getItem('token') && storeId) {
        try {
          const result: any = await api.post('/chat/conversations', { storeId });
          const raw = result?.data || result;
          if (raw?.id) serverConvId = raw.id;
        } catch (err) {
          console.warn('Lỗi tạo hội thoại chat trên server:', err);
        }
      }

      const realConvId = serverConvId || `conv-${Date.now()}`;
      const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const userMsg: ChatMessageItem = {
        id: `msg-${Date.now()}`,
        sender: 'user',
        content: `Khách đang quan tâm sản phẩm này.`,
        timestamp: timeStr,
        products: productsToSend,
        product: productsToSend[0],
      };

      const promotedConv: ChatConversationItem = {
        ...activeConversation,
        id: realConvId,
        lastMessage: `[Sản phẩm] ${productsToSend[0].title}`,
        lastTime: timeStr,
        unreadCount: 0,
        messages: [userMsg],
      };

      setDraftConversation(null);
      setActiveConversationId(realConvId);
      setConversations((prev) => deduplicateConversations([promotedConv, ...prev]));

      if (serverConvId && localStorage.getItem('token')) {
        const socket = ensureSocket();
        socket.emit('join_conversation', { conversationId: serverConvId });
        productsToSend.forEach((product) => {
          socket.emit('send_message', {
            conversationId: serverConvId,
            messageText: JSON.stringify({
              type: 'PRODUCT_INQUIRY',
              productId: product.id,
              message: 'Mình muốn tìm hiểu thêm về sản phẩm này.',
            }),
          });
        });
        toast.success(`Đã gửi ${productsToSend.length} sản phẩm vào cuộc trò chuyện.`);
        return true;
      }

      toast.success(`Đã gửi ${productsToSend.length} sản phẩm vào cuộc trò chuyện.`);
      return true;
    }

    // Guest / Offline fallback: Append product card locally into chat history
    if (!localStorage.getItem('token') || !UUID_REGEX.test(activeConversation.id)) {
      const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const userMsg: ChatMessageItem = {
        id: `msg-${Date.now()}`,
        sender: 'user',
        content: `Khách đang quan tâm sản phẩm này.`,
        timestamp: timeStr,
        products: productsToSend,
        product: productsToSend[0],
      };
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id !== activeConversationId) return conv;
          return {
            ...conv,
            lastMessage: `[Sản phẩm] ${productsToSend[0].title}`,
            lastTime: timeStr,
            messages: [...conv.messages, userMsg],
          };
        })
      );
      toast.success(`Đã gửi ${productsToSend.length} sản phẩm vào cuộc trò chuyện.`);
      return true;
    }

    const socket = ensureSocket();
    if (!socket.connected) {
      toast.error('Chat đang kết nối lại. Vui lòng thử gửi sản phẩm sau ít giây.');
      return false;
    }
    socket.emit('join_conversation', { conversationId: activeConversation.id });
    let completed = 0;
    let sent = 0;
    const failures: string[] = [];
    productsToSend.forEach((product) => {
      socket.emit(
        'send_message',
        {
          conversationId: activeConversation.id,
          messageText: JSON.stringify({
            type: 'PRODUCT_INQUIRY',
            productId: product.id,
            message: 'Mình muốn tìm hiểu thêm về sản phẩm này.',
          }),
        },
        (result: { ok?: boolean; message?: string }) => {
          if (result?.ok) {
            sent += 1;
          } else {
            failures.push(result?.message || `Không gửi được ${product.title}.`);
          }
          completed += 1;
          if (completed === productsToSend.length) {
            if (sent === productsToSend.length) {
              toast.success(`Đã gửi ${sent} sản phẩm cho Shop.`);
            } else if (sent > 0) {
              toast.error(`Đã gửi ${sent}/${productsToSend.length} sản phẩm. ${failures[0] || ''}`);
            } else {
              toast.error(failures[0] || 'Không gửi được sản phẩm cho Shop.');
            }
          }
        },
      );
    });
    return true;
  };

  const shareCouponVoucher = (coupon: ChatCouponVoucher) => {
    if (!activeConversation) return false;
    if (!localStorage.getItem('token')) {
      toast.info('Đăng nhập để gửi mã giảm giá trực tiếp cho Shop.');
      return false;
    }
    if (!UUID_REGEX.test(activeConversation.id)) {
      toast.error('Cuộc trò chuyện chưa kết nối máy chủ. Hãy mở lại chat của Shop.');
      return false;
    }

    const socket = ensureSocket();
    if (!socket.connected) {
      toast.error('Chat đang kết nối lại. Vui lòng thử gửi mã sau ít giây.');
      return false;
    }
    socket.emit('join_conversation', { conversationId: activeConversation.id });
    const voucherPayload = {
      type: 'COUPON_VOUCHER',
      couponId: coupon.id,
      couponCode: coupon.displayCode || coupon.code || 'VOUCHER',
      discountType: coupon.discountType || 'PERCENTAGE',
      discountValue: Number(coupon.discountValue || 0),
      minimumOrderAmount: coupon.minimumOrderAmount ? Number(coupon.minimumOrderAmount) : null,
      maximumDiscountAmount: coupon.maximumDiscountAmount ? Number(coupon.maximumDiscountAmount) : null,
      remainingUses: coupon.remainingUses !== null && coupon.remainingUses !== undefined
        ? coupon.remainingUses
        : (coupon.usageLimitTotal ? Math.max(0, coupon.usageLimitTotal - (coupon.usageCount || 0)) : null),
      expiresAt: coupon.expiresAt || null,
      scopeType: coupon.scopeType || 'STORE_WIDE',
      storeName: activeConversation?.store?.name || coupon.storeName || 'Gian hàng',
    };
    socket.emit(
      'send_message',
      {
        conversationId: activeConversation.id,
        messageText: JSON.stringify(voucherPayload),
      },
      (result: { ok?: boolean; message?: string }) => {
        if (result?.ok) toast.success(`Đã gửi mã ${coupon.displayCode || coupon.code} vào cuộc trò chuyện.`);
        else toast.error(result?.message || 'Không gửi được mã giảm giá.');
      },
    );
    return true;
  };

  return (
    <ScanmsChatContext.Provider
      value={{
        isOpen,
        isMinimized,
        activeConversationId,
        conversations,
        activeProduct,
        activeConversation,
        openChat,
        closeChat,
        toggleMinimize,
        selectConversation,
        sendMessage,
        sendAttachment,
        sendProductsInquiry,
        shareCouponVoucher,
        clearActiveProduct,
        deleteConversation,
        clearConversationMessages,
        clearAllConversations,
      }}
    >
      {children}
    </ScanmsChatContext.Provider>
  );
}

export function useScanmsChat() {
  const context = useContext(ScanmsChatContext);
  if (!context) {
    throw new Error('useScanmsChat must be used within a ScanmsChatProvider');
  }
  return context;
}

// Aliases for clean adoption
export const useFloatingChat = useScanmsChat;
