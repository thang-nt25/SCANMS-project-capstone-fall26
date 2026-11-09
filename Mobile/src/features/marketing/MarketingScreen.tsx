import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "../../components/commerce";
import { colors } from "../../theme/tokens";
import { ProductPhoto } from "../../components/ProductPhoto";
import { statusText } from "../../types/contracts";
import * as Clipboard from "expo-clipboard";
import { useSuccessToast } from "../../components/SuccessToast";
import { z } from "zod";
import {
  Button,
  Caption,
  Empty,
  ErrorNotice,
  PageControls,
  Screen,
} from "../../components/ui";
import { environment } from "../../config/environment";
import { tokenSession } from "../../services/api";
import {
  ActionForm,
  QueryState,
  Sheet,
  confirmAction,
  required,
  useCommand,
  useResource,
} from "../common/shared";
import { MarketingProductPicker } from "./MarketingProductPicker";
import { amount } from "../common/validation";
import { shareExport } from "../../services/exports";
import type { BusinessParams } from "../workspace/policy";
const LinkSchema = z.object({
  id: z.string(),
  label: z.string().nullish(),
  shortUrl: z.string(),
  status: z.string(),
  totalClicks: z.number(),
  uniqueClicks: z.number(),
  totalOrders: z.number(),
  commissionRate: z.number().nullish(),
  product: z.object({ title: z.string(), imageUrl: z.string().nullish(), store: z.object({ name: z.string() }).nullish() }),
});
const Links = z.object({
  data: z.array(LinkSchema),
  meta: z.object({ totalPages: z.number() }),
});
const platforms = [
  "TIKTOK",
  "FACEBOOK",
  "YOUTUBE",
  "INSTAGRAM",
  "ZALO",
  "OTHER",
] as const;
export function MarketingScreen({ params, onScrollOffset }: { params: BusinessParams; onScrollOffset?: (offset: number) => void }) {
  const showSuccess = useSuccessToast();
  const [page, setPage] = useState(1),
    [productId, setProductId] = useState(params.productId || ""),
    [create, setCreate] = useState(false),
    [qr, setQr] = useState<string | null>(null),
    [qrError, setQrError] = useState("");
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  useEffect(() => {
    if (!copiedLink) return;
    const timer = setTimeout(() => setCopiedLink(null), 3000);
    return () => clearTimeout(timer);
  }, [copiedLink]);
  const [menu, setMenu] = useState<z.infer<typeof LinkSchema> | null>(null);
  const command = useCommand(),
    links = useResource(
      "links",
      `/collaborator/referral-links?page=${page}&limit=20`,
      Links,
    );
  const products = useResource(
    "eligible-products",
    "/collaborator/referral-links/products?limit=100&page=1",
    z.array(z.object({ id: z.string(), title: z.string(), imageUrl: z.string().nullish(), price: amount.nullish(), estimatedCommissionRate: z.number().nullish(), store: z.object({ name: z.string() }).nullish() })),
  );
  const selectedProduct = products.data?.find(item => item.id === productId);
  const canCreate = Boolean(selectedProduct) && !products.isFetching && !command.busy;
  return (
    <Screen scroll onScrollOffset={onScrollOffset}>
      <View style={styles.createCard}>
      <Text style={styles.heading}>Tạo liên kết mới</Text>
      <MarketingProductPicker
        value={productId}
        products={products.data || []}
        onChange={setProductId}
        disabled={products.isLoading || command.busy}
        loading={products.isLoading}
      />
      <Pressable accessibilityRole="button" accessibilityLabel="Tạo link tiếp thị" accessibilityState={{ disabled: !canCreate }} disabled={!canCreate} onPress={() => setCreate(true)} style={[styles.createButton, !canCreate && styles.disabledButton]}>
        <Icon name="link" size={18} color={canCreate ? colors.ink : colors.muted} />
        <Text style={[styles.createText, !canCreate && styles.disabledText]}>Tạo link tiếp thị</Text>
      </Pressable>
      {!selectedProduct && !products.isLoading && <Text style={styles.hint}>Chọn sản phẩm để tiếp tục.</Text>}
      </View>
      <QueryState
        loading={links.isLoading || products.isLoading}
        error={links.error || products.error}
        retry={() => {
          void links.refetch();
          void products.refetch();
        }}
      />
      <ErrorNotice error={command.error} />
      {links.data?.data.length === 0 && <Empty />}
      {links.data?.data.map((item) => (
        <View key={item.id} style={styles.linkCard}>
          <View style={styles.linkTop}>
            <ProductPhoto uri={item.product.imageUrl} resizeMode="contain" style={styles.photo} />
            <View style={styles.productText}>
              <Text numberOfLines={2} style={styles.productName}>{item.product.title}</Text>
              {item.product.store?.name && <Text numberOfLines={1} style={styles.caption}>{item.product.store.name}</Text>}
              <Text style={styles.status}>{statusText(item.status)}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Quản lý link ${item.product.title}`} onPress={() => setMenu(item)} style={styles.more}><Icon name="more-horizontal" size={20} /></Pressable>
          </View>
          {item.label && <Text numberOfLines={1} style={styles.linkLabel}>{item.label.replace(/_/g, " ")}</Text>}
          <View style={styles.stats}>
            <LinkStat value={item.totalClicks} label="Lượt nhấp" />
            <LinkStat value={item.uniqueClicks} label="Duy nhất" />
            <LinkStat value={item.totalOrders} label="Đơn hàng" />
          </View>
          <View style={styles.urlRow}><Icon name="link" size={13} color={colors.muted} /><Text selectable numberOfLines={1} style={styles.url}>{item.shortUrl}</Text></View>
          <View style={styles.linkActions}>
            <Pressable accessibilityRole="button" disabled={command.busy} onPress={() => void command.run(async () => {
              const copied = await Clipboard.setStringAsync(item.shortUrl);
              if (!copied) throw new Error("Chưa sao chép được liên kết. Hãy thử lại.");
              setCopiedLink(item.id);
              showSuccess("Sao chép liên kết thành công");
            })} style={[styles.smallAction, styles.copyAction]}><Icon name={copiedLink === item.id ? "check" : "copy"} size={16} color={colors.strong} /><Text style={styles.actionLabel}>{copiedLink === item.id ? "Đã sao chép" : "Sao chép link"}</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => { setQrError(""); setQr(item.id); }} style={styles.smallAction}><Icon name="grid" size={16} color={colors.strong} /><Text style={styles.actionLabel}>Mã QR</Text></Pressable>
          </View>
        </View>
      ))}
      <PageControls
        page={page}
        totalPages={links.data?.meta.totalPages || 1}
        loading={links.isFetching}
        onChange={setPage}
      />
      {menu && <Sheet title="Quản lý liên kết" close={() => setMenu(null)}>
        <Text style={styles.productName}>{menu.product.title}</Text>
        <Text selectable>{menu.shortUrl}</Text>
        <Button title={menu.status === "ACTIVE" ? "Tạm dừng link" : "Kích hoạt link"} secondary disabled={command.busy || !["ACTIVE", "PAUSED"].includes(menu.status)} onPress={() => void command.execute(`/collaborator/referral-links/${menu.id}/status`, "PATCH", { status: menu.status === "ACTIVE" ? "PAUSED" : "ACTIVE" }, () => setMenu(null))} />
        <Button title="Xóa link" danger disabled={command.busy} onPress={() => confirmAction("Xóa link tiếp thị?", "Link đã chia sẻ sẽ không tiếp tục hoạt động.", () => void command.execute(`/collaborator/referral-links/${menu.id}`, "DELETE", undefined, () => setMenu(null)))} />
        <ErrorNotice error={command.error} />
      </Sheet>}
      {create && (
        <ActionForm
          title="Tạo link tiếp thị"
          fields={[
            { key: "label", label: "Tên gợi nhớ" },
            {
              key: "channel",
              label: "Kênh chia sẻ",
              options: platforms.map((value) => ({ value, label: value })),
            },
          ]}
          schema={z
            .object({ label: required.max(150), channel: z.enum(platforms) })
            .transform((body) => ({ ...body, productId }))}
          submit={(body) =>
            command.execute("/collaborator/referral-links", "POST", body, () => {
              setCreate(false);
              showSuccess("Tạo liên kết tiếp thị thành công");
            })
          }
          busy={command.busy}
          error={command.error}
          close={() => setCreate(false)}
        />
      )}
      {qr && (
        <Sheet title="Mã QR tiếp thị" close={() => setQr(null)}>
          <Image
            source={{
              uri: `${environment.apiUrl}/collaborator/referral-links/${qr}/qr?format=png&size=512`,
              headers: { Authorization: `Bearer ${tokenSession.get() || ""}` },
            }}
            style={{ width: "100%", aspectRatio: 1 }}
            resizeMode="contain"
            onError={() =>
              setQrError("Chưa tải được ảnh QR. Hãy đóng và thử lại.")
            }
          />
          <ErrorNotice error={qrError} />
          <Caption>Mã QR trỏ tới link tiếp thị do hệ thống quản lý.</Caption>
          <Button
            title="Lưu / chia sẻ ảnh PNG"
            secondary
            loading={command.busy}
            onPress={() =>
              void command.run(() =>
                shareExport(
                  `/collaborator/referral-links/${qr}/qr?format=png&size=1024&download=true`,
                  `SCANMS-QR-${qr}.png`,
                  "image/png",
                ),
              )
            }
          />
          <ErrorNotice error={command.error} />
        </Sheet>
      )}
    </Screen>
  );
}

function LinkStat({ value, label }: { value: number; label: string }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value.toLocaleString("vi-VN")}</Text><Text style={styles.caption}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  copiedAction: { backgroundColor: colors.soft, borderColor: colors.strong },
  linkCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 12, gap: 9 },
  linkTop: { flexDirection: "row", alignItems: "center", gap: 9 },
  photo: { width: 54, height: 62, borderRadius: 9, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  more: { width: 36, height: 44, alignItems: "center", justifyContent: "center" },
  status: { fontSize: 10, color: colors.strong, marginTop: 2 },
  linkLabel: { fontSize: 10, color: colors.muted },
  stats: { flexDirection: "row", backgroundColor: colors.canvas, borderRadius: 10, paddingVertical: 8 },
  stat: { flex: 1, alignItems: "center", gap: 3 },
  statValue: { fontSize: 14, fontWeight: "700", color: colors.ink },
  urlRow: { width: "100%", alignSelf: "stretch", minHeight: 44, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: colors.canvas },
  url: { flex: 1, minWidth: 0, fontSize: 12, color: colors.muted },
  linkActions: { flexDirection: "row", gap: 8 },
  smallAction: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: colors.line, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  copyAction: { backgroundColor: colors.soft, borderColor: colors.brandBorder },
  actionLabel: { fontSize: 12, fontWeight: "600", color: colors.ink },
  createCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 12, gap: 10 },
  heading: { fontSize: 14, fontWeight: "700", color: colors.ink },
  selector: { minHeight: 64, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  productIcon: { width: 36, height: 36, backgroundColor: colors.soft, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  productText: { flex: 1, gap: 3 },
  caption: { fontSize: 10, color: colors.muted },
  productName: { fontSize: 13, lineHeight: 18, fontWeight: "600", color: colors.ink },
  createButton: { minHeight: 48, borderWidth: 1, borderColor: colors.brandBorder, borderRadius: 12, backgroundColor: colors.soft, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  disabledButton: { backgroundColor: colors.canvas, borderColor: colors.line },
  createText: { fontSize: 13, fontWeight: "700", color: colors.ink },
  disabledText: { color: colors.muted },
  hint: { fontSize: 11, color: colors.muted, textAlign: "center" },
});
