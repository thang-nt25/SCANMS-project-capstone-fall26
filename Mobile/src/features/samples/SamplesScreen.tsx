import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
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
import { statusText } from "../../types/contracts";
import { Sample, Eligibility } from "./sample-contracts";
import { SampleRequestForm } from "./SampleRequestForm";
import { ProductPhoto } from "../../components/ProductPhoto";
import { Icon } from "../../components/commerce";
import { colors } from "../../theme/tokens";
import { sampleStyles as ss } from "./sample-styles";
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
import { ShopSampleProducts } from "./ShopSampleProducts";
import type { BusinessParams } from "../workspace/policy";
export function SamplesScreen({ params }: { params: BusinessParams }) {
  const [shopTab, setShopTab] = useState<"requests" | "products">("requests");
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
  const visible = (result.data || []).filter(item => !status || (status === "processing" ? ["PENDING", "APPROVED", "SHIPPED", "DELIVERY_ISSUE"].includes(item.status) : status === "video" ? ["RECEIVED", "VIDEO_SUBMITTED", "REVISION_REQUIRED", "OVERDUE"].includes(item.status) : status === "closed" ? ["CANCELLED", "REJECTED"].includes(item.status) : item.status === status));
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
      {shop && <View style={{ flexDirection: "row", gap: 8 }}>{[{ key: "requests" as const, label: "Yêu cầu KOL" }, { key: "products" as const, label: "Sản phẩm cấp mẫu" }].map(tab => <Pressable key={tab.key} accessibilityRole="tab" accessibilityState={{ selected: shopTab === tab.key }} onPress={() => setShopTab(tab.key)} style={[ss.pill, { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center" }, shopTab === tab.key && ss.active]}><Text style={[ss.name, { fontSize: 13 }]}>{tab.label}</Text></Pressable>)}</View>}
      {shop && shopTab === "products" ? <ShopSampleProducts storeId={store?.id} /> : <>
      {koc && (
        <>
          <QueryState
            loading={eligibility.isLoading}
            error={eligibility.error}
            retry={() => void eligibility.refetch()}
          />
          <View style={ss.card}>
            <View style={ss.row}><View style={ss.icon}><Icon name="package" size={20} color={colors.strong} /></View><View style={[ss.flex, { paddingRight: 4 }]}><Text style={[ss.heading, { fontSize: 16 }]}>Trải nghiệm & sáng tạo</Text><Text style={ss.note}>Theo dõi mẫu và video của bạn</Text></View></View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {[{ label: "Đang xử lý", count: result.data?.filter(item => ["PENDING", "APPROVED", "SHIPPED", "DELIVERY_ISSUE"].includes(item.status)).length }, { label: "Cần nộp video", count: result.data?.filter(item => ["RECEIVED", "REVISION_REQUIRED", "OVERDUE"].includes(item.status)).length }, { label: "Hoàn tất", count: result.data?.filter(item => item.status === "COMPLETED").length }].map(stat => <View key={stat.label} style={ss.summary}><Text style={[ss.heading, { fontSize: 20 }]}>{stat.count ?? "—"}</Text><Text style={ss.tiny}>{stat.label}</Text></View>)}
            </View>
            <View style={ss.line} />
            <View style={ss.row}><Icon name={eligibility.data?.canRequest ? "check-circle" : "info"} size={16} color={colors.strong} /><Text style={[ss.note, { flex: 1 }]}>{eligibility.isLoading ? "Đang kiểm tra điều kiện…" : eligibility.data?.canRequest ? "Hồ sơ đủ điều kiện gửi yêu cầu xin mẫu." : eligibility.data?.blockReason || "Cần KYC và kênh xã hội hợp lệ."}</Text></View>
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: !eligibility.data?.canRequest }} disabled={!eligibility.data?.canRequest} style={[ss.cta, { opacity: eligibility.data?.canRequest ? 1 : 0.5 }]} onPress={() => setCreate(true)}><Icon name="plus" size={18} color={colors.strong} /><Text style={ss.name}>Xin sản phẩm mẫu</Text></Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>
            {[{ value: "", label: "Tất cả" }, { value: "processing", label: "Đang xử lý" }, { value: "video", label: "Video review" }, { value: "COMPLETED", label: "Hoàn tất" }, { value: "closed", label: "Đã đóng" }].map(tab => <Pressable key={tab.value} accessibilityRole="tab" accessibilityState={{ selected: status === tab.value }} onPress={() => setStatus(tab.value)} style={[ss.pill, status === tab.value && ss.active]}><Text style={[ss.note, status === tab.value && { color: colors.ink, fontWeight: "600" }]}>{tab.label}</Text></Pressable>)}
          </ScrollView>
        </>
      )}
      {!koc && <SelectField
        label="Trạng thái"
        hideLabel
        compact
        renderTrigger={open => <Pressable accessibilityRole="button" accessibilityLabel="Lọc trạng thái yêu cầu hàng mẫu" onPress={open} style={ss.select}><View style={ss.icon}><Icon name="sliders" size={18} color={colors.strong} /></View><View style={ss.flex}><Text style={ss.name}>{status ? statusText(status) : "Tất cả yêu cầu"}</Text><Text style={ss.tiny}>Lọc trạng thái hàng mẫu</Text></View><Icon name="chevron-down" size={18} color={colors.muted} /></Pressable>}
        value={status}
        options={[
          { value: "", label: "Tất cả" },
          ...[...new Set(result.data?.map((item) => item.status) || [])].map(
            (value) => ({ value, label: statusText(value) }),
          ),
        ]}
        onChange={setStatus}
      />}
      <QueryState
        loading={result.isLoading}
        error={result.error}
        retry={() => void result.refetch()}
      />
      <ErrorNotice error={command.error} />
      {!result.isLoading && !result.error && result.data && visible.length === 0 && <View style={ss.card}><View style={[ss.empty, { paddingVertical: 22 }]}><View style={[ss.icon, { width: 48, height: 48, borderRadius: 16 }]}><Icon name="package" size={24} color={colors.strong} /></View><Text style={ss.heading}>{result.data.length ? "Chưa có yêu cầu ở nhóm này" : "Chưa có yêu cầu hàng mẫu"}</Text><Text style={[ss.note, { textAlign: "center" }]}>{result.data.length ? "Đổi bộ lọc để xem các yêu cầu khác." : shop ? "Yêu cầu xin mẫu của KOL sẽ hiển thị tại đây." : reviewer ? "Chưa có hồ sơ hàng mẫu cần theo dõi." : "Chọn sản phẩm và gửi kế hoạch video đến Shop."}</Text>{!!status && <Button title="Xem tất cả yêu cầu" soft onPress={() => setStatus("")} />}</View></View>}
      {visible.map((item) => (
          <View key={item.id} style={ss.card}>
            <View style={ss.row}><ProductPhoto uri={item.product.imageUrl} style={ss.photo} resizeMode="contain" /><View style={ss.flex}><Text numberOfLines={2} style={ss.name}>{item.product.title}</Text><Text style={ss.tiny}>{item.product.store.name}</Text>{item.productVariant?.name && <Text style={ss.tiny}>{item.productVariant.name}</Text>}</View></View>
            <View style={ss.row}><Badge>{statusText(item.status)}</Badge><View style={{ flex: 1 }} />{item.createdAt && <Text style={ss.tiny}>{new Date(item.createdAt).toLocaleDateString("vi-VN")}</Text>}</View>
            {item.deadlineAt && <View style={ss.soft}><Text style={ss.note}>Hạn nộp video: {new Date(item.deadlineAt).toLocaleString("vi-VN")}</Text></View>}
            {item.trackingNumber && <Text style={ss.note}>{item.carrier || "Vận đơn"}: {item.trackingNumber}</Text>}
            {item.rejectedReason && <Text style={ss.note}>Lý do: {item.rejectedReason}</Text>}
            {!koc && <Caption>{item.collaborator?.fullName}</Caption>}
            <Pressable accessibilityRole="button" onPress={() => setSelected(item.id)} style={[ss.row, { minHeight: 42, borderTopWidth: 1, borderColor: colors.line, paddingTop: 8 }]}><Text style={[ss.link, { flex: 1 }]}>{["RECEIVED", "REVISION_REQUIRED", "OVERDUE"].includes(item.status) && koc ? "Xem yêu cầu & nộp video" : "Xem chi tiết yêu cầu"}</Text><Icon name="chevron-right" size={17} color={colors.strong} /></Pressable>
          </View>
        ))}
      {row && (
        <Sheet
          title={row.product.title}
          close={() => {
            if (!command.busy) setSelected(null);
          }}
        >
          <View style={ss.row}><ProductPhoto uri={row.product.imageUrl} style={ss.photo} resizeMode="contain" /><View style={ss.flex}><Text style={ss.name}>{row.product.store.name}</Text>{row.productVariant?.name && <Text style={ss.note}>{row.productVariant.name}</Text>}{row.createdAt && <Text style={ss.tiny}>Gửi {new Date(row.createdAt).toLocaleString("vi-VN")}</Text>}</View></View>
          <Badge>{statusText(row.status)}</Badge>
          <DetailLine
            label="Người nhận"
            value={`${row.recipientName || ""} · ${row.recipientPhone || ""}`}
          />
          <Text>{row.shippingAddress}</Text>
          <DetailLine label="Kênh cam kết" value={[row.socialChannelNameSnapshot || row.socialChannel?.channelName, row.socialPlatformSnapshot || row.socialChannel?.platformName].filter(Boolean).join(" · ") || undefined} />
          <DetailLine label="Kế hoạch nội dung" value={row.contentType} />
          <DetailLine label="Vận đơn" value={row.trackingNumber} />
          {row.carrier && <DetailLine label="Đơn vị vận chuyển" value={row.carrier} />}
          {row.deliveryIssueReason && <DetailLine label="Sự cố giao nhận" value={row.deliveryIssueReason} />}
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
          <SampleRequestForm
            initialProductId={editing?.product.id || params.productId}
            initialSample={editing || undefined}
            eligibility={eligibility.data}
            done={() => {
              setCreate(false);
              setEditing(null);
            }}
          />
      )}
      </>}
    </Screen>
  );
}
