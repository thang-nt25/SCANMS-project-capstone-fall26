import { ScrollView, StyleSheet, Text, View } from "react-native";
import { MenuRow, c } from "../../components/commerce";
import { useMobileNavigation } from "../../navigation/router";
import { colors } from "../../theme/tokens";
import { canOpenModule, type BusinessFeature } from "../workspace/policy";
import { useAuth } from "./AuthProvider";
import { LogoutButton } from "./LogoutButton";

/** Settings links reuse the existing role-gated features and backend validation. */
export function AccountSettingsScreen() {
  const { session } = useAuth();
  const navigation = useMobileNavigation();
  const role = session!.user.role;
  const open = (feature: BusinessFeature) =>
    navigation.navigate("Business", { feature });
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.groupTitle}>Tài khoản</Text>
      <View style={c.panel}>
        <MenuRow
          icon="shield"
          title="Hồ sơ & bảo mật"
          onPress={() => open("profile")}
        />
        {canOpenModule(role, "addresses") && (
          <MenuRow
            icon="map-pin"
            title="Địa chỉ nhận hàng"
            onPress={() => open("addresses")}
          />
        )}
        {role === "CUSTOMER" && (
          <MenuRow
            icon="user-check"
            title="Thông tin định danh"
            onPress={() => open("identity")}
          />
        )}
        <MenuRow icon="bell" title="Thông báo" last onPress={() => open("notifications")} />
      </View>
      {(canOpenModule(role, "wallet") || role === "COLLABORATOR" || role === "SHOP_MANAGER") && <>
      <Text style={styles.groupTitle}>{role === "COLLABORATOR" ? "Hồ sơ đối tác" : role === "SHOP_MANAGER" ? "Gian hàng" : "Mua sắm"}</Text>
      <View style={c.panel}>
        {canOpenModule(role, "wallet") && (
          <MenuRow
            icon="credit-card"
            title={role === "COLLABORATOR" ? "Ví thù lao" : role === "SHOP_MANAGER" ? "Tài chính Shop" : "Ví mua sắm"}
            last={role !== "COLLABORATOR" && role !== "SHOP_MANAGER"}
            onPress={() => open("wallet")}
          />
        )}
        {(role === "COLLABORATOR" || role === "SHOP_MANAGER") && (
          <MenuRow
            icon="check-circle"
            title="Xác minh KYC"
            onPress={() => open("kyc")}
          />
        )}
        {role === "COLLABORATOR" && (
          <MenuRow
            icon="link"
            title="Kênh xã hội & cấp bậc"
            last
            onPress={() => open("social")}
          />
        )}
        {role === "SHOP_MANAGER" && (
          <MenuRow
            icon="shopping-bag"
            title="Cài đặt gian hàng"
            last
            onPress={() => open("shop")}
          />
        )}
      </View>
      </>}
      <LogoutButton title="Đăng xuất" />
      <View style={styles.about}>
        <Text style={styles.brand}>SCANMS</Text>
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 14, paddingBottom: 36, gap: 14 },
  groupTitle: { color: colors.muted, fontSize: 12, fontWeight: "600", paddingHorizontal: 4, marginBottom: -6 },
  about: { alignItems: "center", paddingTop: 4 },
  brand: {
    color: colors.strong,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
  },
});
