import { useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { randomUUID } from "expo-crypto";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { MessageSchema, type Message } from "../../types/contracts";
import { useOperation } from "../../hooks/useOperation";
import { useSuccessToast } from "../../components/SuccessToast";
import type { ScreenProps } from "../../navigation/router";
import { messages } from "../../services/scanms";
import { api } from "../../services/api";
import { useChat } from "../../services/realtime/ChatProvider";
import { mergeMessages } from "../../services/realtime/messages";
import { useAuth } from "../auth/AuthProvider";
import {
  Button,
  Caption,
  ErrorNotice,
  Loading,
} from "../../components/ui";
import { colors } from "../../theme/tokens";
import { Avatar, Icon } from "../../components/commerce";
import { AttachmentPicker, type Attachment } from "./AttachmentPicker";
interface Ack {
  ok: boolean;
  error?: string;
  messageId?: string;
}

export function ChatScreen({ route, navigation }: ScreenProps<"Chat">) {
  const { session } = useAuth(),
    { socket, ready, error: socketError } = useChat();
  const id = route.params.conversation.id;
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [original, setOriginal] = useState<Message | null>(null);
  const reactionOperation = useOperation();
  const originalOperation = useOperation();
  const [reply, setReply] = useState<Message | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTyping = useRef(0);
  const toast = useSuccessToast();
  const capabilities = useQuery({
    queryKey: [session!.user.id, "chat-capabilities"],
    queryFn: async () => await api.request("/chat/capabilities") as { messageReplies?: boolean; messageReactions?: boolean },
  });
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const [text, setText] = useState(""),
    [sending, setSending] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false),
    pending = useRef<{ id: string; text: string; mediaUrl?: string; replyToId?: string } | null>(
      null,
    ),
    mounted = useRef(true);
  const result = useInfiniteQuery({
    queryKey: [session!.user.id, "messages", id],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => messages(id, pageParam, signal),
    getNextPageParam: (page) => (page.length >= 30 ? page[0]?.id : undefined),
  });
  const rows = useMemo(
    () => mergeMessages(result.data?.pages || [], id).reverse(),
    [result.data, id],
  );
  const conversation = route.params.conversation;
  const shop = session!.user.role === "SHOP_MANAGER";
  const partnerName = shop ? conversation.customer?.fullName || conversation.collaborator?.fullName || "Đối tác" : conversation.store.name;
  const summary = (message: { messageText?: string | null; mediaName?: string | null }) =>
    message.messageText?.startsWith("{") ? "Thông tin hợp tác" : message.messageText || message.mediaName || "Tệp đính kèm";
  useEffect(() => {
    if (!socket || !ready) { setPartnerTyping(false); return; }
    let expiry: ReturnType<typeof setTimeout> | undefined;
    const typing = (payload: { conversationId: string; userId: string; isTyping: boolean }) => {
      if (payload.conversationId !== id || payload.userId === session!.user.id) return;
      setPartnerTyping(payload.isTyping);
      clearTimeout(expiry);
      if (payload.isTyping) expiry = setTimeout(() => setPartnerTyping(false), 7000);
    };
    const read = (payload: { conversationId: string; readerId: string }) => {
      if (payload.conversationId === id && payload.readerId !== session!.user.id) void result.refetch();
    };
    socket.on("user_typing", typing);
    socket.on("messages_read", read);
    const reactionsChanged = (payload: { conversationId: string }) => {
      if (payload.conversationId === id) void result.refetch();
    };
    socket.on("message_reaction_changed", reactionsChanged);
    return () => {
      clearTimeout(expiry);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      socket.off("user_typing", typing);
      socket.off("messages_read", read);
      socket.off("message_reaction_changed", reactionsChanged);
      socket.emit("typing", { conversationId: id, isTyping: false });
    };
  }, [socket, ready, id, session?.user.id]);
  useEffect(() => {
    if (ready && rows.some(message => message.senderId !== session!.user.id && message.isRead === false))
      void api.request(`/chat/conversations/${id}/read`, { method: "PATCH" }).catch(() => {});
  }, [rows, ready, id, session?.user.id]);
  const changeText = (value: string) => {
    setText(value);
    if (!socket || !ready) return;
    if (!value.trim() || Date.now() - lastTyping.current > 2000) {
      socket.emit("typing", { conversationId: id, isTyping: Boolean(value.trim()) });
      lastTyping.current = Date.now();
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket.emit("typing", { conversationId: id, isTyping: false }), 3000);
  };
  const beginReply = (message: Message) => {
    setReply(message);
    setSelectedMessage(null);
    setShowAttachments(false);
    setShowEmoji(false);
    inputRef.current?.focus();
  };
  const react = (message: Message, emoji: string) => void reactionOperation.run(async () => {
    const removing = message.reactions?.some(reaction => reaction.emoji === emoji && reaction.mine);
    await api.request(`/chat/conversations/${id}/messages/${message.id}/reaction`, {
      method: removing ? "DELETE" : "PATCH", ...(removing ? {} : { body: { emoji } }),
    });
    setSelectedMessage(null);
    await result.refetch();
  });
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!socket || !ready) return;
    socket.emit("join_conversation", { conversationId: id });
    const warning = (payload: { message?: string }) =>
      setError(payload.message || "Không thể tham gia hội thoại.");
    socket.on("chat_warning", warning);
    void api
      .request(`/chat/conversations/${id}/read`, { method: "PATCH" })
      .catch(() => {});
    return () => {
      socket.off("chat_warning", warning);
      if (socket.connected)
        socket.emit("leave_conversation", { conversationId: id });
    };
  }, [socket, ready, id]);
  const send = () => {
    if (lock.current || !socket || !ready || (!text.trim() && !attachment))
      return;
    if (text.trim().length > 4000) {
      setError("Tin nhắn tối đa 4.000 ký tự.");
      return;
    }
    lock.current = true;
    setSending(true);
    setError("");
    // Retrying the same uncertain draft reuses its UUID: the existing backend deduplicates it.
    if (
      !pending.current ||
      pending.current.text !== text.trim() ||
      pending.current.mediaUrl !== attachment?.url ||
      pending.current.replyToId !== reply?.id
    )
      pending.current = {
        id: randomUUID(),
        text: text.trim(),
        mediaUrl: attachment?.url,
        replyToId: reply?.id,
      };
    const draft = pending.current;
    socket.timeout(10000).emit(
      "send_message",
      {
        conversationId: id,
        messageText: draft.text,
        messageId: draft.id,
        ...(draft.replyToId ? { replyToId: draft.replyToId } : {}),
        ...(attachment
          ? {
              mediaUrl: attachment.url,
              mediaType: attachment.type,
              mediaName: attachment.fileName,
            }
          : {}),
      },
      (timeout: Error | null, ack?: Ack) => {
        lock.current = false;
        if (!mounted.current) return;
        setSending(false);
        if (timeout) {
          setError(
            "Chưa nhận xác nhận gửi. Làm mới để kiểm tra; gửi lại cùng nội dung sẽ dùng mã chống trùng.",
          );
          return;
        }
        if (!ack?.ok) {
          setError(ack?.error || "Chưa gửi được tin nhắn.");
          return;
        }
        pending.current = null;
        setText("");
        setAttachment(null);
        setReply(null);
        socket.emit("typing", { conversationId: id, isTyping: false });
        setShowAttachments(false);
        setShowEmoji(false);
        void result.refetch();
      },
    );
  };
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.canvas }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={headerHeight}
    >
      <View style={styles.partner}>
        <Avatar uri={shop ? undefined : conversation.store.logoUrl} name={partnerName} size={40} />
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Text style={styles.partnerName} numberOfLines={2}>{partnerName}</Text>
          <Text style={styles.connection}>{partnerTyping ? "Đối tác đang nhập…" : ready ? "Tin nhắn đã kết nối" : "Đang kết nối lại…"}</Text>
        </View>
        {!shop && <Pressable accessibilityRole="button" accessibilityLabel="Xem gian hàng" onPress={() => navigation.navigate("Business", { feature: "storefront", storeId: conversation.store.id })} style={styles.iconButton}>
          <Icon name="external-link" size={18} color={colors.strong} />
        </Pressable>}
      </View>
      <ErrorNotice
        error={error || reactionOperation.error || originalOperation.error || socketError || result.error}
        retry={() => {
          socket?.connect();
          void result.refetch();
        }}
      />
      {result.isLoading ? (
        <Loading />
      ) : (
        <FlatList
          inverted={rows.length > 0}
          data={rows}
          keyExtractor={(row) => row.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          onEndReached={() => {
            if (result.hasNextPage && !result.isFetchingNextPage)
              void result.fetchNextPage();
          }}
          onEndReachedThreshold={0.2}
          ListEmptyComponent={!result.error ? <View style={styles.empty}>
            <Icon name="message-circle" size={28} color={colors.strong} />
            <Text style={styles.emptyTitle}>Bắt đầu cuộc trò chuyện</Text>
            <Text style={styles.emptyText}>Trao đổi về hợp tác, hàng mẫu hoặc nội dung quảng bá với {partnerName}.</Text>
          </View> : undefined}
          ListFooterComponent={result.isFetchingNextPage ? <Loading /> : undefined}
          renderItem={({ item }) => {
            const own = item.senderId === session!.user.id,
              structured =
                item.messageText?.startsWith("{") &&
                item.messageText.includes("EXCLUSIVE_DEAL");
            return (
              <View style={{ maxWidth: "88%", alignSelf: own ? "flex-end" : "flex-start", gap: 3 }}><Pressable
                onLongPress={() => setSelectedMessage(item)}
                accessibilityHint="Nhấn giữ để sao chép hoặc trả lời"
                style={{
                  backgroundColor: own ? colors.soft : colors.white,
                  borderWidth: 1,
                  borderColor: colors.line,
                  borderRadius: 16,
                  padding: 12,
                  gap: 6,
                }}
              >
                <Caption>
                  {item.sender?.fullName || (own ? "Bạn" : "Đối tác")}
                </Caption>
                {item.replyTo && <Pressable accessibilityRole="button" accessibilityLabel="Xem tin nhắn gốc" disabled={originalOperation.busy} onPress={() => void originalOperation.run(async () => {
                  const value = await api.request(`/chat/conversations/${id}/messages/${item.replyTo!.id}`);
                  setOriginal(MessageSchema.parse(value));
                })} style={styles.quote}>
                  <Text style={styles.quoteName}>{item.replyTo.sender?.fullName || "Đối tác"}</Text>
                  <Text numberOfLines={2} style={styles.quoteText}>{summary(item.replyTo)}</Text>
                </Pressable>}
                {structured ? (
                  <>
                    <Text>Thông tin đề nghị thỏa thuận VIP</Text>
                    {session!.user.role !== "CUSTOMER" && (
                      <Button
                        title="Xem thỏa thuận và trạng thái"
                        secondary
                        onPress={() => navigation.navigate("Deals")}
                      />
                    )}
                  </>
                ) : (
                  <Text selectable style={{ fontSize: 14, lineHeight: 21, color: colors.ink }}>
                    {item.messageText}
                  </Text>
                )}
                {item.mediaUrl &&
                  (item.mediaType?.toUpperCase() === "IMAGE" ||
                  /\.(png|jpe?g|webp)(\?|$)/i.test(item.mediaUrl) ? (
                    <Pressable accessibilityRole="button" accessibilityLabel="Mở ảnh lớn" onPress={() => setPreview(item.mediaUrl!)}><Image
                      source={{ uri: item.mediaUrl }}
                      style={{ width: 190, maxWidth: "100%", height: 170, borderRadius: 10 }}
                      resizeMode="contain"
                    /></Pressable>
                  ) : (
                    <Button
                      title={item.mediaName || "Mở tệp đính kèm"}
                      secondary
                      onPress={() => {
                        if (!/^https:\/\//i.test(item.mediaUrl!)) {
                          setError("Tệp đính kèm phải dùng HTTPS.");
                          return;
                        }
                        void Linking.openURL(item.mediaUrl!).catch(() =>
                          setError("Không mở được tệp đính kèm."),
                        );
                      }}
                    />
                  ))}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Caption>
                  {new Date(item.createdAt).toLocaleTimeString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Caption><Pressable style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }} accessibilityRole="button" accessibilityLabel="Tùy chọn tin nhắn" onPress={() => setSelectedMessage(item)}><Icon name="more-horizontal" size={16} color={colors.muted} /></Pressable></View>
                {own && <Text style={styles.connection}>{item.isRead ? "Đã xem" : "Đã gửi"}</Text>}
              </Pressable>
              <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 4, justifyContent: own ? "flex-end" : "flex-start" }}>
                {capabilities.data?.messageReplies && <Pressable accessibilityRole="button" accessibilityLabel="Trả lời tin nhắn này" disabled={sending} onPress={() => beginReply(item)} style={styles.messageAction}><Icon name="corner-up-left" size={13} color={colors.muted} /><Text style={styles.actionText}>Trả lời</Text></Pressable>}
                {capabilities.data?.messageReactions && <Pressable accessibilityRole="button" accessibilityLabel="Thả cảm xúc" onPress={() => setSelectedMessage(item)} style={styles.messageAction}><Icon name="smile" size={14} color={colors.muted} /><Text style={styles.actionText}>Cảm xúc</Text></Pressable>}
              </View>
              {Boolean(item.reactions?.length) && <View style={{ flexDirection: "row", gap: 5, flexWrap: "wrap", justifyContent: own ? "flex-end" : "flex-start" }}>
                {item.reactions?.map(reaction => <Pressable key={reaction.emoji} accessibilityRole="button" accessibilityLabel={`${reaction.emoji}: ${reaction.count} cảm xúc${reaction.mine ? ", bấm để gỡ cảm xúc của bạn" : ""}`} disabled={reactionOperation.busy || !ready} onPress={() => react(item, reaction.emoji)} style={[styles.reactionPill, reaction.mine && { borderColor: colors.brand, backgroundColor: colors.soft }]}><Text style={{ fontSize: 14 }}>{reaction.emoji}</Text><Text style={styles.actionText}>{reaction.count}</Text></Pressable>)}
              </View>}
              </View>
            );
          }}
        />
      )}
      <View style={[styles.composer, { paddingBottom: Math.max(10, insets.bottom) }]}>
        {reply && <View style={[styles.quote, { flexDirection: "row", alignItems: "center" }]}>
          <View style={{ flex: 1 }}><Text style={styles.quoteName}>Trả lời {reply.sender?.fullName || "đối tác"}</Text><Text numberOfLines={1} style={styles.quoteText}>{summary(reply)}</Text></View>
          <Pressable accessibilityLabel="Hủy trả lời" accessibilityRole="button" onPress={() => setReply(null)} style={styles.iconButton}><Icon name="x" size={18} /></Pressable>
        </View>}
        {showAttachments && <AttachmentPicker
          conversationId={id}
          disabled={sending || !ready}
          onSelected={(value) => { setAttachment(value); setShowAttachments(false); }}
        />}
        {showEmoji && <View style={styles.emojiTray}>
          {['😀', '😊', '❤️', '👍', '🙏', '🎉', '😂', '😮', '😢', '✅', '🤝', '✨'].map(emoji => <Pressable key={emoji} accessibilityRole="button" accessibilityLabel={`Chèn ${emoji}`} disabled={sending || text.length + emoji.length > 4000} onPress={() => changeText(text + emoji)} style={styles.emojiButton}><Text style={{ fontSize: 23 }}>{emoji}</Text></Pressable>)}
        </View>}
        {attachment && (
          <View style={styles.attachment}>
            <Icon name={attachment.type === "IMAGE" ? "image" : "file-text"} size={18} color={colors.strong} />
            <Text numberOfLines={1} style={styles.attachmentName}>{attachment.fileName}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Bỏ tệp đính kèm" disabled={sending} onPress={() => setAttachment(null)} style={styles.iconButton}><Icon name="x" size={17} /></Pressable>
          </View>
        )}
        <View style={styles.composeRow}>
          <Pressable accessibilityRole="button" accessibilityLabel={showAttachments ? "Đóng đính kèm" : "Đính kèm ảnh, video hoặc tài liệu"} accessibilityState={{ expanded: showAttachments }} disabled={sending || !ready} onPress={() => { setShowAttachments(!showAttachments); setShowEmoji(false); }} style={styles.iconButton}>
            <Icon name={showAttachments ? "x" : "plus"} size={22} color={colors.strong} />
          </Pressable>
        <TextInput
          ref={inputRef}
          accessibilityLabel="Nội dung tin nhắn"
          value={text}
          onChangeText={changeText}
          maxLength={4000}
          editable={!sending}
          multiline
          placeholder="Nhắn tin với đối tác…"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Chọn biểu tượng cảm xúc" accessibilityState={{ expanded: showEmoji }} disabled={sending} onPress={() => { setShowEmoji(!showEmoji); setShowAttachments(false); }} style={styles.iconButton}><Icon name={showEmoji ? "chevron-down" : "smile"} size={21} color={colors.strong} /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={sending ? "Đang gửi tin nhắn" : "Gửi tin nhắn"} disabled={sending || !ready || (!text.trim() && !attachment)} onPress={send}
          style={[styles.send, { opacity: sending || !ready || (!text.trim() && !attachment) ? 0.4 : 1 }]}>
          <Icon name={sending ? "clock" : "send"} size={19} color={colors.ink} />
        </Pressable>
        </View>
      </View>
      <Modal transparent visible={Boolean(selectedMessage)} animationType="fade" onRequestClose={() => setSelectedMessage(null)}>
        <Pressable style={styles.overlay} onPress={() => setSelectedMessage(null)}>
          <Pressable style={styles.menu} onPress={() => {}}>
            <Text style={styles.partnerName}>Tin nhắn</Text>
            <Text numberOfLines={3} style={styles.quoteText}>{selectedMessage ? summary(selectedMessage) : ""}</Text>
            {capabilities.data?.messageReactions && <View style={styles.emojiTray}>
              {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => <Pressable key={emoji} accessibilityRole="button" accessibilityLabel={`Thả cảm xúc ${emoji}`} disabled={reactionOperation.busy || !ready || !selectedMessage} onPress={() => { if (selectedMessage) react(selectedMessage, emoji); }} style={[styles.emojiButton, selectedMessage?.reactions?.some(reaction => reaction.emoji === emoji && reaction.mine) && { backgroundColor: colors.soft, borderWidth: 1, borderColor: colors.brand }]}><Text style={{ fontSize: 24 }}>{emoji}</Text></Pressable>)}
            </View>}
            {reactionOperation.busy && <Caption>Đang lưu cảm xúc…</Caption>}
            <ErrorNotice error={reactionOperation.error} />
            {capabilities.data?.messageReplies && <Button title="Trả lời trích dẫn" secondary disabled={sending} onPress={() => { if (selectedMessage) beginReply(selectedMessage); }} />}
            {selectedMessage?.messageText && !selectedMessage.messageText.startsWith("{") && <Button title="Sao chép nội dung" secondary onPress={() => {
              const value = selectedMessage.messageText!;
              setSelectedMessage(null);
              void Clipboard.setStringAsync(value).then(copied => { if (copied) toast("Đã sao chép tin nhắn"); else setError("Không sao chép được tin nhắn."); }).catch(() => setError("Không sao chép được tin nhắn."));
            }} />}
            <Button title="Đóng" secondary onPress={() => setSelectedMessage(null)} />
          </Pressable>
        </Pressable>
      </Modal>
      <Modal transparent visible={Boolean(original)} animationType="fade" onRequestClose={() => setOriginal(null)}>
        <Pressable style={styles.overlay} onPress={() => setOriginal(null)}><Pressable style={styles.menu} onPress={() => {}}>
          <Text style={styles.partnerName}>Tin nhắn gốc</Text>
          <Caption>{original?.sender?.fullName || "Đối tác"}</Caption>
          <ScrollView style={{ maxHeight: 300 }}><Text selectable style={{ fontSize: 14, lineHeight: 21, color: colors.ink }}>{original ? summary(original) : ""}</Text></ScrollView>
          <Button title="Đóng" secondary onPress={() => setOriginal(null)} />
        </Pressable></Pressable>
      </Modal>
      <Modal visible={Boolean(preview)} animationType="fade" onRequestClose={() => setPreview(null)}>
        <View style={{ flex: 1, backgroundColor: colors.canvas, paddingTop: insets.top, paddingBottom: insets.bottom }}>
          <View style={{ alignItems: "flex-end" }}><Pressable style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Đóng ảnh" onPress={() => setPreview(null)}><Icon name="x" size={22} /></Pressable></View>
          {preview && <Image source={{ uri: preview }} resizeMode="contain" style={{ flex: 1, width: "100%" }} />}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  messageAction: { minHeight: 36, paddingHorizontal: 7, flexDirection: "row", alignItems: "center", gap: 5 },
  actionText: { fontSize: 11, lineHeight: 16, color: colors.muted },
  reactionPill: { minHeight: 34, paddingHorizontal: 9, flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 17, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  emojiTray: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 3, backgroundColor: colors.canvas, borderRadius: 12, padding: 4 },
  emojiButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(26,22,18,0.28)", padding: 16 },
  menu: { backgroundColor: colors.white, borderRadius: 20, padding: 18, gap: 12 },
  quote: { borderLeftWidth: 3, borderLeftColor: colors.brand, backgroundColor: colors.canvas, padding: 10, borderRadius: 8, gap: 4 },
  quoteName: { fontSize: 12, fontWeight: "600", color: colors.strong },
  quoteText: { fontSize: 12, lineHeight: 18, color: colors.muted },
  partner: { paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line },
  partnerName: { fontSize: 14, lineHeight: 20, fontWeight: "700", color: colors.ink },
  connection: { fontSize: 10, lineHeight: 15, color: colors.muted },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  empty: { alignItems: "center", gap: 10, paddingHorizontal: 24, paddingVertical: 40 },
  emptyTitle: { fontSize: 15, fontWeight: "600", color: colors.ink },
  emptyText: { textAlign: "center", fontSize: 12, lineHeight: 19, color: colors.muted },
  composer: { borderTopWidth: 1, borderColor: colors.line, backgroundColor: colors.white, paddingHorizontal: 10, paddingTop: 10, gap: 8 },
  composeRow: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  input: { flex: 1, minWidth: 0, minHeight: 44, maxHeight: 112, borderWidth: 1, borderColor: colors.line, borderRadius: 18, backgroundColor: colors.canvas, paddingHorizontal: 12, paddingVertical: 11, fontSize: 13, lineHeight: 20, color: colors.ink },
  send: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
  attachment: { flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 10, backgroundColor: colors.soft, borderRadius: 10 },
  attachmentName: { flex: 1, fontSize: 12, color: colors.ink },
});
