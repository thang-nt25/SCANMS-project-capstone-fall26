import { useRef, useState } from "react";
import { Image, Text, View } from "react-native";
import type { ScreenProps } from "../../navigation/router";
import { useQuery } from "@tanstack/react-query";
import { productDetail, startConversation } from "../../services/scanms";
import { api } from "../../services/api";
import { ConversationSchema, money } from "../../types/contracts";
import {
  Badge,
  Button,
  Caption,
  ErrorNotice,
  Field,
  Loading,
  Screen,
  Title,
  s,
} from "../../components/ui";
import { useAuth } from "../auth/AuthProvider";
import { AddToCart } from "../cart/CartScreen";
import { Evidence, useCommand } from "../common/shared";

export function ProductDetailScreen({
  route,
  navigation,
}: ScreenProps<"ProductDetail">) {
  const { session } = useAuth(),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false),
    lock = useRef(false);
  const command = useCommand();
  const [cooperationNote, setCooperationNote] = useState("");
  const initial = route.params.product,
    shop = session!.user.role === "SHOP_MANAGER",
    koc = session!.user.role === "COLLABORATOR";
  const detail = useQuery({
    queryKey: [session!.user.id, "landing", initial.id],
    queryFn: ({ signal }) => productDetail(initial.id, signal),
    enabled: !shop || initial.moderationStatus === "APPROVED",
  });
  const product = detail.data?.product || initial,
    store = detail.data?.store || initial.store;
  const chat = async () => {
    if (!store || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      const created = await startConversation({
        storeId: store.id,
        ...(koc ? {} : { asCustomer: true }),
      });
      const conversations = (await import("../../services/scanms"))
        .conversations;
      const row = (await conversations()).find(
        (item) => item.id === created.id,
      );
      if (!row)
        throw new Error(
          "Đã tạo hội thoại, hãy tải lại danh sách tin nhắn để mở.",
        );
      navigation.navigate("Chat", {
        conversation: ConversationSchema.parse(row),
      });
    } catch (caught) {
      setError(caught);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const requestCooperation = async () => {
    if (!store || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      if (cooperationNote.trim().length < 5)
        throw new Error("Nhập lời đề nghị hợp tác ít nhất 5 ký tự.");
      await api.request("/store-collaborators/request", {
        method: "POST",
        body: { storeId: store.id, note: cooperationNote.trim() },
      });
      navigation.navigate("Workspace");
    } catch (caught) {
      setError(caught);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <Screen scroll>
      {product.imageUrl && (
        <Image
          source={{ uri: product.imageUrl }}
          style={{ width: "100%", aspectRatio: 1, borderRadius: 22 }}
          resizeMode="cover"
        />
      )}
      <Badge>{store?.name || "Sản phẩm gian hàng"}</Badge>
      <Title>{product.title}</Title>
      <Text style={s.price}>{money(product.price)}</Text>
      <Caption>
        {product.categoryName}
        {product.sku ? ` · ${product.sku}` : ""}
      </Caption>
      <Caption>
        {product.stockQuantity == null
          ? ""
          : `Tồn kho: ${product.stockQuantity}`}
      </Caption>
      <Text style={{ lineHeight: 24 }}>
        {product.rating
          ? `★ ${product.rating} (${product.reviewCount ?? 0} đánh giá)`
          : "Chưa có đánh giá"}{" "}
        · Đã bán {product.soldCount ?? 0}
      </Text>
      {!shop && store && (
        <Button
          title={`Xem gian hàng ${store.name}`}
          secondary
          onPress={() =>
            navigation.navigate("Business", {
              feature: "storefront",
              storeId: store.id,
            })
          }
        />
      )}
      <Text style={{ lineHeight: 24 }}>
        {product.description?.replace(/<[^>]+>/g, " ").trim() ||
          "Gian hàng chưa bổ sung mô tả."}
      </Text>
      {detail.isLoading && !shop && <Loading />}
      <ErrorNotice error={detail.error} retry={() => void detail.refetch()} />
      <ErrorNotice error={error} />
      {detail.data?.reviews && (
        <>
          <Title>Đánh giá ({detail.data.reviews.totalReviews})</Title>
          {detail.data.reviews.items.map((review) => (
            <View
              key={review.id}
              style={{
                padding: 14,
                borderWidth: 1,
                borderColor: "#EAE4D7",
                borderRadius: 14,
                gap: 8,
              }}
            >
              <Caption>
                {review.customerName} · {review.rating} ★
                {review.isVerifiedBuyer ? " · Đã mua hàng" : ""}
              </Caption>
              <Text>{review.comment}</Text>
              <Evidence urls={review.images} />
              {review.reply && <Text>Shop: {review.reply.comment}</Text>}
            </View>
          ))}
        </>
      )}
      {session!.user.role === "CUSTOMER" && (
        <>
          <AddToCart product={product} />
          <Button
            title="Thêm vào yêu thích"
            secondary
            loading={command.busy}
            onPress={() =>
              void command.execute(`/customer/wishlist/${product.id}`, "POST")
            }
          />
          <ErrorNotice error={command.error} />
        </>
      )}
      {!shop && (
        <Button
          title="Nhắn tin gian hàng"
          loading={busy}
          disabled={!store}
          onPress={() => void chat()}
        />
      )}
      {koc && (
        <>
          <Button
            title="Xin sản phẩm mẫu"
            secondary
            onPress={() =>
              navigation.navigate("Business", {
                feature: "samples",
                productId: product.id,
              })
            }
          />
          <Button
            title="Tạo link tiếp thị"
            secondary
            onPress={() =>
              navigation.navigate("Business", {
                feature: "marketing",
                productId: product.id,
              })
            }
          />
          <Button
            title="Xem và đề xuất thỏa thuận VIP"
            secondary
            onPress={() => navigation.navigate("DealEditor", { product })}
          />
          <Field
            label="Lời đề nghị hợp tác"
            value={cooperationNote}
            onChangeText={setCooperationNote}
            multiline
            maxLength={255}
            editable={!busy}
          />
          <Button
            title="Gửi yêu cầu hợp tác"
            secondary
            loading={busy}
            disabled={!store}
            onPress={() => void requestCooperation()}
          />
        </>
      )}
      {shop && (
        <>
          <Button
            title="Sửa sản phẩm & tồn kho"
            secondary
            onPress={() =>
              navigation.navigate("Business", {
                feature: "product-edit",
                productId: product.id,
              })
            }
          />
          <Button
            title="Tìm KOC phù hợp bằng AI"
            disabled={product.moderationStatus !== "APPROVED"}
            onPress={() => navigation.navigate("AiMatching", { product })}
          />
        </>
      )}
    </Screen>
  );
}
