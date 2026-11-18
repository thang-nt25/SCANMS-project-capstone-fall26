import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useMobileNavigation } from "../../navigation/router";
import { useQuery } from "@tanstack/react-query";
import { conversations } from "../../services/scanms";
import { Empty, ErrorNotice, Loading, Screen } from "../../components/ui";
import { Avatar, Icon } from "../../components/commerce";
import { colors } from "../../theme/tokens";
import { useAuth } from "../auth/AuthProvider";
import { useChat } from "../../services/realtime/ChatProvider";
import type { Conversation } from "../../types/contracts";

function preview(item: Conversation, userId: string) {
  const last = item.chatMessages?.[0];
  if (!last) return "Chưa có tin nhắn · Bắt đầu trao đổi";
  const text = last.messageText?.trim();
  const content = text?.startsWith("{") ? "Thông tin hợp tác" : text ||
    (last.mediaType?.toUpperCase() === "IMAGE" ? "Đã gửi ảnh" : last.mediaType?.toUpperCase() === "VIDEO" ? "Đã gửi video" : last.mediaType ? "Đã gửi tài liệu" : "Tin nhắn mới");
  return `${last.senderId === userId ? "Bạn: " : ""}${content}`;
}
function timeLabel(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleDateString("vi-VN") === new Date().toLocaleDateString("vi-VN")
    ? date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}
export function ConversationsScreen() {
  const { session } = useAuth(), chat = useChat(), navigation = useMobileNavigation();
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const shop = session!.user.role === "SHOP_MANAGER";
  const name = (item: Conversation) => shop ? item.customer?.fullName || item.collaborator?.fullName || "Khách hàng" : item.store.name;
  const result = useQuery({
    queryKey: [session!.user.id, "conversations"],
    queryFn: ({ signal }) => conversations(signal), refetchInterval: 15000,
  });
  const all = result.data || [];
  const unread = all.filter((item) => (item._count?.chatMessages || 0) > 0).length;
  const rows = all.filter((item) => (!unreadOnly || (item._count?.chatMessages || 0) > 0) && name(item).toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi")));
  return <Screen>
    <View style={styles.tools}>
      <View style={styles.search}>
        <Icon name="search" size={17} color={colors.muted} />
        <TextInput accessibilityLabel="Tìm cuộc trò chuyện" placeholder="Tìm gian hàng, đối tác…" placeholderTextColor={colors.muted} value={search} onChangeText={setSearch} style={styles.input} />
      </View>
      <View style={styles.filters}>
        {[false, true].map((only) => <Pressable key={String(only)} accessibilityRole="button" accessibilityState={{ selected: unreadOnly === only }} onPress={() => setUnreadOnly(only)} style={[styles.filter, unreadOnly === only && styles.selected]}>
          <Text style={[styles.filterText, unreadOnly === only && { color: colors.strong }]}>{only ? `Chưa đọc (${unread})` : "Tất cả"}</Text>
        </Pressable>)}
        <Text style={styles.connection}>{chat.ready ? "Đã kết nối" : "Đang kết nối lại"}</Text>
      </View>
    </View>
    <ErrorNotice error={result.error || chat.error} retry={() => { chat.socket?.connect(); void result.refetch(); }} />
    {result.isLoading ? <Loading /> : <FlatList data={rows} keyExtractor={(row) => row.id} refreshing={result.isRefetching} onRefresh={() => void result.refetch()} contentContainerStyle={styles.list}
      ListEmptyComponent={!result.error ? <Empty text={search || unreadOnly ? "Không có cuộc trò chuyện phù hợp." : "Chưa có tin nhắn. Mở Hợp tác để liên hệ gian hàng."} /> : undefined}
      renderItem={({ item }) => {
        const count = item._count?.chatMessages || 0;
        return <Pressable accessibilityRole="button" accessibilityLabel={`${name(item)}${count ? `, ${count} tin chưa đọc` : ""}`} onPress={() => navigation.navigate("Chat", { conversation: item })} style={({ pressed }) => [styles.row, { backgroundColor: pressed || count ? colors.soft : colors.white }]}>
          <Avatar uri={shop ? undefined : item.store.logoUrl} name={name(item)} size={46} />
          <View style={styles.body}>
            <View style={styles.line}><Text numberOfLines={1} style={styles.name}>{name(item)}</Text><Text style={styles.time}>{timeLabel(item.chatMessages?.[0]?.createdAt)}</Text></View>
            <View style={styles.line}><Text numberOfLines={2} style={[styles.preview, count > 0 && { color: colors.ink }]}>{preview(item, session!.user.id)}</Text>{count > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{count > 99 ? "99+" : count}</Text></View>}</View>
          </View>
        </Pressable>;
      }} />}
  </Screen>;
}
const styles = StyleSheet.create({
  tools: { padding: 14, gap: 10, backgroundColor: colors.white },
  search: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, minHeight: 44 },
  input: { flex: 1, minWidth: 0, fontSize: 13, color: colors.ink, paddingVertical: 10 },
  filters: { flexDirection: "row", alignItems: "center", gap: 8 },
  filter: { minHeight: 44, paddingHorizontal: 12, justifyContent: "center", borderRadius: 10, borderWidth: 1, borderColor: colors.line },
  selected: { backgroundColor: colors.soft, borderColor: colors.brandBorder },
  filterText: { fontSize: 12, fontWeight: "600", color: colors.muted },
  connection: { flex: 1, textAlign: "right", fontSize: 10, color: colors.muted },
  list: { padding: 12, gap: 8, paddingBottom: 24 },
  row: { flexDirection: "row", alignItems: "center", gap: 11, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 12, minHeight: 88 },
  body: { flex: 1, minWidth: 0, gap: 7 },
  line: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.ink, fontWeight: "700" },
  time: { fontSize: 10, color: colors.muted },
  preview: { flex: 1, fontSize: 12, lineHeight: 17, color: colors.muted },
  badge: { minWidth: 21, height: 21, paddingHorizontal: 5, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: colors.brand },
  badgeText: { fontSize: 10, fontWeight: "700", color: colors.ink },
});
