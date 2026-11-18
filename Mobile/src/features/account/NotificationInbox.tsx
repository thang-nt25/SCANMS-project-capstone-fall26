import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { Icon, type IconName } from "../../components/commerce";
import { ProductPhoto } from "../../components/ProductPhoto";
import { Button, ErrorNotice, PageControls, Screen } from "../../components/ui";
import { BottomSheet } from "../../components/BottomSheet";
import { colors as c } from "../../theme/tokens";
import { QueryState, useCommand, useResource } from "../common/shared";

const Data = z.preprocess(value => {
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return null; }
}, z.object({ productImageUrl: z.string().nullish(), productTitle: z.string().nullish() }).nullish().catch(null));
const Notice = z.object({ id: z.string(), type: z.string().optional(), title: z.string(), message: z.string(), isRead: z.boolean(), createdAt: z.string(), data: Data });
const Inbox = z.object({ items: z.array(Notice), unreadCount: z.number(), totalPages: z.number() });
const categories = [["ALL", "Tất cả"], ["ORDER", "Đơn hàng"], ["PROMOTION", "Ưu đãi"], ["SYSTEM", "Hệ thống"]] as const;
function noticeIcon(type = ""): IconName {
  if (/ORDER|RETURN|DELIVERY/.test(type)) return "package";
  if (/COUPON|PROMO|VOUCHER|CAMPAIGN/.test(type)) return "tag";
  if (/PAYOUT|COMMISSION/.test(type)) return "credit-card";
  if (/SAMPLE/.test(type)) return "gift";
  return "bell";
}
function date(value: string) {
  const time = new Date(value);
  return Number.isNaN(time.getTime()) ? "" : time.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
}
export function NotificationsScreen() {
  const [page, setPage] = useState(1), [category, setCategory] = useState("ALL");
  const [selected, setSelected] = useState<z.infer<typeof Notice> | null>(null);
  const result = useResource("notifications", `/notifications?page=${page}&limit=20&category=${category}`, Inbox);
  const command = useCommand();
  return <Screen scroll>
    <View style={s.tabs}>{categories.map(([key, label]) => <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: category === key }} onPress={() => { setCategory(key); setPage(1); }} style={[s.tab, category === key && s.active]}><Text numberOfLines={1} style={[s.small, { color: category === key ? c.ink : c.muted, fontWeight: category === key ? "700" : "500" }]}>{label}</Text></Pressable>)}</View>
    <QueryState loading={result.isLoading} error={result.error} retry={() => void result.refetch()} />
    <ErrorNotice error={command.error} />
    {result.data?.items.length === 0 && <View style={s.empty}><Icon name="bell" size={30} color={c.strong} /><Text style={s.heading}>Chưa có thông báo</Text><Text style={s.small}>Thông báo mới sẽ xuất hiện tại đây.</Text></View>}
    <View style={{ gap: 8 }}>{result.data?.items.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`${item.isRead ? "" : "Chưa đọc. "}${item.title}`} onPress={() => { setSelected(item); if (!item.isRead && !command.busy) void command.execute(`/notifications/${item.id}/read`); }} style={[s.card, !item.isRead && s.unread]}>
      {item.data?.productImageUrl ? <ProductPhoto uri={item.data.productImageUrl} style={s.photo} resizeMode="contain" /> : <View style={s.icon}><Icon name={noticeIcon(item.type)} size={19} color={c.strong} /></View>}
      <View style={{ flex: 1, minWidth: 0, gap: 5 }}><View style={[s.row, { alignItems: "flex-start" }]}><Text numberOfLines={2} style={s.title}>{item.title}</Text>{!item.isRead && <View style={s.dot} />}</View><Text numberOfLines={2} style={s.message}>{item.message}</Text><View style={s.timeRow}><Text style={s.time}>{date(item.createdAt)}</Text><Icon name="chevron-right" size={14} color={c.muted} /></View></View>
    </Pressable>)}</View>
    {!!result.data && result.data.totalPages > 1 && <PageControls page={page} totalPages={result.data.totalPages} loading={result.isFetching} onChange={setPage} />}
    {selected && <BottomSheet title="Chi tiết thông báo" close={() => setSelected(null)}>
      <View style={s.row}>{selected.data?.productImageUrl ? <ProductPhoto uri={selected.data.productImageUrl} style={s.photo} resizeMode="contain" /> : <View style={s.icon}><Icon name={noticeIcon(selected.type)} size={20} color={c.strong} /></View>}<View style={{ flex: 1, gap: 5 }}><Text style={s.heading}>{selected.title}</Text><Text style={s.time}>{date(selected.createdAt)}</Text></View></View>
      <Text style={[s.message, { fontSize: 14, lineHeight: 22 }]}>{selected.message}</Text>
      {!!selected.data?.productTitle && <Text style={s.small}>{selected.data.productTitle}</Text>}
      <Button title="Đóng" soft onPress={() => setSelected(null)} />
    </BottomSheet>}
  </Screen>;
}
const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  heading: { fontSize: 15, lineHeight: 21, fontWeight: "700", color: c.ink }, small: { fontSize: 12, lineHeight: 17, color: c.muted },
  icon: { width: 38, height: 38, borderRadius: 12, backgroundColor: c.soft, alignItems: "center", justifyContent: "center" },
  tabs: { flexDirection: "row", gap: 5, padding: 5, borderRadius: 13, backgroundColor: c.white, borderWidth: 1, borderColor: c.line }, tab: { flex: 1, minHeight: 40, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "transparent", borderRadius: 9 }, active: { backgroundColor: c.soft, borderColor: c.brandBorder },
  card: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: c.line, backgroundColor: c.white }, unread: { borderColor: c.brandBorder, backgroundColor: "#FFFDFA" }, photo: { width: 42, height: 48, borderRadius: 9, backgroundColor: c.white },
  title: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: "700", color: c.ink }, message: { fontSize: 12, lineHeight: 18, color: c.muted }, dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.brand, marginTop: 6 }, timeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, time: { fontSize: 10, lineHeight: 15, color: c.muted }, empty: { padding: 28, gap: 10, alignItems: "center", backgroundColor: c.white, borderRadius: 16, borderWidth: 1, borderColor: c.line },
});
