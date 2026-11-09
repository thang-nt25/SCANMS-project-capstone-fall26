import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useSuccessToast } from "../../components/SuccessToast";
import { z } from "zod";
import { ProductSchema } from "../../types/contracts";
import { Icon } from "../../components/commerce";
import { Button, ErrorNotice, Field } from "../../components/ui";
import { colors as c } from "../../theme/tokens";
import { AddressSchema } from "../customer/customer-contracts";
import { QueryState, useCommand, useResource } from "../common/shared";
import { SelectField } from "../common/SelectField";
import { MarketingProductPicker } from "../marketing/MarketingProductPicker";
import { useMobileNavigation } from "../../navigation/router";
import { CreateSample, Eligibility, Sample } from "./sample-contracts";
import { sampleStyles as s } from "./sample-styles";
import { SampleVariantPicker } from "./SampleVariantPicker";
import { SampleChannelPicker } from "./SampleChannelPicker";

export function SampleRequestForm({ initialProductId, initialSample, eligibility, done }: {
  initialProductId?: string;
  initialSample?: z.infer<typeof Sample>;
  eligibility?: z.infer<typeof Eligibility>;
  done(): void;
}) {
  const command = useCommand(), navigation = useMobileNavigation();
  const toast = useSuccessToast();
  const [productId, setProductId] = useState(initialProductId || "");
  const [variantId, setVariantId] = useState(initialSample?.productVariant?.id || "");
  const [addressId, setAddressId] = useState(initialSample ? "snapshot" : "");
  const [channel, setChannel] = useState(initialSample?.socialChannelId || initialSample?.socialChannel?.id || "");
  const [content, setContent] = useState(initialSample?.contentType || "");
  const [phoneConfirmed, setPhoneConfirmed] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const catalog = useResource("sample-products", "/sample-requests/my/catalog", z.object({ items: z.array(ProductSchema) }));
  const addresses = useResource("addresses", "/customer/addresses", z.array(AddressSchema));
  const detail = useResource("sample-product-detail", `/public/products/${encodeURIComponent(productId)}/landing`, z.object({ product: ProductSchema }), Boolean(productId) && !initialSample);
  const product = detail.data?.product || catalog.data?.items.find(item => item.id === productId);
  const selectedAddress = addresses.data?.find(item => item.id === addressId);
  const useSnapshot = addressId === "snapshot" && Boolean(initialSample);
  const recipientName = useSnapshot ? initialSample?.recipientName : selectedAddress?.fullName;
  const recipientPhone = useSnapshot ? initialSample?.recipientPhone : selectedAddress?.phoneNumber;
  const addressText = useSnapshot ? initialSample?.shippingAddress : selectedAddress ? [selectedAddress.detailAddress, selectedAddress.wardName, selectedAddress.districtName, selectedAddress.provinceName].join(", ") : "";
  const variants = product?.variants?.filter(item => item.isActive !== false && item.sampleAvailable !== false) || [];
  const variant = variants.find(item => item.id === variantId);
  const inCatalog = catalog.data?.items.some(item => item.id === productId) === true;
  const policyAvailable = inCatalog && product?.isActive !== false && (product?.variants?.length ? variant?.sampleAvailable === true : detail.data?.product.sampleAvailable === true);
  const schema = initialSample ? CreateSample.omit({ productId: true, productVariantId: true }) : CreateSample;
  const payload = {
    ...(!initialSample ? { productId, ...(variantId ? { productVariantId: variantId } : {}) } : {}),
    recipientName, recipientPhone, recipientPhoneConfirmed: phoneConfirmed, shippingAddress: addressText,
    ghnProvinceId: useSnapshot ? initialSample?.ghnProvinceId : Number(selectedAddress?.provinceCode),
    ghnDistrictId: useSnapshot ? initialSample?.ghnDistrictId : Number(selectedAddress?.districtCode),
    ghnWardCode: useSnapshot ? initialSample?.ghnWardCode : selectedAddress?.wardCode,
    socialChannelId: channel, contentType: content.trim(), termsAccepted: accepted,
  };
  const ready = schema.safeParse(payload).success && (Boolean(initialSample) || (eligibility?.canRequest && policyAvailable && !detail.isFetching));
  useEffect(() => {
    if (!addressId && addresses.data?.length) setAddressId((addresses.data.find(item => item.isDefault) || addresses.data[0]).id);
  }, [addresses.data, addressId]);
  useEffect(() => {
    if (!channel && eligibility?.channels.length === 1) setChannel(eligibility.channels[0].id);
  }, [eligibility, channel]);
  useEffect(() => {
    if (!variantId && variants.length === 1) setVariantId(variants[0].id);
  }, [variants, variantId]);
  const pickerProducts = catalog.data?.items || [];
  const close = () => { if (!command.busy) done(); };
  return <Modal visible animationType="slide" onRequestClose={close}>
    <StatusBar style="dark" />
    <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }}>
      <View style={[s.row, { paddingHorizontal: 16, paddingVertical: 7, backgroundColor: c.white, borderBottomWidth: 1, borderColor: c.line }]}>
        <View style={s.flex}><Text accessibilityRole="header" style={s.heading}>{initialSample ? "Cập nhật yêu cầu mẫu" : "Xin sản phẩm mẫu"}</Text><Text style={s.tiny}>Gửi Shop xét duyệt · chưa tự động cấp mẫu</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Đóng yêu cầu mẫu" disabled={command.busy} onPress={close} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}><Icon name="x" size={21} color={c.muted} /></Pressable>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 24 }}>
        <QueryState loading={catalog.isLoading || addresses.isLoading} error={catalog.error || addresses.error} retry={() => { void catalog.refetch(); void addresses.refetch(); }} />
        <View style={s.card}>
          <Step number="1" title="Sản phẩm muốn trải nghiệm" />
          <MarketingProductPicker showSampleQuota error={catalog.error} onRefresh={() => { void catalog.refetch(); if (productId) void detail.refetch(); }} label="Chọn sản phẩm mẫu" description="Chỉ mẫu Shop đã mở và còn suất · Cần Shop duyệt yêu cầu" pricePrefix="Giá bán: " emptyNote="Chưa có mẫu Shop đang mở và còn suất phù hợp. Sản phẩm đã xin hoặc đã nhận hoàn tất sẽ không hiện lại. Hãy cập nhật để kiểm tra suất mới." products={initialSample ? [initialSample.product] : pickerProducts} value={productId} onChange={value => { setProductId(value); setVariantId(""); }} disabled={command.busy || Boolean(initialSample)} loading={catalog.isLoading} />
          {Boolean(variants.length) && !initialSample && <SampleVariantPicker variants={variants} value={variantId} onChange={setVariantId} disabled={command.busy} productName={product?.title || "Sản phẩm mẫu"} productImage={product?.imageUrl} />}
          {initialSample?.productVariant && <Text style={s.note}>Phân loại: {initialSample.productVariant.name}</Text>}
          {productId && !initialSample && <>
            <ErrorNotice error={detail.error} retry={() => void detail.refetch()} />
            <Text style={s.note}>{detail.isFetching ? "Đang kiểm tra chính sách mẫu…" : detail.error || !detail.data ? "Chưa xác định được chính sách mẫu. Vui lòng thử lại." : policyAvailable ? `Đang nhận đăng ký${(variant?.sampleQuotaRemaining ?? product?.sampleQuotaRemaining) != null ? ` · Còn ${variant?.sampleQuotaRemaining ?? product?.sampleQuotaRemaining} suất theo dữ liệu hiện tại` : ""}` : "Mẫu hoặc phân loại này chưa mở đăng ký / đã hết hạn mức."}</Text>
          </>}
        </View>
        <View style={s.card}>
          <Step number="2" title="Thông tin nhận hàng" />
          <SelectField label="Địa chỉ nhận mẫu" hideLabel value={addressId} options={[...(initialSample ? [{ value: "snapshot", label: "Địa chỉ đã lưu trên yêu cầu" }] : []), ...(addresses.data || []).map(item => ({ value: item.id, label: `${item.fullName} · ${item.phoneNumber} · ${item.detailAddress}, ${item.wardName}, ${item.districtName}, ${item.provinceName}` }))]} onChange={value => { setAddressId(value); setPhoneConfirmed(false); }} disabled={command.busy} renderTrigger={open => <Pressable accessibilityRole="button" accessibilityLabel="Chọn địa chỉ nhận mẫu" onPress={open} disabled={command.busy} style={s.select}><Icon name="map-pin" size={19} color={c.strong} /><View style={s.flex}><Text style={s.name}>{recipientName ? `${recipientName} · ${recipientPhone || "Chưa có SĐT"}` : "Chọn địa chỉ nhận"}</Text><Text style={s.note}>{addressText || "Dùng địa chỉ và số điện thoại liên hệ được"}</Text></View><Icon name="chevron-right" size={17} color={c.muted} /></Pressable>} />
          <Pressable accessibilityRole="button" disabled={command.busy} onPress={() => { done(); navigation.navigate("Business", { feature: "addresses" }); }} style={{ minHeight: 38, justifyContent: "center", alignSelf: "flex-end" }}><Text style={s.link}>Quản lý sổ địa chỉ ↗</Text></Pressable>
          {addressId && (!Number.isInteger(payload.ghnProvinceId) || Number(payload.ghnProvinceId) <= 0 || !Number.isInteger(payload.ghnDistrictId) || Number(payload.ghnDistrictId) <= 0 || !payload.ghnWardCode) && <Text style={[s.note, { color: c.danger }]}>Địa chỉ thiếu mã giao hàng GHN. Hãy cập nhật trong sổ địa chỉ hoặc chọn địa chỉ khác.</Text>}
          <Check value={phoneConfirmed} disabled={command.busy || !recipientPhone} onChange={setPhoneConfirmed} label="Số điện thoại người nhận chính xác và liên hệ được." />
        </View>
        <View style={s.card}>
          <Step number="3" title="Kế hoạch video review" />
          <SampleChannelPicker value={channel} onChange={setChannel} disabled={command.busy} />
          <Field label="Nội dung dự kiến *" value={content} onChangeText={setContent} multiline maxLength={500} editable={!command.busy} placeholder="VD: Video review 60 giây về trải nghiệm, cách dùng và cảm nhận thực tế…" style={{ minHeight: 88, fontSize: 13, lineHeight: 19 }} />
          <Text style={[s.tiny, { textAlign: "right" }]}>{content.length}/500 ký tự</Text>
          <View style={s.soft}><View style={s.row}><Icon name="clock" size={17} color={c.strong} /><Text style={s.name}>Cam kết nộp video trong 14 ngày</Text></View><Text style={s.note}>Tính từ khi nhận mẫu. Hạn cụ thể được hiển thị trên yêu cầu sau giao nhận.</Text><Check value={accepted} disabled={command.busy} onChange={setAccepted} label="Tôi đồng ý cam kết và đăng video trên kênh đã chọn." /></View>
        </View>
        <ErrorNotice error={command.error} />
        {!initialSample && !eligibility?.canRequest && <ErrorNotice error={eligibility?.blockReason || "Cần KYC và kênh xã hội hợp lệ trước khi xin mẫu."} />}
      </ScrollView>
      <View style={{ padding: 12, gap: 7, backgroundColor: c.white, borderTopWidth: 1, borderColor: c.line }}>
        <Text style={s.tiny}>{ready ? "Thông tin sẵn sàng gửi Shop xét duyệt." : "Chọn mẫu, địa chỉ, kênh, nội dung và xác nhận 2 cam kết để gửi."}</Text>
        <Button title={initialSample ? "Lưu thay đổi" : "Gửi yêu cầu đến Shop"} secondary disabled={!ready} loading={command.busy} onPress={() => void command.execute(initialSample ? `/sample-requests/${initialSample.id}/details` : "/sample-requests", initialSample ? "PATCH" : "POST", () => schema.parse(payload), () => { done(); toast(initialSample ? "Đã cập nhật yêu cầu mẫu" : "Đã gửi yêu cầu mẫu, chờ Shop duyệt"); })} />
      </View>
    </SafeAreaView>
  </Modal>;
}
function Step({ number, title }: { number: string; title: string }) {
  return <View style={s.row}><Text style={s.step}>{number}</Text><Text style={s.heading}>{title}</Text></View>;
}
function Check({ value, onChange, label, disabled }: { value: boolean; onChange(value: boolean): void; label: string; disabled?: boolean }) {
  return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: value, disabled }} disabled={disabled} onPress={() => onChange(!value)} style={[s.row, { minHeight: 44, opacity: disabled ? 0.55 : 1 }]}><View style={[s.check, value && { backgroundColor: c.soft }]}>{value && <Icon name="check" size={14} color={c.strong} />}</View><Text style={[s.note, { flex: 1, color: c.ink }]}>{label}</Text></Pressable>;
}
