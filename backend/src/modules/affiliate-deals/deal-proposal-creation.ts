import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { ChatGateway } from '../chat/chat.gateway';
import { CreateExclusiveDealDto } from './dto/create-exclusive-deal.dto';
import { ApproveExclusiveDealDto } from './dto/approve-exclusive-deal.dto';
import { dealScope, sameDealScope, scopedProducts } from './deal-scope.policy';
import { validateDealKpi, validateRevenueKpi } from './deal-kpi.policy';
import { lockDealPair } from './exclusive-deal-activation';
import { managedStoreWhere } from '../../common/policies/store-access.policy';
import { assertCooperationOpen } from '../../common/policies/cooperation.policy';

/** One store/creator lock serializes overlapping scope negotiations in either direction. */
export async function createDealProposal(
  prisma: PrismaService,
  chat: ChatGateway,
  collaboratorId: string,
  dto: CreateExclusiveDealDto,
  initiatedById?: string,
  terms?: ApproveExclusiveDealDto,
) {
  if (dto.videoReviewCommitment !== true)
    throw new BadRequestException('Cần cam kết thực hiện video review.');
  const kpi =
    dto.targetOrders != null || dto.targetRevenue == null
      ? validateDealKpi(dto.targetOrders, dto.commitmentDays)
      : validateRevenueKpi(dto.targetRevenue, dto.commitmentDays);
  const rate = Number(dto.proposedCommissionRate);
  if (!Number.isFinite(rate) || rate < 10 || rate > 25)
    throw new BadRequestException('Hoa hồng VIP phải từ 10% đến 25%.');
  const commitment = dto.salesCommitment?.trim();
  if (!commitment || commitment.length < 5 || commitment.length > 1000)
    throw new BadRequestException(
      'Kế hoạch nội dung cần từ 5 đến 1.000 ký tự.',
    );
  const scope = dealScope(dto.productId, dto.scopeType, dto.productIds);
  const result = await prisma.$transaction(
    async (tx) => {
      const collaborator = await tx.user.findUnique({
        where: { id: collaboratorId },
        include: { collaboratorProfile: true },
      });
      if (
        !collaborator ||
        collaborator.role !== UserRole.COLLABORATOR ||
        !collaborator.isActive ||
        collaborator.isDeleted ||
        collaborator.deletedAt ||
        collaborator.collaboratorProfile?.kycStatus !== 'VERIFIED'
      )
        throw new ForbiddenException(
          'KOC cần tài khoản hoạt động và KYC đã xác minh.',
        );
      const product = await tx.product.findUnique({
        where: { id: dto.productId },
        include: { store: true },
      });
      if (!product || product.store.isDeleted || !product.store.isActive)
        throw new NotFoundException('Không tìm thấy gian hàng hoạt động.');
      await assertCooperationOpen(
        tx,
        product.storeId,
        collaboratorId,
        'tạo đề xuất Deal',
      );
      await lockDealPair(tx, collaboratorId, `store:${product.storeId}`);
      if (
        initiatedById &&
        !(await tx.store.findFirst({
          where: { id: product.storeId, ...managedStoreWhere(initiatedById) },
          select: { id: true },
        }))
      )
        throw new ForbiddenException('Quyền quản lý Shop đã thay đổi.');
      const violations = (
        collaborator.collaboratorProfile.socialLinksJson as any
      )?.dealViolations;
      const cooldownUntil =
        collaborator.collaboratorProfile.dealCooldownUntil ??
        (violations?.cooldownUntil ? new Date(violations.cooldownUntil) : null);
      if (cooldownUntil && cooldownUntil > new Date())
        throw new BadRequestException(
          'KOC đang trong thời gian tạm khóa quyền đề xuất Deal.',
        );
      const scopeFilter = sameDealScope(scope.scopeKey, product.id);
      const overlapFilter =
        scope.scopeType === 'STORE_WIDE'
          ? {}
          : {
              OR: [
                { scopeType: 'STORE_WIDE' as const },
                { productId: { in: scope.productIds } },
                {
                  scopeProducts: {
                    some: { productId: { in: scope.productIds } },
                  },
                },
              ],
            };
      const pending = await tx.exclusiveDealProposal.findFirst({
        where: {
          collaboratorId,
          storeId: product.storeId,
          ...overlapFilter,
          status: { in: ['PENDING', 'PENDING_ADMIN_APPROVAL'] },
          closedAt: null,
        },
      });
      if (pending)
        throw new BadRequestException(
          'Sản phẩm trong phạm vi này đã có đề nghị đang chờ xử lý.',
        );
      const now = new Date();
      const currentOverlap = await tx.exclusiveDealProposal.findFirst({
        where: {
          collaboratorId,
          storeId: product.storeId,
          status: 'APPROVED',
          closedAt: null,
          AND: [
            overlapFilter,
            {
              OR: [
                { commitmentEndsAt: null },
                { commitmentEndsAt: { gt: now } },
              ],
            },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
      if (
        currentOverlap &&
        currentOverlap.scopeKey &&
        scope.scopeKey &&
        currentOverlap.scopeKey !== scope.scopeKey
      ) {
        throw new BadRequestException(
          'Sản phẩm đã chọn đang có thỏa thuận độc quyền còn thời hạn KPI. Không thể tạo thỏa thuận mới.',
        );
      }
      const current = await tx.exclusiveDealProposal.findFirst({
        where: {
          collaboratorId,
          storeId: product.storeId,
          status: 'APPROVED',
          closedAt: null,
          AND: [
            scopeFilter,
            {
              OR: [
                { commitmentEndsAt: null },
                { commitmentEndsAt: { gt: now } },
              ],
            },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
      if (current && rate <= Number(current.approvedCommissionRate))
        throw new BadRequestException(
          'Mức đề xuất phải cao hơn thỏa thuận đang áp dụng cùng phạm vi.',
        );
      await scopedProducts(tx, {
        id: '',
        storeId: product.storeId,
        productId: product.id,
        scopeType: scope.scopeType,
        scopeProducts: scope.productIds.map((productId) => ({ productId })),
      });
      const conversation =
        (await tx.conversation.findFirst({
          where: { storeId: product.storeId, collaboratorId },
          select: { id: true },
        })) ||
        (await tx.conversation.create({
          data: { storeId: product.storeId, collaboratorId },
          select: { id: true },
        }));
      const proposal = await tx.exclusiveDealProposal.create({
        data: {
          collaboratorId,
          storeId: product.storeId,
          productId: product.id,
          conversationId: conversation.id,
          initiatedById: initiatedById || null,
          offerTerms: terms ? { ...terms } : Prisma.DbNull,
          scopeType: scope.scopeType,
          scopeKey: scope.scopeKey,
          proposedCommissionRate: rate,
          salesCommitment: commitment,
          ...kpi,
        },
        include: {
          product: {
            select: { id: true, title: true, imageUrl: true, price: true },
          },
          store: { select: { id: true, name: true } },
        },
      });
      if (scope.scopeType !== 'STORE_WIDE')
        await tx.exclusiveDealProduct.createMany({
          data: scope.productIds.map((productId) => ({
            proposalId: proposal.id,
            productId,
          })),
        });
      const scopedProductsList = await tx.product.findMany({
        where: { id: { in: scope.productIds } },
        select: { id: true, title: true, imageUrl: true, price: true },
      });
      const card = {
        type: 'EXCLUSIVE_DEAL_PROPOSAL',
        proposalId: proposal.id,
        initiatorRole: initiatedById ? 'SHOP_MANAGER' : 'COLLABORATOR',
        productId: product.id,
        productTitle:
          scope.productIds.length > 1
            ? `${product.title} (+${scope.productIds.length - 1} sản phẩm khác)`
            : product.title,
        productImage: product.imageUrl,
        productIds: scope.productIds,
        productTitles: scopedProductsList.map((p) => p.title),
        products: scopedProductsList.map((p) => ({
          id: p.id,
          title: p.title,
          imageUrl: p.imageUrl,
          price: Number(p.price),
          baseRate: 10,
        })),
        scopeType: scope.scopeType,
        storeId: product.storeId,
        storeName: product.store.name,
        publicCommissionRate: 10,
        currentCommissionRate:
          current?.approvedCommissionRate == null
            ? null
            : Number(current.approvedCommissionRate),
        isRevision: !!current,
        proposedCommissionRate: rate,
        salesCommitment: commitment,
        ...kpi,
        couponTerms: terms,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };
      const message = await tx.chatMessage.create({
        data: {
          conversationId: conversation.id,
          senderId: initiatedById || collaboratorId,
          messageText: JSON.stringify(card),
        },
        include: {
          sender: { select: { id: true, fullName: true, role: true } },
        },
      });
      await tx.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          userId: initiatedById || collaboratorId,
          action: 'EXCLUSIVE_DEAL_PROPOSED',
          details: {
            proposalId: proposal.id,
            scopeType: scope.scopeType,
            targetOrders: 'targetOrders' in kpi ? kpi.targetOrders : null,
            targetRevenue: 'targetRevenue' in kpi ? kpi.targetRevenue : null,
            rate,
          },
        },
      });
      return {
        proposal,
        message,
        recipientId: initiatedById ? collaboratorId : product.store.ownerId,
      };
    },
    { maxWait: 15000, timeout: 60000 },
  );
  await chat.broadcastNewMessage(
    result.proposal.conversationId,
    result.message,
    result.recipientId,
  );
  return { ...result.proposal, proposedCommissionRate: rate };
}
