import { CustomerOrderDetailScreen } from "../orders/CustomerOrderDetailScreen";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useNavigation } from "expo-router";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";
import type { ScreenProps } from "../../navigation/router";
import { api } from "../../services/api";
import { ApiError } from "../../services/api/client";
import { ProductPhoto } from "../../components/ProductPhoto";
import {
  Badge,
  Button,
  Caption,
  Card,
  ErrorNotice,
  Field,
  Loading,
} from "../../components/ui";
import { Icon, SectionHeading } from "../../components/commerce";
import { InfoLine } from "../../components/RecordList";
import { colors } from "../../theme/tokens";
import { money } from "../../types/contracts";
import { useAuth } from "../auth/AuthProvider";
import { AddressSchema } from "../customer/customer-contracts";
import { useOperation } from "../../hooks/useOperation";
import { useResource } from "../common/shared";
import {
  CheckoutAddressPicker,
  CheckoutAmountRow,
  CheckoutDisclosure,
  CheckoutPaymentMethods,
} from "./CheckoutPanels";
import { WalletSummarySchema } from "../wallets/wallet-contracts";
import { PurchaseCoordinator, quotePurchase } from "./checkout-service";
import {
  CreatedPurchase,
  PurchaseAttempt,
  PurchaseInput,
  buyNowSelection,
  deliveryAddress,
} from "./checkout-contracts";

const Policies = z.object({
  policyReturn: z.string().nullish(),
  policyWarranty: z.string().nullish(),
  policyShipping: z.string().nullish(),
});
const plain = (value?: string | null) =>
  value?.replace(/<[^>]+>/g, " ").trim() ||
  "Gian hàng chưa cập nhật; vui lòng liên hệ Shop để xác nhận.";

