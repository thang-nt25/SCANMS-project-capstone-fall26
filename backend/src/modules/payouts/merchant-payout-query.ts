import { KycStatus, PayoutStatus, Prisma } from '@prisma/client';
import { isUUID } from 'class-validator';
import { vietnamDayStart, DAY_MS } from '../dashboard/analytics-time';
import { MerchantPayoutFilter, QueryMerchantPayoutsDto } from './dto/manage-payout.dto';

export function merchantPayoutScopes(storeId: string, now = new Date()) {
  const start = vietnamDayStart(now);
  const end = new Date(start.getTime() + DAY_MS);
  const pending: Prisma.PayoutRequestWhereInput = { storeId, status: PayoutStatus.PENDING };
  const approvedToday: Prisma.PayoutRequestWhereInput = { storeId, status: PayoutStatus.APPROVED, processedAt: { gte: start, lt: end } };
  const tax: Prisma.PayoutRequestWhereInput = { storeId, status: PayoutStatus.APPROVED, taxAmount: { gt: 0 } };
  const kyc: Prisma.PayoutRequestWhereInput = { storeId, status: { in: [PayoutStatus.PENDING, PayoutStatus.PROCESSING] }, collaborator: { is: { OR: [
    { collaboratorProfile: { is: null } },
    { collaboratorProfile: { is: { kycStatus: { not: KycStatus.VERIFIED } } } },
  ] } } };
  return { pending, approvedToday, tax, kyc, start, end };
}

export function merchantPayoutWhere(storeId: string, query: QueryMerchantPayoutsDto, now = new Date()): Prisma.PayoutRequestWhereInput {
  const scopes = merchantPayoutScopes(storeId, now);
  const conditions: Prisma.PayoutRequestWhereInput[] = [];
  if (query.status) conditions.push({ status: query.status });
  const scope = { PENDING: scopes.pending, APPROVED: scopes.approvedToday, TAX: scopes.tax, KYC: scopes.kyc };
  if (query.filter && query.filter !== MerchantPayoutFilter.ALL) conditions.push(scope[query.filter]);
  const search = query.search?.trim();
  if (search) {
    conditions.push({ OR: [
      ...(isUUID(search, 'all') ? [{ id: search }] : []),
      { collaborator: { is: { fullName: { contains: search, mode: 'insensitive' } } } },
      { collaborator: { is: { email: { contains: search, mode: 'insensitive' } } } },
      { collaborator: { is: { phoneNumber: { contains: search } } } },
      ...(['bankName', 'bankAccountName', 'bankAccountNumber', 'bankRefCode'] as const)
        .map(field => ({ [field]: { contains: search, mode: 'insensitive' as const } })),
    ] });
  }
  return { storeId, ...(conditions.length ? { AND: conditions } : {}) };
}
