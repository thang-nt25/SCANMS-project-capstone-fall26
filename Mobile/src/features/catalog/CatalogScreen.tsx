import { useState } from "react";
import { FlatList, Image, Pressable, Text, View } from "react-native";
import { useMobileNavigation } from "../../navigation/router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import { useStoreScope } from "../auth/StoreScope";
import { products } from "../../services/scanms";
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
  s,
} from "../../components/ui";
import { money, statusText } from "../../types/contracts";
import { z } from "zod";
import { useResource } from "../common/shared";
import { SelectField } from "../common/SelectField";

export function CatalogScreen() {
  const { session } = useAuth(),
    { store } = useStoreScope();
  const navigation = useMobileNavigation();
  const [search, setSearch] = useState(""),
    [keyword, setKeyword] = useState(""),
    [page, setPage] = useState(1);
  const role = session!.user.role,
    userId = session!.user.id;
  const shop = role === "SHOP_MANAGER";
  const [category, setCategory] = useState(""),
    [sortBy, setSortBy] = useState("newest");
  const categories = useResource(
    "catalog-categories",
    "/public/products/categories",
    z.array(z.object({ name: z.string(), count: z.number() })),
    !shop,
  );
  const result = useQuery({
    queryKey: [
      userId,
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
  if (shop && !store)
    return (
      <Screen>
        <Empty text="Tài khoản chưa được phân công gian hàng. Liên hệ quản trị viên." />
      </Screen>
    );
  return (
    <Screen>
      <View style={{ padding: 16, gap: 10 }}>
        {shop && <Caption>{store?.name}</Caption>}
        <Field
          label="Tìm sản phẩm"
          placeholder="Tên hoặc mã SKU…"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => {
            setKeyword(search.trim());
            setPage(1);
          }}
          returnKeyType="search"
        />
        <View style={s.row}>
          <Button
            title="Tìm kiếm"
            secondary
            onPress={() => {
              setKeyword(search.trim());
              setPage(1);
            }}
          />
          {shop && (
            <Button
              title="Thêm sản phẩm"
              onPress={() => navigation.navigate("ProductEditor")}
            />
          )}
        </View>
      </View>
      {!shop && (
        <View style={{ paddingHorizontal: 16, gap: 8 }}>
          <SelectField
            label="Danh mục"
            value={category}
            options={[
              { value: "", label: "Tất cả danh mục" },
              ...(categories.data || []).map((item) => ({
                value: item.name,
                label: `${item.name} (${item.count})`,
              })),
            ]}
            onChange={(value) => {
              setCategory(value);
              setPage(1);
            }}
          />
          <SelectField
            label="Sắp xếp"
            value={sortBy}
            options={[
              { value: "newest", label: "Mới nhất" },
              { value: "price_asc", label: "Giá tăng dần" },
              { value: "price_desc", label: "Giá giảm dần" },
            ]}
            onChange={(value) => {
              setSortBy(value);
              setPage(1);
            }}
          />
        </View>
      )}
      <ErrorNotice error={result.error} retry={() => void result.refetch()} />
      {result.isLoading ? (
        <Loading />
      ) : (
        <FlatList
          data={result.data?.items || []}
          keyExtractor={(item) => item.id}
          refreshing={result.isRefetching}
          onRefresh={() => void result.refetch()}
          contentContainerStyle={{ paddingBottom: 12, flexGrow: 1 }}
          ListEmptyComponent={
            !result.error ? (
              <Empty text="Thử đổi từ khóa hoặc quay lại sau." />
            ) : undefined
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                navigation.navigate("ProductDetail", { product: item })
              }
            >
              <Card>
                <View style={s.row}>
                  {item.imageUrl && (
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={{ width: 90, height: 90, borderRadius: 14 }}
                    />
                  )}
                  <View style={{ flex: 1, gap: 6 }}>
                    <Caption>{item.store?.name || store?.name}</Caption>
                    <Text
                      style={{ fontSize: 16, fontWeight: "700" }}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    <Text style={s.price}>{money(item.price)}</Text>
                    {item.moderationStatus ? (
                      <Badge>{statusText(item.moderationStatus)}</Badge>
                    ) : (
                      <Caption>{item.soldCount ?? 0} đã bán</Caption>
                    )}
                  </View>
                </View>
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
