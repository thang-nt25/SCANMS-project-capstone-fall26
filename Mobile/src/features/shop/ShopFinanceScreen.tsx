import { z } from "zod";
import { useState } from "react";
import { Button, Screen } from "../../components/ui";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { Icon, type IconName } from "../../components/commerce";
import { colors } from "../../theme/tokens";
import { money } from "../../types/contracts";
import { useMobileNavigation } from "../../navigation/router";
import {
  QueryState,
  amount,
  useActor,
  useResource,
} from "../common/shared";
const Overview = z.object({
  metrics: z.object({
    totalOrders: z.number(),
    grossRevenue: z.number(),
    totalCommission: z.number(),
  }),
});
const Finance = z.object({
  summary: z.object({
    pending: z.object({ count: z.number(), netAmount: amount }),
    withheldTax: z.object({ amount }),
    approvedToday: z.object({ count: z.number(), netAmount: amount }),
    breakdown: z.object({
      approvedOutsideSandboxToday: amount,
      approvedSandboxToday: amount,
      withheldTaxOutsideSandbox: amount,
      withheldTaxSandbox: amount,
    }).optional(),
  }),
});
/** Merchant revenue is not the owner's personal/commission wallet. Mirrors the web finance workspace. */
export function ShopFinanceScreen() {
  const { store } = useActor(),
    navigation = useMobileNavigation();
  const [tab, setTab] = useState<"activity" | "payouts">("activity");
  const overview = useResource(
    "shop-finance",
    `/dashboard/realtime/overview?days=30&storeId=${store?.id || ""}`,
    Overview,
    Boolean(store),
  );
  const finance = useResource(
    "shop-payout-summary",
    `/stores/${store?.id || ""}/payouts?page=1&limit=10`,
    Finance,
    Boolean(store),
  );
  return (
    <Screen scroll>
      <View accessibilityRole="tablist" style={f.tabs}>
        {([{ key: "activity", title: "Hoạt động Shop", icon: "bar-chart-2" }, { key: "payouts", title: "Chi trả KOL", icon: "credit-card" }] as const).map(item => <Pressable key={item.key} accessibilityRole="tab" accessibilityState={{ selected: tab === item.key }} onPress={() => setTab(item.key)} style={[f.tab, tab === item.key && f.activeTab]}><Icon name={item.icon} size={16} color={tab === item.key ? colors.strong : colors.muted} /><Text style={[f.tabText, tab === item.key && f.activeText]}>{item.title}</Text></Pressable>)}
      </View>
      <QueryState
        loading={tab === "activity" ? overview.isLoading : finance.isLoading}
        error={tab === "activity" ? overview.error : finance.error}
        retry={() => {
          void overview.refetch();
          void finance.refetch();
        }}
      />
      {tab === "activity" && overview.data && (
        <View style={f.card}>
          <View style={f.sectionHead}><Text style={f.heading}>Hiệu quả gian hàng</Text><Text style={f.period}>30 ngày gần nhất</Text></View>
          <View style={f.hero}><View style={f.sectionHead}><Icon name="trending-up" size={20} color={colors.strong} /><Text style={f.label}>Đơn đã giao / hoàn tất</Text></View><Text style={f.heroValue}>{money(overview.data.metrics.grossRevenue)}</Text><Text style={f.hint}>Theo ngày tạo đơn trong kỳ</Text></View>
          <View style={f.gridRow}>
            <FinanceMetric icon="shopping-bag" label="Đơn phát sinh" hint="Tất cả trạng thái" value={overview.data.metrics.totalOrders} />
            <FinanceMetric icon="percent" label="Hoa hồng ghi nhận" hint="Trong 30 ngày" value={money(overview.data.metrics.totalCommission)} />
          </View>
          <Text style={f.hint}>Giá trị đơn không phải lợi nhuận hoặc số dư để rút.</Text>
        </View>
      )}
      {tab === "payouts" && finance.data && (
        <View style={f.card}>
          <View style={f.sectionHead}><Text style={f.heading}>Đối soát đối tác</Text><Text style={f.period}>Chỉ xem</Text></View>
          <View style={f.hero}><View style={f.sectionHead}><Icon name="clock" size={20} color={colors.strong} /><Text style={f.label}>Chờ Manager sàn duyệt</Text></View><Text style={f.heroValue}>{money(finance.data.summary.pending.netAmount)}</Text><Text style={f.hint}>{finance.data.summary.pending.count} yêu cầu · số tiền sau thuế</Text></View>
          <View style={f.gridRow}><FinanceMetric icon="check-circle"
            label="Hoàn tất ngoài Sandbox" hint="Hôm nay"
            value={finance.data.summary.breakdown ? money(finance.data.summary.breakdown.approvedOutsideSandboxToday) : "Chưa tải được phân loại"}
          />
          <FinanceMetric icon="file-text"
            label="Thuế ngoài Sandbox" hint="Lũy kế"
            value={finance.data.summary.breakdown ? money(finance.data.summary.breakdown.withheldTaxOutsideSandbox) : "Chưa tải được phân loại"}
          /></View>
          <View style={f.gridRow}><FinanceMetric icon="monitor" label="Hoàn tất Sandbox" hint="Hôm nay · thử nghiệm" value={finance.data.summary.breakdown ? money(finance.data.summary.breakdown.approvedSandboxToday) : "Chưa tải được phân loại"} />
          <FinanceMetric icon="file-text" label="Thuế Sandbox" hint="Lũy kế · mô phỏng" value={finance.data.summary.breakdown ? money(finance.data.summary.breakdown.withheldTaxSandbox) : "Chưa tải được phân loại"} /></View>
          <Button title="Xem đối soát chi trả" soft onPress={() => navigation.navigate("Business", { feature: "payouts" })} />
        </View>
      )}
    </Screen>
  );
}
function FinanceMetric({ icon, label, value, hint }: { icon: IconName; label: string; value: string | number; hint: string }) {
  return <View style={f.metric}><Icon name={icon} size={18} color={colors.strong} /><Text style={f.metricLabel}>{label}</Text><Text style={f.value}>{value}</Text><Text style={f.hint}>{hint}</Text></View>;
}
const f = StyleSheet.create({
  tabs: { flexDirection: "row", gap: 8, backgroundColor: colors.white, borderRadius: 14, padding: 6, borderWidth: 1, borderColor: colors.line },
  tab: { flex: 1, minHeight: 46, paddingHorizontal: 6, flexDirection: "row", gap: 6, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "transparent", borderRadius: 10 },
  activeTab: { backgroundColor: colors.soft, borderColor: colors.brandBorder }, tabText: { fontSize: 12, fontWeight: "600", color: colors.muted, flexShrink: 1 }, activeText: { color: colors.ink },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14, gap: 12 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "space-between" },
  heading: { fontSize: 14, color: colors.ink, fontWeight: "700", flexShrink: 1 }, period: { fontSize: 10, color: colors.muted },
  hero: { backgroundColor: colors.soft, borderWidth: 1, borderColor: colors.brandBorder, borderRadius: 13, padding: 14, gap: 10 }, heroValue: { fontSize: 27, fontWeight: "700", color: colors.ink },
  gridRow: { flexDirection: "row", gap: 10 }, metric: { flex: 1, minWidth: 0, backgroundColor: colors.canvas, borderRadius: 12, padding: 12, gap: 8 },
  metricLabel: { fontSize: 12, lineHeight: 17, minHeight: 34, color: colors.muted },
  label: { fontSize: 12, color: colors.muted, flex: 1 }, value: { fontSize: 17, fontWeight: "700", color: colors.ink }, hint: { fontSize: 10, lineHeight: 15, color: colors.muted },
});
