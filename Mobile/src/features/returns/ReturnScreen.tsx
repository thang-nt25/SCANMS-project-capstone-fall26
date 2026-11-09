import { useState } from "react";
import { Text, View, StyleSheet } from "react-native";
import { ProductPhoto } from "../../components/ProductPhoto";
import { Icon, type IconName } from "../../components/commerce";
import { colors } from "../../theme/tokens";
import { useQuery } from "@tanstack/react-query";
import { orders } from "../../services/scanms";
import { z } from "zod";
import {
  Badge,
  Button,
  Card,
  Empty,
  ErrorNotice,
  PageControls,
  Screen,
} from "../../components/ui";
import { money, statusText } from "../../types/contracts";
import {
  QueryState,
  DetailLine,
  Evidence,
  CommandForm,
  Sheet,
  amount,
  required,
  useActor,
  useCommand,
  useResource,
  type CommandFormSpec,
} from "../common/shared";
import type { BusinessParams } from "../workspace/policy";
import { ReturnTimeline } from "./ReturnTimeline";
import {
  mayAssessReturnLiability,
  mayBookReturnPickup,
  mergeReturnQueues,
} from "./policy";
const Address = z.object({
  name: z.string(),
  phone: z.string(),
  address: z.string(),
  wardName: z.string(),
  provinceName: z.string(),
  districtName: z.string().optional(),
});
const Shipment = z.object({
  carrierName: z.string(),
  trackingNumber: z.string(),
  receiptImageUrl: z.string().nullish(),
  provider: z.string().nullish(),
  providerStatus: z.string().nullish(),
  receivedAt: z.string().nullish(),
});
const ReturnSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  status: z.string(),
  createdAt: z.string().nullish(),
  items: z.array(z.object({
    id: z.string().optional(), quantity: z.number(),
    orderItem: z.object({ product: z.object({ title: z.string(), imageUrl: z.string().nullish() }).nullish() }),
  })).optional(),
  reason: z.string(),
  details: z.string().nullish(),
  imageUrls: z.array(z.string()),
  unboxingVideoUrl: z.string(),
  shipByAt: z.string().nullish(),
  returnInstructions: z.string().nullish(),
  returnAddress: z.string().nullish(),
  returnWarehouse: Address.nullish(),
  pickupProviderMode: z.string().optional(),
  pickupSimulationEnabled: z.boolean().optional(),
  shopResponse: z.string().nullish(),
  inspectionNotes: z.string().nullish(),
  receivedAt: z.string().nullish(),
  order: z.object({
    externalOrderSn: z.string(),
    storeName: z.string(),
    customerName: z.string().nullish(),
    shippingAddress: z.string().nullish(),
  }),
  customerShipment: Shipment.nullish(),
  exchangeShipment: Shipment.nullish(),
  refund: z
    .object({
      amount,
      method: z.string(),
      status: z.string(),
      failureReason: z.string().nullish(),
    })
    .nullish(),
  dispute: z
    .object({
      id: z.string(),
      status: z.string(),
      details: z.string(),
      ruling: z.string().nullish(),
      resolutionNotes: z.string().nullish(),
    })
    .nullish(),
  events: z.array(
    z.object({ id: z.string(), type: z.string(), createdAt: z.string() }),
  ),
});
const CustomerQueue = z.object({
  orders: z.array(
    z.object({
      id: z.string(),
      externalOrderSn: z.string(),
      returnRequest: z.object({ id: z.string(), status: z.string() }).nullish(),
    }),
  ),
});
const reasonText = (reason: string) => ({ DAMAGED: "Hàng hư hỏng", WRONG_ITEM: "Giao sai sản phẩm", EXPIRED: "Hàng hết hạn", OTHER: "Lý do khác" } as Record<string, string>)[reason] || reason;
function ReturnStatus({ status }: { status: string }) {
  const icons: Record<string, IconName> = { REQUESTED: "clipboard", SHOP_APPROVED: "package", PICKUP_BOOKED: "truck", RETURN_SHIPPED: "truck", RETURN_RECEIVED: "inbox", AWAITING_CUSTOMER_CONFIRMATION: "user-check", EXCHANGE_PENDING: "package", EXCHANGE_SHIPPED: "truck", REFUND_PENDING: "clock", REFUND_PROCESSING: "credit-card", DISPUTED: "alert-circle", OPEN: "alert-circle", RESOLVED: "check-circle", COMPLETED: "check-circle", CLOSED: "check-circle", REFUNDED: "check-circle", SHOP_REJECTED: "x-circle", REFUND_FAILED: "alert-circle", INSPECTING: "search" };
  return <View accessibilityLabel={statusText(status)} style={r.status}><Icon name={icons[status] || "clock"} size={15} color={colors.strong} /><Text style={r.statusText}>{statusText(status)}</Text></View>;
}
function returnEventText(type: string) {
  const labels: Record<string, string> = {
    SHOP_EVIDENCE_SUBMITTED: "Shop bổ sung bằng chứng",
    LIABILITY_ASSESSED: "Đã xác định trách nhiệm",
    GHN_COMPENSATION_CLAIM_OPENED: "Mở yêu cầu bồi thường vận chuyển",
    REQUESTED: "Khách gửi yêu cầu đổi trả",
  };
  if (labels[type]) return labels[type];
  const next = type.split("_TO_")[1];
  if (next) {
    const states: Record<string, string> = { REQUESTED: "Đã tiếp nhận yêu cầu", SHOP_REJECTED: "Shop từ chối yêu cầu", SHOP_APPROVED: "Shop chấp nhận đổi trả", DISPUTED: "Chuyển sang phân xử", REFUND_PENDING: "Chờ hoàn tiền", REFUND_PROCESSING: "Đang hoàn tiền", REFUND_FAILED: "Hoàn tiền chưa thành công", AWAITING_CUSTOMER_CONFIRMATION: "Chờ khách xác nhận", COMPLETED: "Hồ sơ hoàn tất", CLOSED: "Đã đóng hồ sơ", PICKUP_BOOKED: "Đã đặt lịch lấy hàng", RETURN_SHIPPED: "Hàng đang gửi trả", RETURN_RECEIVED: "Shop đã nhận hàng trả", INSPECTING: "Shop đang kiểm tra hàng", EXCHANGE_PENDING: "Chờ gửi hàng đổi", EXCHANGE_SHIPPED: "Đã gửi hàng đổi" };
    if (states[next]) return states[next];
  }
  return "Cập nhật hồ sơ đổi trả";
}
function ReturnProducts({ item }: { item: z.infer<typeof ReturnSchema> }) {
  const { user, store } = useActor();
  const fallback = useQuery({
    queryKey: [user.id, "return-order-products", item.orderId],
    queryFn: ({ signal }) => orders(user.role, 1, item.order.externalOrderSn, store?.id, signal),
    enabled: !item.items?.length && ["CUSTOMER", "SHOP_MANAGER"].includes(user.role),
    staleTime: 60000,
  });
  const original = fallback.data?.items.find(order => order.id === item.orderId);
  const lines = item.items?.length ? item.items.map(line => ({ id: line.id, title: line.orderItem.product?.title, image: line.orderItem.product?.imageUrl, quantity: line.quantity })) : (original?.items || original?.orderItems?.map(line => ({ ...line, title: line.product?.title, imageUrl: line.product?.imageUrl })))?.map(line => ({ id: line.productId, title: line.title, image: line.imageUrl, quantity: line.quantity }));
  return <View style={{ gap: 10 }}>{lines?.map((line, index) => <View key={line.id || index} style={r.row}><ProductPhoto uri={line.image} resizeMode="contain" style={r.photo} /><View style={{ flex: 1, gap: 5 }}><Text numberOfLines={2} style={r.body}>{line.title || "Sản phẩm trong đơn"}</Text><Text style={r.meta}>{item.items?.length ? "Số lượng trả" : "Số lượng trong đơn"}: {line.quantity}</Text></View></View>)}{fallback.isLoading && <Text style={r.meta}>Đang tải sản phẩm trong đơn…</Text>}{fallback.error && <Text style={r.meta}>Chưa tải được sản phẩm của đơn.</Text>}</View>;
}
const r = StyleSheet.create({
  panel: { padding: 13, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, gap: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  code: { fontSize: 13, lineHeight: 19, fontWeight: "700", color: colors.ink, flexShrink: 1 },
  photo: { width: 64, height: 70, borderRadius: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  body: { fontSize: 13, lineHeight: 19, color: colors.ink, fontWeight: "500" },
  meta: { fontSize: 11, lineHeight: 17, color: colors.muted },
  heading: { fontSize: 14, fontWeight: "700", color: colors.ink },
  info: { padding: 10, borderRadius: 10, backgroundColor: colors.canvas, gap: 4 },
  sectionIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.soft, alignItems: "center", justifyContent: "center" },
  instruction: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  address: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: colors.canvas, borderRadius: 10, padding: 11 },
  deadline: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 7, paddingVertical: 9, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  status: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, flexShrink: 1, paddingHorizontal: 8, paddingVertical: 6, borderWidth: 1, borderColor: colors.brandBorder, borderRadius: 8, backgroundColor: colors.soft },
  statusText: { fontSize: 10, lineHeight: 15, color: colors.strong, flexShrink: 1 },
});
const Queue = z.object({
  items: z.array(ReturnSchema),
  total: z.number(),
  page: z.number(),
});
const liability = [
  { value: "LOGISTICS_FAULT", label: "Lỗi vận chuyển" },
  { value: "SHOP_FAULT", label: "Lỗi Shop" },
  { value: "CUSTOMER_REASON", label: "Lý do từ khách" },
];
const addressFields = [
  { key: "name", label: "Người nhận" },
  { key: "phone", label: "Điện thoại" },
  { key: "address", label: "Địa chỉ chi tiết" },
  { key: "provinceName", label: "Tỉnh/Thành phố" },
  { key: "districtName", label: "Quận/Huyện" },
  { key: "wardName", label: "Phường/Xã" },
];
const AddressInput = z.object({
  name: required.min(2).max(150),
  phone: z.string().regex(/^\+?\d{9,15}$/),
  address: required.min(10).max(500),
  provinceName: required.min(2).max(100),
  districtName: required.min(2).max(100),
  wardName: required.min(2).max(100),
});
export function ReturnsScreen({ params }: { params: BusinessParams }) {
  const { user, reviewer } = useActor(),
    [selected, setSelected] = useState(params.id || ""),
    [page, setPage] = useState(1);
  const customer = user.role === "CUSTOMER";
  const customers = useResource(
    "return-orders",
    "/customer/orders",
    CustomerQueue,
    customer && !selected,
  );
  const queue = useResource(
    "return-queue",
    `/returns/shop?page=${page}`,
    Queue,
    user.role === "SHOP_MANAGER" && !selected,
  );
  const oversight = useResource(
    "return-oversight",
    "/admin/return-disputes/active-returns",
    z.array(ReturnSchema),
    reviewer && !selected,
  );
  // Disputed/failed/stalled requests are not part of the active queue.
  // Keep their dedicated queues visible so operations can actually reach resolution.
  const disputes = useResource(
    "return-disputes",
    "/admin/return-disputes",
    z.array(z.object({ returnRequest: ReturnSchema })),
    reviewer && !selected,
  );
  const stalled = useResource(
    "return-stalled",
    "/admin/return-disputes/overdue-inspections",
    z.array(ReturnSchema),
    reviewer && !selected,
  );
  const oversightRows = mergeReturnQueues(
    oversight.data || [],
    (disputes.data || []).map((row) => row.returnRequest),
    stalled.data || [],
  );
  const rows = customer
    ? customers.data?.orders
        .filter((item) => item.returnRequest)
        .map((item) => ({
          id: item.returnRequest!.id,
          title: item.externalOrderSn,
          status: item.returnRequest!.status,
          record: undefined,
        }))
    : (reviewer ? oversightRows : queue.data?.items)?.map((item) => ({
        id: item.id,
        title: item.order.externalOrderSn,
        status: item.status,
        record: item,
      }));
  return (
    <Screen scroll>
      <QueryState
        loading={
          customers.isLoading ||
          queue.isLoading ||
          oversight.isLoading ||
          disputes.isLoading ||
          stalled.isLoading
        }
        error={
          customers.error ||
          queue.error ||
          oversight.error ||
          disputes.error ||
          stalled.error
        }
        retry={() => {
          if (customer) void customers.refetch();
          else if (reviewer) {
            void oversight.refetch();
            void disputes.refetch();
            void stalled.refetch();
          } else void queue.refetch();
        }}
      />
      {rows?.length === 0 && (
        <Empty text="Chưa có hồ sơ đổi trả. Khách tạo yêu cầu từ chi tiết đơn đã giao." />
      )}
      {rows?.map((item) => (
        <Card key={item.id}>
          <View style={r.row}><View style={{ flex: 1 }}><Text style={r.code}>{item.title}</Text></View><ReturnStatus status={item.status} /></View>
          {item.record && <><ReturnProducts item={item.record} /><View style={r.info}><Text style={r.meta}>Lý do</Text><Text style={r.body}>{reasonText(item.record.reason)}</Text>{!!item.record.details && <Text numberOfLines={2} style={r.meta}>{item.record.details}</Text>}{!!item.record.createdAt && <Text style={r.meta}>{new Date(item.record.createdAt).toLocaleString("vi-VN")}</Text>}</View></>}
          <Button
            title="Xem và xử lý"
            soft
            onPress={() => setSelected(item.id)}
          />
        </Card>
      ))}
      {!customer && !reviewer && queue.data && (
        <PageControls
          page={page}
          totalPages={Math.ceil(queue.data.total / 20)}
          loading={queue.isFetching}
          onChange={setPage}
        />
      )}
      {selected && (
        <Sheet title="Hồ sơ đổi trả" backHeader close={() => setSelected("")}>
          <ReturnDetail id={selected} />
        </Sheet>
      )}
    </Screen>
  );
}
function ReturnDetail({ id }: { id: string }) {
  const { user, reviewer } = useActor(),
    command = useCommand(),
    [allEvents, setAllEvents] = useState(false),
    [form, setForm] = useState<CommandFormSpec | null>(null);
  const result = useResource("return-detail", `/returns/${id}`, ReturnSchema),
    item = result.data;
  const action = (
    suffix: string,
    title: string,
    method = "PATCH",
    body?: unknown,
  ) => (
    <Button
      title={title}
      secondary
      loading={command.busy}
      onPress={() =>
        void command.execute(`/returns/${id}/${suffix}`, method, body)
      }
    />
  );
  const shipmentForm = (suffix: string) =>
    setForm({
      title: "Thông tin gửi sản phẩm đổi",
      path: `/returns/${id}/${suffix}`,
      method: "POST",
      fields: [
        { key: "carrierName", label: "Đơn vị vận chuyển" },
        { key: "trackingNumber", label: "Mã vận đơn" },
      ],
      schema: z.object({
        carrierName: required.min(2).max(100),
        trackingNumber: required.min(5).max(100),
      }),
    });
  if (!item)
    return (
      <QueryState
        loading={result.isLoading}
        error={result.error}
        retry={() => void result.refetch()}
      />
    );
  const shop = user.role === "SHOP_MANAGER",
    customer = user.role === "CUSTOMER";
  const mayDispute =
    !item.dispute &&
    ([
      "SHOP_REJECTED",
      "EXPIRED",
      "INSPECTION_REJECTED",
      "REFUND_FAILED",
    ].includes(item.status) ||
      (["RETURN_RECEIVED", "INSPECTING"].includes(item.status) &&
        item.receivedAt &&
        Date.now() - Date.parse(item.receivedAt) > 48 * 3600000));
  const warehouseActions = (shop && item.status === "SHOP_APPROVED" && (
        <View style={r.row}>
          <View style={{ flex: 1 }}><Button
            title="Sửa kho nhận"
            soft
            disabled={command.busy}
            onPress={() =>
              setForm({
                title: "Kho nhận hàng",
                path: `/returns/${id}/warehouse`,
                fields: addressFields.map((field) => ({
                  ...field,
                  initial:
                    item.returnWarehouse?.[
                      field.key as keyof z.infer<typeof Address>
                    ] || "",
                })),
                schema: AddressInput,
              })
            }
          /></View>
          <View style={{ flex: 1 }}><Button
            title="Hướng dẫn"
            secondary
            disabled={Boolean(item.shipByAt) || command.busy}
            onPress={() =>
              setForm({
                title: "Hướng dẫn trả hàng",
                path: `/returns/${id}/instructions`,
                fields: [
                  {
                    key: "returnAddress",
                    label: "Địa chỉ",
                    initial: item.returnAddress || "",
                  },
                  {
                    key: "returnInstructions",
                    label: "Hướng dẫn",
                    multiline: true,
                    initial: item.returnInstructions || "",
                  },
                ],
                schema: z.object({
                  returnAddress: required.min(10).max(500),
                  returnInstructions: required.min(10).max(1000),
                }),
              })
            }
          /></View>
        </View>
      ));
  return (
    <>
      <View style={r.panel}><View style={r.row}><Icon name="rotate-ccw" size={20} color={colors.strong} /><Text style={r.code}>{item.order.externalOrderSn}</Text></View><ReturnStatus status={item.status} /><ReturnProducts item={item} /><Text style={r.meta}>{item.order.storeName}</Text>{!!item.order.customerName && <Text style={r.meta}>Khách hàng: {item.order.customerName}</Text>}</View>
      <View style={r.panel}><Text style={r.heading}>Tiến trình xử lý</Text><ReturnTimeline status={item.status} /></View>
      <View style={r.panel}><View style={r.row}><Text style={[r.heading, { flex: 1 }]}>Yêu cầu từ khách</Text><Text style={r.meta}>{reasonText(item.reason)}</Text></View>{!!item.details && <Text style={r.meta}>{item.details}</Text>}<Evidence compact urls={[...item.imageUrls, item.unboxingVideoUrl].filter(Boolean)} />{!item.imageUrls.length && !item.unboxingVideoUrl && <Text style={r.meta}>Chưa có bằng chứng đính kèm.</Text>}</View>
      {(item.shopResponse || item.returnInstructions || item.returnAddress || item.returnWarehouse || item.inspectionNotes || warehouseActions) && <View style={r.panel}>
        <View style={r.row}><View style={r.sectionIcon}><Icon name="package" size={18} color={colors.strong} /></View><Text style={[r.heading, { flex: 1 }]}>Gửi hàng về Shop</Text></View>
        {!!item.shopResponse && <Text style={r.meta}>{item.shopResponse}</Text>}
        {!!item.returnInstructions && <View style={r.instruction}><Icon name="file-text" size={16} color={colors.strong} /><Text style={[r.body, { flex: 1 }]}>{item.returnInstructions}</Text></View>}
        {(item.returnWarehouse || item.returnAddress) && <View style={r.address}><Icon name="map-pin" size={18} color={colors.strong} /><View style={{ flex: 1, gap: 4 }}><Text style={r.meta}>Kho nhận trả</Text>{item.returnWarehouse ? <><Text style={r.body}>{item.returnWarehouse.name} · {item.returnWarehouse.phone}</Text><Text style={r.meta}>{[item.returnWarehouse.address, item.returnWarehouse.wardName, item.returnWarehouse.districtName, item.returnWarehouse.provinceName].filter(Boolean).join(", ")}</Text></> : <Text style={r.body}>{item.returnAddress}</Text>}</View></View>}
        {!!item.shipByAt && <View style={r.deadline}><Icon name="clock" size={16} color={colors.strong} /><Text style={[r.meta, { flex: 1 }]}>Hạn gửi trả</Text><Text style={r.code}>{Number.isFinite(Date.parse(item.shipByAt)) ? new Date(item.shipByAt).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }) : "Chưa xác định"}</Text></View>}
        {!!item.inspectionNotes && <View style={r.info}><Text style={r.meta}>Kết quả kiểm tra</Text><Text style={r.body}>{item.inspectionNotes}</Text></View>}
        {warehouseActions}
        {shop && item.status === "SHOP_APPROVED" && !!item.shipByAt && <Text style={r.meta}>Hướng dẫn đã chốt theo hạn gửi trả.</Text>}
      </View>}
      {item.customerShipment && (
        <>
          <DetailLine
            label="Vận đơn trả"
            value={`${item.customerShipment.carrierName} · ${item.customerShipment.trackingNumber}`}
          />
          <DetailLine
            label="Trạng thái vận chuyển"
            value={item.customerShipment.providerStatus}
          />
          {item.customerShipment.receiptImageUrl && (
            <Evidence urls={[item.customerShipment.receiptImageUrl]} />
          )}
        </>
      )}
      {item.customerShipment?.provider &&
        action("pickup/sync", "Cập nhật đơn lấy hàng", "POST")}
      {customer && mayBookReturnPickup(item) && (
        <Button
          title="Đặt lịch shipper đến lấy hàng"
          disabled={command.busy}
          onPress={() =>
            setForm({
              title: "Thông tin lấy hàng trả",
              path: `/returns/${id}/pickup`,
              method: "POST",
              fields: [
                ...addressFields,
                ...["weight", "length", "width", "height"].map(
                  (key, index) => ({
                    key,
                    label: [
                      "Khối lượng (g)",
                      "Dài (cm)",
                      "Rộng (cm)",
                      "Cao (cm)",
                    ][index],
                    numeric: true,
                    initial: ["500", "15", "10", "5"][index],
                  }),
                ),
              ],
              schema: AddressInput.safeExtend({
                weight: z.coerce.number().int().min(1).max(19999),
                length: z.coerce.number().int().min(1).max(200),
                width: z.coerce.number().int().min(1).max(200),
                height: z.coerce.number().int().min(1).max(200),
              }),
            })
          }
        />
      )}
      {shop && item.status === "REQUESTED" && (
        <>
          <Button
            title="Duyệt yêu cầu"
            disabled={command.busy}
            onPress={() =>
              setForm({
                title: "Hướng xử lý gửi khách",
                path: `/orders/${item.orderId}/return-request/respond`,
                fields: [
                  {
                    key: "response",
                    label: "Hướng xử lý (ít nhất 10 ký tự)",
                    multiline: true,
                  },
                ],
                schema: z
                  .object({ response: required.min(10).max(1000) })
                  .transform((body) => ({ ...body, decision: "APPROVE" })),
              })
            }
          />
          <Button
            title="Từ chối yêu cầu"
            secondary
            disabled={command.busy}
            onPress={() =>
              setForm({
                title: "Lý do từ chối",
                path: `/orders/${item.orderId}/return-request/respond`,
                fields: [{ key: "response", label: "Lý do", multiline: true }],
                schema: z
                  .object({ response: required.min(10).max(1000) })
                  .transform((body) => ({ ...body, decision: "REJECT" })),
              })
            }
          />
        </>
      )}
      {reviewer && mayAssessReturnLiability(item.status) && (
        <Button
          title="Xác định trách nhiệm"
          secondary
          onPress={() =>
            setForm({
              title: "Kết luận trách nhiệm",
              path: `/admin/return-disputes/active-returns/${id}/liability`,
              fields: [
                { key: "liability", label: "Trách nhiệm", options: liability },
                { key: "notes", label: "Căn cứ xác minh", multiline: true },
              ],
              schema: z.object({
                liability: z.enum([
                  "LOGISTICS_FAULT",
                  "SHOP_FAULT",
                  "CUSTOMER_REASON",
                ]),
                notes: required.min(10).max(2000),
              }),
            })
          }
        />
      )}
      {customer &&
        item.status === "RETURN_SHIPPED" &&
        !item.customerShipment?.provider && (
          <Button
            title="Sửa mã vận đơn gửi trả"
            secondary
            onPress={() =>
              setForm({
                title: "Điều chỉnh vận đơn gửi trả",
                path: `/returns/${id}/return-shipment`,
                fields: [
                  {
                    key: "carrierName",
                    label: "Đơn vị vận chuyển",
                    initial: item.customerShipment?.carrierName,
                  },
                  {
                    key: "trackingNumber",
                    label: "Mã vận đơn",
                    initial: item.customerShipment?.trackingNumber,
                  },
                ],
                schema: z.object({
                  carrierName: required.min(2).max(100),
                  trackingNumber: required
                    .min(5)
                    .max(100)
                    .regex(/^[\p{L}\p{N}\s._\-/]+$/u),
                }),
              })
            }
          />
        )}
      {shop &&
        item.pickupSimulationEnabled &&
        item.customerShipment?.provider &&
        ["PICKUP_BOOKED", "RETURN_SHIPPED"].includes(item.status) &&
        action(
          "pickup/simulate",
          item.status === "PICKUP_BOOKED"
            ? "TEST: Shipper đã lấy hàng"
            : "TEST: Hàng đã đến Shop",
          "PATCH",
          { status: item.status === "PICKUP_BOOKED" ? "picked" : "delivered" },
        )}
      {shop &&
        item.status === "RETURN_SHIPPED" &&
        !item.customerShipment?.provider &&
        action("receipt", "Xác nhận Shop đã nhận hàng")}
      {shop &&
        item.status === "RETURN_RECEIVED" &&
        action("inspection/start", "Bắt đầu kiểm tra")}
      {shop && item.status === "INSPECTING" && (
        <Button
          title="Cập nhật kết quả kiểm tra"
          disabled={command.busy}
          onPress={() =>
            setForm({
              title: "Kết quả kiểm tra hàng trả",
              path: `/returns/${id}/inspection/result`,
              fields: [
                {
                  key: "resolution",
                  label: "Kết quả",
                  options: [
                    { value: "REFUND", label: "Hoàn tiền" },
                    { value: "EXCHANGE", label: "Đổi sản phẩm" },
                    { value: "REJECT", label: "Từ chối" },
                  ],
                },
                { key: "liability", label: "Trách nhiệm", options: liability },
                { key: "notes", label: "Biên bản kiểm tra", multiline: true },
              ],
              schema: z.object({
                resolution: z.enum(["REFUND", "EXCHANGE", "REJECT"]),
                liability: z.enum([
                  "LOGISTICS_FAULT",
                  "SHOP_FAULT",
                  "CUSTOMER_REASON",
                ]),
                notes: required.min(10).max(2000),
              }),
            })
          }
        />
      )}
      {shop && item.status === "EXCHANGE_PENDING" && (
        <Button
          title="Gửi sản phẩm đổi"
          onPress={() => shipmentForm("exchange-shipment")}
        />
      )}
      {item.exchangeShipment && (
        <DetailLine
          label="Vận đơn đổi sản phẩm"
          value={`${item.exchangeShipment.carrierName} · ${item.exchangeShipment.trackingNumber}`}
        />
      )}
      {item.refund && (
        <View style={r.panel}><View style={r.row}><Icon name="credit-card" size={20} color={colors.strong} /><Text style={[r.heading, { flex: 1 }]}>Hoàn tiền</Text><Text style={r.heading}>{money(item.refund.amount)}</Text></View><View style={[r.row, { justifyContent: "space-between" }]}><Text style={r.meta}>{({ WALLET: "Ví mua sắm", BANK_TRANSFER: "Chuyển khoản ngân hàng", ORIGINAL_PAYMENT: "Phương thức ban đầu" } as Record<string, string>)[item.refund.method] || "Theo phương thức đã ghi nhận"}</Text><Badge>{statusText(item.refund.status)}</Badge></View>{!!item.refund.failureReason && <Text style={r.meta}>{item.refund.failureReason}</Text>}</View>
      )}
      {customer &&
        (item.status === "EXCHANGE_SHIPPED" ||
          (item.status === "AWAITING_CUSTOMER_CONFIRMATION" &&
            item.refund?.status === "SUCCEEDED")) &&
        action("confirmation", "Xác nhận hoàn tất", "POST")}
      {customer && mayDispute && (
        <Button
          title="Gửi khiếu nại"
          secondary
          onPress={() =>
            setForm({
              title: "Nội dung khiếu nại",
              path: `/returns/${id}/disputes`,
              method: "POST",
              fields: [
                {
                  key: "reason",
                  label: "Lý do",
                  options: [
                    {
                      value: "UNJUSTIFIED_REJECTION",
                      label: "Từ chối không hợp lý",
                    },
                    { value: "WRONG_INSPECTION", label: "Kiểm tra sai" },
                    { value: "REFUND_PROBLEM", label: "Vấn đề hoàn tiền" },
                    { value: "DELIVERY_PROBLEM", label: "Vấn đề vận chuyển" },
                    { value: "OTHER", label: "Khác" },
                  ],
                },
                { key: "details", label: "Chi tiết", multiline: true },
              ],
              schema: z.object({
                reason: z.enum([
                  "UNJUSTIFIED_REJECTION",
                  "WRONG_INSPECTION",
                  "REFUND_PROBLEM",
                  "DELIVERY_PROBLEM",
                  "OTHER",
                ]),
                details: required.min(20).max(2000),
              }),
            })
          }
        />
      )}
      {item.dispute && (
        <View style={r.panel}><View style={[r.row, { justifyContent: "space-between" }]}><Text style={r.heading}>Khiếu nại</Text><ReturnStatus status={item.dispute.status} /></View>{!!item.dispute.resolutionNotes && <Text style={r.body}>{item.dispute.resolutionNotes}</Text>}{!!item.dispute.details && item.dispute.details !== item.shopResponse && <Text style={r.meta}>{item.dispute.details}</Text>}</View>
      )}
      {reviewer && item.dispute?.status === "OPEN" && (
        <Button
          title="Phân xử khiếu nại"
          onPress={() =>
            setForm({
              title: "Quyết định phân xử",
              path: `/admin/return-disputes/${item.dispute!.id}/resolve`,
              fields: [
                {
                  key: "ruling",
                  label: "Quyết định",
                  options: [
                    { value: "APPROVE_REFUND", label: "Hoàn tiền" },
                    { value: "APPROVE_EXCHANGE", label: "Đổi hàng" },
                    ...(!item.customerShipment?.receivedAt
                      ? [{ value: "UPHOLD_SHOP", label: "Giữ quyết định Shop" }]
                      : []),
                  ],
                },
                { key: "liability", label: "Trách nhiệm", options: liability },
                { key: "notes", label: "Căn cứ phân xử", multiline: true },
              ],
              schema: z.object({
                ruling: z.enum([
                  "APPROVE_REFUND",
                  "APPROVE_EXCHANGE",
                  "UPHOLD_SHOP",
                ]),
                liability: z.enum([
                  "LOGISTICS_FAULT",
                  "SHOP_FAULT",
                  "CUSTOMER_REASON",
                ]),
                notes: required.min(20).max(3000),
              }),
            })
          }
        />
      )}
      {reviewer &&
        ["REFUND_PENDING", "REFUND_FAILED"].includes(item.status) && (
          <Button
            title="Thử lại hoàn tiền"
            loading={command.busy}
            onPress={() =>
              void command.execute(
                `/admin/return-disputes/active-returns/${id}/refund/retry`,
                "POST",
              )
            }
          />
        )}
      <View style={r.panel}><Text style={r.heading}>Lịch sử xử lý</Text>{[...item.events].reverse().slice(0, allEvents ? undefined : 3).map(event => <View key={event.id} style={r.row}><Icon name="clock" size={14} color={colors.strong} /><View style={{ flex: 1, gap: 3 }}><Text accessibilityLabel={event.type} style={r.body}>{returnEventText(event.type)}</Text><Text style={r.meta}>{new Date(event.createdAt).toLocaleString("vi-VN")}</Text></View></View>)}{item.events.length > 3 && <Button title={allEvents ? "Thu gọn" : `Xem thêm ${item.events.length - 3} mốc`} secondary onPress={() => setAllEvents(value => !value)} />}</View>
      <ErrorNotice error={result.error || command.error} />
      {form && <CommandForm spec={form} close={() => setForm(null)} />}
    </>
  );
}
