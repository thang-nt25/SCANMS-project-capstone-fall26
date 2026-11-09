import { Button, ErrorNotice } from "../../components/ui";
import { useOperation } from "../../hooks/useOperation";
import { confirmAction } from "../common/shared";
import { useAuth } from "./AuthProvider";
import { IconButton } from "../../components/commerce";

/** Both entry points use the same logout, including token/cache/socket cleanup. */
export function LogoutButton({
  disabled = false,
  compact = false,
}: {
  disabled?: boolean;
  compact?: boolean;
}) {
  const { logout } = useAuth();
  const operation = useOperation();
  const confirm = () =>
    confirmAction(
      "Đăng xuất tài khoản?",
      "Bạn sẽ quay về màn đăng nhập để có thể dùng tài khoản khác.",
      () => void operation.run(logout),
    );
  if (compact)
    return (
      <IconButton
        name="log-out"
        label="Đăng xuất hoặc đổi tài khoản"
        disabled={disabled || operation.busy}
        onPress={confirm}
      />
    );
  return (
    <>
      <ErrorNotice error={operation.error} />
      <Button
        title="Đăng xuất / Đổi tài khoản"
        secondary
        loading={operation.busy}
        disabled={disabled}
        onPress={confirm}
      />
    </>
  );
}
