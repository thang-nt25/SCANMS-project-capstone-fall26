import { z } from "zod";
import { api } from "./api";
import {
  ProductSchema,
  StoreSchema,
  OrderSchema,
  CooperationSchema,
  DealSchema,
  ConversationSchema,
  MessageSchema,
  UserSchema,
  PaginationSchema,
  type Role,
  type Product,
  type Page,
  type Order,
} from "../types/contracts";

const query = (params: Record<string, string | number | undefined>) => {
  const values = Object.entries(params).filter(
    (entry): entry is [string, string | number] =>
      entry[1] !== undefined && entry[1] !== "",
  );
  return values.length
    ? `?${values.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join("&")}`
    : "";
};
export async function products(
  role: Role,
  page: number,
  search: string,
  storeId?: string,
  signal?: AbortSignal,
  filters?: { category?: string; sortBy?: string },
): Promise<Page<Product>> {
  const path =
    role === "CUSTOMER" || role === "COLLABORATOR"
      ? "/public/products"
      : "/products";
  const data = z
    .object({ items: z.array(ProductSchema), pagination: PaginationSchema })
    .parse(
      await api.request(
        path +
          query({
            page,
            limit: 20,
            search,
            storeId,
            category: filters?.category,
            ...(path === "/public/products" ? { sortBy: filters?.sortBy } : {}),
          }),
        {
          signal,
        },
      ),
    );
  return { items: data.items, ...data.pagination };
}
export async function productDetail(id: string, signal?: AbortSignal) {
  return z
    .object({
      product: ProductSchema,
      store: StoreSchema,
      reviews: z
        .object({
          averageRating: z.number().nullable(),
          totalReviews: z.number(),
          items: z.array(
            z.object({
              id: z.string(),
              customerName: z.string(),
              rating: z.number(),
              comment: z.string(),
              images: z.array(z.string()),
              isVerifiedBuyer: z.boolean(),
              reply: z.object({ comment: z.string() }).nullish(),
            }),
          ),
        })
        .optional(),
    })
    .parse(
      await api.request(`/public/products/${encodeURIComponent(id)}/landing`, {
        signal,
      }),
    );
}
export async function orders(
  role: Role,
  page: number,
  search: string,
  storeId?: string,
  signal?: AbortSignal,
  status?: string,
): Promise<Page<Order>> {
  if (role === "CUSTOMER") {
    const result = z
      .object({ orders: z.array(OrderSchema), total: z.number() })
      .parse(
        await api.request("/customer/orders" + query({ search, status }), {
          signal,
        }),
      );
    // Customer endpoint currently returns a complete collection, not server pagination.
    return {
      items: result.orders.slice((page - 1) * 20, page * 20),
      page,
      total: result.total,
      totalPages: Math.ceil(result.total / 20),
    };
  }
  const result = z
    .object({ items: z.array(OrderSchema), pagination: PaginationSchema })
    .parse(
      await api.request(
        "/orders/my-store" +
          query({ page, limit: 20, search, storeId, status }),
        { signal },
      ),
    );
  return { items: result.items, ...result.pagination };
}
export const stores = async () =>
  z.array(StoreSchema).parse(await api.request("/public/products/stores"));
export const conversations = async (signal?: AbortSignal) =>
  z
    .array(ConversationSchema)
    .parse(await api.request("/chat/conversations", { signal }));
export const messages = async (
  id: string,
  cursor?: string,
  signal?: AbortSignal,
) =>
  z
    .array(MessageSchema)
    .parse(
      await api.request(
        `/chat/conversations/${id}/messages` + query({ take: 30, cursor }),
        { signal },
      ),
    );
export const startConversation = async (body: {
  storeId?: string;
  collaboratorId?: string;
  asCustomer?: boolean;
}) =>
  z
    .object({ id: z.string() })
    .parse(await api.request("/chat/conversations", { method: "POST", body }));
export async function cooperations(
  role: Role,
  storeId?: string,
  signal?: AbortSignal,
) {
  if (role === "COLLABORATOR")
    return z
      .array(CooperationSchema)
      .parse(
        await api.request("/store-collaborators/my-invitations", { signal }),
      );
  const result = z
    .object({
      members: z.array(CooperationSchema),
      pendingRequests: z.array(CooperationSchema),
    })
    .parse(
      await api.request("/store-collaborators/shop" + query({ storeId }), {
        signal,
      }),
    );
  return [...result.pendingRequests, ...result.members];
}
export async function deals(role: Role, signal?: AbortSignal) {
  return z
    .array(DealSchema)
    .parse(
      await api.request(
        role === "COLLABORATOR"
          ? "/affiliate-deals/mine"
          : "/affiliate-deals/shop",
        { signal },
      ),
    );
}
export const exceptions = async (signal?: AbortSignal) =>
  z
    .array(DealSchema)
    .parse(await api.request("/affiliate-deals/exceptions", { signal }));
export const dealState = async (id: string) =>
  z
    .object({
      id: z.string(),
      status: z.string(),
      initiatorRole: z.string(),
      shortUrl: z.string().nullish(),
      vipVoucherCode: z.string().nullish(),
      approvedCommissionRate: z.union([z.number(), z.string()]).nullish(),
    })
    .parse(await api.request(`/affiliate-deals/${id}`));
export const moderation = async (status: string, signal?: AbortSignal) =>
  z
    .object({ items: z.array(ProductSchema) })
    .parse(
      await api.request("/products/moderation" + query({ status }), { signal }),
    ).items;
export const users = async (signal?: AbortSignal) =>
  z.array(UserSchema).parse(await api.request("/users", { signal }));
export const recommendKocs = async (productId: string, signal?: AbortSignal) =>
  z
    .object({
      recommendedKols: z.array(
        z.object({
          collaboratorId: z.string(),
          fullName: z.string(),
          matchScore: z.number(),
          aiReasoning: z.string(),
          tierName: z.string().optional(),
          scoreBreakdown: z.record(z.string(), z.unknown()).optional(),
        }),
      ),
    })
    .parse(
      await api.request(`/ai/recommend-kols/${productId}`, {
        signal,
        timeout: 95000,
      }),
    );
