import { NotificationBell } from "../account/NotificationBell";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";
import { Avatar, Icon, IconButton } from "../../components/commerce";
import { colors } from "../../theme/tokens";
import { useMobileNavigation } from "../../navigation/router";
import { amount, useActor, useResource } from "../common/shared";
import { KolOverviewScreen } from "./KolOverviewScreen";
import { MarketingScreen } from "../marketing/MarketingScreen";
import { CouponsScreen } from "../coupons/CouponsScreen";
import { CatalogScreen } from "../catalog/CatalogScreen";

export function CollaboratorHome() {
  const navigation = useMobileNavigation();
  const router = useRouter();
  const { user } = useActor();
  const insets = useSafeAreaInsets();
  const tier = useResource("tier", "/tiers/my-status", z.object({ currentTier: z.object({ name: z.string(), extraBonusPercentage: amount }) }));
  return (
    <View style={{ flex: 1 }}>
      <View style={[header.container, { paddingTop: insets.top + 8 }]}>
        <View style={header.row}>
          <View style={header.identity}>
            <Pressable accessibilityRole="button" accessibilityLabel="Mở hồ sơ của tôi" onPress={() => router.navigate("/(private)/(tabs)/account")}><Avatar uri={user.avatarUrl} name={user.fullName} size={40} /></Pressable>
            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
              <Pressable accessibilityRole="button" accessibilityLabel="Mở hồ sơ của tôi" onPress={() => router.navigate("/(private)/(tabs)/account")}><Text numberOfLines={1} style={header.name}>{user.fullName} · KOL</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Xem cấp bậc và quyền lợi" onPress={() => navigation.navigate("Business", { feature: "social" })} style={header.tier}>
                <Icon name="award" size={13} color={colors.strong} /><Text numberOfLines={1} style={header.tierText}>{tier.data ? `${tier.data.currentTier.name} · +${Number(tier.data.currentTier.extraBonusPercentage)}% thưởng` : "Xem cấp bậc"}</Text>
              </Pressable>
            </View>
          </View>
          <View style={header.icons}>
            <IconButton name="message-circle" label="Tin nhắn đối tác" onPress={() => navigation.navigate("Conversations")} />
            <NotificationBell />
          </View>
        </View>
      </View>
      <KolOverviewScreen />
    </View>
  );
}

const header = StyleSheet.create({
  container: { backgroundColor: colors.white, borderBottomWidth: 1, borderColor: colors.line, paddingHorizontal: 14, paddingBottom: 8, gap: 5 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  identity: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 9, minHeight: 54 },
  name: { fontSize: 15, lineHeight: 20, fontWeight: "700", color: colors.ink },
  icons: { width: 90, flexShrink: 0, flexDirection: "row", alignItems: "center", gap: 2, minHeight: 44 },
  tier: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.soft, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, minHeight: 24, maxWidth: "100%" },
  tierText: { fontSize: 11, fontWeight: "600", color: colors.strong, flexShrink: 1 },
});

export function CollaboratorMarketingScreen() {
  const [section, setSection] = useState<"links" | "coupons" | "products">("links");
  const [compact, setCompact] = useState(false);
  const handleScroll = useCallback((offset: number) => {
    // Keep the compact bar until the content returns to the top.
    setCompact((current) => offset <= 4 ? false : offset > 72 ? true : current);
  }, []);
  return (
    <View style={{ flex: 1 }}>
      <View style={[marketingTabs.row, compact && marketingTabs.compactRow]}>
        {([ ["links", "Link & QR"], ["coupons", "Mã độc quyền"], ["products", "Sản phẩm"] ] as const).map(([key, title]) => (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: section === key }}
            onPress={() => { setSection(key); setCompact(false); }}
            style={[marketingTabs.tab, compact && marketingTabs.compactTab, section === key && marketingTabs.active]}
          >
            <Text numberOfLines={2} style={[marketingTabs.label, section === key && marketingTabs.activeLabel]}>{title}</Text>
          </Pressable>
        ))}
      </View>
      {section === "links" ? <MarketingScreen params={{ feature: "marketing" }} onScrollOffset={handleScroll} /> : section === "coupons" ? <CouponsScreen onScrollOffset={handleScroll} /> : <CatalogScreen onScrollOffset={handleScroll} />}
    </View>
  );
}

const marketingTabs = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingVertical: 10, alignItems: "stretch" },
  tab: { flex: 1, minWidth: 0, height: 56, paddingHorizontal: 6, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  compactRow: { paddingVertical: 4 },
  compactTab: { height: 44, borderRadius: 10 },
  active: { backgroundColor: colors.soft, borderColor: colors.strong },
  label: { fontSize: 12, lineHeight: 17, fontWeight: "600", color: colors.muted, textAlign: "center" },
  activeLabel: { color: colors.ink, fontWeight: "700" },
});
