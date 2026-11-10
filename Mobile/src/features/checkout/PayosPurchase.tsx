import { useEffect, useMemo, useState } from "react";
import { Image, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { z } from "zod";
import { api } from "../../services/api";
import { unwrapEnvelope } from "../../services/api/client";
import { Button, Caption, Badge, ErrorNotice } from "../../components/ui";
import { useAuth } from "../auth/AuthProvider";
import { useOperation } from "../../hooks/useOperation";
import { safePayosCheckout } from "../wallets/wallet-contracts";
import { paymentQrImage } from "../wallets/payment-qr";
import {
  CreatedPurchase,
  PaymentLink,
  PaymentStatus,
} from "./checkout-contracts";

export function PayosPurchase({
  order,
  onPaid,
  onCancelled,
}: {
  order: CreatedPurchase;
  onPaid(): void;
  onCancelled(): void;
}) {
  const { session } = useAuth();
  const userId = session!.user.id;
  const operation = useOperation();
  const [link, setLink] = useState<z.infer<typeof PaymentLink> | null>(null);
  const path = `/orders/payos/${encodeURIComponent(order.publicOrderCode)}`;
  const status = useQuery({
    queryKey: [userId, "purchase-payment", order.publicOrderCode],
    queryFn: async ({ signal }) =>
      PaymentStatus.parse(
        unwrapEnvelope(
          await api.request(`${path}/status`, { signal, timeout: 30000 }),
        ),
      ),
    enabled: order.paymentStatus !== "PAID" && order.status !== "CANCELLED",
    refetchInterval: (query) =>
      query.state.data?.paymentStatus === "PAID" ||
      query.state.data?.orderStatus === "CANCELLED" ||
      ["EXPIRED", "CANCELLED"].includes(query.state.data?.providerStatus || "")
        ? false
        : 5000,
    retry: false,
  });
  const paid =
    order.paymentStatus === "PAID" || status.data?.paymentStatus === "PAID";
  useEffect(() => {
    if (status.data?.paymentStatus === "PAID" && order.paymentStatus !== "PAID")
      onPaid();
  }, [status.data?.paymentStatus, order.paymentStatus, onPaid]);
  useEffect(() => {
    if (
      status.data?.orderStatus === "CANCELLED" &&
      order.status !== "CANCELLED"
    )
      onCancelled();
  }, [status.data?.orderStatus, order.status, onCancelled]);
  const checkout = safePayosCheckout(link?.checkoutUrl || null);
  const qr = useMemo(() => {
    try {
      return link?.qrCode ? paymentQrImage(link.qrCode) : null;
    } catch {
      return null;
    }
  }, [link?.qrCode]);
  if (paid) return <Badge>Đã xác nhận thanh toán</Badge>;
  if (order.status === "CANCELLED" || status.data?.orderStatus === "CANCELLED")
    return <Caption>Đơn hàng đã hủy; không chuyển tiền cho đơn này.</Caption>;
  const expired = ["EXPIRED", "CANCELLED"].includes(
    status.data?.providerStatus || "",
  );
  return (
    <View style={{ gap: 10 }}>
      <ErrorNotice error={status.error} retry={() => void status.refetch()} />
      <ErrorNotice error={operation.error} />
      {expired ? (
        <Caption>
          Phiên PayOS đã hết hạn hoặc bị hủy. Kiểm tra đơn mua trước khi thanh
          toán lại.
        </Caption>
      ) : (
        <>
          {qr && (
            <Image
              source={{ uri: qr }}
              style={{ width: 220, height: 220, alignSelf: "center" }}
            />
          )}
          {link?.accountNumber && (
            <Text selectable>
              {link.accountName} · {link.accountNumber}
            </Text>
          )}
          <Button
            title={link ? "Tải lại mã thanh toán" : "Lấy mã QR PayOS"}
            secondary
            loading={operation.busy}
            onPress={() =>
              void operation.run(async () => {
                const result = PaymentLink.parse(
                  unwrapEnvelope(
                    await api.request(`${path}/link`, {
                      method: "POST",
                      body: {},
                      timeout: 30000,
                    }),
                  ),
                );
                if (result.paymentStatus === "PAID") {
                  onPaid();
                  return;
                }
                if (
                  !result.qrCode ||
                  !safePayosCheckout(result.checkoutUrl || null)
                )
                  throw new Error("Chưa nhận được thông tin PayOS hợp lệ.");
                setLink(result);
              })
            }
          />
          {checkout && (
            <Button
              title="Mở trang thanh toán PayOS"
              loading={operation.busy}
              onPress={() =>
                void operation.run(() => Linking.openURL(checkout))
              }
            />
          )}
        </>
      )}
      <Button
        title="Kiểm tra thanh toán"
        secondary
        disabled={status.isFetching}
        onPress={() => void status.refetch()}
      />
    </View>
  );
}
