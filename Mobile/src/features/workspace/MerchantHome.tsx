import { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { z } from "zod";
import { Avatar, Icon, IconButton, type IconName } from "../../components/commerce";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheet } from "../../components/BottomSheet";
import { ErrorNotice } from "../../components/ui";
import { colors as c } from "../../theme/tokens";
import { money } from "../../types/contracts";
import { useActor, useResource } from "../common/shared";
import { useAuth } from "../auth/AuthProvider";
import { useStoreScope } from "../auth/StoreScope";
import { NotificationBell } from "../account/NotificationBell";
import { useMobileNavigation } from "../../navigation/router";
import { kolOverviewRange } from "./kol-overview";
import type { BusinessFeature } from "./policy";

const Summary = z.object({ metrics: z.object({ totalOrders: z.number(), completedOrders: z.number(), grossRevenue: z.number(), totalCommission: z.number() }) });
const Count = z.object({ pagination: z.object({ total: z.number() }) });
const queues = [{ status: "PENDING", label: "Chờ xử lý", icon: "clock" }, { status: "SHIPPING", label: "Đang giao", icon: "truck" }, { status: "RETURNS", label: "Hồ sơ đổi trả", icon: "rotate-ccw" }] as const;

export function MerchantHome() {
  const { user, store } = useActor(), { session } = useAuth(), { select } = useStoreScope();
  const router = useRouter(), navigation = useMobileNavigation();
  const insets = useSafeAreaInsets();
  const [days, setDays] = useState(30), [version, setVersion] = useState(0), [chooseStore, setChooseStore] = useState(false);
  const [orderInfo, setOrderInfo] = useState(false);
  const range = useMemo(() => kolOverviewRange(days), [days, version]);
  const periodText = `${new Date(range.startDate).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit" })} – ${new Date(range.endDate).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" })}`;
  const overview = useResource("merchant-home-summary", `/dashboard/realtime/overview?${new URLSearchParams({ ...range, storeId: store?.id || "" })}`, Summary, !!store);
  const pending = useResource("merchant-home-pending", `/orders/my-store?page=1&limit=1&storeId=${store?.id || ""}&status=PENDING`, Count, !!store);
  const shipping = useResource("merchant-home-shipping", `/orders/my-store?page=1&limit=1&storeId=${store?.id || ""}&status=SHIPPING`, Count, !!store);
  const returns = useResource("merchant-home-returns", `/orders/my-store?page=1&limit=1&storeId=${store?.id || ""}&status=RETURNS`, Count, !!store);
  const counts = [pending, shipping, returns];
  const multipleStores = (session?.bootstrap.managedStores.length || 0) > 1;
  const open = (feature: BusinessFeature) => navigation.navigate("Business", { feature });
  const openOrders = (status = "") => router.navigate({ pathname: "/(private)/(tabs)/orders", params: { status, entry: String(Date.now()) } });
  const refresh = () => { setVersion(value => value + 1); for (const query of counts) void query.refetch(); };
  const shortcuts: { title: string; icon: IconName; feature: BusinessFeature }[] = [
    { title: "Tài chính Shop", icon: "credit-card", feature: "wallet" },
    { title: "Hàng mẫu", icon: "package", feature: "samples" },
    { title: "Thưởng doanh số", icon: "award", feature: "bonuses" },
    { title: "Khuyến mãi", icon: "tag", feature: "pricing" },
    { title: "Chiến dịch", icon: "flag", feature: "campaigns" },
    { title: "Đánh giá", icon: "star", feature: "reviews" },
  ];
  return <View style={s.screen}>
    <View style={[s.header, { paddingTop: insets.top + 8 }]}>
      <View style={s.headerTop}>
      <Pressable accessibilityRole="button" accessibilityLabel={multipleStores ? "Chọn gian hàng quản lý" : "Mở cài đặt gian hàng"} disabled={!store && !multipleStores} onPress={() => multipleStores ? setChooseStore(true) : open("shop")} style={s.identity}>
        <Avatar uri={store?.logoUrl} name={store?.name || user.fullName} size={40} />
        <View style={s.identityText}><View style={s.row}><Text numberOfLines={1} style={[s.greeting, { flex: 1 }]}>{store?.name || "Chưa có gian hàng"}</Text>{multipleStores && <Icon name="chevron-down" size={14} color={c.strong} />}</View><Text numberOfLines={1} style={s.role}>{user.fullName} · Chủ shop</Text></View>
      </Pressable>
      <View style={s.headerActions}>
      <IconButton name="message-circle" label="Tin nhắn đối tác" onPress={() => navigation.navigate("Conversations")} />
      <NotificationBell />
      </View>
      </View>
    </View>
    <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={overview.isRefetching || counts.some(query => query.isRefetching)} onRefresh={refresh} tintColor={c.strong} />}>
      {!store && <Text style={s.note}>Tài khoản chưa được phân công gian hàng. Kiểm tra hồ sơ hoặc liên hệ quản trị sàn.</Text>}
      {store && <>
        <View style={[s.card, { gap: 4 }]}><View style={s.row}><Text style={s.title}>Đơn hàng</Text><Pressable accessibilityRole="button" accessibilityLabel="Phạm vi thống kê đơn hàng" onPress={() => setOrderInfo(true)} style={s.infoButton}><Icon name="info" size={15} color={c.muted} /></Pressable><View style={{ flex: 1 }} /><Pressable accessibilityRole="button" onPress={() => openOrders()} style={s.touch}><Text style={s.link}>Xem tất cả</Text><Icon name="chevron-right" size={15} color={c.strong} /></Pressable></View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>{queues.map((queue, index) => <Pressable accessibilityRole="button" accessibilityLabel={`${queue.label}: ${counts[index].data?.pagination.total ?? "đang tải"}. Mở danh sách`} key={queue.status} onPress={() => openOrders(queue.status)} style={({ pressed }) => [s.queue, index > 0 && s.queueDivider, pressed && { backgroundColor: c.soft }]}><Icon name={queue.icon} color={c.strong} size={20} /><Text style={s.count}>{counts[index].data?.pagination.total ?? "—"}</Text><Text style={s.queueLabel}>{queue.label}</Text></Pressable>)}</View>
          <ErrorNotice error={pending.error || shipping.error || returns.error} retry={refresh} />
        </View>
        <View style={s.card}>
          <View style={s.row}><Icon name="bar-chart-2" size={17} color={c.strong} /><Text style={[s.title, { flex: 1 }]}>Hoạt động gian hàng</Text></View>
          <View style={s.segment}>{[7, 30, 90].map(value => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: days === value }} onPress={() => setDays(value)} style={[s.period, value === days && s.selected]}><Text style={[s.note, value === days && s.link]}>{value} ngày</Text></Pressable>)}</View>
          <View style={s.row}><Icon name="calendar" size={13} color={c.muted} /><Text style={s.note}>{periodText} · Giờ Việt Nam</Text></View>
          <ErrorNotice error={overview.error} retry={() => void overview.refetch()} />
          <View style={s.grid}>{[
            { label: "Doanh số đơn thành công", icon: "trending-up" as const, value: overview.data ? money(overview.data.metrics.grossRevenue) : "—" },
            { label: "Đơn tạo trong kỳ", icon: "shopping-bag" as const, value: overview.data?.metrics.totalOrders.toLocaleString("vi-VN") ?? "—" },
            { label: "Đã giao / hoàn tất", icon: "check-circle" as const, value: overview.data?.metrics.completedOrders.toLocaleString("vi-VN") ?? "—" },
            { label: "Hoa hồng ghi nhận", icon: "percent" as const, value: overview.data ? money(overview.data.metrics.totalCommission) : "—" },
          ].map(item => <View style={s.metric} key={item.label}><Icon name={item.icon} size={17} color={c.strong} /><Text style={s.metricLabel}>{item.label}</Text><Text style={s.value}>{item.value}</Text></View>)}</View>
          <Text style={s.note}>Đơn theo ngày tạo; hoa hồng theo ngày ghi nhận.</Text>
        </View>
        <View style={s.card}><View style={s.row}><Text style={[s.title, { flex: 1 }]}>Quản lý nhanh</Text><Pressable accessibilityRole="button" onPress={() => router.push("/(private)/tools")} style={s.touch}><Text style={s.link}>Tất cả</Text><Icon name="chevron-right" size={15} color={c.strong} /></Pressable></View><View style={s.grid}>{shortcuts.map(item => <Pressable key={item.feature} accessibilityRole="button" onPress={() => open(item.feature)} style={s.shortcut}><View style={s.icon}><Icon name={item.icon} size={19} color={c.strong} /></View><Text style={[s.queueLabel, { textAlign: "left", flex: 1 }]}>{item.title}</Text></Pressable>)}</View></View>
        <Pressable style={[s.card, s.row]} accessibilityRole="button" onPress={() => router.navigate("/(private)/(tabs)/cooperation")}><View style={s.icon}><Icon name="users" color={c.strong} size={21} /></View><View style={{ flex: 1, gap: 4 }}><Text style={s.title}>Đối tác KOL/KOC</Text><Text style={s.note}>Theo dõi hợp tác và thỏa thuận tiếp thị</Text></View><Icon name="chevron-right" size={18} color={c.strong} /></Pressable>
      </>}
    </ScrollView>
    {orderInfo && <BottomSheet title="Thống kê đơn hàng" close={() => setOrderInfo(false)}><Text style={s.note}>Số lượng của gian hàng đang chọn, không giới hạn ngày tạo. Chờ xử lý và đang giao theo trạng thái hiện tại. Hồ sơ đổi trả gồm cả hồ sơ đã xử lý, không phải số yêu cầu đang chờ.</Text></BottomSheet>}
    {chooseStore && <BottomSheet title="Chọn gian hàng quản lý" close={() => setChooseStore(false)}>{session?.bootstrap.managedStores.map(item => <Pressable key={item.id} style={[s.card, s.row]} accessibilityRole="radio" accessibilityState={{ checked: item.id === store?.id }} onPress={() => { select(item.id); setChooseStore(false); }}><Avatar uri={item.logoUrl} name={item.name} size={36} /><Text style={[s.title, { flex: 1 }]}>{item.name}</Text><Icon name={item.id === store?.id ? "check-circle" : "circle"} size={18} color={c.strong} /></Pressable>)}</BottomSheet>}
  </View>;
}
const s = StyleSheet.create({
  header: { backgroundColor: c.white, borderBottomWidth: 1, borderColor: c.line, paddingHorizontal: 14 },
  headerTop: { width: "100%", flexDirection: "row", alignItems: "center", gap: 6, paddingBottom: 7 },
  identity: { flex: 1, flexBasis: 0, flexShrink: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 9, minHeight: 44 },
  identityText: { flex: 1, minWidth: 0, gap: 4 }, greeting: { fontSize: 15, lineHeight: 20, fontWeight: "700", color: c.ink }, role: { fontSize: 11, lineHeight: 16, color: c.muted },
  headerActions: { width: 90, flexShrink: 0, flexDirection: "row", alignItems: "center", gap: 2 },
  screen: { flex: 1, backgroundColor: c.canvas }, content: { padding: 12, paddingBottom: 28, gap: 14 },
  card: { backgroundColor: c.white, borderWidth: 1, borderColor: c.line, borderRadius: 17, padding: 14, gap: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 }, title: { color: c.ink, fontSize: 15, lineHeight: 21, fontWeight: "700" },
  note: { color: c.muted, fontSize: 11, lineHeight: 17 }, link: { color: c.strong, fontSize: 11, fontWeight: "600" },
  touch: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 3 },
  queue: { flex: 1, minWidth: 0, minHeight: 92, paddingVertical: 8, paddingHorizontal: 3, alignItems: "center", justifyContent: "center", gap: 5 },
  queueDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: c.line },
  infoButton: { width: 32, minHeight: 44, alignItems: "center", justifyContent: "center" },
  count: { fontSize: 25, lineHeight: 30, color: c.ink, fontWeight: "700", fontVariant: ["tabular-nums"] }, queueLabel: { fontSize: 11, lineHeight: 16, color: c.ink, textAlign: "center", fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, metric: { width: "48%", flexGrow: 1, minWidth: 0, padding: 12, backgroundColor: c.canvas, borderWidth: 1, borderColor: c.line, borderRadius: 12, gap: 7 },
  metricLabel: { color: c.muted, fontSize: 11, lineHeight: 16, minHeight: 32 },
  value: { fontSize: 18, lineHeight: 24, fontWeight: "700", color: c.ink },
  segment: { flexDirection: "row", padding: 4, borderRadius: 11, backgroundColor: c.canvas, gap: 5 }, period: { flex: 1, minHeight: 40, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "transparent", borderRadius: 8 }, selected: { backgroundColor: c.soft, borderColor: c.brandBorder },
  shortcut: { flexDirection: "row", alignItems: "center", gap: 8, width: "48%", flexGrow: 1, minHeight: 58, borderWidth: 1, borderColor: c.line, padding: 8, borderRadius: 11 },
  icon: { width: 34, height: 34, borderRadius: 10, backgroundColor: c.soft, alignItems: "center", justifyContent: "center" },
});
