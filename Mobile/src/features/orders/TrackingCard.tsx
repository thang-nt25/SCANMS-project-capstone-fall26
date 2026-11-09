import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "../../components/commerce";
import { BottomSheet } from "../../components/BottomSheet";
import { colors } from "../../theme/tokens";
import { latestConfirmedEvent } from "./order-presentation";
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
    z.object({
      title: z.string(),
      time: z.string().nullish(),
      completed: z.boolean().optional(),
    }),
  ),
});
export function TrackingCard({
  order,
  compact = false,
  open: controlledOpen,
  onOpenChange,
}: {
  order: Order;
  compact?: boolean;
  open?: boolean;
  onOpenChange?(value: boolean): void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (value: boolean) => {
    if (onOpenChange) onOpenChange(value);
    else setInternalOpen(value);
  };
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
  if (!code && !compact) return null;
  const content = (
    <>
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
              {event.completed === false
                ? "Chưa có xác nhận"
                : event.time
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
    </>
  );
  if (!compact) return <Card style={{ marginHorizontal: 0 }}>{content}</Card>;
  const last = latestConfirmedEvent(tracking.data?.timeline || []);
  const placeholder =
    order.status === "CANCELLED"
      ? "Đơn đã hủy"
      : order.status === "PENDING"
        ? "Shop đang chuẩn bị đơn hàng"
        : "Shop chưa cập nhật mã vận đơn";
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !code }}
        disabled={!code}
        onPress={() => setOpen(true)}
        style={trackingStyles.summary}
      >
        <Icon name="truck" size={20} color={colors.strong} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={trackingStyles.heading}>Thông tin vận chuyển</Text>
          <Text numberOfLines={1} style={trackingStyles.caption}>
            {code
              ? [carrier || "Đơn vị vận chuyển", code].join(" · ")
              : placeholder}
          </Text>
          {code && (
            <Text style={trackingStyles.status}>
              {tracking.error
                ? "Chưa tải được hành trình"
                : tracking.data?.statusText || "Đang cập nhật hành trình"}
            </Text>
          )}
          {last && (
            <Text style={trackingStyles.caption}>
              {last.title} · {new Date(last.time!).toLocaleString("vi-VN")}
            </Text>
          )}
        </View>
        {!!code && <Icon name="chevron-right" size={16} color={colors.muted} />}
      </Pressable>
      {open && !!code && (
        <BottomSheet
          title="Theo dõi đơn hàng"
          close={() => {
            if (!command.busy) setOpen(false);
          }}
        >
          {content}
        </BottomSheet>
      )}
    </>
  );
}
const trackingStyles = StyleSheet.create({
  summary: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  heading: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.ink,
    lineHeight: 18,
  },
  caption: { fontSize: 11, color: colors.muted, lineHeight: 16 },
  status: { fontSize: 12, color: colors.strong, lineHeight: 18 },
});
