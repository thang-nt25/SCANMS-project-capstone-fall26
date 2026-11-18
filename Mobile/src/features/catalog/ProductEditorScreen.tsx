import { validateInput } from "../../utils/validate-input";
import { useRef, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { Icon, type IconName } from "../../components/commerce";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import type { ScreenProps } from "../../navigation/router";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api";
import { uploadImage } from "../../services/upload";
import { useAuth } from "../auth/AuthProvider";
import { useStoreScope } from "../auth/StoreScope";
import { useOperation } from "../../hooks/useOperation";
import {
  Button,
  ErrorNotice,
  Field,
  Screen,
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
function EditorHeading({ icon, title, detail }: { icon: IconName; title: string; detail: string }) {
  return <View style={editor.heading}><View style={editor.icon}><Icon name={icon} size={19} color={colors.strong} /></View><View style={{ flex: 1 }}><Text style={editor.title}>{title}</Text><Text style={editor.note}>{detail}</Text></View></View>;
}
export function ProductEditorScreen({
  navigation,
}: ScreenProps<"ProductEditor">) {
  const { session } = useAuth(),
    { store } = useStoreScope(),
    operation = useOperation(),
    client = useQueryClient();
  const [step, setStep] = useState(0);
  const insets = useSafeAreaInsets();
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const goStep = (next: number) => { setStep(next); scroll.current?.scrollTo({ y: 0, animated: false }); };
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
      label={`${label} *`}
      placeholder={fieldHelp[key]?.placeholder || label}
      value={form[key]}
      onChangeText={(value) =>
        setForm((current) => ({ ...current, [key]: value }))
      }
      editable={!operation.busy}
      keyboardType={numeric ? "numeric" : "default"}
      multiline={multiline}
      style={{ minHeight: multiline ? 100 : 46, fontSize: 13 }}
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
          { goStep(0); throw new Error("Gian hàng chưa có ngành hàng được cấu hình."); }
        const fields = store.variantFields || [];
        if (!fields.length)
          { goStep(2);
          throw new Error(
            "Chưa nhận được cấu hình phân loại từ máy chủ. Đăng nhập lại để tải cấu hình.",
          );
          }
        for (const variant of variants) {
          const missing = fields.filter(
            (item) => !variant.attributes[item.key]?.trim(),
          );
          if (missing.length)
            { goStep(2);
            throw new Error(
              `Phân loại ${variant.name || "mới"} còn thiếu: ${missing.map((item) => item.label).join(", ")}.`,
            );
            }
          if (!variant.stock.trim())
            { goStep(2); throw new Error("Nhập tồn kho cho từng phân loại."); }
        }
        const input = {
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
        };
        const checked = ProductInputSchema.safeParse(input);
        if (!checked.success) {
          const path = String(checked.error.issues[0]?.path[0] || "title");
          const section = [ ["title", "sku", "description", "categoryName", "storeId"], ["imageUrl", "subImages"], ["price", "stockQuantity", "variants"], ["barcode", "packageWeight", "packageLength", "packageWidth", "packageHeight"], ["ingredients", "origin", "labelInfo", "originProofLinks", "labelProofLinks"], ["isAffiliateEnabled", "sampleEnabled", "sampleQuota"] ].findIndex(keys => keys.includes(path));
          goStep(Math.max(0, section));
        }
        const body = validateInput(ProductInputSchema, input);
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
    <Screen>
      <View style={editor.header}>
        <View style={editor.steps}>{steps.map((label, index) => <Pressable key={label} accessibilityRole="tab" accessibilityLabel={`Bước ${index + 1}: ${label}`} accessibilityState={{ selected: index === step }} disabled={operation.busy} onPress={() => goStep(index)} style={[editor.step, index === step && editor.active]}><Text style={[editor.stepText, index === step && { color: colors.ink }]}>{index + 1}. {label}</Text></Pressable>)}</View>
        <View style={editor.progress}><View style={[editor.progressFill, { width: `${((step + 1) / steps.length) * 100}%` }]} /></View>
      </View>
      <ScrollView key={step} ref={scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={editor.content}>
      {step === 0 && <View style={editor.section}>
      <View style={editor.heading}><View style={editor.icon}><Icon name="file-text" size={18} color={colors.strong} /></View><View style={{ flex: 1 }}><Text style={editor.title}>Thông tin cơ bản</Text><Text style={editor.note}>Tên, mã quản lý và nội dung giới thiệu</Text></View></View>
      <View style={editor.category}><Icon name="tag" size={15} color={colors.strong} /><View style={{ flex: 1 }}><Text style={editor.note}>Ngành hàng của gian hàng</Text><Text style={editor.categoryText}>{store?.categoryName || "Chưa cấu hình"}</Text></View><Icon name="lock" size={14} color={colors.muted} /></View>
      {field("title", "Tên sản phẩm")}
      {field("sku", "Mã SKU sản phẩm")}
      <Text style={editor.note}>SKU là mã quản lý riêng, không trùng sản phẩm khác.</Text>
      {field("description", "Mô tả chi tiết", false, true)}
      <Text style={editor.note}>Nêu công dụng, đặc điểm và hướng dẫn sử dụng. Không đưa thông tin liên hệ vào mô tả.</Text>
      </View>}
      {step === 1 && <View style={editor.section}>
      <EditorHeading icon="image" title="Hình ảnh sản phẩm" detail="Ảnh bìa bắt buộc · Tối đa 4 ảnh phụ" />
      <View style={editor.mediaBox}><View style={editor.coverPreview}>{cover ? <Image source={{ uri: cover }} resizeMode="contain" style={{ width: "100%", height: "100%" }} /> : <Icon name="camera" size={32} color={colors.strong} />}</View><View style={{ flex: 1, gap: 8 }}><Text style={editor.subTitle}>Ảnh bìa *</Text><Text style={editor.note}>Ảnh vuông từ 800 × 800 px, tối đa 5 MB. Dùng ảnh rõ nét của sản phẩm.</Text><Button title={cover ? "Đổi ảnh bìa" : "Chọn ảnh bìa"} soft loading={operation.busy} onPress={() => void pick(true)} /></View></View>
      <View style={editor.heading}><Text style={[editor.subTitle, { flex: 1 }]}>Bộ ảnh chi tiết</Text><Text style={editor.note}>{gallery.length}/4 ảnh</Text></View>
      <View style={editor.gallery}>
        {gallery.map((url, index) => <View key={`${url}-${index}`} style={editor.photoTile}><Image source={{ uri: url }} resizeMode="contain" style={editor.photo} /><Pressable accessibilityRole="button" accessibilityLabel={`Xóa ảnh phụ ${index + 1}`} disabled={operation.busy} onPress={() => setGallery(current => current.filter((_, at) => at !== index))} style={editor.removePhoto}><Icon name="x" size={14} color={colors.ink} /></Pressable><Text style={editor.note}>Ảnh {index + 1}</Text></View>)}
        {gallery.length < 4 && <Pressable accessibilityRole="button" accessibilityLabel="Thêm ảnh phụ sản phẩm" disabled={operation.busy} onPress={() => void pick(false)} style={editor.addPhoto}><Icon name="plus" size={24} color={colors.strong} /><Text style={editor.note}>Thêm ảnh</Text></Pressable>}
      </View>
      <Text style={editor.note}>Có thể bổ sung ảnh mặt sau, bao bì và chi tiết. Ảnh bìa cũng được dùng cho phân loại khi gửi duyệt.</Text>
      </View>}
      {step === 2 && <View style={editor.section}>
      <EditorHeading icon="tag" title="Giá bán & tồn kho" detail="Quản lý giá và số lượng theo phân loại" />
      {field("price", "Giá bán chung (đ)", true)}
      <View style={editor.summaryRow}><View style={editor.summaryCell}><Text style={editor.note}>Phân loại</Text><Text style={editor.summaryValue}>{variants.length}</Text></View><View style={editor.summaryCell}><Text style={editor.note}>Tổng tồn kho đã nhập</Text><Text style={editor.summaryValue}>{variants.every(item => item.stock.trim() && Number.isInteger(Number(item.stock)) && Number(item.stock) >= 0) ? variants.reduce((sum, item) => sum + Number(item.stock), 0).toLocaleString("vi-VN") : "Chưa đủ dữ liệu"}</Text></View></View>
      {variants.map((variant, index) => (
        <View
          key={index}
          style={editor.variant}
        >
          <View style={editor.heading}><View style={editor.number}><Text style={editor.subTitle}>{index + 1}</Text></View><Text style={[editor.subTitle, { flex: 1 }]}>Phân loại sản phẩm</Text>{variants.length > 1 && <Pressable accessibilityRole="button" accessibilityLabel={`Xóa phân loại ${index + 1}`} disabled={operation.busy} onPress={() => setVariants(current => current.filter((_, row) => row !== index))} style={editor.deleteVariant}><Icon name="trash-2" size={17} color={colors.danger} /></Pressable>}</View>
          <View style={editor.variantFields}>{(["name", "sku", "price", "stock"] as const).map((key, at) => <View key={key} style={{ width: at < 2 ? "100%" : "47%", flexGrow: 1 }}>
            <Field
              key={key}
              label={
                [
                  "Tên phân loại *",
                  "SKU riêng *",
                  "Giá riêng (đ)",
                  "Tồn kho *",
                ][at]
              }
              value={variant[key]}
              placeholder={["Ví dụ: Chai 30 ml", "Mã quản lý phân loại", "Dùng giá chung", "Số lượng"][at]}
              style={{ minHeight: 46, fontSize: 13 }}
              editable={!operation.busy}
              keyboardType={at > 1 ? "numeric" : "default"}
              onChangeText={(value) =>
                setVariants((current) =>
                  current.map((item, row) =>
                    row === index ? { ...item, [key]: value } : item,
                  ),
                )
              }
            /></View>
          )}</View>
          {store?.variantFields?.map((attribute) => (
            <Field
              key={attribute.key}
              label={attribute.label}
              placeholder={`Nhập ${attribute.label.toLowerCase()}`}
              style={{ minHeight: 46, fontSize: 13 }}
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
          <Text style={editor.note}>Để trống giá riêng để dùng giá bán chung. Tồn kho được nhập bằng số nguyên từ 0.</Text>
        </View>
      ))}
      <Button
        title="Thêm phân loại"
        secondary
        disabled={operation.busy || variants.length >= 100}
        onPress={() => setVariants((current) => [...current, blankVariant()])}
      />
      </View>}
      {step === 3 && <View style={editor.section}>
      <EditorHeading icon="truck" title="Mã vạch & kiện hàng" detail="Thông tin dùng khi tính phí giao hàng" />
      {field("barcode", "Barcode EAN-13")}
      <Text style={editor.note}>Đủ 13 chữ số, đúng mã kiểm tra trên bao bì.</Text>
      {field("weight", "Khối lượng đóng gói (gram)", true)}
      <Text style={editor.note}>Từ 1–30.000 gram, tính cả bao bì bảo vệ.</Text>
      <View style={editor.softBox}><Text style={editor.subTitle}>Kích thước sau đóng gói</Text><View style={editor.dimensions}>{([ ["length", "Dài (cm)"], ["width", "Rộng (cm)"], ["height", "Cao (cm)"] ] as const).map(([key, label]) => <View key={key} style={{ flex: 1, minWidth: 0 }}>{field(key, label, true)}</View>)}</View><Text style={editor.note}>Mỗi chiều là số nguyên từ 1–150 cm.</Text></View>
      </View>}
      {step === 4 && <View style={editor.section}>
      <EditorHeading icon="file-text" title="Thông tin & minh chứng" detail="Hồ sơ để sàn kiểm tra nguồn gốc sản phẩm" />
      {field("ingredients", "Thành phần / chất liệu")}
      {field("origin", "Xuất xứ")}
      {field("labelInfo", "Nhãn mác, cảnh báo và hướng dẫn", false, true)}
      <View style={editor.evidence}><View style={editor.heading}><Icon name="link" size={17} color={colors.strong} /><Text style={editor.subTitle}>Minh chứng nguồn gốc</Text></View><Text style={editor.note}>Đường dẫn hóa đơn, tài liệu xuất xứ hoặc giấy tờ liên quan.</Text>{field(
        "originProof",
        "Đường dẫn nguồn gốc",
        false,
        true,
      )}</View>
      <View style={editor.evidence}><View style={editor.heading}><Icon name="file-text" size={17} color={colors.strong} /><Text style={editor.subTitle}>Minh chứng nhãn mác</Text></View><Text style={editor.note}>Đường dẫn nhãn sản phẩm, cảnh báo và thông tin công bố.</Text>{field(
        "labelProof",
        "Đường dẫn nhãn mác",
        false,
        true,
      )}</View><Text style={editor.note}>Mỗi dòng một URL đầy đủ. Liên kết cần cho phép người thẩm định xem tài liệu.</Text>
      </View>}
      {step === 5 && <View style={editor.section}>
      <EditorHeading icon="users" title="Tiếp thị & cấp mẫu" detail="Thiết lập quyền quảng bá cho KOL/KOC" />
      <View style={editor.softBox}><View style={editor.heading}><Icon name="percent" size={18} color={colors.strong} /><Text style={[editor.subTitle, { flex: 1 }]}>Hoa hồng nền</Text><Text style={editor.summaryValue}>10%</Text></View><Text style={editor.note}>Mức nền của sàn. Tỷ lệ VIP được xử lý trong thỏa thuận riêng.</Text></View>
      <View style={editor.policyRow}><View style={{ flex: 1, gap: 5 }}><Text style={editor.subTitle}>Cho phép tiếp thị</Text><Text style={editor.note}>KOL/KOC có thể quảng bá sản phẩm theo điều kiện của hệ thống.</Text></View>
        <Switch
          value={affiliate}
          thumbColor={affiliate ? colors.strong : colors.white}
          onValueChange={setAffiliate}
          disabled={operation.busy}
          trackColor={{ true: colors.brand, false: colors.line }}
        />
      </View>
      <View style={editor.policyRow}><View style={{ flex: 1, gap: 5 }}><Text style={editor.subTitle}>Cho phép xin mẫu</Text><Text style={editor.note}>Nhận yêu cầu trải nghiệm sản phẩm từ KOL/KOC.</Text></View>
        <Switch
          value={sample}
          thumbColor={sample ? colors.strong : colors.white}
          onValueChange={setSample}
          disabled={operation.busy}
          trackColor={{ true: colors.brand, false: colors.line }}
        />
      </View>
      {sample && <View style={editor.softBox}>{field("quota", "Suất mẫu", true)}<Text style={editor.note}>Nhập số nguyên lớn hơn 0. Yêu cầu mẫu vẫn cần Shop xét duyệt.</Text></View>}
      <View style={editor.evidence}><Text style={editor.subTitle}>Tóm tắt trước khi gửi</Text><Text style={editor.note}>{form.title.trim() || "Chưa nhập tên sản phẩm"}</Text><View style={editor.reviewRow}><Text style={editor.note}>Ảnh bìa / ảnh phụ</Text><Text style={editor.reviewValue}>{cover ? "Đã chọn" : "Chưa chọn"} · {gallery.length}/4</Text></View><View style={editor.reviewRow}><Text style={editor.note}>Phân loại</Text><Text style={editor.reviewValue}>{variants.length}</Text></View><View style={editor.reviewRow}><Text style={editor.note}>Giá bán chung</Text><Text style={editor.reviewValue}>{Number(form.price) > 0 ? `${Number(form.price).toLocaleString("vi-VN")} đ` : "Chưa nhập"}</Text></View></View>
      </View>}
      <ErrorNotice error={operation.error} />
      <View style={[editor.footer, { paddingBottom: Math.max(12, insets.bottom + 8) }]}><View style={editor.buttons}>{step > 0 && <View style={{ flex: 1 }}><Button title="Quay lại" secondary disabled={operation.busy} onPress={() => goStep(step - 1)} /></View>}<View style={{ flex: 1 }}>{step < 5 ? <Button title="Tiếp tục" soft disabled={operation.busy} onPress={() => goStep(step + 1)} /> : <Button title="Gửi duyệt sản phẩm" soft loading={operation.busy} disabled={!store} onPress={() => void submit()} />}</View></View></View>
      </ScrollView>
    </Screen>
  );
}

const fieldHelp: Record<string, { placeholder: string }> = {
  title: { placeholder: "Tên + thương hiệu + đặc điểm sản phẩm" },
  sku: { placeholder: "Ví dụ: SORA-SERUM-30ML" },
  description: { placeholder: "Đặc điểm nổi bật, công dụng, cách sử dụng và lưu ý…" },
  barcode: { placeholder: "13 chữ số trên bao bì" },
  origin: { placeholder: "Quốc gia / nơi sản xuất" },
  originProof: { placeholder: "https://… (mỗi dòng một đường dẫn)" },
  labelProof: { placeholder: "https://… (mỗi dòng một đường dẫn)" },
};
const steps = ["Cơ bản", "Hình ảnh", "Giá & kho", "Kiện hàng", "Minh chứng", "Tiếp thị"];
const editor = StyleSheet.create({
  header: { backgroundColor: colors.white, padding: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  heading: { flexDirection: "row", alignItems: "center", gap: 10 }, icon: { width: 38, height: 38, borderRadius: 11, backgroundColor: colors.soft, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 16, lineHeight: 23, fontWeight: "700", color: colors.ink }, note: { fontSize: 11, lineHeight: 17, color: colors.muted },
  steps: { flexDirection: "row", flexWrap: "wrap", gap: 6 }, step: { width: "31%", flexGrow: 1, minHeight: 40, paddingHorizontal: 3, borderWidth: 1, borderColor: colors.line, borderRadius: 10, justifyContent: "center", alignItems: "center", backgroundColor: colors.white }, active: { backgroundColor: colors.soft, borderColor: colors.strong }, stepText: { fontSize: 11, lineHeight: 16, fontWeight: "600", color: colors.muted, textAlign: "center" },
  progress: { height: 3, borderRadius: 3, backgroundColor: colors.sand, overflow: "hidden" }, progressFill: { height: 3, backgroundColor: colors.brand, borderRadius: 3 },
  category: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, backgroundColor: colors.soft }, categoryText: { fontSize: 12, lineHeight: 18, color: colors.ink, fontWeight: "600" },
  content: { flexGrow: 1, padding: 12, gap: 12 }, section: { padding: 14, gap: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  footer: { marginTop: "auto", paddingTop: 8 }, buttons: { flexDirection: "row", gap: 10 },
  subTitle: { fontSize: 13, lineHeight: 19, color: colors.ink, fontWeight: "600" },
  mediaBox: { flexDirection: "row", alignItems: "center", gap: 12 }, coverPreview: { width: 108, height: 128, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.line, borderRadius: 12, overflow: "hidden", justifyContent: "center", alignItems: "center" },
  gallery: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, photoTile: { width: "30%", flexGrow: 1, maxWidth: "32%", gap: 4 }, photo: { width: "100%", aspectRatio: 1, borderRadius: 10, backgroundColor: colors.canvas }, removePhoto: { position: "absolute", top: 0, right: 0, width: 44, height: 44, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 12, alignItems: "center", justifyContent: "center" }, addPhoto: { width: "30%", minHeight: 90, borderWidth: 1, borderStyle: "dashed", borderColor: colors.brandBorder, borderRadius: 10, justifyContent: "center", alignItems: "center", gap: 6, backgroundColor: colors.soft },
  summaryRow: { flexDirection: "row", gap: 8 }, summaryCell: { flex: 1, gap: 6, padding: 10, backgroundColor: colors.soft, borderRadius: 10 }, summaryValue: { fontSize: 16, fontWeight: "700", color: colors.ink },
  variant: { padding: 12, gap: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.canvas }, variantFields: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, number: { width: 28, height: 28, backgroundColor: colors.soft, borderRadius: 8, justifyContent: "center", alignItems: "center" }, deleteVariant: { minWidth: 44, minHeight: 44, justifyContent: "center", alignItems: "center" },
  softBox: { padding: 12, gap: 10, borderRadius: 12, backgroundColor: colors.soft }, dimensions: { flexDirection: "row", gap: 8 }, evidence: { padding: 12, gap: 9, borderWidth: 1, borderColor: colors.line, borderRadius: 12 }, policyRow: { flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: colors.line, paddingVertical: 10 }, reviewRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }, reviewValue: { fontSize: 12, lineHeight: 18, color: colors.ink, fontWeight: "600", flexShrink: 1 },
});
