import { Pressable, View } from "react-native";
import { colors } from "../../theme/tokens";
import { Icon } from "../../components/commerce";
import { BottomSheet } from "../../components/BottomSheet";
import { WalletLedgerRow, WithdrawSheet } from "./WalletActivity";
import { useState } from "react";
import { BankAccountSheet, WalletPresentation } from "./WalletPresentation";
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
  Title,
} from "../../components/ui";
import { money, statusText } from "../../types/contracts";
import {
  DetailLine,
  QueryState,
  amount,
  confirmAction,
  useActor,
  useCommand,
  useResource,
} from "../common/shared";
import { validateInput } from "../../utils/validate-input";
import { isSandboxPayout } from "../payouts/gateway-contract";
import { WalletTopUpPanel } from "./WalletTopUpPanel";
const Wallet = z.object({
  availableBalance: amount,
  pendingBalance: amount,
  minimumWithdrawalAmount: amount,
  canWithdraw: z.boolean(),
  kycStatus: z.string(),
  cooperationStores: z.array(z.object({ storeId: z.string(), logoUrl: z.string().nullish() })).optional(),
  stores: z.array(
    z.object({
      storeId: z.string(),
      storeName: z.string(),
      logoUrl: z.string().nullish(),
      availableBalance: amount,
      pendingBalance: amount,
      isActive: z.boolean(),
    }),
  ),
  withdrawalTaxPolicy: z.object({
    threshold: amount.transform(Number),
    rate: amount.transform(Number).refine(value => value >= 0 && value <= 1),
  }),
  bankAccount: z
    .object({
      bankName: z.string(),
      maskedAccountNumber: z.string(),
      accountName: z.string(),
    })
    .nullish(),
});
const Ledger = z.object({
  entries: z.array(
    z.object({
      id: z.string(),
      transactionType: z.string(),
      balanceBucket: z.string().optional(),
      referenceDetails: z.object({ storeName: z.string().nullish(), orderCode: z.string().nullish() }).nullish(),
      amount,
      balanceBefore: amount,
      balanceAfter: amount,
      createdAt: z.string(),
    }),
  ),
  total: z.number(),
  limit: z.number(),
});
const Withdrawal = z.object({
  requests: z.array(
    z.object({
      id: z.string(),
      status: z.string(),
      amount,
      netAmount: amount,
      taxAmount: amount,
      createdAt: z.string(),
      transferProvider: z.string().nullish(),
      bankRefCode: z.string().nullish(),
      processedAt: z.string().nullish(),
      store: z.object({ name: z.string() }).nullish(),
    }),
  ),
  total: z.number(),
  limit: z.number(),
});
export const WithdrawalInput = z.object({
  storeId: z.string().uuid(),
  amount: z
    .string()
    .regex(
      /^\d{1,13}(\.\d{1,2})?$/,
      "Nhập số tiền VNĐ, tối đa 2 chữ số thập phân.",
    )
    .refine((value) => Number(value) > 0, "Số tiền phải lớn hơn 0."),
});
export function WalletScreen() {
  const { user } = useActor(),
    command = useCommand(),
    koc = user.role === "COLLABORATOR";
  const [page, setPage] = useState(1),
    [bank, setBank] = useState(false),
    [withdraw, setWithdraw] = useState(false),
    [storeId, setStoreId] = useState(""),
    [value, setValue] = useState("");
  const [tab, setTab] = useState<"summary" | "withdraw" | "history">("summary");
  const [requestPage, setRequestPage] = useState(1);
  const [historyTab, setHistoryTab] = useState<"ledger" | "requests">("ledger");
  const [requestDetail, setRequestDetail] = useState<z.infer<typeof Withdrawal>["requests"][number] | null>(null);
  const wallet = useResource("wallet", "/wallets/me", Wallet);
  const ledger = useResource(
    "ledger",
    `/wallets/me/ledger?page=${page}&limit=20`,
    Ledger,
  );
  const requests = useResource(
    "withdrawals",
    `/wallets/withdrawals?page=${requestPage}&limit=20`,
    Withdrawal,
    koc,
  );
  const selected = wallet.data?.stores.find((item) => item.storeId === storeId);
  return (
    <Screen scroll>
      {!koc && <Title>Ví SCANMS</Title>}
      {user.role === "CUSTOMER" && <WalletTopUpPanel />}
      {koc && <View style={{ flexDirection: "row", gap: 8 }}>{([["summary", "Tổng quan"], ["withdraw", "Rút tiền"], ["history", "Lịch sử"]] as const).map(([key, title]) => <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: tab === key }} onPress={() => setTab(key)} style={{ flex: 1, minHeight: 46, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: tab === key ? colors.strong : colors.line, borderRadius: 12, backgroundColor: tab === key ? colors.soft : colors.white }}><Text style={{ fontSize: 12, fontWeight: "600", color: tab === key ? colors.ink : colors.muted }}>{title}</Text></Pressable>)}</View>}
      <QueryState
        loading={wallet.isLoading}
        error={wallet.error}
        retry={() => void wallet.refetch()}
      />
      {wallet.data && (
        <>
          {koc ? tab !== "history" && <WalletPresentation wallet={{ ...wallet.data, stores: wallet.data.stores.map(store => ({ ...store, logoUrl: store.logoUrl || wallet.data.cooperationStores?.find(partner => partner.storeId === store.storeId)?.logoUrl })) }} mode={tab === "withdraw" ? "bank" : "summary"} editBank={() => setBank(true)} /> : <Card>
            <DetailLine label="Số dư khả dụng" value={money(wallet.data.availableBalance)} />
            <DetailLine label="Đang tạm giữ" value={money(wallet.data.pendingBalance)} />
          </Card>}
          {!koc && wallet.data.stores.map((item) => <Card key={item.storeId}>
            <Title>{item.storeName}</Title>
            <Text>Khả dụng: {money(item.availableBalance)}</Text>
            <Caption>Tạm giữ: {money(item.pendingBalance)}</Caption>
          </Card>)}
          {koc && tab === "withdraw" && (
            <>
              <View style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14, gap: 6 }}>
                <Text style={{ color: colors.ink, fontSize: 13, fontWeight: "600" }}>Rút từ {money(wallet.data.minimumWithdrawalAmount)}</Text>
                <Caption>Từ {money(wallet.data.withdrawalTaxPolicy.threshold)}, khấu trừ {wallet.data.withdrawalTaxPolicy.rate * 100}% theo chính sách hệ thống.</Caption>
              </View>
              {!wallet.data.canWithdraw && (
                <Caption>
                  Chưa đủ điều kiện rút: kiểm tra KYC, ngân hàng và số dư khả
                  dụng theo Shop.
                </Caption>
              )}
              <Button
                title="Tạo yêu cầu rút hoa hồng"
                soft
                disabled={!wallet.data.canWithdraw}
                onPress={() => setWithdraw(true)}
              />
            </>
          )}
        </>
      )}
      {(!koc || tab === "history") && <>
      {koc && <View style={{ flexDirection: "row", gap: 8 }}>{([["ledger", "Biến động số dư"], ["requests", "Lệnh rút của tôi"]] as const).map(([key, title]) => <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: historyTab === key }} onPress={() => setHistoryTab(key)} style={{ flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderBottomWidth: 2, borderBottomColor: historyTab === key ? colors.strong : colors.line }}><Text style={{ fontSize: 12, fontWeight: "600", color: historyTab === key ? colors.ink : colors.muted }}>{title}</Text></Pressable>)}</View>}
      {(!koc || historyTab === "ledger") && <>
      <QueryState
        loading={ledger.isLoading}
        error={ledger.error}
        retry={() => void ledger.refetch()}
      />
      {ledger.data?.entries.length === 0 && <Empty />}
      {!!ledger.data?.entries.length && <View style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 16, overflow: "hidden" }}>{ledger.data.entries.map((item, index) => <WalletLedgerRow key={item.id} item={item} last={index === ledger.data.entries.length - 1} />)}</View>}
      {!!ledger.data && ledger.data.total > 20 && <PageControls page={page} totalPages={Math.ceil(ledger.data.total / 20)} loading={ledger.isFetching} onChange={setPage} />}
      </>}
      {koc && historyTab === "requests" && (
        <>
          <QueryState
            loading={requests.isLoading}
            error={requests.error}
            retry={() => void requests.refetch()}
          />
          {requests.data?.requests.length === 0 && <Card><View style={{ alignItems: "center", paddingVertical: 20, gap: 8 }}><Icon name="credit-card" size={26} color={colors.strong} /><Text style={{ fontWeight: "600", color: colors.ink }}>Chưa có yêu cầu rút tiền</Text><Caption>Các yêu cầu bạn tạo sẽ được theo dõi tại đây.</Caption><Button title="Tạo yêu cầu rút" soft onPress={() => setTab("withdraw")} /></View></Card>}
          {requests.data?.requests.map((item) => (
            <Pressable key={item.id} accessibilityRole="button" accessibilityLabel="Xem chi tiết yêu cầu rút tiền" onPress={() => setRequestDetail(item)} style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 14, gap: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}><Text style={{ fontSize: 12, fontWeight: "700", color: colors.ink }}>#{item.id.slice(0, 8).toUpperCase()}</Text>
              <Badge>{item.status === "APPROVED" && isSandboxPayout(item) ? "Hoàn tất · Sandbox" : statusText(item.status)}</Badge>
              </View>
              <Caption>{new Date(item.createdAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" })}{item.store?.name ? ` · ${item.store.name}` : ""}</Caption>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><View style={{ flex: 1, gap: 4 }}><Caption>Yêu cầu</Caption><Text style={{ fontSize: 15, fontWeight: "700", color: colors.ink }}>{money(item.amount)}</Text></View><Icon name="arrow-right" size={16} color={colors.muted} /><View style={{ flex: 1, alignItems: "flex-end", gap: 4 }}><Caption>Sau thuế</Caption><Text style={{ fontSize: 15, fontWeight: "700", color: colors.strong }}>{money(item.netAmount)}</Text></View></View>
              {Number(item.taxAmount) > 0 && <Caption>Khấu trừ thuế: {money(item.taxAmount)}</Caption>}
            </Pressable>
          ))}
      {!!requests.data && requests.data.total > 20 &&
      <PageControls
        page={requestPage}
        totalPages={Math.ceil(
          (requests.data?.total || 0) / 20,
        )}
        loading={requests.isFetching}
        onChange={setRequestPage}
      />
      }
        </>
      )}
      </>}
      {requestDetail && <BottomSheet title="Chi tiết yêu cầu rút" close={() => setRequestDetail(null)}><Badge>{requestDetail.status === "APPROVED" && isSandboxPayout(requestDetail) ? "Hoàn tất · Sandbox" : statusText(requestDetail.status)}</Badge><DetailLine label="Yêu cầu" value={money(requestDetail.amount)} /><DetailLine label="Thuế" value={money(requestDetail.taxAmount)} /><DetailLine label="Sau thuế" value={money(requestDetail.netAmount)} />{requestDetail.store?.name && <DetailLine label="Nguồn hoa hồng" value={requestDetail.store.name} />}<Caption>Mã yêu cầu đầy đủ</Caption><Text selectable style={{ color: colors.ink, fontSize: 12 }}>{requestDetail.id}</Text>{requestDetail.bankRefCode && <><Caption>Mã tham chiếu</Caption><Text selectable style={{ color: colors.ink, fontSize: 12 }}>{requestDetail.bankRefCode}</Text></>}{requestDetail.processedAt && <Caption>Xử lý: {new Date(requestDetail.processedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</Caption>}</BottomSheet>}
      <ErrorNotice error={command.error} />
      {bank && (
        <BankAccountSheet
          current={wallet.data?.bankAccount}
          busy={command.busy}
          error={command.error}
          close={() => setBank(false)}
          save={(body) => void command.execute("/wallets/me/bank-account", "PUT", body, () => setBank(false))}
        />
      )}
      {withdraw && (
        <WithdrawSheet
          stores={wallet.data?.stores || []}
          storeId={storeId} setStoreId={setStoreId} value={value} setValue={setValue}
          minimum={wallet.data?.minimumWithdrawalAmount || 0}
          policy={wallet.data?.withdrawalTaxPolicy || { threshold: 0, rate: 0 }}
          canWithdraw={wallet.data?.canWithdraw || false}
          busy={command.busy} error={command.error} close={() => setWithdraw(false)}
          submit={() =>
              confirmAction(
                "Xác nhận rút hoa hồng?",
                `Số tiền yêu cầu: ${money(value)}. Số tiền và thuế chính thức được backend xác nhận.`,
                () =>
                  void command.execute(
                    "/wallets/withdrawals",
                    "POST",
                    () => {
                      const input = validateInput(WithdrawalInput, {
                        storeId,
                        amount: value.trim(),
                      });
                      if (
                        Number(input.amount) <
                          Number(wallet.data!.minimumWithdrawalAmount) ||
                        Number(input.amount) >
                          Number(selected!.availableBalance)
                      )
                        throw new Error(
                          "Số tiền ngoài hạn mức hoặc vượt số dư khả dụng của Shop.",
                        );
                      return input;
                    },
                    () => {
                      setWithdraw(false);
                      setValue("");
                    },
                  ),
              )
            }
        />
      )}
    </Screen>
  );
}
