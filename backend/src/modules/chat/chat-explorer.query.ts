import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export interface ChatExplorerQuery {
  q?: string;
  kind?: string;
  sender?: string;
  from?: string;
  to?: string;
  cursor?: string;
}

/** Dates in the workspace are calendar days in Vietnam, inclusive at both ends. */
export function explorerDay(value: string, end = false): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException('Ngày phải có định dạng YYYY-MM-DD');
  }
  const day = new Date(`${value}T00:00:00.000Z`);
  if (
    !Number.isFinite(day.getTime()) ||
    day.toISOString().slice(0, 10) !== value
  ) {
    throw new BadRequestException('Ngày không hợp lệ');
  }
  return new Date(day.getTime() - 7 * 3600000 + (end ? 86400000 : 0));
}

export function buildExplorerWhere(
  conversationId: string,
  userId: string,
  query: ChatExplorerQuery,
): Prisma.ChatMessageWhereInput {
  for (const value of Object.values(query)) {
    if (value !== undefined && typeof value !== 'string') {
      throw new BadRequestException('Bộ lọc không hợp lệ');
    }
  }
  const q = query.q?.trim() || '';
  if (q.length > 200) throw new BadRequestException('Từ khóa tối đa 200 ký tự');
  if (
    query.kind &&
    !['ALL', 'IMAGE', 'VIDEO', 'DOCUMENT'].includes(query.kind)
  ) {
    throw new BadRequestException('Loại nội dung không hợp lệ');
  }
  if (query.sender && !['ALL', 'ME', 'OTHER'].includes(query.sender)) {
    throw new BadRequestException('Bộ lọc người gửi không hợp lệ');
  }
  const from = query.from ? explorerDay(query.from) : undefined;
  const to = query.to ? explorerDay(query.to, true) : undefined;
  if (from && to && from >= to) {
    throw new BadRequestException('Ngày kết thúc phải từ ngày bắt đầu trở đi');
  }
  if (
    query.cursor &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      query.cursor,
    )
  ) {
    throw new BadRequestException('Mốc phân trang không hợp lệ');
  }
  return {
    conversationId,
    ...(q
      ? {
          OR: [
            { messageText: { contains: q, mode: 'insensitive' } },
            { mediaName: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(query.kind && query.kind !== 'ALL' ? { mediaType: query.kind } : {}),
    ...(query.sender === 'ME' ? { senderId: userId } : {}),
    ...(query.sender === 'OTHER' ? { senderId: { not: userId } } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lt: to } : {}),
          },
        }
      : {}),
  };
}
