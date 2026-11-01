import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { CacheService } from '../../core/cache/cache.service';
import { managedStoreWhere } from '../../common/policies/store-access.policy';
import { ChatGateway } from '../chat/chat.gateway';
import { ReferralLinksService } from '../referral-links/referral-links.service';
import { ApproveExclusiveDealDto } from './dto/approve-exclusive-deal.dto';
import {
  dealWindow,
  validateDealKpi,
  validateRevenueKpi,
} from './deal-kpi.policy';
import { dealScope, sameDealScope, scopedProducts } from './deal-scope.policy';

interface Dependencies {
  prisma: PrismaService;
  referralLinks: ReferralLinksService;
  chatGateway: ChatGateway;
  cache: CacheService;
  voucherCode: (id: string, name: string, discount: number) => string;
}

/** First acceptance binds the coupon terms. A high-rate agreement creates no
 * links, coupons or KPI clock until an independent SYSTEM_ADMIN approves it. */
export async function decideExclusiveDeal(
  deps: Dependencies,
  id: string,
  actorId: string,
  role: UserRole,
  approve: boolean,
  requestedTerms: unknown = {},
  reason?: string,
  exceptionReview = false,
): Promise<Record<string, any>> {
  const { prisma } = deps;
  const initial = await prisma.exclusiveDealProposal.findUnique({
    where: { id },
  });
  if (!initial) throw new NotFoundException('Không tìm thấy đề nghị VIP.');
  if (exceptionReview) {
    if (role !== UserRole.SYSTEM_ADMIN)
      throw new ForbiddenException('Chỉ Admin được duyệt ngoại lệ trên 16%.');
    if (!reason || reason.trim().length < 10)
      throw new BadRequestException('Cần ghi rõ căn cứ quyết định ngoại lệ.');
    if (
      actorId === initial.initiatedById ||
      actorId === initial.reviewerId ||
      actorId === initial.collaboratorId
    )
      throw new ForbiddenException(
        'Người đề xuất hoặc chấp thuận không được tự duyệt ngoại lệ.',
      );
  } else if (initial.initiatedById) {
    if (role !== UserRole.COLLABORATOR || actorId !== initial.collaboratorId)
      throw new ForbiddenException(
        'Chỉ KOC được mời có quyền phản hồi đề nghị.',
      );
  } else {
    const systemReviewer =
      role === UserRole.SYSTEM_ADMIN || role === UserRole.SYSTEM_MANAGER;
    const store = await prisma.store.findFirst({
      where: {
        id: initial.storeId,
        ...(systemReviewer ? { isDeleted: false } : managedStoreWhere(actorId)),
      },
      select: { id: true },
    });
    if ((!systemReviewer && role !== UserRole.SHOP_MANAGER) || !store)
      throw new ForbiddenException('Không có quyền xử lý đề nghị của Shop.');
    if (
      approve &&
      Number(initial.proposedCommissionRate) > 16 &&
      role === UserRole.SYSTEM_ADMIN
    )
      throw new ForbiddenException(
        'Shop hoặc vận hành cần chấp thuận trước khi Admin duyệt ngoại lệ.',
      );
  }
  const outcome = await prisma
    .$transaction(
      async (tx) => {
        await lockDealPair(
          tx,
          initial.collaboratorId,
          `store:${initial.storeId}`,
        );
        const proposal = await tx.exclusiveDealProposal.findUnique({
          where: { id },
          include: {
            store: true,
            product: true,
            collaborator: { include: { collaboratorProfile: true } },
            referralLink: true,
            scopeProducts: { include: { referralLink: true } },
          },
        });
        if (!proposal || proposal.closedAt)
          throw new BadRequestException('Đề nghị đã đóng.');
        // Recheck actor/role after obtaining the lock to prevent stale membership decisions.
        const actor = await tx.user.findUnique({
          where: { id: actorId },
          select: { isActive: true, isDeleted: true, role: true },
        });
        if (!actor || !actor.isActive || actor.isDeleted || actor.role !== role)
          throw new ForbiddenException('Tài khoản không còn quyền thao tác.');
        if (
          !exceptionReview &&
          !initial.initiatedById &&
          role === UserRole.SHOP_MANAGER &&
          !(await tx.store.findFirst({
            where: { id: proposal.storeId, ...managedStoreWhere(actorId) },
            select: { id: true },
          }))
        )
          throw new ForbiddenException('Quyền quản lý Shop đã thay đổi.');
        if (approve && proposal.status === 'APPROVED' && proposal.referralLink)
          return {
            response: {
              ...proposal.referralLink,
              status: proposal.status,
              approvedCommissionRate: Number(proposal.approvedCommissionRate),
              shortUrl: publicLink(proposal.referralLink.shortCode),
              vipVoucherCode: proposal.referralLink.customCouponCode,
            },
            message: null,
          };
        if (
          !exceptionReview &&
          approve &&
          proposal.status === 'PENDING_ADMIN_APPROVAL'
        )
          return { response: { id, status: proposal.status }, message: null };
        const expected = exceptionReview ? 'PENDING_ADMIN_APPROVAL' : 'PENDING';
        if (proposal.status !== expected)
          throw new BadRequestException(
            'Đề nghị không ở bước được phép xử lý.',
          );
        if (
          exceptionReview &&
          (!proposal.recipientAcceptedAt ||
            Number(proposal.proposedCommissionRate) <= 16)
        )
          throw new BadRequestException(
            'Đề nghị chưa đủ điều kiện duyệt ngoại lệ.',
          );

        const now = new Date();
        const rate = Number(proposal.proposedCommissionRate);
        if (!Number.isFinite(rate) || rate < 10 || rate > 25)
          throw new BadRequestException('Hoa hồng VIP phải từ 10% đến 25%.');
        let response: Record<string, unknown>;
        let status: 'APPROVED' | 'REJECTED' | 'PENDING_ADMIN_APPROVAL';
        if (!approve) {
          status = 'REJECTED';
          await tx.exclusiveDealProposal.update({
            where: { id },
            data: {
              status,
              shopResponse: reason?.trim() || null,
              ...(exceptionReview
                ? { exceptionNote: reason!.trim(), adminApprovedById: actorId }
                : { reviewerId: actorId, reviewedAt: now }),
            },
          });
          response = { id, status, shopResponse: reason?.trim() || null };
        } else {
          const creator = proposal.collaborator;
          if (
            !creator.isActive ||
            creator.isDeleted ||
            creator.role !== UserRole.COLLABORATOR ||
            creator.collaboratorProfile?.kycStatus !== 'VERIFIED' ||
            proposal.store.isDeleted ||
            !proposal.store.isActive
          )
            throw new BadRequestException(
              'KOC hoặc gian hàng không còn đủ điều kiện kích hoạt.',
            );
          const products = await scopedProducts(tx, proposal);
          const kpi =
            proposal.targetRevenue != null
              ? validateRevenueKpi(
                  Number(proposal.targetRevenue),
                  proposal.commitmentDays ?? undefined,
                )
              : validateDealKpi(
                  proposal.targetOrders ?? undefined,
                  proposal.commitmentDays ?? undefined,
                );
          const terms = couponTerms(
            exceptionReview || proposal.initiatedById
              ? proposal.offerTerms
              : requestedTerms,
          );
          if (rate > 16 && !exceptionReview) {
            status = 'PENDING_ADMIN_APPROVAL';
            await tx.exclusiveDealProposal.update({
              where: { id },
              data: {
                status,
                recipientAcceptedAt: now,
                reviewedAt: now,
                reviewerId: actorId,
                offerTerms: { ...terms },
              },
            });
            const admins = await tx.user.findMany({
              where: { role: 'SYSTEM_ADMIN', isActive: true, isDeleted: false },
              select: { id: true },
            });
            if (admins.length)
              await tx.notification.createMany({
                data: admins.map((admin) => ({
                  userId: admin.id,
                  type: 'SYSTEM',
                  title: 'Deal VIP cần duyệt ngoại lệ',
                  message: `${proposal.store.name}: ${rate}% cho ${creator.fullName}.`,
                  data: { link: '/admin/vip-exceptions', proposalId: id },
                })),
              });
            response = { id, status };
          } else {
            status = 'APPROVED';
            const scope =
              proposal.scopeKey || dealScope(proposal.productId).scopeKey;
            const current = await tx.exclusiveDealProposal.findFirst({
              where: {
                collaboratorId: proposal.collaboratorId,
                storeId: proposal.storeId,
                status: 'APPROVED',
                closedAt: null,
                AND: [
                  sameDealScope(scope, proposal.productId),
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
              throw new ConflictException(
                'Mức VIP cùng phạm vi đã thay đổi. Cần tạo đề nghị mới.',
              );
            await tx.exclusiveDealProposal.update({
              where: { id },
              data: {
                status,
                approvedCommissionRate: rate,
                recipientAcceptedAt: proposal.recipientAcceptedAt || now,
                offerTerms: { ...terms },
                ...(exceptionReview
                  ? {
                      adminApprovedAt: now,
                      adminApprovedById: actorId,
                      exceptionNote: reason!.trim(),
                    }
                  : { reviewerId: actorId, reviewedAt: now }),
                ...dealWindow(kpi.commitmentDays),
              },
            });
            let links: Array<{
              id: string;
              productId: string | null;
              shortCode: string;
              shortUrl: string;
            }>;
            if ((proposal.scopeType || 'SINGLE_PRODUCT') === 'SINGLE_PRODUCT') {
              const link = await deps.referralLinks.createReferralLink(
                proposal.collaboratorId,
                {
                  productId: proposal.productId,
                  exclusiveDealId: id,
                  channel: 'TIKTOK',
                  label: `VIP: ${proposal.product.title}`,
                },
                undefined,
                tx,
              );
              links = [
                {
                  ...link,
                  shortUrl: link.shortUrl || publicLink(link.shortCode),
                },
              ];
            } else
              links = await deps.referralLinks.issueDealResources(
                tx,
                proposal.collaboratorId,
                id,
                proposal.productId,
                products,
              );
            const vipCode = deps.voucherCode(
              id,
              creator.fullName,
              terms.discountPercent,
            );
            const coupon = await tx.coupon.create({
              data: {
                storeId: proposal.storeId,
                collaboratorId: proposal.collaboratorId,
                codeNormalized: vipCode,
                displayCode: vipCode,
                status: 'ACTIVE',
                discountType: 'PERCENTAGE',
                discountValue: terms.discountPercent,
                minimumOrderAmount: terms.minimumOrderAmount,
                maximumDiscountAmount: terms.maximumDiscountAmount,
                usageLimitTotal: terms.usageLimitTotal,
                usageLimitPerCustomer: 1,
                budgetTotal: terms.budgetTotal,
                budgetUsed: 0,
                startsAt: now,
                expiresAt: new Date(
                  Math.min(
                    now.getTime() + terms.validDays * 86400000,
                    now.getTime() + kpi.commitmentDays * 86400000,
                  ),
                ),
                scopeType:
                  proposal.scopeType === 'STORE_WIDE'
                    ? 'STORE_WIDE'
                    : 'PRODUCTS',
                fundingSource: 'SHOP_FUNDED',
                shopFundingRate: 100,
                platformFundingRate: 0,
                stackableWithProductDiscount: true,
                stackableWithShopVoucher: false,
                stackableWithPlatformVoucher: true,
                approvedBy:
                  proposal.initiatedById || proposal.reviewerId || actorId,
                approvedAt: now,
              },
            });
            if (proposal.scopeType !== 'STORE_WIDE')
              await tx.couponProduct.createMany({
                data: products.map((product) => ({
                  couponId: coupon.id,
                  productId: product.id,
                })),
              });
            await tx.referralLink.updateMany({
              where: { id: { in: links.map((link) => link.id) } },
              data: { customCouponCode: vipCode },
            });
            for (const link of links)
              await tx.exclusiveDealProduct.upsert({
                where: {
                  proposalId_productId: {
                    proposalId: id,
                    productId: link.productId!,
                  },
                },
                create: {
                  proposalId: id,
                  productId: link.productId!,
                  referralLinkId: link.id,
                },
                update: { referralLinkId: link.id },
              });
            if (current)
              await tx.exclusiveDealProposal.update({
                where: { id: current.id },
                data: { closedAt: now },
              });
            const primary =
              links.find((link) => link.productId === proposal.productId) ||
              links[0];
            response = {
              ...primary,
              id,
              status,
              approvedCommissionRate: rate,
              vipVoucherCode: vipCode,
              resources: links,
              previousCommissionRate: current
                ? Number(current.approvedCommissionRate)
                : null,
              supersedesProposalId: current?.id || null,
            };
          }
        }
        const card = {
          type: 'EXCLUSIVE_DEAL_DECISION',
          proposalId: id,
          productTitle: proposal.product.title,
          scopeType: proposal.scopeType,
          targetRevenue:
            proposal.targetRevenue == null
              ? null
              : Number(proposal.targetRevenue),
          proposedCommissionRate: rate,
          ...response,
          decidedAt: now.toISOString(),
        };
        const message = await tx.chatMessage.create({
          data: {
            conversationId: proposal.conversationId,
            senderId: actorId,
            messageText: JSON.stringify(card),
          },
          include: {
            sender: { select: { id: true, fullName: true, role: true } },
          },
        });
        await tx.conversation.update({
          where: { id: proposal.conversationId },
          data: { lastMessageAt: now },
        });
        await tx.auditLog.create({
          data: {
            userId: actorId,
            action: exceptionReview
              ? 'VIP_EXCEPTION_REVIEWED'
              : `EXCLUSIVE_DEAL_${status}`,
            details: { proposalId: id, status, note: reason?.trim() || null },
          },
        });
        return { response, message };
      },
      { maxWait: 15000, timeout: 90000 },
    )
    .catch((error: unknown) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002')
          throw new ConflictException(
            'Tài nguyên VIP bị trùng. Giao dịch đã được hoàn tác.',
          );
        if (['P2028', 'P2034'].includes(error.code))
          throw new ServiceUnavailableException(
            'Giao dịch đang bận. Đồng bộ trạng thái rồi thử lại.',
          );
      }
      throw error;
    });
  if (outcome.message)
    await deps.chatGateway.broadcastNewMessage(
      initial.conversationId,
      outcome.message,
      initial.initiatedById || initial.collaboratorId,
    );
  await deps.cache.delPrefix('affiliate:deals:active_partners:');
  return outcome.response;
}

function publicLink(shortCode: string) {
  return `${(process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '')}/r/${shortCode}`;
}

export function couponTerms(input: unknown = {}): ApproveExclusiveDealDto {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new BadRequestException('Điều kiện coupon không hợp lệ.');
  const terms = plainToInstance(ApproveExclusiveDealDto, input);
  if (
    validateSync(terms, { whitelist: true, forbidNonWhitelisted: true }).length
  ) {
    throw new BadRequestException(
      'Điều kiện coupon không hợp lệ. Kiểm tra mức giảm, ngân sách và hạn dùng.',
    );
  }
  return terms;
}

export async function lockDealPair(
  tx: Prisma.TransactionClient,
  collaboratorId: string,
  productId: string,
) {
  // Serializes both directions for this creator/product, including renegotiation.
  // All activation records below commit or roll back under the same lock.
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`${collaboratorId}:${productId}`}, 0))`;
}
