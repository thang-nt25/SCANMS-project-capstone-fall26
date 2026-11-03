import { useState } from "react";
import { z } from "zod";
import { api } from "../../services/api";
import {
  Button,
  Caption,
  Card,
  ErrorNotice,
  Field,
  Title,
} from "../../components/ui";
import { useOperation } from "../../hooks/useOperation";
import { validateInput } from "../../utils/validate-input";
import type { Order } from "../../types/contracts";
const Input = z.object({
  trackingNumber: z
    .string()
    .trim()
    .min(5)
    .max(50)
    .regex(/^[A-Za-z0-9][A-Za-z0-9._/-]*$/),
  carrierName: z.string().trim().min(1).max(80),
  note: z.string().trim().max(500),
});
export function FulfillmentForm({
  order,
  refresh,
}: {
  order: Order;
  refresh(): Promise<unknown>;
}) {
  const operation = useOperation(),
    [trackingNumber, setTrackingNumber] = useState(""),
    [carrierName, setCarrierName] = useState(""),
    [note, setNote] = useState("");
  if (order.status !== "PENDING") return null;
  const submit = () =>
    operation.run(async () => {
      const input = validateInput(Input, { trackingNumber, carrierName, note });
      await api.request(`/orders/${order.id}/fulfillment`, {
        method: "PATCH",
        body: { ...input, status: "SHIPPING" },
      });
    }, refresh);
  const sandbox = () =>
    operation.run(
      () =>
        api.request(`/shipping/ghn/create-order/${order.id}`, {
          method: "POST",
          body: { environment: "TEST", note },
          timeout: 45000,
        }),
      refresh,
    );
  return (
    <Card style={{ marginHorizontal: 0 }}>
      <Title>Bàn giao vận chuyển</Title>
      <Caption>
        Nhập mã đã được đơn vị vận chuyển cấp, hoặc tạo vận đơn GHN sandbox để
        kiểm thử.
      </Caption>
      <Field
        label="Đơn vị vận chuyển"
        value={carrierName}
        onChangeText={setCarrierName}
        maxLength={80}
        editable={!operation.busy}
      />
      <Field
        label="Mã vận đơn"
        value={trackingNumber}
        onChangeText={setTrackingNumber}
        maxLength={50}
        editable={!operation.busy}
        autoCapitalize="characters"
      />
      <Field
        label="Ghi chú"
        value={note}
        onChangeText={setNote}
        maxLength={500}
        editable={!operation.busy}
      />
      <ErrorNotice error={operation.error} />
      <Button
        title="Lưu mã và xác nhận đã gửi"
        loading={operation.busy}
        onPress={() => void submit()}
      />
      {!order.trackingNumber && (
        <Button
          title="Tạo vận đơn GHN TEST"
          secondary
          disabled={operation.busy}
          onPress={() => void sandbox()}
        />
      )}
    </Card>
  );
}
