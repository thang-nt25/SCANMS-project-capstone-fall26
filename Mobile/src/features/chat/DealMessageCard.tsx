import { Text, View } from "react-native";
import { Button, Caption } from "../../components/ui";
import { dealKpiDisplay } from "../deals/deal-policy";
import { parseDealCard } from "./deal-card";
import { useMobileNavigation } from "../../navigation/router";
export function DealMessageCard({ text }: { text: string }) {
  const card = parseDealCard(text),
    navigation = useMobileNavigation();
  if (!card)
    return (
      <Text>
        Thông tin thỏa thuận không còn đúng định dạng. Mở mục Thỏa thuận VIP để
        kiểm tra.
      </Text>
    );
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontWeight: "700" }}>
        {card.productTitle || "Thỏa thuận VIP"}
      </Text>
      {card.storeName && <Caption>{card.storeName}</Caption>}
      {card.proposedCommissionRate != null && (
        <Text>Thù lao đề nghị: {card.proposedCommissionRate}%</Text>
      )}
      {(card.targetOrders != null || card.targetRevenue != null) && (
        <Caption>
          {dealKpiDisplay(card).label}: {dealKpiDisplay(card).value}
        </Caption>
      )}
      {card.commitmentDays != null && (
        <Caption>Kỳ cam kết: {card.commitmentDays} ngày</Caption>
      )}
      {card.couponTerms?.discountPercent != null && (
        <Caption>
          Mã độc quyền: giảm {card.couponTerms.discountPercent}%
        </Caption>
      )}
      {card.salesCommitment && (
        <Text numberOfLines={3}>{card.salesCommitment}</Text>
      )}
      <Caption>
        Trạng thái và điều khoản hiện hành được xác nhận khi mở thỏa thuận.
      </Caption>
      <Button
        title="Xem và phản hồi thỏa thuận"
        secondary
        onPress={() =>
          navigation.navigate("Deals", { dealId: card.proposalId })
        }
      />
    </View>
  );
}
