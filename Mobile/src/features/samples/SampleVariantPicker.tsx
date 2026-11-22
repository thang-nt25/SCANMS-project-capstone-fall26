import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { BottomSheet } from "../../components/BottomSheet";
import { ProductPhoto } from "../../components/ProductPhoto";
import { Icon } from "../../components/commerce";
import type { Product } from "../../types/contracts";
import { colors as c } from "../../theme/tokens";

type Variant = NonNullable<Product["variants"]>[number];
export function SampleVariantPicker({ variants, value, onChange, disabled, productName, productImage }: {
  variants: readonly Variant[];
  value: string;
  onChange(id: string): void;
  disabled: boolean;
  productName: string;
  productImage?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = variants.find(item => item.id === value);
  const term = search.trim().toLocaleLowerCase("vi");
  const rows = variants.filter(item => `${item.name} ${item.sku || ""}`.toLocaleLowerCase("vi").includes(term));
  return <>
    <View style={{ gap: 6 }}>
      <Text style={s.label}>Phân loại mẫu</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Chọn phân loại mẫu${selected ? `: ${selected.name}` : ""}`} accessibilityState={{ disabled, expanded: open }} disabled={disabled} onPress={() => { setSearch(""); setOpen(true); }} style={[s.trigger, disabled && { opacity: 0.5 }]}>
        <View style={s.icon}><Icon name="layers" size={18} color={c.strong} /></View>
        <Text style={[s.name, { flex: 1 }]}>{selected?.name || "Chọn phân loại"}</Text>
        <Icon name="chevron-down" size={17} color={c.muted} />
      </Pressable>
    </View>
    {open && <BottomSheet title="Chọn phân loại mẫu" close={() => setOpen(false)}>
      <View style={s.product}>
        <ProductPhoto uri={productImage} style={s.productPhoto} resizeMode="contain" />
        <View style={{ flex: 1, gap: 5 }}><Text numberOfLines={2} style={s.name}>{productName}</Text><Text style={s.note}>{variants.length} lựa chọn · Chạm để chọn</Text></View>
      </View>
      {variants.length > 6 && <View style={s.search}><Icon name="search" size={17} color={c.muted} /><TextInput accessibilityLabel="Tìm phân loại mẫu" value={search} onChangeText={setSearch} placeholder="Tìm tên phân loại…" placeholderTextColor={c.muted} style={{ flex: 1, minHeight: 44, fontSize: 13, color: c.ink }} /></View>}
      <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
        {rows.map(item => {
          const active = value === item.id;
          const attributes = Object.values(item.attributes || {}).filter(attribute => attribute && !item.name.includes(attribute)).join(" · ");
          return <Pressable key={item.id} accessibilityRole="radio" accessibilityLabel={item.name} accessibilityState={{ checked: active, disabled }} disabled={disabled} onPress={() => { onChange(item.id); setOpen(false); }} style={({ pressed }) => [s.option, active && s.active, pressed && { opacity: 0.75 }]}>
            {item.imageUrl && <ProductPhoto uri={item.imageUrl} resizeMode="contain" style={s.variantPhoto} />}
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={s.name}>{item.name}</Text>
              {Boolean(attributes) && <Text style={s.note}>{attributes}</Text>}
              {item.sampleQuotaRemaining != null && <Text style={s.note}>Còn {item.sampleQuotaRemaining} suất mẫu</Text>}
            </View>
            <View style={[s.radio, active && { borderColor: c.strong }]}>{active && <View style={s.dot} />}</View>
          </Pressable>;
        })}
        {rows.length === 0 && <Text style={[s.note, { textAlign: "center", padding: 16 }]}>Không tìm thấy phân loại phù hợp.</Text>}
      </View>
      <Text style={s.note}>Phân loại đã chọn sẽ được gửi cùng yêu cầu xin mẫu.</Text>
    </BottomSheet>}
  </>;
}
const s = StyleSheet.create({
  label: { fontSize: 12, lineHeight: 18, color: c.muted },
  trigger: { minHeight: 54, borderWidth: 1, borderColor: c.line, borderRadius: 12, backgroundColor: c.white, flexDirection: "row", alignItems: "center", padding: 10, gap: 10 },
  icon: { width: 30, height: 30, borderRadius: 8, backgroundColor: c.soft, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 13, lineHeight: 19, fontWeight: "600", color: c.ink },
  note: { fontSize: 11, lineHeight: 17, color: c.muted },
  product: { flexDirection: "row", alignItems: "center", gap: 11, paddingBottom: 12, borderBottomWidth: 1, borderColor: c.line },
  productPhoto: { width: 56, height: 64, borderRadius: 9, backgroundColor: c.white, borderWidth: 1, borderColor: c.line },
  variantPhoto: { width: 40, height: 46, borderRadius: 7, backgroundColor: c.white },
  option: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: c.line, borderRadius: 12, padding: 12, backgroundColor: c.white },
  active: { borderColor: c.strong, backgroundColor: c.soft },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: c.line, alignItems: "center", justifyContent: "center" },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.strong },
  search: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: c.line, borderRadius: 10, backgroundColor: c.canvas },
});
