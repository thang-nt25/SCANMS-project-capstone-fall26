import { useState } from "react";
import { z } from "zod";
import {
  Badge,
  Button,
  Card,
  Empty,
  Field,
  PageControls,
  Screen,
  Title,
} from "../../components/ui";
import { statusText } from "../../types/contracts";
import {
  CommandForm,
  DetailLine,
  QueryState,
  confirmAction,
  required,
  useActor,
  useCommand,
  useResource,
  type CommandFormSpec,
} from "../common/shared";
import { SelectField } from "../common/SelectField";

const Links = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      shortCode: z.string(),
      shortUrl: z.string(),
      status: z.string(),
      totalClicks: z.number(),
      uniqueClicks: z.number(),
      totalOrders: z.number(),
      disabledReason: z.string().nullish(),
      product: z.object({ title: z.string() }),
      collaborator: z.object({ fullName: z.string() }).nullish(),
      store: z.object({ name: z.string() }).nullish(),
    }),
  ),
  meta: z.object({ totalPages: z.number() }),
});

/** Oversight commands retain the backend's Shop/Admin block ownership checks. */
export function ReferralOversightScreen() {
  const { store, reviewer } = useActor(),
    command = useCommand();
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [draft, setDraft] = useState(""),
    [status, setStatus] = useState("");
  const [form, setForm] = useState<CommandFormSpec | null>(null);
  const base = reviewer
    ? "/admin/referral-links"
    : `/stores/${store?.id}/referral-links`;
  const result = useResource(
    "referral-oversight",
    `${base}?page=${page}&limit=20&search=${encodeURIComponent(search)}${status ? `&status=${status}` : ""}`,
    Links,
    reviewer || Boolean(store),
  );
  return (
    <Screen scroll>
      <Title>Giám sát link tiếp thị</Title>
      <Field
        label="Tìm mã link hoặc sản phẩm"
        value={draft}
        onChangeText={setDraft}
      />
      <Button
        title="Tìm kiếm"
        secondary
        onPress={() => {
          setSearch(draft.trim());
          setPage(1);
        }}
      />
      <SelectField
        label="Trạng thái"
        value={status}
        options={[
          { value: "", label: "Tất cả" },
          ...["ACTIVE", "PAUSED", "BLOCKED"].map((value) => ({
            value,
            label: statusText(value),
          })),
        ]}
        onChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
      />
      <Button
        title="Làm mới"
        secondary
        disabled={result.isFetching}
        onPress={() => void result.refetch()}
      />
      <QueryState
        loading={result.isLoading}
        error={result.error || command.error}
        retry={() => void result.refetch()}
      />
      {result.data?.data.length === 0 && <Empty />}
      {result.data?.data.map((item) => (
        <Card key={item.id}>
          <Title>{item.product.title}</Title>
          <Badge>{statusText(item.status)}</Badge>
          <DetailLine
            label="Gian hàng"
            value={item.store?.name || store?.name}
          />
          <DetailLine
            label="Nhà sáng tạo"
            value={item.collaborator?.fullName}
          />
          <DetailLine label="Link" value={item.shortUrl} />
          <DetailLine
            label="Click / duy nhất / đơn hàng"
            value={`${item.totalClicks} / ${item.uniqueClicks} / ${item.totalOrders}`}
          />
          <DetailLine label="Lý do khóa" value={item.disabledReason} />
          {item.status !== "BLOCKED" ? (
            <Button
              title="Khóa link vi phạm"
              danger
              disabled={command.busy}
              onPress={() =>
                setForm({
                  title: "Lý do khóa link",
                  path: `${base}/${item.id}/block`,
                  fields: [
                    {
                      key: "reason",
                      label: "Lý do và căn cứ",
                      multiline: true,
                    },
                  ],
                  schema: z.object({ reason: required.min(5).max(255) }),
                })
              }
            />
          ) : (
            <Button
              title="Mở khóa link"
              secondary
              loading={command.busy}
              onPress={() =>
                confirmAction(
                  "Mở khóa link tiếp thị?",
                  item.shortCode,
                  () => void command.execute(`${base}/${item.id}/unblock`),
                )
              }
            />
          )}
        </Card>
      ))}
      {result.data && (
        <PageControls
          page={page}
          totalPages={result.data.meta.totalPages}
          loading={result.isFetching}
          onChange={setPage}
        />
      )}
      {form && <CommandForm spec={form} close={() => setForm(null)} />}
    </Screen>
  );
}
