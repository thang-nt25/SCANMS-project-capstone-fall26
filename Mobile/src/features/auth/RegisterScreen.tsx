import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Button, ErrorNotice, Field } from "../../components/ui";
import { Icon } from "../../components/commerce";
import { colors } from "../../theme/tokens";
import { api } from "../../services/api";
import { ApiError } from "../../services/api/client";
import { createRegistrationService } from "./registration-service";
import { registrationInput, type RegistrationDraft } from "./registration-input";

const service = createRegistrationService(api);
const emptyDraft: RegistrationDraft = { fullName: "", email: "", phoneNumber: "", password: "", confirmPassword: "", agreeTerms: false };

function RegistrationPassword({ label, value, onChange, disabled }: { label: string; value: string; onChange(value: string): void; disabled: boolean }) {
  const [visible, setVisible] = useState(false);
  return <View style={{ gap: 7 }}>
    <Text style={s.label}>{label}</Text>
    <View style={s.passwordBox}>
      <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} editable={!disabled} secureTextEntry={!visible}
        autoCapitalize="none" autoCorrect={false} textContentType="newPassword" maxLength={128}
        placeholder={label} placeholderTextColor={colors.muted} style={s.passwordInput} />
      <Pressable accessibilityRole="button" accessibilityLabel={`${visible ? "Ẩn" : "Hiện"} ${label.toLowerCase()}`} disabled={disabled} onPress={() => setVisible(!visible)} style={{ padding: 13 }}>
        <Icon name={visible ? "eye-off" : "eye"} size={18} color={colors.muted} />
      </Pressable>
    </View>
  </View>;
}

