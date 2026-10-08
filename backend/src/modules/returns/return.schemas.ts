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
    notes: text(10, 2000),
  })
  .strict();

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

export const resolveDisputeSchema = z
  .object({
    ruling: z.enum(['APPROVE_REFUND', 'APPROVE_EXCHANGE', 'UPHOLD_SHOP']),
    notes: text(20, 3000),
  })
  .strict();

export const shopQueueSchema = z
  .object({
    status: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
  })
  .strict();

export type InstructionsInput = z.infer<typeof instructionsSchema>;
export type ShipmentInput = z.infer<typeof shipmentSchema>;
export type WarehouseInput = z.infer<typeof warehouseSchema>;
export type BookPickupInput = z.infer<typeof bookPickupSchema>;
export type InspectionInput = z.infer<typeof inspectionSchema>;
export type DisputeInput = z.infer<typeof disputeSchema>;
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
