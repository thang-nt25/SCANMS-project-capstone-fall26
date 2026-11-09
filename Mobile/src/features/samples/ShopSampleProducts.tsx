import { useState } from "react";
import { Pressable, Switch, Text, TextInput, View } from "react-native";
import { z } from "zod";
import { BottomSheet } from "../../components/BottomSheet";
import { ProductPhoto } from "../../components/ProductPhoto";
import { Icon } from "../../components/commerce";
import { Button, ErrorNotice, Field, PageControls } from "../../components/ui";
import { colors as c } from "../../theme/tokens";
import { QueryState, useCommand, useResource } from "../common/shared";
import { sampleStyles as s } from "./sample-styles";

const Variant = z.object({ id: z.string(), name: z.string(), sampleEnabled: z.boolean().nullish(), sampleQuota: z.number().nullish(), sampleGrantedCount: z.number() });
const Product = z.object({ id: z.string(), title: z.string(), imageUrl: z.string().nullish(), sampleEnabled: z.boolean(), sampleQuota: z.number(), sampleGrantedCount: z.number(), isActive: z.boolean(), moderationStatus: z.string(), variants: z.array(Variant).optional() });
const Products = z.object({ items: z.array(Product), pagination: z.object({ totalPages: z.number() }) });
type Item = z.infer<typeof Product>;
export function ShopSampleProducts({ storeId }: { storeId?: string }) {
  const [page, setPage] = useState(1), [search, setSearch] = useState(""), [keyword, setKeyword] = useState("");
  const [editing, setEditing] = useState<Item | null>(null);
  const result = useResource("shop-sample-products", `/products?storeId=${storeId || ""}&page=${page}&limit=12&search=${encodeURIComponent(keyword)}`, Products, Boolean(storeId));
  return <>
    <View style={{ flexDirection: "row", alignItems: "center", minHeight: 48, borderWidth: 1, borderColor: c.line, borderRadius: 12, backgroundColor: c.white, paddingLeft: 12 }}>
      <TextInput placeholder="Tìm sản phẩm hoặc SKU…" placeholderTextColor={c.muted} accessibilityLabel="Tìm sản phẩm cấp mẫu" value={search} onChangeText={setSearch} returnKeyType="search" onSubmitEditing={() => { setKeyword(search.trim()); setPage(1); }} style={{ flex: 1, minWidth: 0, paddingVertical: 12, paddingHorizontal: 0, fontSize: 14, color: c.ink }} />
      <Pressable accessibilityRole="button" accessibilityLabel="Tìm sản phẩm" onPress={() => { setKeyword(search.trim()); setPage(1); }} style={{ width: 48, minHeight: 48, alignItems: "center", justifyContent: "center" }}><Icon name="search" size={19} color={c.strong} /></Pressable>
    </View>
    <QueryState loading={result.isLoading} error={result.error} retry={() => void result.refetch()} />
    {result.data?.items.length === 0 && <View style={s.card}><Text style={s.note}>Không có sản phẩm phù hợp.</Text></View>}
    {result.data?.items.map(product => {
      const remaining = Math.max(0, product.sampleQuota - product.sampleGrantedCount);
      const eligible = product.isActive && product.moderationStatus === "APPROVED";
      const overrides = product.variants?.filter(v => v.sampleEnabled != null || v.sampleQuota != null).length || 0;
      return <View key={product.id} style={s.card}>
        <View style={s.row}><ProductPhoto uri={product.imageUrl} resizeMode="contain" style={s.photo} /><View style={s.flex}><Text numberOfLines={2} style={s.name}>{product.title}</Text><Text style={[s.tiny, { color: c.strong }]}>{!eligible ? "Chưa đủ điều kiện hiển thị cho KOL" : !product.sampleEnabled ? "Đang tắt cấp mẫu" : remaining ? "Đang mở cấp mẫu" : "Đã hết suất mẫu"}</Text></View></View>
        <View style={[s.soft, { flexDirection: "row", gap: 8 }]}>{[{ label: "Hạn mức chung", value: product.sampleQuota }, { label: "Đã duyệt", value: product.sampleGrantedCount }, { label: "Còn lại", value: remaining }].map(stat => <View key={stat.label} style={{ flex: 1, gap: 4, alignItems: "center" }}><Text style={s.tiny}>{stat.label}</Text><Text style={[s.heading, { color: stat.label === "Còn lại" ? c.strong : c.ink }]}>{stat.value}</Text></View>)}</View>
        {!!overrides && <Text style={s.tiny}>{overrides} phân loại có chính sách riêng · xem trong Chỉnh chính sách.</Text>}
        <Button title="Chỉnh chính sách mẫu" soft onPress={() => setEditing(product)} />
      </View>;
    })}
    {!!result.data && result.data.pagination.totalPages > 1 && <PageControls page={page} totalPages={result.data.pagination.totalPages} loading={result.isFetching} onChange={setPage} />}
    {editing && <SamplePolicy key={editing.id} item={editing} close={() => setEditing(null)} />}
  </>;
}
function SamplePolicy({ item, close }: { item: Item; close(): void }) {
  const [target, setTarget] = useState("");
  const variant = item.variants?.find(v => v.id === target);
  const [inherit, setInherit] = useState(false), [enabled, setEnabled] = useState(item.sampleEnabled), [quota, setQuota] = useState(String(item.sampleQuota));
  const command = useCommand();
  const granted = variant ? (inherit ? item.sampleGrantedCount : variant.sampleGrantedCount) : item.sampleGrantedCount;
  const quotaNumber = Number(quota);
  const valid = (Boolean(variant) && inherit) || (/^\d+$/.test(quota) && Number.isSafeInteger(quotaNumber) && quotaNumber >= granted && (!enabled || quotaNumber > 0));
  const select = (id: string) => {
    const v = item.variants?.find(row => row.id === id);
    setTarget(id); setInherit(Boolean(v && v.sampleEnabled == null && v.sampleQuota == null));
    setEnabled(v?.sampleEnabled ?? item.sampleEnabled); setQuota(String(v?.sampleQuota ?? item.sampleQuota));
  };
  return <BottomSheet title="Chính sách cấp mẫu" close={() => { if (!command.busy) close(); }}>
    <View style={s.row}><ProductPhoto uri={item.imageUrl} resizeMode="contain" style={s.photo} /><Text style={[s.name, s.flex]} numberOfLines={2}>{item.title}</Text></View>
    <Text style={s.tiny}>Áp dụng cho</Text>
    <View style={{ gap: 6 }}>{[{ id: "", name: "Chính sách chung sản phẩm" }, ...(item.variants || [])].map(option => <Pressable key={option.id} disabled={command.busy} accessibilityRole="radio" accessibilityState={{ checked: target === option.id }} onPress={() => select(option.id)} style={[s.pill, s.row, target === option.id && s.active]}><Text style={[s.note, s.flex]}>{option.name}</Text><Icon name={target === option.id ? "check-circle" : "circle"} size={17} color={c.strong} /></Pressable>)}</View>
    {!!variant && <View style={s.row}><Text style={[s.note, s.flex]}>Kế thừa chính sách chung</Text><Switch disabled={command.busy} value={inherit} onValueChange={value => { setInherit(value); if (value) { setEnabled(item.sampleEnabled); setQuota(String(item.sampleQuota)); } }} trackColor={{ true: c.brand, false: c.line }} /></View>}
    <View style={[s.row, s.soft]}><View style={s.flex}><Text style={s.name}>Cho phép KOL xin mẫu</Text><Text style={s.tiny}>Yêu cầu vẫn cần Shop xét duyệt.</Text></View><Switch value={enabled} disabled={command.busy || Boolean(variant && inherit)} onValueChange={setEnabled} trackColor={{ true: c.brand, false: c.line }} /></View>
    <Field label="Tổng hạn mức mẫu" value={quota} onChangeText={setQuota} keyboardType="number-pad" maxLength={9} editable={!command.busy && !(variant && inherit)} placeholder="VD: 10" />
    <Text style={s.tiny}>Đã duyệt {granted} suất · Hạn mức không được thấp hơn số đã duyệt.</Text>
    {!valid && <Text style={[s.note, { color: c.danger }]}>Nhập số nguyên hợp lệ; khi mở cấp mẫu, hạn mức phải lớn hơn 0.</Text>}
    <ErrorNotice error={command.error} />
    <View style={{ flexDirection: "row", gap: 8 }}><View style={{ flex: 1 }}><Button title="Hủy" secondary disabled={command.busy} onPress={close} /></View><View style={{ flex: 2 }}><Button title="Lưu chính sách" soft disabled={!valid || command.busy} loading={command.busy} onPress={() => void command.execute(variant ? `/products/${item.id}/variants/${variant.id}/sample-policy` : `/products/${item.id}`, variant ? "PATCH" : "PUT", variant ? inherit ? { inheritProductPolicy: true } : { inheritProductPolicy: false, sampleEnabled: enabled, sampleQuota: quotaNumber } : { sampleEnabled: enabled, sampleQuota: quotaNumber }, close)} /></View></View>
  </BottomSheet>;
}