export function RegisterScreen() {
  const router = useRouter();
  const [form, setForm] = useState<RegistrationDraft>({ ...emptyDraft });
  const [pending, setPending] = useState<RegistrationDraft | null>(null);
  const [step, setStep] = useState<"details" | "otp" | "success">("details");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(Date.now);
  const lastEmail = useRef("");
  const lock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (step !== "otp") return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [step]);
  const remaining = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const change = <K extends keyof RegistrationDraft>(key: K, value: RegistrationDraft[K]) => {
    setForm(previous => ({ ...previous, [key]: value }));
    setError(null);
  };
  async function sendCode(resend = false) {
    if (lock.current || (resend && Date.now() < resendAt)) return;
    lock.current = true;
    setBusy(true); setError(null);
    try {
      const draft = resend && pending ? pending : registrationInput(form);
      // Returning to edit the form must not bypass the resend cooldown.
      if (draft.email !== lastEmail.current || Date.now() >= resendAt || resend) {
        await service.sendOtp(draft.email);
        if (!mounted.current) return;
        lastEmail.current = draft.email;
        setResendAt(Date.now() + 60_000);
      }
      if (!mounted.current) return;
      setPending(draft); setOtp(""); setNow(Date.now()); setStep("otp");
    } catch (caught) {
      if (mounted.current) setError(caught);
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function register() {
    if (lock.current || !pending) return;
    lock.current = true; setBusy(true); setError(null);
    try {
      await service.register(pending, otp);
      if (!mounted.current) return;
      // Registration creates no login session. Clear passwords from form state;
      // authentication continues through the existing backend login endpoint.
      setForm({ ...emptyDraft }); setPending(null); setOtp(""); setStep("success");
    } catch (caught) {
      if (mounted.current) setError(caught);
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return <SafeAreaView style={s.screen}>
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Quay lại đăng nhập" disabled={busy} onPress={() => router.replace("/login")} style={s.back}>
        <Icon name="arrow-left" size={22} color={colors.ink} />
      </Pressable>
      <Text style={s.headerTitle}>Đăng ký tài khoản</Text>
    </View>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {step === "success" ? <View style={s.success}>
          <View style={s.symbol}><Icon name="check-circle" size={34} color={colors.strong} /></View>
          <Text style={s.title}>Tạo tài khoản thành công</Text>
          <Text style={s.subtitle}>Email đã được xác thực. Đăng nhập để sử dụng SCANMS. Nếu muốn trở thành KOL/KOC, vào Tôi → Đăng ký KOL/KOC để nộp hồ sơ.</Text>
          <Button title="Đăng nhập ngay" onPress={() => router.replace("/login")} />
        </View> : <>
          <View style={{ gap: 7 }}>
            <Text style={s.eyebrow}>SCANMS · TÀI KHOẢN KHÁCH HÀNG</Text>
            <Text style={s.title}>{step === "details" ? "Bắt đầu cùng SCANMS" : "Xác thực email"}</Text>
            <Text style={s.subtitle}>{step === "details" ? "Tạo tài khoản để theo dõi đơn hàng và kết nối với SCANMS." : `Nhập mã 6 số đã gửi đến ${pending?.email}. Mã có hiệu lực trong 5 phút.`}</Text>
          </View>
          <View style={s.steps} accessibilityLabel={step === "details" ? "Bước 1 trên 2: Thông tin tài khoản" : "Bước 2 trên 2: Xác thực email"}>
            <Text style={[s.step, step === "details" && s.activeStep]}>1. Thông tin</Text>
            <Text style={[s.step, step === "otp" && s.activeStep]}>2. Xác thực email</Text>
          </View>
          {step === "details" ? <View style={s.fields}>
            <Field label="Họ và tên" placeholder="Nhập họ tên của bạn" value={form.fullName} onChangeText={value => change("fullName", value)} editable={!busy} maxLength={100} autoComplete="name" />
            <Field label="Email" placeholder="email@example.com" value={form.email} onChangeText={value => change("email", value)} editable={!busy} maxLength={254} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" />
            <Field label="Số điện thoại (tùy chọn)" placeholder="09xxxxxxxx" value={form.phoneNumber} onChangeText={value => change("phoneNumber", value)} editable={!busy} maxLength={40} keyboardType="phone-pad" autoComplete="tel" />
            <RegistrationPassword label="Mật khẩu" value={form.password} onChange={value => change("password", value)} disabled={busy} />
            <Text style={s.hint}>Tối thiểu 8 ký tự.</Text>
            <RegistrationPassword label="Xác nhận mật khẩu" value={form.confirmPassword} onChange={value => change("confirmPassword", value)} disabled={busy} />
            <Pressable accessibilityRole="checkbox" accessibilityLabel="Đồng ý điều khoản sử dụng SCANMS" accessibilityState={{ checked: form.agreeTerms, disabled: busy }} disabled={busy} onPress={() => change("agreeTerms", !form.agreeTerms)} style={s.terms}>
              <View style={[s.checkbox, form.agreeTerms && s.checked]}>{form.agreeTerms && <Icon name="check" size={15} color={colors.ink} />}</View>
              <Text style={s.termsText}>Tôi đồng ý với điều khoản sử dụng SCANMS.</Text>
            </Pressable>
            <ErrorNotice error={error} />
            <Button title="Tiếp tục · Gửi mã OTP" loading={busy} onPress={() => void sendCode()} />
          </View> : <View style={s.fields}>
            <Field label="Mã OTP" value={otp} onChangeText={value => { setOtp(value.replace(/\D/g, "").slice(0, 6)); setError(null); }} placeholder="Nhập mã gồm 6 số" keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" maxLength={6} editable={!busy} style={s.otp} />
            <ErrorNotice error={error} />
            {error instanceof ApiError && error.unknownOutcome && <Text style={s.hint}>Nếu yêu cầu đã được xử lý, bạn có thể quay lại đăng nhập để kiểm tra tài khoản trước khi gửi lại.</Text>}
            <Button title="Xác thực & tạo tài khoản" loading={busy} disabled={otp.length !== 6} onPress={() => void register()} />
            <Button title={remaining ? `Gửi lại mã sau ${remaining}s` : "Gửi lại mã OTP"} secondary disabled={busy || remaining > 0} onPress={() => void sendCode(true)} />
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setStep("details"); setPending(null); setOtp(""); setError(null); }} style={s.textButton}><Text style={s.link}>Đổi email hoặc thông tin đăng ký</Text></Pressable>
          </View>}
          <View style={s.loginRow}>
            <Text style={s.subtitle}>Đã có tài khoản?</Text>
            <Pressable accessibilityRole="link" disabled={busy} onPress={() => router.replace("/login")} style={s.textButton}><Text style={s.link}>Đăng nhập</Text></Pressable>
          </View>
        </>}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, gap: 8, backgroundColor: colors.white, borderBottomWidth: 1, borderColor: colors.line },
  back: { padding: 9 }, headerTitle: { fontSize: 17, color: colors.ink, fontWeight: "600" },
  content: { padding: 22, gap: 20, paddingBottom: 36, flexGrow: 1 },
  eyebrow: { fontSize: 10, letterSpacing: 1, color: colors.strong, fontWeight: "700" },
  title: { fontSize: 24, lineHeight: 31, color: colors.ink, fontWeight: "700" },
  subtitle: { fontSize: 13, lineHeight: 20, color: colors.muted },
  steps: { flexDirection: "row", padding: 4, backgroundColor: colors.sand, borderRadius: 11, gap: 5 },
  step: { flex: 1, paddingVertical: 10, textAlign: "center", fontSize: 12, color: colors.muted, fontWeight: "600", borderRadius: 8 },
  activeStep: { backgroundColor: colors.white, color: colors.strong }, fields: { gap: 14 },
  label: { color: colors.ink, fontSize: 14, fontWeight: "600" },
  passwordBox: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 12 },
  passwordInput: { flex: 1, fontSize: 15, color: colors.ink, paddingVertical: 13, paddingLeft: 14 },
  hint: { fontSize: 11, lineHeight: 17, color: colors.muted },
  terms: { flexDirection: "row", alignItems: "center", gap: 9, minHeight: 44 },
  termsText: { flex: 1, fontSize: 12, lineHeight: 19, color: colors.muted },
  checkbox: { width: 21, height: 21, borderRadius: 5, borderWidth: 1, borderColor: colors.brand, alignItems: "center", justifyContent: "center" },
  checked: { backgroundColor: colors.brand }, otp: { fontSize: 23, textAlign: "center", letterSpacing: 6 },
  textButton: { padding: 9, alignItems: "center" }, link: { color: colors.strong, fontWeight: "700", fontSize: 13 },
  loginRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, flexWrap: "wrap" },
  success: { gap: 18, justifyContent: "center", flex: 1 },
  symbol: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.soft, alignItems: "center", justifyContent: "center" },
});
