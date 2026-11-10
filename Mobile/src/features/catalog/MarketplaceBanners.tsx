import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Icon } from "../../components/commerce";
import { ProductPhoto } from "../../components/ProductPhoto";
import { imageSource } from "../../services/image-source";
import { colors } from "../../theme/tokens";
import type { Product } from "../../types/contracts";

function headline(category: string | null | undefined): string {
  if (category?.includes("Chăm sóc")) return "Chăm chút\nmỗi ngày";
  if (category?.includes("điện tử")) return "Tiện nghi\ntrong tầm tay";
  if (category?.includes("Thời trang")) return "Mặc đẹp theo\ncách của bạn";
  return "Khám phá\nđiều bạn thích";
}

/** Editorial banners use current catalog photos and open the exact featured product. */
export function MarketplaceBanners({
  products,
  openProduct,
}: {
  products: readonly Product[];
  openProduct(product: Product): void;
}) {
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const shops = new Set<string>();
  // Give different merchants space; never advertise an unavailable item or invent offers.
  const featured = products
    .filter((product) => {
      const shop = product.store?.id || product.storeId || product.id;
      if (
        shops.has(shop) ||
        product.isActive === false ||
        product.stockQuantity === 0 ||
        !imageSource(product.imageUrl)
      )
        return false;
      shops.add(shop);
      return true;
    })
    .slice(0, 3);

  if (!featured.length) return null;

  return (
    <View style={styles.section}>
      <View
        style={styles.viewport}
        onLayout={({ nativeEvent }) => {
          const measured = Math.round(nativeEvent.layout.width);
          if (measured !== width) {
            setWidth(measured);
            setPage(0);
          }
        }}
      >
        {width > 0 && (
          <ScrollView
            key={width}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={({ nativeEvent }) =>
              setPage(Math.round(nativeEvent.contentOffset.x / width))
            }
          >
            {featured.map((product) => (
              <Pressable
                key={product.id}
                accessibilityRole="button"
                accessibilityLabel={`Khám phá ${product.title}`}
                accessibilityHint="Mở chi tiết sản phẩm"
                onPress={() => openProduct(product)}
                style={({ pressed }) => [
                  styles.banner,
                  { width },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View style={styles.copy}>
                  <Text style={styles.eyebrow}>KHÁM PHÁ CÙNG SCANMS</Text>
                  <Text style={styles.headline}>
                    {headline(product.categoryName)}
                  </Text>
                  <Text numberOfLines={2} style={styles.description}>
                    {product.title}
                  </Text>
                  <View style={styles.cta}>
                    <Text style={styles.ctaText}>Khám phá ngay</Text>
                    <Icon name="arrow-right" size={13} color={colors.white} />
                  </View>
                </View>
                <View style={styles.visual}>
                  <ProductPhoto
                    uri={product.imageUrl}
                    resizeMode="contain"
                    style={styles.photo}
                  />
                  {product.store?.name && (
                    <Text numberOfLines={1} style={styles.shop}>
                      {product.store.name}
                    </Text>
                  )}
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
      {featured.length > 1 && (
        <View
          style={styles.pagination}
          accessibilityLabel={`Banner ${Math.min(page + 1, featured.length)} trên ${featured.length}`}
        >
          {featured.map((product, index) => (
            <View
              key={product.id}
              style={[
                styles.dot,
                index === Math.min(page, featured.length - 1) &&
                  styles.activeDot,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: 12, paddingTop: 12, gap: 8 },
  viewport: {
    minHeight: 214,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: colors.soft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.brandBorder,
  },
  banner: {
    minHeight: 214,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.soft,
  },
  copy: { flex: 1, padding: 16, paddingRight: 8, gap: 8 },
  eyebrow: {
    fontSize: 8,
    lineHeight: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: colors.strong,
  },
  headline: {
    fontSize: 22,
    lineHeight: 27,
    fontWeight: "800",
    color: colors.ink,
  },
  description: { fontSize: 11, lineHeight: 16, color: colors.muted },
  cta: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 3,
    paddingHorizontal: 12,
    minHeight: 36,
    borderRadius: 18,
    backgroundColor: colors.strong,
  },
  ctaText: { fontSize: 11, fontWeight: "700", color: colors.white },
  visual: { width: "43%", paddingRight: 12, paddingVertical: 14, gap: 8 },
  photo: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: colors.white,
  },
  shop: {
    fontSize: 9,
    lineHeight: 13,
    textAlign: "center",
    color: colors.muted,
  },
  pagination: { flexDirection: "row", justifyContent: "center", gap: 5 },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.brandBorder,
  },
  activeDot: { width: 18, backgroundColor: colors.strong },
});
