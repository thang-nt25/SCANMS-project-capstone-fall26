import type { ComponentProps, PropsWithChildren } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/tokens";
import { imageSource } from "../services/image-source";
import { useState } from "react";

export type IconName = ComponentProps<typeof Feather>["name"];
export function Icon({
  name,
  size = 20,
  color = colors.ink,
}: {
  name: IconName;
  size?: number;
  color?: ComponentProps<typeof Feather>["color"];
}) {
  return <Feather name={name} size={size} color={color} />;
}
export function IconButton({
  name,
  label,
  onPress,
  badge,
  disabled = false,
}: {
  name: IconName;
  label: string;
  onPress(): void;
  badge?: number;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        c.iconButton,
        { opacity: disabled ? 0.4 : pressed ? 0.6 : 1 },
      ]}
    >
      <Icon name={name} />
      {Boolean(badge) && (
        <View style={c.count}>
          <Text style={c.countText}>{badge! > 99 ? "99+" : badge}</Text>
        </View>
      )}
    </Pressable>
  );
}
export function Wordmark() {
  return (
    <View>
      <Text style={c.wordmark}>
        Scan
        <Text style={{ color: colors.strong, fontStyle: "italic" }}>MS</Text>
        <Text style={{ color: colors.brand, fontSize: 13 }}> ✦</Text>
      </Text>
      <Text style={c.wordmarkSub}>AFFILIATE MARKETPLACE</Text>
    </View>
  );
}
export function AppBar({
  title,
  subtitle,
  children,
  brand = false,
}: PropsWithChildren<{ title?: string; subtitle?: string; brand?: boolean }>) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[c.bar, { paddingTop: insets.top + 8 }]}>
      <View style={c.barRow}>
        <View style={{ flex: 1 }}>
          {brand ? (
            <Wordmark />
          ) : (
            <>
              <Text style={c.barTitle}>{title}</Text>
              {subtitle && <Text style={c.small}>{subtitle}</Text>}
            </>
          )}
        </View>
        <View style={c.inline}>{children}</View>
      </View>
    </View>
  );
}
export function SectionHeading({
  title,
  subtitle,
  action,
  onPress,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onPress?(): void;
}) {
  return (
    <View style={c.sectionHeading}>
      <View style={{ flex: 1 }}>
        <Text style={c.sectionTitle}>{title}</Text>
        {subtitle && <Text style={c.small}>{subtitle}</Text>}
      </View>
      {action && onPress && (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          hitSlop={8}
          style={c.inline}
        >
          <Text style={c.link}>{action}</Text>
          <Icon name="chevron-right" size={14} color={colors.strong} />
        </Pressable>
      )}
    </View>
  );
}
export function MenuRow({
  icon,
  title,
  detail,
  onPress,
  last = false,
  compact = false,
}: {
  icon: IconName;
  title: string;
  detail?: string;
  onPress(): void;
  last?: boolean;
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        c.menuRow,
        compact && { minHeight: 46, paddingHorizontal: 12, gap: 8 },
        !last && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.line,
        },
        pressed && { backgroundColor: colors.soft },
      ]}
    >
      <View style={c.menuIcon}>
        <Icon name={icon} size={19} color={colors.strong} />
      </View>
      <Text style={[c.menuText, compact && { fontSize: 13 }]}>{title}</Text>
      {detail && <Text style={c.small}>{detail}</Text>}
      <Icon name="chevron-right" size={17} color={colors.muted} />
    </Pressable>
  );
}
export function Avatar({
  uri,
  name,
  size = 48,
}: {
  uri?: string | null;
  name: string;
  size?: number;
}) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const source = imageSource(uri);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.soft,
        borderColor: colors.brandBorder,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {source && failedUri !== uri ? (
        <Image
          source={source}
          style={{ width: "100%", height: "100%" }}
          onError={() => setFailedUri(uri || null)}
        />
      ) : (
        <Text
          style={{
            fontSize: size * 0.38,
            fontWeight: "700",
            color: colors.strong,
          }}
        >
          {name.trim().slice(0, 1).toLocaleUpperCase("vi")}
        </Text>
      )}
    </View>
  );
}
export const c = StyleSheet.create({
  bar: {
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  barRow: { flexDirection: "row", alignItems: "center", minHeight: 40, gap: 8 },
  barTitle: { fontSize: 21, fontWeight: "700", color: colors.ink },
  wordmark: {
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: -1.1,
    color: colors.ink,
  },
  wordmarkSub: {
    fontSize: 7,
    letterSpacing: 1.2,
    fontWeight: "600",
    color: colors.muted,
    marginTop: 1,
  },
  inline: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  count: {
    position: "absolute",
    right: 0,
    top: 0,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 3,
    backgroundColor: colors.strong,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  countText: { fontSize: 9, fontWeight: "700", color: colors.white },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: colors.ink },
  small: { fontSize: 11, color: colors.muted, lineHeight: 16 },
  link: { fontSize: 12, color: colors.strong, fontWeight: "600" },
  menuRow: {
    minHeight: 54,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  menuIcon: { width: 30, alignItems: "center" },
  menuText: { flex: 1, fontSize: 14, color: colors.ink },
  panel: {
    backgroundColor: colors.white,
    borderRadius: 14,
    overflow: "hidden",
    borderColor: colors.line,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
