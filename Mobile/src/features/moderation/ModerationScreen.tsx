import { useState } from "react";
import { FlatList, Image, Linking, Pressable, Text, View } from "react-native";
import { useMobileNavigation } from "../../navigation/router";
import type { ScreenProps } from "../../navigation/router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { moderation } from "../../services/scanms";
import { api } from "../../services/api";
import {
  Badge,
  Button,
  Caption,
  Card,
  Empty,
  ErrorNotice,
  Field,
  Loading,
  Screen,
  Title,
} from "../../components/ui";
import { useAuth } from "../auth/AuthProvider";
import { useOperation } from "../../hooks/useOperation";
import { money, statusText } from "../../types/contracts";

export function ModerationScreen() {
  const { session } = useAuth(),
    [status, setStatus] = useState("DRAFT");
  const navigation = useMobileNavigation();
  const result = useQuery({
    queryKey: [session!.user.id, "moderation", status],
    queryFn: ({ signal }) => moderation(status, signal),
  });
  return (
    <Screen>
      <View
        style={{ padding: 16, flexDirection: "row", gap: 8, flexWrap: "wrap" }}
      >
        {["DRAFT", "APPROVED", "REJECTED"].map((value) => (
          <Button
            key={value}
            title={statusText(value)}
            secondary={status !== value}
            onPress={() => setStatus(value)}
          />
        ))}
      </View>
      <ErrorNotice error={result.error} retry={() => void result.refetch()} />
      {result.isLoading ? (
        <Loading />
      ) : (
        <FlatList
          data={result.data || []}
          keyExtractor={(row) => row.id}
          refreshing={result.isRefetching}
          onRefresh={() => void result.refetch()}
          ListEmptyComponent={!result.error ? <Empty /> : undefined}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                navigation.navigate("ProductReview", { product: item })
              }
            >
              <Card>
                <Caption>{item.store?.name}</Caption>
                <Title>{item.title}</Title>
                <Badge>{statusText(item.moderationStatus || "DRAFT")}</Badge>
                <Caption>
                  {item.sku} · {money(item.price)}
                </Caption>
              </Card>
            </Pressable>
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
  const { session } = useAuth(),
    operation = useOperation(),
    client = useQueryClient(),
    [reason, setReason] = useState("");
  const product = route.params.product;
  const own = [product.createdById, product.submittedById].includes(
    session!.user.id,
  );
  const decide = (approved: boolean) =>
    operation.run(
      async () => {
        if (own) throw new Error("Người tạo/gửi hồ sơ không được tự duyệt.");
        if (!approved && reason.trim().length < 5)
          throw new Error("Nhập lý do từ chối ít nhất 5 ký tự.");
        await api.request(`/products/${product.id}/moderation`, {
          method: "PATCH",
          body: {
            status: approved ? "APPROVED" : "REJECTED",
            reason: reason.trim(),
          },
        });
      },
      async () => {
        await client.invalidateQueries({
          queryKey: [session!.user.id, "moderation"],
        });
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
    <Screen scroll>
      <Title>{product.title}</Title>
      <Badge>{product.store?.name || "Gian hàng"}</Badge>
      {product.imageUrl && (
        <Image
          source={{ uri: product.imageUrl }}
          style={{ width: "100%", aspectRatio: 1, borderRadius: 20 }}
        />
      )}
      <Caption>
        {product.sku} · {product.categoryName}
      </Caption>
      <Text>{money(product.price)}</Text>
      <Text>{product.description?.replace(/<[^>]+>/g, " ")}</Text>
      <Title>Hồ sơ và đóng gói</Title>
      <Text>Thành phần: {product.ingredients || "Chưa cung cấp"}</Text>
      <Text>Xuất xứ: {product.origin || "Chưa cung cấp"}</Text>
      <Text>Nhãn mác: {product.labelInfo || "Chưa cung cấp"}</Text>
      <Text>Barcode: {product.barcode || "Chưa cung cấp"}</Text>
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
      {product.variants?.map((item) => (
        <Card key={item.id}>
          <Text>{item.name}</Text>
          <Caption>
            {item.sku} · {money(item.price)} · tồn {item.stockQuantity}
          </Caption>
        </Card>
      ))}
      {own && (
        <Caption>
          Bạn là người tạo/gửi hồ sơ; cần một reviewer độc lập quyết định.
        </Caption>
      )}
      <Field
        label="Lý do quyết định"
        value={reason}
        onChangeText={setReason}
        multiline
        maxLength={1000}
        editable={!operation.busy}
      />
      <ErrorNotice error={operation.error} />
      <Button
        title="Duyệt sản phẩm"
        loading={operation.busy}
        disabled={own || product.moderationStatus === "APPROVED"}
        onPress={() => void decide(true)}
      />
      <Button
        title="Từ chối hồ sơ"
        secondary
        disabled={
          operation.busy || own || product.moderationStatus === "REJECTED"
        }
        onPress={() => void decide(false)}
      />
    </Screen>
  );
}
