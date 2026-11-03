import { z } from "zod";
import { Button, Caption, Card, Screen, Title } from "../../components/ui";
import { money } from "../../types/contracts";
import { useMobileNavigation } from "../../navigation/router";
import {
  DetailLine,
  QueryState,
  amount,
  useActor,
  useResource,
} from "../common/shared";
const Overview = z.object({
  metrics: z.object({
    totalOrders: z.number(),
    grossRevenue: z.number(),
    totalCommission: z.number(),
  }),
});
const Finance = z.object({
  summary: z.object({
    pending: z.object({ count: z.number(), netAmount: amount }),
    withheldTax: z.object({ amount }),
    approvedToday: z.object({ count: z.number(), netAmount: amount }),
  }),
});
/** Merchant revenue is not the owner's personal/commission wallet. Mirrors the web finance workspace. */
export function ShopFinanceScreen() {
  const { store } = useActor(),
    navigation = useMobileNavigation();
  const overview = useResource(
    "shop-finance",
    `/dashboard/realtime/overview?days=30&storeId=${store?.id || ""}`,
    Overview,
    Boolean(store),
  );
  const finance = useResource(
    "shop-payout-summary",
    `/stores/${store?.id || ""}/payouts?page=1&limit=10`,
    Finance,
    Boolean(store),
  );
  return (
    <Screen scroll>
      <Title>Tài chính & chi trả Shop</Title>
      <Caption>{store?.name} · 30 ngày</Caption>
      <QueryState
        loading={overview.isLoading || finance.isLoading}
        error={overview.error || finance.error}
        retry={() => {
          void overview.refetch();
          void finance.refetch();
        }}
      />
      {overview.data && (
        <Card>
          <DetailLine
            label="Doanh thu theo thống kê"
            value={money(overview.data.metrics.grossRevenue)}
          />
          <DetailLine
            label="Đơn hàng"
            value={overview.data.metrics.totalOrders}
          />
          <DetailLine
            label="Hoa hồng"
            value={money(overview.data.metrics.totalCommission)}
          />
        </Card>
      )}
      {finance.data && (
        <Card>
          <DetailLine
            label={`Chờ chi trả (${finance.data.summary.pending.count})`}
            value={money(finance.data.summary.pending.netAmount)}
          />
          <DetailLine
            label="Đã chi trả hôm nay"
            value={money(finance.data.summary.approvedToday.netAmount)}
          />
          <DetailLine
            label="Thuế đã khấu trừ"
            value={money(finance.data.summary.withheldTax.amount)}
          />
        </Card>
      )}
      <Caption>
        Doanh thu thống kê không phải số dư khả dụng để rút. Chứng từ và kết quả
        chuyển tiền được theo dõi theo từng yêu cầu chi trả.
      </Caption>
      <Button
        title="Duyệt rút tiền & lô VietQR"
        onPress={() => navigation.navigate("Business", { feature: "payouts" })}
      />
    </Screen>
  );
}
