import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { BottomSheet } from "../../components/BottomSheet";
import { BankSelect } from "../../components/BankSelect";
import { ProductPhoto } from "../../components/ProductPhoto";
import { Icon, type IconName } from "../../components/commerce";
import { Button, ErrorNotice, Field, Screen } from "../../components/ui";
import { colors as c } from "../../theme/tokens";
import { statusText } from "../../types/contracts";
import { useOperation } from "../../hooks/useOperation";
import { validateInput } from "../../utils/validate-input";
import { WarehouseEditor, WarehouseLocation } from "./WarehouseEditor";
import { QueryState, required, useCommand, useResource, type CommandFormSpec } from "../common/shared";
import { MediaPicker } from "../common/MediaPicker";
const Store = z.object({
  id: z.string(), name: z.string(), logoUrl: z.string().nullish(), description: z.string().nullish(), categoryName: z.string().nullish(),
  policyReturn: z.string().nullish(), policyWarranty: z.string().nullish(), policyShipping: z.string().nullish(), onboardingStatus: z.string().optional(),
  owner: z.object({ fullName: z.string().nullish(), phoneNumber: z.string().nullish(), email: z.string().nullish() }).nullish(),
  onboardingData: z.object({
    companyName: z.string().nullish(), contactPhone: z.string().nullish(), contactEmail: z.string().nullish(), warehouseAddress: z.string().nullish(),
    businessName: z.string().nullish(), registeredBusinessName: z.string().nullish(), representativeName: z.string().nullish(), businessType: z.string().nullish(), taxCode: z.string().nullish(),
    warehouseLocation: WarehouseLocation.nullish(), returnWarehouseLocation: WarehouseLocation.nullish(), businessAddress: z.string().nullish(), returnWarehouseAddress: z.string().nullish(),
    payoutBankName: z.string().nullish(), payoutBankAccountNumber: z.string().nullish(), payoutBankAccountName: z.string().nullish(),
  }).nullish(),
});
type Form = CommandFormSpec & { kind: "info" | "policy" | "bank" };
export function ShopSettingsScreen() {
  const result = useResource("shop-settings", "/stores/my-store", Store), command = useCommand();
  const [form, setForm] = useState<Form | null>(null), [warehouseOpen, setWarehouseOpen] = useState(false);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const item = result.data, data = item?.onboardingData;
  const edit = (kind: Form["kind"]) => {
    if (!item) return;
    const common = { kind, path: "/stores/my-store", method: "PUT" };
    if (kind === "info") setForm({ ...common, title: "Thông tin gian hàng", fields: [
      { key: "name", label: "Tên gian hàng *", initial: item.name },
      { key: "description", label: "Giới thiệu", initial: item.description || "", multiline: true },
      { key: "contactPhone", label: "Hotline *", initial: data?.contactPhone || item.owner?.phoneNumber || "" },
      { key: "contactEmail", label: "Email liên hệ *", initial: data?.contactEmail || item.owner?.email || "" },
      { key: "companyName", label: "Tên doanh nghiệp / hộ kinh doanh", initial: data?.companyName !== undefined ? data.companyName || "" : data?.businessName || data?.registeredBusinessName || "" },
      { key: "representativeName", label: "Người đại diện *", initial: data?.representativeName || item.owner?.fullName || "" },
      { key: "businessType", label: "Loại hình kinh doanh *", initial: data?.businessType || "", options: [
        { value: "INDIVIDUAL", label: "Cá nhân" }, { value: "HOUSEHOLD", label: "Hộ kinh doanh" }, { value: "ENTERPRISE", label: "Doanh nghiệp" },
      ] },
      { key: "taxCode", label: "Mã số thuế *", initial: data?.taxCode || "" },
      { key: "businessAddress", label: "Địa chỉ đăng ký kinh doanh *", initial: data?.businessAddress || "", multiline: true },
    ], schema: z.object({
      name: required.max(200), description: z.string().trim().max(5000), companyName: z.string().trim().max(200),
      contactPhone: required.regex(/^\+?[0-9().\-\s]{8,20}$/, "Hotline không hợp lệ."), contactEmail: z.string().trim().email("Email liên hệ không hợp lệ.").max(255),
      representativeName: required.max(150), businessType: z.enum(["INDIVIDUAL", "HOUSEHOLD", "ENTERPRISE"], { message: "Chọn loại hình kinh doanh." }),
      taxCode: required.max(30), businessAddress: required.max(500),
    }) });
    if (kind === "policy") setForm({ ...common, title: "Chính sách bán hàng", fields: [
      { key: "policyShipping", label: "Vận chuyển", initial: item.policyShipping || "", multiline: true },
      { key: "policyReturn", label: "Đổi trả *", initial: item.policyReturn || "", multiline: true },
      { key: "policyWarranty", label: "Bảo hành *", initial: item.policyWarranty || "", multiline: true },
    ], schema: z.object({ policyShipping: z.string().max(500), policyReturn: required.max(500), policyWarranty: required.max(500) }) });
    if (kind === "bank") setForm({ ...common, title: "Tài khoản ngân hàng Shop", fields: [
      { key: "payoutBankName", label: "Ngân hàng *", initial: data?.payoutBankName || "" },
      { key: "payoutBankAccountNumber", label: "Số tài khoản *", initial: data?.payoutBankAccountNumber || "", numeric: true },
      { key: "payoutBankAccountName", label: "Chủ tài khoản *", initial: data?.payoutBankAccountName || "" },
    ], schema: z.object({ payoutBankName: required.max(100), payoutBankAccountNumber: required.regex(/^\d{6,34}$/, "Nhập số tài khoản gồm 6–34 chữ số."), payoutBankAccountName: required.max(150) }) });
  };
  return <Screen scroll>
    <QueryState loading={result.isLoading} error={result.error} retry={() => void result.refetch()} />
    {item && <>
      <View style={s.hero}>
        <ProductPhoto uri={item.logoUrl} style={{ width: 44, height: 44, borderRadius: 12 }} resizeMode="contain" />
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text numberOfLines={2} style={[s.title, { flexShrink: 1 }]}>{item.name}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Trạng thái gian hàng: ${statusText(item.onboardingStatus || "PENDING")}`} onPress={() => setVerificationOpen(true)} style={{ width: 32, minHeight: 44, alignItems: "center", justifyContent: "center" }}>
              <Icon name={item.onboardingStatus === "VERIFIED" ? "check-circle" : "shield"} size={17} color={c.strong} />
            </Pressable>
          </View>
          <Text numberOfLines={1} style={s.small}>{item.categoryName || "Chưa bổ sung ngành hàng"}</Text>
        </View>
      </View>
      <View style={s.group}>
        <SettingRow icon="edit-3" title="Thông tin & liên hệ" subtitle={data?.contactPhone || "Tên Shop, giới thiệu, hotline, email"} onPress={() => edit("info")} />
        <MediaPicker label="Đổi logo" hideHint disabled={command.busy} onUploaded={logoUrl => void command.execute("/stores/my-store", "PUT", { logoUrl })} renderTrigger={(open, busy) => <SettingRow icon="camera" title="Logo gian hàng" subtitle={busy ? "Đang tải ảnh…" : "Ảnh JPG, PNG · tối đa 5 MB"} onPress={open} disabled={busy} />} />
        <SettingRow icon="map-pin" title="Kho hàng & bản đồ" subtitle={data?.warehouseAddress || "Thiết lập kho xuất và kho nhận trả"} onPress={() => setWarehouseOpen(true)} />
        <SettingRow icon="file-text" title="Chính sách bán hàng" subtitle="Vận chuyển · Đổi trả · Bảo hành" onPress={() => edit("policy")} last />
      </View>
      <View style={s.group}><SettingRow icon="credit-card" title="Tài khoản ngân hàng Shop" subtitle={data?.payoutBankName ? `${data.payoutBankName} · ••••${data.payoutBankAccountNumber?.slice(-4) || ""}` : "Chưa bổ sung tài khoản"} onPress={() => edit("bank")} last /></View>
    </>}
    <ErrorNotice error={command.error} />
    {verificationOpen && <BottomSheet title="Xác minh gian hàng" close={() => setVerificationOpen(false)}><View style={s.row}><Icon name="shield" size={20} color={c.strong} /><Text style={s.name}>{statusText(item?.onboardingStatus || "PENDING")}</Text></View><Button title="Đóng" secondary onPress={() => setVerificationOpen(false)} /></BottomSheet>}
    {warehouseOpen && <WarehouseEditor data={data} close={() => setWarehouseOpen(false)} />}
    {form && <SettingsForm spec={form} close={() => setForm(null)} />}
  </Screen>;
}
function SettingRow({ icon, title, subtitle, onPress, disabled, last }: { icon: IconName; title: string; subtitle: string; onPress(): void; disabled?: boolean; last?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[s.setting, !last && { borderBottomWidth: 1, borderBottomColor: c.line }, disabled && { opacity: .6 }]}><View style={s.icon}><Icon name={icon} size={19} color={c.strong} /></View><View style={{ flex: 1, gap: 4 }}><Text style={s.name}>{title}</Text><Text numberOfLines={2} style={s.small}>{subtitle}</Text></View><Icon name="chevron-right" size={17} color={c.muted} /></Pressable>;
}
function SettingsForm({ spec, close }: { spec: Form; close(): void }) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(spec.fields.map(field => [field.key, field.initial || ""])));
  const [tab, setTab] = useState(0);
  const command = useCommand(), local = useOperation(), busy = command.busy || local.busy;
  const tabs = spec.kind === "info" ? ["Gian hàng", "Liên hệ", "Pháp lý"] : spec.kind === "policy" ? ["Vận chuyển", "Đổi trả", "Bảo hành"] : [];
  const infoTab = (key: string) => ["name", "description"].includes(key) ? 0 : ["contactPhone", "contactEmail"].includes(key) ? 1 : 2;
  const fields = spec.fields.filter((field, index) => spec.kind === "info" ? infoTab(field.key) === tab : spec.kind === "policy" ? index === tab : true);
  const submit = () => void local.run(async () => {
    const parsed = spec.schema.safeParse(values);
    if (!parsed.success) {
      const key = String(parsed.error.issues[0]?.path[0]);
      if (spec.kind === "info") setTab(infoTab(key));
      if (spec.kind === "policy") setTab(Math.max(0, spec.fields.findIndex(field => field.key === key)));
    }
    await command.execute(spec.path, spec.method || "PUT", validateInput(spec.schema, values), close);
  });
  return <BottomSheet title={spec.title} close={() => { if (!busy) close(); }}>
    {!!tabs.length && <View style={s.row}>{tabs.map((label, index) => <Pressable key={label} disabled={busy} accessibilityRole="tab" accessibilityState={{ selected: tab === index }} onPress={() => setTab(index)} style={[s.tab, tab === index && s.active]}><Text style={[s.small, { color: c.ink, fontWeight: "600" }]}>{label}</Text></Pressable>)}</View>}
    {spec.kind === "bank" && <View style={s.note}><Icon name="credit-card" size={18} color={c.strong} /><Text style={[s.small, { flex: 1 }]}>Thông tin tài khoản của Shop; không tự kết nối hoặc chuyển tiền.</Text></View>}
    {spec.kind === "info" && <View style={s.sectionHeading}><View style={s.icon}><Icon name={tab === 0 ? "shopping-bag" : tab === 1 ? "phone" : "file-text"} size={18} color={c.strong} /></View><View style={{ flex: 1 }}><Text style={s.name}>{["Thông tin hiển thị", "Kết nối với Shop", "Hồ sơ kinh doanh"][tab]}</Text><Text style={s.small}>{["Tên và giới thiệu gian hàng", "Hotline và email liên hệ", "Thông tin theo hồ sơ đăng ký"][tab]}</Text></View></View>}
    <View style={spec.kind === "info" ? s.formGroup : undefined}>
    {fields.map(field => field.key === "payoutBankName" ? <BankSelect key={field.key} value={values[field.key]} disabled={busy} onChange={value => setValues(old => ({ ...old, [field.key]: value }))} /> : field.options ? <View key={field.key} style={{ gap: 8 }}><Text style={s.fieldLabel}>{field.label}</Text><View style={{ flexDirection: "row", gap: 6 }}>{field.options.map(option => <Pressable key={option.value} disabled={busy} accessibilityRole="radio" accessibilityState={{ checked: values[field.key] === option.value }} onPress={() => setValues(old => ({ ...old, [field.key]: option.value }))} style={[s.choice, values[field.key] === option.value && s.active]}><Text style={{ fontSize: 12, lineHeight: 17, textAlign: "center", color: c.ink }}>{option.label}</Text><Icon name={values[field.key] === option.value ? "check-circle" : "circle"} size={17} color={c.strong} /></Pressable>)}</View></View> : <View key={field.key} style={{ gap: 5 }}><Field label={field.label} value={values[field.key]} placeholder={field.key === "companyName" ? "Không bắt buộc với Shop cá nhân" : field.label.replace(" *", "")} multiline={field.multiline} keyboardType={field.numeric || field.key === "contactPhone" ? "phone-pad" : field.key === "contactEmail" ? "email-address" : "default"} autoCapitalize={field.key === "contactEmail" ? "none" : field.key === "payoutBankAccountName" ? "characters" : "sentences"} maxLength={spec.kind === "policy" || field.key === "businessAddress" ? 500 : field.key === "description" ? 5000 : field.key === "taxCode" ? 30 : field.key === "contactPhone" ? 20 : field.key === "contactEmail" ? 255 : field.key === "representativeName" ? 150 : 200} editable={!busy} onChangeText={value => setValues(old => ({ ...old, [field.key]: value }))} style={{ minHeight: field.multiline ? (spec.kind === "policy" ? 140 : 96) : 46, fontSize: 14 }} />{spec.kind === "policy" && <Text style={[s.small, { textAlign: "right" }]}>{values[field.key].length}/500</Text>}</View>)}
    </View>
    <ErrorNotice error={local.error || command.error} />
    <View style={s.footer}><View style={{ flex: 1 }}><Button title="Hủy" secondary disabled={busy} onPress={close} /></View><View style={{ flex: 2 }}><Button title="Lưu thay đổi" soft loading={busy} onPress={submit} /></View></View>
  </BottomSheet>;
}
const s = StyleSheet.create({
  hero: { padding: 14, gap: 12, flexDirection: "row", alignItems: "center", borderRadius: 16, borderWidth: 1, borderColor: c.line, backgroundColor: c.white },
  title: { fontSize: 15, lineHeight: 20, fontWeight: "700", color: c.ink }, name: { fontSize: 14, fontWeight: "600", color: c.ink }, small: { fontSize: 12, lineHeight: 18, color: c.muted },
  row: { flexDirection: "row", gap: 10, alignItems: "center" }, group: { backgroundColor: c.white, borderWidth: 1, borderColor: c.line, borderRadius: 16, paddingHorizontal: 12 },
  setting: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 15, minHeight: 76 }, icon: { width: 38, height: 38, borderRadius: 12, backgroundColor: c.soft, alignItems: "center", justifyContent: "center" },
  tab: { flex: 1, minHeight: 44, borderRadius: 10, backgroundColor: c.white, borderWidth: 1, borderColor: c.line, alignItems: "center", justifyContent: "center" }, active: { borderColor: c.strong, backgroundColor: c.soft },
  note: { flexDirection: "row", gap: 10, padding: 12, borderRadius: 12, backgroundColor: c.soft }, footer: { flexDirection: "row", gap: 10, paddingTop: 12, borderTopWidth: 1, borderColor: c.line },
  sectionHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  formGroup: { padding: 12, gap: 14, borderWidth: 1, borderColor: c.line, borderRadius: 14, backgroundColor: c.canvas },
  fieldLabel: { color: c.ink, fontSize: 13, fontWeight: "600" },
  choice: { flex: 1, minHeight: 62, paddingHorizontal: 5, paddingVertical: 8, justifyContent: "center", alignItems: "center", gap: 5, borderRadius: 10, borderWidth: 1, borderColor: c.line, backgroundColor: c.white },
});
