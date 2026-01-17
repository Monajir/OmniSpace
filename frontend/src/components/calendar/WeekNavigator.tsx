import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { weekRangeLabel, mondayOf } from "@/utils/weekHelpers";

export function WeekNavigator({
  weekStart,
  onChange,
}: {
  weekStart: Date;
  onChange: (d: Date) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange(addDays(weekStart, -7))}
        aria-label="Previous week"
      >
        <ChevronLeft className="size-4" />
        Prev
      </Button>
      <span className="min-w-[190px] text-center font-mono text-sm text-foreground">
        {weekRangeLabel(weekStart)}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange(addDays(weekStart, 7))}
        aria-label="Next week"
      >
        Next
        <ChevronRight className="size-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => onChange(mondayOf(new Date()))}>
        Today
      </Button>
    </div>
  );
}
