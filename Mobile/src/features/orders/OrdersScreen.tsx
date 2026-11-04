import { useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useMobileNavigation } from "../../navigation/router";
import type { ScreenProps } from "../../navigation/router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { orders } from "../../services/scanms";
import { api } from "../../services/api";
import {
  Badge,
  Button,
  Caption,
  Card,
  Empty,
  ErrorNotice,
  Field,
  Loading,
  PageControls,
  Screen,
  Title,
  s,
} from "../../components/ui";
import { money, OrderSchema, statusText } from "../../types/contracts";
import { useOperation } from "../../hooks/useOperation";
import { useAuth } from "../auth/AuthProvider";
import { useStoreScope } from "../auth/StoreScope";
import { TrackingCard } from "./TrackingCard";
import { FulfillmentForm } from "./FulfillmentForm";
import { CustomerOrderActions } from "./CustomerOrderActions";
import { Choice, DetailLine } from "../common/shared";

export function OrdersScreen() {
  const { session } = useAuth(),
    { store } = useStoreScope();
  const role = session!.user.role;
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1),
    [input, setInput] = useState(""),
    [keyword, setKeyword] = useState("");
  const navigation = useMobileNavigation();
  const result = useQuery({
    queryKey: [session!.user.id, "orders", store?.id, page, keyword, status],
    queryFn: ({ signal }) =>
      orders(role, page, keyword, store?.id, signal, status),
    enabled: role !== "SHOP_MANAGER" || Boolean(store),
  });
  return (
    <Screen>
      <View style={{ padding: 16 }}>
        <Field
          label="Tìm đơn hàng"
          value={input}
          onChangeText={setInput}
          returnKeyType="search"
          onSubmitEditing={() => {
            setKeyword(input.trim());
            setPage(1);
          }}
          placeholder="Mã đơn hoặc tên khách…"
        />
        <Choice
          label="Trạng thái"
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          options={[
            { value: "", label: "Tất cả" },
            ...[
              "PENDING",
              "SHIPPING",
              "DELIVERED",
              "COMPLETED",
              "CANCELLED",
            ].map((value) => ({ value, label: statusText(value) })),
            {
              value: role === "CUSTOMER" ? "RETURNED" : "RETURNS",
              label: "Đổi trả",
            },
          ]}
        />
      </View>
      <ErrorNotice error={result.error} retry={() => void result.refetch()} />
      {result.isLoading ? (
        <Loading />
      ) : (
        <FlatList
          data={result.data?.items || []}
          keyExtractor={(row) => row.id}
          refreshing={result.isRefetching}
          onRefresh={() => void result.refetch()}
          ListEmptyComponent={!result.error ? <Empty /> : undefined}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                navigation.navigate("OrderDetail", { order: item })
              }
            >
              <Card>
                <Caption>{item.store?.name}</Caption>
                <Title>{item.externalOrderSn}</Title>
                <Badge>{statusText(item.status)}</Badge>
                <Text style={s.price}>{money(item.finalAmount)}</Text>
                <Caption>
                  {new Date(item.createdAt).toLocaleString("vi-VN")}
                </Caption>
              </Card>
            </Pressable>
          )}
        />
      )}
      {result.data && (
        <PageControls
          page={page}
          totalPages={result.data.totalPages}
          loading={result.isFetching}
          onChange={setPage}
        />
      )}
    </Screen>
  );
}
export function OrderDetailScreen({
  route,
  navigation,
}: ScreenProps<"OrderDetail">) {
  const { session } = useAuth(),
    { store } = useStoreScope(),
    client = useQueryClient(),
    initial = route.params.order,
    confirm = useOperation();
  const detail = useQuery({
    queryKey: [session!.user.id, "order-detail", initial.id],
    queryFn: async ({ signal }) => {
      if (session!.user.role === "CUSTOMER")
        return OrderSchema.parse(
          await api.request(`/customer/orders/${initial.id}`, { signal }),
        );
      const found = (
        await orders(
          session!.user.role,
          1,
          initial.externalOrderSn,
          store?.id,
          signal,
        )
      ).items.find((item) => item.id === initial.id);
      if (!found)
        throw new Error("Không tìm thấy đơn trong phạm vi tài khoản hiện tại.");
      return found;
    },
    refetchInterval: 15000,
  });
  const order = detail.data || initial;
  const confirmReceipt = () =>
    confirm.run(
      async () => {
        const latest = await detail.refetch();
        if (latest.error || latest.data?.status !== "DELIVERED")
          throw new Error("Đơn chưa ở trạng thái đã giao. Hãy kiểm tra lại.");
        await api.request(`/customer/orders/${order.id}/confirm-receipt`, {
          method: "POST",
        });
      },
      async () => {
        await client.invalidateQueries({
          queryKey: [session!.user.id, "orders"],
        });
        navigation.goBack();
      },
    );
  return (
    <Screen scroll>
      <Title>{order.externalOrderSn}</Title>
      <Badge>{statusText(order.status)}</Badge>
      <Text style={s.price}>{money(order.finalAmount)}</Text>
      <Caption>{order.store?.name}</Caption>
      <Text>{order.customerName}</Text>
      <Text>{order.shippingAddress}</Text>
      {order.totalAmount != null && (
        <DetailLine label="Tiền hàng" value={money(order.totalAmount)} />
      )}
      {order.shippingFee != null && (
        <DetailLine label="Phí vận chuyển" value={money(order.shippingFee)} />
      )}
      {order.discountAmount != null && (
        <DetailLine label="Giảm giá" value={money(order.discountAmount)} />
      )}
      <DetailLine
        label="Phương thức thanh toán"
        value={order.paymentMethod || order.rawPayload?.paymentMethod}
      />
      <DetailLine
        label="Trạng thái thanh toán"
        value={statusText(
          order.paymentStatus || order.rawPayload?.paymentStatus || "",
        )}
      />
      <TrackingCard order={order} />
      {session!.user.role === "SHOP_MANAGER" &&
        detail.data &&
        !detail.error && (
          <FulfillmentForm
            order={detail.data}
            refresh={async () => {
              await detail.refetch();
              await client.invalidateQueries({
                queryKey: [session!.user.id, "orders"],
              });
            }}
          />
        )}
      {order.items?.map((item) => (
        <Card key={item.productId}>
          <Text>{item.title}</Text>
          <Caption>
            Số lượng {item.quantity} · {money(item.unitPrice)}
          </Caption>
        </Card>
      ))}
      {order.orderItems?.map((item) => (
        <Card key={item.id}>
          <Text>{item.product?.title || "Sản phẩm"}</Text>
          <Caption>
            Số lượng {item.quantity} · {money(item.unitPrice)}
          </Caption>
        </Card>
      ))}
      <ErrorNotice error={detail.error} retry={() => void detail.refetch()} />
      <ErrorNotice error={confirm.error} />
      {session!.user.role === "CUSTOMER" && detail.data && !detail.error && (
        <CustomerOrderActions order={detail.data} />
      )}
      {session!.user.role === "CUSTOMER" && order.status === "DELIVERED" && (
        <Button
          title="Xác nhận đã nhận hàng"
          loading={confirm.busy}
          disabled={!detail.data || Boolean(detail.error)}
          onPress={() => void confirmReceipt()}
        />
      )}
    </Screen>
  );
}
