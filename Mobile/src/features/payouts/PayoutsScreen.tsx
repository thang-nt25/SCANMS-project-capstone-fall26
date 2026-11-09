import { useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { z } from "zod";
import {
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
import { filePart } from "../common/MediaPicker";
import {
  CommandForm,
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
import { unwrapEnvelope } from "../../services/api/client";
import { GatewaySchema, TransferResultSchema, gatewayAction, isSandboxPayout } from "./gateway-contract";
import { Icon } from "../../components/commerce";
import { colors } from "../../theme/tokens";
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
  transferProvider: z.string().nullish(),
  bankRefCode: z.string().nullish(),
  createdAt: z.string().nullish(),
});
const Payouts = z.object({
  requests: z.array(Payout),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});
export function PayoutsScreen() {
  const { store, reviewer } = useActor(),
    [page, setPage] = useState(1),
    [status, setStatus] = useState(""),
    [form, setForm] = useState<CommandFormSpec | null>(null);
  const [approval, setApproval] = useState<z.infer<typeof Payout> | null>(null);
  const [bill, setBill] = useState<ImagePicker.ImagePickerAsset | null>(null),
    [bankRefCode, setBankRefCode] = useState("");
  const [proof, setProof] = useState<string | null>(null);
  const [transferNotice, setTransferNotice] = useState("");
  const command = useCommand(),
    base = reviewer ? "/admin/payouts" : `/stores/${store?.id}/payouts`;
  const result = useResource(
    "payouts",
    `${base}?page=${page}&limit=20${status ? `&status=${status}` : ""}`,
    Payouts,
    reviewer || Boolean(store),
  );
  const gateway = useResource("payout-gateway", "/admin/payouts/gateway", GatewaySchema, reviewer);
  const transfer = (item: z.infer<typeof Payout>) => {
    const action = gatewayAction(reviewer, item.status, item.transferProvider, gateway.data);
    if (!action) return;
    confirmAction(
      action === "reconcile" ? "Đối soát lệnh đang xử lý?" : "Duyệt qua API ngân hàng?",
      `${item.bankName || ""} · ${item.bankAccountNumber || ""}\n${item.bankAccountName || ""}\nThực chuyển: ${money(item.netAmount)}. ${gateway.data?.environment === "SANDBOX" ? "Sandbox không chuyển tiền ngoài đời." : "Kiểm tra kỹ người nhận trước khi duyệt."}`,
      () => void command.run(async () => {
        setTransferNotice("");
        try {
          const response = TransferResultSchema.parse(unwrapEnvelope(await api.request(`/payouts/${item.id}/${action}`, {
            method: "POST", timeout: 60000,
          })));
          setTransferNotice(response.status === "APPROVED"
            ? `Đã hoàn tất${gateway.data?.environment === "SANDBOX" ? " · Sandbox" : ""}. Ví không bị trừ thêm lần nữa.`
            : "Lệnh đang xử lý. Chỉ đối soát kết quả, không gửi lại lệnh chuyển tiền.");
        } finally {
          // Even on timeout, the server may already have accepted the request.
          await result.refetch();
        }
      }),
    );
  };
  return (
    <Screen scroll>
      {reviewer && <Title>Duyệt rút tiền</Title>}
      <Button
        title="Cập nhật danh sách"
        secondary
        disabled={result.isFetching || command.busy}
        onPress={() => {
          void result.refetch();
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
        }}
      />
      <QueryState
        loading={result.isLoading}
        error={result.error}
        retry={() => void result.refetch()}
      />
      <ErrorNotice error={command.error} />
      {reviewer && <ErrorNotice error={gateway.error} retry={() => void gateway.refetch()} />}
      {reviewer && gateway.data && <Caption>{gateway.data.message}</Caption>}
      {transferNotice ? <Caption>{transferNotice}</Caption> : null}
      {result.data?.requests.map((item) => (
        <Card key={item.id}>
          <PayoutSummary item={item} />
          {gatewayAction(reviewer, item.status, item.transferProvider, gateway.data) && (
            <Button
              title={item.status === "PROCESSING" ? "Đối soát kết quả ngân hàng" : gateway.data?.environment === "SANDBOX" ? "Duyệt qua BIDV Sandbox" : "Duyệt qua API ngân hàng"}
              loading={command.busy}
              onPress={() => transfer(item)}
            />
          )}
          {reviewer && ["PENDING", "PROCESSING"].includes(item.status) && !item.transferProvider && (
            <Button
              title="Xác nhận đã chuyển tiền / đính kèm bill"
              onPress={() => {
                setBill(null);
                setBankRefCode("");
                setApproval(item);
              }}
            />
          )}
          {reviewer && item.status === "PENDING" && (
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
          {reviewer && item.status === "APPROVED" && !isSandboxPayout(item) && (
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

function PayoutSummary({ item }: { item: z.infer<typeof Payout> }) {
  const sandbox = isSandboxPayout(item);
  const reference = item.bankRefCode;
  const date = item.createdAt ? new Date(item.createdAt) : null;
  const statusIcon = item.status === "APPROVED" ? "check-circle" : item.status === "REJECTED" ? "x-circle" : "clock";
  return <View style={p.summary}>
    <View style={p.header}>
      <View style={p.avatar}><Icon name="user" size={19} color={colors.strong} /></View>
      <View style={{ flex: 1, gap: 4 }}><Text style={p.name}>{item.collaboratorName || "Nhà sáng tạo"}</Text><Text selectable style={p.meta}>#{item.id.slice(0, 8).toUpperCase()}{date && Number.isFinite(date.getTime()) ? ` · ${date.toLocaleDateString("vi-VN")}` : ""}</Text></View>
    </View>
    <View style={p.status}><Icon name={statusIcon} size={13} color={colors.strong} /><Text style={p.statusText}>{item.status === "APPROVED" && sandbox ? "Hoàn tất · Sandbox" : statusText(item.status)}</Text></View>
    <View style={p.amounts}>
      <View style={p.cell}><Text style={p.meta}>Yêu cầu rút</Text><Text style={p.value}>{money(item.amount)}</Text></View>
      <View style={p.cell}><Text style={p.meta}>{sandbox ? "Thuế mô phỏng" : "Thuế khấu trừ"}</Text><Text style={p.value}>{money(item.taxAmount)}</Text></View>
    </View>
    <View style={p.net}><Text style={p.meta}>{sandbox ? "Thực nhận mô phỏng" : "Thực nhận theo lệnh"}</Text><Text style={p.netValue}>{money(item.netAmount)}</Text></View>
    <View style={p.bank}><Icon name="credit-card" size={18} color={colors.strong} /><View style={{ flex: 1, gap: 4 }}><Text style={p.bankName}>{item.bankName?.split(" (")[0] || "Chưa ghi nhận ngân hàng"}</Text><Text selectable style={p.account}>{item.bankAccountNumber || "Chưa ghi nhận số tài khoản"}</Text>{!!item.bankAccountName && <Text style={p.meta}>{item.bankAccountName}</Text>}</View></View>
    {!!reference && <Pressable accessibilityRole="button" accessibilityLabel="Xem mã tham chiếu đầy đủ" onPress={() => Alert.alert(sandbox ? "Mã thử nghiệm nội bộ SCANMS" : "Mã tham chiếu đã ghi nhận", `${reference}${sandbox ? "\n\nMã SBX dùng đối soát thử nghiệm; không phải mã xác nhận chuyển tiền thật từ ngân hàng." : ""}`)} style={p.reference}><Icon name="hash" size={14} color={colors.muted} /><Text style={p.meta}>{sandbox ? "Mã thử nghiệm" : "Mã tham chiếu"}</Text><Text numberOfLines={1} style={p.refCode}>{reference.length > 22 ? `${reference.slice(0, 12)}…${reference.slice(-6)}` : reference}</Text><Icon name="chevron-right" size={15} color={colors.strong} /></Pressable>}
  </View>;
}
const p = StyleSheet.create({
  summary: { gap: 12 }, header: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.soft, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 16, fontWeight: "700", color: colors.ink }, meta: { fontSize: 11, lineHeight: 16, color: colors.muted },
  status: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", backgroundColor: colors.soft, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5 },
  statusText: { fontSize: 11, color: colors.strong }, amounts: { flexDirection: "row", gap: 12 }, cell: { flex: 1, gap: 5 },
  value: { fontSize: 15, fontWeight: "600", color: colors.ink },
  net: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  netValue: { fontSize: 19, fontWeight: "700", color: colors.strong }, bank: { flexDirection: "row", gap: 9, backgroundColor: colors.canvas, borderRadius: 10, padding: 10 },
  bankName: { fontSize: 12, fontWeight: "600", color: colors.ink }, account: { fontSize: 13, color: colors.ink },
  reference: { flexDirection: "row", alignItems: "center", gap: 5, minHeight: 36 }, refCode: { flex: 1, textAlign: "right", color: colors.muted, fontSize: 11 },
});
