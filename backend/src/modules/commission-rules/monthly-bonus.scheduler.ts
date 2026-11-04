import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../core/database/prisma.service';
import { CommissionRulesService } from './commission-rules.service';

@Injectable()
export class MonthlyBonusScheduler {
  private readonly logger = new Logger(MonthlyBonusScheduler.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly rules: CommissionRulesService,
  ) {}

  // Resume every closed period containing attributed sales, not only last month.
  @Cron('10 0 * * *', { timeZone: 'Asia/Ho_Chi_Minh', waitForCompletion: true })
  async settleClosedMonth(now = new Date()) {
    if (process.env.DISABLE_SCHEDULED_JOBS === 'true') return;
    const local = new Date(now.getTime() + 7 * 3600000);
    const previous = new Date(
      Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - 1, 1),
    );
    const lastClosedMonth = previous.toISOString().slice(0, 7);
    const stores = await this.prisma.store.findMany({
      where: {
        isDeleted: false,
        commissionRules: { some: {} },
      },
      select: { id: true },
    });
    for (const store of stores) {
      const earliest = await this.prisma.order.aggregate({
        where: {
          storeId: store.id,
          attributedCollaboratorId: { not: null },
          completedAt: { not: null },
        },
        _min: { completedAt: true },
      });
      const unfinished = await this.prisma.monthlyBonusResult.findMany({
        where: {
          storeId: store.id,
          yearMonth: { lte: lastClosedMonth },
          status: { in: ['PENDING', 'APPROVED'] },
        },
        select: { yearMonth: true },
        distinct: ['yearMonth'],
      });
      const months = new Set(unfinished.map((row) => row.yearMonth));
      if (earliest._min.completedAt) {
        const first = new Date(
          earliest._min.completedAt.getTime() + 7 * 3600000,
        );
        const cursor = new Date(
          Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1),
        );
        while (cursor.toISOString().slice(0, 7) <= lastClosedMonth) {
          months.add(cursor.toISOString().slice(0, 7));
          cursor.setUTCMonth(cursor.getUTCMonth() + 1);
        }
      }
      for (const yearMonth of [...months].sort()) {
        try {
          await this.rules.settleAllEligible(store.id, yearMonth);
          // Resume independently after a crash between calculate/approve/credit.
          const pending = await this.prisma.monthlyBonusResult.findMany({
            where: {
              storeId: store.id,
              yearMonth,
              status: { in: ['PENDING', 'APPROVED'] },
              bonusAmount: { gte: 0 },
            },
            select: { id: true, status: true },
          });
          for (const result of pending) {
            try {
              if (result.status === 'PENDING')
                await this.rules.approveSettlement(store.id, result.id);
              await this.rules.payoutSettlement(store.id, result.id);
            } catch {
              this.logger.warn(`Monthly bonus awaiting retry: ${result.id}`);
            }
          }
        } catch {
          this.logger.error(
            `Monthly settlement failed: store=${store.id}, period=${yearMonth}`,
          );
        }
      }
    }
  }
}
