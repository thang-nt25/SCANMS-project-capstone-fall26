import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "../../theme/tokens";
import { Avatar, Icon } from "../../components/commerce";
import { BottomSheet } from "../../components/BottomSheet";
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
  Button,
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

function QuickAction({ title, onPress }: { title: string; onPress(): void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title.replace("\n", " ")} onPress={onPress} style={({ pressed }) => [quickStyles.tile, pressed && { backgroundColor: colors.soft, borderColor: colors.strong }]}>
    <Text numberOfLines={2} style={quickStyles.label}>{title}</Text>
  </Pressable>;
}
const quickStyles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, alignItems: "stretch" },
  tile: { flex: 1, minWidth: 0, height: 56, paddingHorizontal: 5, alignItems: "center", justifyContent: "center", backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 12 },
  label: { fontSize: 12, lineHeight: 17, fontWeight: "600", textAlign: "center", color: colors.muted },
});

function PartnerCard({ item, busy, onChat, onRespond }: {
  item: Cooperation; busy: boolean; onChat(): void; onRespond(accept: boolean): void;
}) {
  const approved = item.status === "APPROVED";
  const pending = item.status === "PENDING";
  const name = item.store?.name || "Gian hàng đối tác";
  const state = approved ? "Đang hợp tác" : pending
    ? (item.requestedByKol ? "Chờ Shop duyệt" : "Lời mời mới") : statusText(item.status);
  return <Card style={partnerStyles.card}>
    <View style={partnerStyles.identity}>
      <Avatar uri={item.store?.logoUrl} name={name} size={44} />
      <View style={partnerStyles.heading}>
        <Text style={partnerStyles.name}>{name}</Text>
        <Text style={partnerStyles.source}>{item.requestedByKol ? "Bạn gửi đề nghị hợp tác" : "Shop gửi lời mời hợp tác"}</Text>
      </View>
    </View>
    {!!item.note?.trim() && <View style={partnerStyles.note}>
      <Text style={partnerStyles.detailText}>{item.note.trim()}</Text>
    </View>}
    <View style={partnerStyles.footer}>
      <View style={partnerStyles.statusRow}>
        <Icon name={approved ? "check-circle" : pending ? "clock" : "info"} size={14} color={colors.strong} />
        <Text style={partnerStyles.status}>{state}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Nhắn tin với ${name}`} disabled={busy} onPress={onChat}
        style={({ pressed }) => [partnerStyles.chat, { opacity: busy ? 0.5 : pressed ? 0.7 : 1 }]}>
        <Icon name="message-circle" size={16} color={colors.strong} />
        <Text style={partnerStyles.chatLabel}>Nhắn tin</Text>
      </Pressable>
    </View>
    {pending && !item.requestedByKol && <View style={partnerStyles.response}>
      <View style={{ flex: 1 }}><Button title="Chấp nhận" loading={busy} onPress={() => onRespond(true)} /></View>
      <View style={{ flex: 1 }}><Button title="Từ chối" secondary disabled={busy} onPress={() => onRespond(false)} /></View>
    </View>}
  </Card>;
}
const partnerStyles = StyleSheet.create({
  card: { padding: 14, gap: 12, marginVertical: 6, borderRadius: 16 },
  identity: { flexDirection: "row", alignItems: "center", gap: 11 },
  heading: { flex: 1, minWidth: 0, gap: 6 },
  name: { fontSize: 14, lineHeight: 20, fontWeight: "700", color: colors.ink },
  source: { fontSize: 11, lineHeight: 16, color: colors.muted },
  statusRow: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 6 },
  status: { fontSize: 11, lineHeight: 16, fontWeight: "600", color: colors.strong, flexShrink: 1 },
  footer: { flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10 },
  chat: { minHeight: 44, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 11, borderWidth: 1, borderColor: colors.brandBorder, backgroundColor: colors.soft },
  chatLabel: { fontSize: 12, fontWeight: "600", color: colors.ink },
  note: { borderLeftWidth: 2, borderLeftColor: colors.brandBorder, paddingLeft: 10, paddingVertical: 2 },
  detailText: { fontSize: 12, lineHeight: 18, color: colors.muted },
  response: { flexDirection: "row", gap: 8 },
});

export function CooperationScreen() {
  const { session } = useAuth(),
    { store } = useStoreScope(),
    operation = useOperation();
  const navigation = useMobileNavigation();
  const [email, setEmail] = useState(""),
    [note, setNote] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false), [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "APPROVED" | "PENDING">("ALL");
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
        setInviteOpen(false);
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
        {!shop && (
          <View style={quickStyles.row}>
            <QuickAction title={"Tin nhắn\nđối tác"} onPress={() => navigation.navigate("Conversations")} />
            <QuickAction title={"Hàng mẫu &\nVideo review"} onPress={() => navigation.navigate("Business", { feature: "samples" })} />
            <QuickAction title={"Thỏa thuận\nVIP"} onPress={() => navigation.navigate("Deals")} />
          </View>
        )}
        {shop && <>
          <View style={quickStyles.row}><View style={{ flex: 1 }}><Button title="Mời KOL/KOC" soft disabled={!store} onPress={() => setInviteOpen(true)} /></View><View style={{ flex: 1 }}><Button title="Thỏa thuận VIP" secondary onPress={() => navigation.navigate("Deals")} /></View></View>
          <View style={merchantStyles.searchBox}><Icon name="search" size={17} color={colors.muted} /><TextInput accessibilityLabel="Tìm đối tác" value={search} onChangeText={setSearch} placeholder="Tìm tên hoặc email KOL/KOC…" placeholderTextColor={colors.muted} style={{ flex: 1, minHeight: 44, fontSize: 13, color: colors.ink }} /></View>
          <View style={quickStyles.row}>{([ ["ALL", "Tất cả"], ["APPROVED", "Đang hợp tác"], ["PENDING", "Chờ phản hồi"] ] as const).map(([value, label]) => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: filter === value }} onPress={() => setFilter(value)} style={[merchantStyles.filter, filter === value && merchantStyles.active]}><Text style={[quickStyles.label, filter === value && { color: colors.ink }]}>{label}</Text></Pressable>)}</View>
        </>}
      </View>
      <ErrorNotice
        error={result.error || operation.error}
        retry={() => void result.refetch()}
      />
      {result.isLoading ? (
        <Loading />
      ) : (
        <FlatList
          data={(result.data || []).filter(item => !shop || ((filter === "ALL" || item.status === filter) && `${item.collaborator?.fullName || ""} ${item.collaborator?.email || ""}`.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi"))))}
          keyExtractor={(item) => item.id}
          refreshing={result.isRefetching}
          onRefresh={() => void result.refetch()}
          ListEmptyComponent={
            !result.error ? (
              <Empty text="Chưa có quan hệ hoặc lời mời hợp tác." />
            ) : undefined
          }
          renderItem={({ item }) => {
            if (!shop) return <PartnerCard item={item} busy={operation.busy} onChat={() => void chat(item)} onRespond={(accept) => void respond(item, accept)} />;
            const canRespond =
              item.status === "PENDING" &&
              (shop ? item.requestedByKol : !item.requestedByKol);
            return (
              <Card style={partnerStyles.card}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Avatar uri={item.collaborator?.avatarUrl} name={item.collaborator?.fullName || item.collaborator?.email || "KOL/KOC"} size={44} />
                <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                <Text numberOfLines={2} style={{ fontSize: 15, lineHeight: 21, fontWeight: "700", color: colors.ink }}>
                  {shop
                    ? item.collaborator?.fullName || item.collaborator?.email
                    : item.store?.name}
                </Text>
                <Text style={partnerStyles.source}>{item.collaborator?.email || "Đối tác tiếp thị"}</Text>
                </View>
                </View>
                <View style={merchantStyles.state}><Icon name={item.status === "APPROVED" ? "check-circle" : "clock"} size={14} color={colors.strong} /><Text style={partnerStyles.status}>{item.status === "APPROVED" ? "Đang hợp tác" : statusText(item.status)}</Text><Text style={[partnerStyles.source, { flex: 1, textAlign: "right" }]}>{item.requestedByKol ? "KOC gửi đề nghị" : "Shop gửi lời mời"}</Text></View>
                {!!item.note?.trim() && <Text style={{ fontSize: 12, lineHeight: 18, color: colors.muted }}>{item.note.trim()}</Text>}
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
                <View style={quickStyles.row}><View style={{ flex: 1 }}><Button
                  title="Nhắn tin"
                  secondary
                  disabled={operation.busy}
                  onPress={() => void chat(item)}
                /></View>
                {shop && item.status === "APPROVED" && (
                  <View style={{ flex: 1 }}><Button
                    title="Mời VIP"
                    soft
                    onPress={() =>
                      navigation.navigate("DealEditor", {
                        collaboratorId: item.collaboratorId,
                        collaboratorName: item.collaborator?.fullName,
                        collaboratorEmail: item.collaborator?.email,
                        collaboratorAvatar: item.collaborator?.avatarUrl || undefined,
                        storeId: item.storeId,
                      })
                    }
                  /></View>
                )}</View>
              </Card>
            );
          }}
        />
      )}
      {shop && inviteOpen && <BottomSheet title="Mời đối tác tiếp thị" close={() => { if (!operation.busy) setInviteOpen(false); }}><Text style={partnerStyles.detailText}>Gửi lời mời cho tài khoản KOL/KOC trên SCANMS. Quan hệ hợp tác bắt đầu sau khi đối tác chấp nhận.</Text><Field label="Email KOL/KOC *" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Email tài khoản đối tác" editable={!operation.busy} /><Field label="Nội dung lời mời" value={note} onChangeText={setNote} maxLength={255} multiline placeholder="Giới thiệu ngắn về kế hoạch hợp tác…" editable={!operation.busy} /><ErrorNotice error={operation.error} /><Button title="Gửi lời mời hợp tác" soft loading={operation.busy} disabled={!store || !email.trim()} onPress={() => void invite()} /></BottomSheet>}
    </Screen>
  );
}
const merchantStyles = StyleSheet.create({
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.white },
  heading: { flexDirection: "row", alignItems: "center", gap: 10 }, headingIcon: { width: 40, height: 40, backgroundColor: colors.soft, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, lineHeight: 24, fontWeight: "700", color: colors.ink },
  filter: { flex: 1, minWidth: 0, minHeight: 44, borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  active: { backgroundColor: colors.soft, borderColor: colors.strong }, state: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line },
});
