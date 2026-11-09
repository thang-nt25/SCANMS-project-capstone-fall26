import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { FlatList, Linking, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMobileNavigation, type ScreenProps } from "../../navigation/router";
import { moderation } from "../../services/scanms";
import { api } from "../../services/api";
import {
  Badge,
  Button,
  Caption,
  Empty,
  ErrorNotice,
  Field,
  Loading,
  Screen,
} from "../../components/ui";
import {
  ExpandableRecord,
  FilterTabs,
  InfoLine,
  RecordRow,
  SectionTitle,
} from "../../components/RecordList";
import { ProductPhoto } from "../../components/ProductPhoto";
import { useAuth } from "../auth/AuthProvider";
import { useOperation } from "../../hooks/useOperation";
import { money, ProductSchema, statusText } from "../../types/contracts";
import { validateInput } from "../../utils/validate-input";
import { canModerateProduct, ProductDecisionSchema } from "./moderation-policy";

export function ModerationScreen() {
  const { queue, entry } = useLocalSearchParams<{
    queue?: string;
    entry?: string;
  }>();
  const { session } = useAuth();
  const [status, setStatus] = useState("DRAFT");
  const navigation = useMobileNavigation();
  useEffect(() => {
    if (queue === "pending") setStatus("DRAFT");
  }, [queue, entry]);
  const result = useQuery({
    queryKey: [session!.user.id, "moderation", status],
    queryFn: ({ signal }) => moderation(status, signal),
  });
  return (
    <Screen>
      <View style={{ padding: 12 }}>
        <FilterTabs
          label="Kiểm duyệt sản phẩm"
          value={status}
          options={[
            { value: "DRAFT", label: "Chờ duyệt" },
            { value: "APPROVED", label: "Đã duyệt" },
            { value: "REJECTED", label: "Từ chối" },
          ]}
          onChange={setStatus}
        />
      </View>
      <ErrorNotice error={result.error} retry={() => void result.refetch()} />
      {result.isLoading ? (
        <Loading />
      ) : (
        <FlatList
          data={result.data || []}
          keyExtractor={(item) => item.id}
          refreshing={result.isRefetching}
          onRefresh={() => void result.refetch()}
          contentContainerStyle={{
            paddingHorizontal: 12,
            gap: 8,
            paddingBottom: 16,
          }}
          ListEmptyComponent={
            !result.error ? (
              <Empty text="Không có sản phẩm trong trạng thái này." />
            ) : undefined
          }
          renderItem={({ item }) => (
            <RecordRow
              title={item.title}
              subtitle={item.store?.name}
              meta={`${item.sku || ""} · ${money(item.price)}`}
              badge={statusText(item.moderationStatus || "DRAFT")}
              icon="package"
              onPress={() =>
                navigation.navigate("ProductReview", { product: item })
              }
            />
          )}
        />
      )}
    </Screen>
  );
}

