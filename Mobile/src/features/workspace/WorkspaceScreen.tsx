import { z } from "zod";
import { useState } from "react";
import {
  Badge,
  Button,
  Caption,
  Card,
  Screen,
  Title,
  Field,
} from "../../components/ui";
import { useMobileNavigation } from "../../navigation/router";
import { modules, canOpenModule, type BusinessFeature } from "./policy";
import { useActor, useResource } from "../common/shared";
export function WorkspaceScreen() {
  const [search, setSearch] = useState("");
  const { user, store } = useActor(),
    navigation = useMobileNavigation();
  const unread = useResource(
    "notification-count",
    "/notifications/unread-count",
    z.object({ unreadCount: z.number() }),
  );
  return (
    <Screen scroll>
      <Title>Xin chào, {user.fullName}</Title>
      <Caption>{store?.name || "Không gian làm việc SCANMS"}</Caption>
      <Field
        label="Tìm nghiệp vụ"
        placeholder="Ví dụ: Đổi trả, hàng mẫu, KYC…"
        value={search}
        onChangeText={setSearch}
      />
      {Boolean(unread.data?.unreadCount) && (
        <Badge>{unread.data!.unreadCount} thông báo chưa đọc</Badge>
      )}
      {Object.entries(modules)
        .filter(
          ([key, item]) =>
            !["product-edit", "storefront"].includes(key) &&
            item.title
              .toLocaleLowerCase("vi")
              .includes(search.toLocaleLowerCase("vi")) &&
            canOpenModule(user.role, key),
        )
        .map(([key, item]) => (
          <Card key={key} style={{ marginHorizontal: 0 }}>
            <Button
              title={
                user.role === "SHOP_MANAGER" && key === "wallet"
                  ? "Tài chính & chi trả Shop"
                  : item.title
              }
              secondary
              onPress={() =>
                navigation.navigate("Business", {
                  feature: key as BusinessFeature,
                })
              }
            />
          </Card>
        ))}
      {(user.role === "SHOP_MANAGER" || user.role === "COLLABORATOR") && (
        <>
          <Button
            title="Thỏa thuận VIP"
            secondary
            onPress={() => navigation.navigate("Deals")}
          />
          <Button
            title="Tin nhắn đối tác"
            secondary
            onPress={() => navigation.navigate("Conversations")}
          />
        </>
      )}
      {user.role === "SYSTEM_ADMIN" && (
        <Button
          title="Duyệt ngoại lệ VIP"
          secondary
          onPress={() => navigation.navigate("VipExceptions")}
        />
      )}
    </Screen>
  );
}
