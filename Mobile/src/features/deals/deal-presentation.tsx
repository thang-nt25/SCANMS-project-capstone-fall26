import { StyleSheet, Text, View } from "react-native";
import { ProductPhoto } from "../../components/ProductPhoto";
import { colors as c } from "../../theme/tokens";
import type { Deal } from "../../types/contracts";

export function dealScope(deal: Pick<Deal, "scopeType" | "scopeProducts">) {
  return deal.scopeType === "STORE_WIDE" ? "Toàn gian hàng" : deal.scopeType === "SELECTED_PRODUCTS" ? `Nhóm ${deal.scopeProducts?.length || "nhiều"} sản phẩm` : "Một sản phẩm";
}
export const dealDate = (value?: string | null) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "Chưa bắt đầu";
export function DealProduct({ title, imageUrl, store, subtitle }: { title: string; imageUrl?: string | null; store?: string | null; subtitle?: string }) {
  return <View style={d.row}><ProductPhoto uri={imageUrl} resizeMode="contain" style={d.photo} /><View style={d.flex}><Text numberOfLines={2} style={d.name}>{title}</Text>{store && <Text numberOfLines={1} style={d.note}>{store}</Text>}{subtitle && <Text style={d.tiny}>{subtitle}</Text>}</View></View>;
}
export function DealMetric({ label, value }: { label: string; value: string }) {
  return <View style={d.metric}><Text style={d.tiny}>{label}</Text><Text style={d.value}>{value}</Text></View>;
}
export const d = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  flex: { flex: 1, minWidth: 0, gap: 5 },
  card: { marginHorizontal: 12, marginVertical: 6, padding: 13, gap: 12, borderRadius: 16, borderWidth: 1, borderColor: c.line, backgroundColor: c.white },
  photo: { width: 62, height: 68, borderRadius: 10, borderWidth: 1, borderColor: c.line, backgroundColor: c.white },
  name: { fontSize: 14, lineHeight: 20, color: c.ink, fontWeight: "700" },
  note: { fontSize: 12, lineHeight: 18, color: c.muted },
  tiny: { fontSize: 11, lineHeight: 16, color: c.muted },
  metric: { flex: 1, minWidth: 0, gap: 5, padding: 10, borderRadius: 10, backgroundColor: c.canvas },
  value: { fontSize: 14, lineHeight: 20, color: c.ink, fontWeight: "700" },
  section: { backgroundColor: c.white, borderWidth: 1, borderColor: c.line, borderRadius: 14, padding: 13, gap: 12 },
  soft: { backgroundColor: c.soft, borderColor: c.brandBorder, borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 },
  divider: { borderTopWidth: 1, borderColor: c.line, paddingTop: 10, gap: 8 },
  action: { minHeight: 44, justifyContent: "center", alignItems: "center", flexDirection: "row", gap: 7, borderRadius: 10, borderWidth: 1, borderColor: c.brandBorder, backgroundColor: c.soft, paddingHorizontal: 12 },
  actionText: { fontSize: 12, fontWeight: "600", color: c.ink },
});
