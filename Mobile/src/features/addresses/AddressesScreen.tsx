import { useState } from "react";
import { Switch, Text, View } from "react-native";
import { z } from "zod";
import {
  Badge,
  Button,
  Card,
  Empty,
  ErrorNotice,
  Field,
  Screen,
  Title,
} from "../../components/ui";
import {
  AddressSchema,
  AddressInput,
  type Address,
} from "../customer/customer-contracts";
import {
  QueryState,
  Sheet,
  confirmAction,
  useCommand,
  useResource,
} from "../common/shared";
import { SelectField } from "../common/SelectField";
import { validateInput } from "../../utils/validate-input";
const Provinces = z.array(
  z.object({ ProvinceID: z.number(), ProvinceName: z.string() }),
);
const Districts = z.array(
  z.object({ DistrictID: z.number(), DistrictName: z.string() }),
);
const Wards = z.array(z.object({ WardCode: z.string(), WardName: z.string() }));
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
export function AddressesScreen() {
  const result = useResource(
    "addresses",
    "/customer/addresses",
    z.array(AddressSchema),
  );
  const command = useCommand();
  const [editing, setEditing] = useState<Partial<Address> | null>(null);
  return (
    <Screen scroll>
      <Title>Sổ địa chỉ</Title>
      <Button
        title="Thêm địa chỉ"
        onPress={() => setEditing({ isDefault: false })}
      />
      <QueryState
        loading={result.isLoading}
        error={result.error}
        retry={() => void result.refetch()}
      />
      <ErrorNotice error={command.error} />
      {result.data?.length === 0 && (
        <Empty text="Thêm địa chỉ để nhận đơn hàng hoặc hàng mẫu." />
      )}
      {result.data?.map((item) => (
        <Card key={item.id}>
          <Title>{item.fullName}</Title>
          <Text>{item.phoneNumber}</Text>
          <Text>
            {[
              item.detailAddress,
              item.wardName,
              item.districtName,
              item.provinceName,
            ].join(", ")}
          </Text>
          {item.isDefault && <Badge>Mặc định</Badge>}
          <Button
            title="Chỉnh sửa"
            secondary
            disabled={command.busy}
            onPress={() => setEditing(item)}
          />
          {!item.isDefault && (
            <Button
              title="Đặt làm mặc định"
              secondary
              loading={command.busy}
              onPress={() =>
                void command.execute(`/customer/addresses/${item.id}/default`)
              }
            />
          )}
          <Button
            title="Xóa địa chỉ"
            danger
            disabled={command.busy}
            onPress={() =>
              confirmAction(
                "Xóa địa chỉ?",
                "Địa chỉ này sẽ bị xóa khỏi sổ địa chỉ.",
                () =>
                  void command.execute(
                    `/customer/addresses/${item.id}`,
                    "DELETE",
                  ),
              )
            }
          />
        </Card>
      ))}
      {editing && (
        <Sheet
          title={editing.id ? "Sửa địa chỉ" : "Thêm địa chỉ"}
          close={() => {
            if (!command.busy) setEditing(null);
          }}
        >
          <AddressFields
            value={editing}
            onChange={setEditing}
            disabled={command.busy}
          />
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text>Địa chỉ mặc định</Text>
            <Switch
              value={editing.isDefault || false}
              onValueChange={(isDefault) =>
                setEditing({ ...editing, isDefault })
              }
              disabled={command.busy}
            />
          </View>
          <ErrorNotice error={command.error} />
          <Button
            title="Lưu địa chỉ"
            loading={command.busy}
            onPress={() =>
              void command.execute(
                editing.id
                  ? `/customer/addresses/${editing.id}`
                  : "/customer/addresses",
                editing.id ? "PUT" : "POST",
                () => validateInput(AddressInput, editing),
                () => setEditing(null),
              )
            }
          />
        </Sheet>
      )}
    </Screen>
  );
}
