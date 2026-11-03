import { Image, Text } from "react-native";
import { Tabs } from "expo-router";
import { useAuth } from "../../../features/auth/AuthProvider";
import { ROLE_TABS, type TabKey } from "../../../navigation/role-tabs";
import { colors } from "../../../theme/tokens";
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
const icons: Record<TabKey, string> = {
  workspace: "▦",
  catalog: "▦",
  orders: "▤",
  cooperation: "◇",
  deals: "☆",
  chat: "▣",
  moderation: "✓",
  exceptions: "☆",
  users: "♙",
  account: "●",
};
export default function TabLayout() {
  const { session } = useAuth();
  if (!session) return null;
  const allowed = ROLE_TABS[session.user.role];
  return (
    <Tabs
      screenOptions={{
        headerTitle: () => (
          <Image
            source={require("../../../../assets/scanms-logo-full.png")}
            style={{ width: 155, height: 44 }}
            resizeMode="contain"
          />
        ),
        headerStyle: { backgroundColor: colors.white },
        tabBarActiveTintColor: colors.strong,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.line,
        },
        tabBarLabelStyle: { fontSize: 10 },
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      {Object.keys(labels).map((key) => (
        <Tabs.Protected key={key} guard={allowed.includes(key as TabKey)}>
          <Tabs.Screen
            name={key}
            options={{
              title: labels[key as TabKey],
              tabBarIcon: ({ color }) => (
                <Text style={{ fontSize: 23, color }}>
                  {icons[key as TabKey]}
                </Text>
              ),
            }}
          />
        </Tabs.Protected>
      ))}
    </Tabs>
  );
}
