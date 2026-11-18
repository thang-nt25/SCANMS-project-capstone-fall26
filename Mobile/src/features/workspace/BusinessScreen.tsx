import type { ScreenProps } from "../../navigation/router";
import { Caption, Screen, Title } from "../../components/ui";
import { canOpenModule } from "./policy";
import { useActor } from "../common/shared";
import { AddressesScreen } from "../addresses/AddressesScreen";
import { CartScreen } from "../cart/CartScreen";
import { PersonalScreen, WishlistScreen } from "../account/PersonalScreens";
import { NotificationsScreen } from "../account/NotificationsScreen";
import { ReturnsScreen } from "../returns/ReturnScreen";
import { SamplesScreen } from "../samples/SamplesScreen";
import { WalletScreen } from "../wallets/WalletScreen";
import { MarketingScreen } from "../marketing/MarketingScreen";
import { PricingScreen } from "../pricing/PricingScreen";
import {
  AuditScreen,
  DashboardScreen,
  ReviewsScreen,
  SocialScreen,
} from "../operations/OperationsScreens";
import { KycScreen } from "../kyc/KycScreen";
import { StaffScreen } from "../admin/StaffScreen";
import { ShopSettingsScreen } from "../shop/ShopSettingsScreen";
import { PayoutsScreen } from "../payouts/PayoutsScreen";
import { FinanceReportsScreen } from "../payouts/FinanceReportsScreen";
import { ProductEditScreen } from "../catalog/ProductEditScreen";
import { StorefrontScreen } from "../stores/StorefrontScreen";
import { CouponsScreen } from "../coupons/CouponsScreen";
import { ManualOrdersScreen } from "../orders/ManualOrdersScreen";
import { CampaignsScreen } from "../campaigns/CampaignsScreen";
import { FraudScreen } from "../admin/FraudScreen";
import { IdentityScreen } from "../customer/IdentityScreen";
import { BonusesScreen } from "../commissions/BonusesScreen";
import { ShopFinanceScreen } from "../shop/ShopFinanceScreen";
import { ReferralOversightScreen } from "../marketing/ReferralOversightScreen";
import { useEffect } from "react";
import { useNavigation } from "expo-router";
import { modules } from "./policy";
export function BusinessScreen({ route }: ScreenProps<"Business">) {
  const { user, store } = useActor();
  const stack = useNavigation();
  useEffect(() => {
    if (canOpenModule(user.role, route.params.feature))
      stack.setOptions({ title: user.role === "SHOP_MANAGER" && route.params.feature === "payouts" ? "Đối soát chi trả" : user.role === "SHOP_MANAGER" && route.params.feature === "wallet" ? "Tài chính Shop" : user.role === "COLLABORATOR" && route.params.feature === "coupons" ? "Mã giảm giá độc quyền" : user.role === "COLLABORATOR" && route.params.feature === "wallet" ? "Ví thù lao" : modules[route.params.feature].title });
  }, [stack, user.role, route.params.feature]);
  if (!canOpenModule(user.role, route.params.feature))
    return (
      <Screen scroll>
        <Title>Không có quyền truy cập</Title>
        <Caption>Nghiệp vụ không thuộc vai trò hiện tại.</Caption>
      </Screen>
    );
  return (
    <BusinessContent
      key={`${user.id}:${store?.id || ""}:${route.params.feature}:${route.params.productId || route.params.id || route.params.storeId || ""}:${route.params.pendingOnly || false}:${route.params.returnQueue || ""}`}
      route={route}
    />
  );
}
function BusinessContent({ route }: Pick<ScreenProps<"Business">, "route">) {
  switch (route.params.feature) {
    case "addresses":
      return <AddressesScreen />;
    case "cart":
      return <CartScreen />;
    case "profile":
      return <PersonalScreen />;
    case "notifications":
      return <NotificationsScreen />;
    case "wishlist":
      return <WishlistScreen />;
    case "returns":
      return <ReturnsScreen params={route.params} />;
    case "samples":
      return <SamplesScreen params={route.params} />;
    case "wallet":
      return <MerchantOrPersonalWallet />;
    case "marketing":
      return <MarketingScreen params={route.params} />;
    case "referral-oversight":
      return <ReferralOversightScreen />;
    case "pricing":
      return <PricingScreen />;
    case "dashboard":
      return <DashboardScreen />;
    case "reviews":
      return <ReviewsScreen />;
    case "social":
      return <SocialScreen />;
    case "kyc":
      return <KycScreen pendingOnly={route.params.pendingOnly} />;
    case "staff":
      return <StaffScreen />;
    case "shop":
      return <ShopSettingsScreen />;
    case "audit":
      return <AuditScreen />;
    case "payouts":
      return <PayoutsScreen />;
    case "finance-reports":
      return <FinanceReportsScreen />;
    case "product-edit":
      return <ProductEditScreen params={route.params} />;
    case "storefront":
      return <StorefrontScreen params={route.params} />;
    case "coupons":
      return <CouponsScreen />;
    case "manual-orders":
      return <ManualOrdersScreen />;
    case "campaigns":
      return <CampaignsScreen />;
    case "fraud":
      return <FraudScreen />;
    case "identity":
      return <IdentityScreen />;
    case "bonuses":
      return <BonusesScreen />;
  }
}
function MerchantOrPersonalWallet() {
  const { user } = useActor();
  return user.role === "SHOP_MANAGER" ? (
    <ShopFinanceScreen />
  ) : (
    <WalletScreen />
  );
}
