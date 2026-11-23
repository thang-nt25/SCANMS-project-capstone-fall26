import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/tokens";
import { googleSignInSupported, type GoogleAuthIntent } from "./google-auth";

export function GoogleAuthButton({
  intent,
  busy,
  disabled,
  onPress,
}: {
  intent: GoogleAuthIntent;
  busy: boolean;
  disabled: boolean;
  onPress(): void;
}) {
  if (!googleSignInSupported) return null;
  const label = intent === "login" ? "Đăng nhập bằng Google" : "Đăng ký bằng Google";
  const divider = (
    <View style={styles.divider}>
      <View style={styles.line} />
      <Text style={styles.or}>hoặc</Text>
      <View style={styles.line} />
    </View>
  );
  return (
    <View style={styles.group}>
      {intent === "login" && divider}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled, busy }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          (pressed || (disabled && !busy)) && styles.dimmed,
        ]}
      >
        {busy ? (
          <ActivityIndicator size="small" color={colors.strong} />
        ) : (
          <Image source={require("../../../assets/google-sign-in.png")} style={styles.logo} />
        )}
        <Text style={styles.label}>{label}</Text>
      </Pressable>
      {intent === "register" && divider}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 12 },
  divider: { flexDirection: "row", alignItems: "center", gap: 12 },
  line: { height: StyleSheet.hairlineWidth, flex: 1, backgroundColor: colors.line },
  or: { color: colors.muted, fontSize: 12 },
  button: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#747775",
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  dimmed: { opacity: 0.65 },
  logo: { width: 20, height: 20, resizeMode: "contain" },
  label: { color: "#1F1F1F", fontSize: 14, fontWeight: "500" },
});
