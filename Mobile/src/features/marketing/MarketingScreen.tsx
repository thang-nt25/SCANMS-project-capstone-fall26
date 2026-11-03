import { useState } from "react";
import { Image, Text } from "react-native";
import * as Clipboard from "expo-clipboard";
import { z } from "zod";
import {
  Badge,
  Button,
  Caption,
  Card,
  Empty,
  ErrorNotice,
  PageControls,
  Screen,
  Title,
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
import { SelectField } from "../common/SelectField";
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
  product: z.object({ title: z.string() }),
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
export function MarketingScreen({ params }: { params: BusinessParams }) {
  const [page, setPage] = useState(1),
    [productId, setProductId] = useState(params.productId || ""),
    [create, setCreate] = useState(false),
    [qr, setQr] = useState<string | null>(null),
    [qrError, setQrError] = useState("");
  const command = useCommand(),
    links = useResource(
      "links",
      `/collaborator/referral-links?page=${page}&limit=20`,
      Links,
    );
  const products = useResource(
    "eligible-products",
    "/collaborator/referral-links/products?limit=100&page=1",
    z.array(z.object({ id: z.string(), title: z.string() })),
  );
  return (
    <Screen scroll>
      <Title>Link tiếp thị & QR</Title>
      <Caption>
        Liên kết do backend cấp, dùng chung attribution với web.
      </Caption>
      <SelectField
        label="Sản phẩm tiếp thị"
        value={productId}
        options={(products.data || []).map((item) => ({
          value: item.id,
          label: item.title,
        }))}
        onChange={setProductId}
      />
      <Button
        title="Tạo link tiếp thị"
        disabled={!productId}
        onPress={() => setCreate(true)}
      />
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
        <Card key={item.id}>
          <Title>{item.label || item.product.title}</Title>
          <Badge>{item.status}</Badge>
          <Text selectable>{item.shortUrl}</Text>
          <Caption>
            {item.totalClicks} lượt nhấp · {item.uniqueClicks} lượt riêng biệt ·{" "}
            {item.totalOrders} đơn
          </Caption>
          <Button
            title="Sao chép link"
            secondary
            loading={command.busy}
            onPress={() =>
              void command.run(() => Clipboard.setStringAsync(item.shortUrl))
            }
          />
          <Button
            title="Xem QR động"
            secondary
            onPress={() => {
              setQrError("");
              setQr(item.id);
            }}
          />
          <Button
            title={
              item.status === "ACTIVE" ? "Tạm dừng link" : "Kích hoạt link"
            }
            secondary
            disabled={command.busy}
            onPress={() =>
              void command.execute(
                `/collaborator/referral-links/${item.id}/status`,
                "PATCH",
                { status: item.status === "ACTIVE" ? "PAUSED" : "ACTIVE" },
              )
            }
          />
          <Button
            title="Xóa link"
            danger
            disabled={command.busy}
            onPress={() =>
              confirmAction(
                "Xóa link tiếp thị?",
                "Link đã chia sẻ sẽ không tiếp tục hoạt động.",
                () =>
                  void command.execute(
                    `/collaborator/referral-links/${item.id}`,
                    "DELETE",
                  ),
              )
            }
          />
        </Card>
      ))}
      <PageControls
        page={page}
        totalPages={links.data?.meta.totalPages || 1}
        loading={links.isFetching}
        onChange={setPage}
      />
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
            command.execute("/collaborator/referral-links", "POST", body, () =>
              setCreate(false),
            )
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
