import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export function encodeDealCursor(row: {
  id: string;
  createdAt: Date | string;
}) {
  return Buffer.from(
    JSON.stringify([new Date(row.createdAt).toISOString(), row.id]),
  ).toString('base64url');
}

/** Keyset bounds survive insertions and deletion of the previous last row. */
export function dealCursorWhere(
  cursor?: string,
): Prisma.ExclusiveDealProposalWhereInput {
  if (cursor === undefined) return {};
  try {
    if (!cursor || cursor.length > 256 || !/^[A-Za-z0-9_-]+$/.test(cursor))
      throw new Error();
    const value: unknown = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    );
    if (!Array.isArray(value) || value.length !== 2) throw new Error();
    const [time, id] = value;
    if (
      typeof time !== 'string' ||
      new Date(time).toISOString() !== time ||
      typeof id !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      )
    )
      throw new Error();
    const createdAt = new Date(time);
    return {
      OR: [{ createdAt: { lt: createdAt } }, { createdAt, id: { lt: id } }],
    };
  } catch {
    throw new BadRequestException(
      'Mốc phân trang không hợp lệ. Vui lòng tải lại.',
    );
  }
}
