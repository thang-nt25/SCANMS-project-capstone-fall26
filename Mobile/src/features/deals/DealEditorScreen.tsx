import { validateInput } from "../../utils/validate-input";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { BottomSheet } from "../../components/BottomSheet";
import { Avatar, Icon } from "../../components/commerce";
import { d, DealProduct } from "./deal-presentation";
import type { ScreenProps } from "../../navigation/router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { products } from "../../services/scanms";
import { api } from "../../services/api";
import {
  Button,
  ErrorNotice,
  Field,
  PageControls,
  Screen,
} from "../../components/ui";
import { colors } from "../../theme/tokens";
import { useAuth } from "../auth/AuthProvider";
import { useStoreScope } from "../auth/StoreScope";
import { useOperation } from "../../hooks/useOperation";
import { DealInputSchema } from "./deal-policy";
import type { Product } from "../../types/contracts";

export function DealEditorScreen({
  route,
  navigation,
}: ScreenProps<"DealEditor">) {
  const { session } = useAuth(),
    { store } = useStoreScope(),
    operation = useOperation(),
    client = useQueryClient();
  const role = session!.user.role,
    shop = role === "SHOP_MANAGER";
  const [product, setProduct] = useState<Product | undefined>(
      route.params?.product,
    ),
    [page, setPage] = useState(1);
  const [picker, setPicker] = useState(false), [search, setSearch] = useState("");
  const [rate, setRate] = useState("14"),
    [revenue, setRevenue] = useState("1000000"),
    [days, setDays] = useState("14"),
    [plan, setPlan] = useState("");
  const [scope, setScope] = useState<
    "SINGLE_PRODUCT" | "SELECTED_PRODUCTS" | "STORE_WIDE"
  >("SINGLE_PRODUCT");
  const [selected, setSelected] = useState<Product[]>([]),
    [commit, setCommit] = useState(false),
    [budget, setBudget] = useState("1000000"),
    [discount, setDiscount] = useState("5");
  const catalogStoreId = shop ? store?.id : scope === "SELECTED_PRODUCTS" ? product?.storeId || product?.store?.id : undefined;
  const result = useQuery({
    queryKey: [session!.user.id, "deal-products", catalogStoreId, page, search],
    queryFn: ({ signal }) =>
      products(role, page, search.trim(), catalogStoreId, signal),
    enabled: !shop || Boolean(store),
  });
  const sameStore = (item: Product) =>
    (item.storeId || item.store?.id) ===
    (product?.storeId || product?.store?.id);
  const submit = () =>
    operation.run(
      async () => {
        if (!commit) throw new Error(shop ? "Cần xác nhận điều khoản lời mời VIP." : "Cần xác nhận cam kết video review.");
        if (shop && !route.params?.collaboratorId)
          throw new Error(
            "Mở đề nghị từ KOC trong AI Matching hoặc quan hệ hợp tác.",
          );
        if (shop && route.params?.storeId && route.params.storeId !== store?.id)
          throw new Error("Gian hàng quản lý đã thay đổi. Hãy mở lại lời mời từ danh sách đối tác của Shop hiện tại.");
        if (shop && (product?.storeId || product?.store?.id) !== store?.id)
          throw new Error("Chọn sản phẩm thuộc gian hàng đang quản lý.");
        const body = validateInput(DealInputSchema, {
          productId: product?.id,
          proposedCommissionRate: rate,
          targetRevenue: revenue,
          commitmentDays: days,
          salesCommitment: plan,
          videoReviewCommitment: true,
          scopeType: scope,
          ...(scope === "SELECTED_PRODUCTS"
            ? {
                productIds: [
                  ...new Set(
                    [product?.id, ...selected.map((item) => item.id)].filter(
                      (id): id is string => Boolean(id),
                    ),
                  ),
                ],
              }
            : {}),
        });
        if (selected.some((item) => !sameStore(item)))
          throw new Error("Các sản phẩm phải thuộc cùng một gian hàng.");
        if (
          shop &&
          (!Number.isInteger(Number(discount)) ||
            Number(discount) < 1 ||
            Number(discount) > 20 ||
            !Number.isInteger(Number(budget)) ||
            Number(budget) <= 0)
        )
          throw new Error("Kiểm tra giảm giá và ngân sách coupon.");
        await api.request(
          shop ? "/affiliate-deals/offers" : "/affiliate-deals/proposals",
          {
            method: "POST",
            timeout: 95000,
            body: {
              ...body,
              ...(shop
                ? {
                    collaboratorId: route.params!.collaboratorId,
                    couponTerms: {
                      discountPercent: Number(discount),
                      budgetTotal: Number(budget),
                    },
                  }
                : {}),
            },
          },
        );
      },
      async () => {
        await client.invalidateQueries({
          queryKey: [session!.user.id, "deals"],
        });
        navigation.replace("Deals");
      },
    );
  return <Screen>
    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 24 }}>
      {shop && <View style={d.section}><View style={d.row}><Avatar uri={route.params?.collaboratorAvatar} name={route.params?.collaboratorName || route.params?.collaboratorEmail || "KOL/KOC"} size={44} /><View style={d.flex}><Text style={d.tiny}>KOL/KOC nhận lời mời</Text><Text style={d.name}>{route.params?.collaboratorName || route.params?.collaboratorEmail || "Chưa chọn đối tác"}</Text>{!!route.params?.collaboratorEmail && <Text style={d.tiny}>{route.params.collaboratorEmail}</Text>}</View><Icon name="send" size={19} color={colors.strong} /></View></View>}
      <View style={d.section}>
        <View style={d.row}><Icon name="package" size={19} color={colors.strong} /><Text style={d.name}>Sản phẩm áp dụng</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Chọn sản phẩm cho đề nghị VIP" disabled={operation.busy} onPress={() => setPicker(true)} style={[d.row, { minHeight: 70 }]}>
          <View style={d.flex}>{product ? <DealProduct title={product.title} imageUrl={product.imageUrl} store={product.store?.name || store?.name} /> : <View style={d.row}><Icon name="package" size={24} color={colors.strong} /><View style={d.flex}><Text style={d.name}>Chọn sản phẩm</Text><Text style={d.tiny}>Sản phẩm chính của thỏa thuận</Text></View></View>}</View><Icon name="chevron-down" size={18} color={colors.muted} />
        </Pressable>
        <View style={{ flexDirection: "row", gap: 6 }}>{(["SINGLE_PRODUCT", "STORE_WIDE"] as const).map((value, index) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: scope === value }} disabled={operation.busy} onPress={() => { setScope(value); setSelected([]); }} style={{ flex: 1, minHeight: 54, paddingHorizontal: 5, borderRadius: 10, borderWidth: 1, borderColor: scope === value ? colors.strong : colors.line, backgroundColor: scope === value ? colors.soft : colors.white, justifyContent: "center", alignItems: "center" }}><Text style={[d.actionText, { textAlign: "center", fontSize: 11, lineHeight: 16 }]}>{["Một sản phẩm", "Toàn gian hàng"][index]}</Text></Pressable>)}</View>
        {scope === "SELECTED_PRODUCTS" && <>
          <Pressable accessibilityRole="button" onPress={() => setPicker(true)} disabled={!product || operation.busy} style={d.action}><Icon name="plus" size={15} /><Text style={d.actionText}>Chọn thêm sản phẩm ({product ? selected.length + 1 : 0})</Text></Pressable>
          {selected.map(item => <View key={item.id} style={d.row}><View style={d.flex}><DealProduct title={item.title} imageUrl={item.imageUrl} /></View><Pressable accessibilityRole="button" accessibilityLabel={`Bỏ ${item.title}`} onPress={() => setSelected(current => current.filter(row => row.id !== item.id))} style={{ width: 44, height: 44, justifyContent: "center", alignItems: "center" }}><Icon name="x" size={17} color={colors.muted} /></Pressable></View>)}
          <Text style={d.tiny}>Chọn ít nhất 2 sản phẩm cùng gian hàng. Sản phẩm chính luôn được giữ.</Text>
        </>}
        {scope === "STORE_WIDE" && <Text style={d.tiny}>Áp dụng cho gian hàng của sản phẩm chính đã chọn.</Text>}
      </View>
      <View style={d.section}>
        <View style={d.row}><Icon name="trending-up" size={19} color={colors.strong} /><Text style={d.name}>Thù lao & mục tiêu</Text></View>
        <View style={{ flexDirection: "row", gap: 10 }}><View style={d.flex}><Field label="Tỷ lệ VIP (%) *" value={rate} onChangeText={setRate} keyboardType="decimal-pad" editable={!operation.busy} style={{ minHeight: 46, fontSize: 14 }} /></View><View style={d.flex}><Field label="Cam kết (ngày) *" value={days} onChangeText={setDays} keyboardType="number-pad" editable={!operation.busy} style={{ minHeight: 46, fontSize: 14 }} /></View></View>
        <Text style={d.tiny}>Tỷ lệ từ 10–25% · Kỳ cam kết 1–366 ngày.</Text>
        <View style={d.row}>{[7, 14, 30].map(value => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: days === String(value) }} disabled={operation.busy} onPress={() => setDays(String(value))} style={[d.action, { flex: 1, paddingHorizontal: 4, backgroundColor: days === String(value) ? colors.soft : colors.white, borderColor: days === String(value) ? colors.strong : colors.line }]}><Text style={d.actionText}>{value} ngày</Text></Pressable>)}</View>
        <Field label="Mục tiêu doanh thu (đ) *" value={revenue} onChangeText={setRevenue} keyboardType="number-pad" editable={!operation.busy} style={{ minHeight: 46, fontSize: 14 }} />
        {Number(revenue) > 0 && Number.isFinite(Number(revenue)) && <Text style={d.tiny}>Mục tiêu: {Number(revenue).toLocaleString("vi-VN")} đ</Text>}
        {Number(rate) > 16 && <View style={d.soft}><Text style={d.note}>Trên 16% cần Admin duyệt sau khi đối tác chấp thuận. Gửi đề nghị chưa kích hoạt tỷ lệ VIP.</Text></View>}
      </View>
      <View style={d.section}>
        <View style={d.row}><Icon name="file-text" size={19} color={colors.strong} /><Text style={d.name}>Kế hoạch hợp tác</Text></View>
        <Field label={shop ? "Yêu cầu nội dung & video *" : "Nội dung & video dự kiến *"} value={plan} onChangeText={setPlan} multiline maxLength={1000} editable={!operation.busy} placeholder="Nội dung review, kênh đăng, số video và kế hoạch đạt mục tiêu…" style={{ minHeight: 94, fontSize: 13, lineHeight: 19 }} />
        <Text style={[d.tiny, { textAlign: "right" }]}>{plan.length}/1000 ký tự · Tối thiểu 5 ký tự</Text>
        {shop && <><Text style={d.name}>Mã ưu đãi đi kèm</Text><View style={d.row}><View style={d.flex}><Field label="Giảm giá (%) *" value={discount} onChangeText={setDiscount} keyboardType="number-pad" editable={!operation.busy} /></View><View style={d.flex}><Field label="Ngân sách (đ) *" value={budget} onChangeText={setBudget} keyboardType="number-pad" editable={!operation.busy} /></View></View><Text style={d.tiny}>Giảm 1–20%. Điều khoản coupon được xử lý khi kích hoạt thỏa thuận.</Text></>}
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: commit, disabled: operation.busy }} disabled={operation.busy} onPress={() => setCommit(value => !value)} style={[d.row, { minHeight: 48 }]}><View style={{ width: 22, height: 22, borderWidth: 1, borderColor: commit ? colors.strong : colors.line, borderRadius: 6, backgroundColor: commit ? colors.soft : colors.white, alignItems: "center", justifyContent: "center" }}>{commit && <Icon name="check" size={15} color={colors.strong} />}</View><Text style={[d.note, { flex: 1, color: colors.ink }]}>{shop ? "Tôi xác nhận các điều khoản và yêu cầu video gửi đến KOL/KOC." : "Tôi cam kết thực hiện video review và kế hoạch hợp tác trên."}</Text></Pressable>
      </View>
      <ErrorNotice error={operation.error} />
      <Button title={shop ? "Gửi lời mời VIP" : "Gửi đề xuất đến Shop"} soft loading={operation.busy} disabled={!product || !commit || (shop && !route.params?.collaboratorId)} onPress={() => void submit()} />
    </ScrollView>
    {picker && <BottomSheet title={scope === "SELECTED_PRODUCTS" && product ? "Chọn thêm sản phẩm cùng Shop" : "Chọn sản phẩm VIP"} close={() => setPicker(false)}>
      <View style={{ minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: colors.line, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10 }}><Icon name="search" size={17} color={colors.muted} /><TextInput accessibilityLabel="Tìm sản phẩm VIP" value={search} onChangeText={value => { setSearch(value); setPage(1); }} placeholder="Tìm sản phẩm, gian hàng…" placeholderTextColor={colors.muted} style={{ flex: 1, minHeight: 44, color: colors.ink, fontSize: 13 }} /></View>
      <ErrorNotice error={result.error} retry={() => void result.refetch()} />
      {result.isLoading && <Text style={d.note}>Đang tải sản phẩm…</Text>}
      {result.data?.items.filter(item => (!item.moderationStatus || item.moderationStatus === "APPROVED") && (scope !== "SELECTED_PRODUCTS" || !product || sameStore(item))).map(item => {
        const checked = product?.id === item.id || selected.some(row => row.id === item.id);
        return <Pressable key={item.id} accessibilityRole={scope === "SELECTED_PRODUCTS" && product ? "checkbox" : "radio"} accessibilityState={{ checked }} disabled={operation.busy} onPress={() => {
          if (scope === "SELECTED_PRODUCTS" && product) { if (item.id !== product.id) setSelected(current => current.some(row => row.id === item.id) ? current.filter(row => row.id !== item.id) : [...current, item]); }
          else { setProduct(item); setSelected([]); setPicker(false); }
        }} style={[d.row, { borderWidth: 1, borderColor: checked ? colors.strong : colors.line, backgroundColor: checked ? colors.soft : colors.white, borderRadius: 12, padding: 10 }]}><View style={d.flex}><DealProduct title={item.title} imageUrl={item.imageUrl} store={item.store?.name || store?.name} subtitle={item.price != null ? `${Number(item.price).toLocaleString("vi-VN")} đ` : undefined} /></View><Icon name={checked ? "check-circle" : "circle"} size={18} color={checked ? colors.strong : colors.muted} /></Pressable>;
      })}
      {!result.isLoading && !result.error && result.data?.items.length === 0 && <Text style={d.note}>Không có sản phẩm phù hợp. Thử tên khác.</Text>}
      {result.data && result.data.totalPages > 1 && <PageControls page={page} totalPages={result.data.totalPages} loading={result.isFetching} onChange={setPage} />}
      {scope === "SELECTED_PRODUCTS" && product && <Button title={`Xong · ${selected.length + 1} sản phẩm`} secondary onPress={() => setPicker(false)} />}
    </BottomSheet>}
  </Screen>;
}
