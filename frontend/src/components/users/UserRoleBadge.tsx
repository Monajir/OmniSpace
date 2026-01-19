import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

const TONE: Record<UserRole, string> = {
  STUDENT: "border-border bg-muted/45 text-foreground/75",
  CR: "border-booked/40 bg-booked/15 text-booked",
  FACULTY: "border-routine/40 bg-routine/15 text-routine",
  RESOURCE_MANAGER: "border-primary/40 bg-primary/15 text-primary",
  MAINTENANCE_STAFF: "border-pending/40 bg-pending/15 text-pending",
  ADMIN: "border-rejected/40 bg-rejected/15 text-rejected",
};

export const ROLE_LABEL: Record<UserRole, string> = {
  STUDENT: "Student",
  CR: "Class Representative",
  FACULTY: "Faculty",
  RESOURCE_MANAGER: "Resource Manager",
  MAINTENANCE_STAFF: "Maintenance Staff",
  ADMIN: "Administrator",
};

export function UserRoleBadge({ role }: { role: UserRole }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        TONE[role],
      )}
    >
      {ROLE_LABEL[role]}
    </span>
  );
}
