import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "../features/auth/AuthProvider";
import { queryClient } from "../services/query-client";
import { Button, ErrorNotice, Loading, Screen } from "../components/ui";
import { colors } from "../theme/tokens";
import { useFonts } from "expo-font";
import Feather from "@expo/vector-icons/Feather";

function SessionRoutes() {
  const { session, restoring, restoreError, restore, logout } = useAuth();
  if (restoring)
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  if (restoreError)
    return (
      <Screen scroll>
        <ErrorNotice error={restoreError} retry={() => void restore()} />
        <Button title="Đăng xuất phiên cũ" onPress={() => void logout()} />
      </Screen>
    );
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.canvas },
      }}
    >
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={Boolean(session)}>
        <Stack.Screen name="(private)" />
      </Stack.Protected>
    </Stack>
  );
}
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(Feather.font);
  if (!fontsLoaded && !fontError)
    return (
      <SafeAreaProvider>
        <Screen>
          <Loading />
        </Screen>
      </SafeAreaProvider>
    );
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SessionRoutes />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
