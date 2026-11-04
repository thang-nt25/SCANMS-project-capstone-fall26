import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Text,
  View,
} from "react-native";
import { randomUUID } from "expo-crypto";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { ScreenProps } from "../../navigation/router";
import { messages } from "../../services/scanms";
import { api } from "../../services/api";
import { useChat } from "../../services/realtime/ChatProvider";
import { mergeMessages } from "../../services/realtime/messages";
import { useAuth } from "../auth/AuthProvider";
import { Button, Caption, ErrorNotice, Loading } from "../../components/ui";
import { colors } from "../../theme/tokens";
import type { Attachment } from "./AttachmentPicker";
import { ChatComposer } from "./ChatComposer";
import { ChatHeader } from "./ChatHeader";
interface Ack {
  ok: boolean;
  error?: string;
  messageId?: string;
}

export function ChatScreen({ route, navigation }: ScreenProps<"Chat">) {
  const { session } = useAuth(),
    { socket, ready, error: socketError } = useChat();
  const id = route.params.conversation.id;
  const conversation = route.params.conversation;
  const partner =
    session!.user.role === "SHOP_MANAGER"
      ? conversation.customer || conversation.collaborator
      : null;
  const canOpenStore =
    session!.user.role === "CUSTOMER" || session!.user.role === "COLLABORATOR";
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const uploading = useRef(false);
  const [text, setText] = useState(""),
    [sending, setSending] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false),
    pending = useRef<{ id: string; text: string; mediaUrl?: string } | null>(
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
    if (
      lock.current ||
      uploading.current ||
      !socket ||
      !ready ||
      (!text.trim() && !attachment)
    )
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
      pending.current.mediaUrl !== attachment?.url
    )
      pending.current = {
        id: randomUUID(),
        text: text.trim(),
        mediaUrl: attachment?.url,
      };
    const draft = pending.current;
    socket.timeout(10000).emit(
      "send_message",
      {
        conversationId: id,
        messageText: draft.text,
        messageId: draft.id,
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
        void result.refetch();
      },
    );
  };
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.canvas }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ChatHeader
        name={partner?.fullName || conversation.store.name}
        avatarUri={
          partner?.fullName ? partner.avatarUrl : conversation.store.logoUrl
        }
        connected={ready}
        onOpenStore={
          canOpenStore
            ? () =>
                navigation.navigate("Business", {
                  feature: "storefront",
                  storeId: conversation.store.id,
                })
            : undefined
        }
      />
      <ErrorNotice
        error={error || socketError || result.error}
        retry={() => {
          socket?.connect();
          void result.refetch();
        }}
      />
      {result.isLoading ? (
        <Loading />
      ) : (
        <FlatList
          inverted
          data={rows}
          keyExtractor={(row) => row.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          onEndReached={() => {
            if (result.hasNextPage && !result.isFetchingNextPage)
              void result.fetchNextPage();
          }}
          onEndReachedThreshold={0.2}
          renderItem={({ item }) => {
            const own = item.senderId === session!.user.id,
              structured =
                item.messageText?.startsWith("{") &&
                item.messageText.includes("EXCLUSIVE_DEAL");
            return (
              <View
                style={{
                  maxWidth: "90%",
                  alignSelf: own ? "flex-end" : "flex-start",
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
                  <Text style={{ lineHeight: 22, color: colors.ink }}>
                    {item.messageText}
                  </Text>
                )}
                {item.mediaUrl &&
                  (item.mediaType?.toUpperCase() === "IMAGE" ||
                  /\.(png|jpe?g|webp)(\?|$)/i.test(item.mediaUrl) ? (
                    <Image
                      source={{ uri: item.mediaUrl }}
                      style={{ width: 200, height: 180, borderRadius: 10 }}
                      resizeMode="contain"
                    />
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
                <Caption>
                  {new Date(item.createdAt).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Caption>
              </View>
            );
          }}
        />
      )}
      <ChatComposer
        key={id}
        conversationId={id}
        text={text}
        setText={setText}
        attachment={attachment}
        setAttachment={setAttachment}
        sending={sending}
        ready={ready}
        send={send}
        onUploadBusyChange={(busy) => {
          uploading.current = busy;
        }}
      />
    </KeyboardAvoidingView>
  );
}
