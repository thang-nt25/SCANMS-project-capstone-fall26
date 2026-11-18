import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PayoutApprovalController } from './payout-approval.controller';

describe('Payout approval platform permissions', () => {
  const guard = new RolesGuard(new Reflector());
  const context = (role: UserRole) => ({
    getHandler: () => PayoutApprovalController.prototype.approve,
    getClass: () => PayoutApprovalController,
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
  }) as unknown as ExecutionContext;
  it.each([UserRole.SHOP_MANAGER, UserRole.COLLABORATOR, UserRole.CUSTOMER])('blocks %s from the legacy approval endpoint', role => {
    expect(() => guard.canActivate(context(role))).toThrow(ForbiddenException);
  });
  it.each([UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN])('allows %s', role => {
    expect(guard.canActivate(context(role))).toBe(true);
  });
});
