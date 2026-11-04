import { useState } from "react";
import { FlatList, Text, View } from "react-native";
import { useMobileNavigation } from "../../navigation/router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { validateInput } from "../../utils/validate-input";
import {
  cooperations,
  conversations,
  startConversation,
} from "../../services/scanms";
import { api } from "../../services/api";
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
  s,
} from "../../components/ui";
import { useAuth } from "../auth/AuthProvider";
import { useStoreScope } from "../auth/StoreScope";
import { useOperation } from "../../hooks/useOperation";
import { statusText, type Cooperation } from "../../types/contracts";

export function CooperationScreen() {
  const { session } = useAuth(),
    { store } = useStoreScope(),
    operation = useOperation();
  const navigation = useMobileNavigation();
  const [email, setEmail] = useState(""),
    [note, setNote] = useState("");
  const role = session!.user.role,
    shop = role === "SHOP_MANAGER";
  const result = useQuery({
    queryKey: [session!.user.id, "cooperation", store?.id],
    queryFn: ({ signal }) => cooperations(role, store?.id, signal),
    refetchInterval: 15000,
    enabled: !shop || Boolean(store),
  });
  const respond = (item: Cooperation, accept: boolean) =>
    operation.run(
      () =>
        api.request(
          `/store-collaborators/${item.id}/${shop ? (accept ? "shop-approve" : "shop-reject") : accept ? "accept" : "reject"}`,
          { method: "PATCH" },
        ),
      () => result.refetch(),
    );
  const invite = () =>
    operation.run(
      async () => {
        validateInput(
          z.object({
            email: z.string().email("Email KOC không hợp lệ."),
            note: z.string().max(255),
          }),
          { email: email.trim(), note },
        );
        await api.request("/store-collaborators/invite", {
          method: "POST",
          body: { email: email.trim(), note, storeId: store?.id },
        });
        setEmail("");
        setNote("");
      },
      () => result.refetch(),
    );
  const chat = (item: Cooperation) =>
    operation.run(async () => {
      const created = await startConversation(
        shop
          ? { storeId: item.storeId, collaboratorId: item.collaboratorId }
          : { storeId: item.storeId },
      );
      const row = (await conversations()).find(
        (entry) => entry.id === created.id,
      );
      if (!row)
        throw new Error("Hội thoại đã tạo; hãy làm mới danh sách tin nhắn.");
      navigation.navigate("Chat", { conversation: row });
    });
  return (
    <Screen>
      <View style={{ padding: 16, gap: 10 }}>
        <Button
          title="Thỏa thuận VIP"
          onPress={() => navigation.navigate("Deals")}
          secondary
        />
        {shop && (
          <>
            <Caption>{store?.name}</Caption>
            <Field
              label="Mời KOC bằng email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Field
              label="Lời mời hợp tác"
              value={note}
              onChangeText={setNote}
              maxLength={255}
            />
            <Button
              title="Gửi lời mời"
              loading={operation.busy}
              disabled={!store}
              onPress={() => void invite()}
            />
          </>
        )}
        {!shop && (
          <Caption>
            Gửi yêu cầu hợp tác từ trang chi tiết sản phẩm. Danh sách này có cả
            lời mời chưa có hội thoại.
          </Caption>
        )}
      </View>
      <ErrorNotice
        error={result.error || operation.error}
        retry={() => void result.refetch()}
      />
      {result.isLoading ? (
        <Loading />
      ) : (
        <FlatList
          data={result.data || []}
          keyExtractor={(item) => item.id}
          refreshing={result.isRefetching}
          onRefresh={() => void result.refetch()}
          ListEmptyComponent={
            !result.error ? (
              <Empty text="Chưa có quan hệ hoặc lời mời hợp tác." />
            ) : undefined
          }
          renderItem={({ item }) => {
            const canRespond =
              item.status === "PENDING" &&
              (shop ? item.requestedByKol : !item.requestedByKol);
            return (
              <Card>
                <Text style={{ fontSize: 17, fontWeight: "700" }}>
                  {shop
                    ? item.collaborator?.fullName || item.collaborator?.email
                    : item.store?.name}
                </Text>
                <Badge>{statusText(item.status)}</Badge>
                <Caption>
                  {item.requestedByKol ? "KOC gửi đề nghị" : "Shop gửi lời mời"}
                </Caption>
                <Text>{item.note}</Text>
                {canRespond && (
                  <View style={s.row}>
                    <Button
                      title="Chấp nhận"
                      loading={operation.busy}
                      onPress={() => void respond(item, true)}
                    />
                    <Button
                      title="Từ chối"
                      secondary
                      disabled={operation.busy}
                      onPress={() => void respond(item, false)}
                    />
                  </View>
                )}
                <Button
                  title="Trao đổi với đối tác"
                  secondary
                  disabled={operation.busy}
                  onPress={() => void chat(item)}
                />
                {shop && item.status === "APPROVED" && (
                  <Button
                    title="Đề nghị VIP"
                    secondary
                    onPress={() =>
                      navigation.navigate("DealEditor", {
                        collaboratorId: item.collaboratorId,
                        collaboratorName: item.collaborator?.fullName,
                      })
                    }
                  />
                )}
              </Card>
            );
          }}
        />
      )}
    </Screen>
  );
}
