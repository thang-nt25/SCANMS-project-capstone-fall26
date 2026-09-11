import { useEffect, useRef, useState, useCallback } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { getChatSocket } from '../../services/chatSocket';
import api from '../../services/api';
import type { ChatMessage, Conversation } from '../../types/chat';
import './ChatBoxPage.css';

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
    api.get('/chat/conversations').then((res: any) => {
      setConversations(res.data || []);
    }).catch(console.error);
  }, []);

  // ---- Socket.io setup ----
  useEffect(() => {
    const socket = getChatSocket();

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socket.on('new_message', (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
      // Cập nhật last message trên danh sách
      setConversations(prev =>
        prev.map(c =>
          c.id === msg.conversationId
            ? {
                ...c,
                lastMessageAt: msg.createdAt,
                chatMessages: [{ messageText: msg.messageText, createdAt: msg.createdAt, senderId: msg.senderId, isRead: msg.isRead }],
              }
            : c
        ).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
      );
      setTimeout(() => scrollToBottom(true), 50);
    });

    socket.on('user_typing', ({ fullName, isTyping }: { fullName: string; isTyping: boolean }) => {
      setTypingUser(isTyping ? fullName : null);
      if (isTyping) {
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => setTypingUser(null), 3000);
      }
    });

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
      const res: any = await api.get(`/chat/conversations/${activeConvId}/messages?take=50&cursor=${oldestMsgId}`);
      const older: ChatMessage[] = res.data || [];
      setMessages(prev => [...older, ...prev]);
      setHasMore(older.length === 50);
      setOldestMsgId(older[0]?.id);

      // Giữ vị trí scroll
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

  const activeConv = conversations.find(c => c.id === activeConvId);
  const filteredConversations = conversations.filter(c =>
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
      ? (conv.store.logoUrl ? null : conv.store.name[0])
      : conv.collaborator.fullName[0];
  };

  return (
    <div className="chat-page" id="chat-page">
      {/* ====== Sidebar: Conversation List ====== */}
      <aside className="chat-sidebar" aria-label="Danh sách hội thoại">
        <div className="chat-sidebar-header">
          <div className="chat-sidebar-title">
            <span className="chat-title-icon">💬</span>
            <h1>Tin nhắn</h1>
          </div>
          <div className={`chat-status-dot ${isConnected ? 'online' : 'offline'}`}
            title={isConnected ? 'Đang kết nối' : 'Mất kết nối'} />
        </div>

        <div className="chat-search-wrapper">
          <span className="chat-search-icon">🔍</span>
          <input
            id="chat-search-input"
            type="text"
            className="chat-search-input"
            placeholder="Tìm kiếm hội thoại..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="chat-conv-list" role="list">
          {filteredConversations.length === 0 && (
            <div className="chat-empty-state">
              <span>🔕</span>
              <p>Chưa có hội thoại nào</p>
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
                className={`chat-conv-item ${isActive ? 'active' : ''} ${unread ? 'unread' : ''}`}
                role="listitem"
                onClick={() => openConversation(conv)}
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && openConversation(conv)}
              >
                <div className="chat-conv-avatar">
                  <span>{getOtherAvatar(conv)}</span>
                  <div className="chat-conv-avatar-ring" />
                </div>
                <div className="chat-conv-info">
                  <div className="chat-conv-name-row">
                    <span className="chat-conv-name">{getOtherParty(conv)}</span>
                    {lastMsg && (
                      <span className="chat-conv-time">{formatConvTime(lastMsg.createdAt)}</span>
                    )}
                  </div>
                  <div className="chat-conv-preview">
                    <span className={`chat-conv-preview-text ${unread ? 'bold' : ''}`}>
                      {lastMsg ? lastMsg.messageText : 'Bắt đầu cuộc trò chuyện...'}
                    </span>
                    {unread && <span className="chat-unread-badge" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ====== Main Chat Area ====== */}
      <main className="chat-main" aria-label="Khung chat">
        {!activeConv ? (
          <div className="chat-welcome">
            <div className="chat-welcome-icon">💬</div>
            <h2>Chọn một hội thoại</h2>
            <p>Chọn cuộc trò chuyện ở bên trái để bắt đầu nhắn tin</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <header className="chat-main-header">
              <div className="chat-main-header-info">
                <div className="chat-main-avatar">
                  <span>{getOtherAvatar(activeConv)}</span>
                </div>
                <div>
                  <div className="chat-main-name">{getOtherParty(activeConv)}</div>
                  <div className="chat-main-sub">
                    {typingUser ? (
                      <span className="chat-typing-indicator">
                        <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                        {typingUser} đang nhập...
                      </span>
                    ) : (
                      <span>{isConnected ? '🟢 Đang hoạt động' : '🔴 Ngoại tuyến'}</span>
                    )}
                  </div>
                </div>
              </div>
            </header>

            {/* Messages */}
            <div
              className="chat-messages-container"
              ref={messagesContainerRef}
              onScroll={e => {
                if ((e.target as HTMLElement).scrollTop < 60 && hasMore) {
                  loadMore();
                }
              }}
            >
              {hasMore && (
                <button className="chat-load-more-btn" onClick={loadMore}>
                  ↑ Tải thêm tin nhắn cũ hơn
                </button>
              )}

              {isLoadingMsgs && (
                <div className="chat-loading">
                  <div className="chat-loader" />
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
                  <div key={msg.id}>
                    {showDate && (
                      <div className="chat-date-separator">
                        <span>
                          {isToday(new Date(msg.createdAt))
                            ? 'Hôm nay'
                            : isYesterday(new Date(msg.createdAt))
                            ? 'Hôm qua'
                            : format(new Date(msg.createdAt), 'dd/MM/yyyy')}
                        </span>
                      </div>
                    )}
                    <div className={`chat-msg-wrapper ${isMine ? 'mine' : 'theirs'}`}>
                      {!isMine && (
                        <div className="chat-msg-avatar">
                          <span>{msg.sender.fullName[0]}</span>
                        </div>
                      )}
                      <div className="chat-msg-bubble-group">
                        {!isMine && (
                          <div className="chat-msg-sender">{msg.sender.fullName}</div>
                        )}
                        <div className={`chat-msg-bubble ${isMine ? 'mine' : 'theirs'}`}>
                          {msg.mediaUrl && (
                            <img
                              src={msg.mediaUrl}
                              alt="media"
                              className="chat-msg-media"
                              onClick={() => window.open(msg.mediaUrl, '_blank')}
                            />
                          )}
                          <p>{msg.messageText}</p>
                        </div>
                        <div className="chat-msg-meta">
                          <span className="chat-msg-time">{formatMsgTime(msg.createdAt)}</span>
                          {isMine && (
                            <span className="chat-msg-read">
                              {msg.isRead ? '✓✓' : '✓'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {typingUser && (
                <div className="chat-msg-wrapper theirs">
                  <div className="chat-msg-avatar">
                    <span>{typingUser[0]}</span>
                  </div>
                  <div className="chat-msg-bubble theirs typing-bubble">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="chat-input-area">
              <button
                className="chat-attach-btn"
                id="chat-attach-btn"
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
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) console.log('TODO: upload file', file.name);
                }}
              />
              <textarea
                id="chat-message-input"
                className="chat-input"
                placeholder="Nhập tin nhắn... (Enter để gửi, Shift+Enter xuống dòng)"
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button
                id="chat-send-btn"
                className={`chat-send-btn ${inputText.trim() ? 'active' : ''}`}
                onClick={sendMessage}
                disabled={!inputText.trim() || isSending}
                title="Gửi tin nhắn"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
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
