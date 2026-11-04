import { useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter, type Href } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  Avatar,
  Icon,
  SectionHeading,
  type IconName,
} from "../../components/commerce";
import { Empty, ErrorNotice, Loading } from "../../components/ui";
import { colors } from "../../theme/tokens";
import { products, stores } from "../../services/scanms";
import { useMobileNavigation } from "../../navigation/router";
import { useActor, useResource } from "../common/shared";
import { CartSchema } from "../customer/customer-contracts";
import type { BusinessFeature } from "../workspace/policy";
import { ProductCard } from "./ProductCard";
import {
  MarketplaceHeader,
  MarketplaceServices,
  MarketplacePromotions,
} from "./MarketplaceHeader";

export function MarketplaceHomeScreen() {
  const { user } = useActor(),
    navigation = useMobileNavigation(),
    router = useRouter();
  const [search, setSearch] = useState("");
  const catalog = useQuery({
    queryKey: [user.id, "market-home"],
    queryFn: ({ signal }) => products("CUSTOMER", 1, "", undefined, signal),
  });
  const partners = useQuery({
    queryKey: [user.id, "market-stores"],
    queryFn: stores,
  });
  const categories = useResource(
    "catalog-categories",
    "/public/products/categories",
    z.array(z.object({ name: z.string(), count: z.number() })),
  );
  const cart = useResource("cart", "/customer/cart", CartSchema);
  const notifications = useResource(
    "notification-count",
    "/notifications/unread-count",
    z.object({ unreadCount: z.number() }),
  );
  const browse = (category = "", keyword = "") =>
    router.navigate({
      pathname: "/(private)/(tabs)/catalog",
      params: { category, q: keyword, entry: String(Date.now()) },
    } as Href);
  const open = (feature: BusinessFeature) =>
    navigation.navigate("Business", { feature });
  const shortcuts: { title: string; icon: IconName; action(): void }[] = [
    { title: "Voucher", icon: "tag", action: () => open("coupons") },
    {
      title: "Đơn mua",
      icon: "package",
      action: () => router.navigate("/(private)/(tabs)/orders"),
    },
    { title: "Yêu thích", icon: "heart", action: () => open("wishlist") },
    { title: "Ví SCANMS", icon: "credit-card", action: () => open("wallet") },
    { title: "Đổi trả", icon: "rotate-ccw", action: () => open("returns") },
    { title: "Địa chỉ", icon: "map-pin", action: () => open("addresses") },
  ];
  return (
    <View style={styles.screen}>
      <MarketplaceHeader
        search={search}
        setSearch={setSearch}
        submit={() => browse("", search.trim())}
        cartCount={
          cart.data?.items.reduce((sum, item) => sum + item.quantity, 0) || 0
        }
        unread={notifications.data?.unreadCount || 0}
        openCart={() => open("cart")}
        openChat={() => router.navigate("/(private)/(tabs)/chat")}
        openNotifications={() => open("notifications")}
      />
      <FlatList
        data={catalog.data?.items || []}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={{ gap: 10 }}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshing={catalog.isRefetching}
        onRefresh={() => {
          void catalog.refetch();
          void partners.refetch();
          void cart.refetch();
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={{ marginHorizontal: -12 }}>
              <MarketplaceServices
                shortcuts={shortcuts}
                openWallet={() => open("wallet")}
                openCoupons={() => open("coupons")}
              />
              <MarketplacePromotions
                openCoupons={() => open("coupons")}
                browse={() => browse()}
              />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categories}
            >
              <Pressable
                onPress={() => browse()}
                style={[styles.category, { backgroundColor: colors.dark }]}
              >
                <Icon name="grid" size={13} color={colors.white} />
                <Text style={[styles.categoryText, { color: colors.white }]}>
                  Tất cả
                </Text>
              </Pressable>
              {categories.data?.map((category) => (
                <Pressable
                  key={category.name}
                  onPress={() => browse(category.name)}
                  style={styles.category}
                >
                  <Text style={styles.categoryText}>{category.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <SectionHeading
              title="Gợi ý hôm nay"
              subtitle="Khám phá sản phẩm trên SCANMS"
              action="Xem tất cả"
              onPress={() => browse()}
            />
            <ErrorNotice
              error={catalog.error}
              retry={() => void catalog.refetch()}
            />
          </>
        }
        ListEmptyComponent={
          catalog.isLoading ? (
            <Loading />
          ) : !catalog.error ? (
            <Empty text="Sản phẩm từ các gian hàng sẽ xuất hiện tại đây." />
          ) : undefined
        }
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={() =>
              navigation.navigate("ProductDetail", { product: item })
            }
          />
        )}
        ListFooterComponent={
          <View style={{ paddingBottom: 20 }}>
            <SectionHeading
              title="Gian hàng đối tác"
              subtitle="Nhiều lựa chọn, cùng một điểm đến"
            />
            <ErrorNotice
              error={partners.error}
              retry={() => void partners.refetch()}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10 }}
            >
              {partners.data?.map((shop) => (
                <Pressable
                  accessibilityRole="button"
                  key={shop.id}
                  style={styles.shopCard}
                  onPress={() =>
                    navigation.navigate("Business", {
                      feature: "storefront",
                      storeId: shop.id,
                    })
                  }
                >
                  <Avatar uri={shop.logoUrl} name={shop.name} size={42} />
                  <Text numberOfLines={2} style={styles.shopName}>
                    {shop.name}
                  </Text>
                  <Text style={styles.shopLink}>Ghé thăm Shop →</Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.footer}>
              <Icon name="shield" size={15} color={colors.strong} />
              <Text style={styles.footerText}>
                SCANMS · Kết nối gian hàng và nhà sáng tạo
              </Text>
            </View>
          </View>
        }
      />
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  list: { paddingHorizontal: 12, paddingBottom: 14 },
  categories: { gap: 8, paddingBottom: 2, paddingTop: 12 },
  category: {
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 18,
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  categoryText: { fontSize: 11, fontWeight: "500", color: colors.muted },
  shopCard: {
    alignItems: "center",
    width: 130,
    gap: 8,
    backgroundColor: colors.white,
    padding: 13,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  shopName: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 16,
    textAlign: "center",
    height: 32,
  },
  shopLink: { fontSize: 10, color: colors.strong },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    paddingTop: 22,
  },
  footerText: { fontSize: 10, color: colors.muted },
});
