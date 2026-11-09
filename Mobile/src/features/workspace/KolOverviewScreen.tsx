import { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { z } from "zod";
import { Icon, type IconName } from "../../components/commerce";
import { BottomSheet } from "../../components/BottomSheet";
import { ErrorNotice } from "../../components/ui";
import { colors as c } from "../../theme/tokens";
import { money } from "../../types/contracts";
import { amount, useResource } from "../common/shared";
import { useMobileNavigation } from "../../navigation/router";
import { kolOverviewRange } from "./kol-overview";

const Overview = z.object({ metrics: z.object({
  totalClicks: z.number(), completedOrders: z.number(), totalOrders: z.number(),
  grossRevenue: z.number(), totalCommission: z.number(), conversionRate: z.number(),
  estimatedCommission: z.number(), pendingOrdersCount: z.number(),
}) });
const Wallet = z.object({ availableBalance: amount, pendingBalance: amount });

export function KolOverviewScreen() {
  const [days, setDays] = useState(7);
  const [refresh, setRefresh] = useState(0);
  const [conversionInfo, setConversionInfo] = useState(false);
  const router = useRouter(), navigation = useMobileNavigation();
  const range = useMemo(() => kolOverviewRange(days), [days, refresh]);
  const periodText = `${new Date(range.startDate).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit" })} – ${new Date(range.endDate).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" })}`;
  const overview = useResource("kol-overview", `/dashboard/realtime/overview?${new URLSearchParams(range)}`, Overview);
  // This summary schema strips withdrawal fields; do not share the full wallet cache.
  const wallet = useResource("kol-wallet-summary", "/wallets/me", Wallet);
  const metrics = overview.data?.metrics;
  const refreshing = overview.isRefetching || wallet.isRefetching;
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefresh(value => value + 1); void wallet.refetch(); }} tintColor={c.strong} />}>

      <Pressable accessibilityRole="button" accessibilityLabel="Mở ví thù lao" onPress={() => router.navigate("/(private)/(tabs)/wallet")} style={s.wallet}>
        <View style={s.row}><View style={s.inline}><Icon name="credit-card" size={17} color={c.strong} /><Text style={s.label}>Số dư khả dụng</Text></View><Icon name="chevron-right" size={18} color={c.muted} /></View>
        <Text adjustsFontSizeToFit numberOfLines={1} style={s.balance}>{wallet.data ? money(wallet.data.availableBalance) : "—"}</Text>
        <View style={s.walletFoot}><Text style={s.muted}>Đang bảo chứng</Text><Text style={s.held}>{wallet.data ? money(wallet.data.pendingBalance) : "—"}</Text></View>
      </Pressable>
      <ErrorNotice error={wallet.error} retry={() => void wallet.refetch()} />

      <View style={s.performance}>
        <View style={s.segment}>
          {[7, 30, 90].map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: value === days }} onPress={() => setDays(value)} style={[s.segmentItem, days === value && s.selected]}><Text style={[s.segmentText, days === value && s.selectedText]}>{value} ngày</Text></Pressable>)}
        </View>
        <View style={s.inline}><Icon name="calendar" size={13} color={c.muted} /><Text style={s.period}>{periodText}</Text></View>
        <ErrorNotice error={overview.error} retry={() => void overview.refetch()} />
        <View style={s.grid}>
          <Metric label="Doanh số" icon="trending-up" value={metrics ? money(metrics.grossRevenue) : "—"} note="Đơn đã giao / hoàn tất" />
          <Metric label="Hoa hồng" icon="dollar-sign" value={metrics ? money(metrics.totalCommission) : "—"} note="Theo số liệu ghi nhận" />
          <Metric label="Lượt nhấp" icon="mouse-pointer" value={metrics ? metrics.totalClicks.toLocaleString("vi-VN") : "—"} note="Qua liên kết tiếp thị" />
          <Metric label="Đơn thành công" icon="shopping-bag" value={metrics ? String(metrics.completedOrders) : "—"} note={metrics ? `Trên ${metrics.totalOrders} đơn phát sinh` : "Đang tải dữ liệu"} />
        </View>
        <View style={s.conversion}><View style={s.inline}><Text style={s.muted}>Tỷ lệ chuyển đổi</Text><Pressable accessibilityRole="button" accessibilityLabel="Cách tính tỷ lệ chuyển đổi" onPress={() => setConversionInfo(true)} style={{ width: 32, minHeight: 32, alignItems: "center", justifyContent: "center" }}><Icon name="info" size={14} color={c.muted} /></Pressable></View><Text style={s.conversionValue}>{metrics ? `${metrics.conversionRate.toFixed(2)}%` : "—"}</Text></View>
      </View>
      {conversionInfo && <BottomSheet title="Tỷ lệ chuyển đổi" close={() => setConversionInfo(false)}><Text style={s.muted}>Số đơn phát sinh ÷ lượt nhấp × 100%. Bao gồm đơn chưa giao thành công. Kỳ thống kê tính theo giờ Việt Nam.</Text><Text style={s.muted}>{metrics ? `${metrics.totalOrders} đơn phát sinh · ${metrics.completedOrders} đơn thành công · ${metrics.totalClicks} lượt nhấp` : "Chưa có dữ liệu"}</Text></BottomSheet>}

      <View style={s.estimate}><View style={{ flex: 1, gap: 5 }}><Text style={s.label}>Hoa hồng tạm tính</Text><Text style={s.muted}>{metrics ? `${metrics.pendingOrdersCount} đơn chưa hoàn tất` : "Đang tải dữ liệu"}</Text></View><Text style={s.estimateValue}>{metrics ? money(metrics.estimatedCommission) : "—"}</Text></View>
      <View style={s.actions}>
        <Pressable accessibilityRole="button" onPress={() => navigation.navigate("Business", { feature: "marketing" })} style={s.primary}><Icon name="plus" size={17} color={c.ink} /><Text style={s.actionText}>Tạo link tiếp thị</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.navigate("/(private)/(tabs)/cooperation")} style={s.secondary}><Icon name="users" size={17} color={c.strong} /><Text style={s.actionText}>Hợp tác</Text></Pressable>
      </View>
    </ScrollView>
  );
}

