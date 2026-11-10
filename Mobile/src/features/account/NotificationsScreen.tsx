import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { z } from "zod";
import { BottomSheet } from "../../components/BottomSheet";
import { Icon, type IconName } from "../../components/commerce";
import {
  Empty,
  ErrorNotice,
  Loading,
  PageControls,
  Screen,
} from "../../components/ui";
import { colors } from "../../theme/tokens";
import { useCommand, useResource } from "../common/shared";

const NotificationSchema = z.object({
  id: z.string(),
  title: z.string(),
  message: z.string(),
  type: z.string().nullish(),
  isRead: z.boolean(),
  createdAt: z.string(),
});
type Notification = z.infer<typeof NotificationSchema>;
const NotificationsSchema = z.object({
  items: z.array(NotificationSchema),
  unreadCount: z.number(),
  totalPages: z.number(),
});
const categories = [
  { key: "ALL", label: "Tất cả" },
  { key: "ORDER", label: "Đơn hàng" },
  { key: "PROMOTION", label: "Ưu đãi" },
  { key: "SYSTEM", label: "Hệ thống" },
] as const;
type Category = (typeof categories)[number]["key"];
function notificationIcon(
  type: string | null | undefined,
  category: Category,
): IconName {
  if (type?.startsWith("RETURN_") || type?.startsWith("DISPUTE_"))
    return "rotate-ccw";
  if (type?.startsWith("CHAT_")) return "message-circle";
  if (type?.includes("COUPON") || /^(PROMO|VOUCHER|CAMPAIGN)/.test(type || ""))
    return "tag";
  if (type?.startsWith("ORDER_") || category === "ORDER") return "package";
  return category === "PROMOTION" ? "tag" : "bell";
}
const shortDate = (value: string) =>
  new Date(value).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });

/** The list previews content; opening a row keeps the existing server-owned read workflow. */
export function NotificationsScreen() {
  const [page, setPage] = useState(1),
    [category, setCategory] = useState<Category>("ALL");
  const [selected, setSelected] = useState<Notification | null>(null);
  const result = useResource(
    "notifications",
    `/notifications?page=${page}&limit=20&category=${category}`,
    NotificationsSchema,
  );
  const command = useCommand();
  const unreadCount = result.data?.unreadCount;
  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.toolbar}>
          <View style={styles.summary}>
            <View
              style={[
                styles.dot,
                { backgroundColor: unreadCount ? colors.strong : colors.line },
              ]}
            />
            <Text style={styles.summaryText}>
              {unreadCount === undefined
                ? "Đang tải thông báo…"
                : `${unreadCount} chưa đọc`}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đánh dấu tất cả thông báo đã đọc"
            accessibilityState={{
              disabled: command.busy || !unreadCount,
              busy: command.busy,
            }}
            disabled={command.busy || !unreadCount}
            hitSlop={4}
            onPress={() => void command.execute("/notifications/read-all")}
            style={({ pressed }) => [
              styles.readAll,
              { opacity: !unreadCount ? 0.45 : pressed ? 0.6 : 1 },
            ]}
          >
            {command.busy ? (
              <ActivityIndicator size="small" color={colors.strong} />
            ) : (
              <Icon name="check" size={15} color={colors.strong} />
            )}
            <Text style={styles.readAllText}>Đọc tất cả</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {categories.map((item) => (
            <Pressable
              key={item.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: category === item.key }}
              onPress={() => {
                setCategory(item.key);
                setPage(1);
              }}
              style={({ pressed }) => [
                styles.tab,
                category === item.key && styles.activeTab,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  category === item.key && styles.activeTabText,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      {Boolean(result.error || command.error) && (
        <View style={styles.notice}>
          <ErrorNotice
            error={command.error || result.error}
            retry={() => void result.refetch()}
          />
        </View>
      )}
      <FlatList
        key={`${category}:${page}`}
        style={styles.list}
        data={result.data?.items || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={result.isRefetching}
            onRefresh={() => void result.refetch()}
            colors={[colors.brand]}
            tintColor={colors.brand}
          />
        }
        ListEmptyComponent={
          result.isLoading ? (
            <Loading />
          ) : !result.error ? (
            <Empty
              title="Chưa có thông báo"
              text="Các cập nhật mới sẽ hiển thị tại đây."
            />
          ) : undefined
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.isRead ? "" : "Chưa đọc. "}${item.title}. ${item.message}`}
            disabled={command.busy}
            onPress={() => {
              setSelected(item);
              if (!item.isRead)
                void command.execute(`/notifications/${item.id}/read`);
            }}
            style={({ pressed }) => [
              styles.notification,
              !item.isRead && styles.unread,
              pressed && { opacity: 0.7 },
            ]}
          >
            <View style={styles.icon}>
              <Icon
                name={notificationIcon(item.type, category)}
                size={20}
                color={colors.strong}
              />
            </View>
            <View style={styles.content}>
              <View style={styles.titleRow}>
                <Text
                  numberOfLines={2}
                  style={[styles.title, !item.isRead && { fontWeight: "700" }]}
                >
                  {item.title}
                </Text>
                {!item.isRead && (
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: colors.strong, marginTop: 6 },
                    ]}
                  />
                )}
              </View>
              <Text numberOfLines={2} style={styles.preview}>
                {item.message}
              </Text>
              <Text style={styles.time}>{shortDate(item.createdAt)}</Text>
            </View>
          </Pressable>
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            <PageControls
              page={page}
              totalPages={result.data?.totalPages || 1}
              loading={result.isFetching}
              onChange={setPage}
            />
          </View>
        }
      />
      {selected && (
        <BottomSheet title="Chi tiết thông báo" close={() => setSelected(null)}>
          <Text style={styles.detailTitle}>{selected.title}</Text>
          <Text style={styles.time}>
            {new Date(selected.createdAt).toLocaleString("vi-VN")}
          </Text>
          <Text style={styles.message}>{selected.message}</Text>
          <ErrorNotice error={command.error} />
        </BottomSheet>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  summary: { flexDirection: "row", alignItems: "center", gap: 6 },
  summaryText: { fontSize: 12, color: colors.muted },
  dot: { width: 6, height: 6, borderRadius: 3 },
  readAll: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    gap: 5,
  },
  readAllText: { fontSize: 12, fontWeight: "600", color: colors.strong },
  tabs: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 7,
    alignItems: "center",
  },
  tab: {
    borderRadius: 18,
    backgroundColor: colors.canvas,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  activeTab: { backgroundColor: colors.brand },
  tabText: { fontSize: 12, fontWeight: "500", color: colors.muted },
  activeTabText: { color: colors.ink, fontWeight: "600" },
  notice: { padding: 12 },
  list: { flex: 1 },
  listContent: { flexGrow: 1, paddingBottom: 20 },
  notification: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    backgroundColor: colors.white,
  },
  unread: { backgroundColor: colors.soft },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.brandBorder,
    backgroundColor: colors.soft,
  },
  content: { flex: 1, gap: 4 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  title: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: colors.ink,
  },
  preview: { fontSize: 12, lineHeight: 18, color: colors.muted },
  time: { fontSize: 11, lineHeight: 16, color: colors.muted },
  footer: { paddingHorizontal: 16, paddingTop: 12 },
  detailTitle: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "700",
    color: colors.ink,
  },
  message: { fontSize: 14, lineHeight: 22, color: colors.ink },
});
