import {
  ExpandableRecord,
  FilterTabs,
  SectionTitle as Title,
} from "../../components/RecordList";
import { useState } from "react";
import { Text } from "react-native";
import { z } from "zod";
import { Badge, Button, Caption, Screen } from "../../components/ui";
import {
  CompactCommandForm as CommandForm,
  QueryState,
  required,
  useResource,
  type CommandFormSpec,
} from "../common/shared";
const Incidents = z.array(
  z.object({
    id: z.string(),
    incidentCode: z.string(),
    collaboratorName: z.string(),
    riskScore: z.number(),
    riskLevel: z.string(),
    aiReasoning: z.string(),
    status: z.string(),
    evidences: z.array(
      z.object({
        metric: z.string(),
        value: z.string(),
        severity: z.string(),
        description: z.string(),
      }),
    ),
  }),
);
export function FraudScreen() {
  const [status, setStatus] = useState("");
  const result = useResource(
      "fraud",
      `/ai/fraud/incidents${status ? `?status=${status}` : ""}`,
      Incidents,
    ),
    [form, setForm] = useState<CommandFormSpec | null>(null);
  return (
    <Screen scroll compact>
      <FilterTabs
        label="Trạng thái sự vụ"
        value={status}
        options={[
          { value: "", label: "Tất cả" },
          { value: "ACTIVE", label: "Cần xử lý" },
          { value: "FROZEN", label: "Tạm giữ" },
          { value: "RESOLVED", label: "Đã xử lý" },
          { value: "DISMISSED", label: "Đã bác" },
        ]}
        onChange={setStatus}
      />
      <QueryState
        loading={result.isLoading}
        error={result.error}
        retry={() => void result.refetch()}
      />
      {result.data?.map((item) => (
        <ExpandableRecord
          key={item.id}
          title={item.incidentCode}
          subtitle={item.collaboratorName}
          badge={`${item.riskLevel} · ${item.riskScore}/100`}
          icon="alert-triangle"
        >
          <Title>{item.incidentCode}</Title>
          <Caption>{item.collaboratorName}</Caption>
          <Badge>
            {item.riskLevel} · {item.riskScore}/100 · {item.status}
          </Badge>
          <Text>{item.aiReasoning}</Text>
          {item.evidences.map((evidence, index) => (
            <Caption key={`${item.id}-${index}`}>
              {evidence.metric}: {evidence.value} · {evidence.description}
            </Caption>
          ))}
          <Button
            title="Xử lý sự vụ"
            secondary
            onPress={() =>
              setForm({
                title: "Quyết định xử lý rủi ro",
                path: `/ai/fraud/incidents/${encodeURIComponent(item.id)}/action`,
                method: "POST",
                fields: [
                  {
                    key: "action",
                    label: "Biện pháp",
                    options: [
                      { value: "FREEZE_COMMISSION", label: "Tạm giữ hoa hồng" },
                      { value: "PAUSE_LINK", label: "Tạm dừng link" },
                      { value: "DISMISS", label: "Bác cảnh báo" },
                      { value: "RESOLVE", label: "Đã xử lý" },
                    ],
                  },
                  { key: "note", label: "Căn cứ", multiline: true },
                ],
                schema: z.object({
                  action: z.enum([
                    "FREEZE_COMMISSION",
                    "PAUSE_LINK",
                    "DISMISS",
                    "RESOLVE",
                  ]),
                  note: required.min(10).max(1000),
                }),
              })
            }
          />
        </ExpandableRecord>
      ))}
      {form && <CommandForm spec={form} close={() => setForm(null)} />}
    </Screen>
  );
}
