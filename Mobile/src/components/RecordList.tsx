import { useState, type PropsWithChildren, type ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Icon, IconButton, type IconName } from "./commerce";
import { colors } from "../theme/tokens";

export function SearchToolbar({
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled = false,
}: {
  value: string;
  onChange(value: string): void;
  onSubmit(): void;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <View style={styles.search}>
      <Icon name="search" size={16} color={colors.muted} />
      <TextInput
        accessibilityLabel={placeholder}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        value={value}
        onChangeText={onChange}
        editable={!disabled}
        autoCapitalize="none"
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        style={styles.searchInput}
      />
      <IconButton
        name="arrow-right"
        label="Tìm kiếm"
        disabled={disabled}
        onPress={onSubmit}
      />
    </View>
  );
}

/** Compact summaries keep long evidence and commands out of the initial list. */
export function RecordRow({
  title,
  subtitle,
  meta,
  badge,
  icon = "file-text",
  onPress,
  disabled = false,
  accessory,
}: {
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  badge?: string;
  icon?: IconName;
  onPress(): void;
  disabled?: boolean;
  accessory?: ReactNode;
}) {
  return (
    <View style={styles.rowFrame}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}${badge ? `, ${badge}` : ""}`}
        accessibilityHint="Mở thông tin và thao tác"
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <View style={styles.icon}>
          <Icon name={icon} size={18} color={colors.strong} />
        </View>
        <View style={styles.body}>
          <Text numberOfLines={2} style={styles.title}>
            {title}
          </Text>
          {Boolean(subtitle) && (
            <Text numberOfLines={1} style={styles.subtitle}>
              {subtitle}
            </Text>
          )}
          {Boolean(meta) && (
            <Text numberOfLines={2} style={styles.subtitle}>
              {meta}
            </Text>
          )}
          {badge && <Text style={styles.badge}>{badge}</Text>}
        </View>
        <Icon name="chevron-right" size={15} color={colors.muted} />
      </Pressable>
      {accessory}
    </View>
  );
}

export function ExpandableRecord({
  title,
  subtitle,
  meta,
  badge,
  icon = "file-text",
  children,
  disabled = false,
  accessory,
}: PropsWithChildren<{
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  badge?: string;
  icon?: IconName;
  disabled?: boolean;
  accessory?: ReactNode;
}>) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={styles.expandable}>
      <View style={styles.rowFrame}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded, disabled }}
          accessibilityLabel={`${title}${badge ? `, ${badge}` : ""}`}
          onPress={() => setExpanded(!expanded)}
          disabled={disabled}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <View style={styles.icon}>
            <Icon name={icon} size={18} color={colors.strong} />
          </View>
          <View style={styles.body}>
            <Text numberOfLines={2} style={styles.title}>
              {title}
            </Text>
            {Boolean(subtitle) && (
              <Text numberOfLines={1} style={styles.subtitle}>
                {subtitle}
              </Text>
            )}
            {Boolean(meta) && (
              <Text numberOfLines={2} style={styles.subtitle}>
                {meta}
              </Text>
            )}
            {badge && <Text style={styles.badge}>{badge}</Text>}
          </View>
          <Icon
            name={expanded ? "chevron-up" : "chevron-down"}
            size={15}
            color={colors.muted}
          />
        </Pressable>
        {accessory}
      </View>
      {expanded && <View style={styles.expanded}>{children}</View>}
    </View>
  );
}

export function FilterTabs({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange(value: string): void;
  disabled?: boolean;
}) {
  return (
    <View accessibilityLabel={label}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.filters}
      >
        {options.map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: value === option.value, disabled }}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            style={[styles.tab, value === option.value && styles.activeTab]}
          >
            <Text
              style={[
                styles.tabText,
                value === option.value && styles.activeTabText,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export function InfoLine({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text selectable style={styles.infoValue}>
        {value ?? "Chưa có thông tin"}
      </Text>
    </View>
  );
}

export function SectionTitle({ children }: PropsWithChildren) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

const styles = StyleSheet.create({
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 11,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    backgroundColor: colors.white,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 12,
    color: colors.ink,
  },
  rowFrame: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    minHeight: 76,
  },
  pressed: { backgroundColor: colors.soft },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.soft,
  },
  body: { flex: 1, gap: 4 },
  title: { fontSize: 13, lineHeight: 18, fontWeight: "600", color: colors.ink },
  subtitle: { fontSize: 11, lineHeight: 16, color: colors.muted },
  badge: {
    alignSelf: "flex-start",
    fontSize: 10,
    lineHeight: 15,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.soft,
    color: colors.strong,
  },
  expandable: {
    borderRadius: 12,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  expanded: {
    padding: 12,
    paddingTop: 10,
    gap: 9,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  filters: { gap: 7, paddingVertical: 2 },
  tab: {
    minHeight: 36,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    paddingHorizontal: 13,
    backgroundColor: colors.white,
  },
  activeTab: { borderColor: colors.brand, backgroundColor: colors.soft },
  tabText: { color: colors.muted, fontSize: 11, fontWeight: "500" },
  activeTabText: { color: colors.dark, fontWeight: "700" },
  info: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 4,
  },
  infoLabel: {
    width: "32%",
    fontSize: 11,
    lineHeight: 18,
    color: colors.muted,
  },
  infoValue: { flex: 1, fontSize: 12, lineHeight: 18, color: colors.ink },
  sectionTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    color: colors.ink,
  },
});
