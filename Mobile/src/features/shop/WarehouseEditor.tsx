import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { z } from "zod";
import { BottomSheet } from "../../components/BottomSheet";
import { Icon } from "../../components/commerce";
import { Button, ErrorNotice, Field } from "../../components/ui";
import { colors as c } from "../../theme/tokens";
import { useOperation } from "../../hooks/useOperation";
import { RegionPicker } from "../addresses/RegionPicker";
import { AddressMap } from "../addresses/AddressMap";
import { useCommand } from "../common/shared";

export const WarehouseLocation = z.object({
  provinceCode: z.string(), provinceName: z.string(), districtCode: z.string(), districtName: z.string(), wardCode: z.string(), wardName: z.string(), detailAddress: z.string(),
  latitude: z.number().nullish(), longitude: z.number().nullish(),
});
type Location = z.infer<typeof WarehouseLocation>;
type WarehouseData = { warehouseAddress?: string | null; returnWarehouseAddress?: string | null; warehouseLocation?: Location | null; returnWarehouseLocation?: Location | null };
function initial(address?: string | null, location?: Location | null): Location {
  if (location) return { ...location };
  const parts = (address || "").split(",").map(x => x.trim()).filter(Boolean);
  return { provinceCode: "", districtCode: "", wardCode: "", provinceName: parts.length >= 4 ? parts.pop()! : "", districtName: parts.length >= 3 ? parts.pop()! : "", wardName: parts.length >= 2 ? parts.pop()! : "", detailAddress: parts.join(", "), latitude: null, longitude: null };
}
export function WarehouseEditor({ data, close }: { data?: WarehouseData | null; close(): void }) {
  const [tab, setTab] = useState<0 | 1>(0);
  const [locations, setLocations] = useState(() => [initial(data?.warehouseAddress, data?.warehouseLocation), initial(data?.returnWarehouseAddress, data?.returnWarehouseLocation)]);
  const [same, setSame] = useState(!data?.returnWarehouseAddress || data.returnWarehouseAddress === data.warehouseAddress);
  const [mapOpen, setMapOpen] = useState(false);
  const command = useCommand(), operation = useOperation(), value = locations[tab], busy = command.busy || operation.busy;
  const change = (patch: Partial<Location>) => setLocations(old => old.map((item, i) => i === tab ? { ...item, ...patch } : item));
  const address = (item: Location) => [item.detailAddress, item.wardName, item.districtName, item.provinceName].filter(Boolean).join(", ");
  return <BottomSheet title="Địa chỉ kho" close={() => { if (!busy) close(); }}>
    <View style={{ flexDirection: "row", gap: 8 }}>{["Kho xuất hàng", "Kho nhận trả"].map((label, i) => <Pressable key={label} accessibilityRole="tab" accessibilityState={{ selected: tab === i }} disabled={busy} onPress={() => { setTab(i as 0 | 1); setMapOpen(false); }} style={{ flex: 1, minHeight: 46, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 1, borderColor: tab === i ? c.strong : c.line, backgroundColor: tab === i ? c.soft : c.white }}><Text style={{ fontSize: 13, fontWeight: "600", color: c.ink }}>{label}</Text></Pressable>)}</View>
    {tab === 1 && <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: same }} disabled={busy} onPress={() => setSame(old => !old)} style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 9 }}><Icon name={same ? "check-square" : "square"} size={20} color={c.strong} /><Text style={{ color: c.ink, fontSize: 13 }}>Dùng địa chỉ kho xuất</Text></Pressable>}
    {tab === 1 && same ? <View style={{ padding: 14, borderRadius: 12, backgroundColor: c.soft }}><Text style={{ fontSize: 13, lineHeight: 21, color: c.ink }}>{address(locations[0]) || "Chọn địa chỉ kho xuất trước."}</Text></View> : <>
      <RegionPicker value={value} onChange={patch => change({ ...patch, provinceCode: patch.provinceCode || "", districtCode: patch.districtCode || "", wardCode: patch.wardCode || "" })} disabled={busy} />
      <Field label="Số nhà, đường *" placeholder="VD: 12 Tân Cảng" value={value.detailAddress} onChangeText={detailAddress => change({ detailAddress, latitude: null, longitude: null })} editable={!busy} style={{ minHeight: 46, fontSize: 14 }} />
      <Pressable disabled={busy} onPress={() => setMapOpen(old => !old)} style={{ minHeight: 46, paddingHorizontal: 12, borderRadius: 12, backgroundColor: c.soft, borderWidth: 1, borderColor: c.brandBorder, flexDirection: "row", alignItems: "center", gap: 9 }}><Icon name="map-pin" size={18} color={c.strong} /><Text style={{ flex: 1, fontSize: 13, color: c.ink }}>{value.latitude != null ? "Đã ghim vị trí · Sửa bản đồ" : "Chọn bản đồ / GPS"}</Text><Icon name={mapOpen ? "chevron-up" : "chevron-down"} size={16} color={c.muted} /></Pressable>
      {mapOpen && <AddressMap latitude={value.latitude} longitude={value.longitude} address={address(value)} onChange={(latitude, longitude) => change({ latitude, longitude })} />}
    </>}
    <ErrorNotice error={operation.error || command.error} />
    <View style={{ flexDirection: "row", gap: 10, borderTopWidth: 1, borderColor: c.line, paddingTop: 12 }}><View style={{ flex: 1 }}><Button title="Hủy" secondary disabled={busy} onPress={close} /></View><View style={{ flex: 2 }}><Button title="Lưu địa chỉ" soft loading={busy} onPress={() => void operation.run(async () => {
      const pickup = locations[0], returns = same ? pickup : locations[1];
      for (const [i, loc] of [pickup, returns].entries()) {
        if (!loc.detailAddress.trim() || !loc.provinceName || !loc.districtName || !loc.wardName) { setTab(i as 0 | 1); throw new Error(`Bổ sung đủ địa chỉ ${i === 0 ? "kho xuất" : "kho nhận trả"}.`); }
        if (address(loc).length > 500 || loc.detailAddress.length > 300) throw new Error("Địa chỉ quá dài. Hãy rút gọn số nhà, đường.");
      }
      await command.execute("/stores/my-store", "PUT", { warehouseAddress: address(pickup), returnWarehouseAddress: address(returns), warehouseLocation: pickup, returnWarehouseLocation: returns }, close);
    })} /></View></View>
  </BottomSheet>;
}
