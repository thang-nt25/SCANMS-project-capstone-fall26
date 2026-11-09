import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ScreenProps } from "../../navigation/router";
import { api } from "../../services/api";
import { conversations, startConversation } from "../../services/scanms";
import { Icon, type IconName } from "../../components/commerce";
import { ProductPhoto } from "../../components/ProductPhoto";
import { Button, Caption, ErrorNotice, Loading } from "../../components/ui";
import { ConversationSchema, money, statusText } from "../../types/contracts";
import { colors } from "../../theme/tokens";
import { useAuth } from "../auth/AuthProvider";
import { useOperation } from "../../hooks/useOperation";
import { confirmAction } from "../common/shared";
import {
  CheckoutAmountRow,
  CheckoutDisclosure,
} from "../checkout/CheckoutPanels";
import { CreatedPurchase } from "../checkout/checkout-contracts";
import { PayosPurchase } from "../checkout/PayosPurchase";
import { CustomerOrderActions } from "./CustomerOrderActions";
import { TrackingCard } from "./TrackingCard";
import { loadCustomerOrder } from "./customer-order-service";
import {
  canConfirmReceipt,
  orderLines,
  orderPayment,
  orderSubtotal,
  orderTracking,
  paymentMethodLabel,
  paymentStateLabel,
} from "./order-presentation";

const descriptions: Record<string, string> = {
  PENDING: "Shop sẽ kiểm tra và chuẩn bị đơn hàng của bạn.",
  SHIPPING: "Đơn hàng đang trên đường đến bạn.",
  DELIVERED: "Hãy kiểm tra hàng trước khi xác nhận đã nhận.",
  COMPLETED: "Cảm ơn bạn đã mua sắm cùng SCANMS.",
  CANCELLED: "Đơn hàng này đã được hủy.",
  RETURN_REQUESTED: "Shop đang xử lý yêu cầu đổi trả của bạn.",
  DISPUTED: "Yêu cầu đang được bộ phận vận hành xem xét.",
  RETURNED: "Xem hồ sơ đổi trả để theo dõi kết quả xử lý.",
};
const icons: Record<string, IconName> = {
  PENDING: "clock",
  SHIPPING: "truck",
  DELIVERED: "package",
  COMPLETED: "check-circle",
  CANCELLED: "x-circle",
  RETURN_REQUESTED: "rotate-ccw",
  DISPUTED: "alert-circle",
  RETURNED: "rotate-ccw",
};
const shownMoney = (value: string | number | null | undefined) =>
  value == null || !Number.isFinite(Number(value)) ? "—" : money(value);
const shownDate = (value: string) =>
  Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleString("vi-VN")
    : "Chưa cập nhật";

