import { Image, Text } from "react-native";
import {
  Button,
  Caption,
  Card,
  ErrorNotice,
  Screen,
  Title,
} from "../../components/ui";
import { useAuth } from "./AuthProvider";
import { useStoreScope } from "./StoreScope";
import { useOperation } from "../../hooks/useOperation";
import { environment } from "../../config/environment";
import { roleLabels } from "../../types/contracts";
import { useMobileNavigation } from "../../navigation/router";
export function ProfileScreen() {
  const navigation = useMobileNavigation();
  const { session, logout, restore } = useAuth(),
    { store, select } = useStoreScope(),
    operation = useOperation();
  return (
    <Screen scroll>
      <Image
        source={require("../../../assets/scanms-logo-full.png")}
        style={{ width: 220, height: 70 }}
        resizeMode="contain"
      />
      <Title>{session!.user.fullName}</Title>
      <Text>{session!.user.email}</Text>
      <Caption>{roleLabels[session!.user.role]}</Caption>
      <Button
        title="Hồ sơ & bảo mật"
        secondary
        onPress={() => navigation.navigate("Business", { feature: "profile" })}
      />
      <Button
        title="Trung tâm thông báo"
        secondary
        onPress={() =>
          navigation.navigate("Business", { feature: "notifications" })
        }
      />
      {session!.bootstrap.managedStores.length > 0 && (
        <>
          <Title>Gian hàng phụ trách</Title>
          {session!.bootstrap.managedStores.map((item) => (
            <Button
              key={item.id}
              title={`${item.id === store?.id ? "✓ " : ""}${item.name}`}
              secondary={item.id !== store?.id}
              onPress={() => select(item.id)}
            />
          ))}
        </>
      )}
      <Card style={{ marginHorizontal: 0 }}>
        <Caption>Môi trường kết nối</Caption>
        <Text selectable>{environment.apiUrl}</Text>
        <Caption>
          Phiên hết hạn yêu cầu đăng nhập lại. Dữ liệu nghiệp vụ lấy từ cùng hệ
          thống với web.
        </Caption>
      </Card>
      <ErrorNotice error={operation.error} />
      <Button
        title="Làm mới phiên và quyền"
        secondary
        loading={operation.busy}
        onPress={() => void operation.run(restore)}
      />
      <Button
        title="Đăng xuất"
        danger
        disabled={operation.busy}
        onPress={() => void operation.run(logout)}
      />
    </Screen>
  );
}
