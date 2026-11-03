import { useState } from "react";
import { Text } from "react-native";
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
        }))
    : (reviewer ? oversightRows : queue.data?.items)?.map((item) => ({
        id: item.id,
        title: item.order.externalOrderSn,
        status: item.status,
      }));
  return (
    <Screen scroll>
      <Title>Trả hàng & khiếu nại</Title>
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
          <Title>{item.title}</Title>
          <Badge>{statusText(item.status)}</Badge>
          <Button
            title="Xem và xử lý"
            secondary
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
        <Sheet title="Hồ sơ đổi trả" close={() => setSelected("")}>
          <ReturnDetail id={selected} />
        </Sheet>
      )}
    </Screen>
  );
}
function ReturnDetail({ id }: { id: string }) {
  const { user, reviewer } = useActor(),
    command = useCommand(),
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
  return (
    <>
      <Title>{item.order.externalOrderSn}</Title>
      <Badge>{statusText(item.status)}</Badge>
      <ReturnTimeline status={item.status} />
      <DetailLine label="Gian hàng" value={item.order.storeName} />
      <DetailLine
        label="Lý do"
        value={
          (
            {
              DAMAGED: "Hàng hư hỏng",
              WRONG_ITEM: "Giao sai sản phẩm",
              EXPIRED: "Hàng hết hạn",
              OTHER: "Lý do khác",
            } as Record<string, string>
          )[item.reason] || item.reason
        }
      />
      <Text>{item.details}</Text>
      <Evidence urls={[...item.imageUrls, item.unboxingVideoUrl]} />
      <DetailLine label="Phản hồi Shop" value={item.shopResponse} />
      <DetailLine label="Hướng dẫn gửi trả" value={item.returnInstructions} />
      <DetailLine label="Địa chỉ nhận trả" value={item.returnAddress} />
      {item.shipByAt && (
        <DetailLine
          label="Hạn gửi trả"
          value={new Date(item.shipByAt).toLocaleString("vi-VN")}
        />
      )}
      {item.returnWarehouse && (
        <DetailLine
          label="Kho nhận trả"
          value={Object.values(item.returnWarehouse).join(", ")}
        />
      )}
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
              schema: AddressInput.extend({
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
      {shop && item.status === "SHOP_APPROVED" && (
        <>
          <Button
            title="Cập nhật kho nhận trả"
            secondary
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
          />
          <Button
            title="Cập nhật hướng dẫn"
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
      <DetailLine label="Biên bản kiểm tra" value={item.inspectionNotes} />
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
        <Card>
          <Title>Hoàn tiền {money(item.refund.amount)}</Title>
          <DetailLine label="Phương thức" value={item.refund.method} />
          <DetailLine
            label="Trạng thái"
            value={statusText(item.refund.status)}
          />
          <Text>{item.refund.failureReason}</Text>
        </Card>
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
        <>
          <Title>Khiếu nại · {statusText(item.dispute.status)}</Title>
          <Text>{item.dispute.details}</Text>
          <Text>{item.dispute.resolutionNotes}</Text>
        </>
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
      <Title>Lịch sử hồ sơ</Title>
      {item.events.map((event) => (
        <Caption key={event.id}>
          {statusText(event.type)} ·{" "}
          {new Date(event.createdAt).toLocaleString("vi-VN")}
        </Caption>
      ))}
      <ErrorNotice error={result.error || command.error} />
      {form && <CommandForm spec={form} close={() => setForm(null)} />}
    </>
  );
}
