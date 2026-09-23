const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Validates the optional start/end pair on a manual entry. The window is
 * contextual only — `durationMinutes` remains the authoritative amount of time
 * logged — so the pair is either absent or a complete, ordered same-day range.
 *
 * @returns a user-facing message, or null when the pair is acceptable.
 */
export function timeWindowError(startTime?: string | null, endTime?: string | null): string | null {
  const start = startTime?.trim() ?? "";
  const end = endTime?.trim() ?? "";
  if (!start && !end) return null;
  if (!start || !end) {
    return "Enter both a start and end time, or leave both blank.";
  }
  if (!HH_MM.test(start) || !HH_MM.test(end)) {
    return "Start and end times must use 24-hour HH:MM format.";
  }
  if (end <= start) {
    return "End time must be later than start time. Hours still set the duration that is logged.";
  }
  return null;
}
