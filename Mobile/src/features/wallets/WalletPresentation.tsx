import { BankSelect } from "../../components/BankSelect";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BottomSheet } from "../../components/BottomSheet";
import { Avatar, Icon } from "../../components/commerce";
import { Button, ErrorNotice, Field } from "../../components/ui";
import { colors as c } from "../../theme/tokens";
import { money, statusText } from "../../types/contracts";

type Balance = string | number;
type Bank = { bankName: string; maskedAccountNumber: string; accountName: string };
type WalletView = {
  availableBalance: Balance; pendingBalance: Balance; kycStatus: string;
  stores: { storeId: string; storeName: string; logoUrl?: string | null; availableBalance: Balance; pendingBalance: Balance; isActive: boolean }[];
  bankAccount?: Bank | null;
};

export function WalletPresentation({ wallet, editBank, mode = "summary" }: { wallet: WalletView; editBank(): void; mode?: "summary" | "bank" }) {
  const verified = wallet.kycStatus === "VERIFIED";
  return <View style={{ gap: 14 }}>
    {mode === "summary" && <><View style={[s.card, s.balance]}>
      <View style={s.row}><View style={s.inline}><Icon name="credit-card" size={18} color={c.strong} /><Text style={s.label}>Số dư khả dụng</Text></View><Text style={s.tag}>Ví thù lao</Text></View>
      <Text adjustsFontSizeToFit numberOfLines={1} style={s.total}>{money(wallet.availableBalance)}</Text>
      <View style={[s.row, s.divider]}><View style={s.inline}><Icon name="clock" size={14} color={c.muted} /><Text style={s.muted}>Đang bảo chứng</Text></View><Text style={s.amount}>{money(wallet.pendingBalance)}</Text></View>
    </View>
    <View style={s.row}><Text style={s.heading}>Nguồn hoa hồng</Text><Text style={s.muted}>{wallet.stores.length} gian hàng</Text></View>
    <View style={s.card}>{wallet.stores.length === 0 ? <Text style={s.muted}>Chưa có nguồn hoa hồng.</Text> : wallet.stores.map((store, index) => <View key={store.storeId} style={[{ gap: 12 }, index > 0 && s.storeDivider]}>
      <View style={s.inline}><Avatar uri={store.logoUrl} name={store.storeName} size={34} /><Text style={[s.heading, { flex: 1 }]}>{store.storeName}</Text>{!store.isActive && <Text style={s.tag}>Ngừng hợp tác</Text>}</View>
      <View style={s.row}><View style={s.column}><Text style={s.muted}>Khả dụng</Text><Text style={s.amount}>{money(store.availableBalance)}</Text></View><View style={[s.column, { alignItems: "flex-end" }]}><Text style={s.muted}>Bảo chứng</Text><Text style={[s.amount, { color: c.strong }]}>{money(store.pendingBalance)}</Text></View></View>
    </View>)}</View></>}
    {mode === "bank" && <View style={s.card}>
      <View style={s.row}><Text style={s.heading}>Tài khoản nhận tiền</Text><Pressable accessibilityRole="button" accessibilityLabel="Cập nhật tài khoản ngân hàng" onPress={editBank} style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}><Icon name="edit-2" size={18} color={c.strong} /></Pressable></View>
      {wallet.bankAccount ? <>
        <View style={s.inline}><View style={s.icon}><Icon name="credit-card" size={19} color={c.strong} /></View><Text style={[s.bank, { flex: 1 }]}>{wallet.bankAccount.bankName.split(" (")[0]}</Text></View>
        <Text style={s.account}>{wallet.bankAccount.maskedAccountNumber}</Text>
        <Text style={s.muted}>{wallet.bankAccount.accountName}</Text>
      </> : <Text style={s.muted}>Chưa liên kết tài khoản ngân hàng.</Text>}
      <View style={[s.row, s.divider]}><Text style={s.muted}>Hồ sơ KYC</Text><Text style={s.tag}>{verified ? "Đã xác minh" : statusText(wallet.kycStatus)}</Text></View>
    </View>}
  </View>;
}

