import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { z } from "zod";
import {
  Card,
  Empty,
  ErrorNotice,
  Field,
  Screen,
} from "../../components/ui";
import {
  AddressSchema,
  type Address,
} from "../customer/customer-contracts";
import {
  QueryState,
  confirmAction,
  useCommand,
  useResource,
} from "../common/shared";
import { SelectField } from "../common/SelectField";
import { AddressEditor } from "./AddressEditor";
import { Icon } from "../../components/commerce";
import { colors as c } from "../../theme/tokens";
const Provinces = z.array(
  z.object({ ProvinceID: z.number(), ProvinceName: z.string() }),
);
const Districts = z.array(
  z.object({ DistrictID: z.number(), DistrictName: z.string() }),
);
const Wards = z.array(z.object({ WardCode: z.string(), WardName: z.string() }));
export function AddressesScreen() {
  const result = useResource("addresses", "/customer/addresses", z.array(AddressSchema));
  const command = useCommand();
  const [editing, setEditing] = useState<Partial<Address> | null>(null);
  return <Screen scroll>
    <QueryState loading={result.isLoading} error={result.error} retry={() => void result.refetch()} />
    <ErrorNotice error={command.error} />
    {result.data?.length === 0 && <Empty title="Chưa có địa chỉ nhận hàng" text="Thêm địa chỉ để nhận đơn mua hoặc hàng mẫu từ Shop." />}
    {result.data?.map(item => <Card key={item.id} style={{ padding: 14, gap: 12, borderRadius: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}><View style={{ flex: 1, minWidth: 0, gap: 4 }}><Text style={{ fontSize: 15, fontWeight: "700", color: c.ink }}>{item.fullName}</Text><Text style={{ fontSize: 13, color: c.muted }}>{item.phoneNumber}</Text></View>{item.isDefault && <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: c.soft, borderWidth: 1, borderColor: c.brandBorder }}><Icon name="check" size={12} color={c.strong} /><Text style={{ fontSize: 11, color: c.strong }}>Mặc định</Text></View>}</View>
      <View style={{ flexDirection: "row", gap: 8 }}><Icon name="map-pin" size={16} color={c.strong} /><Text style={{ flex: 1, fontSize: 13, lineHeight: 20, color: c.ink }}>{[item.detailAddress, item.wardName, item.districtName, item.provinceName].filter(Boolean).join(", ")}</Text></View>
      {item.latitude != null && item.longitude != null && <Text style={{ fontSize: 11, color: c.muted }}>Đã ghim vị trí nhận hàng</Text>}
      <View style={{ flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderColor: c.line, paddingTop: 6, gap: 8 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Sửa địa chỉ ${item.fullName}`} disabled={command.busy} onPress={() => setEditing(item)} style={{ flex: 1, minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6 }}><Icon name="edit-2" size={15} color={c.strong} /><Text style={{ color: c.ink, fontSize: 12 }}>Chỉnh sửa</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Xóa địa chỉ ${item.fullName}`} disabled={command.busy} onPress={() => confirmAction("Xóa địa chỉ?", "Địa chỉ này sẽ bị xóa khỏi sổ địa chỉ.", () => void command.execute(`/customer/addresses/${item.id}`, "DELETE"))} style={{ minWidth: 60, minHeight: 44, flexDirection: "row", gap: 5, alignItems: "center", justifyContent: "flex-end" }}><Icon name="trash-2" size={15} color={c.danger} /><Text style={{ color: c.danger, fontSize: 12 }}>Xóa</Text></Pressable>
      </View>
      {!item.isDefault && <Pressable accessibilityRole="button" disabled={command.busy} onPress={() => void command.execute(`/customer/addresses/${item.id}/default`)} style={{ minHeight: 44, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", backgroundColor: c.soft, borderRadius: 10 }}><Icon name="check-circle" size={15} color={c.strong} /><Text style={{ fontSize: 12, color: c.strong, fontWeight: "600" }}>Đặt mặc định</Text></Pressable>}
    </Card>)}
    <Pressable accessibilityRole="button" disabled={command.busy} onPress={() => setEditing({ isDefault: false })} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 14, minHeight: 50, backgroundColor: c.white, borderRadius: 14, borderWidth: 1, borderStyle: "dashed", borderColor: c.brandBorder }}><Icon name="plus" size={18} color={c.strong} /><Text style={{ color: c.ink, fontSize: 13, fontWeight: "600" }}>Thêm địa chỉ</Text></Pressable>
    {editing && <AddressEditor initial={editing} close={() => setEditing(null)} />}
  </Screen>;
}
export function AddressFields({
  value,
  onChange,
  disabled = false,
}: {
  value: Partial<Address>;
  onChange(value: Partial<Address>): void;
  disabled?: boolean;
}) {
  const province = useResource(
    "provinces",
    "/shipping/ghn/provinces",
    Provinces,
  );
  const district = useResource(
    "districts",
    `/shipping/ghn/districts/${value.provinceCode}`,
    Districts,
    Boolean(value.provinceCode),
  );
  const ward = useResource(
    "wards",
    `/shipping/ghn/wards/${value.districtCode}`,
    Wards,
    Boolean(value.districtCode),
  );
  const field = (
    key: "fullName" | "phoneNumber" | "detailAddress",
    label: string,
  ) => (
    <Field
      label={label}
      value={value[key] || ""}
      editable={!disabled}
      onChangeText={(text) => onChange({ ...value, [key]: text })}
    />
  );
  return (
    <>
      <QueryState
        loading={province.isLoading}
        error={province.error || district.error || ward.error}
        retry={() => {
          void province.refetch();
          if (value.provinceCode) void district.refetch();
          if (value.districtCode) void ward.refetch();
        }}
      />
      {field("fullName", "Tên người nhận")}
      {field("phoneNumber", "Số điện thoại")}
      <SelectField
        label="Tỉnh/Thành phố"
        value={value.provinceCode || ""}
        disabled={disabled}
        options={(province.data || []).map((item) => ({
          value: String(item.ProvinceID),
          label: item.ProvinceName,
        }))}
        onChange={(id) =>
          onChange({
            ...value,
            provinceCode: id,
            provinceName: province.data?.find(
              (item) => String(item.ProvinceID) === id,
            )?.ProvinceName,
            districtCode: "",
            districtName: "",
            wardCode: "",
            wardName: "",
          })
        }
      />
      <SelectField
        label="Quận/Huyện"
        value={value.districtCode || ""}
        disabled={disabled || !value.provinceCode}
        options={(district.data || []).map((item) => ({
          value: String(item.DistrictID),
          label: item.DistrictName,
        }))}
        onChange={(id) =>
          onChange({
            ...value,
            districtCode: id,
            districtName: district.data?.find(
              (item) => String(item.DistrictID) === id,
            )?.DistrictName,
            wardCode: "",
            wardName: "",
          })
        }
      />
      <SelectField
        label="Phường/Xã"
        value={value.wardCode || ""}
        disabled={disabled || !value.districtCode}
        options={(ward.data || []).map((item) => ({
          value: item.WardCode,
          label: item.WardName,
        }))}
        onChange={(id) =>
          onChange({
            ...value,
            wardCode: id,
            wardName: ward.data?.find((item) => item.WardCode === id)?.WardName,
          })
        }
      />
      {field("detailAddress", "Số nhà, đường")}
    </>
  );
}
