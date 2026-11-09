import { useState } from "react";
import { Text, View } from "react-native";
import { z } from "zod";
import {
  Badge,
  Button,
  Caption,
  Card,
  Empty,
  Field,
  PageControls,
  Screen,
  Title,
} from "../../components/ui";
import { money, statusText } from "../../types/contracts";
import {
  CommandForm,
  DetailLine,
  Evidence,
  QueryState,
  required,
  useActor,
  useResource,
  type CommandFormSpec,
} from "../common/shared";
const Overview = z.object({
  metrics: z.object({
    totalOrders: z.number(),
    completedOrders: z.number(),
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
    <Screen scroll>
      <Title>{user.role === "COLLABORATOR" ? "Hiệu quả tiếp thị" : "Tổng quan hoạt động"}</Title>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[7, 30, 90].map((value) => (
          <Button
            key={value}
            title={`${value} ngày`}
            secondary={days !== value}
            onPress={() => setDays(value)}
          />
        ))}
      </View>
      <QueryState
        loading={result.isLoading}
        error={result.error}
        retry={() => void result.refetch()}
      />
      {result.data && (
        <>
          <Card>
            {user.role === "COLLABORATOR" && (
              <DetailLine label="Đơn giao thành công" value={result.data.metrics.completedOrders} />
            )}
            <DetailLine
              label="Tổng đơn"
              value={result.data.metrics.totalOrders}
            />
            <DetailLine
              label={user.role === "COLLABORATOR" ? `Doanh số tiếp thị · ${days} ngày` : "Doanh thu"}
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
            Chỉ số lấy từ backend theo phạm vi tài khoản và gian hàng.
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
    <Screen scroll>
      <Title>Đánh giá & phản hồi</Title>
      <QueryState
        loading={result.isLoading}
        error={result.error}
        retry={() => void result.refetch()}
      />
      {result.data?.length === 0 && <Empty />}
      {result.data?.map((item) => (
        <Card key={item.id}>
          <Title>{item.product.title}</Title>
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
        </Card>
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
    <Screen scroll>
      <Title>Nhật ký vận hành</Title>
      <Field
        label="Tìm nhật ký"
        value={search}
        onChangeText={setSearch}
        returnKeyType="search"
        onSubmitEditing={() => {
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
        <Card key={item.id}>
          <Title>{item.actionNameVi}</Title>
          <Badge>{item.severity}</Badge>
          <Text>{item.description}</Text>
          <Caption>
            {item.actor?.name} ·{" "}
            {new Date(item.createdAt).toLocaleString("vi-VN")}
          </Caption>
        </Card>
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
export { SocialProfileScreen as SocialScreen } from "../account/SocialProfileScreen";