export type BankInput = { bankName: string; bankAccountNumber: string; bankAccountName: string };
export function BankAccountSheet({ current, busy, error, close, save }: { current?: Bank | null; busy: boolean; error: unknown; close(): void; save(body: BankInput): void }) {
  const [bankName, setName] = useState(current?.bankName || "");
  const [bankAccountNumber, setNumber] = useState("");
  const [bankAccountName, setOwner] = useState(current?.accountName || "");
  const [localError, setError] = useState<Error | null>(null);
  const valid = bankName.trim().length > 0 && /^\d{6,30}$/.test(bankAccountNumber.trim()) && bankAccountName.trim().length > 0;
  return <BottomSheet title="Ngân hàng nhận hoa hồng" close={() => { if (!busy) close(); }}>
    <View style={s.intro}><View style={s.icon}><Icon name="credit-card" color={c.strong} /></View><View style={{ flex: 1, gap: 3 }}><Text style={s.heading}>{current ? "Cập nhật người thụ hưởng" : "Liên kết tài khoản chính chủ"}</Text><Text style={s.muted}>Dùng tài khoản ngân hàng khớp hồ sơ KYC.</Text></View></View>
    <BankSelect value={bankName} onChange={setName} disabled={busy} />
    <Field label="Số tài khoản *" value={bankAccountNumber} onChangeText={setNumber} placeholder="Nhập đầy đủ số tài khoản" keyboardType="number-pad" maxLength={30} editable={!busy} style={s.input} />
    {current && <Text style={s.hint}>Tài khoản hiện tại: {current.maskedAccountNumber}. Nhập lại số đầy đủ khi cập nhật.</Text>}
    <Field label="Tên chủ tài khoản *" value={bankAccountName} onChangeText={setOwner} placeholder="VD: NGUYEN VAN AN" autoCapitalize="characters" maxLength={150} editable={!busy} style={s.input} />
    <Text style={s.hint}>Thay đổi ngân hàng sẽ cần xác minh lại KYC trước khi rút tiền.</Text>
    <ErrorNotice error={localError || error} />
    <View style={[s.row, s.divider]}><View style={{ flex: 1 }}><Button title="Hủy" secondary disabled={busy} onPress={close} /></View><View style={{ flex: 2 }}><Button title="Lưu tài khoản" loading={busy} disabled={!valid} onPress={() => {
      if (!valid) { setError(new Error("Kiểm tra ngân hàng, số tài khoản 6–30 chữ số và tên chủ tài khoản.")); return; }
      setError(null); save({ bankName: bankName.trim(), bankAccountNumber: bankAccountNumber.trim(), bankAccountName: bankAccountName.trim().toUpperCase() });
    }} /></View></View>
  </BottomSheet>;
}

const s = StyleSheet.create({
  card: { backgroundColor: c.white, borderWidth: 1, borderColor: c.line, borderRadius: 18, padding: 16, gap: 10 },
  balance: { backgroundColor: c.soft, borderColor: c.brandBorder },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  inline: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { fontSize: 14, fontWeight: "600", color: c.ink },
  total: { fontSize: 32, lineHeight: 42, fontWeight: "800", color: c.ink, marginVertical: 5 },
  divider: { borderTopWidth: 1, borderTopColor: c.line, paddingTop: 12 },
  storeDivider: { borderTopWidth: 1, borderTopColor: c.line, paddingTop: 16, marginTop: 6 },
  heading: { fontSize: 14, lineHeight: 20, fontWeight: "700", color: c.ink },
  muted: { fontSize: 12, lineHeight: 18, color: c.muted },
  amount: { fontSize: 16, lineHeight: 23, fontWeight: "700", color: c.ink },
  column: { flex: 1, gap: 4 },
  icon: { width: 36, height: 36, backgroundColor: c.soft, borderRadius: 11, justifyContent: "center", alignItems: "center" },
  tag: { fontSize: 10, lineHeight: 15, color: c.strong, backgroundColor: c.white, borderColor: c.brandBorder, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  bank: { fontSize: 14, lineHeight: 21, color: c.ink, fontWeight: "600", marginTop: 4 },
  account: { fontSize: 19, lineHeight: 26, color: c.ink, fontWeight: "700" },
  edit: { minHeight: 44, borderRadius: 11, borderWidth: 1, borderColor: c.brandBorder, backgroundColor: c.soft, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4 },
  editText: { fontSize: 12, fontWeight: "600", color: c.ink },
  intro: { flexDirection: "row", alignItems: "center", gap: 10 },
  input: { minHeight: 46, paddingVertical: 10, fontSize: 14, backgroundColor: c.white },
  hint: { fontSize: 11, lineHeight: 17, color: c.muted },
});
