import { useState } from "react";
import { Text } from "react-native";
import { randomUUID } from "expo-crypto";
import { z } from "zod";
import {
  Badge,
  Button,
  Caption,
  Card,
  ErrorNotice,
  Field,
  Screen,
  Title,
} from "../../components/ui";
import { ProductSchema, money } from "../../types/contracts";
import { api } from "../../services/api";
import { shareExport, XLSX_MIME } from "../../services/exports";
import {
  QueryState,
  required,
  useActor,
  useCommand,
  useResource,
} from "../common/shared";
import { SelectField } from "../common/SelectField";
import { validateInput } from "../../utils/validate-input";
const Input = z.object({
  storeId: z.string().uuid(),
  requestId: z.string().uuid(),
  customerName: required.max(150),
  customerPhone: required.max(20).regex(/^\+?\d{9,15}$/),
  shippingAddress: required.min(10).max(1000),
  items: z
    .array(
      z.object({
        sku: required.max(100),
        quantity: z.number().int().positive().max(2147483647),
      }),
    )
    .min(1)
    .max(100),
});
const ImportResult = z.object({
  summary: z.object({
    importedOrders: z.number(),
    skippedOrders: z.number(),
    errorRows: z.number(),
  }),
  errors: z.array(
    z.object({
      row: z.number(),
      message: z.string(),
      orderCode: z.string().optional(),
    }),
  ),
});
export function ManualOrdersScreen() {
  const { reviewer, store } = useActor(),
    command = useCommand(),
    [storeId, setStoreId] = useState(store?.id || "");
  const allStores = useResource(
    "manual-stores",
    "/stores/all-admin",
    z.array(z.object({ id: z.string(), name: z.string() })),
    reviewer,
  );
  const products = useResource(
    "manual-products",
    `/products?storeId=${storeId}&page=1&limit=100`,
    z.object({ items: z.array(ProductSchema) }),
    Boolean(storeId),
  );
  const [requestId, setRequestId] = useState(() => randomUUID()),
    [customerName, setName] = useState(""),
    [customerPhone, setPhone] = useState(""),
    [address, setAddress] = useState("");
  const [productId, setProductId] = useState(""),
    [quantity, setQuantity] = useState("1"),
    [lines, setLines] = useState<
      { productId: string; sku: string; title: string; quantity: number }[]
    >([]);
  const [imported, setImported] = useState<z.infer<typeof ImportResult> | null>(
      null,
    ),
    [created, setCreated] = useState("");
  return (
    <Screen scroll>
      <Title>Tạo đơn thủ công & Excel</Title>
      <Caption>
        Luồng nhập đơn/đối soát hiện có của hệ thống; không thay thế checkout
        hoặc tự đánh dấu đã thanh toán.
      </Caption>
      {reviewer ? (
        <SelectField
          label="Gian hàng"
          value={storeId}
          options={(allStores.data || []).map((item) => ({
            value: item.id,
            label: item.name,
          }))}
          onChange={(id) => {
            setStoreId(id);
            setLines([]);
            setProductId("");
            setRequestId(randomUUID());
          }}
        />
      ) : (
        <Caption>{store?.name}</Caption>
      )}
      <QueryState
        loading={products.isLoading}
        error={products.error || allStores.error}
        retry={() => {
          void products.refetch();
          if (reviewer) void allStores.refetch();
        }}
      />
      <Field
        label="Tên khách hàng"
        value={customerName}
        onChangeText={setName}
        editable={!command.busy}
      />
      <Field
        label="Số điện thoại khách"
        value={customerPhone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        editable={!command.busy}
      />
      <Field
        label="Địa chỉ đầy đủ"
        value={address}
        onChangeText={setAddress}
        multiline
        editable={!command.busy}
      />
      <SelectField
        label="Sản phẩm"
        value={productId}
        options={(products.data?.items || []).map((item) => ({
          value: item.id,
          label: `${item.title} · ${money(item.price)}`,
        }))}
        onChange={setProductId}
        disabled={command.busy}
      />
      <Field
        label="Số lượng"
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="number-pad"
        editable={!command.busy}
      />
      <Button
        title="Thêm vào đơn"
        secondary
        loading={command.busy}
        disabled={!productId}
        onPress={() =>
          void command.run(async () => {
            const qty = validateInput(
                z.coerce.number().int().min(1).max(999),
                quantity,
              ),
              product = products.data!.items.find(
                (item) => item.id === productId,
              )!;
            if (!product.sku) throw new Error("Sản phẩm chưa có SKU hợp lệ.");
            setLines((old) => [
              ...old.filter((item) => item.productId !== productId),
              {
                productId,
                sku: product.sku!,
                title: product.title,
                quantity: qty,
              },
            ]);
          })
        }
      />
      {lines.map((line) => (
        <Card key={line.productId}>
          <Text>
            {line.title} × {line.quantity}
          </Text>
          <Button
            title="Bỏ dòng"
            secondary
            disabled={command.busy}
            onPress={() =>
              setLines((old) =>
                old.filter((item) => item.productId !== line.productId),
              )
            }
          />
        </Card>
      ))}
      {created && <Badge>Đã tạo đơn {created}</Badge>}
      <ErrorNotice error={command.error} />
      <Button
        title="Tạo đơn thủ công"
        loading={command.busy}
        disabled={!storeId || !lines.length}
        onPress={() =>
          void command.run(async () => {
            const body = validateInput(Input, {
              storeId,
              requestId,
              customerName,
              customerPhone,
              shippingAddress: address,
              items: lines.map(({ sku, quantity: count }) => ({
                sku,
                quantity: count,
              })),
            });
            const response = z
              .object({ order: z.object({ externalOrderSn: z.string() }) })
              .parse(
                await api.request("/orders/manual", {
                  method: "POST",
                  body,
                  timeout: 60000,
                }),
              );
            setCreated(response.order.externalOrderSn);
            setLines([]);
            setRequestId(randomUUID());
          })
        }
      />
      <Title>Import Excel</Title>
      <Button
        title="Tải file mẫu Excel"
        secondary
        loading={command.busy}
        onPress={() =>
          void command.run(() =>
            shareExport(
              "/orders/import-excel/template",
              "SCANMS-Orders-Template.xlsx",
              XLSX_MIME,
            ),
          )
        }
      />
      <Button
        title="Chọn file Excel & import"
        secondary
        loading={command.busy}
        disabled={!storeId}
        onPress={() =>
          void command.run(async () => {
            const DocumentPicker = await import("expo-document-picker");
            const selected = await DocumentPicker.getDocumentAsync({
              type: [XLSX_MIME],
              copyToCacheDirectory: true,
              multiple: false,
            });
            if (selected.canceled) return;
            const file = selected.assets[0];
            if (
              !file.size ||
              file.size > 5 * 1024 * 1024 ||
              !/\.xlsx$/i.test(file.name)
            )
              throw new Error("Chọn file .xlsx tối đa 5 MB.");
            const data = new FormData();
            data.append("storeId", storeId);
            data.append("file", {
              uri: file.uri,
              name: file.name,
              type: file.mimeType || XLSX_MIME,
            } as unknown as Blob);
            setImported(
              ImportResult.parse(
                await api.request("/orders/import-excel", {
                  method: "POST",
                  body: data,
                  timeout: 120000,
                }),
              ),
            );
          })
        }
      />
      {imported && (
        <>
          <Badge>
            Đã nhập {imported.summary.importedOrders} · Bỏ qua{" "}
            {imported.summary.skippedOrders} · Dòng lỗi{" "}
            {imported.summary.errorRows}
          </Badge>
          {imported.errors.map((item, index) => (
            <Caption key={`${item.row}-${index}`}>
              Dòng {item.row}
              {item.orderCode ? ` · ${item.orderCode}` : ""}: {item.message}
            </Caption>
          ))}
        </>
      )}
    </Screen>
  );
}
