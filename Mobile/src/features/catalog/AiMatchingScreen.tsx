import { Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { ScreenProps } from "../../navigation/router";
import { recommendKocs } from "../../services/scanms";
import {
  Badge,
  Button,
  Caption,
  Card,
  Empty,
  ErrorNotice,
  Loading,
  Screen,
  Title,
} from "../../components/ui";
import { useAuth } from "../auth/AuthProvider";
import { colors } from "../../theme/tokens";

export function AiMatchingScreen({
  route,
  navigation,
}: ScreenProps<"AiMatching">) {
  const { session } = useAuth();
  const result = useQuery({
    queryKey: [session!.user.id, "ai", route.params.product.id],
    queryFn: ({ signal }) => recommendKocs(route.params.product.id, signal),
    retry: false,
  });
  return (
    <Screen scroll>
      <Title>KOC phù hợp</Title>
      <Caption>{route.params.product.title}</Caption>
      <ErrorNotice error={result.error} retry={() => void result.refetch()} />
      {result.isLoading && <Loading />}
      {result.data?.recommendedKols.length === 0 && (
        <Empty text="Chưa có KOC phù hợp với điều kiện hiện tại." />
      )}
      {result.data?.recommendedKols.map((koc) => (
        <Card key={koc.collaboratorId} style={{ marginHorizontal: 0 }}>
          <Title>{koc.fullName}</Title>
          <Badge>{koc.tierName || "Hồ sơ KOC"}</Badge>
          <Text
            style={{ color: colors.strong, fontWeight: "700", fontSize: 26 }}
          >
            {koc.matchScore}/100
          </Text>
          {koc.scoreBreakdown &&
            Object.entries(koc.scoreBreakdown).map(([key, value]) =>
              typeof value === "number" && Number.isFinite(value) ? (
                <View key={key} style={{ gap: 5 }}>
                  <Caption>
                    {key}: {value}
                  </Caption>
                  <View
                    style={{
                      height: 6,
                      backgroundColor: colors.sand,
                      borderRadius: 8,
                    }}
                  >
                    <View
                      style={{
                        height: 6,
                        borderRadius: 8,
                        backgroundColor: colors.brand,
                        width: `${Math.min(100, Math.max(0, value))}%`,
                      }}
                    />
                  </View>
                </View>
              ) : null,
            )}
          <Caption>{koc.aiReasoning}</Caption>
          <Button
            title="Đề nghị VIP"
            onPress={() =>
              navigation.navigate("DealEditor", {
                product: route.params.product,
                collaboratorId: koc.collaboratorId,
                collaboratorName: koc.fullName,
              })
            }
          />
        </Card>
      ))}
    </Screen>
  );
}
