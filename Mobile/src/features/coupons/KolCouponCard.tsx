import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "../../components/commerce";
import { colors } from "../../theme/tokens";
import { money, statusText } from "../../types/contracts";

export function KolCouponCard({ coupon, copied, busy, copy, toggle }: {
  coupon: { code?: string; displayCode?: string; status?: string; discountType: string; discountValue?: string | number | null; minimumOrderAmount?: string | number | null; maximumDiscountAmount?: string | number | null; expiresAt?: string | null; store?: { name: string } | null };
  copied: boolean; busy: boolean; copy(): void; toggle(): void;
}) {
  const [expanded, setExpanded] = useState(false);
  const actionable = ["ACTIVE", "PAUSED"].includes(coupon.status || "");
  return <View style={s.card}>
    <View style={s.top}><View style={s.icon}><Icon name="tag" size={20} color={colors.strong} /></View><View style={{ flex: 1, gap: 4 }}><Text selectable style={s.code}>{coupon.code || coupon.displayCode || "Đang cấp mã"}</Text><Text numberOfLines={1} style={s.store}>{coupon.store?.name || "Gian hàng đối tác"}</Text></View></View>
    <View style={s.benefit}><View style={{ flex: 1 }}><Text style={s.discount}>{coupon.discountValue == null ? "Chờ duyệt mức giảm" : coupon.discountType === "PERCENTAGE" ? `Giảm ${coupon.discountValue}%` : `Giảm ${money(coupon.discountValue)}`}</Text><Text style={s.small}>Mã độc quyền của bạn</Text></View><View style={s.badge}><Text style={s.status}>{coupon.status ? statusText(coupon.status) : "Chưa rõ trạng thái"}</Text></View></View>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} style={s.detailsTrigger}><View style={s.row}><Icon name="info" size={14} color={colors.muted} /><Text style={s.detailLabel}>Điều kiện áp dụng</Text></View><Icon name={expanded ? "chevron-up" : "chevron-down"} size={16} color={colors.muted} /></Pressable>
    {expanded && <View style={s.details}>
      <Detail label="Đơn tối thiểu" value={coupon.minimumOrderAmount === undefined ? "Chưa ghi nhận" : coupon.minimumOrderAmount === null || Number(coupon.minimumOrderAmount) === 0 ? "Không yêu cầu" : money(coupon.minimumOrderAmount)} />
      <Detail label="Giảm tối đa" value={coupon.maximumDiscountAmount === undefined ? "Chưa ghi nhận" : coupon.maximumDiscountAmount === null ? "Không giới hạn" : money(coupon.maximumDiscountAmount)} />
      <Detail label="Hạn sử dụng" value={coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString("vi-VN") : "Chưa đặt hạn"} />
      <Text style={s.small}>Khách sao chép mã và nhập khi thanh toán.</Text>
    </View>}
    <View style={s.actions}>
      <Pressable accessibilityRole="button" disabled={busy || !(coupon.code || coupon.displayCode)} onPress={copy} style={[s.action, s.primary, busy && s.disabled]}><Icon name={copied ? "check" : "copy"} size={15} color={colors.strong} /><Text style={s.actionText}>{copied ? "Đã sao chép" : "Sao chép mã"}</Text></Pressable>
      {actionable && <Pressable accessibilityRole="button" disabled={busy} onPress={toggle} style={[s.action, busy && s.disabled]}><Icon name={coupon.status === "ACTIVE" ? "pause" : "play"} size={15} color={colors.muted} /><Text style={s.actionText}>{coupon.status === "ACTIVE" ? "Tạm dừng" : "Tiếp tục"}</Text></Pressable>}
    </View>
  </View>;
}
function Detail({ label, value }: { label: string; value: string }) { return <View style={s.detailRow}><Text style={s.small}>{label}</Text><Text style={s.detailValue}>{value}</Text></View>; }
const s = StyleSheet.create({
  card: { padding: 13, gap: 11, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 16 },
  top: { flexDirection: "row", alignItems: "center", gap: 10 }, icon: { width: 38, height: 38, borderRadius: 11, backgroundColor: colors.soft, alignItems: "center", justifyContent: "center" },
  code: { fontSize: 16, fontWeight: "700", color: colors.ink }, store: { fontSize: 11, color: colors.muted },
  benefit: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line },
  discount: { fontSize: 21, fontWeight: "700", color: colors.strong }, small: { fontSize: 11, lineHeight: 17, color: colors.muted },
  badge: { flexShrink: 1, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: colors.soft, borderWidth: 1, borderColor: colors.brandBorder }, status: { fontSize: 10, color: colors.strong, fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center", gap: 6 }, detailsTrigger: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 32 }, detailLabel: { fontSize: 12, color: colors.muted },
  details: { padding: 10, gap: 7, backgroundColor: colors.canvas, borderRadius: 10 }, detailRow: { flexDirection: "row", justifyContent: "space-between", gap: 10 }, detailValue: { flexShrink: 1, textAlign: "right", fontSize: 11, lineHeight: 17, color: colors.ink },
  actions: { flexDirection: "row", gap: 8 }, action: { flex: 1, minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 10, borderWidth: 1, borderColor: colors.line }, primary: { backgroundColor: colors.soft, borderColor: colors.brandBorder }, actionText: { fontSize: 12, fontWeight: "600", color: colors.ink }, disabled: { opacity: 0.5 },
});
