import type { TimeSlot } from "../constants/salon.js";

export const SALON_TIME_ZONE = "Asia/Seoul";

/**
 * Validates that a YYYY-MM-DD string represents a real calendar date (rejects e.g. 2026-02-30).
 */
export function isValidCalendarDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

/**
 * Parses a predefined 12-hour slot string (e.g. "01:30 PM") into minutes since midnight.
 */
export function parseTimeSlotMinutes(slot: TimeSlot): number {
  const match = /^(\d{2}):(\d{2}) (AM|PM)$/.exec(slot);
  if (!match) return -1;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3];
  if (meridiem === "AM" && hours === 12) hours = 0;
  if (meridiem === "PM" && hours !== 12) hours += 12;
  return hours * 60 + minutes;
}

/**
 * Returns the current date (YYYY-MM-DD) and minutes since midnight in the salon's timezone.
 */
export function getSalonNow(now: Date = new Date()): {
  date: string;
  minutes: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SALON_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const map = new Map<string, string>();
  for (const part of parts) {
    if (part.type !== "literal") map.set(part.type, part.value);
  }

  const year = map.get("year") ?? "1970";
  const month = map.get("month") ?? "01";
  const day = map.get("day") ?? "01";
  const hour = Number(map.get("hour") ?? "0") % 24;
  const minute = Number(map.get("minute") ?? "0");

  return {
    date: `${year}-${month}-${day}`,
    minutes: hour * 60 + minute,
  };
}
