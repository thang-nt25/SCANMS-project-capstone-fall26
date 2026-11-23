import { useState } from "react";
import { Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  Button,
  Caption,
  ErrorNotice,
  Screen,
  Title,
  Badge,
} from "../../components/ui";
import {
  ExpandableRecord,
  FilterTabs,
  InfoLine,
} from "../../components/RecordList";
import {
  CommandForm,
  Evidence,
  QueryState,
  required,
  useActor,
  useResource,
  type CommandFormSpec,
} from "../common/shared";
import { api } from "../../services/api";
import { useAuth } from "../auth/AuthProvider";
import { useOperation } from "../../hooks/useOperation";
import {
  Application,
  canEditApplication,
  kycLabels,
  reviewStatus,
  type KolApplication,
} from "./kyc-contracts";
import { createKycService } from "./kyc-service";
import { KolApplicationForm } from "./KolApplicationForm";

function Dossier({ item }: { item: KolApplication }) {
  const meta = item.socialLinksJson;
  const channels = meta?.channels?.length
    ? meta.channels
    : item.channels || item.user?.socialChannels || [];
  return (
    <>
      <InfoLine label="CCCD" value={item.idCardNumber} />
      <InfoLine label="Mã số thuế" value={item.taxCode} />
      <InfoLine label="Ngân hàng" value={item.bankName} />
      <InfoLine label="Tài khoản" value={item.bankAccountNumber} />
      <InfoLine label="Chủ tài khoản" value={item.bankAccountName} />
      {item.bio && <Text>{item.bio}</Text>}
      {meta?.specialtyCategories?.length ? (
        <InfoLine
          label="Ngành hàng sở trường"
          value={meta.specialtyCategories.join(", ")}
        />
      ) : null}
      {meta?.contentStyles?.length ? (
        <InfoLine
          label="Phong cách nội dung"
          value={meta.contentStyles.join(", ")}
        />
      ) : null}
      <Evidence
        urls={[meta?.frontCardUrl, meta?.backCardUrl].filter(
          (url): url is string => Boolean(url),
        )}
      />
      {channels.map((ch, i) => (
        <View key={`${ch.channelUrl}:${i}`} style={{ gap: 8 }}>
          <InfoLine
            label={ch.platform || ch.platformName || "Kênh xã hội"}
            value={`${ch.channelName || ""} · ${(ch.followerCount || 0).toLocaleString("vi-VN")} người theo dõi`}
          />
          <Evidence
            urls={[
              ch.channelUrl,
              ch.channelProofUrl || (i === 0 ? meta?.channelProofUrl : null),
            ].filter((url): url is string => Boolean(url))}
          />
        </View>
      ))}
      {(item.rejectionReason || meta?.rejectionReason) && (
        <InfoLine
          label="Phản hồi vận hành"
          value={item.rejectionReason || meta?.rejectionReason}
        />
      )}
      {meta?.requestedItems?.map((field) => (
        <Caption key={field}>• {field}</Caption>
      ))}
    </>
  );
}
export function KycScreen({
  pendingOnly = false,
}: { pendingOnly?: boolean } = {}) {
  const { user, reviewer } = useActor(),
    { restore } = useAuth(),
    client = useQueryClient(),
    operation = useOperation();
  const [pending, setPending] = useState(pendingOnly),
    [edit, setEdit] = useState(false),
    [form, setForm] = useState<CommandFormSpec | null>(null);
  const applications = useResource(
    "kyc-applications",
    "/kyc/admin/applications",
    z.object({ kolApplications: z.array(Application) }),
    reviewer,
  );
  const own = useQuery({
    queryKey: [user.id, "business", "kol-onboarding"],
    queryFn: ({ signal }) => createKycService(api).status(signal),
    enabled: !reviewer && ["CUSTOMER", "COLLABORATOR"].includes(user.role),
    refetchInterval: 15000,
  });
  const current = own.data?.kolApplication,
    status = reviewStatus(current);
  const decide = (id: string) =>
    setForm({
      title: "Thẩm định hồ sơ KOL",
      path: `/kyc/admin/kol/${id}/review`,
      fields: [
        {
          key: "status",
          label: "Quyết định",
          options: [
            { value: "VERIFIED", label: "Duyệt xác minh" },
            { value: "NEEDS_INFO", label: "Yêu cầu bổ sung" },
            { value: "REJECTED", label: "Từ chối hồ sơ" },
          ],
        },
        { key: "note", label: "Lý do / hướng dẫn bổ sung", multiline: true },
      ],
      schema: z.object({
        status: z.enum(["VERIFIED", "NEEDS_INFO", "REJECTED"]),
        note: required.min(10).max(1000),
      }),
    });
  const rows =
    applications.data?.kolApplications.filter(
      (item) => !pending || reviewStatus(item) === "PENDING_APPROVAL",
    ) || [];
  return (
    <Screen scroll compact>
      <Title>
        {reviewer ? "Thẩm định đối tác" : "Trở thành đối tác KOL/KOC"}
      </Title>
      <QueryState
        loading={reviewer ? applications.isLoading : own.isLoading}
        error={reviewer ? applications.error : own.error}
        retry={() => {
          if (reviewer) void applications.refetch();
          else void own.refetch();
        }}
      />
      {reviewer ? (
        <>
          <FilterTabs
            label="Hồ sơ KOL"
            value={pending ? "pending" : "all"}
            onChange={(value) => setPending(value === "pending")}
            options={[
              { value: "pending", label: "Chờ duyệt" },
              { value: "all", label: "Tất cả" },
            ]}
          />
          {!applications.isLoading &&
            !applications.error &&
            rows.length === 0 && (
              <Caption>Không có hồ sơ trong danh sách này.</Caption>
            )}
          {rows.map((item) => (
            <ExpandableRecord
              key={item.id}
              title={item.user?.fullName || "Hồ sơ KOL"}
              subtitle={item.user?.email}
              badge={kycLabels[reviewStatus(item)]}
              icon="user-check"
            >
              <Dossier item={item} />
              {reviewStatus(item) === "PENDING_APPROVAL" &&
                item.user?.id !== user.id && (
                  <Button
                    title="Xét duyệt hồ sơ"
                    onPress={() => decide(item.id)}
                  />
                )}
            </ExpandableRecord>
          ))}
        </>
      ) : (
        own.data && (
          <>
            <Badge>{kycLabels[status]}</Badge>
            {current && <Dossier item={current} />}
            {status === "PENDING_APPROVAL" && (
              <Caption>
                Hồ sơ đang được thẩm định. Bạn có thể bổ sung sau khi vận hành
                gửi yêu cầu.
              </Caption>
            )}
            {status === "REJECTED" && (
              <Caption>
                Hồ sơ đã bị từ chối. Liên hệ vận hành nếu cần giải thích quyết
                định.
              </Caption>
            )}
            {canEditApplication(current) && (
              <Button
                title={
                  status === "NEEDS_INFO" ? "Bổ sung hồ sơ" : "Đăng ký KOL/KOC"
                }
                onPress={() => setEdit(true)}
              />
            )}
            {own.data.userRole === "COLLABORATOR" &&
              user.role === "CUSTOMER" && (
                <Button
                  title="Cập nhật quyền KOL"
                  loading={operation.busy}
                  onPress={() => void operation.run(restore)}
                />
              )}
            <ErrorNotice error={operation.error} />
          </>
        )
      )}
      {edit && (
        <KolApplicationForm
          application={current}
          close={() => setEdit(false)}
          saved={() => client.invalidateQueries({ queryKey: [user.id] })}
        />
      )}
      {form && <CommandForm spec={form} close={() => setForm(null)} />}
    </Screen>
  );
}
