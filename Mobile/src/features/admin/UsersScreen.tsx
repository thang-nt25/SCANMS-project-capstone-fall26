import { useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { AppBar, Avatar, Icon, IconButton } from "../../components/commerce";
import { Empty, ErrorNotice, Loading } from "../../components/ui";
import { users } from "../../services/scanms";
import { colors } from "../../theme/tokens";
import { roleLabels, type Role } from "../../types/contracts";
import { useAuth } from "../auth/AuthProvider";

const filters: readonly { value: Role | "ALL"; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "CUSTOMER", label: "Khách hàng" },
  { value: "COLLABORATOR", label: "KOL/KOC" },
  { value: "SHOP_MANAGER", label: "Shop" },
  { value: "SYSTEM_MANAGER", label: "Vận hành" },
  { value: "SYSTEM_ADMIN", label: "Admin" },
];

export function UsersScreen() {
  const { session } = useAuth();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<Role | "ALL">("ALL");
  const result = useQuery({
    queryKey: [session!.user.id, "users"],
    queryFn: ({ signal }) => users(signal),
  });
  const keyword = search.trim().toLocaleLowerCase("vi");
  const rows =
    result.data?.filter(
      (user) =>
        (role === "ALL" || user.role === role) &&
        `${user.fullName} ${user.email}`
          .toLocaleLowerCase("vi")
          .includes(keyword),
    ) || [];

  return (
    <View style={styles.screen}>
      <AppBar title="Tài khoản sàn" subtitle="QUẢN TRỊ SCANMS">
        <IconButton
          name="refresh-cw"
          label="Làm mới tài khoản"
          disabled={result.isFetching}
          onPress={() => void result.refetch()}
        />
      </AppBar>
      <View style={styles.search}>
        <Icon name="search" size={17} color={colors.muted} />
        <TextInput
          accessibilityLabel="Tìm tài khoản theo họ tên hoặc email"
          placeholder="Tìm tên hoặc email…"
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          style={styles.input}
        />
        {search.length > 0 && (
          <IconButton
            name="x"
            label="Xóa tìm kiếm"
            onPress={() => setSearch("")}
          />
        )}
      </View>
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
          keyboardShouldPersistTaps="handled"
        >
          {filters.map((filter) => (
            <Pressable
              key={filter.value}
              accessibilityRole="button"
              accessibilityState={{ selected: role === filter.value }}
              onPress={() => setRole(filter.value)}
              style={[
                styles.filter,
                role === filter.value && styles.activeFilter,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  role === filter.value && styles.activeFilterText,
                ]}
              >
                {filter.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          {result.data
            ? `${rows.length.toLocaleString("vi-VN")} tài khoản${keyword || role !== "ALL" ? " phù hợp" : ""}`
            : "Danh sách tài khoản"}
        </Text>
        <Text style={styles.summaryText}>Kéo xuống để làm mới</Text>
      </View>
      <ErrorNotice error={result.error} retry={() => void result.refetch()} />
      <View style={styles.listFrame}>
        <FlatList
          data={rows}
          keyExtractor={(row) => row.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl
              refreshing={result.isRefetching}
              onRefresh={() => void result.refetch()}
              tintColor={colors.strong}
              colors={[colors.strong]}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            result.isLoading ? (
              <Loading />
            ) : !result.error ? (
              <Empty
                title={
                  keyword || role !== "ALL"
                    ? "Không tìm thấy tài khoản"
                    : "Chưa có tài khoản"
                }
                text={
                  keyword || role !== "ALL"
                    ? "Thử đổi từ khóa hoặc bộ lọc vai trò."
                    : "Tài khoản trên sàn sẽ hiển thị tại đây."
                }
              />
            ) : undefined
          }
          renderItem={({ item }) => (
            <View
              style={styles.row}
              accessible
              accessibilityLabel={`${item.fullName}, ${item.email}, ${roleLabels[item.role]}`}
            >
              <Avatar uri={item.avatarUrl} name={item.fullName} size={36} />
              <View style={styles.details}>
                <Text numberOfLines={2} style={styles.name}>
                  {item.fullName}
                </Text>
                <Text numberOfLines={1} style={styles.email}>
                  {item.email}
                </Text>
                <Text style={styles.role}>{roleLabels[item.role]}</Text>
              </View>
            </View>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 12,
    marginTop: 12,
    paddingHorizontal: 11,
    minHeight: 42,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    backgroundColor: colors.white,
  },
  input: { flex: 1, paddingVertical: 10, color: colors.ink, fontSize: 12 },
  filters: { gap: 6, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 9 },
  filter: {
    minHeight: 32,
    paddingHorizontal: 12,
    justifyContent: "center",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  activeFilter: { backgroundColor: colors.soft, borderColor: colors.brand },
  filterText: { fontSize: 11, fontWeight: "500", color: colors.muted },
  activeFilterText: { color: colors.dark, fontWeight: "700" },
  summary: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 9,
  },
  summaryText: { fontSize: 9, lineHeight: 14, color: colors.muted },
  listFrame: {
    flex: 1,
    marginHorizontal: 12,
    marginBottom: 10,
    overflow: "hidden",
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  row: {
    minHeight: 80,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  details: { flex: 1, gap: 4 },
  name: { color: colors.ink, fontSize: 13, lineHeight: 18, fontWeight: "600" },
  email: { color: colors.muted, fontSize: 11, lineHeight: 15 },
  role: {
    alignSelf: "flex-start",
    color: colors.strong,
    backgroundColor: colors.soft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 9,
    lineHeight: 13,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 58,
    backgroundColor: colors.line,
  },
});
