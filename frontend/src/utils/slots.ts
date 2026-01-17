import type { ClassroomTimeSlot } from "@/types";

export const SLOTS: Record<
  ClassroomTimeSlot,
  { start: string; end: string; label: string; short: string }
> = {
  SLOT_1: { start: "08:00:00", end: "09:15:00", label: "8:00–9:15 AM", short: "8:00" },
  SLOT_2: { start: "09:15:00", end: "10:30:00", label: "9:15–10:30 AM", short: "9:15" },
  SLOT_3: { start: "10:30:00", end: "11:45:00", label: "10:30–11:45 AM", short: "10:30" },
  SLOT_4: { start: "11:45:00", end: "13:00:00", label: "11:45 AM–1:00 PM", short: "11:45" },
  SLOT_5: { start: "14:30:00", end: "15:45:00", label: "2:30–3:45 PM", short: "2:30" },
  SLOT_6: { start: "15:45:00", end: "17:00:00", label: "3:45–5:00 PM", short: "3:45" },
};

export const SLOT_ORDER: ClassroomTimeSlot[] = [
  "SLOT_1",
  "SLOT_2",
  "SLOT_3",
  "SLOT_4",
  "SLOT_5",
  "SLOT_6",
];

export const LUNCH = { start: "13:00:00", end: "14:30:00", label: "1:00–2:30 PM" };

export function getSlotForTime(time: string): ClassroomTimeSlot | null {
  const t = time.length === 5 ? `${time}:00` : time;
  return SLOT_ORDER.find((s) => SLOTS[s].start === t) ?? null;
}

export function getSlotLabel(slot: ClassroomTimeSlot): string {
  return SLOTS[slot].label;
}

/** Every slot fully covered by a raw [startTime, endTime) window. */
export function getSlotsInRange(startTime: string, endTime: string): ClassroomTimeSlot[] {
  const s = normalize(startTime);
  const e = normalize(endTime);
  return SLOT_ORDER.filter((slot) => SLOTS[slot].start >= s && SLOTS[slot].end <= e);
}

export function isValidSlotPair(a: ClassroomTimeSlot, b: ClassroomTimeSlot): boolean {
  const lo = Math.min(SLOT_ORDER.indexOf(a), SLOT_ORDER.indexOf(b));
  const hi = Math.max(SLOT_ORDER.indexOf(a), SLOT_ORDER.indexOf(b));
  if (lo < 0 || hi - lo !== 1) return false;
  // never span the lunch break (SLOT_4 + SLOT_5)
  return !(lo === 3 && hi === 4);
}

export function slotRangeTimes(slots: ClassroomTimeSlot[]) {
  const sorted = [...slots].sort((a, b) => SLOT_ORDER.indexOf(a) - SLOT_ORDER.indexOf(b));
  const first = sorted[0] ?? "SLOT_1";
  const last = sorted[sorted.length - 1] ?? first;
  return { startTime: SLOTS[first].start, endTime: SLOTS[last].end };
}

function normalize(time: string) {
  return time.length === 5 ? `${time}:00` : time;
}

export function formatTimeLabel(time: string) {
  const parts = normalize(time).split(":").map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}
