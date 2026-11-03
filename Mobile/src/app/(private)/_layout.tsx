import { Stack } from "expo-router";
import { StoreScope } from "../../features/auth/StoreScope";
import { useAuth } from "../../features/auth/AuthProvider";
import { RoutePayloadProvider } from "../../navigation/router";
import { ChatProvider } from "../../services/realtime/ChatProvider";
import { colors } from "../../theme/tokens";

export default function PrivateLayout() {
  const { session } = useAuth();
  if (!session) return null;
  const role = session.user.role,
    reviewer = role === "SYSTEM_MANAGER" || role === "SYSTEM_ADMIN";
  const partner = role === "SHOP_MANAGER" || role === "COLLABORATOR";
  return (
    <StoreScope key={`${session.user.id}:${role}`}>
      <RoutePayloadProvider>
        <ChatProvider>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.white },
              headerTintColor: colors.ink,
              contentStyle: { backgroundColor: colors.canvas },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="business"
              options={{ title: "Nghiệp vụ SCANMS" }}
            />
            <Stack.Protected
              guard={session.bootstrap.capabilities.includes("chat")}
            >
              <Stack.Screen
                name="conversations"
                options={{ title: "Tin nhắn" }}
              />
            </Stack.Protected>
            <Stack.Protected guard={role === "SYSTEM_ADMIN"}>
              <Stack.Screen
                name="vip-exceptions"
                options={{ title: "Ngoại lệ VIP" }}
              />
            </Stack.Protected>
            <Stack.Protected guard={!reviewer}>
              <Stack.Screen
                name="product"
                options={{ title: "Thông tin sản phẩm" }}
              />
            </Stack.Protected>
            <Stack.Protected guard={role !== "COLLABORATOR"}>
              <Stack.Screen name="order" options={{ title: "Chi tiết đơn" }} />
            </Stack.Protected>
            <Stack.Protected
              guard={session.bootstrap.capabilities.includes("chat")}
            >
              <Stack.Screen
                name="conversation"
                options={{ title: "Trao đổi" }}
              />
            </Stack.Protected>
            <Stack.Protected guard={role === "SHOP_MANAGER"}>
              <Stack.Screen
                name="product-editor"
                options={{ title: "Thêm sản phẩm" }}
              />
              <Stack.Screen
                name="ai-matching"
                options={{ title: "AI Matchmaker" }}
              />
            </Stack.Protected>
            <Stack.Protected guard={partner}>
              <Stack.Screen
                name="deals"
                options={{ title: "Thỏa thuận VIP" }}
              />
              <Stack.Screen
                name="deal-editor"
                options={{ title: "Đề nghị VIP" }}
              />
            </Stack.Protected>
            <Stack.Protected guard={reviewer}>
              <Stack.Screen
                name="product-review"
                options={{ title: "Kiểm duyệt sản phẩm" }}
              />
            </Stack.Protected>
          </Stack>
        </ChatProvider>
      </RoutePayloadProvider>
    </StoreScope>
  );
}
