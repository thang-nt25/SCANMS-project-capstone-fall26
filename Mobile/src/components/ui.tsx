import { createContext, useContext, type PropsWithChildren } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors } from "../theme/tokens";
import { Icon } from "./commerce";
const PaddedScreen = createContext(false);

export function Screen({
  children,
  scroll = false,
}: PropsWithChildren<{ scroll?: boolean }>) {
  return scroll ? (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
    >
      <PaddedScreen.Provider value={true}>{children}</PaddedScreen.Provider>
    </ScrollView>
  ) : (
    <View style={s.screen}>{children}</View>
  );
}
export function Card({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const padded = useContext(PaddedScreen);
  return <View style={[s.card, padded && { marginHorizontal: 0 }, style]}>{children}</View>;
}
export function Title({ children }: PropsWithChildren) {
  return <Text style={s.title}>{children}</Text>;
}
export function Caption({ children }: PropsWithChildren) {
  return <Text style={s.caption}>{children}</Text>;
}
export function Badge({ children }: PropsWithChildren) {
  return <Text style={s.badge}>{children}</Text>;
}
export function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  secondary = false,
  danger = false,
}: {
  title: string;
  onPress(): void;
  loading?: boolean;
  disabled?: boolean;
  secondary?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        danger && s.danger,
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
      ]}
    >
      {loading && <ActivityIndicator color={colors.ink} size="small" />}
      <Text style={[s.buttonText, danger && { color: colors.danger }]}>
        {title}
      </Text>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        {...props}
        style={[
          s.input,
          props.multiline && { minHeight: 100, textAlignVertical: "top" },
          props.style,
        ]}
      />
    </View>
  );
}
export const messageOf = (error: unknown) =>
  error instanceof Error
    ? error.name === "ZodError"
      ? "Phản hồi máy chủ chưa đúng cấu trúc. Hãy thử lại hoặc liên hệ nhóm phát triển."
      : error.message
    : "Thao tác chưa thành công.";
export function ErrorNotice({
  error,
  retry,
}: {
  error: unknown;
  retry?(): void;
}) {
  if (!error) return null;
  return (
    <View accessibilityRole="alert" style={s.error}>
      <Text style={{ color: colors.danger, lineHeight: 21 }}>
        {typeof error === "string" ? error : messageOf(error)}
      </Text>
      {retry && <Button title="Thử lại" onPress={retry} secondary />}
    </View>
  );
}
export function Loading() {
  return (
    <View style={s.center}>
      <ActivityIndicator color={colors.brand} size="large" />
      <Caption>Đang tải dữ liệu…</Caption>
    </View>
  );
}
export function Empty({
  text = "Chưa có dữ liệu trong danh sách này.",
  title = "Chưa có dữ liệu",
}: {
  text?: string;
  title?: string;
}) {
  return (
    <View style={s.center}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: colors.soft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="inbox" size={27} color={colors.strong} />
      </View>
      <Text style={{ fontSize: 16, fontWeight: "600", color: colors.ink }}>
        {title}
      </Text>
      <Caption>{text}</Caption>
    </View>
  );
}
export function PageControls({
  page,
  totalPages,
  loading,
  onChange,
}: {
  page: number;
  totalPages: number;
  loading: boolean;
  onChange(page: number): void;
}) {
  if (page <= 1 && totalPages <= 1) return null;
  return (
    <View style={s.pager}>
      <Button
        title="Trước"
        secondary
        disabled={loading || page <= 1}
        onPress={() => onChange(page - 1)}
      />
      <Caption>
        {page} / {Math.max(1, totalPages)}
      </Caption>
      <Button
        title="Sau"
        secondary
        disabled={loading || page >= totalPages}
        onPress={() => onChange(page + 1)}
      />
    </View>
  );
}
export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 16, gap: 12, paddingBottom: 28 },
  card: {
    minWidth: 0,
    marginHorizontal: 16,
    marginVertical: 7,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    borderRadius: 14,
    gap: 10,
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.ink, lineHeight: 25 },
  caption: { fontSize: 12, color: colors.muted, lineHeight: 18 },
  label: { fontSize: 13, color: colors.ink, fontWeight: "600" },
  input: {
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    padding: 12,
    color: colors.ink,
    fontSize: 14,
  },
  badge: {
    flexShrink: 1,
    maxWidth: "100%",
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.brandBorder,
    color: colors.strong,
    backgroundColor: colors.soft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 11,
    borderRadius: 6,
    overflow: "hidden",
  },
  button: {
    minWidth: 0,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.brand,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  secondary: { backgroundColor: colors.white, borderColor: colors.line },
  danger: { backgroundColor: colors.white, borderColor: colors.danger },
  buttonText: { color: colors.ink, fontWeight: "600", fontSize: 13, flexShrink: 1, textAlign: "center" },
  error: {
    margin: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 14,
    backgroundColor: colors.white,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: 12,
  },
  pager: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    gap: 10,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  price: { color: colors.strong, fontSize: 19, fontWeight: "700" },
});
