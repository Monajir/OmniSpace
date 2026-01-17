import { format } from "date-fns";
import type { ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SLOTS, SLOT_ORDER, LUNCH } from "@/utils/slots";
import { weekDates } from "@/utils/weekHelpers";
import type { ClassroomTimeSlot, RoutineDayOfWeek } from "@/types";
import { cn } from "@/lib/utils";

export type CellTone = "routine" | "booked" | "pending" | "exam" | "event";

export interface GridCell {
  title: string;
  subtitle?: string;
  tone: CellTone;
  badge?: string;
  detail?: ReactNode;
}

const toneClass: Record<CellTone, string> = {
  routine: "bg-routine/18 border-routine/50 hover:bg-routine/28",
  booked: "bg-booked/18 border-booked/50 hover:bg-booked/28",
  pending: "bg-pending/14 border-dashed border-pending/60 hover:bg-pending/24",
  exam: "bg-exam/18 border-exam/50 hover:bg-exam/28",
  event: "bg-event/18 border-event/50 hover:bg-event/28",
};

export function WeekGrid({
  weekStart,
  getCell,
}: {
  weekStart: Date;
  getCell: (dateKey: string, day: RoutineDayOfWeek, slot: ClassroomTimeSlot) => GridCell | null;
}) {
  const days = weekDates(weekStart);

  return (
    <div className="-mx-1 overflow-x-auto pb-2">
      <div className="min-w-[860px] px-1">
        <div className="grid grid-cols-[92px_repeat(6,minmax(0,1fr))] gap-1.5">
          <div />
          {days.map((d) => (
            <div key={d.key} className="pb-1 text-center">
              <div className="label-mono">{format(d.date, "EEE")}</div>
              <div className="font-display text-sm text-foreground">{format(d.date, "MMM d")}</div>
            </div>
          ))}

          {SLOT_ORDER.map((slot) => (
            <SlotRow key={slot} slot={slot} days={days} getCell={getCell} />
          ))}
        </div>

        <div className="mt-1.5 grid grid-cols-[92px_repeat(6,minmax(0,1fr))] gap-1.5">
          <div className="label-mono flex items-center justify-end pr-2 text-right">1:00</div>
          <div className="col-span-6 rounded-lg border border-border/60 bg-lunch py-2 text-center text-xs text-lunch-foreground">
            Lunch &amp; Prayer break · {LUNCH.label}
          </div>
        </div>
      </div>
    </div>
  );
}

function SlotRow({
  slot,
  days,
  getCell,
}: {
  slot: ClassroomTimeSlot;
  days: Array<{ key: string; day: RoutineDayOfWeek; date: Date }>;
  getCell: (dateKey: string, day: RoutineDayOfWeek, slot: ClassroomTimeSlot) => GridCell | null;
}) {
  const isAfterLunch = slot === "SLOT_5";
  return (
    <>
      <div
        className={cn(
          "flex flex-col justify-center pr-2 text-right",
          isAfterLunch && "mt-11 sm:mt-0",
        )}
      >
        <span className="font-mono text-xs text-foreground">{SLOTS[slot].short}</span>
        <span className="label-mono">{slot.replace("SLOT_", "S")}</span>
      </div>
      {days.map((d) => {
        const cell = getCell(d.key, d.day, slot);
        if (!cell) {
          return (
            <div
              key={d.key + slot}
              className="min-h-[62px] rounded-lg border border-border/50 bg-available/60"
            />
          );
        }
        return (
          <Popover key={d.key + slot}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "min-h-[62px] cursor-pointer rounded-lg border p-2 text-left transition-colors",
                  toneClass[cell.tone],
                )}
              >
                <div className="truncate text-[13px] font-medium text-foreground">{cell.title}</div>
                {cell.subtitle && (
                  <div className="truncate text-[11px] text-muted-foreground">{cell.subtitle}</div>
                )}
                {cell.badge && (
                  <div className="mt-1 inline-flex rounded-full border border-border/60 bg-background/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {cell.badge}
                  </div>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 text-sm">
              <div className="font-display text-base">{cell.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">{SLOTS[slot].label}</div>
              <div className="mt-3 space-y-1 text-sm">{cell.detail}</div>
            </PopoverContent>
          </Popover>
        );
      })}
    </>
  );
}
