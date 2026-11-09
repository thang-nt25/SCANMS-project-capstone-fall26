import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProductPhoto } from "../../components/ProductPhoto";
import { useQueryClient } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Caption,
  Empty,
  ErrorNotice,
} from "../../components/ui";
import { Icon, IconButton } from "../../components/commerce";
import { api } from "../../services/api";
import { money, type Product } from "../../types/contracts";
import {
  CartSchema,
  addCartLine,
  type CartItem,
} from "../customer/customer-contracts";
import {
  QueryState,
  confirmAction,
  useActor,
  useCommand,
  useResource,
} from "../common/shared";
import { useOperation } from "../../hooks/useOperation";
import { useMobileNavigation } from "../../navigation/router";
import { colors } from "../../theme/tokens";
import {
  buyNowSelection,
  type PurchaseLine,
} from "../checkout/checkout-contracts";

export function AddToCart({
  product,
  onOpenCart,
  initialVariantId,
  onBuyNow,
  onAdded,
}: {
  product: Product;
  onOpenCart?(): void;
  initialVariantId?: string;
  onBuyNow?(line: PurchaseLine): void;
  onAdded?(): void;
}) {
  const [variantId, setVariantId] = useState(() => {
      const active = (product.variants || []).filter(
        (item) => item.isActive !== false,
      );
      return active.some((item) => item.id === initialVariantId)
        ? initialVariantId!
        : active.length === 1
          ? active[0].id
          : "";
    }),
    [quantity, setQuantity] = useState(1),
    [success, setSuccess] = useState(false);
  const operation = useOperation(),
    client = useQueryClient(),
    { user } = useActor(),
    navigation = useMobileNavigation();
  const variants = (product.variants || []).filter(
    (item) => item.isActive !== false,
  );
  const chosen = variants.find((item) => item.id === variantId),
    stock = chosen?.stockQuantity ?? product.stockQuantity ?? 0;
  return (
    <View style={{ gap: 16 }}>
      <View style={styles.productRow}>
        <ProductPhoto
          uri={chosen?.imageUrl || product.imageUrl}
          style={styles.image}
        />
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={styles.price}>
            {money(chosen?.price ?? product.price)}
          </Text>
          <Text style={styles.meta}>
            {variants.length > 0 && !chosen
              ? "Chọn phân loại để xem tồn kho"
              : `Còn ${stock} sản phẩm`}
          </Text>
        </View>
      </View>
      {variants.length > 0 && (
        <>
          <Text style={styles.label}>Phân loại sản phẩm</Text>
          <View style={styles.variants}>
            {variants.map((item) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{
                  selected: item.id === variantId,
                  disabled: item.stockQuantity <= 0 || operation.busy,
                }}
                key={item.id}
                disabled={item.stockQuantity <= 0 || operation.busy}
                onPress={() => {
                  setVariantId(item.id);
                  setQuantity(1);
                  setSuccess(false);
                }}
                style={[
                  styles.variant,
                  variants.length > 1 && styles.variantHalf,
                  item.id === variantId && styles.variantSelected,
                  item.stockQuantity <= 0 && { opacity: 0.4 },
                ]}
              >
                <ProductPhoto
                  uri={item.imageUrl || product.imageUrl}
                  style={styles.variantPhoto}
                />
                <Text
                  numberOfLines={2}
                  style={{
                    fontSize: 12,
                    flex: 1,
                    lineHeight: 17,
                    color: item.id === variantId ? colors.strong : colors.ink,
                  }}
                >
                  {item.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
      <View style={styles.quantityRow}>
        <Text style={styles.label}>Số lượng</Text>
        <Quantity
          value={quantity}
          disabled={operation.busy}
          max={stock}
          onChange={setQuantity}
        />
      </View>
      {stock > 0 && quantity >= stock && (
        <Text style={styles.meta}>
          Bạn đã chọn số lượng tối đa còn trong kho.
        </Text>
      )}
      <ErrorNotice error={operation.error} />
      {success && (
        <>
          <Badge>Đã thêm vào giỏ hàng</Badge>
          <Button
            title="Xem giỏ hàng"
            secondary
            onPress={() => {
              onOpenCart?.();
              navigation.navigate("Business", { feature: "cart" });
            }}
          />
        </>
      )}
      <Button
        title={onBuyNow ? "Mua ngay" : "Thêm vào giỏ hàng"}
        loading={operation.busy}
        disabled={(variants.length > 0 && !variantId) || stock < 1}
        onPress={() =>
          void operation.run(async () => {
            setSuccess(false);
            if (stock < quantity)
              throw new Error("Số lượng vượt quá tồn kho hiện tại.");
            if (onBuyNow) {
              onBuyNow(
                buyNowSelection(product, variantId || undefined, quantity),
              );
              return;
            }
            // Refresh before replacing the cart. Only real SKU IDs are submitted.
            const cart = CartSchema.parse(await api.request("/customer/cart"));
            const items = addCartLine(
              cart.items,
              product.id,
              variantId || undefined,
              quantity,
            );
            const response = CartSchema.parse(
              await api.request("/customer/cart", {
                method: "PUT",
                body: { items },
              }),
            );
            await client.invalidateQueries({
              queryKey: [user.id, "business", "cart"],
            });
            if (response.warnings?.length)
              throw new Error(response.warnings.join("\n"));
            setSuccess(true);
            // Close only after the API accepted the cart without warnings.
            onAdded?.();
          })
        }
      />
    </View>
  );
}
function Quantity({
  value,
  disabled,
  max,
  onChange,
}: {
  value: number;
  disabled: boolean;
  max: number;
  onChange(value: number): void;
}) {
  return (
    <View style={styles.counter}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Giảm số lượng"
        disabled={disabled || value <= 1}
        onPress={() => onChange(value - 1)}
        style={styles.counterButton}
      >
        <Icon
          name="minus"
          size={14}
          color={disabled || value <= 1 ? colors.line : colors.ink}
        />
      </Pressable>
      <Text style={styles.counterValue}>{value}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Tăng số lượng"
        disabled={disabled || value >= max}
        onPress={() => onChange(value + 1)}
        style={styles.counterButton}
      >
        <Icon
          name="plus"
          size={14}
          color={disabled || value >= max ? colors.line : colors.ink}
        />
      </Pressable>
    </View>
  );
}
export function CartScreen() {
  const insets = useSafeAreaInsets();
  const cart = useResource("cart", "/customer/cart", CartSchema),
    command = useCommand(),
    router = useRouter(),
    navigation = useMobileNavigation();
  const change = (item: CartItem, quantity: number) =>
    void command.run(async () => {
      const latest = CartSchema.parse(await api.request("/customer/cart"));
      const items = latest.items
        .filter((row) => row.cartItemId !== item.cartItemId || quantity > 0)
        .map((row) => ({
          productId: row.productId,
          ...(row.variantId ? { variantId: row.variantId } : {}),
          quantity:
            row.cartItemId === item.cartItemId ? quantity : row.quantity,
        }));
      const saved = CartSchema.parse(
        await api.request("/customer/cart", { method: "PUT", body: { items } }),
      );
      await cart.refetch();
      if (saved.warnings?.length) throw new Error(saved.warnings.join("\n"));
    });
  const groups = new Map<string, CartItem[]>();
  cart.data?.items.forEach((item) =>
    groups.set(item.store.id, [...(groups.get(item.store.id) || []), item]),
  );
  const total =
    cart.data?.items.reduce(
      (sum, item) => sum + Number(item.price) * item.quantity,
      0,
    ) || 0;
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <ScrollView
        contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: 24 }}
      >
        <View style={styles.quantityRow}>
          <Text style={styles.label}>
            {cart.data?.items.length ?? 0} sản phẩm trong giỏ
          </Text>
          <IconButton
            name="refresh-cw"
            label="Làm mới giỏ hàng"
            disabled={cart.isFetching}
            onPress={() => void cart.refetch()}
          />
        </View>
        <QueryState
          loading={cart.isLoading}
          error={cart.error}
          retry={() => void cart.refetch()}
        />
        <ErrorNotice error={command.error} />
        {cart.data?.items.length === 0 && (
          <Empty text="Giỏ hàng đang trống. Khám phá sản phẩm bạn yêu thích nhé." />
        )}
        {[...groups.entries()].map(([storeId, items]) => (
          <View style={styles.group} key={storeId}>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                navigation.navigate("Business", {
                  feature: "storefront",
                  storeId,
                })
              }
              style={styles.shopHeader}
            >
              <Icon name="shopping-bag" size={16} color={colors.strong} />
              <Text numberOfLines={1} style={[styles.label, { flex: 1 }]}>
                {items[0].store.name}
              </Text>
              <Icon name="chevron-right" size={16} color={colors.muted} />
            </Pressable>
            {items.map((item) => (
              <View key={item.cartItemId} style={styles.cartLine}>
                <View style={styles.image}>
                  <ProductPhoto
                    uri={item.imageUrl}
                    style={StyleSheet.absoluteFill}
                  />
                </View>
                <View style={{ flex: 1, gap: 8 }}>
                  <Text style={styles.title} numberOfLines={2}>
                    {item.title}
                  </Text>
                  {item.variantName && (
                    <Text style={styles.meta}>{item.variantName}</Text>
                  )}
                  <Text style={styles.linePrice}>{money(item.price)}</Text>
                  {(!item.isActive || item.stockQuantity < 1) && (
                    <Text style={{ color: colors.danger, fontSize: 11 }}>
                      Sản phẩm hiện không khả dụng
                    </Text>
                  )}
                  <View style={styles.quantityRow}>
                    <Quantity
                      value={item.quantity}
                      disabled={command.busy || cart.isFetching}
                      max={item.isActive ? item.stockQuantity : item.quantity}
                      onChange={(value) => change(item, value)}
                    />
                    <IconButton
                      name="trash-2"
                      label={`Bỏ ${item.title} khỏi giỏ`}
                      disabled={command.busy}
                      onPress={() =>
                        confirmAction("Bỏ khỏi giỏ hàng?", item.title, () =>
                          change(item, 0),
                        )
                      }
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.quantityRow}>
          <Text style={styles.label}>Tổng tiền hàng</Text>
          <Text style={styles.price}>{money(total)}</Text>
        </View>
        <Button
          title="Khám phá thêm sản phẩm"
          onPress={() => router.navigate("/(private)/(tabs)/catalog")}
        />
        <Caption>Thanh toán trên website SCANMS bằng cùng tài khoản.</Caption>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  productRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  image: {
    width: 84,
    height: 84,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: colors.sand,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 13, lineHeight: 18, color: colors.ink },
  price: { fontSize: 20, fontWeight: "700", color: colors.strong },
  linePrice: { fontSize: 14, fontWeight: "700", color: colors.strong },
  meta: { fontSize: 11, color: colors.muted, lineHeight: 16 },
  label: { fontSize: 13, fontWeight: "600", color: colors.ink },
  variants: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  variant: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 49,
  },
  variantHalf: { width: "48.5%" },
  variantPhoto: { width: 31, height: 31, borderRadius: 4, overflow: "hidden" },
  variantSelected: { borderColor: colors.brand, backgroundColor: colors.soft },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  counter: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 7,
    overflow: "hidden",
  },
  counterButton: {
    height: 33,
    width: 33,
    alignItems: "center",
    justifyContent: "center",
  },
  counterValue: {
    fontSize: 12,
    color: colors.ink,
    minWidth: 28,
    textAlign: "center",
  },
  group: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    borderRadius: 13,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  shopHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  cartLine: { flexDirection: "row", gap: 12, padding: 13 },
  bottom: {
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    padding: 15,
    gap: 10,
  },
});
