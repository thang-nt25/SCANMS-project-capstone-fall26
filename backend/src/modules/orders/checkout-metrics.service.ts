import { Injectable, Logger, Optional } from '@nestjs/common';
import { CacheService } from '../../core/cache/cache.service';

export interface CheckoutMetricsSnapshot {
  totalCheckoutRequests: number;
  successfulCheckouts: number;
  idempotentReplays: number;
  idempotencyConflicts: number;
  failedCheckouts: number;
  stockAnomalies: number;
  cancellations: number;
  averageLatencyMs: number;
}

@Injectable()
export class CheckoutMetricsService {
  private readonly logger = new Logger(CheckoutMetricsService.name);

  private totalRequests = 0;
  private successCount = 0;
  private replayCount = 0;
  private conflictCount = 0;
  private failCount = 0;
  private stockAnomalyCount = 0;
  private cancelCount = 0;
  private totalLatencyMs = 0;

  constructor(@Optional() private readonly cacheService?: CacheService) {}

  private async incrementRedis(field: string, by = 1): Promise<void> {
    try {
      const client = this.cacheService?.getRedisClient();
      if (client) {
        await client.hincrby('metrics:checkout', field, by);
      }
    } catch {
      // Non-blocking fallback
    }
  }

  recordCheckoutAttempt(): void {
    this.totalRequests++;
    this.incrementRedis('totalCheckoutRequests').catch(() => {});
  }

  recordCheckoutSuccess(latencyMs: number): void {
    this.successCount++;
    this.totalLatencyMs += latencyMs;
    this.incrementRedis('successfulCheckouts').catch(() => {});
    this.incrementRedis('totalLatencyMs', latencyMs).catch(() => {});
    this.logger.log(
      `[CHECKOUT_SUCCESS] Completed in ${latencyMs}ms (Total successes: ${this.successCount})`,
    );
  }

  recordIdempotentReplay(): void {
    this.replayCount++;
    this.incrementRedis('idempotentReplays').catch(() => {});
    this.logger.log(`[CHECKOUT_IDEMPOTENT_REPLAY] Replayed existing order`);
  }

  recordIdempotencyConflict(key: string): void {
    this.conflictCount++;
    this.incrementRedis('idempotencyConflicts').catch(() => {});
    this.logger.warn(
      `[CHECKOUT_IDEMPOTENCY_CONFLICT] Payload mismatch for key: ${key}`,
    );
  }

  recordCheckoutError(errorType: string, latencyMs: number): void {
    this.failCount++;
    this.totalLatencyMs += latencyMs;
    this.incrementRedis('failedCheckouts').catch(() => {});
    this.incrementRedis('totalLatencyMs', latencyMs).catch(() => {});
    this.logger.error(`[CHECKOUT_ERROR] ${errorType} after ${latencyMs}ms`);
  }

  recordStockAnomaly(productId: string, requested: number, available: number): void {
    this.stockAnomalyCount++;
    this.incrementRedis('stockAnomalies').catch(() => {});
    this.logger.warn(
      `[STOCK_ANOMALY] Product ${productId}: requested ${requested}, available ${available}`,
    );
  }

  recordCancellation(orderCode: string): void {
    this.cancelCount++;
    this.incrementRedis('cancellations').catch(() => {});
    this.logger.log(
      `[CHECKOUT_CANCELLED] Order ${orderCode} cancelled successfully`,
    );
  }

  getSnapshot(): CheckoutMetricsSnapshot {
    const avgLatency =
      this.successCount + this.failCount > 0
        ? Math.round(this.totalLatencyMs / (this.successCount + this.failCount))
        : 0;

    return {
      totalCheckoutRequests: this.totalRequests,
      successfulCheckouts: this.successCount,
      idempotentReplays: this.replayCount,
      idempotencyConflicts: this.conflictCount,
      failedCheckouts: this.failCount,
      stockAnomalies: this.stockAnomalyCount,
      cancellations: this.cancelCount,
      averageLatencyMs: avgLatency,
    };
  }
}
