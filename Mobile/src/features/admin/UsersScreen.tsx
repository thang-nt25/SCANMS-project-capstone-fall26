import { useState } from "react";
import { FlatList, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { users } from "../../services/scanms";
import {
  Badge,
  Caption,
  Card,
  Empty,
  ErrorNotice,
  Field,
  Loading,
  Screen,
  Title,
} from "../../components/ui";
import { useAuth } from "../auth/AuthProvider";
import { roleLabels } from "../../types/contracts";
export function UsersScreen() {
  const { session } = useAuth(),
    [search, setSearch] = useState("");
  const result = useQuery({
    queryKey: [session!.user.id, "users"],
    queryFn: ({ signal }) => users(signal),
  });
  const rows =
    result.data?.filter((user) =>
      `${user.fullName} ${user.email}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    ) || [];
  return (
    <Screen>
      <View style={{ padding: 16 }}>
        <Field
          label="Tìm tài khoản"
          value={search}
          onChangeText={setSearch}
          placeholder="Họ tên hoặc email…"
        />
      </View>
      <ErrorNotice error={result.error} retry={() => void result.refetch()} />
      {result.isLoading ? (
        <Loading />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row) => row.id}
          refreshing={result.isRefetching}
          onRefresh={() => void result.refetch()}
          ListEmptyComponent={!result.error ? <Empty /> : undefined}
          renderItem={({ item }) => (
            <Card>
              <Title>{item.fullName}</Title>
              <Text>{item.email}</Text>
              <Badge>{roleLabels[item.role]}</Badge>
              <Caption>Thông tin tài khoản từ hệ thống SCANMS</Caption>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
