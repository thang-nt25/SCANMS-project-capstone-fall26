import { useState } from "react";
import { Text } from "react-native";
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
import { money, statusText } from "../../types/contracts";
import {
  CommandForm,
  QueryState,
  amount,
  required,
  useActor,
  useCommand,
  useResource,
  type CommandFormSpec,
} from "../common/shared";
const Campaign = z.object({
  id: z.string(),
  name: z.string(),
  bonusCommissionRate: amount,
  bonusBudgetTotal: amount.nullish(),
  isActive: z.boolean(),
  startDate: z.string(),
  endDate: z.string(),
  store: z.object({ name: z.string() }).nullish(),
});
const Invitation = z.object({
  id: z.string(),
  status: z.string(),
  campaign: Campaign,
});
export function CampaignsScreen() {
  const { user, store } = useActor(),
    koc = user.role === "COLLABORATOR",
    shop = user.role === "SHOP_MANAGER";
  const command = useCommand(),
    [form, setForm] = useState<CommandFormSpec | null>(null);
  const list = useResource(
    "campaigns",
    shop ? "/campaigns/shop" : "/campaigns/explore",
    z.array(Campaign),
  );
  const invitations = useResource(
    "campaign-invitations",
    "/campaigns/my-invitations",
    z.array(Invitation),
    koc,
  );
  const team = useResource(
    "campaign-kocs",
    `/store-collaborators/shop?storeId=${store?.id || ""}`,
    z.object({
      members: z.array(
        z.object({
          collaboratorId: z.string(),
          collaborator: z.object({ fullName: z.string() }),
        }),
      ),
    }),
    shop && Boolean(store),
  );
  return (
    <Screen scroll>
      <Title>Chiến dịch & thưởng doanh số</Title>
      <Caption>
        Hoa hồng và ngân sách do backend kiểm tra, không tự cộng tỷ lệ trên điện
        thoại.
      </Caption>
      {shop && (
        <Button
          title="Tạo chiến dịch"
          onPress={() =>
            setForm({
              title: "Tạo chiến dịch",
              path: "/campaigns",
              method: "POST",
              fields: [
                { key: "name", label: "Tên chiến dịch" },
                {
                  key: "bonusCommissionRate",
                  label: "Thưởng thêm (2–4%)",
                  numeric: true,
                },
                {
                  key: "bonusBudgetTotal",
                  label: "Ngân sách thưởng (VNĐ)",
                  numeric: true,
                },
                {
                  key: "startDate",
                  label: "Bắt đầu (ISO có múi giờ)",
                  initial: new Date(Date.now() + 600000).toISOString(),
                },
                {
                  key: "endDate",
                  label: "Kết thúc (ISO có múi giờ)",
                  initial: new Date(Date.now() + 7 * 86400000).toISOString(),
                },
              ],
              schema: z
                .object({
                  name: required.max(255),
                  bonusCommissionRate: z.coerce.number().min(2).max(4),
                  bonusBudgetTotal: z.coerce.number().positive().max(1e12),
                  startDate: z.string().datetime({ offset: true }),
                  endDate: z.string().datetime({ offset: true }),
                })
                .refine(
                  (body) =>
                    Date.parse(body.endDate) > Date.parse(body.startDate),
                  "Ngày kết thúc phải sau ngày bắt đầu.",
                ),
            })
          }
        />
      )}
      <QueryState
        loading={list.isLoading || invitations.isLoading}
        error={list.error || invitations.error || team.error}
        retry={() => {
          void list.refetch();
          if (koc) void invitations.refetch();
        }}
      />
      <ErrorNotice error={command.error} />
      {koc && (
        <>
          <Title>Lời mời của bạn</Title>
          {invitations.data?.map((item) => (
            <Card key={item.id}>
              <Title>{item.campaign.name}</Title>
              <Badge>{statusText(item.status)}</Badge>
              <Caption>
                {item.campaign.store?.name} · Thưởng thêm{" "}
                {item.campaign.bonusCommissionRate}%
              </Caption>
              {item.status === "INVITED" && (
                <>
                  <Button
                    title="Chấp nhận lời mời"
                    loading={command.busy}
                    onPress={() =>
                      void command.execute(
                        `/campaigns/invitations/${item.id}/accept`,
                      )
                    }
                  />
                  <Button
                    title="Từ chối lời mời"
                    secondary
                    loading={command.busy}
                    onPress={() =>
                      void command.execute(
                        `/campaigns/invitations/${item.id}/reject`,
                      )
                    }
                  />
                </>
              )}
            </Card>
          ))}
        </>
      )}
      <Title>{shop ? "Chiến dịch của Shop" : "Chiến dịch trên sàn"}</Title>
      {list.data?.map((item) => (
        <Card key={item.id}>
          <Title>{item.name}</Title>
          <Caption>{item.store?.name}</Caption>
          <Badge>{item.isActive ? "Đang hoạt động" : "Đã tạm ngừng"}</Badge>
          <Text>
            Thưởng thêm {item.bonusCommissionRate}% · Ngân sách{" "}
            {money(item.bonusBudgetTotal)}
          </Text>
          <Caption>
            {new Date(item.startDate).toLocaleString("vi-VN")} –{" "}
            {new Date(item.endDate).toLocaleString("vi-VN")}
          </Caption>
          {koc && (
            <Button
              title="Đăng ký tham gia"
              secondary
              loading={command.busy}
              onPress={() =>
                void command.execute(`/campaigns/${item.id}/join`, "POST")
              }
            />
          )}
          {shop && (
            <Button
              title="Mời KOL tham gia"
              secondary
              onPress={() =>
                setForm({
                  title: "Mời KOL vào chiến dịch",
                  path: `/campaigns/${item.id}/invite`,
                  method: "POST",
                  fields: [
                    {
                      key: "collaboratorId",
                      label: "KOL đã hợp tác",
                      options: (team.data?.members || []).map((member) => ({
                        value: member.collaboratorId,
                        label: member.collaborator.fullName,
                      })),
                    },
                    {
                      key: "personalMessage",
                      label: "Lời mời",
                      multiline: true,
                    },
                  ],
                  schema: z.object({
                    collaboratorId: z.string().uuid(),
                    personalMessage: required.max(1000),
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
