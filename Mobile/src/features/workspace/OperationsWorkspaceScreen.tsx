import { useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { z } from "zod";
import {
  AppBar,
  Avatar,
  Icon,
  IconButton,
  SectionHeading,
} from "../../components/commerce";
import { ErrorNotice } from "../../components/ui";
import { useMobileNavigation } from "../../navigation/router";
import { colors } from "../../theme/tokens";
import { money, roleLabels } from "../../types/contracts";
import { useActor, useResource } from "../common/shared";
import { moduleIcons } from "./module-presentation";
import { canOpenModule, modules, type BusinessFeature } from "./policy";

const QueueSummary = z.object({
  products: z.number().int().nonnegative(),
  kycApplications: z.number().int().nonnegative(),
  disputes: z.number().int().nonnegative(),
  generatedAt: z.string().datetime(),
});
const Overview = z.object({
  metrics: z.object({ totalOrders: z.number(), grossRevenue: z.number() }),
});
const shortTitles: Partial<Record<BusinessFeature, string>> = {
  samples: "Hàng mẫu & Review",
  "referral-oversight": "Giám sát tiếp thị",
  payouts: "Yêu cầu rút tiền",
  pricing: "Giá sàn & Ưu đãi",
  reviews: "Đánh giá",
  staff: "Nhân sự & Shop",
  audit: "Nhật ký vận hành",
  "manual-orders": "Tạo & Nhập đơn",
  campaigns: "Chiến dịch",
  fraud: "Giám sát rủi ro",
};

/** Operations home: pending queues first, then financial context and secondary tools. */
export function OperationsWorkspaceScreen() {
  const { user } = useActor();
  const navigation = useMobileNavigation();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const queue = useResource(
    "operations-queue",
    "/dashboard/operations/queue-summary",
    QueueSummary,
  );
  const overview = useResource(
    "workspace-overview",
    "/dashboard/realtime/overview?days=30",
    Overview,
  );
  const unread = useResource(
    "notification-count",
    "/notifications/unread-count",
    z.object({ unreadCount: z.number() }),
  );
  const open = (feature: BusinessFeature) =>
    navigation.navigate("Business", { feature });
  const rows = Object.entries(modules).filter(
    ([key, item]) =>
      ![
        "dashboard",
        "kyc",
        "returns",
        "profile",
        "notifications",
        "product-edit",
        "storefront",
      ].includes(key) &&
      canOpenModule(user.role, key) &&
      `${shortTitles[key as BusinessFeature] || ""} ${item.title}`
        .toLocaleLowerCase("vi")
        .includes(search.trim().toLocaleLowerCase("vi")),
  );
  const refresh = () => {
    void queue.refetch();
    void overview.refetch();
    void unread.refetch();
  };
  const tasks = [
    {
      title: "Sản phẩm",
      detail: "Chờ duyệt",
      icon: "package" as const,
      count: queue.data?.products,
      action: () =>
        router.navigate({
          pathname: "/(private)/(tabs)/moderation",
          params: { queue: "pending", entry: String(Date.now()) },
        }),
    },
    {
      title: "Hồ sơ KYC",
      detail: "Chờ duyệt",
      icon: "shield" as const,
      count: queue.data?.kycApplications,
      action: () =>
        navigation.navigate("Business", { feature: "kyc", pendingOnly: true }),
    },
    {
      title: "Khiếu nại",
      detail: "Chờ phân xử",
      icon: "rotate-ccw" as const,
      count: queue.data?.disputes,
      action: () =>
        navigation.navigate("Business", {
          feature: "returns",
          returnQueue: "disputes",
        }),
    },
  ];
  return (
    <View style={styles.screen}>
      <AppBar
        title={
          user.role === "SYSTEM_ADMIN" ? "Quản trị SCANMS" : "Vận hành SCANMS"
        }
        subtitle="TRUNG TÂM ĐIỀU HÀNH"
      >
        <IconButton
          name="bell"
          label="Thông báo"
          badge={unread.data?.unreadCount}
          onPress={() => open("notifications")}
        />
        <IconButton
          name="user"
          label="Tài khoản và đăng xuất"
          onPress={() => router.navigate("/(private)/(tabs)/account")}
        />
      </AppBar>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={queue.isRefetching || overview.isRefetching}
            onRefresh={refresh}
            tintColor={colors.strong}
            colors={[colors.strong]}
          />
        }
      >
        <View style={styles.identity}>
          <Avatar uri={user.avatarUrl} name={user.fullName} size={36} />
          <View style={styles.identityText}>
            <Text style={styles.name}>{user.fullName}</Text>
            <Text style={styles.muted}>{roleLabels[user.role]}</Text>
          </View>
          <Icon name="shield" size={18} color={colors.strong} />
        </View>

        <SectionHeading
          title="Chờ xử lý"
          subtitle="Các hồ sơ cần bạn xem xét"
        />
        <ErrorNotice error={queue.error} retry={() => void queue.refetch()} />
        <View style={styles.tasks}>
          {tasks.map((task) => (
            <Pressable
              key={task.title}
              accessibilityRole="button"
              accessibilityLabel={`${task.title}, ${task.count === undefined ? "chưa tải được số lượng" : `${task.count} ${task.detail.toLocaleLowerCase("vi")}`}`}
              onPress={task.action}
              style={({ pressed }) => [styles.task, pressed && styles.pressed]}
            >
              <View style={styles.taskTop}>
                <Icon name={task.icon} size={18} color={colors.strong} />
                <Icon name="chevron-right" size={13} color={colors.muted} />
              </View>
              <Text style={styles.count}>
                {task.count === undefined
                  ? "—"
                  : task.count.toLocaleString("vi-VN")}
              </Text>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <Text style={styles.taskDetail}>{task.detail}</Text>
            </Pressable>
          ))}
        </View>
        {queue.data && (
          <Text style={styles.updated}>
            Cập nhật lúc{" "}
            {new Date(queue.data.generatedAt).toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            · Kéo xuống để làm mới
          </Text>
        )}

        <SectionHeading
          title="30 ngày gần nhất"
          action="Chi tiết"
          onPress={() => open("dashboard")}
        />
        <ErrorNotice
          error={overview.error}
          retry={() => void overview.refetch()}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Xem tổng quan hoạt động 30 ngày"
          onPress={() => open("dashboard")}
          style={styles.metrics}
        >
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Giá trị đơn đã giao</Text>
            <Text style={styles.amount}>
              {overview.data ? money(overview.data.metrics.grossRevenue) : "—"}
            </Text>
            <Text style={styles.metricNote}>Đã giao & hoàn tất</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.ordersMetric}>
            <Text style={styles.metricLabel}>Tổng đơn phát sinh</Text>
            <Text style={styles.amount}>
              {overview.data
                ? overview.data.metrics.totalOrders.toLocaleString("vi-VN")
                : "—"}
            </Text>
            <Text style={styles.metricNote}>Trong cùng 30 ngày</Text>
          </View>
        </Pressable>

        <SectionHeading
          title="Công cụ quản trị"
          subtitle="Tác vụ và giám sát trên sàn"
        />
        <View style={styles.search}>
          <Icon name="search" size={17} color={colors.muted} />
          <TextInput
            accessibilityLabel="Tìm công cụ quản trị"
            placeholder="Tìm công cụ quản trị…"
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
            style={styles.input}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <IconButton
              name="x"
              label="Xóa tìm kiếm"
              onPress={() => setSearch("")}
            />
          )}
        </View>
        <View style={styles.tools}>
          {rows.map(([key, item]) => (
            <Pressable
              key={key}
              accessibilityRole="button"
              onPress={() => open(key as BusinessFeature)}
              style={({ pressed }) => [styles.tool, pressed && styles.pressed]}
            >
              <View style={styles.toolIcon}>
                <Icon
                  name={moduleIcons[key as BusinessFeature]}
                  size={19}
                  color={colors.strong}
                />
              </View>
              <Text style={styles.toolLabel}>
                {shortTitles[key as BusinessFeature] || item.title}
              </Text>
            </Pressable>
          ))}
        </View>
        {rows.length === 0 && (
          <Text style={styles.empty}>Không tìm thấy công cụ phù hợp.</Text>
        )}
        {user.role === "SYSTEM_ADMIN" && !search.trim() && (
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate("VipExceptions")}
            style={styles.exception}
          >
            <Icon name="award" size={19} color={colors.strong} />
            <View style={styles.identityText}>
              <Text style={styles.taskTitle}>Ngoại lệ VIP</Text>
              <Text style={styles.muted}>Xem xét đề xuất vượt ngưỡng Shop</Text>
            </View>
            <Icon name="chevron-right" size={16} color={colors.muted} />
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 14, paddingBottom: 28 },
  identity: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    padding: 12,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  identityText: { flex: 1, gap: 3 },
  name: { fontSize: 14, fontWeight: "700", color: colors.ink },
  muted: { fontSize: 10, lineHeight: 15, color: colors.muted },
  tasks: { flexDirection: "row", gap: 8 },
  task: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.brandBorder,
    gap: 4,
  },
  taskTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  count: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: "800",
    color: colors.ink,
    marginTop: 5,
  },
  taskTitle: { fontSize: 12, fontWeight: "600", color: colors.ink },
  taskDetail: { fontSize: 9, lineHeight: 14, color: colors.muted },
  updated: { fontSize: 9, lineHeight: 14, marginTop: 8, color: colors.muted },
  metrics: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.soft,
    borderWidth: 1,
    borderColor: colors.brandBorder,
  },
  metric: { flex: 1.3, gap: 7 },
  ordersMetric: { flex: 1, gap: 7 },
  metricLabel: { fontSize: 10, lineHeight: 15, color: colors.muted },
  amount: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "700",
    color: colors.ink,
  },
  metricNote: { fontSize: 9, color: colors.muted },
  divider: { width: 1, backgroundColor: colors.brandBorder },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    marginBottom: 10,
  },
  input: { flex: 1, paddingVertical: 12, fontSize: 12, color: colors.ink },
  tools: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tool: {
    width: "48%",
    flexGrow: 1,
    maxWidth: "49%",
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  toolIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: colors.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  toolLabel: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
    color: colors.ink,
  },
  pressed: { backgroundColor: colors.soft },
  exception: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.brandBorder,
    backgroundColor: colors.soft,
  },
  empty: { fontSize: 12, paddingVertical: 14, color: colors.muted },
});
