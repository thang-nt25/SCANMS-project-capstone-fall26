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
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { AppBar, Icon, IconButton } from "../../components/commerce";
import { Empty, ErrorNotice, Loading, PageControls } from "../../components/ui";
import { useMobileNavigation } from "../../navigation/router";
import { products } from "../../services/scanms";
import { colors } from "../../theme/tokens";
import { useAuth } from "../auth/AuthProvider";
import { useStoreScope } from "../auth/StoreScope";
import { useResource } from "../common/shared";
import { ProductCard } from "./ProductCard";

export function CatalogScreen() {
  const { session } = useAuth(),
    { store } = useStoreScope(),
    navigation = useMobileNavigation();
  const params = useLocalSearchParams<{
    q?: string;
    category?: string;
    entry?: string;
  }>();
  const [search, setSearch] = useState(""),
    [keyword, setKeyword] = useState(""),
    [page, setPage] = useState(1);
  const [category, setCategory] = useState(""),
    [sortBy, setSortBy] = useState("newest");
  const role = session!.user.role,
    shop = role === "SHOP_MANAGER";
  useEffect(() => {
    setSearch(params.q || "");
    setKeyword(params.q || "");
    setCategory(params.category || "");
    setPage(1);
  }, [params.q, params.category, params.entry]);
  const categories = useResource(
    "catalog-categories",
    "/public/products/categories",
    z.array(z.object({ name: z.string(), count: z.number() })),
    !shop,
  );
  const result = useQuery({
    queryKey: [
      session!.user.id,
      "products",
      store?.id,
      role,
      keyword,
      page,
      category,
      sortBy,
    ],
    queryFn: ({ signal }) =>
      products(role, page, keyword, shop ? store?.id : undefined, signal, {
        category,
        sortBy,
      }),
    enabled: !shop || Boolean(store),
  });
  const submit = () => {
    setKeyword(search.trim());
    setPage(1);
  };
  return (
    <View style={styles.screen}>
      <AppBar
        title={shop ? "Sản phẩm của Shop" : "Khám phá"}
        subtitle={shop ? store?.name : "Tìm điều bạn yêu thích"}
      >
        {shop ? (
          <IconButton
            name="plus"
            label="Thêm sản phẩm"
            onPress={() => navigation.navigate("ProductEditor")}
          />
        ) : (
          <IconButton
            name="sliders"
            label="Đổi thứ tự giá"
            onPress={() => {
              setSortBy(sortBy === "price_asc" ? "price_desc" : "price_asc");
              setPage(1);
            }}
          />
        )}
        {role === "CUSTOMER" && (
          <IconButton
            name="shopping-cart"
            label="Giỏ hàng"
            onPress={() => navigation.navigate("Business", { feature: "cart" })}
          />
        )}
      </AppBar>
      <View style={styles.filterPanel}>
        <View style={styles.search}>
          <Icon name="search" size={17} color={colors.muted} />
          <TextInput
            accessibilityLabel="Tìm sản phẩm"
            placeholder={
              shop ? "Tên sản phẩm hoặc SKU…" : "Tìm sản phẩm, thương hiệu…"
            }
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={submit}
            returnKeyType="search"
          />
          <IconButton
            name={search ? "x" : "arrow-right"}
            label={search ? "Xóa tìm kiếm" : "Tìm kiếm"}
            onPress={
              search
                ? () => {
                    setSearch("");
                    setKeyword("");
                    setPage(1);
                  }
                : submit
            }
          />
        </View>
        {!shop && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 10 }}
          >
            {[
              { name: "", label: "Tất cả" },
              ...(categories.data || []).map((item) => ({
                name: item.name,
                label: item.name,
              })),
            ].map((item) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: item.name === category }}
                key={item.name}
                onPress={() => {
                  setCategory(item.name);
                  setPage(1);
                }}
                style={[
                  styles.category,
                  item.name === category && styles.categoryActive,
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    item.name === category && { color: colors.strong },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
        {!shop && (
          <View style={styles.sorts}>
            {[
              { value: "newest", label: "Mới nhất" },
              { value: "price_asc", label: "Giá tăng" },
              { value: "price_desc", label: "Giá giảm" },
            ].map((item) => (
              <Pressable
                key={item.value}
                accessibilityRole="button"
                accessibilityState={{ selected: item.value === sortBy }}
                onPress={() => {
                  setSortBy(item.value);
                  setPage(1);
                }}
                style={[
                  styles.sort,
                  sortBy === item.value && { borderBottomColor: colors.brand },
                ]}
              >
                <Text
                  style={[
                    styles.sortText,
                    sortBy === item.value && {
                      color: colors.strong,
                      fontWeight: "700",
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
      <ErrorNotice error={result.error} retry={() => void result.refetch()} />
      {shop && !store ? (
        <Empty text="Tài khoản chưa được phân công gian hàng." />
      ) : result.isLoading ? (
        <Loading />
      ) : (
        <FlatList
          data={result.data?.items || []}
          numColumns={2}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: 12,
            paddingBottom: 24,
            flexGrow: 1,
          }}
          columnWrapperStyle={{ gap: 10 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          showsVerticalScrollIndicator={false}
          refreshing={result.isRefetching}
          onRefresh={() => void result.refetch()}
          ListHeaderComponent={
            <Text style={styles.count}>
              {result.data?.total ?? 0} sản phẩm
              {keyword ? ` cho “${keyword}”` : ""}
            </Text>
          }
          ListEmptyComponent={
            !result.error ? (
              <Empty text="Thử từ khóa khác hoặc chọn danh mục mới." />
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
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  filterPanel: { backgroundColor: colors.white, paddingHorizontal: 14 },
  search: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 11,
    backgroundColor: colors.canvas,
    borderRadius: 10,
    borderColor: colors.line,
    borderWidth: 1,
    gap: 8,
  },
  input: { flex: 1, color: colors.ink, fontSize: 13, paddingVertical: 10 },
  category: {
    borderRadius: 16,
    minHeight: 31,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.line,
  },
  categoryActive: { backgroundColor: colors.soft, borderColor: colors.brand },
  categoryText: { fontSize: 11, color: colors.muted },
  sorts: { flexDirection: "row", paddingTop: 3 },
  sort: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  sortText: { fontSize: 12, color: colors.muted },
  count: { fontSize: 11, color: colors.muted, marginBottom: 10 },
});
