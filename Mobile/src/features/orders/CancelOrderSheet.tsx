import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BottomSheet } from "../../components/BottomSheet";
import { Icon } from "../../components/commerce";
import { Button, ErrorNotice, Field } from "../../components/ui";
import { colors } from "../../theme/tokens";
import { cancellationReasons, CancellationInput } from "./cancel-order";

export function CancelOrderSheet({
  busy,
  error,
  paid,
  submit,
  close,
}: {
  busy: boolean;
  error: unknown;
  paid: boolean;
  submit(body: { reason: string }): void;
  close(): void;
}) {
  const [reason, setReason] = useState(""),
    [details, setDetails] = useState("");
  const input = CancellationInput.safeParse({ reason, details });
  const keepOrder = () => {
    if (!busy) close();
  };
  return (
    <BottomSheet title="Lý do hủy đơn" close={keepOrder}>
      <Text style={s.description}>Chọn lý do để Shop hỗ trợ bạn tốt hơn.</Text>
      <View accessibilityRole="radiogroup" style={s.options}>
        {cancellationReasons.map((item, index) => (
          <Pressable
            key={item.value}
            accessibilityRole="radio"
            accessibilityState={{
              checked: reason === item.value,
              disabled: busy,
            }}
            disabled={busy}
            onPress={() => setReason(item.value)}
            style={[s.option, index > 0 && s.separator]}
          >
            <Icon
              name={reason === item.value ? "check-circle" : "circle"}
              size={19}
              color={reason === item.value ? colors.strong : colors.muted}
            />
            <Text style={s.label}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
      {reason === "OTHER" && (
        <View style={{ gap: 5 }}>
          <Field
            label="Chi tiết lý do"
            placeholder="Nhập lý do hủy đơn…"
            value={details}
            onChangeText={setDetails}
            editable={!busy}
            multiline
            maxLength={500}
            style={{ height: 80, fontSize: 13 }}
          />
          <Text style={s.description}>
            Từ 5 ký tự · {details.trim().length}/500
          </Text>
        </View>
      )}
      {paid && (
        <View style={s.notice}>
          <Icon name="info" size={16} color={colors.strong} />
          <Text style={[s.description, { flex: 1 }]}>
            Đơn đã thanh toán. Liên hệ hỗ trợ để kiểm tra hoàn tiền sau khi hủy.
          </Text>
        </View>
      )}
      <ErrorNotice error={error} />
      <View style={s.actions}>
        <View style={{ flex: 1 }}>
          <Button
            title="Giữ đơn hàng"
            secondary
            disabled={busy}
            onPress={keepOrder}
          />
        </View>
        <View style={{ flex: 1.25 }}>
          <Button
            title="Xác nhận hủy đơn"
            loading={busy}
            disabled={!input.success}
            onPress={() => {
              const latest = CancellationInput.safeParse({ reason, details });
              if (latest.success && !busy) submit(latest.data);
            }}
          />
        </View>
      </View>
    </BottomSheet>
  );
}
const s = StyleSheet.create({
  description: { fontSize: 12, lineHeight: 18, color: colors.muted },
  options: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    overflow: "hidden",
  },
  option: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
  },
  separator: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  label: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.ink },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: colors.soft,
  },
  actions: { flexDirection: "row", gap: 8 },
});
