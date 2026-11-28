// Local time of day from `now` (UTC ms, as main gives it) and the world's `tzOffsetMin`. Pure; shared by the quiet
// hours (core/behavior/throttle.ts) and the time-of-day conditions of activities (core/activities.ts).
import type { DailyWindow } from './types.ts';

const MS_PER_MINUTE = 60_000;
const MINUTES_PER_DAY = 24 * 60;
const MS_PER_DAY = MINUTES_PER_DAY * MS_PER_MINUTE;

/** `a mod b` in `[0, b)`, also for negative `a`. */
const mod = (a: number, b: number): number => ((a % b) + b) % b;

/**
 * Ms from `now` until the daily window ends, or null outside it (and for no / an empty window). `[fromMin, toMin)`
 * in local minutes; `fromMin > toMin` runs over midnight.
 */
export function dailyWindowLeftMs(now: number, tzOffsetMin: number, daily: DailyWindow | null): number | null {
  if (daily === null || daily.fromMin === daily.toMin) return null;
  const local = mod(now + tzOffsetMin * MS_PER_MINUTE, MS_PER_DAY);
  const from = daily.fromMin * MS_PER_MINUTE;
  const to = daily.toMin * MS_PER_MINUTE;
  const inside = from < to ? local >= from && local < to : local >= from || local < to;
  return inside ? mod(to - local, MS_PER_DAY) : null;
}

/** Is local time (`now` shifted by `tzOffsetMin`) inside the daily window? */
export const inDailyWindow = (now: number, tzOffsetMin: number, daily: DailyWindow | null): boolean =>
  dailyWindowLeftMs(now, tzOffsetMin, daily) !== null;
