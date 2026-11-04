import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, ErrorNotice } from "../../components/ui";
import { Icon, Wordmark } from "../../components/commerce";
import { colors } from "../../theme/tokens";
import { useAuth } from "./AuthProvider";

export function LoginScreen() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState(""),
    [password, setPassword] = useState(""),
    [visible, setVisible] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  const lock = useRef(false);
  const submit = async () => {
    if (lock.current) return;
    if (!identifier.trim() || !password) {
      setError("Nhập email/số điện thoại và mật khẩu đã đăng ký.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      await login(identifier, password);
      setPassword("");
    } catch (caught) {
      setError(caught);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Wordmark />
          <View style={styles.visual}>
            <View style={styles.circle}>
              <Icon name="shopping-bag" size={43} color={colors.strong} />
            </View>
            <View style={styles.floatOne}>
              <Icon name="heart" size={20} color={colors.strong} />
            </View>
            <View style={styles.floatTwo}>
              <Icon name="gift" size={21} color={colors.strong} />
            </View>
            <Text style={styles.visualCaption}>
              MUA SẮM · KHÁM PHÁ · KẾT NỐI
            </Text>
          </View>
          <View style={{ gap: 8 }}>
            <Text style={styles.title}>Chào mừng bạn trở lại.</Text>
            <Text style={styles.subtitle}>
              Đăng nhập để tiếp tục hành trình cùng SCANMS.
            </Text>
          </View>
          <View style={{ gap: 17 }}>
            <View style={{ gap: 8 }}>
              <Text style={styles.label}>Email hoặc số điện thoại</Text>
              <View style={styles.inputBox}>
                <Icon name="user" size={18} color={colors.muted} />
                <TextInput
                  accessibilityLabel="Email hoặc số điện thoại"
                  placeholder="Nhập email hoặc số điện thoại"
                  placeholderTextColor={colors.muted}
                  value={identifier}
                  onChangeText={setIdentifier}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!busy}
                  textContentType="username"
                  style={styles.input}
                />
              </View>
            </View>
            <View style={{ gap: 8 }}>
              <Text style={styles.label}>Mật khẩu</Text>
              <View style={styles.inputBox}>
                <Icon name="lock" size={18} color={colors.muted} />
                <TextInput
                  accessibilityLabel="Mật khẩu"
                  placeholder="Nhập mật khẩu"
                  placeholderTextColor={colors.muted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!visible}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!busy}
                  textContentType="password"
                  onSubmitEditing={() => void submit()}
                  style={styles.input}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  onPress={() => setVisible(!visible)}
                  disabled={busy}
                  style={{ padding: 10 }}
                >
                  <Icon
                    name={visible ? "eye-off" : "eye"}
                    size={17}
                    color={colors.muted}
                  />
                </Pressable>
              </View>
            </View>
            <ErrorNotice error={error} />
            <Button
              title="Đăng nhập"
              loading={busy}
              onPress={() => void submit()}
            />
          </View>
          <View style={styles.note}>
            <Icon name="shield" size={16} color={colors.strong} />
            <Text style={styles.noteText}>
              Dùng tài khoản đã đăng ký trên SCANMS.{"\n"}Vai trò của bạn được
              nhận diện sau khi đăng nhập.
            </Text>
          </View>
          <Text style={styles.footer}>
            Sàn thương mại tiếp thị liên kết SCANMS
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 26,
    paddingVertical: 28,
    gap: 26,
  },
  visual: { height: 137, alignItems: "center", justifyContent: "center" },
  circle: {
    width: 105,
    height: 105,
    backgroundColor: "#EDE1CD",
    borderRadius: 53,
    alignItems: "center",
    justifyContent: "center",
  },
  floatOne: {
    position: "absolute",
    top: 10,
    right: "23%",
    height: 40,
    width: 40,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "12deg" }],
  },
  floatTwo: {
    position: "absolute",
    bottom: 30,
    left: "22%",
    height: 41,
    width: 41,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-12deg" }],
  },
  visualCaption: {
    marginTop: 11,
    fontSize: 8,
    letterSpacing: 1.4,
    color: colors.muted,
  },
  title: {
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -0.6,
  },
  subtitle: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  label: { color: colors.ink, fontSize: 12, fontWeight: "600" },
  inputBox: {
    minHeight: 49,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 11,
    backgroundColor: colors.white,
    paddingLeft: 13,
  },
  input: { flex: 1, fontSize: 13, color: colors.ink, paddingVertical: 12 },
  note: {
    flexDirection: "row",
    gap: 9,
    alignItems: "center",
    backgroundColor: colors.soft,
    padding: 12,
    borderRadius: 10,
  },
  noteText: { flex: 1, fontSize: 10, lineHeight: 17, color: colors.muted },
  footer: { color: colors.muted, fontSize: 10, textAlign: "center" },
});
