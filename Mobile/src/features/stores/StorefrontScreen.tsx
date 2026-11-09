import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { z } from "zod";
import {
  Avatar,
  Icon,
  IconButton,
  SectionHeading,
} from "../../components/commerce";
import { Empty, ErrorNotice, PageControls } from "../../components/ui";
import { ProductSchema } from "../../types/contracts";
import { useMobileNavigation } from "../../navigation/router";
import { conversations, startConversation } from "../../services/scanms";
import {
  QueryState,
  amount,
  useActor,
  useCommand,
  useResource,
} from "../common/shared";
import type { BusinessParams } from "../workspace/policy";
import { ProductCard } from "../catalog/ProductCard";
import { colors } from "../../theme/tokens";
const Store = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  logoUrl: z.string().nullish(),
  productCount: z.number(),
  followerCount: z.number(),
  rating: amount.nullish(),
  reviewCount: z.number(),
  createdAt: z.string(),
  categories: z.array(z.string()),
});
export function StorefrontScreen({ params }: { params: BusinessParams }) {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [keyword, setKeyword] = useState(""),
    [category, setCategory] = useState("");
  const navigation = useMobileNavigation(),
    command = useCommand(),
    { user } = useActor(),
    id = params.storeId;
  const shop = useResource(
    "storefront",
    `/stores/public/id/${id}`,
    Store,
    Boolean(id),
  );
  const follow = useResource(
    "store-follow",
    `/stores/public/id/${id}/follow`,
    z.object({ following: z.boolean() }),
    Boolean(id),
  );
  const products = useResource(
    "store-products",
    `/public/products?storeId=${id}&page=${page}&limit=20&search=${encodeURIComponent(keyword)}&category=${encodeURIComponent(category)}`,
    z.object({
      items: z.array(ProductSchema),
      pagination: z.object({ totalPages: z.number() }),
    }),
    Boolean(id),
  );
  if (!id) return <Empty text="Mở gian hàng từ sản phẩm hoặc hội thoại." />;
  const submit = () => {
    setKeyword(search.trim());
    setPage(1);
  };
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.canvas }}
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      <QueryState
        loading={shop.isLoading || products.isLoading}
        error={shop.error || products.error || follow.error}
        retry={() => {
          void shop.refetch();
          void products.refetch();
          void follow.refetch();
        }}
      />
      {shop.data && (
        <>
          <View style={styles.hero}>
            <View
              style={{ flexDirection: "row", gap: 13, alignItems: "center" }}
            >
              <Avatar uri={shop.data.logoUrl} name={shop.data.name} size={56} />
              <View style={{ flex: 1, gap: 7 }}>
                <Text style={styles.name}>{shop.data.name}</Text>
                <Text style={styles.heroCaption}>GIAN HÀNG ĐỐI TÁC SCANMS</Text>
              </View>
            </View>
            <Text numberOfLines={3} style={styles.description}>
              {shop.data.description}
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                accessibilityRole="button"
                disabled={command.busy || !follow.data}
                onPress={() =>
                  void command.execute(
                    `/stores/public/id/${id}/follow`,
                    follow.data?.following ? "DELETE" : "POST",
                  )
                }
                style={styles.heroButton}
              >
                <Icon
                  name={follow.data?.following ? "check" : "plus"}
                  size={15}
                  color={colors.white}
                />
                <Text style={styles.heroButtonText}>
                  {command.busy
                    ? "Đang lưu…"
                    : follow.data?.following
                      ? "Đang theo dõi"
                      : "Theo dõi Shop"}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={command.busy}
                onPress={() =>
                  void command.run(async () => {
                    const created = await startConversation({
                      storeId: id,
                      ...(user.role === "CUSTOMER" ? { asCustomer: true } : {}),
                    });
                    const row = (await conversations()).find(
                      (item) => item.id === created.id,
                    );
                    if (!row)
                      throw new Error(
                        "Chưa tải được hội thoại. Hãy mở lại danh sách tin nhắn.",
                      );
                    navigation.navigate("Chat", { conversation: row });
                  })
                }
                style={styles.heroButton}
              >
                <Icon name="message-circle" size={15} color={colors.white} />
                <Text style={styles.heroButtonText}>Chat ngay</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.stats}>
            {[
              { value: String(shop.data.productCount), label: "Sản phẩm" },
              { value: String(shop.data.followerCount), label: "Theo dõi" },
              {
                value:
                  Number(shop.data.rating) > 0
                    ? Number(shop.data.rating).toFixed(1) + " ★"
                    : "—",
                label: "Đánh giá",
              },
            ].map((item) => (
              <View key={item.label} style={styles.stat}>
                <Text style={styles.statValue}>{item.value}</Text>
                <Text style={styles.statLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </>
      )}
      <View style={{ padding: 12 }}>
        <View style={styles.search}>
          <Icon name="search" size={16} color={colors.muted} />
          <TextInput
            accessibilityLabel="Tìm trong Shop"
            placeholder="Tìm trong Shop…"
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={submit}
            returnKeyType="search"
            style={{
              flex: 1,
              fontSize: 13,
              color: colors.ink,
              paddingVertical: 11,
            }}
          />
          <IconButton
            name="arrow-right"
            label="Tìm trong Shop"
            onPress={submit}
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 12 }}
        >
          {["", ...(shop.data?.categories || [])].map((item) => (
            <Pressable
              key={item}
              onPress={() => {
                setCategory(item);
                setPage(1);
              }}
              style={[
                styles.category,
                category === item && {
                  borderColor: colors.brand,
                  backgroundColor: colors.soft,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 11,
                  color: category === item ? colors.strong : colors.muted,
                }}
              >
                {item || "Tất cả sản phẩm"}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <SectionHeading title="Sản phẩm của Shop" />
        <View style={styles.grid}>
          {products.data?.items.map((product) => (
            <View style={{ width: "48.5%" }} key={product.id}>
              <ProductCard
                product={product}
                onPress={() =>
                  navigation.navigate("ProductDetail", { product })
                }
              />
            </View>
          ))}
        </View>
        {products.data?.items.length === 0 && (
          <Empty text="Shop chưa có sản phẩm phù hợp bộ lọc." />
        )}
        <ErrorNotice error={command.error} />
        <PageControls
          page={page}
          totalPages={products.data?.pagination.totalPages || 1}
          loading={products.isFetching}
          onChange={setPage}
        />
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  hero: { backgroundColor: colors.dark, padding: 18, gap: 16 },
  name: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
  },
  heroCaption: { fontSize: 8, color: "#D5C9B4", letterSpacing: 1.2 },
  description: { fontSize: 12, lineHeight: 18, color: "#D5C9B4" },
  heroButton: {
    flex: 1,
    minHeight: 37,
    borderWidth: 1,
    borderColor: "#8F7958",
    borderRadius: 7,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  heroButtonText: { fontSize: 12, color: colors.white, fontWeight: "500" },
  stats: {
    flexDirection: "row",
    backgroundColor: colors.white,
    paddingVertical: 16,
  },
  stat: { flex: 1, alignItems: "center", gap: 5 },
  statValue: { fontSize: 17, fontWeight: "700", color: colors.ink },
  statLabel: { color: colors.muted, fontSize: 11 },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 12,
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  category: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    borderRadius: 16,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
});
