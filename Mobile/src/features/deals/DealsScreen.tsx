import { useState } from "react";
import * as Clipboard from "expo-clipboard";
import { FlatList, Modal, ScrollView, Text, View } from "react-native";
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
  Card,
  Empty,
  ErrorNotice,
  Field,
  Loading,
  Screen,
  Title,
} from "../../components/ui";
import { colors } from "../../theme/tokens";
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
      <View style={{ padding: 16, gap: 10 }}>
        <Caption>
          {exceptionQueue
            ? "Đề nghị trên 16% cần Admin độc lập phê duyệt."
            : "Theo dõi trạng thái thực tế của các đề nghị hai chiều."}
        </Caption>
        {role === "COLLABORATOR" && !exceptionQueue && (
          <Button
            title="Đề xuất VIP"
            onPress={() => navigation.navigate("DealEditor")}
          />
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
            <Card>
              <Title>
                {item.product?.title || item.store?.name || "Thỏa thuận VIP"}
              </Title>
              <Caption>
                {item.collaborator?.fullName || item.store?.name}
              </Caption>
              <Badge>{statusText(item.status)}</Badge>
              <Text
                style={{
                  fontSize: 24,
                  color: colors.strong,
                  fontWeight: "700",
                }}
              >
                {item.proposedCommissionRate}%
              </Text>
              <Caption>Mục tiêu doanh thu: {money(item.targetRevenue)}</Caption>
              <Button
                title="Xem và phản hồi"
                secondary
                onPress={() => {
                  operation.clearError();
                  setNote("");
                  setSelected(item);
                }}
              />
            </Card>
          )}
        />
      )}
      <Modal
        visible={Boolean(selected)}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!operation.busy) setSelected(null);
        }}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "#231D1570",
          }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={{
              maxHeight: "90%",
              backgroundColor: colors.canvas,
              borderTopLeftRadius: 26,
              borderTopRightRadius: 26,
            }}
            contentContainerStyle={{ padding: 24, gap: 16, paddingBottom: 40 }}
          >
            <Title>{selected?.product?.title || "Chi tiết thỏa thuận"}</Title>
            <Caption>{selected?.store?.name}</Caption>
            <Badge>
              {statusText(state.data?.status || selected?.status || "")}
            </Badge>
            <Text>Thù lao đề nghị: {selected?.proposedCommissionRate}%</Text>
            <Text>Mục tiêu: {money(selected?.targetRevenue)}</Text>
            <Caption>{selected?.salesCommitment}</Caption>
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
                        void operation.run(() =>
                          Clipboard.setStringAsync(state.data!.shortUrl!),
                        )
                      }
                    />
                  </>
                )}
                {state.data.vipVoucherCode && (
                  <Text>Mã coupon: {state.data.vipVoucherCode}</Text>
                )}
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
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );
}