export function CheckoutScreen({ route, navigation }: ScreenProps<"Checkout">) {
  const { session } = useAuth();
  const user = session!.user,
    product = route.params.product;
  const operation = useOperation(),
    client = useQueryClient(),
    router = useRouter(),
    stack = useNavigation(),
    insets = useSafeAreaInsets();
  const [addressPickerOpen, setAddressPickerOpen] = useState(false);
  const [addressId, setAddressId] = useState(""),
    [method, setMethod] = useState<"PAYOS" | "WALLET">("PAYOS");
  const [couponDraft, setCouponDraft] = useState(""),
    [couponCode, setCouponCode] = useState(""),
    [notes, setNotes] = useState("");
  const [accepted, setAccepted] = useState(false),
    [restoring, setRestoring] = useState(true),
    [restoreError, setRestoreError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState<PurchaseAttempt | null>(null),
    [created, setCreated] = useState<CreatedPurchase | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  useEffect(() => {
    stack.setOptions({ title: created ? "Thông tin đơn hàng" : "Thanh toán" });
  }, [stack, created]);
  const storeId = product.storeId || product.store?.id || "";
  const coordinator = useMemo(() => {
    const key = `scanms.purchase.${user.id}.${product.id}`;
    return new PurchaseCoordinator(api, {
      get: () => SecureStore.getItemAsync(key),
      set: (value) => SecureStore.setItemAsync(key, value),
      remove: () => SecureStore.deleteItemAsync(key),
    });
  }, [user.id, product.id]);
  useEffect(() => {
    let active = true;
    coordinator
      .restore()
      .then((saved) => {
        if (active) {
          setAttempt(saved);
          setCreated(saved?.result || null);
        }
      })
      .catch((error: unknown) => {
        if (active) setRestoreError(error);
      })
      .finally(() => {
        if (active) setRestoring(false);
      });
    return () => {
      active = false;
    };
  }, [coordinator]);

  const addresses = useResource(
    "addresses",
    "/customer/addresses",
    z.array(AddressSchema),
  );
  const wallet = useResource("wallet", "/wallets/me", WalletSummarySchema);
  const policies = useResource(
    "checkout-policy",
    `/stores/public/id/${encodeURIComponent(storeId)}`,
    Policies,
    Boolean(storeId),
  );
  const payos = useResource(
    "payos-availability",
    "/orders/payos/availability",
    z.object({ available: z.boolean() }),
  );
  const address =
    addresses.data?.find((item) => item.id === addressId) ||
    addresses.data?.find((item) => item.isDefault) ||
    addresses.data?.[0];
  let selectionError: unknown = null;
  let line: ReturnType<typeof buyNowSelection> | undefined,
    shippingAddress = "";
  try {
    line = buyNowSelection(
      product,
      route.params.variantId,
      route.params.quantity,
    );
    if (address) shippingAddress = deliveryAddress(address);
  } catch (error) {
    selectionError = error;
  }
  const quote = useQuery({
    queryKey: [
      user.id,
      "buy-now-quote",
      line,
      storeId,
      shippingAddress,
      address?.phoneNumber,
      couponCode,
    ],
    queryFn: ({ signal }) =>
      quotePurchase(
        api,
        {
          line: line!,
          storeId,
          address: shippingAddress,
          phone: address!.phoneNumber,
          couponCode,
        },
        signal,
      ),
    enabled:
      !restoring && !attempt && Boolean(line && shippingAddress && storeId),
    retry: false,
    staleTime: 15000,
  });
  const submitting = operation.busy;
  const submit = () =>
    void operation.run(async () => {
      let payload = attempt?.payload;
      if (!payload) {
        if (
          !address ||
          !line ||
          !quote.data ||
          !accepted ||
          !policies.data ||
          policies.error
        )
          throw new Error(
            "Kiểm tra địa chỉ, phí giao hàng và chính sách trước khi đặt.",
          );
        const latest = await quote.refetch();
        if (latest.error || !latest.data)
          throw latest.error || new Error("Chưa xác nhận được phí giao hàng.");
        if (
          latest.data.total !== quote.data.total ||
          latest.data.couponCode !== quote.data.couponCode
        )
          throw new Error(
            "Giá hoặc ưu đãi vừa thay đổi. Vui lòng kiểm tra tổng tiền mới rồi đặt lại.",
          );
        if (method === "PAYOS" && !payos.data?.available)
          throw new Error("PayOS chưa sẵn sàng. Chọn phương thức khác.");
        payload = PurchaseInput.parse({
          storeId,
          customerName: address.fullName,
          customerPhone: address.phoneNumber,
          shippingAddress,
          paymentMethod: method,
          policyAccepted: true,
          couponCode: latest.data.couponCode,
          orderNotes: notes.trim() || undefined,
          idempotencyKey: Crypto.randomUUID(),
          items: [line],
        });
        setAttempt({ payload });
      }
      setCanEdit(false);
      try {
        const result = await coordinator.submit(payload);
        setCreated(result);
        setAttempt({ payload, result });
        await client.invalidateQueries({ queryKey: [user.id] });
      } catch (error) {
        // Validation/authorization failures cannot create an order. Network/5xx/409 outcomes
        // keep the frozen payload; retrying uses the stored key, including after reopening.
        setCanEdit(
          error instanceof ApiError &&
            [400, 401, 403, 404, 422].includes(error.status) &&
            !error.unknownOutcome,
        );
        throw error;
      }
    });
  const reset = () =>
    void operation.run(async () => {
      await coordinator.clear();
      setAttempt(null);
      setCreated(null);
      setCanEdit(false);
      setAccepted(false);
      await quote.refetch();
    });
  const viewOrders = () => router.navigate("/(private)/(tabs)/orders");
  if (restoring) return <Loading />;
  if (restoreError)
    return (
      <View style={styles.content}>
        <ErrorNotice error={restoreError} />
        <Caption>
          Chưa đọc được lần đặt hàng trước. Mở lại màn hình để tránh đặt trùng.
        </Caption>
      </View>
    );
  if (created)
    return (
      <CustomerOrderDetailScreen
        route={{ params: { publicOrderCode: created.publicOrderCode } }}
        navigation={navigation}
        onNewPurchase={reset}
      />
    );
  if (attempt)
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={{ padding: 14, gap: 12 }}>
          <SectionHeading title="Kiểm tra lần đặt hàng" />
          <Caption>
            Nếu kết nối bị gián đoạn, thử lại bằng cùng mã đặt để lấy kết quả;
            hệ thống không tạo đơn thứ hai.
          </Caption>
          <InfoLine label="Sản phẩm" value={product.title} />
          <InfoLine
            label="Số lượng"
            value={String(attempt.payload.items[0].quantity)}
          />
          <InfoLine
            label="Người nhận"
            value={`${attempt.payload.customerName} · ${attempt.payload.customerPhone}`}
          />
          <Caption>{attempt.payload.shippingAddress}</Caption>
          <ErrorNotice error={operation.error} />
          <Button
            title="Kiểm tra / Thử lại cùng đơn"
            loading={submitting}
            onPress={submit}
          />
          {canEdit && (
            <Button
              title="Chỉnh lại thông tin"
              secondary
              disabled={submitting}
              onPress={reset}
            />
          )}
          <Button
            title="Xem đơn mua"
            secondary
            disabled={submitting}
            onPress={viewOrders}
          />
        </Card>
      </ScrollView>
    );
  const variant = product.variants?.find(
    (item) => item.id === route.params.variantId,
  );
  const ready = Boolean(
    address &&
    line &&
    quote.data &&
    !quote.error &&
    !quote.isFetching &&
    accepted &&
    policies.data &&
    !policies.error &&
    !submitting &&
    (method !== "PAYOS" || payos.data?.available),
  );
  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.panel}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Thay đổi địa chỉ nhận hàng"
            disabled={submitting}
            onPress={() =>
              addresses.data?.length
                ? setAddressPickerOpen(true)
                : navigation.navigate("Business", { feature: "addresses" })
            }
            style={styles.addressRow}
          >
            <Icon name="map-pin" size={19} color={colors.strong} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.heading}>Địa chỉ nhận hàng</Text>
              {address ? (
                <>
                  <Text style={styles.recipient}>
                    {address.fullName} · {address.phoneNumber}
                  </Text>
                  <Text numberOfLines={2} style={styles.small}>
                    {shippingAddress ||
                      "Địa chỉ chưa đầy đủ. Vui lòng cập nhật."}
                  </Text>
                </>
              ) : (
                <Text style={styles.small}>
                  {addresses.isLoading
                    ? "Đang tải địa chỉ…"
                    : "Thêm địa chỉ để nhận hàng"}
                </Text>
              )}
            </View>
            <View style={{ alignItems: "center", gap: 4 }}>
              <Text style={styles.link}>Thay đổi</Text>
              <Icon name="chevron-right" size={16} color={colors.muted} />
            </View>
          </Pressable>
          <ErrorNotice
            error={addresses.error}
            retry={() => void addresses.refetch()}
          />
        </View>
        <View style={[styles.panel, styles.inset]}>
          <View style={styles.row}>
            <Icon name="shopping-bag" size={15} color={colors.strong} />
            <Text numberOfLines={1} style={styles.heading}>
              {product.store?.name || "Gian hàng SCANMS"}
            </Text>
          </View>
          <View style={styles.productRow}>
            <ProductPhoto
              uri={variant?.imageUrl || product.imageUrl}
              style={styles.photo}
            />
            <View style={{ flex: 1, gap: 4 }}>
              <Text numberOfLines={2} style={styles.productTitle}>
                {product.title}
              </Text>
              {!!variant?.name && (
                <Text numberOfLines={1} style={styles.small}>
                  {variant.name}
                </Text>
              )}
              <View style={styles.priceRow}>
                <Text style={styles.unitPrice}>
                  {money(
                    quote.data
                      ? quote.data.subtotal / route.params.quantity
                      : (variant?.price ?? product.price),
                  )}
                </Text>
                <Text style={styles.small}>×{route.params.quantity}</Text>
              </View>
            </View>
          </View>
          <ErrorNotice error={selectionError} />
        </View>
        <CheckoutDisclosure
          title="Mã KOL & ghi chú"
          icon="tag"
          summary={
            [quote.data?.couponCode, notes.trim() ? "Có ghi chú" : ""]
              .filter(Boolean)
              .join(" · ") || "Thêm mã / lời nhắn"
          }
          disabled={submitting}
        >
          <Field
            label="Mã ưu đãi KOL"
            placeholder="Nhập mã bạn đã sao chép"
            value={couponDraft}
            onChangeText={setCouponDraft}
            autoCapitalize="characters"
            maxLength={100}
            editable={!submitting}
          />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Button
                title="Áp dụng"
                secondary
                disabled={!couponDraft.trim() || submitting || quote.isFetching}
                onPress={() => setCouponCode(couponDraft.trim().toUpperCase())}
              />
            </View>
            {!!couponCode && (
              <View style={{ flex: 1 }}>
                <Button
                  title="Bỏ mã"
                  secondary
                  disabled={submitting}
                  onPress={() => {
                    setCouponCode("");
                    setCouponDraft("");
                  }}
                />
              </View>
            )}
          </View>
          {quote.data?.couponCode && (
            <Badge>Đã áp dụng {quote.data.couponCode}</Badge>
          )}
          <Field
            label="Ghi chú cho Shop"
            placeholder="Lời nhắn về đơn hàng (nếu có)"
            value={notes}
            onChangeText={setNotes}
            maxLength={500}
            editable={!submitting}
          />
        </CheckoutDisclosure>
        <View style={[styles.panel, styles.inset]}>
          <Text style={styles.heading}>Phương thức thanh toán</Text>
          <CheckoutPaymentMethods
            value={method}
            onChange={setMethod}
            balance={wallet.data?.availableBalance}
            total={quote.data?.total}
            walletError={!!wallet.error}
            payosAvailable={payos.data?.available}
            disabled={submitting}
            onTopUp={() =>
              navigation.navigate("Business", { feature: "wallet" })
            }
          />
          {method === "WALLET" && (
            <ErrorNotice
              error={wallet.error}
              retry={() => void wallet.refetch()}
            />
          )}
          {method === "PAYOS" && (
            <ErrorNotice
              error={payos.error}
              retry={() => void payos.refetch()}
            />
          )}
        </View>
        <View style={[styles.panel, styles.inset, { gap: 3 }]}>
          <CheckoutAmountRow
            label="Tiền hàng"
            value={quote.data ? money(quote.data.subtotal) : "—"}
          />
          {!!quote.data?.discount && (
            <CheckoutAmountRow
              label="Giảm từ mã KOL"
              value={"−" + money(quote.data.discount)}
            />
          )}
          <CheckoutAmountRow
            label="Phí vận chuyển GHN"
            value={quote.data ? money(quote.data.shippingFee) : "—"}
          />
          {quote.isFetching && (
            <Text style={styles.small}>Đang kiểm tra giá và cước GHN…</Text>
          )}
          <ErrorNotice error={quote.error} retry={() => void quote.refetch()} />
        </View>
        <CheckoutDisclosure title="Chính sách gian hàng" icon="shield">
          <ErrorNotice
            error={policies.error}
            retry={() => void policies.refetch()}
          />
          <Caption>Đổi trả: {plain(policies.data?.policyReturn)}</Caption>
          <Caption>Bảo hành: {plain(policies.data?.policyWarranty)}</Caption>
          <Caption>Giao hàng: {plain(policies.data?.policyShipping)}</Caption>
        </CheckoutDisclosure>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted, disabled: submitting }}
          disabled={submitting}
          onPress={() => setAccepted(!accepted)}
          style={styles.agreementRow}
        >
          <Icon
            name={accepted ? "check-square" : "square"}
            size={20}
            color={colors.strong}
          />
          <Text style={styles.agreement}>
            Tôi đồng ý chính sách đổi trả và bảo hành của gian hàng.
          </Text>
        </Pressable>
        <ErrorNotice error={operation.error} />
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.small}>Tổng thanh toán</Text>
          <Text style={styles.total}>
            {quote.data ? money(quote.data.total) : "—"}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Button
            title={method === "WALLET" ? "Thanh toán ví" : "Đặt hàng"}
            disabled={
              !ready ||
              (method === "WALLET" &&
                (!wallet.data ||
                  !!wallet.error ||
                  Number(wallet.data.availableBalance) <
                    (quote.data?.total || 0)))
            }
            loading={submitting}
            onPress={submit}
          />
        </View>
      </View>
      {addressPickerOpen && (
        <CheckoutAddressPicker
          addresses={addresses.data || []}
          selected={address?.id}
          onSelect={setAddressId}
          close={() => setAddressPickerOpen(false)}
          onManage={() =>
            navigation.navigate("Business", { feature: "addresses" })
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 10, gap: 8, backgroundColor: colors.canvas },
  panel: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    overflow: "hidden",
  },
  inset: { padding: 12, gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    minHeight: 92,
  },
  recipient: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 17,
  },
  heading: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    flexShrink: 1,
  },
  link: { color: colors.strong, fontSize: 11, fontWeight: "600" },
  small: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  productRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  photo: { width: 58, height: 58, borderRadius: 8 },
  productTitle: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
  },
  title: { color: colors.ink, fontSize: 14, fontWeight: "600", lineHeight: 20 },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  unitPrice: { color: colors.strong, fontWeight: "600", fontSize: 13 },
  agreementRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    paddingHorizontal: 2,
    gap: 8,
  },
  agreement: { flex: 1, color: colors.muted, fontSize: 11, lineHeight: 16 },
  footer: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    padding: 10,
    backgroundColor: colors.white,
    borderTopColor: colors.line,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  total: {
    color: colors.strong,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 2,
  },
});
