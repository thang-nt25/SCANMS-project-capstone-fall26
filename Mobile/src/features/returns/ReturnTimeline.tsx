import { Text, View } from "react-native";
import { colors } from "../../theme/tokens";
const steps = [
  "Shop xét duyệt",
  "Lấy hàng & gửi trả",
  "Nhận & kiểm tra",
  "Hoàn tiền / đổi hàng",
  "Hoàn tất",
];
const stage: Record<string, number> = {
  REQUESTED: 0,
  SHOP_REJECTED: 0,
  SHOP_APPROVED: 1,
  EXPIRED: 1,
  PICKUP_BOOKED: 1,
  RETURN_SHIPPED: 1,
  RETURN_RECEIVED: 2,
  INSPECTING: 2,
  INSPECTION_REJECTED: 2,
  REFUND_PENDING: 3,
  REFUND_PROCESSING: 3,
  REFUND_FAILED: 3,
  EXCHANGE_PENDING: 3,
  EXCHANGE_SHIPPED: 3,
  AWAITING_CUSTOMER_CONFIRMATION: 3,
  COMPLETED: 4,
  CLOSED: 4,
  REFUNDED: 4,
};
export function ReturnTimeline({ status }: { status: string }) {
  const current = stage[status];
  return (
    <View accessibilityLabel="Tiến trình đổi trả" style={{ gap: 10 }}>
      {steps.map((label, index) => (
        <View
          key={label}
          style={{ flexDirection: "row", gap: 10, alignItems: "center" }}
        >
          <Text
            style={{
              borderRadius: 16,
              padding: 7,
              minWidth: 32,
              textAlign: "center",
              backgroundColor:
                current !== undefined && index <= current
                  ? colors.soft
                  : colors.sand,
              color: colors.strong,
            }}
          >
            {current !== undefined && index < current ? "✓" : index + 1}
          </Text>
          <Text
            style={{
              color: index === current ? colors.ink : colors.muted,
              fontWeight: index === current ? "700" : "400",
            }}
          >
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}
