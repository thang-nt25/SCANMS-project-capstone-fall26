import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { z } from "zod";
import { BottomSheet } from "../../components/BottomSheet";
import { Icon } from "../../components/commerce";
import { Button, ErrorNotice, Field } from "../../components/ui";
import { useOperation } from "../../hooks/useOperation";
import { api } from "../../services/api";
import { unwrapEnvelope } from "../../services/api/client";
import { colors } from "../../theme/tokens";
import { validateInput } from "../../utils/validate-input";
import { profileStyles as ps } from "./profile-styles";

const Code = z.string().regex(/^\d{6}$/, "Nhập đủ 6 chữ số trong email.");
const Password = z.object({
  newPassword: z.string().min(6, "Mật khẩu cần ít nhất 6 ký tự.").max(128, "Mật khẩu tối đa 128 ký tự."),
  confirm: z.string(),
}).refine(value => value.newPassword === value.confirm, { message: "Mật khẩu nhập lại chưa khớp.", path: ["confirm"] });
const Sent = z.object({ maskedEmail: z.string(), expiresIn: z.number().optional(), resendAfter: z.number().optional() });

/** Uses the authenticated actor ID on the server for all five roles. */
export function PasswordRecoverySheet({ email, close, done }: { email?: string | null; close(): void; done(): void }) {
  const operation = useOperation();
  const [step, setStep] = useState<"send" | "code" | "password">("send");
  const [newEmail, setNewEmail] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [visible, setVisible] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const tick = () => setSeconds(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [resendAt]);
  const registered = Boolean(email?.trim());
  const send = () => void operation.run(async () => {
    const body = registered ? {} : { email: validateInput(z.string().trim().email("Nhập email hợp lệ để nhận mã."), newEmail).toLowerCase() };
    const result = Sent.parse(unwrapEnvelope(await api.request("/customer/send-password-otp", { method: "POST", body })));
    setMaskedEmail(result.maskedEmail);
    setResendAt(Date.now() + (result.resendAfter ?? 60) * 1000);
    setOtp("");
    setStep("code");
  });
  return <BottomSheet title="Khôi phục mật khẩu" close={() => { if (!operation.busy) close(); }}>
    <View style={ps.inline}><View style={ps.icon}><Icon name={step === "password" ? "lock" : "mail"} color={colors.strong} size={20} /></View><View style={{ flex: 1, gap: 3 }}><Text style={ps.title}>{step === "send" ? "Nhận mã qua email" : step === "code" ? "Nhập mã xác thực" : "Đặt mật khẩu mới"}</Text><Text style={ps.note}>{step === "send" ? "Không cần nhập mật khẩu hiện tại." : `Mã 6 số gửi tới ${maskedEmail} · hiệu lực 5 phút.`}</Text></View></View>
    <View style={{ flexDirection: "row", gap: 6 }}>{["Email", "Mã OTP", "Mật khẩu"].map((label, index) => <View key={label} style={[ps.tab, ["send", "code", "password"].indexOf(step) === index && ps.active]}><Text style={ps.note}>{index + 1}. {label}</Text></View>)}</View>
    {step === "send" && (registered ? <View style={{ padding: 12, borderRadius: 12, backgroundColor: colors.canvas, gap: 4 }}><Text style={ps.note}>Email tài khoản</Text><Text style={ps.label}>{email}</Text></View> : <><Field label="Email nhận mã *" value={newEmail} onChangeText={setNewEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} maxLength={255} editable={!operation.busy} placeholder="tenban@gmail.com" /><Text style={ps.note}>Email được lưu vào tài khoản sau khi xác thực và đặt mật khẩu thành công.</Text></>)}
    {step === "code" && <><Field label="Mã OTP 6 số" value={otp} onChangeText={value => setOtp(value.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={6} editable={!operation.busy} placeholder="000000" style={{ textAlign: "center", fontSize: 24, letterSpacing: 8 }} /><View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><Text style={ps.note}>Kiểm tra cả thư rác.</Text><Pressable accessibilityRole="button" disabled={operation.busy || seconds > 0} onPress={send} style={{ minHeight: 44, justifyContent: "center" }}><Text style={{ fontSize: 12, fontWeight: "600", color: seconds ? colors.muted : colors.strong }}>{seconds ? `Gửi lại sau ${seconds}s` : "Gửi lại mã"}</Text></Pressable></View></>}
    {step === "password" && <><Field label="Mật khẩu mới (từ 6 ký tự)" value={newPassword} onChangeText={setNewPassword} secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} maxLength={128} editable={!operation.busy} /><Field label="Nhập lại mật khẩu mới" value={confirm} onChangeText={setConfirm} secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} maxLength={128} editable={!operation.busy} /><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: visible }} onPress={() => setVisible(value => !value)} style={[ps.inline, { minHeight: 44 }]}><Icon name={visible ? "eye-off" : "eye"} size={17} color={colors.muted} /><Text style={ps.note}>{visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}</Text></Pressable><Pressable accessibilityRole="button" disabled={operation.busy} onPress={() => { operation.clearError(); setStep("code"); }} style={{ minHeight: 44, justifyContent: "center" }}><Text style={ps.note}>Nhập mã khác / Gửi lại mã</Text></Pressable></>}
    <ErrorNotice error={operation.error} />
    <View style={{ flexDirection: "row", gap: 10, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 }}><View style={{ flex: 1 }}><Button title="Hủy" secondary disabled={operation.busy} onPress={close} /></View><View style={{ flex: 2 }}><Button title={step === "send" ? "Gửi mã xác thực" : step === "code" ? "Xác thực mã" : "Lưu mật khẩu mới"} soft loading={operation.busy} onPress={step === "send" ? send : () => void operation.run(async () => {
      const code = validateInput(Code, otp);
      if (step === "code") {
        await api.request("/customer/verify-password-otp", { method: "POST", body: { otp: code } });
        setStep("password");
      } else {
        const input = validateInput(Password, { newPassword, confirm });
        await api.request("/customer/set-password-with-otp", { method: "POST", body: { otp: code, newPassword: input.newPassword } });
        done();
      }
    })} /></View></View>
  </BottomSheet>;
}
