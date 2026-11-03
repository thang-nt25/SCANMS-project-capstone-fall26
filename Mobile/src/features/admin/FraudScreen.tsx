import { useState } from "react";
import { Text } from "react-native";
import { z } from "zod";
import {
  Badge,
  Button,
  Caption,
  Card,
  Screen,
  Title,
} from "../../components/ui";
import {
  CommandForm,
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
  const result = useResource("fraud", "/ai/fraud/incidents", Incidents),
    [form, setForm] = useState<CommandFormSpec | null>(null);
  return (
    <Screen scroll>
      <Title>Giám sát rủi ro</Title>
      <QueryState
        loading={result.isLoading}
        error={result.error}
        retry={() => void result.refetch()}
      />
      {result.data?.map((item) => (
        <Card key={item.id}>
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
        </Card>
      ))}
      {form && <CommandForm spec={form} close={() => setForm(null)} />}
    </Screen>
  );
}
