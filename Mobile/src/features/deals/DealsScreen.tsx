import { useState } from "react";
import * as Clipboard from "expo-clipboard";
import { FlatList, Pressable, Text, View } from "react-native";
import { BottomSheet } from "../../components/BottomSheet";
import { Icon } from "../../components/commerce";
import { useSuccessToast } from "../../components/SuccessToast";
import { d, DealProduct, DealMetric, dealScope, dealDate } from "./deal-presentation";
import { useQuery } from "@tanstack/react-query";
import { useMobileNavigation } from "../../navigation/router";
import { deals, dealState, exceptions } from "../../services/scanms";
import { api } from "../../services/api";
import { useAuth } from "../auth/AuthProvider";
import { useOperation } from "../../hooks/useOperation";
import {
  Badge,
  Button,
  Caption,
  Empty,
  ErrorNotice,
  Field,
  Loading,
  Screen,
} from "../../components/ui";
import { money, statusText, type Deal } from "../../types/contracts";
import { canRespondToDeal } from "./deal-policy";

export function DealsScreen({
  exceptionQueue = false,
}: {
  exceptionQueue?: boolean;
}) {
  const { session } = useAuth(),
    operation = useOperation();
  const navigation = useMobileNavigation();
  const toast = useSuccessToast();
  const [selected, setSelected] = useState<Deal | null>(null),
    [note, setNote] = useState(""),
    [discount, setDiscount] = useState("5"),
    [budget, setBudget] = useState("1000000");
  const role = session!.user.role;
  const result = useQuery({
    queryKey: [session!.user.id, exceptionQueue ? "exceptions" : "deals"],
    queryFn: ({ signal }) =>
      exceptionQueue ? exceptions(signal) : deals(role, signal),
    refetchInterval: 15000,
  });
  const state = useQuery({
    queryKey: [session!.user.id, "deal-state", selected?.id],
    queryFn: () => dealState(selected!.id),
    enabled: Boolean(selected),
    refetchInterval: 10000,
  });
  const decide = (approve: boolean) =>
    operation.run(
      async () => {
        if (!selected) return;
        if (exceptionQueue) {
          if (note.trim().length < 10)
            throw new Error("Lý do duyệt ngoại lệ cần ít nhất 10 ký tự.");
          await api.request(
            `/affiliate-deals/${selected.id}/exception-review`,
            {
              method: "PATCH",
              body: { approve, note: note.trim() },
              timeout: 95000,
            },
          );
        } else {
          if (!approve && note.trim().length < 5)
            throw new Error("Nhập lý do từ chối ít nhất 5 ký tự.");
          if (
            approve &&
            role === "SHOP_MANAGER" &&
            (!Number.isInteger(Number(discount)) ||
              Number(discount) < 1 ||
              Number(discount) > 20 ||
              Number(budget) <= 0)
          )
            throw new Error("Kiểm tra mức giảm coupon và ngân sách.");
          await api.request(
            `/affiliate-deals/${selected.id}/${approve ? "approve" : "reject"}`,
            {
              method: "PATCH",
              body: approve
                ? role === "SHOP_MANAGER"
                  ? {
                      discountPercent: Number(discount),
                      budgetTotal: Number(budget),
                    }
                  : {}
                : { reason: note.trim() },
              timeout: 95000,
            },
          );
        }
      },
      async () => {
        setSelected(null);
        await result.refetch();
      },
    );
  return (
    <Screen>
      <View style={{ padding: 12, gap: 10 }}>
        {exceptionQueue && <Caption>Đề nghị trên 16% cần Admin độc lập phê duyệt.</Caption>}
        {role === "COLLABORATOR" && !exceptionQueue && (
          <View style={[d.row, { justifyContent: "flex-end" }]}><Pressable accessibilityRole="button" style={d.action} onPress={() => navigation.navigate("DealEditor")}><Icon name="plus" size={17} /><Text style={d.actionText}>Đề xuất VIP</Text></Pressable></View>
        )}
      </View>
      <ErrorNotice error={result.error} retry={() => void result.refetch()} />
      {result.isLoading ? (
        <Loading />
      ) : (
        <FlatList
          data={result.data || []}
          keyExtractor={(row) => row.id}
          refreshing={result.isRefetching}
          onRefresh={() => void result.refetch()}
          ListEmptyComponent={!result.error ? <Empty /> : undefined}
          renderItem={({ item }) => (
            <View style={d.card}>
              <DealProduct title={item.product?.title || "Thỏa thuận VIP"} imageUrl={item.product?.imageUrl} store={item.store?.name} subtitle={role === "COLLABORATOR" ? undefined : item.collaborator?.fullName || undefined} />
              <View style={[d.row, { justifyContent: "space-between" }]}>
              <Badge>{statusText(item.status)}</Badge>
              <Text style={d.tiny}>{dealScope(item)}</Text></View>
              <View style={d.row}><DealMetric label={item.approvedCommissionRate != null ? "Tỷ lệ được duyệt" : "Tỷ lệ đề nghị"} value={`${item.approvedCommissionRate ?? item.proposedCommissionRate}%`} /><DealMetric label="Mục tiêu doanh thu" value={item.targetRevenue != null ? money(item.targetRevenue) : "Chưa có dữ liệu"} /></View>
              {item.commitmentDays != null && <Text style={d.tiny}>{item.commitmentStartedAt ? "Kỳ cam kết:" : "Thời hạn đề nghị:"} {item.commitmentDays} ngày{item.commitmentEndsAt ? ` · Đến ${dealDate(item.commitmentEndsAt)}` : " · Chưa bắt đầu"}</Text>}
              <Button
                title="Chi tiết thỏa thuận"
                secondary
                onPress={() => {
                  operation.clearError();
                  setNote("");
                  setSelected(item);
                }}
              />
            </View>
          )}
        />
      )}
      {selected && <BottomSheet title="Chi tiết thỏa thuận VIP" close={() => { if (!operation.busy) setSelected(null); }}>
            <DealProduct title={selected.product?.title || "Thỏa thuận VIP"} imageUrl={selected.product?.imageUrl} store={selected.store?.name} />
            <Badge>
              {statusText(state.data?.status || selected?.status || "")}
            </Badge>
            <View style={d.row}><DealMetric label="Tỷ lệ đề nghị" value={`${selected.proposedCommissionRate}%`} /><DealMetric label="Mục tiêu doanh thu" value={selected.targetRevenue != null ? money(selected.targetRevenue) : "Chưa có dữ liệu"} /></View>
            <View style={d.section}><Text style={d.name}>Phạm vi & thời hạn</Text><Text style={d.note}>{dealScope(selected)}</Text>{selected.commitmentDays != null && <Text style={d.note}>{selected.commitmentStartedAt ? "Kỳ cam kết" : "Thời hạn đề nghị"}: {selected.commitmentDays} ngày</Text>}<Text style={d.tiny}>{selected.commitmentStartedAt ? `Bắt đầu: ${dealDate(selected.commitmentStartedAt)}` : "Chưa bắt đầu tính thời hạn · Chờ duyệt đầy đủ"}</Text><Text style={d.tiny}>Hạn cam kết: {selected.commitmentEndsAt ? dealDate(selected.commitmentEndsAt) : "Chưa có hạn được ghi nhận"}</Text>{selected.createdAt && <Text style={d.tiny}>Ngày đề nghị: {dealDate(selected.createdAt)}</Text>}{(state.data?.closedAt || selected.closedAt) && <Text style={d.tiny}>Đã đóng: {dealDate(state.data?.closedAt || selected.closedAt)}</Text>}</View>
            {state.data?.exceptionNote && <View style={d.soft}><Text style={d.name}>Ghi chú xét duyệt</Text><Text style={d.note}>{state.data.exceptionNote}</Text></View>}
            <View style={d.soft}><Text style={d.name}>Kế hoạch hợp tác</Text><Text style={d.note}>{selected.salesCommitment || "Chưa có nội dung kế hoạch được lưu."}</Text></View>
            {state.data?.status === "APPROVED" && (
              <>
                <Caption>
                  Thù lao được duyệt:{" "}
                  {state.data.approvedCommissionRate ??
                    selected?.approvedCommissionRate}
                  %
                </Caption>
                {state.data.shortUrl && (
                  <>
                    <Text selectable>{state.data.shortUrl}</Text>
                    <Button
                      title="Sao chép link VIP"
                      secondary
                      disabled={operation.busy}
                      onPress={() =>
                        void operation.run(async () => {
                          await Clipboard.setStringAsync(state.data!.shortUrl!); toast("Đã sao chép link VIP"); },
                        )
                      }
                    />
                  </>
                )}
                {state.data.vipVoucherCode && <View style={d.section}><Text style={d.tiny}>Mã độc quyền</Text><Text selectable style={d.name}>{state.data.vipVoucherCode}</Text><Button title="Sao chép mã" secondary disabled={operation.busy} onPress={() => void operation.run(async () => { await Clipboard.setStringAsync(state.data!.vipVoucherCode!); toast("Đã sao chép mã VIP"); })} /></View>}
              </>
            )}
            <ErrorNotice
              error={state.error || operation.error}
              retry={() => void state.refetch()}
            />
            {!state.isLoading &&
              !state.error &&
              ((exceptionQueue &&
                state.data?.status === "PENDING_ADMIN_APPROVAL") ||
                canRespondToDeal(
                  role,
                  state.data?.status || "",
                  state.data?.initiatorRole,
                )) && (
                <>
                  <Field
                    label={
                      exceptionQueue
                        ? "Lý do quyết định (ít nhất 10 ký tự)"
                        : "Lý do nếu từ chối"
                    }
                    value={note}
                    onChangeText={setNote}
                    multiline
                    editable={!operation.busy}
                  />
                  {!exceptionQueue && role === "SHOP_MANAGER" && (
                    <>
                      <Field
                        label="Giảm giá coupon (%)"
                        value={discount}
                        onChangeText={setDiscount}
                        keyboardType="numeric"
                      />
                      <Field
                        label="Ngân sách coupon (đ)"
                        value={budget}
                        onChangeText={setBudget}
                        keyboardType="numeric"
                      />
                    </>
                  )}
                  <Button
                    title="Chấp nhận"
                    loading={operation.busy}
                    onPress={() => void decide(true)}
                  />
                  <Button
                    title="Từ chối"
                    secondary
                    disabled={operation.busy}
                    onPress={() => void decide(false)}
                  />
                </>
              )}
            {state.isLoading && <Loading />}
            <Button
              title="Đóng"
              secondary
              disabled={operation.busy}
              onPress={() => setSelected(null)}
            />
      </BottomSheet>}
    </Screen>
  );
}
