import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CommissionsService } from './commissions.service';

@Injectable()
export class CommissionSchedulerService {
  private readonly logger = new Logger(CommissionSchedulerService.name);

  constructor(private readonly commissionsService: CommissionsService) {}

  @Cron(CronExpression.EVERY_MINUTE, {
    name: 'fr21-commission-reconciliation',
    waitForCompletion: true,
  })
  async reconcileCommissionBalances(): Promise<void> {
    const summary = await this.commissionsService.reconcileCommissions();
    if (
      summary.created > 0 ||
      summary.approved > 0 ||
      summary.reversed > 0 ||
      summary.failed > 0
    ) {
      this.logger.log(
        `Commission reconciliation finished: created=${summary.created}, approved=${summary.approved}, reversed=${summary.reversed}, failed=${summary.failed}`,
      );
    }
  }
}
