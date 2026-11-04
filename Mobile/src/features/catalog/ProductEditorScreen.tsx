import { validateInput } from "../../utils/validate-input";
import { useState } from "react";
import { Image, Switch, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import type { ScreenProps } from "../../navigation/router";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api";
import { uploadImage } from "../../services/upload";
import { useAuth } from "../auth/AuthProvider";
import { useStoreScope } from "../auth/StoreScope";
import { useOperation } from "../../hooks/useOperation";
import {
  Badge,
  Button,
  Caption,
  ErrorNotice,
  Field,
  Screen,
  Title,
} from "../../components/ui";
import { colors } from "../../theme/tokens";
import { ProductInputSchema } from "./product-input";

interface VariantForm {
  name: string;
  sku: string;
  price: string;
  stock: string;
  attributes: Record<string, string>;
}
const blankVariant = (): VariantForm => ({
  name: "",
  sku: "",
  price: "",
  stock: "",
  attributes: {},
});
export function ProductEditorScreen({
  navigation,
}: ScreenProps<"ProductEditor">) {
  const { session } = useAuth(),
    { store } = useStoreScope(),
    operation = useOperation(),
    client = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    sku: "",
    description: "",
    ingredients: "",
    origin: "",
    labelInfo: "",
    barcode: "",
    price: "",
    weight: "",
    length: "",
    width: "",
    height: "",
    originProof: "",
    labelProof: "",
    quota: "",
  });
  const [cover, setCover] = useState(""),
    [gallery, setGallery] = useState<string[]>([]),
    [variants, setVariants] = useState<VariantForm[]>([blankVariant()]);
  const [affiliate, setAffiliate] = useState(true),
    [sample, setSample] = useState(false);
  const field = (
    key: keyof typeof form,
    label: string,
    numeric = false,
    multiline = false,
  ) => (
    <Field
      key={key}
      label={label}
      value={form[key]}
      onChangeText={(value) =>
        setForm((current) => ({ ...current, [key]: value }))
      }
      editable={!operation.busy}
      keyboardType={numeric ? "numeric" : "default"}
      multiline={multiline}
    />
  );
  const pick = (isCover: boolean) =>
    operation.run(async () => {
      if (!isCover && gallery.length >= 4)
        throw new Error("Chỉ được tối đa bốn ảnh phụ.");
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted)
        throw new Error(
          "Cần quyền chọn ảnh để tải ảnh sản phẩm. Bạn có thể cấp lại trong cài đặt Android.",
        );
      const selected = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: isCover,
        aspect: [1, 1],
        quality: 1,
      });
      if (selected.canceled || !selected.assets[0]) return;
      const url = await uploadImage(selected.assets[0], isCover);
      if (isCover) setCover(url);
      else setGallery((current) => [...current, url]);
    });
  const submit = () =>
    operation.run(
      async () => {
        if (!store?.categoryName)
          throw new Error("Gian hàng chưa có ngành hàng được cấu hình.");
        const fields = store.variantFields || [];
        if (!fields.length)
          throw new Error(
            "Chưa nhận được cấu hình phân loại từ máy chủ. Đăng nhập lại để tải cấu hình.",
          );
        for (const variant of variants) {
          const missing = fields.filter(
            (item) => !variant.attributes[item.key]?.trim(),
          );
          if (missing.length)
            throw new Error(
              `Phân loại ${variant.name || "mới"} còn thiếu: ${missing.map((item) => item.label).join(", ")}.`,
            );
          if (!variant.stock.trim())
            throw new Error("Nhập tồn kho cho từng phân loại.");
        }
        const body = validateInput(ProductInputSchema, {
          storeId: store.id,
          categoryName: store.categoryName,
          title: form.title,
          sku: form.sku,
          description: form.description,
          ingredients: form.ingredients,
          origin: form.origin,
          labelInfo: form.labelInfo,
          imageUrl: cover,
          subImages: gallery,
          originProofLinks: form.originProof
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean),
          labelProofLinks: form.labelProof
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean),
          barcode: form.barcode,
          packageWeight: form.weight,
          packageLength: form.length,
          packageWidth: form.width,
          packageHeight: form.height,
          price: form.price,
          stockQuantity: variants.reduce(
            (sum, item) => sum + Number(item.stock),
            0,
          ),
          isAffiliateEnabled: affiliate,
          sampleEnabled: sample,
          sampleQuota: sample ? Number(form.quota) : 0,
          variants: variants.map((item) => ({
            name: item.name,
            sku: item.sku,
            price: item.price || form.price,
            stockQuantity: item.stock,
            imageUrl: cover,
            attributes: item.attributes,
          })),
        });
        await api.request("/products", {
          method: "POST",
          body,
          timeout: 95000,
        });
      },
      async () => {
        await client.invalidateQueries({
          queryKey: [session!.user.id, "products"],
        });
        navigation.goBack();
      },
    );
  return (
    <Screen scroll>
      <Title>Gửi duyệt sản phẩm</Title>
      <Badge>{store?.name || "Chưa có gian hàng"}</Badge>
      <Title>1. Thông tin cơ bản</Title>
      <Caption>Ngành hàng: {store?.categoryName || "Chưa cấu hình"}</Caption>
      {field("title", "Tên sản phẩm")}
      {field("sku", "Mã SKU sản phẩm")}
      {field("description", "Mô tả chi tiết", false, true)}
      <Title>2. Hình ảnh</Title>
      {cover ? (
        <Image
          source={{ uri: cover }}
          style={{ width: "100%", aspectRatio: 1, borderRadius: 18 }}
        />
      ) : (
        <Caption>Ảnh bìa vuông, tối thiểu 800×800px, tối đa 5 MB.</Caption>
      )}
      <Button
        title="Chọn ảnh bìa"
        secondary
        loading={operation.busy}
        onPress={() => void pick(true)}
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {gallery.map((url) => (
          <View key={url} style={{ gap: 5 }}>
            <Image
              source={{ uri: url }}
              style={{ width: 76, height: 76, borderRadius: 10 }}
            />
            <Button
              title="Bỏ"
              secondary
              disabled={operation.busy}
              onPress={() =>
                setGallery((current) => current.filter((item) => item !== url))
              }
            />
          </View>
        ))}
      </View>
      <Button
        title={`Thêm ảnh phụ (${gallery.length}/4)`}
        secondary
        disabled={operation.busy || gallery.length >= 4}
        onPress={() => void pick(false)}
      />
      <Title>3. Giá và phân loại</Title>
      {field("price", "Giá niêm yết chung (đ)", true)}
      {variants.map((variant, index) => (
        <View
          key={index}
          style={{
            padding: 16,
            gap: 12,
            backgroundColor: colors.white,
            borderRadius: 18,
            borderColor: colors.line,
            borderWidth: 1,
          }}
        >
          <Caption>Phân loại {index + 1}</Caption>
          {(["name", "sku", "price", "stock"] as const).map((key, at) => (
            <Field
              key={key}
              label={
                [
                  "Tên phân loại",
                  "SKU riêng",
                  "Giá riêng (đ), để trống dùng giá chung",
                  "Tồn kho",
                ][at]
              }
              value={variant[key]}
              editable={!operation.busy}
              keyboardType={at > 1 ? "numeric" : "default"}
              onChangeText={(value) =>
                setVariants((current) =>
                  current.map((item, row) =>
                    row === index ? { ...item, [key]: value } : item,
                  ),
                )
              }
            />
          ))}
          {store?.variantFields?.map((attribute) => (
            <Field
              key={attribute.key}
              label={attribute.label}
              value={variant.attributes[attribute.key] || ""}
              editable={!operation.busy}
              onChangeText={(value) =>
                setVariants((current) =>
                  current.map((item, row) =>
                    row === index
                      ? {
                          ...item,
                          attributes: {
                            ...item.attributes,
                            [attribute.key]: value,
                          },
                        }
                      : item,
                  ),
                )
              }
            />
          ))}
          {variants.length > 1 && (
            <Button
              title="Bỏ phân loại"
              secondary
              disabled={operation.busy}
              onPress={() =>
                setVariants((current) =>
                  current.filter((_, row) => row !== index),
                )
              }
            />
          )}
        </View>
      ))}
      <Button
        title="Thêm phân loại"
        secondary
        disabled={operation.busy || variants.length >= 100}
        onPress={() => setVariants((current) => [...current, blankVariant()])}
      />
      <Title>4. Mã vạch và kiện hàng</Title>
      {field("barcode", "Barcode EAN-13")}
      {field("weight", "Khối lượng đóng gói (gram)", true)}
      {field("length", "Chiều dài (cm)", true)}
      {field("width", "Chiều rộng (cm)", true)}
      {field("height", "Chiều cao (cm)", true)}
      <Title>5. Hồ sơ sản phẩm</Title>
      {field("ingredients", "Thành phần / chất liệu")}
      {field("origin", "Xuất xứ")}
      {field("labelInfo", "Nhãn mác, cảnh báo và hướng dẫn", false, true)}
      {field(
        "originProof",
        "URL minh chứng nguồn gốc (mỗi dòng một URL)",
        false,
        true,
      )}
      {field(
        "labelProof",
        "URL minh chứng nhãn mác (mỗi dòng một URL)",
        false,
        true,
      )}
      <Title>6. Chính sách tiếp thị</Title>
      <Caption>
        Hoa hồng nền 10%; mức VIP do quy trình thỏa thuận riêng quyết định.
      </Caption>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Switch
          value={affiliate}
          onValueChange={setAffiliate}
          disabled={operation.busy}
          trackColor={{ true: colors.brand, false: colors.line }}
        />
        <Text>Cho phép tiếp thị</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Switch
          value={sample}
          onValueChange={setSample}
          disabled={operation.busy}
          trackColor={{ true: colors.brand, false: colors.line }}
        />
        <Text>Cho phép xin mẫu</Text>
      </View>
      {sample && field("quota", "Suất mẫu", true)}
      <ErrorNotice error={operation.error} />
      <Button
        title="Gửi duyệt sản phẩm"
        loading={operation.busy}
        disabled={!store}
        onPress={() => void submit()}
      />
    </Screen>
  );
}
