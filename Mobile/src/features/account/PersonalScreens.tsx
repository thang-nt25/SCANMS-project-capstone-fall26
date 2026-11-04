import { useState } from "react";
import { Image, Text } from "react-native";
import { z } from "zod";
import {
  Badge,
  Button,
  Caption,
  Card,
  Empty,
  ErrorNotice,
  PageControls,
  Screen,
  Title,
} from "../../components/ui";
import { money, ProductSchema } from "../../types/contracts";
import { useMobileNavigation } from "../../navigation/router";
import {
  ActionForm,
  DetailLine,
  QueryState,
  Sheet,
  required,
  useCommand,
  useResource,
} from "../common/shared";
import { MediaPicker } from "../common/MediaPicker";
const Profile = z.object({
  user: z.object({
    fullName: z.string(),
    email: z.string(),
    phoneNumber: z.string().nullish(),
  }),
});
const ProfileInput = z.object({
  fullName: required.max(150),
  phoneNumber: z.string().regex(/^\+?\d{9,15}$/, "Số điện thoại không hợp lệ."),
});
const PasswordInput = z
  .object({
    currentPassword: required,
    newPassword: z.string().min(8).max(128),
    confirm: required,
  })
  .refine((body) => body.newPassword === body.confirm, {
    message: "Mật khẩu xác nhận không khớp.",
    path: ["confirm"],
  });
