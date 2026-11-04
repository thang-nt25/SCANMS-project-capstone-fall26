import { useState } from "react";
import { View } from "react-native";
import { z } from "zod";
import { Button, Caption, ErrorNotice, Screen } from "../../components/ui";
import { roleLabels, RoleSchema } from "../../types/contracts";
import {
  CompactCommandForm as CommandForm,
  QueryState,
  confirmAction,
  required,
  useActor,
  useCommand,
  useResource,
  type CommandFormSpec,
} from "../common/shared";
import {
  ExpandableRecord,
  FilterTabs,
  InfoLine,
} from "../../components/RecordList";
const Staff = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string(),
  role: RoleSchema,
  isActive: z.boolean(),
  stores: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
});
const Store = z.object({
  id: z.string(),
  name: z.string(),
  ownerId: z.string().nullish(),
  isActive: z.boolean(),
});
export function StaffScreen() {
  const [tab, setTab] = useState("staff");
  const staff = useResource("staff", "/users/staff", z.array(Staff)),
    stores = useResource("all-stores", "/stores/all-admin", z.array(Store));
  const { user } = useActor(),
    command = useCommand(),
    [form, setForm] = useState<CommandFormSpec | null>(null);
  const create = (role: "SHOP_MANAGER" | "SYSTEM_MANAGER") =>
    setForm({
      title: `Tạo ${roleLabels[role]}`,
      path: "/users/internal-staff",
      method: "POST",
      fields: [
        { key: "fullName", label: "Họ tên" },
        { key: "email", label: "Email" },
        { key: "password", label: "Mật khẩu ban đầu", secret: true },
        ...(role === "SHOP_MANAGER"
          ? [
              {
                key: "storeId",
                label: "Shop phân công",
                options: (stores.data || []).map((item) => ({
                  value: item.id,
                  label: item.name,
                })),
              },
            ]
          : []),
      ],
      schema: z
        .object({
          fullName: required.max(150),
          email: z.string().email(),
          password: z.string().min(8).max(128),
          ...(role === "SHOP_MANAGER" ? { storeId: z.string().uuid() } : {}),
        })
        .transform((body) => ({ ...body, role })),
    });
  return (
    <Screen scroll compact>
      <FilterTabs
        label="Quản lý nhân sự và gian hàng"
        value={tab}
        options={[
          { value: "staff", label: "Nhân sự" },
          { value: "stores", label: "Gian hàng" },
        ]}
        onChange={setTab}
      />
      {tab === "staff" && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Button
            title="Thêm quản lý Shop"
            disabled={
              command.busy ||
              stores.isLoading ||
              Boolean(stores.error) ||
              !stores.data?.length
            }
            onPress={() => create("SHOP_MANAGER")}
          />
          <Button
            title="Thêm vận hành"
            disabled={command.busy}
            secondary
            onPress={() => create("SYSTEM_MANAGER")}
          />
        </View>
      )}
      <QueryState
        loading={staff.isLoading || stores.isLoading}
        error={staff.error || stores.error}
        retry={() => {
          void staff.refetch();
          void stores.refetch();
        }}
      />
      <ErrorNotice error={command.error} />
      <Caption>
        {tab === "staff"
          ? `${staff.data?.length ?? "—"} nhân sự`
          : `${stores.data?.length ?? "—"} gian hàng`}{" "}
        · Bấm một mục để xem và quản lý
      </Caption>
      {tab === "staff" &&
        staff.data?.map((item) => (
          <ExpandableRecord
            key={item.id}
            title={item.fullName}
            subtitle={item.email}
            meta={roleLabels[item.role]}
            badge={item.isActive ? "Đang hoạt động" : "Đã khóa"}
            icon="user"
            disabled={command.busy}
          >
            <InfoLine label="Email" value={item.email} />
            <InfoLine label="Vai trò" value={roleLabels[item.role]} />
            {item.stores?.map((store) => (
              <Caption key={store.id}>{store.name}</Caption>
            ))}
            {item.id !== user.id && item.role !== "SYSTEM_ADMIN" && (
              <Button
                title={item.isActive ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                secondary
                loading={command.busy}
                onPress={() =>
                  confirmAction(
                    "Thay đổi trạng thái tài khoản?",
                    item.fullName,
                    () =>
                      void command.execute(
                        `/users/${item.id}/toggle-status`,
                        "PATCH",
                        { isActive: !item.isActive },
                      ),
                  )
                }
              />
            )}
          </ExpandableRecord>
        ))}
      {tab === "stores" &&
        stores.data?.map((item) => (
          <ExpandableRecord
            key={item.id}
            title={item.name}
            subtitle={
              staff.data?.find((row) => row.id === item.ownerId)?.fullName ||
              "Chưa có thông tin người phụ trách"
            }
            badge={item.isActive ? "Đang hoạt động" : "Tạm ngừng"}
            icon="shopping-bag"
            disabled={command.busy}
          >
            <Button
              title="Thay đổi chủ Shop phụ trách"
              secondary
              onPress={() =>
                setForm({
                  title: "Cập nhật người phụ trách gian hàng",
                  path: `/stores/admin/${item.id}`,
                  method: "PUT",
                  fields: [
                    {
                      key: "ownerId",
                      label: "Chủ Shop mới (thay đổi quyền sở hữu)",
                      initial: item.ownerId || "",
                      options: (staff.data || [])
                        .filter(
                          (row) => row.role === "SHOP_MANAGER" && row.isActive,
                        )
                        .map((row) => ({
                          value: row.id,
                          label: `${row.fullName} · ${row.email}`,
                        })),
                    },
                  ],
                  schema: z.object({ ownerId: z.string().uuid() }),
                })
              }
            />
            <Button
              title={
                item.isActive ? "Tạm ngừng gian hàng" : "Kích hoạt gian hàng"
              }
              secondary
              loading={command.busy}
              onPress={() =>
                confirmAction(
                  "Thay đổi trạng thái gian hàng?",
                  item.name,
                  () =>
                    void command.execute(
                      `/stores/admin/${item.id}/toggle-status`,
                    ),
                )
              }
            />
          </ExpandableRecord>
        ))}
      {form && <CommandForm spec={form} close={() => setForm(null)} />}
    </Screen>
  );
}
