import { useEffect, useRef, useState, useCallback } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  MessageSquare,
  Plus,
  Search,
  X,
  Send,
  Paperclip,
  CheckCheck,
  Check,
  Sparkles,
  ArrowUp,
  Gift,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { getChatSocket } from '../../services/chatSocket';
import api from '../../services/api';
import type { ChatMessage, Conversation } from '../../types/chat';

function removeAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd');
}

const BAD_WORDS: string[] = [
  'dm', 'dcm', 'dkm', 'cmm', 'clm', 'vcl', 'vcc', 'vkl', 'vl', 'cl', 'cc', 'ccl', 'clgt', 'dmm', 'đmm', 'đcm', 'đm', 'đkm',
  'du me', 'du ma', 'du cha', 'du ba', 'du con me', 'dume', 'duma', 'du me may', 'du me m', 'du',
  'dit me', 'dit ma', 'dit ba', 'dit con me', 'dit cu', 'ditme', 'dit me may', 'dit me m', 'dit',
  'con me m', 'con me may', 'con me no', 'con me', 'me may', 'me m', 'bo may', 'bo m', 'to cha', 'to su', 'tien su', 'mat day', 'mat nap', 'chet me', 'chet tiet',
  'cac', 'cak', 'cack', 'buoi', 'loz', 'lz', 'lon me', 'lon ma', 'lon', 'dam tac', 'cu to',
  'cho de', 'cho chet', 'cho ngu', 'cho dien', 'oc cho', 'suc vat', 'do ngu', 'do cho', 'thang cho', 'con cho', 'thang khung', 'con khung', 'con di', 'di tho', 'cave', 'gai goi', 'gai bao', 'lam di',
  'fuck', 'fucking', 'fucker', 'fck', 'shit', 'bullshit', 'bitch', 'btch', 'asshole', 'bastard', 'dick', 'pussy', 'cunt', 'slut', 'whore', 'motherfucker'
];

