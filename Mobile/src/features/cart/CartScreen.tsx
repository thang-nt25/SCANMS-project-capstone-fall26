import { useState } from "react";
import { Text } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Caption,
  Card,
  Empty,
  ErrorNotice,
  Screen,
  Title,
} from "../../components/ui";
import { api } from "../../services/api";
import { money, type Product } from "../../types/contracts";
import {
  CartSchema,
  addCartLine,
  type CartItem,
} from "../customer/customer-contracts";
import {
  QueryState,
  confirmAction,
  useActor,
  useCommand,
  useResource,
} from "../common/shared";
import { SelectField } from "../common/SelectField";
import { useOperation } from "../../hooks/useOperation";
export function AddToCart({ product }: { product: Product }) {
  const [variantId, setVariantId] = useState("");
  const [success, setSuccess] = useState(false);
  const operation = useOperation(),
    client = useQueryClient(),
    { user } = useActor();
  const variants = product.variants || [];
  return (
    <Card style={{ marginHorizontal: 0 }}>
      <Title>Chọn sản phẩm</Title>
      {variants.length > 0 && (
        <SelectField
          label="Phân loại"
          value={variantId}
          disabled={operation.busy}
          options={variants.map((item) => ({
            value: item.id,
            label: `${item.name} · ${money(item.price ?? product.price)} · tồn ${item.stockQuantity}`,
          }))}
          onChange={(id) => {
            setVariantId(id);
            setSuccess(false);
          }}
        />
      )}
      <ErrorNotice error={operation.error} />
      {success && <Badge>Đã lưu sản phẩm vào giỏ hàng</Badge>}
      <Button
        title="Thêm vào giỏ hàng"
        loading={operation.busy}
        disabled={variants.length > 0 && !variantId}
        onPress={() =>
          void operation.run(async () => {
            setSuccess(false);
            const chosen = variants.find((item) => item.id === variantId);
            if ((chosen?.stockQuantity ?? product.stockQuantity ?? 0) <= 0)
              throw new Error("Phân loại đã hết hàng.");
            // Refresh before replacing the server cart; never manufacture a variant ID from its name.
            const cart = CartSchema.parse(await api.request("/customer/cart"));
            const items = addCartLine(
              cart.items,
              product.id,
              variantId || undefined,
              1,
            );
            const response = CartSchema.parse(
              await api.request("/customer/cart", {
                method: "PUT",
                body: { items },
              }),
            );
            await client.invalidateQueries({
              queryKey: [user.id, "business", "cart"],
            });
            if (response.warnings?.length)
              throw new Error(response.warnings.join("\n"));
            setSuccess(true);
          })
        }
      />
    </Card>
  );
}
export function CartScreen() {
  const cart = useResource("cart", "/customer/cart", CartSchema),
    command = useCommand();
  const change = (item: CartItem, quantity: number) =>
    void command.run(async () => {
      const latest = CartSchema.parse(await api.request("/customer/cart"));
      const items = latest.items
        .filter((row) => row.cartItemId !== item.cartItemId || quantity > 0)
        .map((row) => ({
          productId: row.productId,
          ...(row.variantId ? { variantId: row.variantId } : {}),
          quantity:
            row.cartItemId === item.cartItemId ? quantity : row.quantity,
        }));
      const saved = CartSchema.parse(
        await api.request("/customer/cart", { method: "PUT", body: { items } }),
      );
      await cart.refetch();
      if (saved.warnings?.length) throw new Error(saved.warnings.join("\n"));
    });
  return (
    <Screen scroll>
      <Title>Giỏ hàng</Title>
      <QueryState
        loading={cart.isLoading}
        error={cart.error}
        retry={() => void cart.refetch()}
      />
      <ErrorNotice error={command.error} />
      {cart.data?.items.length === 0 && (
        <Empty text="Chọn sản phẩm để thêm vào giỏ hàng." />
      )}
      {cart.data?.items.map((item) => (
        <Card key={item.cartItemId}>
          <Caption>{item.store.name}</Caption>
          <Title>{item.title}</Title>
          <Text>{item.variantName}</Text>
          <Text>
            {money(item.price)} × {item.quantity}
          </Text>
          {(!item.isActive || item.stockQuantity < 1) && (
            <Badge>Sản phẩm hiện không khả dụng</Badge>
          )}
          <Button
            title="− Giảm số lượng"
            secondary
            disabled={command.busy || item.quantity <= 1}
            onPress={() => change(item, item.quantity - 1)}
          />
          <Button
            title="+ Tăng số lượng"
            secondary
            disabled={
              command.busy ||
              !item.isActive ||
              item.quantity >= item.stockQuantity
            }
            onPress={() => change(item, item.quantity + 1)}
          />
          <Button
            title="Bỏ khỏi giỏ hàng"
            danger
            disabled={command.busy}
            onPress={() =>
              confirmAction("Bỏ sản phẩm?", item.title, () => change(item, 0))
            }
          />
        </Card>
      ))}
      {cart.data && (
        <Title>
          Tổng tiền hàng:{" "}
          {money(
            cart.data.items.reduce(
              (sum, item) => sum + Number(item.price) * item.quantity,
              0,
            ),
          )}
        </Title>
      )}
      <Caption>
        Giỏ hàng được lưu trên hệ thống. Thanh toán mobile thuộc giai đoạn tiếp
        theo; bạn có thể mở web bằng cùng tài khoản để tiếp tục đặt hàng.
      </Caption>
    </Screen>
  );
}
