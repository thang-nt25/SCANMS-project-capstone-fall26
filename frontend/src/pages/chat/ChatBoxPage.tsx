import { useEffect, useRef, useState, useCallback } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { getChatSocket } from '../../services/chatSocket';
import api from '../../services/api';
import type { ChatMessage, Conversation } from '../../types/chat';

// ============================================================
// Helper: format timestamp
// ============================================================
function formatMsgTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return `Hôm qua ${format(d, 'HH:mm')}`;
  return format(d, 'dd/MM HH:mm');
}

function formatConvTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Hôm qua';
  return format(d, 'dd/MM/yy');
}

// ============================================================
// ChatBoxPage Component
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
        setConversations(res.data || []);
      })
      .catch(console.error);
  }, []);

  // ---- Socket.io setup ----
  useEffect(() => {
    const socket = getChatSocket();

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socket.on('new_message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
      // Cập nhật last message trên danh sách
      setConversations((prev) =>
        prev
          .map((c) =>
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
    const socket = getChatSocket();

    // Leave previous
    if (activeConvId) socket.emit('leave_conversation', { conversationId: activeConvId });

    setActiveConvId(conv.id);
    setMessages([]);
    setHasMore(false);
    setOldestMsgId(undefined);
    setIsLoadingMsgs(true);

    try {
      const res: any = await api.get(`/chat/conversations/${conv.id}/messages?take=50`);
      const msgs: ChatMessage[] = res.data || [];
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
      const older: ChatMessage[] = res.data || [];
      setMessages((prev) => [...older, ...prev]);
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
    if (!inputText.trim() || !activeConvId || isSending) return;
    const socket = getChatSocket();
    setIsSending(true);
    socket.emit('send_message', {
      conversationId: activeConvId,
      messageText: inputText.trim(),
    });
    setInputText('');
    setIsSending(false);

    // Stop typing
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

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const filteredConversations = conversations.filter(
    (c) =>
      c.store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.collaborator.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getOtherParty = (conv: Conversation) => {
    if (!currentUser) return conv.store.name;
    return currentUser.role === 'COLLABORATOR'
      ? conv.store.name
      : conv.collaborator.fullName;
  };

  const getOtherAvatar = (conv: Conversation) => {
    if (!currentUser) return conv.store.name[0];
    return currentUser.role === 'COLLABORATOR'
      ? conv.store.logoUrl
        ? null
        : conv.store.name[0]
      : conv.collaborator.fullName[0];
  };

  return (
    <div
      className="h-[calc(100vh-4rem)] flex bg-[#FAF8F5] text-[#1A1612] border-t border-[#EAE4D7] overflow-hidden"
      id="chat-page"
    >
      {/* ====== Sidebar: Conversation List ====== */}
      <aside
        className="w-80 md:w-96 border-r border-[#EAE4D7] bg-[#F3EFE6] flex flex-col flex-shrink-0"
        aria-label="Danh sách hội thoại"
      >
        <div className="p-4 border-b border-[#EAE4D7] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <span className="text-xl">💬</span>
            <h1 className="text-base font-extrabold text-[#1A1612]">Hộp Thư Tin Nhắn</h1>
          </div>
          <div
            className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-[#059669]' : 'bg-[#DC2626]'}`}
            title={isConnected ? 'Đang kết nối realtime' : 'Mất kết nối'}
          />
        </div>

        <div className="p-3 border-b border-[#EAE4D7] bg-[#FAF8F5]">
          <div className="flex items-center gap-2 bg-white border border-[#EAE4D7] rounded-xl px-3 py-2 text-xs text-[#1A1612] focus-within:border-[#B88E4F]">
            <span className="text-sm text-[#7D715E]">🔍</span>
            <input
              id="chat-search-input"
              type="text"
              className="bg-transparent border-none outline-none w-full text-xs text-[#1A1612] placeholder-[#7D715E]"
              placeholder="Tìm kiếm hội thoại..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1" role="list">
          {filteredConversations.length === 0 && (
            <div className="text-center py-16 text-[#7D715E]">
              <span className="text-3xl block mb-2">📭</span>
              <p className="text-xs font-semibold">Chưa có hội thoại nào</p>
            </div>
          )}
          {filteredConversations.map((conv) => {
            const lastMsg = conv.chatMessages?.[0];
            const isActive = conv.id === activeConvId;
            const unread = lastMsg && !lastMsg.isRead && lastMsg.senderId !== currentUser?.id;

            return (
              <div
                key={conv.id}
                id={`conv-item-${conv.id}`}
                className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition cursor-pointer ${
                  isActive
                    ? 'bg-white border border-[#EEDFC6] shadow-xs'
                    : 'hover:bg-white/60'
                }`}
                role="listitem"
                onClick={() => openConversation(conv)}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && openConversation(conv)}
              >
                <div className="w-10 h-10 rounded-full bg-[#EEDFC6] text-[#B88E4F] font-black flex items-center justify-center text-sm flex-shrink-0">
                  <span>{getOtherAvatar(conv)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-xs font-bold text-[#1A1612] truncate">
                      {getOtherParty(conv)}
                    </span>
                    {lastMsg && (
                      <span className="text-[10px] text-[#7D715E] flex-shrink-0">
                        {formatConvTime(lastMsg.createdAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs truncate ${
                        unread ? 'font-bold text-[#1A1612]' : 'text-[#7D715E]'
                      }`}
                    >
                      {lastMsg ? lastMsg.messageText : 'Bắt đầu cuộc trò chuyện...'}
                    </span>
                    {unread && (
                      <span className="w-2 h-2 rounded-full bg-[#B88E4F] flex-shrink-0" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ====== Main Chat Area ====== */}
      <main className="flex-1 flex flex-col bg-[#FAF8F5] overflow-hidden min-w-0" aria-label="Khung chat">
        {!activeConv ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-[#7D715E]">
            <div className="w-16 h-16 rounded-full bg-[#F3EFE6] flex items-center justify-center text-3xl mb-3">
              💬
            </div>
            <h2 className="text-lg font-bold text-[#1A1612]">Chọn một hội thoại</h2>
            <p className="text-xs text-[#7D715E] mt-1 max-w-sm">
              Chọn cuộc trò chuyện ở cột bên trái để trao đổi thông tin chiến dịch, gửi yêu cầu mẫu hoặc hỗ trợ kỹ thuật
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <header className="px-5 py-3.5 bg-white border-b border-[#EAE4D7] flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#EEDFC6] text-[#B88E4F] font-black flex items-center justify-center text-sm">
                  <span>{getOtherAvatar(activeConv)}</span>
                </div>
                <div>
                  <div className="text-sm font-extrabold text-[#1A1612]">
                    {getOtherParty(activeConv)}
                  </div>
                  <div className="text-xs text-[#7D715E] mt-0.5">
                    {typingUser ? (
                      <span className="text-[#B88E4F] font-semibold animate-pulse">
                        {typingUser} đang soạn tin...
                      </span>
                    ) : (
                      <span>{isConnected ? '🟢 Đang trực tuyến' : '🔴 Ngoại tuyến'}</span>
                    )}
                  </div>
                </div>
              </div>
            </header>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3"
              ref={messagesContainerRef}
              onScroll={(e) => {
                if ((e.target as HTMLElement).scrollTop < 60 && hasMore) {
                  loadMore();
                }
              }}
            >
              {hasMore && (
                <div className="text-center py-2">
                  <button
                    className="px-3 py-1.5 rounded-full bg-white border border-[#EAE4D7] text-xs font-bold text-[#7D715E] hover:text-[#1A1612] transition shadow-xs cursor-pointer"
                    onClick={loadMore}
                  >
                    ↑ Tải thêm tin nhắn cũ hơn
                  </button>
                </div>
              )}

              {isLoadingMsgs && (
                <div className="flex items-center justify-center gap-2 py-4 text-xs font-semibold text-[#7D715E]">
                  <div className="w-4 h-4 border-2 border-[#C59B58]/20 border-t-[#C59B58] rounded-full animate-spin" />
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
                        <span className="px-3 py-1 rounded-full bg-[#F3EFE6] border border-[#EAE4D7] text-[11px] font-bold text-[#7D715E]">
                          {isToday(new Date(msg.createdAt))
                            ? 'Hôm nay'
                            : isYesterday(new Date(msg.createdAt))
                            ? 'Hôm qua'
                            : format(new Date(msg.createdAt), 'dd/MM/yyyy')}
                        </span>
                      </div>
                    )}
                    <div className={`flex items-end gap-2.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                      {!isMine && (
                        <div className="w-7 h-7 rounded-full bg-[#EEDFC6] text-[#B88E4F] font-bold flex items-center justify-center text-xs flex-shrink-0">
                          <span>{msg.sender?.fullName?.[0] || '?'}</span>
                        </div>
                      )}
                      <div className={`flex flex-col max-w-sm sm:max-w-md ${isMine ? 'items-end' : 'items-start'}`}>
                        {!isMine && (
                          <div className="text-[11px] font-bold text-[#7D715E] mb-1 px-1">
                            {msg.sender?.fullName}
                          </div>
                        )}
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-xs sm:text-sm shadow-xs ${
                            isMine
                              ? 'bg-[#C59B58] text-white rounded-br-xs'
                              : 'bg-white border border-[#EAE4D7] text-[#1A1612] rounded-bl-xs'
                          }`}
                        >
                          {msg.mediaUrl && (
                            <img
                              src={msg.mediaUrl}
                              alt="media"
                              className="rounded-lg mb-2 max-w-full cursor-pointer hover:opacity-90 transition"
                              onClick={() => window.open(msg.mediaUrl, '_blank')}
                            />
                          )}
                          <p className="whitespace-pre-wrap break-words">{msg.messageText}</p>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-[#7D715E] mt-1 px-1">
                          <span>{formatMsgTime(msg.createdAt)}</span>
                          {isMine && <span>{msg.isRead ? '✓✓' : '✓'}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {typingUser && (
                <div className="flex items-end gap-2.5 justify-start">
                  <div className="w-7 h-7 rounded-full bg-[#EEDFC6] text-[#B88E4F] font-bold flex items-center justify-center text-xs flex-shrink-0">
                    <span>{typingUser[0]}</span>
                  </div>
                  <div className="bg-white border border-[#EAE4D7] rounded-2xl rounded-bl-xs px-4 py-2.5 shadow-xs flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7D715E] animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7D715E] animate-bounce delay-150" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7D715E] animate-bounce delay-300" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 sm:p-4 bg-white border-t border-[#EAE4D7] flex items-center gap-2">
              <button
                className="p-2.5 text-[#7D715E] hover:text-[#1A1612] hover:bg-[#F3EFE6] rounded-xl transition cursor-pointer text-lg"
                id="chat-attach-btn"
                type="button"
                title="Đính kèm ảnh"
                onClick={() => fileInputRef.current?.click()}
              >
                📎
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                id="chat-file-input"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) console.log('TODO: upload file', file.name);
                }}
              />
              <textarea
                id="chat-message-input"
                className="flex-1 bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-[#1A1612] outline-none focus:border-[#B88E4F] resize-none max-h-24"
                placeholder="Nhập tin nhắn... (Enter để gửi, Shift+Enter xuống dòng)"
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button
                id="chat-send-btn"
                type="button"
                className="p-3 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white transition disabled:opacity-40 cursor-pointer shadow-xs"
                onClick={sendMessage}
                disabled={!inputText.trim() || isSending}
                title="Gửi tin nhắn"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
