import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { customerGhnSimulationDetail } from './customer-ghn-simulation';

// Reconcile the persisted Sandbox clock before filtering/paginating orders.
// Delivery does not confirm receipt, complete an order or settle any money.
export async function syncCustomerGhnSimulations(
  prisma: PrismaService,
  scope: Prisma.OrderWhereInput = {},
  now = Date.now(),
) {
  const candidates = await prisma.order.findMany({
    where: { AND: [scope, { status: OrderStatus.SHIPPING },
      { rawPayload: { path: ['ghnEnvironment'], equals: 'TEST' } },
      { rawPayload: { path: ['ghnSimulation', 'version'], equals: 1 } }], },
    select: { id: true, rawPayload: true },
  });
  let synchronized = 0;
  for (const order of candidates) {
    const raw = order.rawPayload as Record<string, any> | null;
    if (!raw || typeof raw.ghnOrderCode !== 'string') continue;
    const detail = customerGhnSimulationDetail(raw, raw.ghnOrderCode, now);
    if (detail?.status !== 'delivered') continue;
    const deliveredAt = detail.timeline.find(event => event.status === 'delivered')!.time;
    const result = await prisma.order.updateMany({
      where: { id: order.id, status: OrderStatus.SHIPPING,
        rawPayload: { equals: order.rawPayload as Prisma.InputJsonValue } },
      data: { status: OrderStatus.DELIVERED, deliveredAt: new Date(deliveredAt) },
    });
    synchronized += result.count;
  }
  return synchronized;
}
