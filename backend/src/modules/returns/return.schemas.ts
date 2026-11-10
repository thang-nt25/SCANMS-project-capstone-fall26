import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { z } from 'zod';

const text = (min: number, max: number) => z.string().trim().min(min).max(max);

export const instructionsSchema = z
  .object({
    returnAddress: text(10, 500),
    returnInstructions: text(10, 1000),
  })
  .strict();

export const shipmentSchema = z
  .object({
    carrierName: text(2, 100),
    trackingNumber: text(5, 100).regex(/^[\p{L}\p{N}\s._\-/]+$/u),
  })
  .strict();

const pickupAddressSchema = z
  .object({
    name: text(2, 150),
    phone: text(9, 20).regex(/^\+?[0-9]{9,15}$/),
    address: text(10, 500),
    wardName: text(2, 100),
    provinceName: text(2, 100),
    districtName: text(2, 100).optional(),
  })
  .strict();

export const warehouseSchema = pickupAddressSchema;

export const bookPickupSchema = pickupAddressSchema
  .extend({
    weight: z.coerce.number().int().min(1).max(19999),
    length: z.coerce.number().int().min(1).max(200),
    width: z.coerce.number().int().min(1).max(200),
    height: z.coerce.number().int().min(1).max(200),
  })
  .strict();

export const simulatePickupSchema = z
  .object({
    status: z.enum(['picked', 'delivered']),
  })
  .strict();

export const inspectionSchema = z
  .object({
    resolution: z.enum(['REFUND', 'EXCHANGE', 'REJECT']),
    liability: z.enum(['LOGISTICS_FAULT', 'SHOP_FAULT', 'CUSTOMER_REASON']),
    notes: text(10, 2000),
  })
  .strict();

export const liabilityAssessmentSchema = z.object({
  liability: z.enum(['LOGISTICS_FAULT', 'SHOP_FAULT', 'CUSTOMER_REASON']),
  notes: text(10, 2000),
}).strict();

export const disputeSchema = z
  .object({
    reason: z.enum([
      'UNJUSTIFIED_REJECTION',
      'WRONG_INSPECTION',
      'REFUND_PROBLEM',
      'DELIVERY_PROBLEM',
      'OTHER',
    ]),
    details: text(20, 2000),
  })
  .strict();

export const shopEscalationSchema = z.object({
  details: text(20, 2000),
  evidenceUrls: z.array(z.string().url().max(1000).refine((url) => url.startsWith('https://'))).min(1).max(5),
}).strict();

export type ShopEscalationInput = z.infer<typeof shopEscalationSchema>;

export const ghnClaimActionSchema = z.object({
  action: z.enum(['SUBMIT', 'REQUEST_MORE', 'ACCEPT', 'REJECT', 'APPEAL', 'PAID']),
  ghnReference: text(3, 100).optional(),
  claimedAmount: z.number().int().positive().max(1_000_000_000).optional(),
  approvedAmount: z.number().int().positive().max(1_000_000_000).optional(),
  notes: text(10, 2000),
  proofUrl: z.string().url().max(1000).refine((url) => url.startsWith('https://')).optional(),
}).strict();

export type GhnClaimActionInput = z.infer<typeof ghnClaimActionSchema>;

export const resolveDisputeSchema = z
  .object({
    ruling: z.enum(['APPROVE_REFUND', 'APPROVE_EXCHANGE', 'UPHOLD_SHOP']),
    liability: z.enum(['LOGISTICS_FAULT', 'SHOP_FAULT', 'CUSTOMER_REASON']).optional(),
    notes: text(20, 3000),
  })
  .strict();

export const shopQueueSchema = z
  .object({
    status: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
  })
  .strict();

export const returnHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  query: z.string().trim().max(80).default(''),
}).strict();
export type ReturnHistoryQuery = z.infer<typeof returnHistoryQuerySchema>;

export type InstructionsInput = z.infer<typeof instructionsSchema>;
export type ShipmentInput = z.infer<typeof shipmentSchema>;
export type LiabilityAssessmentInput = z.infer<typeof liabilityAssessmentSchema>;
export type WarehouseInput = z.infer<typeof warehouseSchema>;
export type BookPickupInput = z.infer<typeof bookPickupSchema>;
export type InspectionInput = z.infer<typeof inspectionSchema>;
export type DisputeInput = z.infer<typeof disputeSchema>;

/** Shop Settings used contactName/contactPhone before the return flow added name/phone. */
export function configuredReturnWarehouse(raw: unknown): WarehouseInput | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  const parsed = warehouseSchema.safeParse({
    name: value.name ?? value.contactName ?? value.warehouseName,
    phone: value.phone ?? value.contactPhone,
    address: value.address,
    wardName: value.wardName,
    provinceName: value.provinceName,
    districtName: value.districtName,
  });
  return parsed.success ? parsed.data : null;
}
export type ResolveDisputeInput = z.infer<typeof resolveDisputeSchema>;

@Injectable()
export class ReturnZodPipe implements PipeTransform {
  constructor(private readonly schema: z.ZodTypeAny) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Dữ liệu đổi trả không hợp lệ',
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    return result.data as unknown;
  }
}
