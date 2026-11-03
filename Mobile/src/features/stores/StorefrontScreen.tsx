import { useState } from "react";
import { Image, Text } from "react-native";
import { z } from "zod";
import {
  Badge,
  Button,
  Caption,
  Card,
  ErrorNotice,
  Field,
  PageControls,
  Screen,
  Title,
} from "../../components/ui";
import { ProductSchema, money } from "../../types/contracts";
import { useMobileNavigation } from "../../navigation/router";
import { QueryState, amount, useCommand, useResource } from "../common/shared";
import type { BusinessParams } from "../workspace/policy";
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
    [keyword, setKeyword] = useState("");
  const navigation = useMobileNavigation(),
    command = useCommand(),
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
    `/public/products?storeId=${id}&page=${page}&limit=20&search=${encodeURIComponent(keyword)}`,
    z.object({
      items: z.array(ProductSchema),
      pagination: z.object({ totalPages: z.number() }),
    }),
    Boolean(id),
  );
  if (!id)
    return (
      <Screen scroll>
        <Caption>Mở gian hàng từ chi tiết sản phẩm hoặc hội thoại.</Caption>
      </Screen>
    );
  return (
    <Screen scroll>
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
          <Title>{shop.data.name}</Title>
          {shop.data.logoUrl && (
            <Image
              source={{ uri: shop.data.logoUrl }}
              style={{ height: 100, width: 100 }}
            />
          )}
          <Text>{shop.data.description}</Text>
          <Caption>
            {shop.data.productCount} sản phẩm · {shop.data.followerCount} người
            theo dõi
          </Caption>
          <Caption>
            {shop.data.rating
              ? `★ ${shop.data.rating} (${shop.data.reviewCount} đánh giá)`
              : "Chưa có đánh giá"}
          </Caption>
          <Caption>
            Tham gia {new Date(shop.data.createdAt).toLocaleDateString("vi-VN")}
          </Caption>
          <Button
            title={
              follow.data?.following
                ? "Đang theo dõi · Bỏ theo dõi"
                : "Theo dõi Shop"
            }
            secondary
            loading={command.busy}
            disabled={!follow.data}
            onPress={() =>
              void command.execute(
                `/stores/public/id/${id}/follow`,
                follow.data?.following ? "DELETE" : "POST",
              )
            }
          />
        </>
      )}
      <Field
        label="Tìm trong gian hàng"
        value={search}
        onChangeText={setSearch}
        returnKeyType="search"
        onSubmitEditing={() => {
          setKeyword(search.trim());
          setPage(1);
        }}
      />
      {products.data?.items.map((product) => (
        <Card key={product.id}>
          {product.imageUrl && (
            <Image
              source={{ uri: product.imageUrl }}
              style={{ width: "100%", aspectRatio: 1 }}
              resizeMode="contain"
            />
          )}
          <Title>{product.title}</Title>
          <Text>{money(product.price)}</Text>
          <Badge>
            {product.rating ? `★ ${product.rating}` : "Chưa có đánh giá"} · Đã
            bán {product.soldCount ?? 0}
          </Badge>
          <Button
            title="Xem sản phẩm"
            secondary
            onPress={() => navigation.navigate("ProductDetail", { product })}
          />
        </Card>
      ))}
      <ErrorNotice error={command.error} />
      <PageControls
        page={page}
        totalPages={products.data?.pagination.totalPages || 1}
        loading={products.isFetching}
        onChange={setPage}
      />
    </Screen>
  );
}
