import { Pressable, StyleSheet, Text, View } from "react-native";
import { ProductPhoto } from "../../components/ProductPhoto";
import { Icon } from "../../components/commerce";
import { colors } from "../../theme/tokens";
import { money, type Product } from "../../types/contracts";

export function ProductCard({
  product,
  onPress,
}: {
  product: Product;
  onPress(): void;
}) {
  const price = Number(product.price),
    original = Number(product.originalPrice);
  const discount =
    original > price && price >= 0
      ? Math.round((1 - price / original) * 100)
      : 0;
  const rated = Number(product.rating) > 0 && (product.reviewCount || 0) > 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${product.title}, ${money(product.price)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }]}
    >
      <View style={styles.photo}>
        <ProductPhoto uri={product.imageUrl} style={StyleSheet.absoluteFill} />
        {discount > 0 && (
          <View style={styles.discount}>
            <Text style={styles.discountText}>−{discount}%</Text>
          </View>
        )}
      </View>
      <View style={styles.body}>
        <Text numberOfLines={2} style={styles.title}>
          {product.title}
        </Text>
        <Text style={styles.price}>{money(product.price)}</Text>
        <View style={styles.meta}>
          {rated && (
            <View style={styles.rating}>
              <Icon name="star" size={10} color={colors.strong} />
              <Text style={styles.metaText}>
                {Number(product.rating).toFixed(1)}
              </Text>
            </View>
          )}
          <Text style={styles.metaText}>
            Đã bán {compactCount(product.soldCount || 0)}
          </Text>
        </View>
        {product.store?.name && (
          <View style={styles.meta}>
            <Icon name="shopping-bag" size={10} color={colors.muted} />
            <Text numberOfLines={1} style={styles.shop}>
              {product.store.name}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}
export function compactCount(value: number): string {
  return value >= 1000
    ? `${(value / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}k`
    : String(value);
}
const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    overflow: "hidden",
    borderColor: colors.line,
    borderWidth: StyleSheet.hairlineWidth,
  },
  photo: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: colors.sand,
    alignItems: "center",
    justifyContent: "center",
  },
  discount: {
    position: "absolute",
    top: 7,
    left: 7,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 5,
    backgroundColor: colors.soft,
  },
  discountText: { color: colors.strong, fontSize: 10, fontWeight: "700" },
  body: { padding: 10, gap: 7 },
  title: {
    fontSize: 13,
    lineHeight: 18,
    minHeight: 36,
    fontWeight: "500",
    color: colors.ink,
  },
  price: { fontSize: 16, fontWeight: "700", color: colors.strong },
  meta: { flexDirection: "row", alignItems: "center", gap: 4 },
  rating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginRight: 3,
  },
  metaText: { fontSize: 10, color: colors.muted },
  shop: { flex: 1, fontSize: 10, color: colors.muted },
});
