import { useState } from "react";
import { z } from "zod";
import { Badge, Button, Caption, Card, Field, PageControls, Screen, Title } from "../../components/ui";
import { money } from "../../types/contracts";
import { DetailLine, QueryState, amount, useResource } from "../common/shared";
import { SelectField } from "../common/SelectField";

const Tax = z.object({
  yearMonth: z.string(), gross: amount, tax: amount, net: amount,
  items: z.array(z.object({ id: z.string() })),
  sandbox: z.object({ count: z.number(), gross: amount, tax: amount, net: amount }),
});
const Ledger = z.object({
  yearMonth: z.string(), basis: z.literal("MONTHLY_MOVEMENT"), balanced: z.boolean(),
  items: z.array(z.object({ account: z.string(), walletAmount: amount, bookAmount: amount, difference: amount })),
});
const Escrow = z.object({
  total: z.number(), holdDays: z.number(), pendingAmount: amount,
  items: z.array(z.object({
    id: z.string(), commissionAmount: amount, availableAt: z.string().nullish(),
    order: z.object({
      id: z.string(), externalOrderSn: z.string().nullish(), deliveredAt: z.string().nullish(),
      attributedCollaborator: z.object({ fullName: z.string() }).nullish(),
      store: z.object({ name: z.string() }),
      returnRequest: z.object({ status: z.string() }).nullish(),
      referralReviewRequired: z.boolean().optional(),
    }),
  })),
});
const accounts: Record<string, string> = {
  PARTNER_EARNINGS_PAYABLE: "Thu nhập khả dụng", AFFILIATE_ESCROW: "Hoa hồng bảo chứng",
  CUSTOMER_FUNDS: "Tiền mua hàng", PAYOUT_RESERVED: "Tiền giữ chi trả",
  CORPORATE_BANK: "Chi trả ngoài Sandbox", PIT_TAX_PAYABLE: "Thuế ngoài Sandbox",
  BIDV_SANDBOX_BANK: "Chi trả Sandbox", SANDBOX_PIT_PAYABLE: "Thuế mô phỏng Sandbox",
};
const date = (value: string | null | undefined) => value && Number.isFinite(Date.parse(value))
  ? new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "Chưa ghi nhận";
export function FinanceReportsScreen() {
  const [tab, setTab] = useState("tax"), [page, setPage] = useState(1);
  const [draft, setDraft] = useState(new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit",
  }).format(new Date())), [month, setMonth] = useState(draft);
  const validMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(draft);
  const tax = useResource("finance-tax", `/admin/payouts/tax-report?yearMonth=${month}`, Tax, tab === "tax");
  const ledger = useResource("finance-ledger", `/admin/payouts/ledger-reconciliation?yearMonth=${month}`, Ledger, tab === "ledger");
  const escrow = useResource("finance-escrow", `/admin/payouts/escrow?page=${page}`, Escrow, tab === "escrow");
  const active = tab === "tax" ? tax : tab === "ledger" ? ledger : escrow;
  return <Screen scroll>
    <Title>Thuế & đối soát</Title>
    <SelectField label="Nội dung" value={tab} onChange={setTab} options={[
      { value: "tax", label: "Báo cáo thuế" }, { value: "ledger", label: "Đối chiếu sổ cái" }, { value: "escrow", label: "Bảo chứng Escrow" },
    ]} />
    {tab !== "escrow" && <>
      <Field label="Kỳ báo cáo (YYYY-MM)" value={draft} onChangeText={setDraft} maxLength={7} placeholder="2026-11" />
      <Button title="Xem kỳ đã chọn" disabled={!validMonth || active.isFetching} secondary onPress={() => {
        if (draft === month) void active.refetch(); else setMonth(draft);
      }} />
      <Caption>Kỳ {month} theo giờ Việt Nam. Chi trả và thuế tính theo ngày hoàn tất payout, tách Sandbox.</Caption>
    </>}
    <QueryState loading={active.isLoading} error={active.error} retry={() => void active.refetch()} />
    {tab === "tax" && tax.data && <>
      <Card><Title>Ngoài Sandbox</Title><Caption>{tax.data.items.length} khoản đã hoàn tất trong kỳ</Caption>
        <DetailLine label="Trước thuế" value={money(tax.data.gross)} /><DetailLine label="Khấu trừ" value={money(tax.data.tax)} /><DetailLine label="Thực nhận" value={money(tax.data.net)} />
      </Card>
      <Card><Title>Thử nghiệm Sandbox</Title><Caption>{tax.data.sandbox.count} khoản · không xác nhận chuyển tiền thật</Caption>
        <DetailLine label="Trước thuế" value={money(tax.data.sandbox.gross)} /><DetailLine label="Thuế mô phỏng" value={money(tax.data.sandbox.tax)} /><DetailLine label="Thực nhận mô phỏng" value={money(tax.data.sandbox.net)} />
      </Card>
    </>}
    {tab === "ledger" && ledger.data && <>
      <Badge>{ledger.data.balanced ? "Khớp biến động trong kỳ" : "Có chênh lệch cần đối soát"}</Badge>
      <Caption>Đây là biến động trong tháng, không phải số dư hiện tại hay số dư cuối tháng.</Caption>
      {ledger.data.items.map(row => <Card key={row.account}><Title>{accounts[row.account] || row.account}</Title>
        <DetailLine label="Biến động nghiệp vụ" value={money(row.walletAmount)} /><DetailLine label="Biến động sổ cái" value={money(row.bookAmount)} /><DetailLine label="Chênh lệch" value={money(row.difference)} />
      </Card>)}
    </>}
    {tab === "escrow" && escrow.data && <>
      <Caption>{escrow.data.total} khoản · {money(escrow.data.pendingAmount)} tạm giữ · cơ sở {escrow.data.holdDays} ngày từ giao thành công. Khoản đang có tranh chấp hoặc thẩm định tiếp tục được giữ.</Caption>
      {!escrow.data.items.length && <Caption>Không có khoản hoa hồng đang tạm giữ.</Caption>}
      {escrow.data.items.map(row => <Card key={row.id}>
        <Title>{row.order.externalOrderSn || row.order.id}</Title>
        <Caption>{row.order.attributedCollaborator?.fullName || "Chưa có tên KOL"} · {row.order.store.name}</Caption>
        <DetailLine label="Hoa hồng giữ" value={money(row.commissionAmount)} />
        <DetailLine label="Giao thành công" value={date(row.order.deliveredAt)} />
        <DetailLine label="Dự kiến giải tỏa" value={date(row.availableAt)} />
        <Badge>{row.order.returnRequest ? `Đổi trả: ${row.order.returnRequest.status}` : "Không có yêu cầu đổi trả"}</Badge>
        {row.order.referralReviewRequired && <Caption>Đang cần thẩm định tiếp thị.</Caption>}
      </Card>)}
      <PageControls page={page} totalPages={Math.ceil(escrow.data.total / 20)} loading={escrow.isFetching} onChange={setPage} />
    </>}
  </Screen>;
}
