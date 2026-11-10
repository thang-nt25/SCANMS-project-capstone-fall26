import { Pressable, StyleSheet, Text, View } from "react-native";
import { Avatar, Icon } from "../../components/commerce";
import { colors } from "../../theme/tokens";

/** Connection status belongs to this client's chat channel, not Shop presence. */
export function ChatHeader({
  name,
  avatarUri,
  connected,
  onOpenStore,
}: {
  name: string;
  avatarUri?: string | null;
  connected: boolean;
  onOpenStore?(): void;
}) {
  const content = (
    <>
      <Avatar name={name} uri={avatarUri} size={38} />
      <View style={styles.details}>
        <Text numberOfLines={1} style={styles.name}>
          {name}
        </Text>
        <View style={styles.status}>
          <View
            style={[
              styles.dot,
              { backgroundColor: connected ? colors.strong : colors.muted },
            ]}
          />
          <Text
            numberOfLines={1}
            accessibilityLiveRegion="polite"
            style={styles.statusText}
          >
            {connected ? "Chat đã kết nối" : "Đang kết nối lại…"}
          </Text>
        </View>
      </View>
      {onOpenStore && (
        <Icon name="chevron-right" size={17} color={colors.muted} />
      )}
    </>
  );
  return onOpenStore ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Xem gian hàng ${name}`}
      onPress={onOpenStore}
      style={({ pressed }) => [
        styles.container,
        pressed && { backgroundColor: colors.soft },
      ]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={styles.container}>{content}</View>
  );
}
const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  details: { flex: 1, minWidth: 0, gap: 4 },
  name: { fontSize: 15, fontWeight: "600", color: colors.ink },
  status: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusText: {
    flexShrink: 1,
    fontSize: 11,
    lineHeight: 15,
    color: colors.muted,
  },
});
