import type { Product, Order, Conversation } from "../types/contracts";
import type { BusinessParams } from "../features/workspace/policy";
export type RootStackParams = {
  Workspace: undefined;
  AccountSettings: undefined;
  Business: BusinessParams;
  Conversations: undefined;
  VipExceptions: undefined;
  ProductDetail: { product: Product };
  ProductEditor: undefined;
  OrderDetail: { order: Order };
  Chat: { conversation: Conversation };
  Deals: undefined;
  DealEditor:
    | { product?: Product; collaboratorId?: string; collaboratorName?: string }
    | undefined;
  AiMatching: { product: Product };
  ProductReview: { product: Product };
};
