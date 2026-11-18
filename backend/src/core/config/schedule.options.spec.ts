import { Injectable } from '@nestjs/common';
import { Cron, Interval, ScheduleModule, SchedulerRegistry } from '@nestjs/schedule';
import { Test } from '@nestjs/testing';
import { scheduleOptions } from './schedule.options';

@Injectable()
class ScheduleProbe {
  @Cron('0 0 1 1 *', { name: 'migration-cron-probe' })
  cron() {}

  @Interval('migration-interval-probe', 60000)
  interval() {}
}

describe('migration scheduler switch', () => {
  it.each([true, false])('registers no background work when paused=%s', async (paused) => {
    const module = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot(scheduleOptions({ DISABLE_SCHEDULED_JOBS: String(paused) }))],
      providers: [ScheduleProbe],
    }).compile();
    try {
      await module.init();
      const registry = module.get(SchedulerRegistry);
      expect(registry.getCronJobs().size).toBe(paused ? 0 : 1);
      expect(registry.getIntervals().length).toBe(paused ? 0 : 1);
    } finally {
      await module.close();
    }
  });
});
