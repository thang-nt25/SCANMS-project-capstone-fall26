import { ExpandableRecord, FilterTabs } from "../../components/RecordList";
import { floorPriceInput, promotionReviewInput } from "./pricing-inputs";
import { useState } from "react";
import { Text } from "react-native";
import { z } from "zod";
import {
  Badge,
  Button,
  Caption,
  Empty,
  ErrorNotice,
  Screen,
} from "../../components/ui";
import { money, statusText } from "../../types/contracts";
import {
  CompactCommandForm as CommandForm,
  QueryState,
  amount,
  required,
  useActor,
  useCommand,
  useResource,
  type CommandFormSpec,
} from "../common/shared";
const Product = z.object({
  id: z.string(),
  title: z.string(),
  price: amount,
  listPrice: amount.nullish(),
  floorPrice: amount.nullish(),
  store: z.object({ name: z.string() }),
  variants: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      price: amount.nullish(),
      floorPrice: amount.nullish(),
    }),
  ),
});
const Promotion = z.object({
  id: z.string(),
  status: z.string(),
  proposedPrice: amount,
  budgetTotal: amount,
  reason: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
  product: z.object({ title: z.string() }),
  store: z.object({ name: z.string() }),
});
export function PricingScreen() {
  const [tab, setTab] = useState("catalog");
  const { reviewer } = useActor(),
    command = useCommand(),
    [form, setForm] = useState<CommandFormSpec | null>(null);
  const catalog = useResource("pricing", "/pricing/catalog", z.array(Product)),
    promotions = useResource(
      "promotions",
      "/pricing/promotions",
      z.array(Promotion),
    );
  const floor = (item: z.infer<typeof Product>) =>
    setForm({
      title: "Cấu hình giá sàn MAP",
      path: `/pricing/products/${item.id}/floor`,
      method: "PUT",
      fields: [
        {
          key: "floorPrice",
          label: "Giá sàn chung (VNĐ)",
          initial: String(item.floorPrice || ""),
          numeric: true,
        },
        ...item.variants.map((variant) => ({
          key: variant.id,
          label: `MAP · ${variant.name}`,
          initial: String(variant.floorPrice ?? item.floorPrice ?? ""),
          numeric: true,
        })),
        {
          key: "reason",
          label: "Lý do thay đổi (ít nhất 10 ký tự)",
          multiline: true,
        },
      ],
      schema: floorPriceInput(item.variants.map((variant) => variant.id)),
    });
  const promotion = (item: z.infer<typeof Product>) =>
    setForm({
      title: "Đề xuất khuyến mãi",
      path: "/pricing/promotions",
      method: "POST",
      fields: [
        {
          key: "variantId",
          label: "Phạm vi",
          initial: "",
          options: [
            { value: "", label: "Toàn sản phẩm" },
            ...item.variants.map((variant) => ({
              value: variant.id,
              label: variant.name,
            })),
          ],
        },
        { key: "proposedPrice", label: "Giá sau giảm (VNĐ)", numeric: true },
        { key: "budgetTotal", label: "Ngân sách (VNĐ)", numeric: true },
        {
          key: "startsAt",
          label: "Bắt đầu (ISO có múi giờ)",
          initial: new Date(Date.now() + 600000).toISOString(),
        },
        {
          key: "endsAt",
          label: "Kết thúc (ISO có múi giờ)",
          initial: new Date(Date.now() + 86400000).toISOString(),
        },
        { key: "reason", label: "Lý do", multiline: true },
      ],
      schema: z
        .object({
          variantId: z.string(),
          proposedPrice: z.coerce.number().positive().max(1e12),
          budgetTotal: z.coerce.number().positive().max(1e12),
          startsAt: z.string().datetime({ offset: true }),
          endsAt: z.string().datetime({ offset: true }),
          reason: required.min(10).max(1000),
        })
        .refine(
          (body) => Date.parse(body.endsAt) > Date.parse(body.startsAt),
          "Ngày kết thúc phải sau ngày bắt đầu.",
        )
        .transform((body) => ({
          ...body,
          variantId: body.variantId || undefined,
          productId: item.id,
        })),
    });
  return (
    <Screen scroll compact>
      <FilterTabs
        label="Quản trị giá"
        value={tab}
        options={[
          { value: "catalog", label: "Giá sản phẩm" },
          { value: "promotions", label: "Khuyến mãi" },
        ]}
        onChange={setTab}
      />
      <Caption>
        MAP do vận hành cấu hình; mọi đề xuất giảm giá cần thỏa quy tắc và ngân
        sách của hệ thống.
      </Caption>
      <QueryState
        loading={catalog.isLoading || promotions.isLoading}
        error={catalog.error || promotions.error}
        retry={() => {
          void catalog.refetch();
          void promotions.refetch();
        }}
      />
      <ErrorNotice error={command.error} />
      {tab === "catalog" &&
        catalog.data?.map((item) => (
          <ExpandableRecord
            key={item.id}
            title={item.title}
            subtitle={item.store.name}
            meta={`${money(item.price)} · MAP ${item.floorPrice == null ? "chưa cấu hình" : money(item.floorPrice)}`}
            icon="tag"
          >
            <Text>Giá hiện tại: {money(item.price)}</Text>
            <Text>MAP: {money(item.floorPrice)}</Text>
            {item.variants.map((variant) => (
              <Caption key={variant.id}>
                {variant.name} · {money(variant.price ?? item.price)} · MAP{" "}
                {money(variant.floorPrice ?? item.floorPrice)}
              </Caption>
            ))}
            <Button
              title={reviewer ? "Cấu hình MAP" : "Đề xuất khuyến mãi"}
              secondary
              onPress={() => (reviewer ? floor(item) : promotion(item))}
            />
          </ExpandableRecord>
        ))}

      {tab === "promotions" && promotions.data?.length === 0 && (
        <Empty text="Chưa có yêu cầu khuyến mãi." />
      )}
      {tab === "promotions" &&
        promotions.data?.map((item) => (
          <ExpandableRecord
            key={item.id}
            title={item.product.title}
            subtitle={item.store.name}
            badge={statusText(item.status)}
            meta={money(item.proposedPrice)}
            icon="tag"
          >
            <Caption>{item.store.name}</Caption>
            <Badge>{statusText(item.status)}</Badge>
            <Text>
              {money(item.proposedPrice)} · Ngân sách {money(item.budgetTotal)}
            </Text>
            <Text>{item.reason}</Text>
            {reviewer && item.status === "PENDING" && (
              <Button
                title="Duyệt/Từ chối"
                onPress={() =>
                  setForm({
                    title: "Quyết định khuyến mãi",
                    path: `/pricing/promotions/${item.id}/review`,
                    fields: [
                      {
                        key: "approve",
                        label: "Quyết định",
                        options: [
                          { value: "yes", label: "Duyệt" },
                          { value: "no", label: "Từ chối" },
                        ],
                      },
                      { key: "note", label: "Căn cứ", multiline: true },
                    ],
                    schema: promotionReviewInput,
                  })
                }
              />
            )}
            {!reviewer &&
              ["PENDING", "APPROVED", "ACTIVE"].includes(item.status) && (
                <Button
                  title="Hủy đề xuất"
                  secondary
                  loading={command.busy}
                  onPress={() =>
                    void command.execute(
                      `/pricing/promotions/${item.id}/cancel`,
                    )
                  }
                />
              )}
          </ExpandableRecord>
        ))}
      {form && <CommandForm spec={form} close={() => setForm(null)} />}
    </Screen>
  );
}
