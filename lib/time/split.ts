export type TimerSegment = {
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function ymd(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function hm(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function startOfNextDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 0, 0, 0, 0);
}

export function roundToMinute(date: Date): Date {
  const copy = new Date(date);
  copy.setSeconds(0, 0);
  return copy;
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
