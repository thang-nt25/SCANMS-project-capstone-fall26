import { NotificationBell } from "../account/NotificationBell";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, IconButton, Wordmark } from "../../components/commerce";
import { useMobileNavigation } from "../../navigation/router";
import { colors } from "../../theme/tokens";
import { useActor } from "../common/shared";

export function KolSectionHeader() {
  const { user } = useActor();
  const router = useRouter();
  const navigation = useMobileNavigation();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Về Tổng quan"
          onPress={() => router.navigate("/(private)/(tabs)/workspace")}
          style={styles.brand}
        >
          <Wordmark />
        </Pressable>
        <View style={styles.actions}>
          <IconButton name="message-circle" label="Tin nhắn đối tác" onPress={() => navigation.navigate("Conversations")} />
          <NotificationBell />
          <Pressable accessibilityRole="button" accessibilityLabel="Mở hồ sơ của tôi" onPress={() => router.navigate("/(private)/(tabs)/account")} style={styles.avatar}>
            <Avatar uri={user.avatarUrl} name={user.fullName} size={30} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line, paddingHorizontal: 14, paddingBottom: 10, gap: 6 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  brand: { flex: 1 },
  actions: { flexDirection: "row", alignItems: "center", gap: 2 },
  avatar: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 16, lineHeight: 22, fontWeight: "700", color: colors.ink },
});
