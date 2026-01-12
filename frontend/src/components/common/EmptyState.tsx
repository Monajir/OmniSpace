import { CalendarOff } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  message,
  icon,
  action,
}: {
  message: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 bg-card/40 px-6 py-12 text-center">
      <div className="text-muted-foreground">{icon ?? <CalendarOff className="size-6" />}</div>
      <p className="text-sm text-muted-foreground">{message}</p>
      {action}
    </div>
  );
}
