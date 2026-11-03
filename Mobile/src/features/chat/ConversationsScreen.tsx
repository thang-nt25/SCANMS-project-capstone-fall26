import { FlatList, Pressable, Text } from "react-native";
import { useMobileNavigation } from "../../navigation/router";
import { useQuery } from "@tanstack/react-query";
import { conversations } from "../../services/scanms";
import {
  Badge,
  Caption,
  Card,
  Empty,
  ErrorNotice,
  Loading,
  Screen,
  Title,
} from "../../components/ui";
import { useAuth } from "../auth/AuthProvider";
import { useChat } from "../../services/realtime/ChatProvider";
export function ConversationsScreen() {
  const { session } = useAuth(),
    chat = useChat(),
    navigation = useMobileNavigation();
  const result = useQuery({
    queryKey: [session!.user.id, "conversations"],
    queryFn: ({ signal }) => conversations(signal),
    refetchInterval: 15000,
  });
  return (
    <Screen>
      <Card>
        <Badge>{chat.ready ? "Đang kết nối" : "Chưa kết nối realtime"}</Badge>
        <Caption>Cuộc trò chuyện với gian hàng và đối tác của bạn.</Caption>
      </Card>
      <ErrorNotice error={result.error} retry={() => void result.refetch()} />
      {result.isLoading ? (
        <Loading />
      ) : (
        <FlatList
          data={result.data || []}
          keyExtractor={(row) => row.id}
          refreshing={result.isRefetching}
          onRefresh={() => void result.refetch()}
          ListEmptyComponent={
            !result.error ? (
              <Empty text="Mở trang sản phẩm hoặc quan hệ hợp tác để bắt đầu trao đổi." />
            ) : undefined
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                navigation.navigate("Chat", { conversation: item })
              }
            >
              <Card>
                <Title>
                  {session!.user.role === "SHOP_MANAGER"
                    ? item.customer?.fullName ||
                      item.collaborator?.fullName ||
                      "Khách hàng"
                    : item.store.name}
                </Title>
                <Caption>
                  {item.chatMessages?.at(-1)?.messageText?.startsWith("{")
                    ? "Thông tin hợp tác"
                    : item.chatMessages?.at(-1)?.messageText ||
                      "Mở cuộc trò chuyện"}
                </Caption>
                {Boolean(item._count?.chatMessages) && (
                  <Text>{item._count!.chatMessages} tin chưa đọc</Text>
                )}
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
