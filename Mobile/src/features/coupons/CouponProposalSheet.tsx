import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";
import { Icon } from "../../components/commerce";
import { Button, ErrorNotice } from "../../components/ui";
import { colors } from "../../theme/tokens";
import { useCommand } from "../common/shared";
import { useSuccessToast } from "../../components/SuccessToast";

const Proposal = z.object({
  storeId: z.string().uuid("Vui lòng chọn gian hàng."),
  code: z.string().trim().min(4, "Mã cần ít nhất 4 ký tự.").max(20, "Mã tối đa 20 ký tự.").regex(/^(?=.*[A-Z])[A-Z0-9]+$/, "Chỉ dùng chữ Latin và số; mã phải có chữ."),
  discountValue: z.coerce.number().min(1, "Mức giảm từ 1 đến 100%.").max(100, "Mức giảm không vượt 100%."),
  note: z.string().trim().min(1, "Hãy nhập mục đích sử dụng.").max(1000),
});

export function CouponProposalSheet({ stores, loading, error, retry, close }: {
  stores: readonly { id: string; name: string }[]; loading: boolean; error: unknown; retry(): void; close(): void;
}) {
  const insets = useSafeAreaInsets();
  const command = useCommand();
  const showSuccess = useSuccessToast();
  const [storeId, setStoreId] = useState("");
  const [choosing, setChoosing] = useState(false);
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const selected = stores.find(store => store.id === storeId);
  const submit = () => {
    const parsed = Proposal.safeParse({ storeId, code, discountValue: discount, note });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map(issue => [String(issue.path[0]), issue.message])));
      return;
    }
    setErrors({});
    void command.execute("/collaborator/coupons", "POST", { ...parsed.data, discountType: "PERCENTAGE", scopeType: "STORE_WIDE" }, () => { close(); showSuccess("Đã gửi đề xuất mã đến Shop"); });
  };
  return <Modal visible animationType="slide" onRequestClose={() => { if (!command.busy) close(); }}>
    <StatusBar style="dark" />
    <KeyboardAvoidingView style={[s.page, { paddingTop: insets.top }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.header}>
        <View style={s.heading}><View style={s.icon}><Icon name="tag" size={20} color={colors.strong} /></View><View style={{ flex: 1 }}><Text style={s.title}>Đề xuất mã độc quyền</Text><Text style={s.hint}>Gửi gian hàng xét duyệt</Text></View></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Đóng đề xuất" disabled={command.busy} onPress={close} style={s.close}><Icon name="x" size={22} /></Pressable>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
        <View style={s.card}>
          <Text style={s.label}>Gian hàng hợp tác *</Text>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: choosing }} disabled={command.busy || loading} onPress={() => setChoosing(!choosing)} style={s.selector}>
            <Icon name="shopping-bag" size={18} color={colors.strong} /><Text numberOfLines={2} style={s.selected}>{selected?.name || (loading ? "Đang tải gian hàng…" : "Chọn gian hàng")}</Text><Icon name={choosing ? "chevron-up" : "chevron-down"} size={18} color={colors.muted} />
          </Pressable>
          {choosing && stores.map(store => <Pressable accessibilityRole="radio" accessibilityState={{ checked: storeId === store.id }} key={store.id} disabled={command.busy} style={[s.option, storeId === store.id && s.active]} onPress={() => { setStoreId(store.id); setChoosing(false); }}><Text style={s.optionText}>{store.name}</Text><Icon name={storeId === store.id ? "check-circle" : "circle"} size={18} color={colors.strong} /></Pressable>)}
          {!loading && !error && !stores.length && <Text style={s.hint}>Bạn cần có gian hàng đã duyệt hợp tác để đề xuất mã.</Text>}
          <ErrorNotice error={error} retry={retry} />
          {errors.storeId && <Text style={s.error}>{errors.storeId}</Text>}
          <Text style={s.label}>Mã đề xuất *</Text>
          <TextInput accessibilityLabel="Mã đề xuất" editable={!command.busy} value={code} onChangeText={value => setCode(value.toUpperCase())} autoCapitalize="characters" autoCorrect={false} maxLength={20} placeholder="VD: YENNHI10" placeholderTextColor={colors.muted} style={s.input} />
          <Text style={s.hint}>4–20 ký tự, gồm chữ Latin và số, không có khoảng trắng.</Text>
          {errors.code && <Text style={s.error}>{errors.code}</Text>}
          <Text style={s.label}>Mức giảm đề xuất *</Text>
          <View style={s.percent}><TextInput accessibilityLabel="Mức giảm phần trăm" editable={!command.busy} value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" placeholder="VD: 10" placeholderTextColor={colors.muted} style={s.percentInput} /><Text style={s.percentSign}>%</Text></View>
          {errors.discountValue && <Text style={s.error}>{errors.discountValue}</Text>}
          <Text style={s.label}>Mục đích sử dụng *</Text>
          <TextInput accessibilityLabel="Mục đích sử dụng" editable={!command.busy} value={note} onChangeText={setNote} multiline maxLength={1000} placeholder="VD: Chia sẻ mã trong video review để khách nhập khi thanh toán." placeholderTextColor={colors.muted} textAlignVertical="top" style={[s.input, s.note]} />
          <Text style={[s.hint, { textAlign: "right" }]}>{note.length}/1000</Text>
          {errors.note && <Text style={s.error}>{errors.note}</Text>}
        </View>
        <View style={s.info}><Icon name="info" size={17} color={colors.strong} /><Text style={s.infoText}>Shop quyết định điều kiện và mức giảm cuối cùng. Mã chỉ sử dụng được sau khi được duyệt và kích hoạt; khách sao chép rồi nhập khi thanh toán.</Text></View>
        <ErrorNotice error={command.error} />
      </ScrollView>
      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}><Button title="Gửi đề xuất đến Shop" secondary loading={command.busy} disabled={loading || !stores.length || Boolean(error)} onPress={submit} /></View>
    </KeyboardAvoidingView>
  </Modal>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  heading: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  icon: { width: 38, height: 38, borderRadius: 11, backgroundColor: colors.soft, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontWeight: "700", color: colors.ink },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 14 },
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.line, gap: 8 },
  label: { fontSize: 13, fontWeight: "600", color: colors.ink, marginTop: 6 },
  selector: { minHeight: 50, padding: 12, flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 10 },
  selected: { flex: 1, fontSize: 13, color: colors.ink },
  option: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, minHeight: 46, borderRadius: 10, borderWidth: 1, borderColor: colors.line },
  optionText: { flex: 1, fontSize: 13, color: colors.ink }, active: { backgroundColor: colors.soft, borderColor: colors.brand },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, minHeight: 48, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.ink, backgroundColor: colors.white },
  hint: { fontSize: 11, lineHeight: 17, color: colors.muted },
  percent: { minHeight: 48, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingHorizontal: 12 },
  percentInput: { flex: 1, minHeight: 46, fontSize: 14, color: colors.ink }, percentSign: { fontSize: 15, color: colors.strong, fontWeight: "700" },
  note: { minHeight: 90 }, error: { fontSize: 12, color: colors.danger, lineHeight: 18 },
  info: { flexDirection: "row", gap: 8, padding: 12, backgroundColor: colors.soft, borderRadius: 12, borderWidth: 1, borderColor: colors.brandBorder },
  infoText: { flex: 1, fontSize: 11, lineHeight: 18, color: colors.muted },
  footer: { padding: 16, borderTopWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
});
