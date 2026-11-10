import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useNavigation } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProductPhoto } from "../../components/ProductPhoto";
import { useQuery } from "@tanstack/react-query";
import {
  Avatar,
  Icon,
  IconButton,
  SectionHeading,
} from "../../components/commerce";
import {
  Badge,
  Button,
  ErrorNotice,
  Field,
  Loading,
} from "../../components/ui";
import type { ScreenProps } from "../../navigation/router";
import { api } from "../../services/api";
import {
  conversations,
  productDetail,
  startConversation,
} from "../../services/scanms";
import { ConversationSchema, money } from "../../types/contracts";
import { colors } from "../../theme/tokens";
import { useAuth } from "../auth/AuthProvider";
import { AddToCart } from "../cart/CartScreen";
import { Evidence, useCommand } from "../common/shared";
import { BottomSheet } from "../../components/BottomSheet";
import { compactCount } from "./ProductCard";

export function ProductDetailScreen({
  route,
  navigation,
}: ScreenProps<"ProductDetail">) {
  const { session } = useAuth(),
    { width } = useWindowDimensions(),
    stack = useNavigation();
  const insets = useSafeAreaInsets();
  const [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false),
    lock = useRef(false);
  const [cooperationNote, setCooperationNote] = useState(""),
    [cartOpen, setCartOpen] = useState(false),
    [purchaseMode, setPurchaseMode] = useState<"CART" | "BUY_NOW">("CART"),
    [previewVariantId, setPreviewVariantId] = useState<string>(),
    [imageIndex, setImageIndex] = useState(0),
    [expanded, setExpanded] = useState(false),
    [moreReviews, setMoreReviews] = useState(false),
    [saved, setSaved] = useState(false);
  const command = useCommand(),
    initial = route.params.product,
    shop = session!.user.role === "SHOP_MANAGER",
    koc = session!.user.role === "COLLABORATOR",
    customer = session!.user.role === "CUSTOMER";
  const detail = useQuery({
    queryKey: [session!.user.id, "landing", initial.id],
    queryFn: ({ signal }) => productDetail(initial.id, signal),
    enabled: !shop || initial.moderationStatus === "APPROVED",
  });
  const product = detail.data?.product || initial,
    store = detail.data?.store || initial.store;
  useEffect(() => {
    stack.setOptions({
      title: "Sản phẩm",
      headerRight: customer
        ? () => (
            <IconButton
              name="shopping-cart"
              label="Giỏ hàng"
              onPress={() =>
                navigation.navigate("Business", { feature: "cart" })
              }
            />
          )
        : undefined,
    });
  }, [stack, customer, navigation]);
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
  const photos = [
    ...new Set(
      [product.imageUrl, ...(product.subImages || [])].filter(
        (uri): uri is string => Boolean(uri),
      ),
    ),
  ];
  const discount =
    Number(product.originalPrice) > Number(product.price)
      ? Math.round(
          (1 - Number(product.price) / Number(product.originalPrice)) * 100,
        )
      : 0;
  const reviews = detail.data?.reviews;
  const variants = (product.variants || []).filter(
    (item) => item.isActive !== false,
  );
  const rating = reviews?.averageRating ?? (Number(product.rating) || 0);
  const reviewCount = reviews?.totalReviews ?? product.reviewCount ?? 0;
  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        <View style={{ backgroundColor: colors.white }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) =>
              setImageIndex(
                Math.round(event.nativeEvent.contentOffset.x / width),
              )
            }
          >
            {photos.length ? (
              photos.map((uri) => (
                <ProductPhoto
                  key={uri}
                  uri={uri}
                  style={{ width, height: width * 0.9 }}
                  resizeMode="contain"
                />
              ))
            ) : (
              <View
                style={{
                  width,
                  height: width * 0.9,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="image" size={50} color={colors.line} />
              </View>
            )}
          </ScrollView>
          {photos.length > 1 && (
            <View style={styles.photoCount}>
              <Text style={styles.photoCountText}>
                {imageIndex + 1} / {photos.length}
              </Text>
            </View>
          )}
        </View>
        {customer && variants.length > 0 && (
          <View style={styles.variantSection}>
            <Text style={styles.small}>{variants.length} phân loại có sẵn</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {variants.map((item) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Chọn ${item.name}`}
                  onPress={() => {
                    setPreviewVariantId(item.id);
                    setPurchaseMode("CART");
                    setCartOpen(true);
                  }}
                  style={styles.variantPreview}
                >
                  <ProductPhoto
                    uri={item.imageUrl || product.imageUrl}
                    resizeMode="contain"
                    style={styles.variantThumb}
                  />
                  <Text numberOfLines={1} style={styles.variantName}>
                    {item.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
        <View style={styles.section}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{money(product.price)}</Text>
            {discount > 0 && (
              <>
                <Text style={styles.original}>
                  {money(product.originalPrice)}
                </Text>
                <Badge>−{discount}%</Badge>
              </>
            )}
            {customer && (
              <View style={{ marginLeft: "auto" }}>
                <IconButton
                  name={saved ? "check" : "heart"}
                  label={saved ? "Đã thêm yêu thích" : "Thêm vào yêu thích"}
                  disabled={command.busy}
                  onPress={() =>
                    void command.execute(
                      `/customer/wishlist/${product.id}`,
                      "POST",
                      undefined,
                      () => setSaved(true),
                    )
                  }
                />
              </View>
            )}
          </View>
          <Text style={styles.title}>{product.title}</Text>
          <View style={styles.stats}>
            {rating > 0 && reviewCount > 0 ? (
              <>
                <Icon name="star" size={13} color={colors.strong} />
                <Text style={styles.statText}>
                  {rating.toFixed(1)} · {reviewCount} đánh giá
                </Text>
              </>
            ) : (
              <Text style={styles.statText}>Chưa có đánh giá</Text>
            )}
            <Text style={styles.statDivider}>|</Text>
            <Text style={styles.statText}>
              Đã bán {compactCount(product.soldCount || 0)}
            </Text>
          </View>
          <ErrorNotice error={command.error} />
        </View>
        {customer && (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setPurchaseMode("CART");
              setCartOpen(true);
            }}
            style={[styles.section, styles.option]}
          >
            <Icon name="grid" size={16} color={colors.strong} />
            <Text style={styles.optionLabel}>Chọn phân loại, số lượng</Text>
            <Text style={styles.small}>{variants.length || 1} lựa chọn</Text>
            <Icon name="chevron-right" size={15} color={colors.muted} />
          </Pressable>
        )}
        <View style={styles.section}>
          <View style={styles.option}>
            <Icon name="truck" size={17} color={colors.strong} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.optionLabel}>Giao hàng qua GHN</Text>
              <Text style={styles.small}>
                Phí giao hàng được tính khi thanh toán
              </Text>
            </View>
          </View>
          <View style={[styles.option, { marginTop: 14 }]}>
            <Icon name="shield" size={17} color={colors.strong} />
            <Text style={styles.small}>
              Đổi trả theo chính sách của gian hàng
            </Text>
          </View>
        </View>
        {!shop && store && (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              navigation.navigate("Business", {
                feature: "storefront",
                storeId: store.id,
              })
            }
            style={[styles.section, styles.option]}
          >
            <Avatar uri={store.logoUrl} name={store.name} size={45} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text numberOfLines={2} style={styles.shopName}>
                {store.name}
              </Text>
              <Text style={styles.small}>Gian hàng đối tác SCANMS</Text>
            </View>
            <View style={styles.shopCta}>
              <Text
                style={{
                  color: colors.strong,
                  fontSize: 11,
                  fontWeight: "600",
                }}
              >
                Xem Shop
              </Text>
            </View>
          </Pressable>
        )}
        <View style={styles.section}>
          <SectionHeading title="Chi tiết sản phẩm" />
          <Text
            numberOfLines={expanded ? undefined : 5}
            style={styles.description}
          >
            {product.description?.replace(/<[^>]+>/g, " ").trim() ||
              "Gian hàng chưa bổ sung mô tả."}
          </Text>
          {product.description && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setExpanded(!expanded)}
              style={{ alignSelf: "center", padding: 12 }}
            >
              <Text style={{ fontSize: 12, color: colors.strong }}>
                {expanded ? "Thu gọn" : "Xem thêm"} {expanded ? "⌃" : "⌄"}
              </Text>
            </Pressable>
          )}
          {[
            { label: "Danh mục", value: product.categoryName },
            { label: "Xuất xứ", value: product.origin },
            { label: "SKU", value: product.sku },
          ]
            .filter((item) => item.value)
            .map((item) => (
              <View key={item.label} style={styles.spec}>
                <Text style={styles.small}>{item.label}</Text>
                <Text style={styles.specValue}>{item.value}</Text>
              </View>
            ))}
        </View>
        {detail.isLoading && !shop && <Loading />}
        <ErrorNotice error={detail.error} retry={() => void detail.refetch()} />
        <ErrorNotice error={error} />
        {reviews && (
          <View style={styles.section}>
            <SectionHeading
              title="Đánh giá sản phẩm"
              subtitle={
                reviews.totalReviews
                  ? String(reviews.totalReviews) + " đánh giá từ khách hàng"
                  : "Chưa có đánh giá"
              }
            />
            {reviews.items
              .slice(0, moreReviews ? undefined : 3)
              .map((review) => (
                <View key={review.id} style={styles.review}>
                  <View style={styles.option}>
                    <Avatar name={review.customerName} size={30} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text
                        style={{
                          fontSize: 12,
                          color: colors.ink,
                          fontWeight: "600",
                        }}
                      >
                        {review.customerName}
                      </Text>
                      <View style={{ flexDirection: "row", gap: 2 }}>
                        {Array.from({ length: review.rating }, (_, index) => (
                          <Icon
                            key={index}
                            name="star"
                            size={10}
                            color={colors.strong}
                          />
                        ))}
                      </View>
                    </View>
                    {review.isVerifiedBuyer && (
                      <Text style={styles.small}>Đã mua hàng</Text>
                    )}
                  </View>
                  <Text style={styles.description}>{review.comment}</Text>
                  <Evidence urls={review.images} />
                  {review.reply && (
                    <View style={styles.reply}>
                      <Text style={styles.small}>Phản hồi của Shop</Text>
                      <Text style={styles.description}>
                        {review.reply.comment}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            {reviews.items.length > 3 && (
              <Button
                title={moreReviews ? "Thu gọn đánh giá" : "Xem thêm đánh giá"}
                secondary
                onPress={() => setMoreReviews(!moreReviews)}
              />
            )}
          </View>
        )}
        {koc && (
          <View style={[styles.section, { gap: 12 }]}>
            <SectionHeading title="Hợp tác cùng gian hàng" />
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
              title="Đề xuất thỏa thuận VIP"
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
          </View>
        )}
        {shop && (
          <View style={styles.section}>
            <Button
              title="Tìm KOC phù hợp bằng AI"
              disabled={product.moderationStatus !== "APPROVED"}
              onPress={() => navigation.navigate("AiMatching", { product })}
            />
          </View>
        )}
      </ScrollView>
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 12 }]}>
        {!shop && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Nhắn tin gian hàng"
            disabled={busy || !store}
            onPress={() => void chat()}
            style={[styles.chatButton, { opacity: busy ? 0.5 : 1 }]}
          >
            <Icon name="message-circle" size={20} color={colors.strong} />
            <Text style={styles.chatLabel}>Chat Shop</Text>
          </Pressable>
        )}
        <View style={{ flex: 1 }}>
          <Button
            title={
              customer
                ? "Thêm giỏ hàng"
                : shop
                  ? "Sửa sản phẩm & tồn kho"
                  : "Tạo link tiếp thị"
            }
            secondary={customer}
            onPress={() =>
              customer
                ? (setPurchaseMode("CART"), setCartOpen(true))
                : navigation.navigate(
                    "Business",
                    shop
                      ? { feature: "product-edit", productId: product.id }
                      : { feature: "marketing", productId: product.id },
                  )
            }
          />
        </View>
        {customer && (
          <View style={{ flex: 1 }}>
            <Button
              title="Mua ngay"
              onPress={() => {
                setPurchaseMode("BUY_NOW");
                setCartOpen(true);
              }}
            />
          </View>
        )}
      </View>
      {cartOpen && (
        <BottomSheet
          title={
            purchaseMode === "BUY_NOW"
              ? "Mua ngay · Chọn sản phẩm"
              : "Chọn sản phẩm"
          }
          close={() => setCartOpen(false)}
        >
          <AddToCart
            product={product}
            initialVariantId={previewVariantId}
            onOpenCart={() => setCartOpen(false)}
            onAdded={() => setCartOpen(false)}
            onBuyNow={
              purchaseMode === "BUY_NOW"
                ? (line) => {
                    setCartOpen(false);
                    navigation.navigate("Checkout", {
                      product: { ...product, store: store || product.store },
                      variantId: line.variantId,
                      quantity: line.quantity,
                    });
                  }
                : undefined
            }
          />
        </BottomSheet>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  section: { padding: 16, marginTop: 8, backgroundColor: colors.white },
  variantSection: {
    padding: 12,
    backgroundColor: colors.white,
    gap: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  variantPreview: {
    width: 66,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 5,
    overflow: "hidden",
  },
  variantThumb: { width: 64, height: 53 },
  variantName: { fontSize: 8, color: colors.muted, padding: 4 },
  photoCount: {
    position: "absolute",
    bottom: 12,
    right: 14,
    borderRadius: 12,
    backgroundColor: colors.dark,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  photoCountText: { color: colors.white, fontSize: 10 },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  price: { color: colors.strong, fontSize: 24, fontWeight: "700" },
  original: {
    color: colors.muted,
    fontSize: 12,
    textDecorationLine: "line-through",
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.ink,
    lineHeight: 25,
    marginTop: 7,
  },
  stats: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 13 },
  statText: { fontSize: 11, color: colors.muted },
  statDivider: { color: colors.line, marginHorizontal: 5 },
  option: { flexDirection: "row", alignItems: "center", gap: 10 },
  optionLabel: { fontSize: 12, fontWeight: "500", color: colors.ink, flex: 1 },
  small: { fontSize: 10, color: colors.muted, lineHeight: 16 },
  shopName: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.ink,
    fontWeight: "600",
  },
  shopCta: {
    borderWidth: 1,
    borderColor: colors.brandBorder,
    borderRadius: 7,
    padding: 9,
  },
  description: { fontSize: 13, color: colors.ink, lineHeight: 21 },
  spec: {
    flexDirection: "row",
    gap: 18,
    paddingVertical: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    justifyContent: "space-between",
  },
  specValue: { color: colors.ink, fontSize: 11, flex: 1, textAlign: "right" },
  review: {
    gap: 12,
    paddingVertical: 15,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  reply: {
    gap: 5,
    backgroundColor: colors.canvas,
    padding: 12,
    borderRadius: 8,
  },
  bottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    backgroundColor: colors.white,
  },
  chatButton: {
    width: 64,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  chatLabel: { fontSize: 10, color: colors.muted },
});
