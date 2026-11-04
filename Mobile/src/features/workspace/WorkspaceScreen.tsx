import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { z } from "zod";
import {
  AppBar,
  Avatar,
  Icon,
  IconButton,
  MenuRow,
  SectionHeading,
  c,
} from "../../components/commerce";
import { useMobileNavigation } from "../../navigation/router";
import { colors } from "../../theme/tokens";
import { money, roleLabels } from "../../types/contracts";
import { modules, canOpenModule, type BusinessFeature } from "./policy";
import { useActor, useResource } from "../common/shared";
import { MarketplaceHomeScreen } from "../catalog/MarketplaceHomeScreen";
import { useAuth } from "../auth/AuthProvider";
import { moduleIcons } from "./module-presentation";
import { OperationsWorkspaceScreen } from "./OperationsWorkspaceScreen";

export function WorkspaceScreen() {
  const { session } = useAuth();
  if (
    session?.user.role === "SYSTEM_ADMIN" ||
    session?.user.role === "SYSTEM_MANAGER"
  ) {
    return <OperationsWorkspaceScreen />;
  }
  return session?.user.role === "CUSTOMER" ? (
    <MarketplaceHomeScreen />
  ) : (
    <PartnerWorkspaceScreen />
  );
}
function PartnerWorkspaceScreen() {
  const [search, setSearch] = useState("");
  const { user, store } = useActor(),
    navigation = useMobileNavigation(),
    router = useRouter();
  const unread = useResource(
    "notification-count",
    "/notifications/unread-count",
    z.object({ unreadCount: z.number() }),
  );
  const overview = useResource(
    "workspace-overview",
    `/dashboard/realtime/overview?days=30${user.role === "SHOP_MANAGER" && store ? `&storeId=${store.id}` : ""}`,
    z.object({
      metrics: z.object({
        totalOrders: z.number(),
        grossRevenue: z.number(),
        totalCommission: z.number(),
      }),
    }),
    user.role !== "SHOP_MANAGER" || Boolean(store),
  );
  const rows = Object.entries(modules).filter(
    ([key, item]) =>
      !["product-edit", "storefront", "profile", "notifications"].includes(
        key,
      ) &&
      canOpenModule(user.role, key) &&
      item.title
        .toLocaleLowerCase("vi")
        .includes(search.toLocaleLowerCase("vi")),
  );
  return (
    <View style={styles.screen}>
      <AppBar
        title={
          user.role === "COLLABORATOR"
            ? "Không gian sáng tạo"
            : "Trung tâm quản lý"
        }
        subtitle="SCANMS PARTNER"
      >
        <IconButton
          name="bell"
          label="Thông báo"
          badge={unread.data?.unreadCount}
          onPress={() =>
            navigation.navigate("Business", { feature: "notifications" })
          }
        />
        <IconButton
          name="user"
          label="Tài khoản và đăng xuất"
          onPress={() => router.navigate("/(private)/(tabs)/account")}
        />
      </AppBar>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.identity}>
          <Avatar uri={user.avatarUrl} name={user.fullName} size={43} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.name}>{user.fullName}</Text>
            <Text style={styles.subtitle}>
              {store?.name || roleLabels[user.role]}
            </Text>
          </View>
          <Icon name="shield" size={20} color={colors.strong} />
        </View>
        {overview.data && (
          <View style={styles.metrics}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Doanh thu · 30 ngày</Text>
              <Text style={styles.amount}>
                {money(overview.data.metrics.grossRevenue)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Đơn hàng</Text>
              <Text style={styles.amount}>
                {overview.data.metrics.totalOrders}
              </Text>
            </View>
          </View>
        )}
        <View style={styles.search}>
          <Icon name="search" size={17} color={colors.muted} />
          <TextInput
            accessibilityLabel="Tìm công cụ"
            placeholder="Tìm công cụ, đổi trả, KYC…"
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
            style={styles.input}
          />
        </View>
        <SectionHeading
          title="Công cụ của bạn"
          subtitle="Các chức năng theo vai trò và phân công"
        />
        <View style={styles.tools}>
          {rows.map(([key, item]) => (
            <Pressable
              key={key}
              accessibilityRole="button"
              onPress={() =>
                navigation.navigate("Business", {
                  feature: key as BusinessFeature,
                })
              }
              style={({ pressed }) => [
                styles.tool,
                pressed && { backgroundColor: colors.soft },
              ]}
            >
              <View style={styles.toolIcon}>
                <Icon
                  name={moduleIcons[key as BusinessFeature]}
                  color={colors.strong}
                  size={21}
                />
              </View>
              <Text numberOfLines={3} style={styles.toolLabel}>
                {user.role === "SHOP_MANAGER" && key === "wallet"
                  ? "Tài chính Shop"
                  : item.title}
              </Text>
            </Pressable>
          ))}
        </View>
        {rows.length === 0 && (
          <Text style={styles.subtitle}>Không tìm thấy công cụ phù hợp.</Text>
        )}
        {(user.role === "SHOP_MANAGER" || user.role === "COLLABORATOR") && (
          <>
            <SectionHeading title="Kết nối & hợp tác" />
            <View style={c.panel}>
              <MenuRow
                icon="award"
                title="Thỏa thuận VIP"
                onPress={() => navigation.navigate("Deals")}
              />
              <MenuRow
                icon="message-circle"
                title="Tin nhắn đối tác"
                last
                onPress={() => navigation.navigate("Conversations")}
              />
            </View>
          </>
        )}
        {user.role === "SYSTEM_ADMIN" && (
          <View style={c.panel}>
            <MenuRow
              icon="shield"
              title="Duyệt ngoại lệ VIP"
              last
              onPress={() => navigation.navigate("VipExceptions")}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 14, paddingBottom: 28 },
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: colors.white,
    padding: 14,
    borderRadius: 13,
    borderColor: colors.line,
    borderWidth: StyleSheet.hairlineWidth,
  },
  name: { fontSize: 16, fontWeight: "700", color: colors.ink },
  subtitle: { fontSize: 11, color: colors.muted, lineHeight: 17 },
  metrics: {
    flexDirection: "row",
    backgroundColor: colors.soft,
    borderRadius: 13,
    padding: 16,
    marginVertical: 12,
    gap: 15,
    borderWidth: 1,
    borderColor: colors.brandBorder,
  },
  metric: { flex: 1, gap: 8 },
  metricLabel: { fontSize: 10, color: colors.muted },
  amount: { fontSize: 16, color: colors.ink, fontWeight: "700" },
  divider: { width: 1, backgroundColor: colors.brandBorder },
  search: {
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: 10,
  },
  input: { flex: 1, paddingVertical: 12, fontSize: 13, color: colors.ink },
  tools: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  tool: {
    width: "31.5%",
    flexGrow: 1,
    maxWidth: "32%",
    minHeight: 108,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  toolIcon: {
    height: 37,
    width: 37,
    borderRadius: 11,
    backgroundColor: colors.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  toolLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "500",
    color: colors.ink,
    textAlign: "center",
  },
});
