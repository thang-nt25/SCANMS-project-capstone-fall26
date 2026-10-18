/** Vietnam has a fixed UTC+7 offset and no daylight-saving transitions. */
export const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;
export const vietnamDayKey = (value: Date | string) => new Date(new Date(value).getTime() + VIETNAM_OFFSET_MS).toISOString().slice(0, 10);
export const vietnamHour = (value: Date | string) => new Date(new Date(value).getTime() + VIETNAM_OFFSET_MS).getUTCHours();
export const vietnamDayStart = (value: Date) => new Date(`${vietnamDayKey(value)}T00:00:00+07:00`);
