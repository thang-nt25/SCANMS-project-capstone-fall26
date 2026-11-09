import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Icon } from "../../components/commerce";
import { Button, ErrorNotice, Field } from "../../components/ui";
import { AddressInput, type Address } from "../customer/customer-contracts";
import { useCommand } from "../common/shared";
import { validateInput } from "../../utils/validate-input";
import { colors as c } from "../../theme/tokens";
import { RegionPicker } from "./RegionPicker";
import { AddressMap } from "./AddressMap";
export function AddressEditor({ initial, close }: { initial: Partial<Address>; close(): void }) {
  const [value, setValue] = useState(initial), [tab, setTab] = useState(0);
  const command = useCommand();
  const addressLabel = [value.detailAddress, value.wardName, value.districtName, value.provinceName].filter(Boolean).join(", ");
  const ready = AddressInput.safeParse(value).success;
  return <Modal visible animationType="slide" onRequestClose={() => { if (!command.busy) close(); }}>
    <StatusBar style="dark" /><SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }}>
      <View style={{ minHeight: 56, paddingHorizontal: 16, backgroundColor: c.white, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderColor: c.line }}><Text style={{ flex: 1, fontSize: 18, color: c.ink, fontWeight: "700" }}>{value.id ? "Sửa địa chỉ" : "Thêm địa chỉ"}</Text><Pressable accessibilityRole="button" accessibilityLabel="Đóng địa chỉ" disabled={command.busy} onPress={close} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}><Icon name="x" size={20} color={c.muted} /></Pressable></View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}><View style={{ flexDirection: "row", gap: 8, padding: 12 }}>{["1. Địa chỉ", "2. Bản đồ"].map((label, i) => <Pressable key={label} accessibilityRole="tab" accessibilityState={{ selected: tab === i }} onPress={() => setTab(i)} style={{ flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: tab === i ? c.brandBorder : c.line, backgroundColor: tab === i ? c.soft : c.white, borderRadius: 12 }}><Text style={{ color: c.ink, fontSize: 13, fontWeight: tab === i ? "600" : "400" }}>{label}</Text></Pressable>)}</View>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" style={{ flex: 1 }} contentContainerStyle={{ padding: 12, paddingTop: 0, paddingBottom: 16, gap: 12 }}>
        {tab === 0 ? <View style={{ padding: 14, borderWidth: 1, borderColor: c.line, borderRadius: 16, backgroundColor: c.white, gap: 12 }}>
          <Field label="Người nhận *" placeholder="Họ và tên" value={value.fullName || ""} maxLength={150} editable={!command.busy} onChangeText={fullName => setValue({ ...value, fullName })} style={{ minHeight: 46, fontSize: 14 }} />
          <Field label="Điện thoại *" placeholder="Số điện thoại nhận hàng" keyboardType="phone-pad" value={value.phoneNumber || ""} maxLength={16} editable={!command.busy} onChangeText={phoneNumber => setValue({ ...value, phoneNumber })} style={{ minHeight: 46, fontSize: 14 }} />
          <RegionPicker value={value} onChange={setValue} disabled={command.busy} />
          <Field label="Số nhà, đường *" placeholder="VD: 15 Lê Duẩn, tòa nhà, tầng…" value={value.detailAddress || ""} maxLength={500} editable={!command.busy} onChangeText={detailAddress => setValue({ ...value, detailAddress, latitude: null, longitude: null })} style={{ minHeight: 46, fontSize: 14 }} />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><Text style={{ color: c.ink, fontSize: 13 }}>Địa chỉ mặc định</Text><Switch disabled={command.busy} value={value.isDefault || false} trackColor={{ true: c.brand, false: c.line }} onValueChange={isDefault => setValue({ ...value, isDefault })} /></View>
        </View> : <View style={{ padding: 14, borderWidth: 1, borderColor: c.line, borderRadius: 16, backgroundColor: c.white, gap: 12 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Sửa địa chỉ nhận hàng" onPress={() => setTab(0)} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 12, backgroundColor: c.soft }}><Icon name="map-pin" size={18} color={c.strong} /><View style={{ flex: 1, gap: 3 }}><Text style={{ fontSize: 11, color: c.muted }}>Địa chỉ nhận hàng</Text><Text numberOfLines={2} style={{ fontSize: 13, lineHeight: 19, color: c.ink }}>{addressLabel || "Chọn địa chỉ trước"}</Text></View><Icon name="chevron-right" size={16} color={c.muted} /></Pressable>
          <AddressMap compact height={240} latitude={value.latitude} longitude={value.longitude} address={addressLabel} onChange={(latitude, longitude) => setValue(previous => ({ ...previous, latitude, longitude }))} />
          {value.latitude != null && <Pressable accessibilityRole="button" onPress={() => setValue({ ...value, latitude: null, longitude: null })}><Text style={{ color: c.strong, fontSize: 12 }}>Bỏ ghim vị trí</Text></Pressable>}
        </View>}
        <ErrorNotice error={command.error} />
      </ScrollView>
      <View style={{ padding: 12, borderTopWidth: 1, borderColor: c.line, backgroundColor: c.white, gap: 8 }}>
        <Button title={tab === 0 ? "Tiếp tục" : "Lưu địa chỉ"} soft disabled={command.busy || !ready} loading={command.busy} onPress={() => { if (tab === 0) setTab(1); else void command.execute(value.id ? `/customer/addresses/${value.id}` : "/customer/addresses", value.id ? "PUT" : "POST", () => validateInput(AddressInput, value), close); }} />
      </View>
    </KeyboardAvoidingView></SafeAreaView>
  </Modal>;
}
