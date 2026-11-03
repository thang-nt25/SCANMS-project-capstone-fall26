import { useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Button,
  Caption,
  ErrorNotice,
  Field,
  Title,
} from "../../components/ui";
import { colors } from "../../theme/tokens";
import { useAuth } from "./AuthProvider";

export function LoginScreen() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState(""),
    [password, setPassword] = useState(""),
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            padding: 26,
            gap: 24,
          }}
        >
          <Image
            source={require("../../../assets/scanms-logo-full.png")}
            style={{ width: 225, height: 78, alignSelf: "center" }}
            resizeMode="contain"
          />
          <View style={{ gap: 8 }}>
            <Text
              style={{
                color: colors.strong,
                fontWeight: "700",
                letterSpacing: 1.5,
              }}
            >
              SCANMS COMMERCE NETWORK
            </Text>
            <Title>Đăng nhập</Title>
            <Caption>
              Kết nối mua sắm, gian hàng và nhà sáng tạo trên cùng một nền tảng.
            </Caption>
          </View>
          <View
            style={{
              padding: 20,
              gap: 18,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: colors.line,
              backgroundColor: colors.white,
            }}
          >
            <Field
              label="Email hoặc số điện thoại"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
              textContentType="username"
            />
            <Field
              label="Mật khẩu"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!busy}
              textContentType="password"
              onSubmitEditing={() => void submit()}
            />
            <ErrorNotice error={error} />
            <Button
              title="Đăng nhập an toàn"
              loading={busy}
              onPress={() => void submit()}
            />
          </View>
          <Caption>
            Dùng tài khoản SCANMS hiện có. Không lưu mật khẩu trên thiết bị.
          </Caption>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
