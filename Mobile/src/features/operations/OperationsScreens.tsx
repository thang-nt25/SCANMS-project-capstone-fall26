import {
  ExpandableRecord,
  FilterTabs,
  SearchToolbar,
  InfoLine as DetailLine,
  SectionTitle as Title,
} from "../../components/RecordList";
import { CompactEvidence as Evidence } from "../common/CompactEvidence";
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
} from "../../components/ui";
import { money, statusText } from "../../types/contracts";
import {
  CompactCommandForm as CommandForm,
  QueryState,
  required,
  useActor,
  useCommand,
  useResource,
  type CommandFormSpec,
} from "../common/shared";
const Overview = z.object({
  metrics: z.object({
    totalOrders: z.number(),
    totalClicks: z.number(),
    grossRevenue: z.number(),
    totalCommission: z.number(),
    conversionRate: z.number(),
  }),
});
export function DashboardScreen() {
  const { user, store } = useActor(),
    [days, setDays] = useState(30);
  const result = useResource(
    "dashboard",
    `/dashboard/realtime/overview?days=${days}${user.role === "SHOP_MANAGER" && store ? `&storeId=${store.id}` : ""}`,
    Overview,
    user.role !== "SHOP_MANAGER" || Boolean(store),
  );
  return (
    <Screen scroll compact>
      <FilterTabs
        label="Khoảng thời gian"
        value={String(days)}
        options={[7, 30, 90].map((value) => ({
          value: String(value),
          label: `${value} ngày`,
        }))}
        onChange={(value) => setDays(Number(value))}
      />
      <QueryState
        loading={result.isLoading}
        error={result.error}
        retry={() => void result.refetch()}
      />
      {result.data && (
        <>
          <Card>
            <DetailLine
              label="Tổng đơn"
              value={result.data.metrics.totalOrders}
            />
            <DetailLine
              label="Giá trị đơn đã giao / hoàn tất"
              value={money(result.data.metrics.grossRevenue)}
            />
          </Card>
          <Card>
            <DetailLine
              label="Hoa hồng"
              value={money(result.data.metrics.totalCommission)}
            />
            <DetailLine
              label="Lượt nhấp"
              value={result.data.metrics.totalClicks}
            />
            <DetailLine
              label="Chuyển đổi"
              value={`${result.data.metrics.conversionRate}%`}
            />
          </Card>
          <Caption>
            Thống kê trong kỳ đã chọn theo phạm vi tài khoản và gian hàng.
          </Caption>
        </>
      )}
    </Screen>
  );
}
const Review = z.object({
  id: z.string(),
  customerName: z.string().nullish(),
  rating: z.number(),
  comment: z.string().nullish(),
  images: z.array(z.string()).optional(),
  status: z.string().optional(),
  isApproved: z.boolean(),
  product: z.object({ title: z.string() }),
  reply: z.object({ comment: z.string() }).nullish(),
  reports: z
    .array(
      z.object({
        id: z.string(),
        reason: z.string(),
        details: z.string(),
        resolved: z.boolean(),
      }),
    )
    .optional(),
});
export function ReviewsScreen() {
  const { reviewer } = useActor(),
    [form, setForm] = useState<CommandFormSpec | null>(null);
  const result = useResource(
    "reviews",
    "/products/reviews/moderation",
    z.array(Review),
  );
  return (
    <Screen scroll compact>
      <QueryState
        loading={result.isLoading}
        error={result.error}
        retry={() => void result.refetch()}
      />
      {result.data?.length === 0 && <Empty />}
      {result.data?.map((item) => (
        <ExpandableRecord
          key={item.id}
          title={item.product.title}
          subtitle={`${item.customerName || "Khách hàng"} · ${item.rating} ★`}
          badge={statusText(
            item.status || (item.isApproved ? "APPROVED" : "PENDING"),
          )}
          icon="star"
        >
          <Caption>
            {item.customerName} · {item.rating} ★
          </Caption>
          <Badge>
            {statusText(
              item.status || (item.isApproved ? "APPROVED" : "PENDING"),
            )}
          </Badge>
          <Text>{item.comment}</Text>
          <Evidence urls={item.images || []} />
          {item.reply && <Text>Shop: {item.reply.comment}</Text>}
          {reviewer ? (
            <Button
              title="Kiểm duyệt đánh giá"
              onPress={() =>
                setForm({
                  title: "Kiểm duyệt đánh giá",
                  path: `/products/reviews/${item.id}/moderation`,
                  fields: [
                    {
                      key: "status",
                      label: "Trạng thái",
                      options: ["APPROVED", "REJECTED", "HIDDEN"].map(
                        (value) => ({ value, label: statusText(value) }),
                      ),
                    },
                    {
                      key: "reason",
                      label: "Lý do (ít nhất 10 ký tự)",
                      multiline: true,
                    },
                  ],
                  schema: z.object({
                    status: z.enum(["APPROVED", "REJECTED", "HIDDEN"]),
                    reason: required.min(10).max(500),
                  }),
                })
              }
            />
          ) : (
            <>
              <Button
                title="Trả lời đánh giá"
                secondary
                onPress={() =>
                  setForm({
                    title: "Phản hồi của Shop",
                    path: `/products/reviews/${item.id}/reply`,
                    method: "POST",
                    fields: [
                      { key: "comment", label: "Phản hồi", multiline: true },
                    ],
                    schema: z.object({ comment: required.min(3).max(1000) }),
                  })
                }
              />
              <Button
                title="Báo cáo đánh giá"
                secondary
                onPress={() =>
                  setForm({
                    title: "Báo cáo đánh giá",
                    path: `/products/reviews/${item.id}/report`,
                    method: "POST",
                    fields: [
                      {
                        key: "reason",
                        label: "Lý do",
                        options: [
                          "ABUSE",
                          "PERSONAL_DATA",
                          "SPAM",
                          "FAKE",
                          "UNRELATED",
                          "OTHER",
                        ].map((value) => ({
                          value,
                          label: (
                            {
                              ABUSE: "Lạm dụng",
                              PERSONAL_DATA: "Lộ thông tin cá nhân",
                              SPAM: "Spam",
                              FAKE: "Giả mạo",
                              UNRELATED: "Không liên quan",
                              OTHER: "Khác",
                            } as Record<string, string>
                          )[value],
                        })),
                      },
                      { key: "details", label: "Chi tiết", multiline: true },
                    ],
                    schema: z.object({
                      reason: z.enum([
                        "ABUSE",
                        "PERSONAL_DATA",
                        "SPAM",
                        "FAKE",
                        "UNRELATED",
                        "OTHER",
                      ]),
                      details: required.min(10).max(2000),
                    }),
                  })
                }
              />
            </>
          )}
          {item.reports
            ?.filter((report) => !report.resolved)
            .map((report) => (
              <Caption key={report.id}>
                Báo cáo: {report.reason} · {report.details}
              </Caption>
            ))}
          {reviewer && item.reports?.some((report) => !report.resolved) && (
            <Button
              title="Giải quyết báo cáo"
              secondary
              onPress={() =>
                setForm({
                  title: "Giải quyết báo cáo",
                  path: `/products/reviews/${item.id}/resolve`,
                  method: "POST",
                  fields: [
                    {
                      key: "decision",
                      label: "Quyết định",
                      options: [
                        { value: "KEEP", label: "Giữ đánh giá" },
                        { value: "HIDE", label: "Ẩn đánh giá" },
                      ],
                    },
                    { key: "reason", label: "Căn cứ", multiline: true },
                  ],
                  schema: z.object({
                    decision: z.enum(["KEEP", "HIDE"]),
                    reason: required.min(10).max(2000),
                  }),
                })
              }
            />
          )}
        </ExpandableRecord>
      ))}
      {form && <CommandForm spec={form} close={() => setForm(null)} />}
    </Screen>
  );
}
const Audit = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      actionNameVi: z.string(),
      severity: z.string(),
      createdAt: z.string(),
      actor: z.object({ name: z.string() }).nullish(),
      description: z.string(),
    }),
  ),
  pagination: z.object({ totalPages: z.number() }),
});
export function AuditScreen() {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [keyword, setKeyword] = useState("");
  const result = useResource(
    "audit",
    `/audit-logs?page=${page}&limit=20&search=${encodeURIComponent(keyword)}`,
    Audit,
  );
  return (
    <Screen scroll compact>
      <SearchToolbar
        value={search}
        onChange={setSearch}
        placeholder="Tìm nhật ký…"
        onSubmit={() => {
          setKeyword(search.trim());
          setPage(1);
        }}
      />
      <QueryState
        loading={result.isLoading}
        error={result.error}
        retry={() => void result.refetch()}
      />
      {result.data?.items.length === 0 && <Empty />}
      {result.data?.items.map((item) => (
        <ExpandableRecord
          key={item.id}
          title={item.actionNameVi}
          subtitle={`${item.actor?.name || "Hệ thống"} · ${new Date(item.createdAt).toLocaleString("vi-VN")}`}
          badge={item.severity}
          icon="file-text"
        >
          <Badge>{item.severity}</Badge>
          <Text>{item.description}</Text>
          <Caption>
            {item.actor?.name} ·{" "}
            {new Date(item.createdAt).toLocaleString("vi-VN")}
          </Caption>
        </ExpandableRecord>
      ))}
      <PageControls
        page={page}
        totalPages={result.data?.pagination.totalPages || 1}
        loading={result.isFetching}
        onChange={setPage}
      />
    </Screen>
  );
}
const Channel = z.object({
  id: z.string(),
  platformName: z.string(),
  channelName: z.string().nullish(),
  channelUrl: z.string(),
  followerCount: z.number(),
  isPrimary: z.boolean(),
});
export function SocialScreen() {
  const channels = useResource("social", "/social-channels", z.array(Channel)),
    command = useCommand(),
    [form, setForm] = useState<CommandFormSpec | null>(null);
  const tier = useResource(
    "tier",
    "/tiers/my-status",
    z.object({
      currentTier: z.object({
        name: z.string(),
        extraBonusPercentage: z.number(),
      }),
      currentRevenue: z.number(),
      progressPercentage: z.number(),
      revenueNeeded: z.number(),
      nextEvaluationAt: z.string(),
    }),
  );
  return (
    <Screen scroll compact>
      <Title>Kênh xã hội</Title>
      <Button
        title="Thêm kênh"
        onPress={() =>
          setForm({
            title: "Liên kết kênh xã hội",
            path: "/social-channels",
            method: "POST",
            fields: [
              {
                key: "platformName",
                label: "Nền tảng",
                options: [
                  "TIKTOK",
                  "YOUTUBE",
                  "FACEBOOK",
                  "INSTAGRAM",
                  "SHOPEE_VIDEO",
                  "LEMON8",
                  "OTHER",
                ].map((value) => ({ value, label: value })),
              },
              { key: "channelName", label: "Tên kênh" },
              { key: "channelUrl", label: "URL kênh HTTPS" },
              { key: "followerCount", label: "Lượt theo dõi", numeric: true },
            ],
            schema: z.object({
              platformName: z.enum([
                "TIKTOK",
                "YOUTUBE",
                "FACEBOOK",
                "INSTAGRAM",
                "SHOPEE_VIDEO",
                "LEMON8",
                "OTHER",
              ]),
              channelName: required.max(150),
              channelUrl: z.string().url().startsWith("https://"),
              followerCount: z.coerce
                .number()
                .int()
                .nonnegative()
                .max(2147483647),
            }),
          })
        }
      />
      <QueryState
        loading={channels.isLoading}
        error={channels.error}
        retry={() => void channels.refetch()}
      />
      <ErrorNotice error={command.error} />
      <Title>Cấp bậc & thăng hạng</Title>
      <QueryState
        loading={tier.isLoading}
        error={tier.error}
        retry={() => void tier.refetch()}
      />
      {tier.data && (
        <Card>
          <Title>{tier.data.currentTier.name}</Title>
          <Caption>
            Thưởng cấp bậc +{tier.data.currentTier.extraBonusPercentage}%
          </Caption>
          <Text>Doanh số kỳ đánh giá: {money(tier.data.currentRevenue)}</Text>
          <Caption>
            Tiến độ {tier.data.progressPercentage}% · Còn{" "}
            {money(tier.data.revenueNeeded)} tới cấp tiếp theo
          </Caption>
          <Caption>
            Xét tiếp theo:{" "}
            {new Date(tier.data.nextEvaluationAt).toLocaleString("vi-VN")}
          </Caption>
        </Card>
      )}
      {channels.data?.map((item) => (
        <Card key={item.id}>
          <Title>{item.channelName || item.platformName}</Title>
          {item.isPrimary && <Badge>Kênh chính</Badge>}
          <Text>
            {item.followerCount.toLocaleString("vi-VN")} người theo dõi
          </Text>
          <Evidence urls={[item.channelUrl]} />
          {!item.isPrimary && (
            <Button
              title="Đặt làm kênh chính"
              secondary
              loading={command.busy}
              onPress={() =>
                void command.execute(`/social-channels/${item.id}/primary`)
              }
            />
          )}
          <Button
            title="Gỡ liên kết kênh"
            secondary
            loading={command.busy}
            onPress={() =>
              void command.execute(`/social-channels/${item.id}`, "DELETE")
            }
          />
        </Card>
      ))}
      {form && <CommandForm spec={form} close={() => setForm(null)} />}
    </Screen>
  );
}
