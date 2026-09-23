import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { BUSINESS_TZ } from "@/lib/time/business-date";

export type TimerSegment = {
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Timer rows are stored as plain business dates, so every boundary here is
 * evaluated in the business timezone rather than the server's local zone.
 */
function ymd(date: Date): string {
  return formatInTimeZone(date, BUSINESS_TZ, "yyyy-MM-dd");
}

function hm(date: Date): string {
  return formatInTimeZone(date, BUSINESS_TZ, "HH:mm");
}

function startOfNextDay(date: Date): Date {
  const [year, month, day] = ymd(date).split("-").map(Number);
  const nextDay = new Date(Date.UTC(year, month - 1, day + 1));
  const nextYmd = `${nextDay.getUTCFullYear()}-${pad(nextDay.getUTCMonth() + 1)}-${pad(nextDay.getUTCDate())}`;
  return fromZonedTime(`${nextYmd}T00:00:00`, BUSINESS_TZ);
}

/**
 * Truncates to the minute on the absolute timeline. Local-field setters would
 * re-resolve an ambiguous wall-clock time during a DST fall-back hour and move
 * the instant by an hour.
 */
export function roundToMinute(date: Date): Date {
  return new Date(Math.floor(date.getTime() / 60000) * 60000);
}

export function splitTimerRange(startedAt: Date, endedAt: Date): TimerSegment[] {
  const start = roundToMinute(startedAt);
  let end = roundToMinute(endedAt);
  if (end <= start) {
    end = new Date(start.getTime() + 60 * 1000);
  }
  const segments: TimerSegment[] = [];
  let cursor = start;
  while (cursor < end) {
    const nextMidnight = startOfNextDay(cursor);
    const sliceEnd = nextMidnight < end ? nextMidnight : end;
    const durationMinutes = Math.max(1, Math.round((sliceEnd.getTime() - cursor.getTime()) / 60000));
    segments.push({
      date: ymd(cursor),
      startTime: hm(cursor),
      endTime: sliceEnd.getTime() === nextMidnight.getTime() ? "24:00" : hm(sliceEnd),
      durationMinutes,
    });
    cursor = sliceEnd;
  }
  return segments;
}
