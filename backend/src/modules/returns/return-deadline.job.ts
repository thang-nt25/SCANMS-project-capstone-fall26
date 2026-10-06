import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReturnService } from './return.service';

@Injectable()
export class ReturnDeadlineJob {
  private readonly logger = new Logger(ReturnDeadlineJob.name);
  constructor(private readonly returns: ReturnService) {}

  @Cron(CronExpression.EVERY_MINUTE, {
    name: 'return-shipment-deadline',
    waitForCompletion: true,
  })
  async expireOverdue(): Promise<void> {
    if (process.env.DISABLE_SCHEDULED_JOBS === 'true') return;
    try {
      // Repeat bounded batches; compare-and-swap in the service makes multi-instance runs safe.
      let count = 0;
      do {
        count = await this.returns.expireApprovedBatch(100);
      } while (count === 100);
    } catch (error) {
      this.logger.error('Không thể xử lý hạn gửi hàng trả', error);
    }
  }

  @Cron('*/10 * * * *', {
    name: 'return-inspection-sla',
    waitForCompletion: true,
  })
  async escalateStalledInspections(): Promise<void> {
    if (process.env.DISABLE_SCHEDULED_JOBS === 'true') return;
    try {
      let count = 0;
      do {
        count = await this.returns.escalateStalledInspectionsBatch(100);
      } while (count === 100);
    } catch (error) {
      this.logger.error(
        'Không thể cảnh báo hồ sơ trả hàng quá hạn kiểm tra',
        error,
      );
    }
  }
}
