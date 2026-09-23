import { toZonedTime, formatInTimeZone } from "date-fns-tz";

export const DEFAULT_TZ = "America/New_York";

export function zonedYmd(date: Date, timeZone = DEFAULT_TZ): string {
  return formatInTimeZone(date, timeZone, "yyyy-MM-dd");
}

export function grantDateForMonth(
  year: number,
  monthIndex: number,
  dayOfMonth: number,
  timeZone = DEFAULT_TZ,
): Date {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const day = Math.min(Math.max(dayOfMonth, 1), lastDay);
  const iso = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T12:00:00`;
  return toZonedTime(iso, timeZone);
}

export function periodStartKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export function isReplenishDay(
  now: Date,
  dayOfMonth: number,
  timeZone = DEFAULT_TZ,
): { due: boolean; periodStart: string; year: number; monthIndex: number } {
  const ymd = zonedYmd(now, timeZone);
  const [yearStr, monthStr, dayStr] = ymd.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const day = Number(dayStr);
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const effectiveDay = Math.min(dayOfMonth, lastDay);
  return {
    due: day === effectiveDay,
    periodStart: periodStartKey(year, monthIndex),
    year,
    monthIndex,
  };
}

export function monthRange(periodStart: string): { from: string; to: string } {
  const [yearStr, monthStr] = periodStart.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const from = `${periodStart}-01`;
  const to = `${periodStart}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}
