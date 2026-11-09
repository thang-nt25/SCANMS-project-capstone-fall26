import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { BottomSheet } from "../../components/BottomSheet";
import { Icon } from "../../components/commerce";
import { Button, ErrorNotice, Field } from "../../components/ui";
import { money } from "../../types/contracts";
import { profileStyles as s } from "../account/profile-styles";
import { colors as c } from "../../theme/tokens";
type LedgerRow = { id: string; transactionType: string; balanceBucket?: string; amount: string | number; balanceBefore: string | number; balanceAfter: string | number; createdAt: string; referenceDetails?: { storeName?: string | null; orderCode?: string | null } | null };
const ledgerNames: Record<string, string> = { COMMISSION_PENDING: "Hoa hồng tạm giữ", COMMISSION_APPROVED: "Giải tỏa hoa hồng", PAYOUT_WITHDRAW: "Giữ tiền cho yêu cầu rút", REVERSAL: "Điều chỉnh thu hồi", PAYOUT_REJECT_REFUND: "Hoàn tiền yêu cầu rút" };
const bucketNames: Record<string, string> = { AVAILABLE: "Khả dụng", PENDING: "Bảo chứng", SHOPPING: "Mua sắm" };
export function WalletLedgerRow({ item, last = false }: { item: LedgerRow; last?: boolean }) {
  const [detail, setDetail] = useState(false);
  const increase = Number(item.amount) > 0;
  const time = new Date(item.createdAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
  return <><Pressable accessibilityRole="button" accessibilityLabel="Xem chi tiết biến động số dư" onPress={() => setDetail(true)} style={{ padding: 12, gap: 6, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.line }}>
    <View style={[s.row, { alignItems: "flex-start" }]}>
      <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: c.soft, alignItems: "center", justifyContent: "center" }}><Icon name={increase ? "arrow-down-left" : "arrow-up-right"} size={16} color={c.strong} /></View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}><Text style={s.label}>{ledgerNames[item.transactionType] || "Biến động số dư"}</Text><Text style={[s.note, { fontSize: 10 }]}>{time}</Text></View>
      <Text style={[s.label, { fontSize: 15, flexShrink: 1, textAlign: "right", color: increase ? c.strong : c.ink }]}>{increase ? "+" : ""}{money(item.amount)}</Text>
    </View>
    <Text style={[s.note, { fontSize: 10, marginLeft: 40 }]}>{item.balanceBucket ? bucketNames[item.balanceBucket] || item.balanceBucket : "Số dư ví"}{item.referenceDetails?.storeName ? ` · ${item.referenceDetails.storeName}` : ""}</Text>
  </Pressable>{detail && <BottomSheet title="Chi tiết giao dịch" close={() => setDetail(false)}><Text style={s.label}>{ledgerNames[item.transactionType] || "Biến động số dư"}</Text><Text style={s.label}>{increase ? "+" : ""}{money(item.amount)}</Text><Text style={s.note}>{time}</Text><Text style={s.note}>Số dư {item.balanceBucket ? bucketNames[item.balanceBucket] || item.balanceBucket : "ví"}: {money(item.balanceBefore)} → {money(item.balanceAfter)}</Text>{item.referenceDetails?.storeName && <Text style={s.label}>{item.referenceDetails.storeName}</Text>}{item.referenceDetails?.orderCode && <Text selectable style={s.note}>Đơn hàng: {item.referenceDetails.orderCode}</Text>}<Text selectable style={s.note}>Mã giao dịch: {item.id}</Text></BottomSheet>}</>;
}

