import { useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import * as Linking from "expo-linking";
import * as Clipboard from "expo-clipboard";
import {
  Button,
  Caption,
  Card,
  ErrorNotice,
  Field,
  Badge,
} from "../../components/ui";
import { Icon, SectionHeading } from "../../components/commerce";
import { BottomSheet } from "../../components/BottomSheet";
import { useOperation } from "../../hooks/useOperation";
import { colors } from "../../theme/tokens";
import { money } from "../../types/contracts";
import { QueryState } from "../common/shared";
import { validateInput } from "../../utils/validate-input";
import {
  TopUpAmountInput,
  isOpenTopUp,
  safePayosCheckout,
  topUpStatusLabels,
} from "./wallet-contracts";
import { useWalletTopUp } from "./useWalletTopUp";
import { paymentQrImage } from "./payment-qr";

export function WalletTopUpPanel() {
  const topup = useWalletTopUp();
  const [value, setValue] = useState("100000"),
    [mode, setMode] = useState<"PAYOS" | "DEMO">("PAYOS");
  const [copied, setCopied] = useState(false);
  const [confirmation, setConfirmation] = useState<
    { kind: "DEMO"; amount: number } | { kind: "CANCEL" } | null
  >(null);
  const local = useOperation();
  const request = topup.request,
    open = Boolean(request && isOpenTopUp(request.status));
  const checkout = safePayosCheckout(request?.checkoutUrl || null);
  const qr = useMemo(() => {
    if (!open || !request?.qrCode) return null;
    try {
      return paymentQrImage(request.qrCode);
    } catch {
      return null;
    }
  }, [open, request?.qrCode]);
  const busy =
    topup.operation.busy ||
    topup.status.isFetching ||
    topup.pending.isFetching ||
    local.busy;
  const inputAmount = () => validateInput(TopUpAmountInput, value);
  return (
    <Card>
      <SectionHeading
        title="Nạp tiền vào ví"
        subtitle="Chọn số tiền và phương thức nạp"
      />
      <QueryState
        loading={topup.availability.isLoading || topup.pending.isLoading}
        error={topup.availability.error || topup.pending.error}
        retry={() => void topup.reload()}
      />
      <ErrorNotice error={topup.operation.error || local.error} />
      {request ? (
        <View style={{ gap: 12 }}>
          <Badge>{topUpStatusLabels[request.status]}</Badge>
          <Text style={styles.amount}>{money(request.amount)}</Text>
          <Caption>Mã giao dịch: {request.orderCode}</Caption>
          {open && (
            <>
              {qr && (
                <Image
                  accessibilityLabel="Mã QR nạp ví payOS"
                  source={{ uri: qr }}
                  resizeMode="contain"
                  style={styles.qr}
                />
              )}
              {request.accountName && (
                <Text style={styles.detail}>
                  Chủ tài khoản: {request.accountName}
                </Text>
              )}
              {request.accountNumber && (
                <Text selectable style={styles.detail}>
                  Số tài khoản: {request.accountNumber}
                </Text>
              )}
              {request.description && (
                <>
                  <Text selectable style={styles.detail}>
                    Nội dung: {request.description}
                  </Text>
                  <Button
                    title={
                      copied
                        ? "Đã sao chép nội dung"
                        : "Sao chép nội dung chuyển khoản"
                    }
                    secondary
                    disabled={local.busy}
                    onPress={() =>
                      void local.run(async () => {
                        await Clipboard.setStringAsync(request.description!);
                        setCopied(true);
                      })
                    }
                  />
                </>
              )}
              <Caption>
                Hạn thanh toán:{" "}
                {new Date(request.expiresAt).toLocaleString("vi-VN")}. Quét QR
                hoặc mở payOS để xem ngân hàng và thông tin chuyển khoản.
              </Caption>
              {checkout && (
                <Button
                  title="Mở trang thanh toán payOS"
                  disabled={local.busy}
                  onPress={() =>
                    void local.run(() => Linking.openURL(checkout))
                  }
                />
              )}
              <Caption>
                Ví chỉ được cộng khi máy chủ xác nhận đã nhận đủ tiền. Quay lại
                app để kiểm tra kết quả.
              </Caption>
              <ErrorNotice error={topup.status.error} />
              <Button
                title="Kiểm tra thanh toán"
                secondary
                loading={topup.status.isFetching}
                disabled={topup.operation.busy}
                onPress={() => void topup.status.refetch()}
              />
              <Button
                title="Hủy mã để đổi số tiền"
                secondary
                disabled={busy}
                onPress={() => setConfirmation({ kind: "CANCEL" })}
              />
            </>
          )}
          {!open && (
            <>
              <Caption>
                {request.status === "PAID"
                  ? "Số dư và lịch sử ví đã được yêu cầu tải lại từ máy chủ."
                  : "Không chuyển tiền vào mã thanh toán đã kết thúc."}
              </Caption>
              <Button
                title="Tạo lần nạp mới"
                secondary
                onPress={() => {
                  setCopied(false);
                  topup.reset();
                }}
              />
            </>
          )}
        </View>
      ) : (
        topup.availability.data &&
        !topup.pending.error && (
          <View style={{ gap: 13 }}>
            {topup.availability.data.demo && (
              <View style={styles.tabs}>
                {(["PAYOS", "DEMO"] as const).map((item) => (
                  <Pressable
                    key={item}
                    accessibilityRole="button"
                    accessibilityState={{ selected: item === mode }}
                    onPress={() => setMode(item)}
                    disabled={busy}
                    style={[styles.tab, item === mode && styles.selected]}
                  >
                    <Text style={styles.tabText}>
                      {item === "PAYOS" ? "Chuyển khoản payOS" : "Thử nghiệm"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
            {mode === "DEMO" ? (
              <Caption>
                Tiền thử nghiệm chỉ dùng để kiểm thử, không phải tiền ngân hàng.
              </Caption>
            ) : (
              <Caption>Chuyển khoản qua payOS để nạp số dư mua sắm.</Caption>
            )}
            <View style={styles.presets}>
              {[100000, 200000, 500000, 1000000].map((amount) => (
                <Pressable
                  key={amount}
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={() => setValue(String(amount))}
                  style={[
                    styles.preset,
                    value === String(amount) && styles.selected,
                  ]}
                >
                  <Text style={styles.presetText}>{money(amount)}</Text>
                </Pressable>
              ))}
            </View>
            <Field
              label="Số tiền nạp (VNĐ)"
              keyboardType="number-pad"
              value={value}
              onChangeText={setValue}
              maxLength={8}
              editable={!busy}
            />
            <Caption>Từ 10.000 đến 50.000.000 đ, nhập số nguyên.</Caption>
            {mode === "DEMO" && topup.demoReceipt && (
              <Badge>Đã nạp thử nghiệm. Số dư được tải lại từ máy chủ.</Badge>
            )}
            {topup.recoveryRequired && (
              <>
                <Caption>
                  Kết quả yêu cầu trước chưa chắc chắn. Kiểm tra giao dịch đang
                  chờ trước khi gửi lại.
                </Caption>
                <Button
                  title="Tải lại giao dịch"
                  secondary
                  onPress={() => void topup.reload()}
                  disabled={busy}
                />
              </>
            )}
            <Button
              title={
                mode === "DEMO" ? "Nạp tiền thử nghiệm" : "Tạo mã nạp payOS"
              }
              loading={topup.operation.busy}
              disabled={
                busy ||
                topup.recoveryRequired ||
                (mode === "DEMO"
                  ? !topup.availability.data.demo
                  : !topup.availability.data.payos)
              }
              onPress={() =>
                void local.run(async () => {
                  const amount = inputAmount();
                  if (mode === "DEMO")
                    setConfirmation({ kind: "DEMO", amount });
                  else await topup.create(amount);
                })
              }
            />
            {!topup.availability.data.payos && mode === "PAYOS" && (
              <Caption>
                payOS chưa sẵn sàng trên máy chủ. Vui lòng thử lại sau.
              </Caption>
            )}
          </View>
        )
      )}
      {confirmation && (
        <BottomSheet
          title={
            confirmation.kind === "DEMO"
              ? "Xác nhận nạp thử nghiệm"
              : "Hủy mã nạp tiền"
          }
          close={() => setConfirmation(null)}
        >
          <Caption>
            {confirmation.kind === "DEMO"
              ? `Cộng ${money(confirmation.amount)} tiền thử nghiệm vào ví hiện tại. Đây không phải giao dịch chuyển tiền ngân hàng.`
              : "Máy chủ sẽ kiểm tra trước khi hủy. Nếu đã nhận tiền, kết quả thanh toán sẽ được giữ lại."}
          </Caption>
          <Button
            title={
              confirmation.kind === "DEMO"
                ? "Xác nhận nạp thử nghiệm"
                : "Xác nhận hủy mã"
            }
            onPress={() => {
              const chosen = confirmation;
              setConfirmation(null);
              if (chosen.kind === "DEMO") void topup.demo(chosen.amount);
              else void topup.cancel();
            }}
          />
          <Button
            title="Quay lại"
            secondary
            onPress={() => setConfirmation(null)}
          />
        </BottomSheet>
      )}
      <View style={styles.secure}>
        <Icon name="shield" size={13} color={colors.strong} />
        <Text style={styles.secureText}>
          Giao dịch được xác nhận tại SCANMS
        </Text>
      </View>
    </Card>
  );
}
const styles = StyleSheet.create({
  amount: { fontSize: 24, fontWeight: "700", color: colors.strong },
  detail: { fontSize: 12, color: colors.ink, lineHeight: 18 },
  qr: {
    width: 230,
    height: 230,
    maxWidth: "100%",
    alignSelf: "center",
    backgroundColor: colors.white,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.sand,
    padding: 4,
    borderRadius: 9,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "transparent",
  },
  tabText: { fontSize: 11, color: colors.ink },
  selected: { backgroundColor: colors.soft, borderColor: colors.brand },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  preset: {
    width: "48%",
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
  },
  presetText: { color: colors.ink, fontSize: 12 },
  secure: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingTop: 13,
  },
  secureText: { color: colors.muted, fontSize: 10 },
});
