import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Icon } from "../../components/commerce";
import { ProductPhoto } from "../../components/ProductPhoto";
import { colors as c } from "../../theme/tokens";
import { money } from "../../types/contracts";
import { ErrorNotice } from "../../components/ui";

export interface MarketingProductOption {
  id: string;
  title: string;
  imageUrl?: string | null;
  price?: string | number | null;
  estimatedCommissionRate?: number | null;
  store?: { name: string } | null;
  sampleQuotaRemaining?: number;
}

const searchable = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLocaleLowerCase("vi");

export function MarketingProductPicker({ products, value, onChange, disabled, loading, label = "Sản phẩm tiếp thị", description, emptyNote, pricePrefix = "", showSampleQuota = false, error, onRefresh }: {
  products: readonly MarketingProductOption[];
  value: string;
  onChange(id: string): void;
  disabled: boolean;
  loading: boolean;
  label?: string;
  description?: string;
  emptyNote?: string;
  pricePrefix?: string;
  showSampleQuota?: boolean;
  error?: unknown;
  onRefresh?(): void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const insets = useSafeAreaInsets();
  const selected = products.find(product => product.id === value);
  const filtered = useMemo(() => {
    const term = searchable(search.trim());
    return products.filter(product => searchable(`${product.title} ${product.store?.name || ""}`).includes(term));
  }, [products, search]);
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={selected ? `Đổi sản phẩm: ${selected.title}` : label} accessibilityState={{ disabled }} disabled={disabled} onPress={() => { setSearch(""); setOpen(true); }} style={s.trigger}>
      {selected ? <ProductPhoto uri={selected.imageUrl} resizeMode="contain" style={s.triggerPhoto} /> : <View style={s.triggerIcon}><Icon name="package" size={20} color={c.strong} /></View>}
      <View style={s.text}><Text style={s.caption}>{label}</Text><Text numberOfLines={2} style={s.name}>{selected?.title || (loading ? "Đang tải sản phẩm…" : "Chọn sản phẩm")}</Text>{selected?.store?.name && <Text numberOfLines={1} style={s.caption}>{selected.store.name}</Text>}</View>
      <Icon name="chevron-down" size={18} color={c.muted} />
    </Pressable>
    <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
      <StatusBar style="dark" />
      <View style={[s.modal, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={s.header}>
          <View style={s.headerRow}><View style={s.text}><Text accessibilityRole="header" style={s.title}>{label}</Text><Text style={s.caption}>{description || `${products.length} sản phẩm có thể tạo link`}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Đóng chọn sản phẩm" onPress={() => setOpen(false)} style={s.close}><Icon name="x" size={21} color={c.muted} /></Pressable></View>
          {onRefresh && <Pressable accessibilityRole="button" disabled={loading} onPress={onRefresh} style={{ minHeight: 36, justifyContent: "center", alignSelf: "flex-end" }}><Text style={s.rate}>{loading ? "Đang cập nhật…" : "Cập nhật suất mẫu"}</Text></Pressable>}
          <ErrorNotice error={error} retry={onRefresh} />
          <View style={s.search}>
            <Icon name="search" size={18} color={c.muted} />
            <TextInput accessibilityLabel="Tìm sản phẩm hoặc gian hàng" placeholder="Tìm sản phẩm, gian hàng…" placeholderTextColor={c.muted} value={search} onChangeText={setSearch} style={s.input} returnKeyType="search" autoCorrect={false} />
            {search.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Xóa tìm kiếm" onPress={() => setSearch("")} style={s.clear}><Icon name="x" size={16} color={c.muted} /></Pressable>}
          </View>
        </View>
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={s.list}
          ListEmptyComponent={<View style={s.empty}><Icon name="search" size={26} color={c.strong} /><Text style={s.emptyTitle}>{products.length ? "Không tìm thấy sản phẩm" : "Chưa có sản phẩm đủ điều kiện"}</Text><Text style={s.emptyNote}>{products.length ? "Thử tên sản phẩm hoặc gian hàng khác." : emptyNote || "Kiểm tra hồ sơ KYC và sản phẩm được phép tiếp thị."}</Text></View>}
          renderItem={({ item }) => {
            const active = value === item.id;
            return <Pressable accessibilityRole="radio" accessibilityState={{ checked: active }} accessibilityLabel={`${item.title}, ${item.store?.name || ""}`} onPress={() => { onChange(item.id); setOpen(false); }} style={[s.product, active && s.selected]}>
              <ProductPhoto uri={item.imageUrl} resizeMode="contain" style={s.photo} />
              <View style={s.text}>
                <Text numberOfLines={2} style={s.name}>{item.title}</Text>
                {item.store?.name && <Text numberOfLines={1} style={s.caption}>{item.store.name}</Text>}
                <View style={s.meta}>{item.price != null && <Text style={s.price}>{pricePrefix}{money(item.price)}</Text>}{item.estimatedCommissionRate != null && <Text style={s.rate}>HH dự kiến {item.estimatedCommissionRate}%</Text>}</View>
                {showSampleQuota && <Text style={[s.rate, { alignSelf: "flex-start", fontSize: 11 }]}>Shop mở cấp mẫu · Còn {item.sampleQuotaRemaining ?? "—"} suất</Text>}
              </View>
              <View style={[s.radio, active && s.radioActive]}>{active && <Icon name="check" size={12} color={c.strong} />}</View>
            </Pressable>;
          }}
        />
      </View>
    </Modal>
  </>;
}

const s = StyleSheet.create({
  modal: { flex: 1, backgroundColor: c.canvas },
  header: { backgroundColor: c.white, borderBottomWidth: 1, borderColor: c.line, paddingHorizontal: 14, paddingBottom: 12, gap: 10 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 6 },
  title: { fontSize: 16, lineHeight: 22, fontWeight: "700", color: c.ink },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  text: { flex: 1, gap: 5 },
  caption: { fontSize: 11, lineHeight: 15, color: c.muted },
  name: { fontSize: 13, lineHeight: 18, fontWeight: "600", color: c.ink },
  search: { flexDirection: "row", alignItems: "center", minHeight: 46, paddingLeft: 12, paddingRight: 4, gap: 8, backgroundColor: c.canvas, borderWidth: 1, borderColor: c.line, borderRadius: 12 },
  input: { flex: 1, minHeight: 44, paddingVertical: 8, fontSize: 13, color: c.ink },
  clear: { width: 40, height: 44, alignItems: "center", justifyContent: "center" },
  list: { padding: 12, gap: 9, paddingBottom: 20 },
  product: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 14, backgroundColor: c.white, borderWidth: 1, borderColor: c.line },
  selected: { borderColor: c.strong, backgroundColor: c.soft },
  photo: { width: 60, height: 72, backgroundColor: c.white, borderWidth: 1, borderColor: c.line, borderRadius: 10 },
  meta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 5 },
  price: { fontSize: 12, fontWeight: "700", color: c.ink },
  rate: { fontSize: 10, color: c.strong, backgroundColor: c.soft, paddingHorizontal: 5, paddingVertical: 3, borderRadius: 5 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: c.line, alignItems: "center", justifyContent: "center" },
  radioActive: { borderColor: c.strong, backgroundColor: c.soft },
  trigger: { minHeight: 64, borderWidth: 1, borderColor: c.line, borderRadius: 12, padding: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  triggerIcon: { width: 36, height: 36, backgroundColor: c.soft, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  triggerPhoto: { width: 44, height: 52, borderRadius: 8, borderWidth: 1, borderColor: c.line, backgroundColor: c.white },
  empty: { alignItems: "center", paddingVertical: 44, paddingHorizontal: 20, gap: 9 },
  emptyTitle: { fontSize: 14, fontWeight: "600", color: c.ink, textAlign: "center" },
  emptyNote: { fontSize: 12, lineHeight: 18, color: c.muted, textAlign: "center" },
});
