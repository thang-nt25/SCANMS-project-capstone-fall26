import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Avatar,
  Icon,
  IconButton,
  MenuRow,
  SectionHeading,
  c,
  type IconName,
} from "../../components/commerce";
import { useAuth } from "./AuthProvider";
import { useStoreScope } from "./StoreScope";
import { roleLabels } from "../../types/contracts";
import { useMobileNavigation } from "../../navigation/router";
import { colors } from "../../theme/tokens";
import { LogoutButton } from "./LogoutButton";
import { canOpenModule, type BusinessFeature } from "../workspace/policy";
import { moduleIcons } from "../workspace/module-presentation";

export function ProfileScreen() {
  const navigation = useMobileNavigation(),
    router = useRouter();
  const { session } = useAuth(),
    { store, select } = useStoreScope();
  const insets = useSafeAreaInsets();
  const user = session!.user,
    customer = user.role === "CUSTOMER";
  const open = (feature: BusinessFeature) =>
    navigation.navigate("Business", { feature });
  const entryOptions: { feature: BusinessFeature; title: string }[] = [
    { feature: "wallet", title: "Ví & lịch sử giao dịch" },
    { feature: "coupons", title: "Mã ưu đãi KOL" },
    { feature: "wishlist", title: "Sản phẩm yêu thích" },
    { feature: "addresses", title: "Sổ địa chỉ" },
    { feature: "returns", title: "Trả hàng & khiếu nại" },
    { feature: "identity", title: "Thông tin định danh" },
    { feature: "kyc", title: "Hồ sơ xác minh KYC" },
    { feature: "social", title: "Kênh xã hội & cấp bậc" },
    { feature: "samples", title: "Hàng mẫu & video review" },
    { feature: "marketing", title: "Link tiếp thị & QR" },
    { feature: "bonuses", title: "Thưởng doanh số" },
    { feature: "shop", title: "Cài đặt gian hàng" },
    { feature: "staff", title: "Nhân sự & gian hàng" },
  ];
  const entries = entryOptions.filter((item) =>
    canOpenModule(user.role, item.feature),
  );
  const utilities = entries.filter((item) =>
    ["wallet", "coupons", "wishlist", "addresses"].includes(item.feature),
  );
  const accountEntries = customer
    ? entries.filter((item) => !utilities.includes(item))
    : entries;
  const purchases: { title: string; icon: IconName; status: string }[] = [
    { title: "Chờ xác nhận", icon: "clock", status: "PENDING" },
    { title: "Đang giao", icon: "truck", status: "SHIPPING" },
    { title: "Đánh giá", icon: "star", status: "COMPLETED" },
    { title: "Đổi trả", icon: "rotate-ccw", status: "RETURNED" },
  ];
  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
          <View style={styles.headerActions}>
            <Text style={styles.headerTitle}>Tôi</Text>
            <IconButton
              name="settings"
              label="Thiết lập tài khoản"
              onPress={() => navigation.navigate("AccountSettings")}
            />
            {customer && (
              <IconButton
                name="shopping-cart"
                label="Giỏ hàng"
                onPress={() => open("cart")}
              />
            )}
            {session!.bootstrap.capabilities.includes("chat") && (
              <IconButton
                name="message-circle"
                label="Tin nhắn"
                onPress={() => navigation.navigate("Conversations")}
              />
            )}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Xem và sửa hồ sơ"
            style={styles.identity}
            onPress={() => open("profile")}
          >
            <Avatar uri={user.avatarUrl} name={user.fullName} size={58} />
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={styles.name}>{user.fullName}</Text>
              <Text style={styles.role}>{roleLabels[user.role]}</Text>
              <Text numberOfLines={1} style={styles.email}>
                {user.email}
              </Text>
            </View>
            <Icon name="chevron-right" size={19} />
          </Pressable>
          {customer && (
            <Pressable
              accessibilityRole="button"
              onPress={() => open("coupons")}
              style={styles.voucher}
            >
              <Icon name="gift" size={23} color={colors.strong} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.voucherTitle}>Ưu đãi dành cho bạn</Text>
                <Text style={styles.voucherDetail}>
                  Sao chép mã KOL và tự nhập khi thanh toán
                </Text>
              </View>
              <Icon name="chevron-right" size={17} color={colors.strong} />
            </Pressable>
          )}
        </View>
        <View style={styles.content}>
          {customer && (
            <View
              style={[c.panel, { paddingHorizontal: 12, paddingBottom: 15 }]}
            >
              <SectionHeading
                title="Đơn mua"
                action="Lịch sử mua hàng"
                onPress={() =>
                  router.navigate({
                    pathname: "/(private)/(tabs)/orders",
                    params: { status: "", entry: String(Date.now()) },
                  } as Href)
                }
              />
              <View style={styles.orderLinks}>
                {purchases.map((item) => (
                  <View key={item.title} style={styles.orderLink}>
                    <IconButton
                      name={item.icon}
                      label={item.title}
                      onPress={() =>
                        router.navigate({
                          pathname: "/(private)/(tabs)/orders",
                          params: {
                            status: item.status,
                            entry: String(Date.now()),
                          },
                        } as Href)
                      }
                    />
                    <Text style={styles.orderLabel}>{item.title}</Text>
                  </View>
                ))}
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => open("returns")}
                style={styles.returnLink}
              >
                <Icon name="rotate-ccw" size={15} color={colors.strong} />
                <Text style={styles.returnLabel}>
                  Theo dõi yêu cầu trả hàng / hoàn tiền
                </Text>
                <Icon name="chevron-right" size={14} color={colors.muted} />
              </Pressable>
            </View>
          )}
          {customer && (
            <View
              style={[c.panel, { paddingHorizontal: 12, paddingBottom: 17 }]}
            >
              <SectionHeading title="Tiện ích của tôi" />
              <View style={styles.utilityGrid}>
                {utilities.map((item) => (
                  <Pressable
                    accessibilityRole="button"
                    key={item.feature}
                    onPress={() => open(item.feature)}
                    style={styles.utility}
                  >
                    <View style={styles.utilityIcon}>
                      <Icon
                        name={moduleIcons[item.feature]}
                        size={25}
                        color={colors.strong}
                      />
                    </View>
                    <Text style={styles.utilityLabel}>
                      {item.feature === "wallet"
                        ? "Ví SCANMS"
                        : item.feature === "wishlist"
                          ? "Yêu thích"
                          : item.feature === "addresses"
                            ? "Địa chỉ"
                            : "Mã KOL"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
          <View>
            <SectionHeading
              title={customer ? "Tài khoản & hỗ trợ" : "Không gian của bạn"}
            />
            <View style={c.panel}>
              {accountEntries.map((item, index) => (
                <MenuRow
                  key={item.feature}
                  icon={moduleIcons[item.feature]}
                  title={item.title}
                  last={index === accountEntries.length - 1}
                  onPress={() => open(item.feature)}
                />
              ))}
            </View>
          </View>
          {session!.bootstrap.managedStores.length > 0 && (
            <View>
              <SectionHeading title="Gian hàng phụ trách" />
              <View style={c.panel}>
                {session!.bootstrap.managedStores.map((item, index) => (
                  <MenuRow
                    key={item.id}
                    icon={
                      item.id === store?.id ? "check-circle" : "shopping-bag"
                    }
                    title={item.name}
                    detail={item.id === store?.id ? "Đang chọn" : undefined}
                    last={index === session!.bootstrap.managedStores.length - 1}
                    onPress={() => select(item.id)}
                  />
                ))}
              </View>
            </View>
          )}
          <View style={c.panel}>
            <MenuRow
              icon="settings"
              title="Thiết lập tài khoản"
              onPress={() => navigation.navigate("AccountSettings")}
            />
            <MenuRow
              icon="bell"
              title="Thông báo"
              last
              onPress={() => open("notifications")}
            />
          </View>
          <LogoutButton />
          <View style={styles.footer}>
            <Icon name="shopping-bag" color={colors.strong} size={15} />
            <Text style={styles.footerText}>SCANMS · Mua sắm & kết nối</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  header: {
    backgroundColor: colors.brand,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  headerTitle: { flex: 1, color: colors.dark, fontSize: 16, fontWeight: "700" },
  content: { padding: 12, gap: 12 },
  identity: {
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  name: { fontSize: 18, fontWeight: "700", color: colors.ink },
  email: { fontSize: 10, color: colors.dark },
  role: { fontSize: 11, fontWeight: "600", color: colors.dark },
  voucher: {
    backgroundColor: colors.soft,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 9,
    marginTop: 5,
  },
  voucherTitle: { color: colors.ink, fontSize: 12, fontWeight: "700" },
  voucherDetail: { color: colors.muted, fontSize: 9, lineHeight: 14 },
  utilityGrid: { flexDirection: "row", gap: 6 },
  utility: { flex: 1, alignItems: "center", gap: 8 },
  utilityIcon: {
    width: 43,
    height: 43,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.soft,
    borderRadius: 12,
  },
  utilityLabel: { color: colors.ink, fontSize: 10 },
  returnLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingTop: 14,
    marginTop: 15,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  returnLabel: { flex: 1, fontSize: 10, color: colors.muted },
  orderLinks: { flexDirection: "row", justifyContent: "space-around" },
  orderLink: { flex: 1, alignItems: "center", gap: 4 },
  orderLabel: { fontSize: 10, color: colors.muted },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  footerText: { color: colors.muted, fontSize: 11 },
});