export function ProductReviewScreen({
  route,
  navigation,
}: ScreenProps<"ProductReview">) {
  const { session } = useAuth();
  const operation = useOperation();
  const client = useQueryClient();
  const [reason, setReason] = useState("");
  const detail = useQuery({
    queryKey: [session!.user.id, "product-review", route.params.product.id],
    queryFn: async ({ signal }) =>
      ProductSchema.parse(
        await api.request(`/products/${route.params.product.id}`, { signal }),
      ),
  });
  const product = detail.data || route.params.product;
  const own = [product.createdById, product.submittedById].includes(
    session!.user.id,
  );
  const canDecide =
    Boolean(detail.data) &&
    !detail.error &&
    !detail.isFetching &&
    canModerateProduct(session!.user.role, session!.user.id, product);
  const decide = (approved: boolean) =>
    operation.run(
      async () => {
        // Recheck the server record before sending a decision from a potentially stale list.
        const latest = await detail.refetch();
        if (latest.error || !latest.data)
          throw latest.error || new Error("Chưa tải được hồ sơ mới nhất.");
        if (
          !canModerateProduct(session!.user.role, session!.user.id, latest.data)
        )
          throw new Error(
            "Chỉ hồ sơ chờ duyệt và do người khác tạo/gửi mới được xử lý.",
          );
        await api.request(`/products/${product.id}/moderation`, {
          method: "PATCH",
          body: validateInput(ProductDecisionSchema, {
            status: approved ? "APPROVED" : "REJECTED",
            reason,
          }),
        });
      },
      async () => {
        await Promise.all([
          client.invalidateQueries({
            queryKey: [session!.user.id, "moderation"],
          }),
          client.invalidateQueries({
            queryKey: [session!.user.id, "business", "operations-queue"],
          }),
        ]);
        navigation.goBack();
      },
    );
  const evidence = [
    ...(product.originProofLinks || []),
    ...(product.originProofImages || []),
    ...(product.labelProofLinks || []),
    ...(product.labelProofImages || []),
  ];
  const open = (url: string) =>
    operation.run(async () => {
      const parsed = new URL(url);
      if (!["https:", "http:"].includes(parsed.protocol))
        throw new Error("Liên kết chứng từ không hợp lệ.");
      await Linking.openURL(url);
    });
  return (
    <Screen scroll compact>
      <SectionTitle>{product.title}</SectionTitle>
      <Badge>{statusText(product.moderationStatus || "DRAFT")}</Badge>
      <Caption>
        {product.store?.name} · {product.sku}
      </Caption>
      {detail.isLoading && <Caption>Đang đối chiếu hồ sơ mới nhất…</Caption>}
      <ErrorNotice error={detail.error} retry={() => void detail.refetch()} />
      <ProductPhoto
        uri={product.imageUrl}
        resizeMode="contain"
        style={{ width: "100%", height: 170, borderRadius: 12 }}
      />
      <InfoLine label="Giá bán" value={money(product.price)} />
      <InfoLine label="Danh mục" value={product.categoryName} />
      <ExpandableRecord title="Mô tả sản phẩm" icon="file-text">
        <Text>
          {product.description?.replace(/<[^>]+>/g, " ") || "Chưa có mô tả."}
        </Text>
      </ExpandableRecord>
      <ExpandableRecord title="Hồ sơ & đóng gói" icon="box">
        <InfoLine label="Thành phần" value={product.ingredients} />
        <InfoLine label="Xuất xứ" value={product.origin} />
        <InfoLine label="Nhãn mác" value={product.labelInfo} />
        <InfoLine label="Barcode" value={product.barcode} />
        <Caption>
          {product.packageWeight ?? "—"} g · {product.packageLength ?? "—"} ×{" "}
          {product.packageWidth ?? "—"} × {product.packageHeight ?? "—"} cm
        </Caption>
        {evidence.map((url, index) => (
          <Button
            key={`${index}-${url}`}
            title={`Mở chứng từ ${index + 1}`}
            secondary
            disabled={operation.busy}
            onPress={() => void open(url)}
          />
        ))}
      </ExpandableRecord>
      {Boolean(product.variants?.length) && (
        <ExpandableRecord
          title="Phân loại sản phẩm"
          subtitle={`${product.variants!.length} phân loại`}
          icon="grid"
        >
          {product.variants?.map((item) => (
            <InfoLine
              key={item.id}
              label={item.name}
              value={`${item.sku || ""} · ${money(item.price ?? product.price)} · tồn ${item.stockQuantity}`}
            />
          ))}
        </ExpandableRecord>
      )}
      {own && (
        <Caption>
          Bạn là người tạo/gửi hồ sơ; cần người kiểm duyệt độc lập.
        </Caption>
      )}
      {product.moderationStatus === "DRAFT" ? (
        <>
          <Field
            label="Lý do quyết định (bắt buộc khi từ chối)"
            value={reason}
            onChangeText={setReason}
            multiline
            maxLength={1000}
            editable={canDecide && !operation.busy}
          />
          <Button
            title="Duyệt sản phẩm"
            loading={operation.busy}
            disabled={!canDecide}
            onPress={() => void decide(true)}
          />
          <Button
            title="Từ chối hồ sơ"
            secondary
            disabled={operation.busy || !canDecide}
            onPress={() => void decide(false)}
          />
        </>
      ) : (
        <Caption>
          Hồ sơ đã được xử lý. Chỉ sản phẩm đang chờ duyệt mới được ra quyết
          định.
        </Caption>
      )}
      <ErrorNotice error={operation.error} />
    </Screen>
  );
}