function isProfaneText(text: string): boolean {
  if (!text) return false;
  const raw = text.toLowerCase();
  const unaccented = removeAccents(raw)
    .replace(/[@]/g, 'a')
    .replace(/[0]/g, 'o')
    .replace(/[1!|]/g, 'i')
    .replace(/[3]/g, 'e')
    .replace(/[$]/g, 's')
    .replace(/[7]/g, 't')
    .replace(/[._\-*~`+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  for (const bw of BAD_WORDS) {
    const escaped = bw.replace(/\s+/g, '\\s+');
    const regex = new RegExp('(^|\\s|[.,!?])' + escaped + '($|\\s|[.,!?])', 'i');
    if (regex.test(unaccented) || regex.test(raw)) {
      return true;
    }
  }
  return false;
}

// ============================================================
// Helper: detect & parse campaign invite card
// ============================================================
function tryParseCampaignCard(text: string) {
  try {
    const obj = JSON.parse(text);
    if (['CAMPAIGN_INVITE', 'CAMPAIGN_ACCEPTED', 'CAMPAIGN_REJECTED'].includes(obj.type)) return obj;
  } catch {
    /* not JSON */
  }
  return null;
}

// Campaign Invite Card UI
function CampaignCardBubble({
  card,
  isMine,
  participantId,
  onRespond,
}: {
  card: any;
  isMine: boolean;
  participantId?: string;
  onRespond?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleAccept = async () => {
    if (!participantId) return;
    setLoading(true);
    try {
      await api.patch(`/campaigns/invitations/${participantId}/accept`, {});
      setDone(true);
      onRespond?.();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!participantId) return;
    setLoading(true);
    try {
      await api.patch(`/campaigns/invitations/${participantId}/reject`, {});
      setDone(true);
      onRespond?.();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (card.type === 'CAMPAIGN_ACCEPTED') {
    return (
      <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold shadow-xs">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
        <span>
          Đã chấp nhận tham gia chiến dịch <strong>{card.campaignName}</strong>
        </span>
      </div>
    );
  }

  if (card.type === 'CAMPAIGN_REJECTED') {
    return (
      <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold shadow-xs">
        <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
        <span>
          Đã từ chối chiến dịch <strong>{card.campaignName}</strong>
        </span>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl shadow-sm text-stone-800 space-y-2.5 max-w-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white shadow-xs">
          <Sparkles className="w-3 h-3" /> Thẻ Mời VIP
        </span>
        <Gift className="w-4 h-4 text-amber-600" />
      </div>

      <div>
        <div className="font-bold text-stone-900 text-sm">🎯 {card.campaignName}</div>
        <div className="text-xs font-semibold text-amber-700 mt-0.5">
          +{card.bonusCommissionRate}% hoa hồng thưởng
        </div>
      </div>

      <div className="text-[11px] text-stone-500 bg-white/60 px-2.5 py-1.5 rounded-lg border border-amber-100">
        Thời hạn:{' '}
        {card.startDate ? new Date(card.startDate).toLocaleDateString('vi-VN') : ''} →{' '}
        {card.endDate ? new Date(card.endDate).toLocaleDateString('vi-VN') : ''}
      </div>

      {!isMine && !done && (
        <div className="flex items-center gap-2 pt-1">
          <button
            className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-50"
            disabled={loading}
            onClick={handleAccept}
          >
            {loading ? '⏳' : '✅ Chấp nhận'}
          </button>
          <button
            className="flex-1 py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-50"
            disabled={loading}
            onClick={handleReject}
          >
            {loading ? '⏳' : '❌ Từ chối'}
          </button>
        </div>
      )}

      {done && (
        <div className="text-center text-xs font-bold text-emerald-700 pt-1">
          Đã phản hồi ✓
        </div>
      )}
    </div>
  );
}

// ============================================================
// New Conversation Modal
// ============================================================
function NewConversationModal({
  onClose,
  onCreated,
  isShop,
}: {
  onClose: () => void;
  onCreated: (conv: Conversation) => void;
  isShop: boolean;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);

  const search = useCallback(
    async (q: string) => {
      setLoading(true);
      try {
        const endpoint = isShop
          ? `/chat/search-collaborators?q=${encodeURIComponent(q.trim())}`
          : `/chat/search-stores?q=${encodeURIComponent(q.trim())}`;
        const res: any = await api.get(endpoint);
        const list = Array.isArray(res) ? res : res?.data || [];
        setResults(list);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [isShop]
  );

  useEffect(() => {
    const t = setTimeout(() => search(query), 200);
    return () => clearTimeout(t);
  }, [query, search]);

  const startChat = async (item: any) => {
    const id = item.id;
    setCreating(id);
    try {
      const body = isShop ? { collaboratorId: id } : { storeId: id };
      const res: any = await api.post('/chat/conversations', body);
      const conv = res && res.id ? res : res?.data || res;
      if (conv && conv.id) {
        onCreated(conv);
      }
      onClose();
    } catch (err) {
      console.error('Error starting chat:', err);
    } finally {
      setCreating(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-md overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 bg-stone-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-stone-900 text-base">
              {isShop ? 'Bắt đầu chat với KOL / CTV' : 'Bắt đầu chat với Shop / Cửa hàng'}
            </h3>
          </div>
          <button
            className="w-8 h-8 rounded-full hover:bg-stone-200/80 text-stone-500 flex items-center justify-center transition-colors"
            onClick={onClose}
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-stone-100">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              id="new-chat-search"
              autoFocus
              placeholder={
                isShop
                  ? 'Tìm theo tên, email, sđt KOL...'
                  : 'Tìm theo tên shop, email chủ shop...'
              }
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-all"
            />
            {query && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
                onClick={() => setQuery('')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 divide-y divide-stone-50 min-h-[220px]">
          {loading && (
            <div className="py-12 text-center text-xs font-semibold text-stone-400 flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <span>Đang tìm kiếm...</span>
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="py-12 text-center text-stone-400 text-xs flex flex-col items-center gap-2">
              <Search className="w-8 h-8 text-stone-300 stroke-1" />
              <p>Không tìm thấy {isShop ? 'KOL / CTV nào' : 'Cửa hàng nào'}</p>
            </div>
          )}

          {!loading &&
            results.map((item: any) => (
              <div
                key={item.id}
                id={`new-chat-${item.id}`}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-amber-50/60 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0 pr-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-white font-bold text-sm flex items-center justify-center flex-shrink-0 shadow-xs">
                    {isShop
                      ? item.fullName?.[0]?.toUpperCase() || '?'
                      : item.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-stone-900 text-sm truncate">
                      {isShop ? item.fullName : item.name}
                    </div>
                    <div className="text-xs text-stone-500 truncate">
                      {isShop
                        ? item.email
                        : item.owner?.fullName
                        ? `Chủ: ${item.owner.fullName}`
                        : item.owner?.email || 'N/A'}
                    </div>
                  </div>
                </div>

                <button
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-all shadow-xs flex-shrink-0 disabled:opacity-50"
                  disabled={creating === item.id}
                  onClick={() => startChat(item)}
                >
                  {creating === item.id ? 'Đang mở...' : 'Nhắn tin'}
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Helper: format timestamp
// ============================================================
function formatMsgTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return `Hôm qua ${format(d, 'HH:mm')}`;
  return format(d, 'dd/MM HH:mm', { locale: vi });
}

function formatConvTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Hôm qua';
  return format(d, 'dd/MM/yy', { locale: vi });
}

// ============================================================
// Main ChatBoxPage Component (Pure Tailwind CSS)
// ============================================================
export default function ChatBoxPage() {
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  })();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [isLoadingMsgs, setIsLoadingMsgs] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [oldestMsgId, setOldestMsgId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const isShop = currentUser?.role === 'SHOP_MANAGER';

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback((smooth = false) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  // ---- Load conversations ----
  useEffect(() => {
    api
      .get('/chat/conversations')
      .then((res: any) => {
        const list: Conversation[] = Array.isArray(res) ? res : res?.data || [];
        setConversations(list);
        if (list.length > 0 && !activeConvId) {
          openConversation(list[0]);
        }
      })
      .catch(console.error);
  }, []);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showErrorToast = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 4000);
  };

  // ---- Socket.io setup ----
  useEffect(() => {
    const socket = getChatSocket();
    setIsConnected(socket.connected);

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socket.on('new_message', (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
      setConversations(prev =>
        prev
          .map(c =>
            c.id === msg.conversationId
              ? {
                  ...c,
                  lastMessageAt: msg.createdAt,
                  chatMessages: [
                    {
                      messageText: msg.messageText,
                      createdAt: msg.createdAt,
                      senderId: msg.senderId,
                      isRead: msg.isRead,
                    },
                  ],
                }
              : c
          )
          .sort(
            (a, b) =>
              new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
          )
      );
      setTimeout(() => scrollToBottom(true), 50);
    });

    socket.on(
      'user_typing',
      ({ fullName, isTyping }: { fullName: string; isTyping: boolean }) => {
        setTypingUser(isTyping ? fullName : null);
        if (isTyping) {
          if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
          typingTimerRef.current = setTimeout(() => setTypingUser(null), 3000);
        }
      }
    );

    socket.on('error', (err: { message: string }) => {
      console.error('Socket error:', err.message);
      showErrorToast(err.message || 'Lỗi gửi tin nhắn');
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('new_message');
      socket.off('user_typing');
      socket.off('error');
    };
  }, [scrollToBottom]);

  // ---- Open conversation ----
  const openConversation = async (conv: Conversation) => {
    if (!conv || !conv.id) return;
    const socket = getChatSocket();

    if (activeConvId) socket.emit('leave_conversation', { conversationId: activeConvId });

    setActiveConvId(conv.id);
    setMessages([]);
    setHasMore(false);
    setOldestMsgId(undefined);
    setIsLoadingMsgs(true);

    try {
      const res: any = await api.get(`/chat/conversations/${conv.id}/messages?take=50`);
      const msgs: ChatMessage[] = Array.isArray(res) ? res : res?.data || [];
      setMessages(msgs);
      setHasMore(msgs.length === 50);
      setOldestMsgId(msgs[0]?.id);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingMsgs(false);
      setTimeout(() => scrollToBottom(), 50);
    }

    socket.emit('join_conversation', { conversationId: conv.id });
  };

  // ---- Load more (scroll to top) ----
  const loadMore = async () => {
    if (!activeConvId || !oldestMsgId || !hasMore) return;
    const container = messagesContainerRef.current;
    const prevScrollHeight = container?.scrollHeight || 0;

    try {
      const res: any = await api.get(
        `/chat/conversations/${activeConvId}/messages?take=50&cursor=${oldestMsgId}`
      );
      const older: ChatMessage[] = Array.isArray(res) ? res : res?.data || [];
      setMessages(prev => [...older, ...prev]);
      setHasMore(older.length === 50);
      setOldestMsgId(older[0]?.id);

      setTimeout(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - prevScrollHeight;
        }
      }, 0);
    } catch (err) {
      console.error(err);
    }
  };

  // ---- Send message ----
  const sendMessage = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed || !activeConvId || isSending) return;

    // Kiểm tra từ ngữ thô tục / cấm kỵ ngay tại Client
    if (isProfaneText(trimmed)) {
      showErrorToast(
        '⚠️ Tin nhắn chứa từ ngữ không phù hợp hoặc vi phạm chuẩn mực. Vui lòng giao tiếp văn minh lịch sự!'
      );
      return;
    }

    const socket = getChatSocket();
    setIsSending(true);
    socket.emit('send_message', {
      conversationId: activeConvId,
      messageText: trimmed,
    });
    setInputText('');
    setIsSending(false);

    socket.emit('typing', { conversationId: activeConvId, isTyping: false });
  }, [inputText, activeConvId, isSending]);

  // ---- Typing indicator ----
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (!activeConvId) return;
    const socket = getChatSocket();
    socket.emit('typing', { conversationId: activeConvId, isTyping: true });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket.emit('typing', { conversationId: activeConvId, isTyping: false });
    }, 2000);
  };

  // ---- Key handler ----
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const activeConv = conversations.find(c => c.id === activeConvId);
  const filteredConversations = conversations.filter(
    c =>
      (c.store?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.collaborator?.fullName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getOtherParty = (conv: Conversation) => {
    if (!currentUser) return conv.store?.name || 'Cửa hàng';
    return currentUser.role === 'COLLABORATOR'
      ? conv.store?.name || 'Cửa hàng'
      : conv.collaborator?.fullName || 'KOL / CTV';
  };

  const getOtherAvatar = (conv: Conversation) => {
    if (!currentUser) return conv.store?.name?.[0]?.toUpperCase() || '💬';
    return currentUser.role === 'COLLABORATOR'
      ? conv.store?.name?.[0]?.toUpperCase() || 'S'
      : conv.collaborator?.fullName?.[0]?.toUpperCase() || 'K';
  };

  return (
    <div
      className="flex h-[calc(100vh-5.5rem)] bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden"
      id="chat-page"
    >
      {/* ====== Sidebar: Conversation List ====== */}
      <aside
        className="w-80 flex-shrink-0 flex flex-col border-r border-stone-200/80 bg-stone-50/40"
        aria-label="Danh sách hội thoại"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-stone-200/60 bg-white/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <h1 className="text-base font-bold text-stone-900">Tin nhắn</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="btn-new-conversation"
              className="w-8 h-8 rounded-lg bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center transition-colors shadow-xs"
              title="Tạo cuộc trò chuyện mới"
              onClick={() => setShowNewChat(true)}
            >
              <Plus className="w-4 h-4" />
            </button>
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? 'bg-emerald-500 shadow-xs ring-2 ring-emerald-200' : 'bg-rose-500'
              }`}
              title={isConnected ? 'Đang kết nối Realtime' : 'Mất kết nối'}
            />
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-stone-200/60">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              id="chat-search-input"
              type="text"
              className="w-full pl-9 pr-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
              placeholder="Tìm kiếm hội thoại..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-stone-100" role="list">
          {filteredConversations.length === 0 && (
            <div className="py-16 text-center text-stone-400 text-xs space-y-2">
              <MessageSquare className="w-8 h-8 mx-auto text-stone-300 stroke-1" />
              <p>Chưa có cuộc trò chuyện nào</p>
              <button
                className="text-amber-600 hover:underline font-bold"
                onClick={() => setShowNewChat(true)}
              >
                + Bắt đầu chat ngay
              </button>
            </div>
          )}

          {filteredConversations.map(conv => {
            const lastMsg = conv.chatMessages?.[0];
            const isActive = conv.id === activeConvId;
            const unread = lastMsg && !lastMsg.isRead && lastMsg.senderId !== currentUser?.id;

            return (
              <div
                key={conv.id}
                id={`conv-item-${conv.id}`}
                className={`flex items-center gap-3 p-3.5 cursor-pointer transition-all ${
                  isActive
                    ? 'bg-amber-50/90 border-l-4 border-amber-600 text-stone-900'
                    : 'hover:bg-stone-100/70 text-stone-700'
                }`}
                role="listitem"
                onClick={() => openConversation(conv)}
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && openConversation(conv)}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-white font-bold text-sm flex items-center justify-center flex-shrink-0 shadow-xs">
                  {getOtherAvatar(conv)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="font-bold text-stone-900 text-sm truncate">
                      {getOtherParty(conv)}
                    </span>
                    {lastMsg && (
                      <span className="text-[10px] text-stone-400 flex-shrink-0">
                        {formatConvTime(lastMsg.createdAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-xs truncate ${
                        unread ? 'font-bold text-stone-900' : 'text-stone-500'
                      }`}
                    >
                      {lastMsg ? lastMsg.messageText : 'Bắt đầu cuộc trò chuyện...'}
                    </span>
                    {unread && (
                      <span className="w-2 h-2 rounded-full bg-amber-600 flex-shrink-0" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ====== Main Chat Area ====== */}
      <main className="flex-1 flex flex-col bg-stone-50/30 relative min-w-0" aria-label="Khung chat">
        {!activeConv ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-amber-100/80 text-amber-700 flex items-center justify-center shadow-xs">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-stone-800">Chọn một hội thoại</h2>
            <p className="text-xs text-stone-500 max-w-sm">
              Chọn cuộc trò chuyện ở cột bên trái hoặc bấm dấu <strong>+</strong> để bắt đầu trao đổi trực tiếp
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <header className="px-6 py-3.5 bg-white border-b border-stone-200/80 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                  {getOtherAvatar(activeConv)}
                </div>
                <div>
                  <div className="font-bold text-stone-900 text-sm">{getOtherParty(activeConv)}</div>
                  <div className="text-xs text-stone-500 flex items-center gap-1.5">
                    {typingUser ? (
                      <span className="text-amber-600 font-medium flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-600 animate-bounce" />
                        {typingUser} đang nhập...
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isConnected ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        {isConnected ? 'Đang hoạt động' : 'Ngoại tuyến'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </header>

            {/* Messages Container */}
            <div
              className="flex-1 overflow-y-auto p-6 space-y-4"
              ref={messagesContainerRef}
              onScroll={e => {
                if ((e.target as HTMLElement).scrollTop < 60 && hasMore) {
                  loadMore();
                }
              }}
            >
              {hasMore && (
                <div className="text-center">
                  <button
                    className="inline-flex items-center gap-1 px-3 py-1 bg-stone-200/70 hover:bg-stone-300 text-stone-700 text-xs font-semibold rounded-full transition-colors"
                    onClick={loadMore}
                  >
                    <ArrowUp className="w-3 h-3" /> Tải thêm tin nhắn cũ hơn
                  </button>
                </div>
              )}

              {isLoadingMsgs && (
                <div className="py-12 text-center text-stone-400 text-xs flex flex-col items-center gap-2">
                  <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  <span>Đang tải tin nhắn...</span>
                </div>
              )}

              {messages.map((msg, idx) => {
                const isMine = msg.senderId === currentUser?.id;
                const showDate =
                  idx === 0 ||
                  new Date(messages[idx - 1].createdAt).toDateString() !==
                    new Date(msg.createdAt).toDateString();

                return (
                  <div key={msg.id} className="space-y-2">
                    {showDate && (
                      <div className="flex items-center justify-center my-3">
                        <span className="bg-stone-200/80 text-stone-600 text-[11px] font-semibold px-3 py-0.5 rounded-full shadow-2xs">
                          {isToday(new Date(msg.createdAt))
                            ? 'Hôm nay'
                            : isYesterday(new Date(msg.createdAt))
                            ? 'Hôm qua'
                            : format(new Date(msg.createdAt), 'dd/MM/yyyy', { locale: vi })}
                        </span>
                      </div>
                    )}

                    <div className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                      {!isMine && (
                        <div className="w-7 h-7 rounded-full bg-stone-200 text-stone-700 font-bold text-xs flex items-center justify-center flex-shrink-0 mb-1">
                          {msg.sender.fullName?.[0]?.toUpperCase() || 'U'}
                        </div>
                      )}

                      <div className={`max-w-[72%] space-y-1 ${isMine ? 'items-end' : 'items-start'}`}>
                        {!isMine && (
                          <div className="text-[11px] text-stone-500 font-medium pl-1">
                            {msg.sender.fullName}
                          </div>
                        )}

                        {(() => {
                          const card = tryParseCampaignCard(msg.messageText);
                          if (card) {
                            return <CampaignCardBubble card={card} isMine={isMine} />;
                          }

                          return (
                            <div
                              className={`p-3.5 text-sm shadow-xs ${
                                isMine
                                  ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white rounded-2xl rounded-tr-xs'
                                  : 'bg-white text-stone-900 border border-stone-200/80 rounded-2xl rounded-tl-xs'
                              }`}
                            >
                              {msg.mediaUrl && (
                                <img
                                  src={msg.mediaUrl}
                                  alt="media"
                                  className="max-w-xs rounded-lg mb-2 cursor-pointer hover:opacity-95"
                                  onClick={() => window.open(msg.mediaUrl, '_blank')}
                                />
                              )}
                              <p className="whitespace-pre-wrap break-words">{msg.messageText}</p>
                            </div>
                          );
                        })()}

                        <div
                          className={`flex items-center gap-1 text-[10px] text-stone-400 px-1 ${
                            isMine ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <span>{formatMsgTime(msg.createdAt)}</span>
                          {isMine && (
                            <span>
                              {msg.isRead ? (
                                <CheckCheck className="w-3 h-3 text-amber-600 inline" />
                              ) : (
                                <Check className="w-3 h-3 inline" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {typingUser && (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-stone-200 text-stone-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                    {typingUser[0]?.toUpperCase()}
                  </div>
                  <div className="px-3.5 py-2 bg-white border border-stone-200 rounded-2xl rounded-tl-xs shadow-xs flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-stone-200 flex items-center gap-3 shadow-xs">
              <button
                className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
                id="chat-attach-btn"
                title="Đính kèm ảnh"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                id="chat-file-input"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) console.log('File:', file.name);
                }}
              />
              <textarea
                id="chat-message-input"
                className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white resize-none max-h-24 transition-all"
                placeholder="Nhập tin nhắn... (Enter để gửi, Shift+Enter xuống dòng)"
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button
                id="chat-send-btn"
                className={`p-2.5 rounded-xl transition-all flex items-center justify-center ${
                  inputText.trim() && !isSending
                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-300 cursor-not-allowed'
                }`}
                onClick={sendMessage}
                disabled={!inputText.trim() || isSending}
                title="Gửi tin nhắn"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </main>

      {/* Toast Error Notification */}
      {errorMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-rose-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <AlertTriangle className="w-5 h-5 text-rose-200 flex-shrink-0" />
          <p className="text-xs font-semibold flex-1 leading-snug">{errorMessage}</p>
          <button
            className="text-rose-200 hover:text-white p-1"
            onClick={() => setErrorMessage(null)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* New Conversation Modal */}
      {showNewChat && (
        <NewConversationModal
          isShop={isShop}
          onClose={() => setShowNewChat(false)}
          onCreated={conv => {
            if (!conv || !conv.id) return;
            setConversations(prev => {
              const exists = prev.find(c => c.id === conv.id);
              if (exists) {
                setTimeout(() => openConversation(exists), 50);
                return prev;
              }
              const updated = [conv, ...prev];
              setTimeout(() => openConversation(conv), 50);
              return updated;
            });
          }}
        />
      )}
    </div>
  );
}
