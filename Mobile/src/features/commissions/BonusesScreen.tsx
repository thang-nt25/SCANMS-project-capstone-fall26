import { useState } from "react";
import { Text } from "react-native";
import { z } from "zod";
import {
  Badge,
  Button,
  Caption,
  Card,
  ErrorNotice,
  Field,
  Screen,
  Title,
} from "../../components/ui";
import { money, statusText } from "../../types/contracts";
import {
  CommandForm,
  DetailLine,
  QueryState,
  amount,
  confirmAction,
  required,
  useActor,
  useCommand,
  useResource,
  type CommandFormSpec,
} from "../common/shared";
import { SelectField } from "../common/SelectField";
const Rule = z.object({
  id: z.string(),
  name: z.string(),
  minMonthlyRevenue: amount,
  achievementBonus: amount,
  bonusPercentage: amount,
  isActive: z.boolean(),
});
const History = z.array(
  z.object({
    id: z.string(),
    yearMonth: z.string(),
    status: z.string(),
    bonusAmount: amount,
    collaboratorName: z.string().nullish(),
    collaborator: z.object({ fullName: z.string() }).optional(),
  }),
);
const Progress = z.object({
  storeName: z.string(),
  yearMonth: z.string(),
  validRevenue: amount,
  validOrdersCount: z.number(),
  estimatedTotalBonus: amount,
  settlementStatus: z.string(),
  nextMilestone: z
    .object({ name: z.string(), missingRevenue: amount })
    .nullish(),
});
const RuleInput = z.object({
  name: required.max(150),
  minMonthlyRevenue: z.string().regex(/^[1-9]\d*$/),
  achievementBonus: z.string().regex(/^(?:0|[1-9]\d*)$/),
  bonusPercentage: z
    .string()
    .regex(/^(?:\d{1,2}(?:\.\d{1,2})?|100(?:\.0{1,2})?)$/),
});
export function BonusesScreen() {
  const { user, store } = useActor(),
    koc = user.role === "COLLABORATOR",
    command = useCommand();
  const [chosenStore, setChosenStore] = useState(""),
    [month, setMonth] = useState(
      new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 7),
    );
  const [form, setForm] = useState<CommandFormSpec | null>(null),
    id = koc ? chosenStore : store?.id;
  const stores = useResource(
    "bonus-stores",
    "/collaborator/stores",
    z.array(z.object({ id: z.string(), name: z.string() })),
    koc,
  );
  const validMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(month),
    base = `/stores/${id}/commission-rules`;
  const rules = useResource("bonus-rules", base, z.array(Rule), Boolean(id));
  const progress = useResource(
    "bonus-progress",
    `/collaborator/stores/${id}/bonus-progress?yearMonth=${month}`,
    Progress,
    koc && Boolean(id) && validMonth,
  );
  const history = useResource(
    "bonus-history",
    `${koc ? "/collaborator/bonus-history" : `${base}/history`}?yearMonth=${month}${koc && id ? `&storeId=${id}` : ""}`,
    History,
    Boolean(id) && validMonth,
  );
  const edit = (rule?: z.infer<typeof Rule>) =>
    setForm({
      title: rule ? "Sửa mốc thưởng" : "Thêm mốc thưởng",
      path: rule ? `${base}/${rule.id}` : base,
      method: rule ? "PATCH" : "POST",
      fields: [
        { key: "name", label: "Tên mốc", initial: rule?.name },
        {
          key: "minMonthlyRevenue",
          label: "Doanh số tháng tối thiểu (VNĐ)",
          initial: String(rule?.minMonthlyRevenue || "").replace(/\.0+$/, ""),
          numeric: true,
        },
        {
          key: "achievementBonus",
          label: "Thưởng đạt mốc (VNĐ)",
          initial: String(rule?.achievementBonus || "0").replace(/\.0+$/, ""),
          numeric: true,
        },
        {
          key: "bonusPercentage",
          label: "Thưởng phần vượt (%)",
          initial: String(rule?.bonusPercentage || "0"),
          numeric: true,
        },
      ],
      schema: RuleInput,
    });
  return (
    <Screen scroll>
      <Title>Thưởng doanh số tháng</Title>
      {koc && (
        <SelectField
          label="Gian hàng"
          value={chosenStore}
          onChange={setChosenStore}
          options={(stores.data || []).map((item) => ({
            value: item.id,
            label: item.name,
          }))}
        />
      )}
      <Field label="Kỳ tháng (YYYY-MM)" value={month} onChangeText={setMonth} />
      {!validMonth && <Caption>Nhập kỳ hợp lệ, ví dụ 2026-10.</Caption>}
      <QueryState
        loading={rules.isLoading || progress.isLoading || history.isLoading}
        error={rules.error || progress.error || history.error || stores.error}
        retry={() => {
          if (id) {
            void rules.refetch();
            if (validMonth) {
              void history.refetch();
              if (koc) void progress.refetch();
            }
          }
        }}
      />
      <ErrorNotice error={command.error} />
      {progress.data && (
        <Card>
          <Title>{progress.data.storeName}</Title>
          <DetailLine
            label="Doanh số hợp lệ"
            value={money(progress.data.validRevenue)}
          />
          <DetailLine
            label="Đơn hợp lệ"
            value={progress.data.validOrdersCount}
          />
          <DetailLine
            label="Thưởng dự kiến"
            value={money(progress.data.estimatedTotalBonus)}
          />
          <Badge>{statusText(progress.data.settlementStatus)}</Badge>
          {progress.data.nextMilestone && (
            <Caption>
              Còn {money(progress.data.nextMilestone.missingRevenue)} để đạt{" "}
              {progress.data.nextMilestone.name}.
            </Caption>
          )}
        </Card>
      )}
      {!koc && id && <Button title="Thêm mốc thưởng" onPress={() => edit()} />}
      {rules.data?.map((rule) => (
        <Card key={rule.id}>
          <Title>{rule.name}</Title>
          <Text>
            Từ {money(rule.minMonthlyRevenue)} · Thưởng{" "}
            {money(rule.achievementBonus)} + {rule.bonusPercentage}% phần vượt
          </Text>
          <Badge>{rule.isActive ? "Đang áp dụng" : "Tạm ngừng"}</Badge>
          {!koc && (
            <>
              <Button
                title="Chỉnh sửa mốc"
                secondary
                onPress={() => edit(rule)}
              />
              <Button
                title={rule.isActive ? "Tạm ngừng" : "Kích hoạt"}
                secondary
                loading={command.busy}
                onPress={() =>
                  void command.execute(`${base}/${rule.id}/status`, "PATCH", {
                    isActive: !rule.isActive,
                  })
                }
              />
            </>
          )}
        </Card>
      ))}
      {!koc && id && validMonth && (
        <Button
          title="Chốt đối soát kỳ tháng"
          secondary
          loading={command.busy}
          onPress={() =>
            confirmAction(
              "Chốt thưởng kỳ tháng?",
              `Kỳ ${month}. Backend kiểm tra kỳ hợp lệ và chống chốt trùng.`,
              () =>
                void command.execute(`${base}/settle-all`, "POST", {
                  yearMonth: month,
                }),
            )
          }
        />
      )}
      <Title>Lịch sử thưởng</Title>
      {history.data?.map((item) => (
        <Card key={item.id}>
          <Caption>
            {item.collaboratorName || item.collaborator?.fullName} ·{" "}
            {item.yearMonth}
          </Caption>
          <Title>{money(item.bonusAmount)}</Title>
          <Badge>{statusText(item.status)}</Badge>
          {!koc && item.status === "PENDING" && (
            <Button
              title="Duyệt kỳ thưởng"
              secondary
              loading={command.busy}
              onPress={() =>
                void command.execute(`${base}/settlements/${item.id}/approve`)
              }
            />
          )}
          {!koc && item.status === "APPROVED" && (
            <Button
              title="Chi thưởng vào ví KOL"
              loading={command.busy}
              onPress={() =>
                confirmAction(
                  "Chi thưởng vào ví?",
                  money(item.bonusAmount),
                  () =>
                    void command.execute(
                      `${base}/settlements/${item.id}/payout`,
                      "POST",
                    ),
                )
              }
            />
          )}
        </Card>
      ))}
      {form && <CommandForm spec={form} close={() => setForm(null)} />}
    </Screen>
  );
}