function Metric({ label, icon, value }: { label: string; icon: IconName; value: string; note: string }) {
  return <View style={s.metric}><Icon name={icon} size={17} color={c.strong} /><Text style={s.metricLabel}>{label}</Text><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={s.metricValue}>{value}</Text></View>;
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.canvas }, content: { padding: 14, gap: 14, paddingBottom: 24 },
  greeting: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 2 }, heading: { fontSize: 17, fontWeight: "700", color: c.ink, marginTop: 5 }, muted: { fontSize: 12, lineHeight: 17, color: c.muted },
  wallet: { borderWidth: 1, borderColor: c.brandBorder, borderRadius: 16, padding: 14, backgroundColor: c.soft, gap: 9 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }, inline: { flexDirection: "row", alignItems: "center", gap: 7 }, label: { fontSize: 13, fontWeight: "600", color: c.ink }, balance: { fontSize: 28, fontWeight: "800", color: c.ink },
  walletFoot: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderColor: c.brandBorder, paddingTop: 8, gap: 8 }, held: { fontSize: 14, fontWeight: "600", color: c.strong },
  performance: { backgroundColor: c.white, borderWidth: 1, borderColor: c.line, borderRadius: 18, padding: 12, gap: 12 }, sectionTitle: { fontSize: 15, fontWeight: "700", color: c.ink }, period: { fontSize: 10, color: c.muted },
  segment: { flexDirection: "row", backgroundColor: c.canvas, padding: 3, borderRadius: 11, gap: 4 }, segmentItem: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 40, borderRadius: 8 }, selected: { backgroundColor: c.soft, borderWidth: 1, borderColor: c.brandBorder }, segmentText: { fontSize: 12, color: c.muted }, selectedText: { color: c.strong, fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 }, metric: { width: "48%", backgroundColor: c.canvas, borderRadius: 12, padding: 11, gap: 6 }, metricLabel: { fontSize: 11, color: c.muted }, metricValue: { fontSize: 20, fontWeight: "700", color: c.ink, minHeight: 25 }, metricNote: { fontSize: 10, lineHeight: 14, color: c.muted },
  conversion: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderColor: c.line, paddingTop: 6 }, conversionValue: { fontSize: 14, fontWeight: "700", color: c.strong },
  estimate: { flexDirection: "row", alignItems: "center", gap: 10, padding: 13, borderWidth: 1, borderColor: c.line, borderRadius: 14, backgroundColor: c.white }, estimateValue: { fontSize: 17, fontWeight: "700", color: c.strong },
  actions: { flexDirection: "row", gap: 10 }, primary: { flex: 1, backgroundColor: c.soft, borderWidth: 1, borderColor: c.brandBorder, borderRadius: 12, minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }, secondary: { flex: 1, backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.brandBorder, minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }, actionText: { fontSize: 12, fontWeight: "600", color: c.ink },
});
