import type { Prisma } from '@prisma/client';

export function storeOrderSearch(search: string, field = 'ALL'): Prisma.OrderWhereInput {
  const contains = { contains: search, mode: 'insensitive' as const };
  const fields: Record<string, Prisma.OrderWhereInput[]> = {
    ORDER_SN: [{ externalOrderSn: contains }, ...(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(search) ? [{ id: search }] : [])],
    CUSTOMER_NAME: [{ customerName: contains }],
    PHONE: [{ customerPhone: { contains: search.replace(/\s+/g, '') } }],
    TRACKING: ['trackingNumber', 'ghnOrderCode'].map(key => ({ rawPayload: { path: [key], string_contains: search } })),
    PRODUCT: [{ orderItems: { some: { OR: [{ product: { title: contains } }, { product: { sku: contains } }] } } }],
  };
  return { OR: field === 'ALL' ? Object.values(fields).flat() : fields[field] || [] };
}
