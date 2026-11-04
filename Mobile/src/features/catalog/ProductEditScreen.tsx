import { useState } from "react";
import { Text } from "react-native";
import { z } from "zod";
import {
  Badge,
  Button,
  Caption,
  Card,
  ErrorNotice,
  Screen,
  Title,
} from "../../components/ui";
import { ProductSchema, money } from "../../types/contracts";
import {
  CommandForm,
  Evidence,
  QueryState,
  confirmAction,
  required,
  useCommand,
  useResource,
  type CommandFormSpec,
} from "../common/shared";
import { MediaPicker } from "../common/MediaPicker";
import { validEan13 } from "./product-input";
import type { BusinessParams } from "../workspace/policy";
export function ProductEditScreen({ params }: { params: BusinessParams }) {
  const result = useResource(
    "product-edit",
    `/products/${params.productId}`,
    ProductSchema,
    Boolean(params.productId),
  );
  const command = useCommand(),
    [form, setForm] = useState<CommandFormSpec | null>(null),
    item = result.data;
  const update = (
    title: string,
    fields: CommandFormSpec["fields"],
    schema: z.ZodType,
  ) =>
    setForm({
      title,
      path: `/products/${item!.id}`,
      method: "PUT",
      fields,
      schema,
    });
  if (!item)
    return (
      <Screen>
        <QueryState
          loading={result.isLoading}
          error={result.error}
          retry={() => void result.refetch()}
        />
      </Screen>
    );
  return (
    <Screen scroll>
      <Title>{item.title}</Title>
      <Badge>{item.moderationStatus}</Badge>
      <Caption>
        Thay đổi nội dung có thể cần kiểm duyệt lại theo quy tắc hệ thống.
      </Caption>
      <Button
        title="1. Thông tin & nội dung"
        secondary
        onPress={() =>
          update(
            "Thông tin sản phẩm",
            [
              { key: "title", label: "Tên sản phẩm", initial: item.title },
              {
                key: "description",
                label: "Mô tả",
                initial: item.description || "",
                multiline: true,
              },
              {
                key: "ingredients",
                label: "Thành phần/Chất liệu",
                initial: item.ingredients || "",
                multiline: true,
              },
              { key: "origin", label: "Xuất xứ", initial: item.origin || "" },
              {
                key: "labelInfo",
                label: "Thông tin nhãn mác",
                initial: item.labelInfo || "",
                multiline: true,
              },
            ],
            z.object({
              title: required.max(255),
              description: required,
              ingredients: required,
              origin: required,
              labelInfo: required,
            }),
          )
        }
      />
      <Button
        title="2. Giá bán & chính sách tiếp thị"
        secondary
        onPress={() =>
          update(
            "Giá và chính sách",
            [
              {
                key: "price",
                label: "Giá bán",
                initial: String(item.price),
                numeric: true,
              },
              {
                key: "isActive",
                label: "Kinh doanh",
                initial: item.isActive === false ? "no" : "yes",
                options: [
                  { value: "yes", label: "Đang bán" },
                  { value: "no", label: "Tạm ngừng" },
                ],
              },
              {
                key: "isAffiliateEnabled",
                label: "Tiếp thị liên kết",
                initial: item.isAffiliateEnabled === false ? "no" : "yes",
                options: [
                  { value: "yes", label: "Cho phép" },
                  { value: "no", label: "Tắt" },
                ],
              },
            ],
            z
              .object({
                price: z.coerce.number().positive().max(1e12),
                isActive: z.enum(["yes", "no"]),
                isAffiliateEnabled: z.enum(["yes", "no"]),
              })
              .transform((body) => ({
                ...body,
                isActive: body.isActive === "yes",
                isAffiliateEnabled: body.isAffiliateEnabled === "yes",
              })),
          )
        }
      />
      <Title>3. Ảnh sản phẩm</Title>
      <MediaPicker
        label="Thay ảnh bìa vuông"
        cover
        disabled={command.busy}
        onUploaded={(imageUrl) =>
          void command.execute(`/products/${item.id}`, "PUT", { imageUrl })
        }
      />
      <Evidence urls={item.subImages || []} />
      {(item.subImages?.length || 0) < 4 && (
        <MediaPicker
          label="Thêm ảnh phụ"
          disabled={command.busy}
          onUploaded={(url) =>
            void command.execute(`/products/${item.id}`, "PUT", {
              subImages: [...(item.subImages || []), url],
            })
          }
        />
      )}
      <Button
        title="4. Barcode & quy cách đóng gói"
        secondary
        onPress={() =>
          update(
            "Đóng gói vận chuyển",
            [
              {
                key: "barcode",
                label: "Barcode EAN-13",
                initial: item.barcode || "",
              },
              ...[
                "packageWeight",
                "packageLength",
                "packageWidth",
                "packageHeight",
              ].map((key, index) => ({
                key,
                label: ["Khối lượng (g)", "Dài (cm)", "Rộng (cm)", "Cao (cm)"][
                  index
                ],
                initial: String(item[key as keyof typeof item] || ""),
                numeric: true,
              })),
            ],
            z.object({
              barcode: z.string().refine(validEan13, "EAN-13 không hợp lệ."),
              packageWeight: z.coerce.number().int().min(1).max(30000),
              packageLength: z.coerce.number().int().min(1).max(150),
              packageWidth: z.coerce.number().int().min(1).max(150),
              packageHeight: z.coerce.number().int().min(1).max(150),
            }),
          )
        }
      />
      <Title>5. Hồ sơ xuất xứ & nhãn mác</Title>
      <Evidence
        urls={[
          ...(item.originProofImages || []),
          ...(item.labelProofImages || []),
        ]}
      />
      <MediaPicker
        label="Thêm chứng từ xuất xứ"
        disabled={command.busy || (item.originProofImages?.length || 0) >= 10}
        onUploaded={(url) =>
          void command.execute(`/products/${item.id}`, "PUT", {
            originProofImages: [...(item.originProofImages || []), url],
          })
        }
      />
      <MediaPicker
        label="Thêm ảnh nhãn mác"
        disabled={command.busy || (item.labelProofImages?.length || 0) >= 10}
        onUploaded={(url) =>
          void command.execute(`/products/${item.id}`, "PUT", {
            labelProofImages: [...(item.labelProofImages || []), url],
          })
        }
      />
      <Button
        title="6. Chính sách hàng mẫu"
        secondary
        onPress={() =>
          update(
            "Cấp mẫu sản phẩm",
            [
              {
                key: "sampleEnabled",
                label: "Cấp mẫu",
                initial: item.sampleEnabled ? "yes" : "no",
                options: [
                  { value: "yes", label: "Bật" },
                  { value: "no", label: "Tắt" },
                ],
              },
              {
                key: "sampleQuota",
                label: "Hạn mức mẫu",
                initial: String(item.sampleQuota || 0),
                numeric: true,
              },
            ],
            z
              .object({
                sampleEnabled: z.enum(["yes", "no"]),
                sampleQuota: z.coerce
                  .number()
                  .int()
                  .nonnegative()
                  .max(2147483647),
              })
              .transform((body) => ({
                ...body,
                sampleEnabled: body.sampleEnabled === "yes",
              })),
          )
        }
      />
      <Title>Phân loại & tồn kho</Title>
      {item.variants
        ?.filter((variant) => variant.isActive !== false)
        .map((variant) => (
          <Card key={variant.id}>
            <Title>{variant.name}</Title>
            <Text>
              {money(variant.price ?? item.price)} · Tồn {variant.stockQuantity}
            </Text>
            <Button
              title="Sửa giá & tồn kho SKU"
              secondary
              onPress={() =>
                setForm({
                  title: variant.name,
                  path: `/products/${item.id}/variants`,
                  method: "PUT",
                  fields: [
                    {
                      key: "price",
                      label: "Giá SKU",
                      initial: String(variant.price ?? item.price),
                      numeric: true,
                    },
                    {
                      key: "stockQuantity",
                      label: "Tồn kho",
                      initial: String(variant.stockQuantity),
                      numeric: true,
                    },
                  ],
                  schema: z
                    .object({
                      price: z.coerce.number().positive().max(1e12),
                      stockQuantity: z.coerce
                        .number()
                        .int()
                        .nonnegative()
                        .max(2147483647),
                    })
                    .transform((body) => ({
                      variants: item
                        .variants!.filter((row) => row.isActive !== false)
                        .map((row) => ({
                          id: row.id,
                          name: row.name,
                          sku: row.sku,
                          price: Number(row.price ?? item.price),
                          stockQuantity: row.stockQuantity,
                          attributes: row.attributes || {},
                          imageUrl: row.imageUrl,
                          ...(row.id === variant.id ? body : {}),
                        })),
                    })),
                })
              }
            />
          </Card>
        ))}
      <ErrorNotice error={command.error} />
      <Button
        title="Xóa sản phẩm"
        danger
        loading={command.busy}
        onPress={() =>
          confirmAction(
            "Xóa sản phẩm?",
            "Sản phẩm sẽ không còn hiển thị để kinh doanh; lịch sử đơn hàng được giữ theo backend.",
            () => void command.execute(`/products/${item.id}`, "DELETE"),
          )
        }
      />
      {form && <CommandForm spec={form} close={() => setForm(null)} />}
    </Screen>
  );
}
