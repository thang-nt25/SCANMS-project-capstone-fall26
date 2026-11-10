import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";
import { Icon, IconButton, type IconName } from "../../components/commerce";
import { colors } from "../../theme/tokens";
import { money } from "../../types/contracts";
import { amount, useResource } from "../common/shared";

export function MarketplaceHeader({
  search,
  setSearch,
  submit,
  cartCount,
  unread,
  openCart,
  openChat,
  openNotifications,
}: {
  search: string;
  setSearch(value: string): void;
  submit(): void;
  cartCount: number;
  unread: number;
  openCart(): void;
  openChat(): void;
  openNotifications(): void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <View style={styles.brandRow}>
        <Text style={styles.brand}>
          SCANMS <Text style={styles.brandSub}>MARKETPLACE</Text>
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={openNotifications}
          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
        >
          <Icon name="bell" size={12} />
          <Text style={styles.brandSub}>
            Thông báo{unread ? ` · ${unread}` : ""}
          </Text>
        </Pressable>
      </View>
      <View style={styles.searchRow}>
        <View style={styles.search}>
          <Icon name="search" size={17} color={colors.muted} />
          <TextInput
            accessibilityLabel="Tìm kiếm trên SCANMS"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={submit}
            returnKeyType="search"
            placeholder="Tìm trên SCANMS"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tìm sản phẩm"
            onPress={submit}
            style={{ padding: 8 }}
          >
            <Icon name="arrow-right" size={16} color={colors.strong} />
          </Pressable>
        </View>
        <IconButton
          name="shopping-cart"
          label="Giỏ hàng"
          badge={cartCount}
          onPress={openCart}
        />
        <IconButton name="message-circle" label="Tin nhắn" onPress={openChat} />
      </View>
    </View>
  );
}
export function MarketplaceServices({
  shortcuts,
  openWallet,
  openCoupons,
}: {
  shortcuts: readonly { title: string; icon: IconName; action(): void }[];
  openWallet(): void;
  openCoupons(): void;
}) {
  const wallet = useResource(
    "home-wallet-summary",
    "/wallets/me",
    z.object({ availableBalance: amount }),
  );
  return (
    <View style={styles.services}>
      <View style={styles.utilityStrip}>
        <Pressable
          accessibilityRole="button"
          onPress={openWallet}
          style={styles.utility}
        >
          <Icon name="credit-card" size={22} color={colors.strong} />
          <View style={{ gap: 4, flex: 1 }}>
            <Text style={styles.utilityTitle}>Ví SCANMS</Text>
            <Text numberOfLines={1} style={styles.utilityDetail}>
              {wallet.data ? money(wallet.data.availableBalance) : "Xem số dư"}
            </Text>
          </View>
        </Pressable>
        <View style={styles.separator} />
        <Pressable
          accessibilityRole="button"
          onPress={openCoupons}
          style={styles.utility}
        >
          <Icon name="gift" size={22} color={colors.strong} />
          <View style={{ gap: 4, flex: 1 }}>
            <Text style={styles.utilityTitle}>Mã ưu đãi KOL</Text>
            <Text style={styles.utilityDetail}>Khám phá ưu đãi</Text>
          </View>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.shortcuts}
      >
        {shortcuts.map((item) => (
          <Pressable
            accessibilityRole="button"
            key={item.title}
            onPress={item.action}
            style={styles.shortcut}
          >
            <View style={styles.shortcutIcon}>
              <Icon name={item.icon} size={23} color={colors.strong} />
            </View>
            <Text numberOfLines={2} style={styles.shortcutLabel}>
              {item.title}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.brand,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 7,
  },
  brand: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.dark,
    letterSpacing: 1,
  },
  brandSub: {
    fontSize: 8,
    fontWeight: "500",
    color: colors.dark,
    letterSpacing: 0.5,
  },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  search: {
    flex: 1,
    height: 40,
    backgroundColor: colors.white,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 10,
    gap: 6,
  },
  input: { flex: 1, paddingVertical: 8, fontSize: 13, color: colors.ink },
  services: { backgroundColor: colors.brand, paddingTop: 3 },
  utilityStrip: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: 10,
    marginHorizontal: 12,
    alignItems: "center",
    paddingVertical: 11,
  },
  utility: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 12,
  },
  utilityTitle: { color: colors.ink, fontSize: 12, fontWeight: "700" },
  utilityDetail: { fontSize: 10, color: colors.strong },
  separator: { width: 1, height: 29, backgroundColor: colors.line },
  shortcuts: {
    paddingHorizontal: 8,
    paddingTop: 15,
    paddingBottom: 12,
    gap: 4,
  },
  shortcut: { alignItems: "center", width: 67, gap: 7 },
  shortcutIcon: {
    width: 41,
    height: 41,
    borderRadius: 12,
    backgroundColor: colors.white,
    justifyContent: "center",
    alignItems: "center",
  },
  shortcutLabel: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.dark,
    fontWeight: "500",
    textAlign: "center",
  },
});