/** One buyer-owned detail view is shared by checkout confirmation and purchase history. */
export function CustomerOrderDetailScreen({
  route,
  navigation,
  onNewPurchase,
}: ScreenProps<"OrderDetail"> & { onNewPurchase?(): void }) {
  const { session } = useAuth();
  const user = session!.user,
    client = useQueryClient(),
    stack = useNavigation(),
    router = useRouter(),
    insets = useSafeAreaInsets();
  const [trackingOpen, setTrackingOpen] = useState(false),
    [addressExpanded, setAddressExpanded] = useState(false),
    [amountExpanded, setAmountExpanded] = useState(false);
  const confirm = useOperation(),
    chat = useOperation();
  const initial = route.params.order;
  useEffect(() => {
    stack.setOptions({ title: "Thông tin đơn hàng" });
  }, [stack]);
  const detail = useQuery({
    queryKey: [
      user.id,
      "order-detail",
      initial?.id || route.params.publicOrderCode,
    ],
    queryFn: ({ signal }) => loadCustomerOrder(api, route.params, signal),
    refetchInterval: 15000,
  });
  const refreshAfterPayment = useCallback(() => {
    void detail.refetch();
    void client.invalidateQueries({ queryKey: [user.id, "orders"] });
  }, [detail.refetch, client, user.id]);
  const order = detail.data || initial;
  if (!order)
    return detail.error ? (
      <View style={s.content}>
        <ErrorNotice error={detail.error} retry={() => void detail.refetch()} />
        <Button
          title="Về đơn mua của tôi"
          secondary
          onPress={() => router.navigate("/(private)/(tabs)/orders")}
        />
      </View>
    ) : (
      <Loading />
    );
  const fresh = Boolean(detail.data && !detail.error && !detail.isFetching);
  const hasDetail = Boolean(detail.data && !detail.error);
  const payment = orderPayment(order),
    tracking = orderTracking(order),
    lines = orderLines(order),
    subtotal = orderSubtotal(order);
  const paymentOrder = CreatedPurchase.safeParse({
    publicOrderCode: order.externalOrderSn,
    finalAmount: Number(order.finalAmount),
    subtotalAmount: subtotal == null ? undefined : Number(subtotal),
    discountAmount:
      order.discountAmount == null ? undefined : Number(order.discountAmount),
    shippingFee:
      order.shippingFee == null ? undefined : Number(order.shippingFee),
    paymentMethod: payment.method,
    paymentStatus: payment.status,
    status: order.status,
  });
  const receipt = () =>
    confirmAction(
      "Xác nhận đã nhận hàng?",
      "Chỉ xác nhận khi bạn đã nhận và kiểm tra sản phẩm.",
      () =>
        void confirm.run(async () => {
          const latest = await detail.refetch();
          if (latest.error || !latest.data || !canConfirmReceipt(latest.data))
            throw new Error(
              "Đơn chưa được giao hoặc đang có yêu cầu đổi trả. Hãy kiểm tra lại.",
            );
          await api.request(
            `/customer/orders/${latest.data.id}/confirm-receipt`,
            { method: "POST" },
          );
          await client.invalidateQueries({ queryKey: [user.id] });
        }),
    );
  const openChat = () =>
    void chat.run(async () => {
      if (!order.store?.id) throw new Error("Chưa có thông tin gian hàng.");
      const created = await startConversation({
        storeId: order.store.id,
        asCustomer: true,
      });
      const conversation = (await conversations()).find(
        (row) => row.id === created.id,
      );
      if (!conversation)
        throw new Error(
          "Hội thoại đã tạo. Vui lòng mở lại từ danh sách tin nhắn.",
        );
      navigation.navigate("Chat", {
        conversation: ConversationSchema.parse(conversation),
      });
    });
  const receiptVisible = ["SHIPPING", "DELIVERED"].includes(order.status);
  return (
    <View style={s.screen}>
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={detail.isRefetching}
            onRefresh={() => void detail.refetch()}
            tintColor={colors.strong}
            colors={[colors.brand]}
          />
        }
      >
        <View style={s.hero}>
          <Icon
            name={icons[order.status] || "package"}
            size={27}
            color={colors.strong}
          />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.heroTitle}>
              {order.status === "PENDING"
                ? "Chờ Shop xác nhận"
                : statusText(order.status)}
            </Text>
            <Text style={s.small}>
              {descriptions[order.status] ||
                "Theo dõi cập nhật mới nhất của đơn hàng."}
            </Text>
            <Text style={s.paymentPill}>
              {paymentStateLabel(payment.status)} ·{" "}
              {paymentMethodLabel(payment.method)}
            </Text>
          </View>
        </View>
        <ErrorNotice error={detail.error} retry={() => void detail.refetch()} />
        <TrackingCard
          order={order}
          compact
          open={trackingOpen}
          onOpenChange={setTrackingOpen}
        />
        <View style={s.panel}>
          <View style={s.sectionHeading}>
            <Icon name="map-pin" size={17} color={colors.strong} />
            <Text style={s.heading}>Địa chỉ nhận hàng</Text>
          </View>
          <Text style={s.recipient}>
            {order.customerName || "Chưa cập nhật người nhận"}
            <Text style={s.small}>
              {order.customerPhone ? ` · ${order.customerPhone}` : ""}
            </Text>
          </Text>
          <Text numberOfLines={addressExpanded ? undefined : 2} style={s.small}>
            {order.shippingAddress || "Chưa cập nhật địa chỉ"}
          </Text>
          {!!order.shippingAddress && order.shippingAddress.length > 65 && (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: addressExpanded }}
              onPress={() => setAddressExpanded(!addressExpanded)}
              style={s.smallAction}
            >
              <Text style={s.link}>
                {addressExpanded ? "Thu gọn" : "Xem đầy đủ địa chỉ"}
              </Text>
            </Pressable>
          )}
        </View>
        <View style={s.panel}>
          <Pressable
            accessibilityRole="button"
            disabled={!order.store?.id}
            onPress={() =>
              order.store &&
              navigation.navigate("Business", {
                feature: "storefront",
                storeId: order.store.id,
              })
            }
            style={s.shop}
          >
            <Icon name="shopping-bag" size={17} color={colors.strong} />
            <Text numberOfLines={1} style={[s.heading, { flex: 1 }]}>
              {order.store?.name || "Gian hàng SCANMS"}
            </Text>
            <Icon name="chevron-right" size={16} color={colors.muted} />
          </Pressable>
          {lines.map((item) => (
            <View key={item.key} style={s.product}>
              <ProductPhoto uri={item.imageUrl} style={s.photo} />
              <View style={{ flex: 1, gap: 5 }}>
                <Text numberOfLines={2} style={s.productTitle}>
                  {item.title}
                </Text>
                {!!item.variantName && (
                  <Text numberOfLines={2} style={s.small}>
                    {item.variantName}
                  </Text>
                )}
                <View style={s.rowBetween}>
                  <Text style={s.price}>{shownMoney(item.unitPrice)}</Text>
                  <Text style={s.small}>×{item.quantity}</Text>
                </View>
              </View>
            </View>
          ))}
          {!lines.length && (
            <Caption>Chưa tải được sản phẩm trong đơn.</Caption>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: amountExpanded }}
            onPress={() => setAmountExpanded(!amountExpanded)}
            style={[s.rowBetween, s.totalRow]}
          >
            <Text style={s.small}>Thành tiền</Text>
            <View style={s.sectionHeading}>
              <Text style={s.total}>{shownMoney(order.finalAmount)}</Text>
              <Icon
                name={amountExpanded ? "chevron-up" : "chevron-down"}
                size={16}
                color={colors.muted}
              />
            </View>
          </Pressable>
          {amountExpanded && (
            <View style={{ gap: 4 }}>
              <CheckoutAmountRow
                label="Tiền hàng"
                value={shownMoney(subtotal)}
              />
              <CheckoutAmountRow
                label="Phí vận chuyển"
                value={shownMoney(order.shippingFee)}
              />
              <CheckoutAmountRow
                label="Giảm giá"
                value={shownMoney(order.discountAmount)}
              />
              {!!order.couponCodeSnapshot && (
                <CheckoutAmountRow
                  label="Mã KOL"
                  value={order.couponCodeSnapshot}
                />
              )}
            </View>
          )}
        </View>
        <View style={s.panel}>
          <Text style={s.heading}>Thông tin thanh toán</Text>
          <CheckoutAmountRow
            label="Phương thức"
            value={paymentMethodLabel(payment.method)}
          />
          <CheckoutAmountRow
            label="Trạng thái"
            value={paymentStateLabel(payment.status)}
          />
          {payment.method === "PAYOS" &&
            payment.status !== "PAID" &&
            hasDetail &&
            paymentOrder.success && (
              <PayosPurchase
                order={paymentOrder.data}
                onPaid={refreshAfterPayment}
                onCancelled={refreshAfterPayment}
              />
            )}
        </View>
        <CheckoutDisclosure
          title="Thông tin mã đơn"
          icon="file-text"
          summary={order.externalOrderSn}
        >
          <Text selectable style={s.heading}>
            {order.externalOrderSn}
          </Text>
          <CheckoutAmountRow
            label="Đặt lúc"
            value={shownDate(order.createdAt)}
          />
          {!!order.deliveredAt && (
            <CheckoutAmountRow
              label="Giao lúc"
              value={shownDate(order.deliveredAt)}
            />
          )}
          {!!order.completedAt && (
            <CheckoutAmountRow
              label="Hoàn tất lúc"
              value={shownDate(order.completedAt)}
            />
          )}
          {!!order.rawPayload?.orderNotes && (
            <Text style={s.small}>Ghi chú: {order.rawPayload.orderNotes}</Text>
          )}
        </CheckoutDisclosure>
        <ErrorNotice error={confirm.error || chat.error} />
        {hasDetail && (
          <View style={{ gap: 8 }}>
            <CustomerOrderActions order={detail.data!} />
            {onNewPurchase &&
              (payment.status === "PAID" || order.status === "CANCELLED") && (
                <Button
                  title="Tạo lần mua mới"
                  secondary
                  disabled={confirm.busy || chat.busy}
                  onPress={onNewPurchase}
                />
              )}
          </View>
        )}
      </ScrollView>
      <View style={[s.footer, { paddingBottom: insets.bottom + 10 }]}>
        <View style={{ flex: 1 }}>
          {receiptVisible ? (
            <Button
              title="Đã nhận được hàng"
              secondary
              loading={confirm.busy}
              disabled={!fresh || !canConfirmReceipt(order) || chat.busy}
              onPress={receipt}
            />
          ) : (
            <Button
              title="Chat Shop"
              secondary
              loading={chat.busy}
              disabled={!fresh || !order.store || confirm.busy}
              onPress={openChat}
            />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Button
            title="Theo dõi đơn"
            disabled={!tracking.code || !fresh || confirm.busy || chat.busy}
            onPress={() => setTrackingOpen(true)}
          />
        </View>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 10, gap: 8, backgroundColor: colors.canvas },
  panel: {
    padding: 12,
    gap: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  hero: {
    padding: 14,
    gap: 12,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: colors.soft,
    borderWidth: 1,
    borderColor: colors.brandBorder,
  },
  heroTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  paymentPill: {
    color: colors.strong,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
  },
  heading: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  small: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
    fontWeight: "400",
  },
  sectionHeading: { flexDirection: "row", alignItems: "center", gap: 8 },
  recipient: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
  },
  smallAction: {
    minHeight: 30,
    alignSelf: "flex-start",
    justifyContent: "center",
  },
  link: { fontSize: 11, fontWeight: "500", color: colors.strong },
  shop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  product: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 5,
    alignItems: "center",
  },
  photo: { width: 64, height: 64, borderRadius: 8 },
  productTitle: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  price: { color: colors.ink, fontSize: 13, fontWeight: "600" },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  totalRow: {
    minHeight: 44,
    paddingTop: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  total: { color: colors.strong, fontSize: 17, fontWeight: "700" },
  footer: {
    flexDirection: "row",
    gap: 8,
    padding: 10,
    backgroundColor: colors.white,
    borderTopColor: colors.line,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
