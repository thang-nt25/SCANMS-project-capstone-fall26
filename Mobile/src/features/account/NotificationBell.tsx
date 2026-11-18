import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";
import { Icon, IconButton } from "../../components/commerce";
import { ProductPhoto } from "../../components/ProductPhoto";
import { ErrorNotice, Loading, PageControls } from "../../components/ui";
import { colors } from "../../theme/tokens";
import { useCommand, useResource } from "../common/shared";

const ProductData = z.preprocess(value => {
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return null; }
}, z.object({ productImageUrl: z.string().nullish(), productTitle: z.string().nullish() }).nullish().catch(null));
const Notifications = z.object({
  items: z.array(z.object({ id: z.string(), title: z.string(), message: z.string(), isRead: z.boolean(), createdAt: z.string(), data: ProductData })),
  unreadCount: z.number(), totalPages: z.number(),
});

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const count = useResource("notification-count", "/notifications/unread-count", z.object({ unreadCount: z.number() }));
  const result = useResource("notifications", `/notifications?page=${page}&limit=15&category=ALL`, Notifications, open);
  const command = useCommand();
  return <>
    <IconButton name="bell" label="Thông báo" badge={count.data?.unreadCount} onPress={() => { setPage(1); setExpanded(null); setOpen(true); }} />
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={s.overlay}>
        <Pressable accessibilityRole="button" accessibilityLabel="Đóng thông báo" style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
        <View accessibilityViewIsModal style={[s.panel, { maxHeight: Math.min(480, height * 0.64, height - insets.top - Math.max(insets.bottom, 12) - 24), marginTop: insets.top + 52 }]}>
          <View style={s.header}><View style={s.heading}><Icon name="bell" size={20} color={colors.strong} /><Text style={s.title}>Thông báo</Text></View><IconButton name="x" label="Đóng thông báo" onPress={() => setOpen(false)} /></View>
          <View style={s.toolbar}>
            <Text style={s.caption}>{result.data ? `${result.data.unreadCount} chưa đọc` : "Thông báo của bạn"}</Text>
            <Pressable accessibilityRole="button" disabled={command.busy || !result.data?.unreadCount} onPress={() => void command.execute("/notifications/read-all")} style={s.readAll}><Text style={[s.readText, (!result.data?.unreadCount || command.busy) && { opacity: 0.5 }]}>Đọc tất cả</Text></Pressable>
          </View>
          <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator contentContainerStyle={s.list}>
            {result.isLoading && <Loading />}
            <ErrorNotice error={result.error} retry={() => void result.refetch()} />
            <ErrorNotice error={command.error} />
            {result.data?.items.length === 0 && <View style={s.empty}><Icon name="bell" size={28} color={colors.muted} /><Text style={s.caption}>Bạn chưa có thông báo.</Text></View>}
            {result.data?.items.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ expanded: expanded === item.id }} onPress={() => {
              setExpanded(expanded === item.id ? null : item.id);
              if (!item.isRead && !command.busy) void command.execute(`/notifications/${item.id}/read`);
            }} style={[s.item, !item.isRead && s.unread]}>
              {item.data?.productImageUrl && <ProductPhoto uri={item.data.productImageUrl} resizeMode="contain" style={s.photo} />}
              <View style={s.itemBody}>
                <View style={s.itemHeading}><Text numberOfLines={expanded === item.id ? undefined : 1} style={s.itemTitle}>{item.title}</Text>{!item.isRead && <View style={s.dot} />}</View>
                <Text numberOfLines={expanded === item.id ? undefined : 2} style={s.message}>{item.message}</Text>
                {expanded === item.id && item.data?.productTitle && <Text style={s.productTitle}>{item.data.productTitle}</Text>}
                <Text style={s.time}>{new Date(item.createdAt).toLocaleString("vi-VN")}</Text>
              </View>
            </Pressable>)}
            {!!result.data && result.data.totalPages > 1 && <PageControls page={page} totalPages={result.data.totalPages} loading={result.isFetching} onChange={value => { setPage(value); setExpanded(null); }} />}
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>;
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(35,29,21,0.28)", paddingHorizontal: 12 },
  panel: { width: "100%", maxWidth: 380, alignSelf: "flex-end", borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingLeft: 16, paddingRight: 6, paddingVertical: 6, borderBottomWidth: 1, borderColor: colors.line },
  heading: { flexDirection: "row", alignItems: "center", gap: 8 }, title: { fontSize: 17, fontWeight: "700", color: colors.ink },
  toolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  caption: { fontSize: 12, color: colors.muted }, readAll: { minHeight: 44, justifyContent: "center", paddingLeft: 12 }, readText: { fontSize: 12, fontWeight: "600", color: colors.strong },
  list: { padding: 10, paddingTop: 0, gap: 8 },
  item: { padding: 8, gap: 8, flexDirection: "row", alignItems: "flex-start", borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: colors.white }, unread: { backgroundColor: colors.soft, borderColor: colors.brandBorder },
  photo: { width: 36, height: 42, borderRadius: 7, backgroundColor: colors.white }, itemBody: { flex: 1, minWidth: 0, gap: 3 }, productTitle: { fontSize: 11, lineHeight: 16, color: colors.strong },
  itemHeading: { flexDirection: "row", alignItems: "center", gap: 6 }, itemTitle: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: "700", color: colors.ink },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.brand }, message: { fontSize: 11, lineHeight: 16, color: colors.muted }, time: { fontSize: 9, color: colors.muted },
  empty: { padding: 28, alignItems: "center", gap: 10 },
});
