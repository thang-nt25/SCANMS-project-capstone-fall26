import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState } from "react-native";
import { io, type Socket } from "socket.io-client";
import type { InfiniteData } from "@tanstack/react-query";
import { environment } from "../../config/environment";
import { useAuth } from "../../features/auth/AuthProvider";
import { tokenSession } from "../api";
import { queryClient } from "../query-client";
import { MessageSchema, type Message } from "../../types/contracts";
interface ChatSession {
  socket: Socket | null;
  ready: boolean;
  error: string;
}
const ChatContext = createContext<ChatSession>({
  socket: null,
  ready: false,
  error: "",
});
export function ChatProvider({ children }: PropsWithChildren) {
  const { session } = useAuth(),
    [state, setState] = useState<ChatSession>({
      socket: null,
      ready: false,
      error: "",
    });
  const id = session?.user.id,
    allowed = Boolean(session?.bootstrap.capabilities.includes("chat"));
  useEffect(() => {
    if (!id || !allowed) return;
    const token = tokenSession.get();
    let active = true;
    const socket = io(`${environment.socketUrl}/chat`, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      timeout: 10000,
    });
    setState({ socket, ready: false, error: "" });
    const valid = () => active && token === tokenSession.get();
    socket.on("connected", (payload: { userId?: string }) => {
      if (!valid() || payload.userId !== id) {
        socket.disconnect();
        return;
      }
      setState({ socket, ready: true, error: "" });
      void queryClient.invalidateQueries({ queryKey: [id, "conversations"] });
      void queryClient.invalidateQueries({
        queryKey: [id, "business", "notification-count"],
      });
      void queryClient.invalidateQueries({
        queryKey: [id, "business", "notifications"],
      });
      void queryClient.invalidateQueries({ queryKey: [id, "messages"] });
    });
    socket.on("disconnect", () => {
      if (active)
        setState({
          socket,
          ready: false,
          error: "Kết nối tin nhắn bị gián đoạn.",
        });
    });
    socket.on("connect_error", () => {
      if (active)
        setState({
          socket,
          ready: false,
          error: "Chưa kết nối được tin nhắn. Hãy kiểm tra mạng.",
        });
    });
    socket.on("new_message", (raw: unknown) => {
      const parsed = MessageSchema.safeParse(raw);
      if (!valid() || !parsed.success) return;
      const message = parsed.data;
      queryClient.setQueryData<InfiniteData<Message[]>>(
        [id, "messages", message.conversationId],
        (existing) => {
          if (!existing) return existing;
          const pages = existing.pages.map((page, index) =>
            index === 0
              ? [...page.filter((item) => item.id !== message.id), message]
              : page,
          );
          return { ...existing, pages };
        },
      );
      void queryClient.invalidateQueries({ queryKey: [id, "conversations"] });
      if (message.messageText?.includes("EXCLUSIVE_DEAL"))
        void queryClient.invalidateQueries({ queryKey: [id, "deals"] });
      void queryClient.invalidateQueries({
        queryKey: [id, "business", "notification-count"],
      });
      void queryClient.invalidateQueries({
        queryKey: [id, "business", "notifications"],
      });
    });
    const subscription = AppState.addEventListener("change", (value) => {
      if (value === "active" && valid()) {
        socket.connect();
        void queryClient.invalidateQueries({ queryKey: [id] });
      } else if (value === "background") socket.disconnect();
    });
    return () => {
      active = false;
      subscription.remove();
      socket.removeAllListeners();
      socket.disconnect();
      setState({ socket: null, ready: false, error: "" });
    };
  }, [id, allowed]);
  return <ChatContext.Provider value={state}>{children}</ChatContext.Provider>;
}
export const useChat = () => useContext(ChatContext);
