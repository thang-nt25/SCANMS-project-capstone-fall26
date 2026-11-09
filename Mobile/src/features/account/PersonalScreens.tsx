import { useRef, useState } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";
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
import { money, ProductSchema, roleLabels } from "../../types/contracts";
import { useMobileNavigation } from "../../navigation/router";
import {
  type FormField,
  QueryState,
  required,
  useCommand,
  useResource,
  useActor,
} from "../common/shared";
import { BottomSheet } from "../../components/BottomSheet";
import { validateInput } from "../../utils/validate-input";
import { useOperation } from "../../hooks/useOperation";
import { Avatar, Icon } from "../../components/commerce";
import { colors as c } from "../../theme/tokens";
import { profileStyles as ps } from "./profile-styles";
import { MediaPicker } from "../common/MediaPicker";
import { PasswordRecoverySheet } from "./PasswordRecoverySheet";
const Profile = z.object({
  user: z.object({
    fullName: z.string(),
    email: z.string(),
    phoneNumber: z.string().nullish(),
    avatarUrl: z.string().nullish(),
  }),
});
const ProfileInput = z.object({
  fullName: required.max(150),
  phoneNumber: z.string().regex(/^\+?\d{9,15}$/, "Số điện thoại không hợp lệ."),
});
const PasswordInput = z
  .object({
    currentPassword: required,
    newPassword: z.string().min(6, "Mật khẩu mới cần ít nhất 6 ký tự.").max(128, "Mật khẩu tối đa 128 ký tự."),
    confirm: required,
  })
  .refine((body) => body.newPassword === body.confirm, {
    message: "Mật khẩu xác nhận không khớp.",
    path: ["confirm"],
  });
