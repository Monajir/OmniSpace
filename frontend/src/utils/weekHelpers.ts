import { addDays, format, parseISO, startOfWeek } from "date-fns";
import type { RoutineDayOfWeek } from "@/types";

export const WEEK_DAYS: RoutineDayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

export function mondayOf(date: Date | string): Date {
  const d = typeof date === "string" ? parseISO(date) : date;
  return startOfWeek(d, { weekStartsOn: 1 });
}

export function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function weekDates(
  weekStart: Date,
): Array<{ date: Date; key: string; day: RoutineDayOfWeek }> {
  return WEEK_DAYS.map((day, i) => {
    const date = addDays(weekStart, i);
    return { date, key: toDateKey(date), day };
  });
}

export function weekRangeLabel(weekStart: Date): string {
  const end = addDays(weekStart, 5);
  return `${format(weekStart, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
}

export function dayOfWeekFor(dateKey: string): RoutineDayOfWeek {
  const idx = parseISO(dateKey).getDay();
  const map: RoutineDayOfWeek[] = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ];
  return map[idx] ?? "MONDAY";
}

/** Local date key + "HH:mm:ss" for an ISO timestamp, rendered in browser timezone. */
export function localParts(iso: string) {
  const d = parseISO(iso);
  return { dateKey: format(d, "yyyy-MM-dd"), time: format(d, "HH:mm:ss"), date: d };
}

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(parseISO(iso));
}

export function formatTimeRange(startIso: string, endIso: string) {
  const clock = (iso: string) =>
    new Intl.DateTimeFormat("en", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
    }).format(parseISO(iso));
  return `${clock(startIso)} – ${clock(endIso)}`;
}

/** The backend treats campus timetable slots as UTC wall-clock values. */
export function toIso(dateKey: string, time: string) {
  const t = time.length === 5 ? `${time}:00` : time;
  return `${dateKey}T${t}Z`;
}