type Source = { storeId: string; storeName: string; availableBalance: string | number; isActive: boolean };
export function WithdrawSheet({ stores, storeId, setStoreId, value, setValue, minimum, policy, canWithdraw, busy, error, close, submit }: { stores: Source[]; storeId: string; setStoreId(id: string): void; value: string; setValue(value: string): void; minimum: string | number; policy: { threshold: number; rate: number }; canWithdraw: boolean; busy: boolean; error: unknown; close(): void; submit(): void }) {
  const [picker, setPicker] = useState(false);
  const selected = stores.find(store => store.storeId === storeId);
  const gross = Number(value), valid = /^\d{1,13}(\.\d{1,2})?$/.test(value) && gross >= Number(minimum) && !!selected?.isActive && gross <= Number(selected.availableBalance);
  const tax = Number.isFinite(gross) && gross >= policy.threshold ? Math.round(gross * policy.rate * 100) / 100 : 0;
  return <BottomSheet title="Rút hoa hồng" close={() => { if (!busy) close(); }}>
    <Pressable accessibilityRole="button" disabled={busy} onPress={() => setPicker(true)} style={[s.card, s.row, { padding: 12 }]}><View style={s.icon}><Icon name="shopping-bag" color={c.strong} size={18} /></View><View style={{ flex: 1 }}><Text style={s.note}>Nguồn hoa hồng</Text><Text style={s.label}>{selected?.storeName || "Chọn gian hàng"}</Text>{selected && <Text style={s.note}>Khả dụng: {money(selected.availableBalance)}</Text>}</View><Icon name="chevron-down" size={17} color={c.muted} /></Pressable>
    <Field label="Số tiền muốn rút (VNĐ) *" value={value} onChangeText={setValue} keyboardType="decimal-pad" placeholder={`Tối thiểu ${money(minimum)}`} editable={!busy} style={s.input} />
    <View style={s.row}><Text style={[s.note, { flex: 1 }]}>Tối thiểu {money(minimum)}</Text><Pressable disabled={busy || !selected} onPress={() => selected && setValue(String(selected.availableBalance))} style={{ minHeight: 44, justifyContent: "center" }}><Text style={[s.label, { color: c.strong }]}>Rút toàn bộ</Text></Pressable></View>
    <View style={[s.card, { backgroundColor: c.soft, borderColor: c.brandBorder }]}>
      <View style={s.row}><Text style={s.note}>Yêu cầu rút</Text><Text style={s.label}>{money(Number.isFinite(gross) ? gross : 0)}</Text></View>
      <View style={s.row}><Text style={s.note}>Thuế dự tính</Text><Text style={s.label}>{money(tax)}</Text></View>
      <View style={[s.row, s.line]}><Text style={s.label}>Thực nhận dự tính</Text><Text style={[s.title, { color: c.strong }]}>{money(Number.isFinite(gross) ? gross - tax : 0)}</Text></View>
    </View>
    <Text style={s.note}>Yêu cầu sẽ chờ bộ phận vận hành duyệt. Số tiền và thuế chính thức được xác nhận khi tạo lệnh.</Text>
    {value !== "" && !valid && <Text style={[s.note, { color: c.danger }]}>Nhập số tiền từ mức tối thiểu và không vượt khả dụng của gian hàng đã chọn.</Text>}
    <ErrorNotice error={error} />
    <View style={s.row}><View style={{ flex: 1 }}><Button title="Hủy" secondary disabled={busy} onPress={close} /></View><View style={{ flex: 2 }}><Button title="Gửi yêu cầu rút" loading={busy} disabled={!valid || !canWithdraw} onPress={submit} /></View></View>
    {picker && <BottomSheet title="Chọn nguồn hoa hồng" close={() => setPicker(false)}>{stores.filter(item => item.isActive).map(item => <Pressable key={item.storeId} accessibilityRole="radio" accessibilityState={{ checked: item.storeId === storeId }} onPress={() => { setStoreId(item.storeId); setPicker(false); }} style={[s.card, s.row]}><View style={{ flex: 1 }}><Text style={s.label}>{item.storeName}</Text><Text style={s.note}>Khả dụng: {money(item.availableBalance)}</Text></View><Icon name={item.storeId === storeId ? "check-circle" : "circle"} size={18} color={c.strong} /></Pressable>)}</BottomSheet>}
  </BottomSheet>;
}