export function PersonalScreen() {
  const { user } = useActor();
  const result = useResource("profile", "/customer/profile", Profile),
    command = useCommand();
  const [form, setForm] = useState<"profile" | "password" | "recovery" | null>(null),
    [saved, setSaved] = useState(false);
  return (
    <Screen scroll>

      <QueryState
        loading={result.isLoading}
        error={result.error}
        retry={() => void result.refetch()}
      />
      {result.data && <View style={ps.card}>
        <View style={ps.inline}><Avatar uri={result.data.user.avatarUrl || user.avatarUrl} name={result.data.user.fullName} size={48} /><View style={{ flex: 1, minWidth: 0, gap: 4 }}><Text style={ps.title}>{result.data.user.fullName}</Text><Text style={ps.note}>{user.role === "COLLABORATOR" ? "Đối tác tiếp thị · KOL/KOC" : roleLabels[user.role]}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Sửa thông tin cá nhân" onPress={() => setForm("profile")} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", backgroundColor: c.soft, borderRadius: 12 }}><Icon name="edit-2" size={18} color={c.strong} /></Pressable></View>
        {[{ icon: "mail" as const, label: "Email", value: result.data.user.email }, { icon: "phone" as const, label: "Điện thoại", value: result.data.user.phoneNumber || "Chưa bổ sung" }].map(item => <View key={item.label} style={[ps.inline, ps.line]}><Icon name={item.icon} size={17} color={c.muted} /><View style={{ flex: 1, gap: 3 }}><Text style={ps.note}>{item.label}</Text><Text selectable style={ps.label}>{item.value}</Text></View></View>)}
      </View>}
      <View style={ps.card}>
      <Pressable accessibilityRole="button" accessibilityLabel="Đổi mật khẩu tài khoản" onPress={() => setForm("password")} style={[ps.inline, { minHeight: 52 }]}>
        <View style={ps.icon}><Icon name="lock" color={c.strong} size={19} /></View><View style={{ flex: 1, gap: 3 }}><Text style={ps.title}>Đổi mật khẩu</Text><Text style={ps.note}>Bảo vệ tài khoản của bạn</Text></View><Icon name="chevron-right" size={18} color={c.muted} />
      </Pressable>
        <View style={ps.line}>
        <MediaPicker label="Chọn ảnh đại diện" hideHint disabled={command.busy} onUploaded={(avatarUrl) => void command.execute("/customer/profile", "PUT", { avatarUrl }, () => setSaved(true))} renderTrigger={(open, busy) => <Pressable accessibilityRole="button" accessibilityLabel="Thay ảnh đại diện" accessibilityState={{ disabled: busy }} disabled={busy} onPress={open} style={[ps.inline, { minHeight: 52 }]}><View style={ps.icon}><Icon name="camera" size={19} color={c.strong} /></View><View style={{ flex: 1, gap: 3 }}><Text style={ps.title}>{busy ? "Đang xử lý ảnh…" : "Thay ảnh đại diện"}</Text><Text style={ps.note}>Chọn từ thư viện · tối đa 5 MB</Text></View><Icon name="chevron-right" size={18} color={c.muted} /></Pressable>} />
        </View>
      </View>
      {saved && <Badge>Thông tin đã được lưu</Badge>}
      <ErrorNotice error={command.error} />
      {form === "profile" && (
        <AccountForm
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
        <AccountForm
          title="Đổi mật khẩu"
          forgot={() => { command.clearError(); setForm("recovery"); }}
          fields={[
            {
              key: "currentPassword",
              label: "Mật khẩu hiện tại",
              secret: true,
            },
            {
              key: "newPassword",
              label: "Mật khẩu mới",
              secret: true,
            },
            { key: "confirm", label: "Nhập lại mật khẩu", secret: true },
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
      {form === "recovery" && <PasswordRecoverySheet email={result.data?.user.email || user.email} close={() => setForm(null)} done={() => { setSaved(true); setForm(null); void result.refetch(); }} />}
    </Screen>
  );
}
function AccountForm<T>({ title, fields, schema, submit, busy = false, error, close, forgot }: { title: string; fields: readonly FormField[]; schema: z.ZodType<T>; submit(body: T): Promise<unknown>; busy?: boolean; error?: unknown; close(): void; forgot?(): void }) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map(field => [field.key, field.initial || ""])));
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [focused, setFocused] = useState<string | null>(null);
  const inputs = useRef<Record<string, { focus(): void } | null>>({});
  const local = useOperation(), disabled = busy || local.busy;
  const password = fields.some(field => field.secret);
  return <BottomSheet title={title} close={() => { if (!disabled) close(); }}>
    {!password && <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><View style={ps.icon}><Icon name="user" size={20} color={c.strong} /></View><Text style={[ps.note, { flex: 1 }]}>Cập nhật thông tin liên hệ của bạn.</Text></View>}
    {fields.map((field, index) => field.secret ? <View key={field.key} style={{ gap: 6 }}>
      <Text style={ps.label}>{field.label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", minHeight: 48, borderWidth: 1, borderColor: focused === field.key ? c.strong : c.line, borderRadius: 12, backgroundColor: c.white, paddingLeft: 12 }}>
        <TextInput ref={input => { inputs.current[field.key] = input; }} accessibilityLabel={field.label} value={values[field.key]} placeholder={field.key === "confirm" ? "Nhập lại mật khẩu mới" : field.key === "newPassword" ? "Tạo mật khẩu mới" : "Nhập mật khẩu hiện tại"} placeholderTextColor={c.muted} secureTextEntry={!visible[field.key]} autoCapitalize="none" autoCorrect={false} maxLength={128} editable={!disabled} returnKeyType={index < fields.length - 1 ? "next" : "done"} onSubmitEditing={() => { const next = fields[index + 1]; if (next) inputs.current[next.key]?.focus(); }} onFocus={() => setFocused(field.key)} onBlur={() => setFocused(null)} onChangeText={value => setValues(current => ({ ...current, [field.key]: value }))} style={{ flex: 1, minWidth: 0, paddingVertical: 12, fontSize: 14, color: c.ink }} />
        <Pressable accessibilityRole="button" accessibilityLabel={`${visible[field.key] ? "Ẩn" : "Hiện"} ${field.label.toLocaleLowerCase("vi")}`} accessibilityState={{ disabled }} disabled={disabled} onPress={() => setVisible(current => ({ ...current, [field.key]: !current[field.key] }))} style={{ width: 44, height: 48, justifyContent: "center", alignItems: "center" }}><Icon name={visible[field.key] ? "eye-off" : "eye"} size={18} color={c.muted} /></Pressable>
      </View>
      {field.key === "currentPassword" && forgot && <Pressable accessibilityRole="button" disabled={disabled} onPress={forgot} style={{ minHeight: 36, justifyContent: "center", alignSelf: "flex-end" }}><Text style={{ color: c.strong, fontSize: 12, fontWeight: "600" }}>Quên mật khẩu?</Text></Pressable>}
      {field.key === "newPassword" && <Text style={[ps.note, { fontSize: 11 }]}>Tối thiểu 6 ký tự</Text>}
    </View> : <Field key={field.key} label={field.label} value={values[field.key]} maxLength={field.key === "fullName" ? 150 : field.key === "phoneNumber" ? 16 : 128} autoCapitalize={field.key === "fullName" ? "words" : "none"} autoCorrect={false} keyboardType={field.key === "phoneNumber" ? "phone-pad" : "default"} editable={!disabled} onChangeText={value => setValues(current => ({ ...current, [field.key]: value }))} />)}
    <ErrorNotice error={local.error || error} />
    <View style={{ flexDirection: "row", gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.line }}><View style={{ flex: 1 }}><Button title="Hủy" secondary disabled={disabled} onPress={close} /></View><View style={{ flex: 2 }}><Button title={password ? "Lưu mật khẩu" : "Lưu thay đổi"} soft loading={disabled} onPress={() => void local.run(() => submit(validateInput(schema, values)))} /></View></View>
  </BottomSheet>;
}
export { NotificationsScreen } from "./NotificationInbox";
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
