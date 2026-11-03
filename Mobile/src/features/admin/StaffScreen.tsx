import { useState } from "react";
import { Text } from "react-native";
import { z } from "zod";
import {
  Badge,
  Button,
  Caption,
  Card,
  ErrorNotice,
  Screen,
  Title,
} from "../../components/ui";
import { roleLabels, RoleSchema } from "../../types/contracts";
import {
  CommandForm,
  QueryState,
  confirmAction,
  required,
  useActor,
  useCommand,
  useResource,
  type CommandFormSpec,
} from "../common/shared";
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
  ownerId: z.string(),
  isActive: z.boolean(),
});
export function StaffScreen() {
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
    <Screen scroll>
      <Title>Nhân sự & gian hàng</Title>
      <Button
        title="Thêm quản lý Shop"
        onPress={() => create("SHOP_MANAGER")}
      />
      <Button
        title="Thêm chuyên viên vận hành"
        secondary
        onPress={() => create("SYSTEM_MANAGER")}
      />
      <QueryState
        loading={staff.isLoading || stores.isLoading}
        error={staff.error || stores.error}
        retry={() => {
          void staff.refetch();
          void stores.refetch();
        }}
      />
      <ErrorNotice error={command.error} />
      {staff.data?.map((item) => (
        <Card key={item.id}>
          <Title>{item.fullName}</Title>
          <Text>{item.email}</Text>
          <Badge>{roleLabels[item.role]}</Badge>
          <Caption>{item.isActive ? "Đang hoạt động" : "Đã khóa"}</Caption>
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
        </Card>
      ))}
      <Title>Gian hàng</Title>
      {stores.data?.map((item) => (
        <Card key={item.id}>
          <Title>{item.name}</Title>
          <Badge>{item.isActive ? "Đang hoạt động" : "Tạm ngừng"}</Badge>
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
                    initial: item.ownerId,
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
        </Card>
      ))}
      {form && <CommandForm spec={form} close={() => setForm(null)} />}
    </Screen>
  );
}
