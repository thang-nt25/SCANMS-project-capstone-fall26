import {
  createContext,
  useContext,
  useMemo,
  useRef,
  type ComponentType,
  type PropsWithChildren,
} from "react";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { Button, Caption, Screen } from "../components/ui";
import type { RootStackParams } from "./types";

const paths: Record<keyof RootStackParams, string> = {
  Workspace: "/(private)/(tabs)",
  AccountSettings: "/(private)/account-settings",
  Business: "/(private)/business",
  Conversations: "/(private)/conversations",
  VipExceptions: "/(private)/vip-exceptions",
  ProductDetail: "/(private)/product",
  Checkout: "/(private)/checkout",
  ProductEditor: "/(private)/product-editor",
  OrderDetail: "/(private)/order",
  Chat: "/(private)/conversation",
  Deals: "/(private)/vip-deals",
  DealEditor: "/(private)/deal-editor",
  AiMatching: "/(private)/ai-matching",
  ProductReview: "/(private)/product-review",
};
type Arguments<N extends keyof RootStackParams> =
  undefined extends RootStackParams[N]
    ? [name: N, params?: RootStackParams[N]]
    : [name: N, params: RootStackParams[N]];
export interface MobileNavigation {
  navigate<N extends keyof RootStackParams>(...args: Arguments<N>): void;
  replace<N extends keyof RootStackParams>(...args: Arguments<N>): void;
  goBack(): void;
}
export type ScreenProps<N extends keyof RootStackParams> = {
  route: { params: RootStackParams[N] };
  navigation: MobileNavigation;
};
const Context = createContext<{
  navigation: MobileNavigation;
  payloads: Map<string, unknown>;
} | null>(null);

/** Ephemeral screen snapshots stay in memory, never in URLs, SecureStore or a shared account cache.
 * Protected routes are owned by Expo Router. Business actions still revalidate on the backend. */
export function RoutePayloadProvider({ children }: PropsWithChildren) {
  const router = useRouter(),
    payloads = useRef(new Map<string, unknown>()),
    sequence = useRef(0);
  const navigation = useMemo<MobileNavigation>(() => {
    const target = (name: keyof RootStackParams, params: unknown): Href => {
      if (params === undefined) return paths[name] as Href;
      const key = String(++sequence.current);
      payloads.current.set(key, params);
      // Bound transient memory; an evicted/back-restored screen asks the user to reopen the list.
      if (payloads.current.size > 60)
        payloads.current.delete(payloads.current.keys().next().value!);
      return { pathname: paths[name], params: { key } } as Href;
    };
    return {
      navigate: (...[name, params]) => router.navigate(target(name, params)),
      replace: (...[name, params]) => router.replace(target(name, params)),
      goBack: () =>
        router.canGoBack()
          ? router.back()
          : router.replace("/(private)/(tabs)" as Href),
    };
  }, [router]);
  return (
    <Context.Provider value={{ navigation, payloads: payloads.current }}>
      {children}
    </Context.Provider>
  );
}
export function useMobileNavigation() {
  const context = useContext(Context);
  if (!context) throw new Error("RoutePayloadProvider is required");
  return context.navigation;
}
export function routeScreen<N extends keyof RootStackParams>(
  name: N,
  Component: ComponentType<ScreenProps<N>>,
  requiresPayload = true,
) {
  return function RoutedScreen() {
    const { key } = useLocalSearchParams<{ key?: string }>(),
      context = useContext(Context);
    if (!context) throw new Error("RoutePayloadProvider is required");
    const params = key ? context.payloads.get(key) : undefined;
    if (requiresPayload && !params)
      return (
        <Screen scroll>
          <Caption>Hãy mở lại mục này từ danh sách để tải dữ liệu mới.</Caption>
          <Button
            title="Quay lại danh sách"
            onPress={context.navigation.goBack}
          />
        </Screen>
      );
    return (
      <Component
        route={{ params: params as RootStackParams[N] }}
        navigation={context.navigation}
      />
    );
  };
}
