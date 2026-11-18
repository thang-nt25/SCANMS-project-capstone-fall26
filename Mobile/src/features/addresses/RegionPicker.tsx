import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { z } from "zod";
import { BottomSheet } from "../../components/BottomSheet";
import { Icon } from "../../components/commerce";
import { QueryState, useResource } from "../common/shared";
import { Button } from "../../components/ui";
import type { Address } from "../customer/customer-contracts";
import { colors as c } from "../../theme/tokens";
const Provinces = z.array(z.object({ ProvinceID: z.number(), ProvinceName: z.string() }));
const Districts = z.array(z.object({ DistrictID: z.number(), DistrictName: z.string() }));
const Wards = z.array(z.object({ WardCode: z.string(), WardName: z.string() }));
export function RegionPicker({ value, onChange, disabled }: { value: Partial<Address>; onChange(value: Partial<Address>): void; disabled?: boolean }) {
  const [open, setOpen] = useState(false), [step, setStep] = useState(0), [search, setSearch] = useState("");
  const [draft, setDraft] = useState(value);
  const provinces = useResource("provinces", "/shipping/ghn/provinces", Provinces, open);
  const districts = useResource("districts", `/shipping/ghn/districts/${draft.provinceCode}`, Districts, open && !!draft.provinceCode);
  const wards = useResource("wards", `/shipping/ghn/wards/${draft.districtCode}`, Wards, open && !!draft.districtCode);
  const source = step === 0 ? provinces : step === 1 ? districts : wards;
  const rows = step === 0 ? provinces.data?.map(x => ({ id: String(x.ProvinceID), name: x.ProvinceName })) : step === 1 ? districts.data?.map(x => ({ id: String(x.DistrictID), name: x.DistrictName })) : wards.data?.map(x => ({ id: x.WardCode, name: x.WardName }));
  const current = step === 0 ? draft.provinceCode : step === 1 ? draft.districtCode : draft.wardCode;
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel="Chọn khu vực giao hàng" disabled={disabled} onPress={() => { setDraft(value); setStep(0); setSearch(""); setOpen(true); }} style={{ borderWidth: 1, borderColor: c.line, borderRadius: 12, padding: 12, minHeight: 58, flexDirection: "row", gap: 10, alignItems: "center", backgroundColor: c.white }}>
      <Icon name="map-pin" size={18} color={c.strong} /><View style={{ flex: 1, gap: 3 }}><Text style={{ fontSize: 11, color: c.muted }}>Khu vực *</Text><Text numberOfLines={2} style={{ fontSize: 13, lineHeight: 19, color: c.ink }}>{[value.provinceName, value.districtName, value.wardName].filter(Boolean).join(" · ") || "Chọn tỉnh, huyện, xã"}</Text></View><Icon name="chevron-down" size={16} color={c.muted} />
    </Pressable>
    {open && <BottomSheet title="Khu vực giao hàng" close={() => setOpen(false)}>
      <View style={{ flexDirection: "row", gap: 6 }}>{["Tỉnh/Thành", "Quận/Huyện", "Phường/Xã"].map((label, index) => <Pressable key={label} disabled={index === 1 ? !draft.provinceCode : index === 2 ? !draft.districtCode : false} onPress={() => { setStep(index); setSearch(""); }} style={{ flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center", backgroundColor: index === step ? c.soft : c.canvas, borderWidth: 1, borderColor: index === step ? c.brandBorder : c.line }}><Text style={{ fontSize: 12, color: c.ink }}>{label}</Text></Pressable>)}</View>
      <TextInput accessibilityLabel="Tìm khu vực" value={search} onChangeText={setSearch} placeholder="Tìm tên khu vực…" placeholderTextColor={c.muted} style={{ minHeight: 44, paddingHorizontal: 12, borderWidth: 1, borderColor: c.line, borderRadius: 10, color: c.ink }} />
      <QueryState loading={source.isLoading} error={source.error} retry={() => void source.refetch()} />
      {(rows || []).filter(row => row.name.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi"))).map(row => <Pressable key={row.id} accessibilityRole="radio" accessibilityState={{ checked: current === row.id }} onPress={() => {
        const next = step === 0 ? { ...draft, provinceCode: row.id, provinceName: row.name, districtCode: "", districtName: "", wardCode: "", wardName: "" } : step === 1 ? { ...draft, districtCode: row.id, districtName: row.name, wardCode: "", wardName: "" } : { ...draft, wardCode: row.id, wardName: row.name };
        setDraft(next); setSearch("");
        if (step < 2) setStep(step + 1); else { onChange({ ...next, latitude: null, longitude: null }); setOpen(false); }
      }} style={{ minHeight: 44, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 10, backgroundColor: current === row.id ? c.soft : c.white }}><Text style={{ flex: 1, color: c.ink, fontSize: 13 }}>{row.name}</Text>{current === row.id && <Icon name="check" size={17} color={c.strong} />}</Pressable>)}
      {!source.isLoading && !source.error && rows?.length === 0 && <View style={{ gap: 10 }}><Text style={{ fontSize: 12, color: c.muted }}>Chưa tải được khu vực giao hàng.</Text><Button title="Tải lại danh sách" soft onPress={() => void source.refetch()} /></View>}
    </BottomSheet>}
  </>;
}
