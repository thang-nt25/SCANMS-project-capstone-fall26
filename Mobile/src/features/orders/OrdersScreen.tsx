import { useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMobileNavigation, type ScreenProps } from "../../navigation/router";
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
  Loading,
  PageControls,
  Screen,
  Title,
  s,
} from "../../components/ui";
import { AppBar, Icon, IconButton } from "../../components/commerce";
import { colors } from "../../theme/tokens";
import { money, OrderSchema, statusText } from "../../types/contracts";
import { useOperation } from "../../hooks/useOperation";
import { useAuth } from "../auth/AuthProvider";
import { useStoreScope } from "../auth/StoreScope";
import { TrackingCard } from "./TrackingCard";
import { FulfillmentForm } from "./FulfillmentForm";
import { CustomerOrderActions } from "./CustomerOrderActions";
import { DetailLine } from "../common/shared";
import { ProductPhoto } from "../../components/ProductPhoto";

export function OrdersScreen() {
  const { session } = useAuth(),
    { store } = useStoreScope(),
    params = useLocalSearchParams<{ status?: string; entry?: string }>();
  const role = session!.user.role,
    navigation = useMobileNavigation();
  const [status, setStatus] = useState(""),
    [page, setPage] = useState(1),
    [input, setInput] = useState(""),
    [keyword, setKeyword] = useState("");
  useEffect(() => {
    setStatus(params.status || "");
    setPage(1);
  }, [params.status, params.entry]);
  const result = useQuery({
    queryKey: [session!.user.id, "orders", store?.id, page, keyword, status],
    queryFn: ({ signal }) =>
      orders(role, page, keyword, store?.id, signal, status),
    enabled: role !== "SHOP_MANAGER" || Boolean(store),
  });
  const filters = [
    { value: "", label: "Tất cả" },
    { value: "PENDING", label: "Chờ xác nhận" },
    { value: "SHIPPING", label: "Đang giao" },
    { value: "DELIVERED", label: "Đã giao" },
    { value: "COMPLETED", label: "Hoàn tất" },
    { value: role === "CUSTOMER" ? "RETURNED" : "RETURNS", label: "Đổi trả" },
    { value: "CANCELLED", label: "Đã hủy" },
  ];
  const submit = () => {
    setKeyword(input.trim());
    setPage(1);
  };
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <AppBar
        title={role === "CUSTOMER" ? "Đơn mua của tôi" : "Quản lý đơn hàng"}
        subtitle={role === "SHOP_MANAGER" ? store?.name : undefined}
      >
        <IconButton
          name="refresh-cw"
          label="Làm mới đơn hàng"
          disabled={result.isFetching}
          onPress={() => void result.refetch()}
        />
      </AppBar>
      <View style={orderStyles.search}>
        <Icon name="search" size={16} color={colors.muted} />
        <TextInput
          accessibilityLabel="Tìm đơn hàng"
          placeholder="Tìm theo mã đơn hàng…"
          placeholderTextColor={colors.muted}
          style={{
            flex: 1,
            fontSize: 13,
            color: colors.ink,
            paddingVertical: 10,
          }}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={submit}
          returnKeyType="search"
        />
        <IconButton name="arrow-right" label="Tìm đơn" onPress={submit} />
      </View>
      <View style={{ backgroundColor: colors.white }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 15 }}
        >
          {filters.map((item) => (
            <Pressable
              key={item.value}
              accessibilityRole="button"
              accessibilityState={{ selected: item.value === status }}
              onPress={() => {
                setStatus(item.value);
                setPage(1);
              }}
              style={[
                orderStyles.filter,
                item.value === status && { borderBottomColor: colors.brand },
              ]}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: item.value === status ? colors.strong : colors.muted,
                  fontWeight: item.value === status ? "700" : "400",
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <ErrorNotice error={result.error} retry={() => void result.refetch()} />
      {result.isLoading ? (
        <Loading />
      ) : (
        <FlatList
          data={result.data?.items || []}
          keyExtractor={(item) => item.id}
          refreshing={result.isRefetching}
          onRefresh={() => void result.refetch()}
          contentContainerStyle={{
            padding: 12,
            paddingBottom: 24,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            !result.error ? (
              <Empty
                title="Chưa có đơn hàng"
                text="Các đơn ở trạng thái này sẽ xuất hiện tại đây."
              />
            ) : undefined
          }
          renderItem={({ item }) => {
            const product = item.orderItems?.[0]?.product,
              title =
                product?.title ||
                item.items?.[0]?.title ||
                "Sản phẩm trong đơn hàng";
            const quantity =
              item.orderItems?.reduce((sum, row) => sum + row.quantity, 0) ||
              item.items?.reduce((sum, row) => sum + row.quantity, 0);
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={"Xem đơn " + item.externalOrderSn}
                onPress={() =>
                  navigation.navigate("OrderDetail", { order: item })
                }
                style={orderStyles.card}
              >
                <View style={orderStyles.shop}>
                  <Icon name="shopping-bag" size={14} color={colors.strong} />
                  <Text style={orderStyles.shopName} numberOfLines={1}>
                    {item.store?.name || "SCANMS"}
                  </Text>
                  <Text style={orderStyles.status}>
                    {statusText(item.status)}
                  </Text>
                </View>
                <View style={orderStyles.product}>
                  <View style={orderStyles.image}>
                    <ProductPhoto
                      uri={product?.imageUrl}
                      style={StyleSheet.absoluteFill}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 7 }}>
                    <Text style={orderStyles.title} numberOfLines={2}>
                      {title}
                    </Text>
                    <Text numberOfLines={1} style={orderStyles.meta}>
                      {item.externalOrderSn}
                    </Text>
                    <Text style={orderStyles.meta}>
                      {quantity ? String(quantity) + " sản phẩm · " : ""}
                      {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                    </Text>
                  </View>
                </View>
                <View style={orderStyles.summary}>
                  <Text style={orderStyles.meta}>Thành tiền</Text>
                  <Text style={orderStyles.price}>
                    {money(item.finalAmount)}
                  </Text>
                </View>
                <Text style={orderStyles.link}>Xem chi tiết đơn hàng →</Text>
              </Pressable>
            );
          }}
          ListFooterComponent={
            result.data ? (
              <PageControls
                page={page}
                totalPages={result.data.totalPages}
                loading={result.isFetching}
                onChange={setPage}
              />
            ) : undefined
          }
        />
      )}
    </View>
  );
}
const orderStyles = StyleSheet.create({
  search: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    paddingLeft: 13,
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  filter: {
    paddingVertical: 13,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  card: {
    padding: 13,
    borderRadius: 13,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    gap: 12,
  },
  shop: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  shopName: { flex: 1, fontSize: 12, fontWeight: "600", color: colors.ink },
  status: { fontSize: 10, color: colors.strong },
  product: { flexDirection: "row", gap: 12 },
  image: {
    width: 72,
    height: 72,
    borderRadius: 9,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.soft,
  },
  title: { fontSize: 13, fontWeight: "500", lineHeight: 18, color: colors.ink },
  meta: { fontSize: 11, color: colors.muted },
  summary: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    paddingTop: 12,
  },
  price: { fontSize: 16, fontWeight: "700", color: colors.strong },
  link: { fontSize: 11, color: colors.muted, textAlign: "right" },
});

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
