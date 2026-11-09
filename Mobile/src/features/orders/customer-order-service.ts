import { z } from "zod";
import type { ApiClient } from "../../services/api/client";
import { unwrapEnvelope } from "../../services/api/client";
import { OrderSchema, type Order } from "../../types/contracts";

/** Resolve the public receipt code through the signed-in buyer's own list, then
 * load the UUID detail endpoint so receipt/address/variant data is authoritative. */
export async function loadCustomerOrder(
  client: Pick<ApiClient, "request">,
  target: { order?: Order; publicOrderCode?: string },
  signal?: AbortSignal,
) {
  let id = target.order?.id;
  if (!id) {
    const code = target.publicOrderCode?.trim();
    if (!code) throw new Error("Thiếu mã đơn hàng.");
    const result = z
      .object({ orders: z.array(OrderSchema) })
      .parse(
        unwrapEnvelope(
          await client.request(
            `/customer/orders?search=${encodeURIComponent(code)}`,
            { signal },
          ),
        ),
      );
    id = result.orders.find((order) => order.externalOrderSn === code)?.id;
    if (!id)
      throw new Error(
        "Chưa tìm thấy đơn trong tài khoản của bạn. Hãy thử tải lại.",
      );
  }
  return OrderSchema.parse(
    unwrapEnvelope(
      await client.request(`/customer/orders/${encodeURIComponent(id)}`, {
        signal,
      }),
    ),
  );
}
