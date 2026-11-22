import type { ScheduleModuleOptions } from '@nestjs/schedule';

export function scheduleOptions(
  env: Record<string, string | undefined> = process.env,
): ScheduleModuleOptions {
  const enabled = env.DISABLE_SCHEDULED_JOBS !== 'true';
  return { cronJobs: enabled, intervals: enabled, timeouts: enabled };
}
