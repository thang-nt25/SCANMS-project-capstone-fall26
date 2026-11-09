import { useState } from "react";
import { Image, Text, View } from "react-native";
import { z } from "zod";
import {
  Badge,
  Button,
  Card,
  Empty,
  ErrorNotice,
  Screen,
  Title,
} from "../../components/ui";
import { money, ProductSchema } from "../../types/contracts";
import { useMobileNavigation } from "../../navigation/router";
import {
  ActionForm,
  QueryState,
  required,
  useCommand,
  useResource,
} from "../common/shared";
import {
  InfoLine as DetailLine,
  SectionTitle,
} from "../../components/RecordList";
import { MenuRow, c } from "../../components/commerce";
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
    <Screen scroll compact>
      <QueryState
        loading={result.isLoading}
        error={result.error}
        retry={() => void result.refetch()}
      />
      {result.data && (
        <Card>
          <SectionTitle>Thông tin cá nhân</SectionTitle>
          <DetailLine label="Họ tên" value={result.data.user.fullName} />
          <DetailLine label="Email" value={result.data.user.email} />
          <DetailLine label="Điện thoại" value={result.data.user.phoneNumber} />
        </Card>
      )}
      <View style={c.panel}>
        <MenuRow
          compact
          icon="edit-2"
          title="Cập nhật thông tin"
          onPress={() => setForm("profile")}
        />
        <MenuRow
          compact
          icon="lock"
          title="Đổi mật khẩu"
          last
          onPress={() => setForm("password")}
        />
      </View>
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
          compact
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
          compact
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
