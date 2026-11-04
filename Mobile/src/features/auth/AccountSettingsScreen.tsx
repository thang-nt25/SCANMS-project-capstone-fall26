import { ScrollView, StyleSheet, Text, View } from "react-native";
import { MenuRow, c } from "../../components/commerce";
import { ErrorNotice } from "../../components/ui";
import { useMobileNavigation } from "../../navigation/router";
import { useOperation } from "../../hooks/useOperation";
import { colors } from "../../theme/tokens";
import { canOpenModule, type BusinessFeature } from "../workspace/policy";
import { useAuth } from "./AuthProvider";
import { LogoutButton } from "./LogoutButton";

/** Settings links reuse the existing role-gated features and backend validation. */
export function AccountSettingsScreen() {
  const { session, restore } = useAuth();
  const navigation = useMobileNavigation();
  const operation = useOperation();
  const role = session!.user.role;
  const open = (feature: BusinessFeature) =>
    navigation.navigate("Business", { feature });
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Tài khoản của tôi</Text>
      <View style={c.panel}>
        <MenuRow
          icon="shield"
          title="Tài khoản & bảo mật"
          onPress={() => open("profile")}
        />
        {canOpenModule(role, "addresses") && (
          <MenuRow
            icon="map-pin"
            title="Địa chỉ nhận hàng"
            onPress={() => open("addresses")}
          />
        )}
        {canOpenModule(role, "wallet") && (
          <MenuRow
            icon="credit-card"
            title="Ví & thông tin ngân hàng"
            onPress={() => open("wallet")}
          />
        )}
        {role === "CUSTOMER" && (
          <MenuRow
            icon="user-check"
            title="Thông tin định danh"
            onPress={() => open("identity")}
          />
        )}
        {(role === "COLLABORATOR" || role === "SHOP_MANAGER") && (
          <MenuRow
            icon="check-circle"
            title="Hồ sơ xác minh KYC"
            onPress={() => open("kyc")}
          />
        )}
        {role === "COLLABORATOR" && (
          <MenuRow
            icon="link"
            title="Kênh xã hội & cấp bậc"
            onPress={() => open("social")}
          />
        )}
        {role === "SHOP_MANAGER" && (
          <MenuRow
            icon="shopping-bag"
            title="Cài đặt gian hàng"
            onPress={() => open("shop")}
          />
        )}
        <MenuRow
          icon="bell"
          title="Trung tâm thông báo"
          last
          onPress={() => open("notifications")}
        />
      </View>
      <Text style={styles.heading}>Phiên đăng nhập</Text>
      <View style={c.panel}>
        <MenuRow
          icon="refresh-cw"
          title={
            operation.busy
              ? "Đang làm mới tài khoản…"
              : "Làm mới tài khoản & quyền truy cập"
          }
          last
          onPress={() => void operation.run(restore)}
        />
      </View>
      <ErrorNotice error={operation.error} />
      <LogoutButton disabled={operation.busy} />
      <View style={styles.about}>
        <Text style={styles.brand}>SCANMS</Text>
        <Text style={styles.caption}>
          Sàn thương mại tiếp thị liên kết{"\n"}& mạng lưới gian hàng đối tác
        </Text>
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 14, paddingBottom: 36, gap: 14 },
  heading: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  about: { alignItems: "center", gap: 7, paddingTop: 18 },
  brand: {
    color: colors.strong,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 2,
  },
  caption: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
  },
});
