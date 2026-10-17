import { z } from 'zod';

/** Validate in the service too: non-HTTP callers must obey the same constraints. */
export const customerIdentitySchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  idCardNumber: z
    .string()
    .transform((value) => value.replace(/\s+/g, ''))
    .pipe(z.string().regex(/^(?:\d{9}|\d{12})$/)),
  address: z.string().trim().min(5).max(200),
});
