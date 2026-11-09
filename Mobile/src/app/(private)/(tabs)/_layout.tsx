import { View } from "react-native";
import { Tabs } from "expo-router";
import { useAuth } from "../../../features/auth/AuthProvider";
import { ROLE_TABS, type TabKey } from "../../../navigation/role-tabs";
import { colors } from "../../../theme/tokens";
import { Icon, Wordmark, type IconName } from "../../../components/commerce";
import { useSafeAreaInsets } from "react-native-safe-area-context";
const labels: Record<TabKey, string> = {
  workspace: "Nghiệp vụ",
  catalog: "Sản phẩm",
  orders: "Đơn hàng",
  cooperation: "Hợp tác",
  deals: "VIP",
  chat: "Tin nhắn",
  moderation: "Kiểm duyệt",
  exceptions: "Ngoại lệ VIP",
  users: "Tài khoản sàn",
  account: "Cá nhân",
};
const icons: Record<TabKey, IconName> = {
  workspace: "home",
  catalog: "grid",
  orders: "package",
  cooperation: "users",
  deals: "award",
  chat: "message-circle",
  moderation: "check-square",
  exceptions: "shield",
  users: "users",
  account: "user",
};
export default function TabLayout() {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  if (!session) return null;
  const allowed = ROLE_TABS[session.user.role];
  return (
    <Tabs
      screenOptions={{
        headerTitle: () => <Wordmark />,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.white },
        tabBarActiveTintColor: colors.strong,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.line,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom + 3,
          paddingTop: 5,
          elevation: 0,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "500", marginTop: 1 },
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      {Object.keys(labels).map((key) => (
        <Tabs.Protected key={key} guard={allowed.includes(key as TabKey)}>
          <Tabs.Screen
            name={key}
            options={{
              title:
                key === "workspace"
                  ? session.user.role === "CUSTOMER"
                    ? "Trang chủ"
                    : ["SYSTEM_ADMIN", "SYSTEM_MANAGER"].includes(
                          session.user.role,
                        )
                      ? "Tổng quan"
                      : "Công cụ"
                  : key === "account"
                    ? "Tôi"
                    : key === "catalog" && session.user.role === "CUSTOMER"
                      ? "Khám phá"
                      : key === "orders" && session.user.role === "CUSTOMER"
                        ? "Đơn mua"
                        : labels[key as TabKey],
              headerShown: ![
                "workspace",
                "catalog",
                "account",
                "orders",
                "users",
              ].includes(key),
              tabBarIcon: ({ color }) => (
                <View
                  style={{ alignItems: "center", justifyContent: "center" }}
                >
                  <Icon
                    name={icons[key as TabKey]}
                    size={21}
                    color={typeof color === "string" ? color : colors.strong}
                  />
                </View>
              ),
            }}
          />
        </Tabs.Protected>
      ))}
    </Tabs>
  );
}
