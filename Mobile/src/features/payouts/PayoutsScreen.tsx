import { useState } from "react";
import { Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { z } from "zod";
import {
  Badge,
  Button,
  Caption,
  Card,
  ErrorNotice,
  Field,
  PageControls,
  Screen,
  Title,
} from "../../components/ui";
import { api } from "../../services/api";
import { money, statusText } from "../../types/contracts";
import { shareExport, XLSX_MIME } from "../../services/exports";
import { filePart } from "../common/MediaPicker";
import {
  CommandForm,
  DetailLine,
  Evidence,
  QueryState,
  Sheet,
  amount,
  confirmAction,
  required,
  useActor,
  useCommand,
  useResource,
  type CommandFormSpec,
} from "../common/shared";
import { SelectField } from "../common/SelectField";
const Payout = z.object({
  id: z.string(),
  status: z.string(),
  amount,
  taxAmount: amount,
  netAmount: amount,
  collaboratorName: z.string().optional(),
  bankName: z.string().nullish(),
  bankAccountName: z.string().nullish(),
  bankAccountNumber: z.string().nullish(),
  storeName: z.string().nullish(),
});
const Payouts = z.object({
  requests: z.array(Payout),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});
const Batches = z.object({
  batches: z.array(
    z.object({
      id: z.string(),
      createdAt: z.string(),
      payoutCount: z.number(),
    }),
  ),
  total: z.number(),
});
export function PayoutsScreen() {
  const { store, reviewer } = useActor(),
    [page, setPage] = useState(1),
    [status, setStatus] = useState(""),
    [form, setForm] = useState<CommandFormSpec | null>(null);
  const [selected, setSelected] = useState<string[]>([]),
    [approval, setApproval] = useState<z.infer<typeof Payout> | null>(null);
  const [bill, setBill] = useState<ImagePicker.ImagePickerAsset | null>(null),
    [bankRefCode, setBankRefCode] = useState("");
  const [proof, setProof] = useState<string | null>(null);
  const command = useCommand(),
    base = reviewer ? "/admin/payouts" : `/stores/${store?.id}/payouts`;
  const result = useResource(
    "payouts",
    `${base}?page=${page}&limit=20${status ? `&status=${status}` : ""}`,
    Payouts,
    reviewer || Boolean(store),
  );
  const batches = useResource(
    "payout-batches",
    `/stores/${store?.id}/payouts/batches?page=${page}&limit=20`,
    Batches,
    !reviewer && Boolean(store),
  );
  return (
    <Screen scroll>
      <Title>Duyệt rút tiền</Title>
      <Button
        title="Làm mới yêu cầu và lịch sử lô"
        secondary
        disabled={result.isFetching || command.busy}
        onPress={() => {
          void result.refetch();
          if (!reviewer && store) void batches.refetch();
        }}
      />
      <SelectField
        label="Trạng thái"
        value={status}
        options={[
          { value: "", label: "Tất cả" },
          ...["PENDING", "PROCESSING", "APPROVED", "REJECTED"].map((value) => ({
            value,
            label: statusText(value),
          })),
        ]}
        onChange={(value) => {
          setStatus(value);
          setPage(1);
          setSelected([]);
        }}
      />
      <QueryState
        loading={result.isLoading}
        error={result.error}
        retry={() => void result.refetch()}
      />
      <ErrorNotice error={command.error} />
      {result.data?.requests.map((item) => (
        <Card key={item.id}>
          <Title>{item.collaboratorName || "Nhà sáng tạo"}</Title>
          <Caption>{item.storeName}</Caption>
          <Badge>{statusText(item.status)}</Badge>
          <DetailLine label="Số tiền yêu cầu" value={money(item.amount)} />
          <DetailLine label="Khấu trừ thuế" value={money(item.taxAmount)} />
          <DetailLine label="Thực nhận" value={money(item.netAmount)} />
          <DetailLine
            label="Ngân hàng"
            value={`${item.bankName || ""} · ${item.bankAccountNumber || ""} · ${item.bankAccountName || ""}`}
          />
          {["PENDING", "PROCESSING"].includes(item.status) && (
            <Button
              title="Xác nhận đã chuyển tiền / đính kèm bill"
              onPress={() => {
                setBill(null);
                setBankRefCode("");
                setApproval(item);
              }}
            />
          )}
          {item.status === "PENDING" && (
            <Button
              title="Từ chối yêu cầu"
              secondary
              onPress={() =>
                setForm({
                  title: "Từ chối chi trả",
                  path: `${base}/${item.id}/reject`,
                  fields: [{ key: "reason", label: "Lý do", multiline: true }],
                  schema: z.object({ reason: required.max(500) }),
                })
              }
            />
          )}
          {!reviewer && item.status === "PENDING" && (
            <Button
              title={
                selected.includes(item.id)
                  ? "✓ Đã chọn xuất lô"
                  : "Chọn xuất lô"
              }
              secondary
              onPress={() =>
                setSelected((old) =>
                  old.includes(item.id)
                    ? old.filter((id) => id !== item.id)
                    : [...old, item.id],
                )
              }
            />
          )}
          {item.status === "APPROVED" && (
            <Button
              title="Xem chứng từ"
              secondary
              loading={command.busy}
              onPress={() =>
                void command.run(async () => {
                  const response = z
                    .object({ url: z.string().url() })
                    .parse(await api.request(`${base}/${item.id}/bill`));
                  setForm(null);
                  setProof(response.url);
                })
              }
            />
          )}
        </Card>
      ))}
      {!reviewer && selected.length > 0 && (
        <Button
          title={`Xuất lô VietQR (${selected.length})`}
          loading={command.busy}
          onPress={() =>
            confirmAction(
              "Tạo lô chi trả?",
              "Các yêu cầu được chọn chuyển sang Đang xử lý. Xuất file không tự chuyển tiền.",
              () =>
                void command.run(async () => {
                  await shareExport(
                    `${base}/export-vietqr`,
                    `SCANMS-VietQR-${Date.now()}.xlsx`,
                    XLSX_MIME,
                    { payoutIds: selected },
                  );
                  setSelected([]);
                  await result.refetch();
                  await batches.refetch();
                }),
            )
          }
        />
      )}
      {!reviewer && (
        <>
          <Title>Lịch sử lô VietQR</Title>
          <ErrorNotice error={batches.error} />
          {batches.data?.batches.map((item) => (
            <Card key={item.id}>
              <Caption>
                {new Date(item.createdAt).toLocaleString("vi-VN")} ·{" "}
                {item.payoutCount} yêu cầu
              </Caption>
              <Button
                title="Tải lại file lô"
                secondary
                loading={command.busy}
                onPress={() =>
                  void command.run(() =>
                    shareExport(
                      `${base}/batches/${item.id}/download`,
                      `SCANMS-VietQR-${item.id}.xlsx`,
                      XLSX_MIME,
                    ),
                  )
                }
              />
            </Card>
          ))}
        </>
      )}
      <PageControls
        page={page}
        totalPages={Math.ceil((result.data?.total || 0) / 20)}
        loading={result.isFetching}
        onChange={setPage}
      />
      {approval && (
        <Sheet
          title="Xác nhận chứng từ thanh toán"
          close={() => {
            if (!command.busy) setApproval(null);
          }}
        >
          <Title>{money(approval.netAmount)}</Title>
          <Caption>
            Chỉ xác nhận sau khi đã chuyển tiền đúng người nhận. Thao tác này
            không tự chuyển tiền ngân hàng.
          </Caption>
          <Field
            label="Mã giao dịch ngân hàng"
            value={bankRefCode}
            onChangeText={setBankRefCode}
            editable={!command.busy}
          />
          <Button
            title="Chọn ảnh bill"
            secondary
            loading={command.busy}
            onPress={() =>
              void command.run(async () => {
                const picked = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ["images"],
                  quality: 1,
                });
                if (picked.canceled) return;
                const asset = picked.assets[0];
                if (!asset?.fileSize || asset.fileSize > 5 * 1024 * 1024)
                  throw new Error("Bill cần là ảnh tối đa 5 MB.");
                setBill(asset);
              })
            }
          />
          {bill && (
            <Image
              source={{ uri: bill.uri }}
              style={{ width: "100%", height: 200 }}
              resizeMode="contain"
            />
          )}
          <ErrorNotice error={command.error} />
          <Button
            title="Duyệt đã thanh toán"
            loading={command.busy}
            disabled={
              !bill ||
              !/^[A-Za-z0-9][A-Za-z0-9._/ -]{0,99}$/.test(bankRefCode.trim())
            }
            onPress={() =>
              confirmAction(
                "Duyệt chi trả?",
                `Thực nhận ${money(approval.netAmount)}, mã giao dịch ${bankRefCode.trim()}.`,
                () =>
                  void command.run(async () => {
                    const data = new FormData();
                    data.append(
                      "bankRefCode",
                      bankRefCode.trim().toUpperCase(),
                    );
                    data.append("bill", filePart(bill!));
                    await api.request(`${base}/${approval.id}/approve`, {
                      method: "PATCH",
                      body: data,
                      timeout: 60000,
                    });
                    setApproval(null);
                    await result.refetch();
                  }),
              )
            }
          />
        </Sheet>
      )}
      {form && <CommandForm spec={form} close={() => setForm(null)} />}
      {proof && (
        <Sheet title="Chứng từ thanh toán" close={() => setProof(null)}>
          <Evidence urls={[proof]} />
        </Sheet>
      )}
    </Screen>
  );
}
