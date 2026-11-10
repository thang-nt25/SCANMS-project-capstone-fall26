import type { Product, Order, Conversation } from "../types/contracts";
import type { BusinessParams } from "../features/workspace/policy";
export type RootStackParams = {
  Workspace: undefined;
  AccountSettings: undefined;
  Business: BusinessParams;
  Conversations: undefined;
  VipExceptions: undefined;
  ProductDetail: { product: Product };
  Checkout: { product: Product; variantId?: string; quantity: number };
  ProductEditor: undefined;
  OrderDetail:
    | { order: Order; publicOrderCode?: never }
    | { publicOrderCode: string; order?: never };
  Chat: { conversation: Conversation };
  Deals: undefined;
  DealEditor:
    | { product?: Product; collaboratorId?: string; collaboratorName?: string; collaboratorEmail?: string; collaboratorAvatar?: string; storeId?: string }
    | undefined;
  AiMatching: { product: Product };
  ProductReview: { product: Product };
};
