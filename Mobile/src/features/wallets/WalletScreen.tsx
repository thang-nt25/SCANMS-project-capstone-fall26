import { useState } from "react";
import { Text } from "react-native";
import { z } from "zod";
import {
  Badge,
  Button,
  Caption,
  Card,
  Empty,
  ErrorNotice,
  Field,
  PageControls,
  Screen,
  Title,
} from "../../components/ui";
import { money, statusText } from "../../types/contracts";
import {
  ActionForm,
  DetailLine,
  QueryState,
  Sheet,
  amount,
  confirmAction,
  required,
  useActor,
  useCommand,
  useResource,
} from "../common/shared";
import { SelectField } from "../common/SelectField";
import { validateInput } from "../../utils/validate-input";
const Wallet = z.object({
  availableBalance: amount,
  pendingBalance: amount,
  minimumWithdrawalAmount: amount,
  canWithdraw: z.boolean(),
  kycStatus: z.string(),
  stores: z.array(
    z.object({
      storeId: z.string(),
      storeName: z.string(),
      availableBalance: amount,
      pendingBalance: amount,
      isActive: z.boolean(),
    }),
  ),
  withdrawalTaxPolicy: z.object({ threshold: z.number(), rate: z.number() }),
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
  const wallet = useResource("wallet", "/wallets/me", Wallet);
  const ledger = useResource(
    "ledger",
    `/wallets/me/ledger?page=${page}&limit=20`,
    Ledger,
  );
  const requests = useResource(
    "withdrawals",
    `/wallets/withdrawals?page=${page}&limit=20`,
    Withdrawal,
    koc,
  );
  const selected = wallet.data?.stores.find((item) => item.storeId === storeId);
  return (
    <Screen scroll>
      <Title>Ví SCANMS</Title>
      <QueryState
        loading={wallet.isLoading}
        error={wallet.error}
        retry={() => void wallet.refetch()}
      />
      {wallet.data && (
        <>
          <Card>
            <DetailLine
              label="Số dư khả dụng"
              value={money(wallet.data.availableBalance)}
            />
            <DetailLine
              label="Đang tạm giữ"
              value={money(wallet.data.pendingBalance)}
            />
          </Card>
          {wallet.data.stores.map((item) => (
            <Card key={item.storeId}>
              <Title>{item.storeName}</Title>
              <Text>Khả dụng: {money(item.availableBalance)}</Text>
              <Caption>Tạm giữ: {money(item.pendingBalance)}</Caption>
            </Card>
          ))}
          {koc && (
            <>
              <Badge>KYC: {wallet.data.kycStatus}</Badge>
              <DetailLine
                label="Tài khoản nhận tiền"
                value={
                  wallet.data.bankAccount
                    ? `${wallet.data.bankAccount.bankName} · ${wallet.data.bankAccount.maskedAccountNumber} · ${wallet.data.bankAccount.accountName}`
                    : "Chưa liên kết"
                }
              />
              <Button
                title="Cập nhật tài khoản ngân hàng"
                secondary
                onPress={() => setBank(true)}
              />
              <Caption>
                Rút tối thiểu {money(wallet.data.minimumWithdrawalAmount)}. Từ{" "}
                {money(wallet.data.withdrawalTaxPolicy.threshold)}, thuế theo
                cấu hình hệ thống {wallet.data.withdrawalTaxPolicy.rate * 100}%.
              </Caption>
              {!wallet.data.canWithdraw && (
                <Caption>
                  Chưa đủ điều kiện rút: kiểm tra KYC, ngân hàng và số dư khả
                  dụng theo Shop.
                </Caption>
              )}
              <Button
                title="Tạo yêu cầu rút hoa hồng"
                disabled={!wallet.data.canWithdraw}
                onPress={() => setWithdraw(true)}
              />
            </>
          )}
        </>
      )}
      <Title>Lịch sử biến động</Title>
      <QueryState
        loading={ledger.isLoading}
        error={ledger.error}
        retry={() => void ledger.refetch()}
      />
      {ledger.data?.entries.length === 0 && <Empty />}
      {ledger.data?.entries.map((item) => (
        <Card key={item.id}>
          <Badge>{statusText(item.transactionType)}</Badge>
          <Title>{money(item.amount)}</Title>
          <Caption>
            {money(item.balanceBefore)} → {money(item.balanceAfter)}
          </Caption>
          <Caption>{new Date(item.createdAt).toLocaleString("vi-VN")}</Caption>
        </Card>
      ))}
      {koc && (
        <>
          <Title>Yêu cầu rút tiền</Title>
          <QueryState
            loading={requests.isLoading}
            error={requests.error}
            retry={() => void requests.refetch()}
          />
          {requests.data?.requests.map((item) => (
            <Card key={item.id}>
              <Badge>{statusText(item.status)}</Badge>
              <Title>{money(item.amount)}</Title>
              <Text>
                Thuế: {money(item.taxAmount)} · Thực nhận:{" "}
                {money(item.netAmount)}
              </Text>
            </Card>
          ))}
        </>
      )}
      <PageControls
        page={page}
        totalPages={Math.ceil(
          Math.max(ledger.data?.total || 0, requests.data?.total || 0) / 20,
        )}
        loading={ledger.isFetching || requests.isFetching}
        onChange={setPage}
      />
      <ErrorNotice error={command.error} />
      {bank && (
        <ActionForm
          title="Ngân hàng nhận hoa hồng"
          fields={[
            { key: "bankName", label: "Ngân hàng" },
            { key: "bankAccountNumber", label: "Số tài khoản" },
            { key: "bankAccountName", label: "Tên chủ tài khoản" },
          ]}
          schema={z.object({
            bankName: required.max(100),
            bankAccountNumber: required.regex(/^[0-9]{6,30}$/),
            bankAccountName: required.max(150),
          })}
          submit={(body) =>
            command.execute("/wallets/me/bank-account", "PUT", body, () =>
              setBank(false),
            )
          }
          busy={command.busy}
          error={command.error}
          close={() => setBank(false)}
        />
      )}
      {withdraw && (
        <Sheet
          title="Yêu cầu rút hoa hồng"
          close={() => {
            if (!command.busy) setWithdraw(false);
          }}
        >
          <SelectField
            label="Shop thanh toán"
            value={storeId}
            options={(wallet.data?.stores || [])
              .filter((item) => item.isActive)
              .map((item) => ({
                value: item.storeId,
                label: `${item.storeName} · ${money(item.availableBalance)}`,
              }))}
            onChange={setStoreId}
            disabled={command.busy}
          />
          <Field
            label="Số tiền rút VNĐ"
            value={value}
            onChangeText={setValue}
            keyboardType="decimal-pad"
            editable={!command.busy}
          />
          <Caption>
            Hệ thống sẽ khóa số dư và khấu trừ thuế khi tạo yêu cầu. Shop duyệt
            chứng từ thanh toán riêng.
          </Caption>
          <ErrorNotice error={command.error} />
          <Button
            title="Xác nhận tạo yêu cầu rút"
            loading={command.busy}
            disabled={!selected || !wallet.data?.canWithdraw}
            onPress={() =>
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
        </Sheet>
      )}
    </Screen>
  );
}
