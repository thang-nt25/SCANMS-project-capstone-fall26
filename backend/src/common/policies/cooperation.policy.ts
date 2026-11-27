import { ForbiddenException } from '@nestjs/common';

export const CLOSED_COOPERATION_STATUSES = [
  'REJECTED',
  'TERMINATED',
  'BLOCKED',
] as const;

export function cooperationActionError(
  status: string,
  actionLabel: string,
): string {
  if (status === 'BLOCKED') {
    return 'Cửa hàng đã khóa quyền hợp tác với đối tác này.';
  }
  if (status === 'REJECTED') {
    return `Không thể ${actionLabel} khi hợp tác đang ở trạng thái Đã từ chối. Vui lòng mời lại hoặc gửi yêu cầu hợp tác để kết nối lại.`;
  }
  if (status === 'TERMINATED') {
    return `Không thể ${actionLabel} khi quan hệ hợp tác đã chấm dứt. Vui lòng kết nối hợp tác trở lại trước khi tiếp tục.`;
  }
  return `Trạng thái hợp tác hiện không cho phép ${actionLabel}.`;
}

/**
 * Ngăn tạo Deal, xin/duyệt mẫu hoặc chốt thỏa thuận mới khi quan hệ đã bị từ chối,
 * chấm dứt hoặc khóa; bỏ qua an toàn với các mock test không khởi tạo bảng quan hệ.
 */
export async function assertCooperationOpen(
  db: any,
  storeId: string | undefined | null,
  collaboratorId: string | undefined | null,
  actionLabel: string,
): Promise<void> {
  if (
    !storeId ||
    !collaboratorId ||
    typeof db?.storeCollaborator?.findUnique !== 'function'
  ) {
    return;
  }
  const relation = await db.storeCollaborator.findUnique({
    where: { storeId_collaboratorId: { storeId, collaboratorId } },
    select: { status: true },
  });
  if (
    relation?.status === 'REJECTED' ||
    relation?.status === 'TERMINATED' ||
    relation?.status === 'BLOCKED'
  ) {
    throw new ForbiddenException(
      cooperationActionError(relation.status, actionLabel),
    );
  }
}

/**
 * Cho phép Shop và KOL tiếp tục nhắn tin đàm phán lại khi REJECTED/TERMINATED,
 * chỉ chặn hoàn toàn khi quan hệ ở trạng thái BLOCKED.
 */
export async function assertChatNotBlocked(
  db: any,
  storeId: string | undefined | null,
  collaboratorId: string | undefined | null,
): Promise<void> {
  if (
    !storeId ||
    !collaboratorId ||
    typeof db?.storeCollaborator?.findUnique !== 'function'
  ) {
    return;
  }
  const relation = await db.storeCollaborator.findUnique({
    where: { storeId_collaboratorId: { storeId, collaboratorId } },
    select: { status: true },
  });
  if (relation?.status === 'BLOCKED') {
    throw new ForbiddenException(
      'Quan hệ hợp tác giữa hai bên đang bị khóa. Không thể gửi tin nhắn mới.',
    );
  }
}
