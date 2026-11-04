import { useState } from "react";
import { Switch, Text, View } from "react-native";
import { z } from "zod";
import {
  Badge,
  Button,
  Caption,
  Card,
  Empty,
  ErrorNotice,
  Field,
  Screen,
  Title,
} from "../../components/ui";
import { ProductSchema, statusText } from "../../types/contracts";
import { AddressSchema, type Address } from "../customer/customer-contracts";
import {
  CommandForm,
  DetailLine,
  Evidence,
  QueryState,
  Sheet,
  https,
  required,
  useActor,
  useCommand,
  useResource,
  type CommandFormSpec,
} from "../common/shared";
import { SelectField } from "../common/SelectField";
import { useMobileNavigation } from "../../navigation/router";
import { validateInput } from "../../utils/validate-input";
import type { BusinessParams } from "../workspace/policy";
const Sample = z.object({
  id: z.string(),
  status: z.string(),
  recipientName: z.string().nullish(),
  recipientPhone: z.string().nullish(),
  shippingAddress: z.string(),
  trackingNumber: z.string().nullish(),
  carrier: z.string().nullish(),
  deadlineAt: z.string().nullish(),
  collaboratorId: z.string(),
  rejectedReason: z.string().nullish(),
  deliveryIssueReason: z.string().nullish(),
  product: z.object({
    id: z.string(),
    title: z.string(),
    store: z.object({ name: z.string() }),
  }),
  collaborator: z.object({ fullName: z.string() }).nullish(),
  videoAssets: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        urlOrContent: z.string(),
        status: z.string(),
        rejectionReason: z.string().nullish(),
      }),
    )
    .optional(),
});
const Eligibility = z.object({
  canRequest: z.boolean(),
  kycVerified: z.boolean(),
  hasSocialChannel: z.boolean(),
  blockReason: z.string().nullish(),
  channels: z.array(
    z.object({
      id: z.string(),
      channelName: z.string(),
      platformName: z.string(),
    }),
  ),
});
const CreateSample = z.object({
  productId: z.string().uuid(),
  productVariantId: z.string().uuid().optional(),
  recipientName: required.min(2).max(150),
  recipientPhone: z.string().regex(/^(?:0[35789]\d{8}|\+84[35789]\d{8})$/),
  recipientPhoneConfirmed: z.literal(true),
  shippingAddress: required.min(10).max(500),
  ghnProvinceId: z.number().int().positive(),
  ghnDistrictId: z.number().int().positive(),
  ghnWardCode: required,
  socialChannelId: z.string().uuid(),
  contentType: required.max(500),
  termsAccepted: z.literal(true),
});
export function SamplesScreen({ params }: { params: BusinessParams }) {
  const { user, store, reviewer } = useActor(),
    koc = user.role === "COLLABORATOR",
    shop = user.role === "SHOP_MANAGER";
  const [form, setForm] = useState<CommandFormSpec | null>(null),
    [create, setCreate] = useState(Boolean(params.productId)),
    [editing, setEditing] = useState<z.infer<typeof Sample> | null>(null),
    [status, setStatus] = useState("");
  const [selected, setSelected] = useState<string | null>(null),
    command = useCommand();
  const path = koc
    ? "/sample-requests/my"
    : reviewer
      ? "/sample-requests/admin"
      : `/sample-requests/shop?storeId=${store?.id || ""}`;
  const result = useResource(
    "samples",
    path,
    z.array(Sample),
    !shop || Boolean(store),
  );
  const eligibility = useResource(
    "sample-eligibility",
    "/sample-requests/my/eligibility",
    Eligibility,
    koc,
  );
  const row = result.data?.find((item) => item.id === selected);
  const reasonForm = (
    id: string,
    suffix: string,
    title: string,
    key = "reason",
    method = "PATCH",
  ) =>
    setForm({
      title,
      path: `/sample-requests/${id}/${suffix}`,
      method,
      fields: [{ key, label: "Lý do và căn cứ", multiline: true }],
      schema: z.object({ [key]: required.min(5).max(500) }),
    });
  const action = (
    id: string,
    suffix: string,
    title: string,
    body?: unknown,
    method = "PATCH",
  ) => (
    <Button
      title={title}
      secondary
      loading={command.busy}
      onPress={() =>
        void command.execute(`/sample-requests/${id}/${suffix}`, method, body)
      }
    />
  );
  return (
    <Screen scroll>
      <Title>Hàng mẫu & video review</Title>
      {koc && (
        <>
          <QueryState
            loading={eligibility.isLoading}
            error={eligibility.error}
            retry={() => void eligibility.refetch()}
          />
          <Caption>
            {eligibility.data?.canRequest
              ? "Bạn đủ điều kiện gửi yêu cầu xin mẫu."
              : eligibility.data?.blockReason ||
                "Cần xác minh KYC và liên kết kênh xã hội để xin mẫu."}
          </Caption>
          <Button
            title="Xin hàng mẫu"
            disabled={!eligibility.data?.canRequest}
            onPress={() => setCreate(true)}
          />
        </>
      )}
      <SelectField
        label="Trạng thái"
        value={status}
        options={[
          { value: "", label: "Tất cả" },
          ...[...new Set(result.data?.map((item) => item.status) || [])].map(
            (value) => ({ value, label: statusText(value) }),
          ),
        ]}
        onChange={setStatus}
      />
      <QueryState
        loading={result.isLoading}
        error={result.error}
        retry={() => void result.refetch()}
      />
      <ErrorNotice error={command.error} />
      {result.data?.length === 0 && <Empty />}
      {result.data
        ?.filter((item) => !status || item.status === status)
        .map((item) => (
          <Card key={item.id}>
            <Caption>{item.product.store.name}</Caption>
            <Title>{item.product.title}</Title>
            <Badge>{statusText(item.status)}</Badge>
            <Caption>{item.collaborator?.fullName}</Caption>
            {item.deadlineAt && (
              <Caption>
                Hạn nộp video:{" "}
                {new Date(item.deadlineAt).toLocaleString("vi-VN")}
              </Caption>
            )}
            <Button
              title="Xem và xử lý"
              secondary
              onPress={() => setSelected(item.id)}
            />
          </Card>
        ))}
      {row && (
        <Sheet
          title={row.product.title}
          close={() => {
            if (!command.busy) setSelected(null);
          }}
        >
          <Badge>{statusText(row.status)}</Badge>
          <DetailLine
            label="Người nhận"
            value={`${row.recipientName || ""} · ${row.recipientPhone || ""}`}
          />
          <Text>{row.shippingAddress}</Text>
          <DetailLine label="Vận đơn" value={row.trackingNumber} />
          <DetailLine label="Lý do từ chối" value={row.rejectedReason} />
          {row.deadlineAt && (
            <DetailLine
              label="Hạn video"
              value={new Date(row.deadlineAt).toLocaleString("vi-VN")}
            />
          )}
          {koc &&
            row.status === "PENDING" &&
            action(row.id, "cancel", "Hủy yêu cầu xin mẫu")}
          {koc && row.status === "PENDING" && (
            <Button
              title="Sửa địa chỉ & cam kết"
              secondary
              onPress={() => {
                setEditing(row);
                setSelected(null);
              }}
            />
          )}
          {koc && row.status === "SHIPPED" && (
            <>
              {action(row.id, "receive", "Tôi đã nhận hàng mẫu")}
              <Button
                title="Báo sự cố giao nhận"
                secondary
                onPress={() =>
                  reasonForm(row.id, "delivery-issue", "Sự cố giao hàng")
                }
              />
            </>
          )}
          {koc &&
            ["RECEIVED", "REVISION_REQUIRED", "OVERDUE"].includes(
              row.status,
            ) && (
              <Button
                title="Nộp video review"
                onPress={() =>
                  setForm({
                    title: "Nộp video công khai",
                    path: `/sample-requests/${row.id}/video`,
                    method: "POST",
                    fields: [
                      { key: "title", label: "Tiêu đề" },
                      { key: "videoUrl", label: "Link video công khai HTTPS" },
                      { key: "caption", label: "Nội dung", multiline: true },
                    ],
                    schema: z.object({
                      title: required.max(255),
                      videoUrl: https.max(2000),
                      caption: z.string().max(2000),
                    }),
                  })
                }
              />
            )}
          {shop && row.status === "PENDING" && (
            <>
              {action(row.id, "approve", "Duyệt cấp mẫu")}
              <Button
                title="Từ chối yêu cầu"
                secondary
                onPress={() =>
                  reasonForm(
                    row.id,
                    "reject",
                    "Từ chối cấp mẫu",
                    "rejectedReason",
                  )
                }
              />
            </>
          )}
          {shop && row.status === "APPROVED" && (
            <>
              <Button
                title="Nhập mã vận đơn"
                secondary
                onPress={() =>
                  setForm({
                    title: "Gửi hàng mẫu",
                    path: `/sample-requests/${row.id}/ship`,
                    fields: [
                      { key: "trackingNumber", label: "Mã vận đơn" },
                      { key: "carrier", label: "Đơn vị vận chuyển" },
                    ],
                    schema: z.object({
                      trackingNumber: required.max(100),
                      carrier: required.max(50),
                    }),
                  })
                }
              />
              <Button
                title="Tạo vận đơn GHN TEST"
                secondary
                loading={command.busy}
                onPress={() =>
                  void command.execute(
                    `/shipping/ghn/create-sample/${row.id}`,
                    "POST",
                    { environment: "TEST" },
                  )
                }
              />
            </>
          )}
          {shop &&
            ["RECEIVED", "REVISION_REQUIRED", "OVERDUE"].includes(
              row.status,
            ) && (
              <>
                <Button
                  title="Gia hạn video"
                  secondary
                  onPress={() =>
                    setForm({
                      title: "Gia hạn video",
                      path: `/sample-requests/${row.id}/extend-deadline`,
                      fields: [
                        {
                          key: "deadlineAt",
                          label:
                            "Hạn mới (ISO, ví dụ 2026-11-20T17:00:00+07:00)",
                        },
                        { key: "reason", label: "Lý do", multiline: true },
                      ],
                      schema: z.object({
                        deadlineAt: z.string().datetime({ offset: true }),
                        reason: required.max(500),
                      }),
                    })
                  }
                />
                <Button
                  title="Báo cáo vi phạm"
                  secondary
                  onPress={() =>
                    reasonForm(
                      row.id,
                      "report-violation",
                      "Báo cáo nghĩa vụ mẫu",
                      "reason",
                      "POST",
                    )
                  }
                />
              </>
            )}
          {row.videoAssets?.map((asset) => (
            <Card key={asset.id}>
              <Title>{asset.title}</Title>
              <Badge>{statusText(asset.status)}</Badge>
              <Evidence urls={[asset.urlOrContent]} />
              <Text>{asset.rejectionReason}</Text>
              {(shop || reviewer) && (
                <>
                  <Button
                    title="Nghiệm thu video"
                    secondary
                    loading={command.busy}
                    onPress={() =>
                      void command.execute(
                        `/media/${asset.id}/review`,
                        "PATCH",
                        { status: "APPROVED" },
                      )
                    }
                  />
                  <Button
                    title="Yêu cầu sửa video"
                    secondary
                    onPress={() =>
                      setForm({
                        title: "Nội dung cần sửa",
                        path: `/media/${asset.id}/review`,
                        fields: [
                          {
                            key: "rejectionReason",
                            label: "Lý do",
                            multiline: true,
                          },
                        ],
                        schema: z
                          .object({
                            rejectionReason: required.min(5).max(2000),
                          })
                          .transform((body) => ({
                            ...body,
                            status: "REJECTED",
                          })),
                      })
                    }
                  />
                </>
              )}
            </Card>
          ))}
          {reviewer && (
            <>
              <Button
                title="Xử lý nghĩa vụ hàng mẫu"
                onPress={() =>
                  setForm({
                    title: "Quyết định trọng tài",
                    path: `/sample-requests/admin/${row.id}/resolve`,
                    fields: [
                      {
                        key: "action",
                        label: "Quyết định",
                        options: [
                          { value: "EXTEND_DEADLINE", label: "Gia hạn" },
                          {
                            value: "CANCEL_OBLIGATION",
                            label: "Miễn nghĩa vụ",
                          },
                          {
                            value: "RESOLVE_DELIVERY_ISSUE",
                            label: "Xử lý giao nhận",
                          },
                          {
                            value: "BLOCK_SAMPLE_REQUESTS",
                            label: "Khóa quyền xin mẫu",
                          },
                          { value: "DISMISS_REPORT", label: "Bác báo cáo" },
                        ],
                      },
                      { key: "reason", label: "Lý do", multiline: true },
                      {
                        key: "deadlineAt",
                        label: "Hạn ISO mới (chỉ khi gia hạn)",
                      },
                    ],
                    schema: z
                      .object({
                        action: z.enum([
                          "EXTEND_DEADLINE",
                          "CANCEL_OBLIGATION",
                          "RESOLVE_DELIVERY_ISSUE",
                          "BLOCK_SAMPLE_REQUESTS",
                          "DISMISS_REPORT",
                        ]),
                        reason: required.max(500),
                        deadlineAt: z.union([
                          z.literal(""),
                          z.string().datetime({ offset: true }),
                        ]),
                      })
                      .refine(
                        (body) =>
                          body.action !== "EXTEND_DEADLINE" ||
                          Boolean(body.deadlineAt),
                        "Gia hạn cần nhập hạn mới.",
                      )
                      .transform((body) => ({
                        ...body,
                        deadlineAt: body.deadlineAt || undefined,
                      })),
                  })
                }
              />
              <Button
                title="Mở khóa quyền nhận mẫu"
                secondary
                onPress={() =>
                  reasonForm(
                    `admin/${row.collaboratorId}`,
                    "unblock",
                    "Mở khóa KOL",
                  )
                }
              />
            </>
          )}
          <ErrorNotice error={command.error} />
        </Sheet>
      )}
      {form && <CommandForm spec={form} close={() => setForm(null)} />}
      {(create || editing) && koc && (
        <Sheet
          title={editing ? "Sửa thông tin yêu cầu mẫu" : "Xin sản phẩm mẫu"}
          close={() => {
            if (!command.busy) {
              setCreate(false);
              setEditing(null);
            }
          }}
        >
          <SampleRequestForm
            initialProductId={editing?.product.id || params.productId}
            editId={editing?.id}
            eligibility={eligibility.data}
            done={() => {
              setCreate(false);
              setEditing(null);
            }}
          />
        </Sheet>
      )}
    </Screen>
  );
}
function SampleRequestForm({
  initialProductId,
  editId,
  eligibility,
  done,
}: {
  initialProductId?: string;
  editId?: string;
  eligibility?: z.infer<typeof Eligibility>;
  done(): void;
}) {
  const navigation = useMobileNavigation(),
    command = useCommand();
  const catalog = useResource(
    "sample-products",
    "/public/products?limit=100&page=1",
    z.object({ items: z.array(ProductSchema) }),
  );
  const addresses = useResource(
    "addresses",
    "/customer/addresses",
    z.array(AddressSchema),
  );
  const [productId, setProductId] = useState(initialProductId || ""),
    [variantId, setVariantId] = useState(""),
    [addressId, setAddressId] = useState("");
  const [channel, setChannel] = useState(""),
    [content, setContent] = useState(""),
    [confirmed, setConfirmed] = useState(false);
  const product = catalog.data?.items.find((item) => item.id === productId),
    address: Address | undefined = addresses.data?.find(
      (item) => item.id === addressId,
    );
  return (
    <>
      <QueryState
        loading={catalog.isLoading || addresses.isLoading}
        error={catalog.error || addresses.error}
        retry={() => {
          void catalog.refetch();
          void addresses.refetch();
        }}
      />
      <SelectField
        label="Sản phẩm"
        value={productId}
        options={(catalog.data?.items || []).map((item) => ({
          value: item.id,
          label: item.title,
        }))}
        onChange={(id) => {
          setProductId(id);
          setVariantId("");
        }}
        disabled={command.busy || Boolean(editId)}
      />
      {!editId && product?.variants?.length ? (
        <SelectField
          label="Phân loại mẫu"
          value={variantId}
          options={product.variants.map((item) => ({
            value: item.id,
            label: item.name,
          }))}
          onChange={setVariantId}
          disabled={command.busy}
        />
      ) : null}
      <SelectField
        label="Địa chỉ nhận"
        value={addressId}
        options={(addresses.data || []).map((item) => ({
          value: item.id,
          label: `${item.fullName} · ${item.detailAddress}, ${item.wardName}`,
        }))}
        onChange={setAddressId}
        disabled={command.busy}
      />
      <Button
        title="Quản lý sổ địa chỉ"
        secondary
        disabled={command.busy}
        onPress={() => {
          done();
          navigation.navigate("Business", { feature: "addresses" });
        }}
      />
      <SelectField
        label="Kênh đăng video"
        value={channel}
        options={(eligibility?.channels || []).map((item) => ({
          value: item.id,
          label: `${item.channelName} · ${item.platformName}`,
        }))}
        onChange={setChannel}
        disabled={command.busy}
      />
      <Field
        label="Nội dung dự kiến"
        value={content}
        onChangeText={setContent}
        multiline
        editable={!command.busy}
      />
      <View>
        <Text>
          Tôi xác nhận số điện thoại liên hệ được và cam kết nộp video trong 14
          ngày sau khi nhận mẫu.
        </Text>
        <Switch
          value={confirmed}
          onValueChange={setConfirmed}
          disabled={command.busy}
        />
      </View>
      <ErrorNotice error={command.error} />
      <Button
        title={editId ? "Lưu thông tin yêu cầu" : "Gửi yêu cầu xin mẫu"}
        loading={command.busy}
        disabled={(!editId && !eligibility?.canRequest) || !confirmed}
        onPress={() =>
          void command.execute(
            editId ? `/sample-requests/${editId}/details` : "/sample-requests",
            editId ? "PATCH" : "POST",
            () =>
              validateInput(
                editId
                  ? CreateSample.omit({
                      productId: true,
                      productVariantId: true,
                    })
                  : CreateSample,
                {
                  productId,
                  ...(variantId ? { productVariantId: variantId } : {}),
                  recipientName: address?.fullName,
                  recipientPhone: address?.phoneNumber,
                  recipientPhoneConfirmed: confirmed,
                  shippingAddress: address
                    ? [
                        address.detailAddress,
                        address.wardName,
                        address.districtName,
                        address.provinceName,
                      ].join(", ")
                    : "",
                  ghnProvinceId: Number(address?.provinceCode),
                  ghnDistrictId: Number(address?.districtCode),
                  ghnWardCode: address?.wardCode,
                  socialChannelId: channel,
                  contentType: content,
                  termsAccepted: confirmed,
                },
              ),
            done,
          )
        }
      />
    </>
  );
}