export function PersonalScreen() {
  const result = useResource("profile", "/customer/profile", Profile),
    command = useCommand();
  const [form, setForm] = useState<"profile" | "password" | null>(null),
    [saved, setSaved] = useState(false);
  return (
    <Screen scroll>
      <Title>Hồ sơ & bảo mật</Title>
      <QueryState
        loading={result.isLoading}
        error={result.error}
        retry={() => void result.refetch()}
      />
      {result.data && (
        <>
          <DetailLine label="Họ tên" value={result.data.user.fullName} />
          <DetailLine label="Email" value={result.data.user.email} />
          <DetailLine label="Điện thoại" value={result.data.user.phoneNumber} />
          <Button
            title="Sửa thông tin"
            secondary
            onPress={() => setForm("profile")}
          />
        </>
      )}
      <Button
        title="Đổi mật khẩu"
        secondary
        onPress={() => setForm("password")}
      />
      <MediaPicker
        label="Thay ảnh đại diện"
        disabled={command.busy}
        onUploaded={(avatarUrl) =>
          void command.execute("/customer/profile", "PUT", { avatarUrl }, () =>
            setSaved(true),
          )
        }
      />
      {saved && <Badge>Thông tin đã được lưu</Badge>}
      <ErrorNotice error={command.error} />
      {form === "profile" && (
        <ActionForm
          title="Cập nhật hồ sơ"
          fields={[
            {
              key: "fullName",
              label: "Họ tên",
              initial: result.data?.user.fullName,
            },
            {
              key: "phoneNumber",
              label: "Số điện thoại",
              initial: result.data?.user.phoneNumber || "",
            },
          ]}
          schema={ProfileInput}
          submit={(body) =>
            command.execute("/customer/profile", "PUT", body, () => {
              setSaved(true);
              setForm(null);
            })
          }
          error={command.error}
          busy={command.busy}
          close={() => setForm(null)}
        />
      )}
      {form === "password" && (
        <ActionForm
          title="Đổi mật khẩu"
          fields={[
            {
              key: "currentPassword",
              label: "Mật khẩu hiện tại",
              secret: true,
            },
            {
              key: "newPassword",
              label: "Mật khẩu mới (ít nhất 8 ký tự)",
              secret: true,
            },
            { key: "confirm", label: "Nhập lại mật khẩu mới", secret: true },
          ]}
          schema={PasswordInput}
          submit={({ currentPassword, newPassword }) =>
            command.execute(
              "/customer/change-password",
              "POST",
              { currentPassword, newPassword },
              () => {
                setSaved(true);
                setForm(null);
              },
            )
          }
          error={command.error}
          busy={command.busy}
          close={() => setForm(null)}
        />
      )}
    </Screen>
  );
}
const Notification = z.object({
  id: z.string(),
  title: z.string(),
  message: z.string(),
  isRead: z.boolean(),
  createdAt: z.string(),
});
const Notifications = z.object({
  items: z.array(Notification),
  unreadCount: z.number(),
  totalPages: z.number(),
});
export function NotificationsScreen() {
  const [page, setPage] = useState(1),
    [category, setCategory] = useState("ALL"),
    [selected, setSelected] = useState<z.infer<typeof Notification> | null>(
      null,
    );
  const result = useResource(
      "notifications",
      `/notifications?page=${page}&limit=20&category=${category}`,
      Notifications,
    ),
    command = useCommand();
  return (
    <Screen scroll>
      <Title>Thông báo · {result.data?.unreadCount ?? "—"} chưa đọc</Title>
      <Button
        title="Đọc tất cả"
        secondary
        loading={command.busy}
        onPress={() => void command.execute("/notifications/read-all")}
      />
      <SelectCategories
        value={category}
        change={(value) => {
          setCategory(value);
          setPage(1);
        }}
      />
      <QueryState
        loading={result.isLoading}
        error={result.error}
        retry={() => void result.refetch()}
      />
      <ErrorNotice error={command.error} />
      {result.data?.items.length === 0 && <Empty />}
      {result.data?.items.map((item) => (
        <Card key={item.id}>
          {!item.isRead && <Badge>Mới</Badge>}
          <Title>{item.title}</Title>
          <Text>{item.message}</Text>
          <Caption>{new Date(item.createdAt).toLocaleString("vi-VN")}</Caption>
          <Button
            title="Xem thông báo"
            secondary
            disabled={command.busy}
            onPress={() => {
              setSelected(item);
              if (!item.isRead)
                void command.execute(`/notifications/${item.id}/read`);
            }}
          />
        </Card>
      ))}
      <PageControls
        page={page}
        totalPages={result.data?.totalPages || 1}
        loading={result.isFetching}
        onChange={setPage}
      />
      {selected && (
        <Sheet title={selected.title} close={() => setSelected(null)}>
          <Text>{selected.message}</Text>
        </Sheet>
      )}
    </Screen>
  );
}
function SelectCategories({
  value,
  change,
}: {
  value: string;
  change(value: string): void;
}) {
  return (
    <>
      {[
        ["ALL", "Tất cả"],
        ["ORDER", "Đơn hàng"],
        ["PROMOTION", "Ưu đãi"],
        ["SYSTEM", "Hệ thống"],
      ].map(([key, label]) => (
        <Button
          key={key}
          title={label}
          secondary={value !== key}
          onPress={() => change(key)}
        />
      ))}
    </>
  );
}
const Wishlist = z.array(
  z.object({ wishlistId: z.string(), product: ProductSchema }),
);
export function WishlistScreen() {
  const result = useResource("wishlist", "/customer/wishlist", Wishlist),
    command = useCommand(),
    navigation = useMobileNavigation();
  return (
    <Screen scroll>
      <Title>Sản phẩm yêu thích</Title>
      <QueryState
        loading={result.isLoading}
        error={result.error}
        retry={() => void result.refetch()}
      />
      <ErrorNotice error={command.error} />
      {result.data?.length === 0 && <Empty />}
      {result.data?.map(({ wishlistId, product }) => (
        <Card key={wishlistId}>
          {product.imageUrl && (
            <Image
              source={{ uri: product.imageUrl }}
              style={{ width: 100, height: 100 }}
            />
          )}
          <Title>{product.title}</Title>
          <Text>{money(product.price)}</Text>
          <Button
            title="Xem sản phẩm"
            onPress={() => navigation.navigate("ProductDetail", { product })}
          />
          <Button
            title="Bỏ yêu thích"
            secondary
            loading={command.busy}
            onPress={() =>
              void command.execute(`/customer/wishlist/${product.id}`, "DELETE")
            }
          />
        </Card>
      ))}
    </Screen>
  );
}
