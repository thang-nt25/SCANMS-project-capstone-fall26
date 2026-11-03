import type { Role } from "../types/contracts";
export type TabKey =
  | "workspace"
  | "catalog"
  | "orders"
  | "cooperation"
  | "deals"
  | "chat"
  | "moderation"
  | "exceptions"
  | "users"
  | "account";
export const ROLE_TABS: Record<Role, readonly TabKey[]> = {
  CUSTOMER: ["workspace", "catalog", "orders", "chat", "account"],
  COLLABORATOR: ["workspace", "catalog", "cooperation", "chat", "account"],
  SHOP_MANAGER: ["workspace", "catalog", "orders", "cooperation", "account"],
  SYSTEM_MANAGER: ["workspace", "moderation", "orders", "account"],
  SYSTEM_ADMIN: ["workspace", "moderation", "users", "orders", "account"],
};
