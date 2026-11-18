import { MonthlyRewardsPanel } from "./MonthlyRewardsPanel";
export function ShopMonthlyBonusPanel({ storeId }: { storeId: string }) {
  return <MonthlyRewardsPanel storeId={storeId} mode="shop" />;
}
