import { validateInput } from "../../utils/validate-input";
import { useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import type { ScreenProps } from "../../navigation/router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { products } from "../../services/scanms";
import { api } from "../../services/api";
import {
  Button,
  Caption,
  Card,
  ErrorNotice,
  Field,
  PageControls,
  Screen,
  Title,
} from "../../components/ui";
import { colors } from "../../theme/tokens";
import { useAuth } from "../auth/AuthProvider";
import { useStoreScope } from "../auth/StoreScope";
import { useOperation } from "../../hooks/useOperation";
import { DealInputSchema } from "./deal-policy";
import type { Product } from "../../types/contracts";

export function DealEditorScreen({
  route,
  navigation,
}: ScreenProps<"DealEditor">) {
  const { session } = useAuth(),
    { store } = useStoreScope(),
    operation = useOperation(),
    client = useQueryClient();
  const role = session!.user.role,
    shop = role === "SHOP_MANAGER";
  const [product, setProduct] = useState<Product | undefined>(
      route.params?.product,
    ),
    [page, setPage] = useState(1);
  const [rate, setRate] = useState("14"),
    [revenue, setRevenue] = useState("1000000"),
    [days, setDays] = useState("14"),
    [plan, setPlan] = useState("");
  const [scope, setScope] = useState<
    "SINGLE_PRODUCT" | "SELECTED_PRODUCTS" | "STORE_WIDE"
  >("SINGLE_PRODUCT");
  const [selected, setSelected] = useState<Product[]>([]),
    [commit, setCommit] = useState(false),
    [budget, setBudget] = useState("1000000"),
    [discount, setDiscount] = useState("5");
  const result = useQuery({
    queryKey: [session!.user.id, "deal-products", store?.id, page],
    queryFn: ({ signal }) =>
      products(role, page, "", shop ? store?.id : undefined, signal),
    enabled: !shop || Boolean(store),
  });
  const sameStore = (item: Product) =>
    (item.storeId || item.store?.id) ===
    (product?.storeId || product?.store?.id);
  const submit = () =>
    operation.run(
      async () => {
        if (!commit) throw new Error("Cần xác nhận cam kết video review.");
        if (shop && !route.params?.collaboratorId)
          throw new Error(
            "Mở đề nghị từ KOC trong AI Matching hoặc quan hệ hợp tác.",
          );
        const body = validateInput(DealInputSchema, {
          productId: product?.id,
          proposedCommissionRate: rate,
          targetRevenue: revenue,
          commitmentDays: days,
          salesCommitment: plan,
          videoReviewCommitment: true,
          scopeType: scope,
          ...(scope === "SELECTED_PRODUCTS"
            ? {
                productIds: [
                  ...new Set(
                    [product?.id, ...selected.map((item) => item.id)].filter(
                      (id): id is string => Boolean(id),
                    ),
                  ),
                ],
              }
            : {}),
        });
        if (selected.some((item) => !sameStore(item)))
          throw new Error("Các sản phẩm phải thuộc cùng một gian hàng.");
        if (
          shop &&
          (!Number.isInteger(Number(discount)) ||
            Number(discount) < 1 ||
            Number(discount) > 20 ||
            !Number.isInteger(Number(budget)) ||
            Number(budget) <= 0)
        )
          throw new Error("Kiểm tra giảm giá và ngân sách coupon.");
        await api.request(
          shop ? "/affiliate-deals/offers" : "/affiliate-deals/proposals",
          {
            method: "POST",
            timeout: 95000,
            body: {
              ...body,
              ...(shop
                ? {
                    collaboratorId: route.params!.collaboratorId,
                    couponTerms: {
                      discountPercent: Number(discount),
                      budgetTotal: Number(budget),
                    },
                  }
                : {}),
            },
          },
        );
      },
      async () => {
        await client.invalidateQueries({
          queryKey: [session!.user.id, "deals"],
        });
        navigation.replace("Deals");
      },
    );
  return (
    <Screen scroll>
      <Title>{shop ? "Đề nghị VIP với KOC" : "Đề xuất VIP với Shop"}</Title>
      <Caption>{route.params?.collaboratorName}</Caption>
      <Caption>
        {product
          ? `Sản phẩm chính: ${product.title}`
          : "Chọn một sản phẩm đã được duyệt."}
      </Caption>
      <ErrorNotice error={result.error} retry={() => void result.refetch()} />
      {result.data?.items
        .filter(
          (item) =>
            !item.moderationStatus || item.moderationStatus === "APPROVED",
        )
        .map((item) => (
          <Pressable
            key={item.id}
            disabled={
              operation.busy ||
              (scope === "SELECTED_PRODUCTS" &&
                Boolean(product) &&
                !sameStore(item))
            }
            onPress={() => {
              if (
                scope === "SELECTED_PRODUCTS" &&
                product &&
                item.id !== product.id
              )
                setSelected((current) =>
                  current.some((p) => p.id === item.id)
                    ? current.filter((p) => p.id !== item.id)
                    : [...current, item],
                );
              else {
                setProduct(item);
                setSelected([]);
              }
            }}
          >
            <Card
              style={{
                marginHorizontal: 0,
                backgroundColor:
                  product?.id === item.id ||
                  selected.some((p) => p.id === item.id)
                    ? colors.soft
                    : colors.white,
              }}
            >
              <Text>{item.title}</Text>
              <Caption>{item.store?.name || store?.name}</Caption>
            </Card>
          </Pressable>
        ))}
      {result.data && (
        <PageControls
          page={page}
          totalPages={result.data.totalPages}
          loading={result.isFetching}
          onChange={setPage}
        />
      )}
      <Caption>Phạm vi áp dụng</Caption>
      {(["SINGLE_PRODUCT", "SELECTED_PRODUCTS", "STORE_WIDE"] as const).map(
        (value, index) => (
          <Button
            key={value}
            title={`${scope === value ? "✓ " : ""}${["Một sản phẩm", "Nhóm sản phẩm", "Toàn gian hàng"][index]}`}
            secondary={scope !== value}
            disabled={operation.busy}
            onPress={() => {
              setScope(value);
              setSelected([]);
            }}
          />
        ),
      )}
      <Field
        label="Thù lao VIP (%) — từ 10 đến 25"
        value={rate}
        onChangeText={setRate}
        keyboardType="decimal-pad"
      />
      {Number(rate) > 16 && (
        <Caption>
          Mức trên 16% cần Admin duyệt sau khi đối tác chấp thuận.
        </Caption>
      )}
      <Field
        label="Mục tiêu doanh thu (đ)"
        value={revenue}
        onChangeText={setRevenue}
        keyboardType="numeric"
      />
      <Field
        label="Kỳ cam kết (ngày)"
        value={days}
        onChangeText={setDays}
        keyboardType="numeric"
      />
      <Field
        label="Kế hoạch hợp tác và video"
        value={plan}
        onChangeText={setPlan}
        multiline
        maxLength={1000}
      />
      {shop && (
        <>
          <Field
            label="Coupon giảm giá (%)"
            value={discount}
            onChangeText={setDiscount}
            keyboardType="numeric"
          />
          <Field
            label="Ngân sách coupon (đ)"
            value={budget}
            onChangeText={setBudget}
            keyboardType="numeric"
          />
        </>
      )}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Switch
          value={commit}
          onValueChange={setCommit}
          trackColor={{ true: colors.brand, false: colors.line }}
        />
        <Text style={{ flex: 1 }}>Cam kết thực hiện video review sản phẩm</Text>
      </View>
      <ErrorNotice error={operation.error} />
      <Button
        title="Gửi đề nghị"
        loading={operation.busy}
        disabled={!product}
        onPress={() => void submit()}
      />
    </Screen>
  );
}
