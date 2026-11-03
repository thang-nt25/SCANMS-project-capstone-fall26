import { Text } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../../services/api";
import { useAuth } from "../auth/AuthProvider";
import {
  Badge,
  Button,
  Caption,
  Card,
  ErrorNotice,
  Title,
} from "../../components/ui";
import type { Order } from "../../types/contracts";
import { useCommand } from "../common/shared";
const TrackingSchema = z.object({
  statusText: z.string(),
  isStale: z.boolean().optional(),
  isSimulation: z.boolean().optional(),
  simulationAvailable: z.boolean().optional(),
  timeline: z.array(
    z.object({ title: z.string(), time: z.string().nullish() }),
  ),
});
export function TrackingCard({ order }: { order: Order }) {
  const { session } = useAuth();
  const command = useCommand();
  const code =
    order.trackingNumber ||
    order.rawPayload?.ghnOrderCode ||
    order.rawPayload?.trackingNumber;
  const carrier = order.carrierName || order.rawPayload?.carrierName || "";
  const environment = order.ghnEnvironment || order.rawPayload?.ghnEnvironment;
  const isGhn =
    /GHN|Giao Hàng Nhanh/i.test(carrier) ||
    Boolean(order.rawPayload?.ghnOrderCode);
  const tracking = useQuery({
    queryKey: [session!.user.id, "tracking", code, environment],
    enabled: Boolean(code && isGhn),
    queryFn: async ({ signal }) =>
      TrackingSchema.parse(
        await api.request(
          `/shipping/ghn/track/${encodeURIComponent(code!)}${environment ? `?environment=${environment}` : ""}`,
          { signal },
        ),
      ),
    refetchInterval: 15000,
  });
  if (!code) return null;
  return (
    <Card style={{ marginHorizontal: 0 }}>
      <Title>Theo dõi giao hàng</Title>
      <Text selectable>
        {carrier} · {code}
      </Text>
      {environment && (
        <Badge>{environment === "TEST" ? "GHN TEST" : "GHN Production"}</Badge>
      )}
      {tracking.data && (
        <>
          <Text>{tracking.data.statusText}</Text>
          {tracking.data.isSimulation && (
            <Caption>Hành trình kiểm thử do backend quản lý</Caption>
          )}
          {tracking.data.isStale && (
            <Caption>Dữ liệu có thể chưa phải mới nhất.</Caption>
          )}
          {tracking.data.timeline.map((event, index) => (
            <Caption key={`${index}-${event.title}`}>
              {event.title} ·{" "}
              {event.time
                ? new Date(event.time).toLocaleString("vi-VN")
                : "Chưa có xác nhận"}
            </Caption>
          ))}
        </>
      )}
      <ErrorNotice error={tracking.error} />
      {isGhn && (
        <Button
          title="Cập nhật hành trình"
          secondary
          loading={tracking.isFetching}
          onPress={() => void tracking.refetch()}
        />
      )}
      {environment === "TEST" &&
        tracking.data?.simulationAvailable &&
        order.status === "SHIPPING" &&
        ["SHOP_MANAGER", "SYSTEM_MANAGER", "SYSTEM_ADMIN"].includes(
          session!.user.role,
        ) && (
          <>
            <Button
              title="TEST: Bắt đầu mô phỏng giao hàng"
              secondary
              loading={command.busy}
              onPress={() =>
                void command.execute(
                  `/shipping/ghn/simulation/${order.id}/start`,
                  "POST",
                )
              }
            />
            <Button
              title="TEST: Xác nhận giao thử thành công"
              secondary
              loading={command.busy}
              onPress={() =>
                void command.execute(
                  `/shipping/ghn/simulation/${order.id}/complete`,
                  "POST",
                )
              }
            />
            <Caption>
              Hệ thống chỉ chấp nhận hoàn tất sau khi hành trình TEST đã đủ thời
              gian.
            </Caption>
          </>
        )}
      <ErrorNotice error={command.error} />
    </Card>
  );
}
