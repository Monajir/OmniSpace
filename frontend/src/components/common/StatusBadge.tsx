import type { BookingStatus, ClassroomStatus, IssueStatus, ResourceStatus } from "@/types";
import { statusLabel } from "@/services/api";
import { cn } from "@/lib/utils";

const bookingTone: Record<BookingStatus, string> = {
  PENDING_APPROVAL: "bg-pending/15 text-pending border-pending/40",
  CONFIRMED: "bg-booked/15 text-booked border-booked/40",
  REJECTED: "bg-rejected/15 text-rejected border-rejected/40",
  CANCELLED: "bg-cancelled/15 text-cancelled border-cancelled/40",
  COMPLETED: "bg-routine/15 text-routine border-routine/40",
};

const resourceTone: Record<ResourceStatus, string> = {
  AVAILABLE: "bg-routine/15 text-routine border-routine/40",
  PENDING_INSPECTION: "bg-pending/15 text-pending border-pending/40",
  UNAVAILABLE: "bg-rejected/15 text-rejected border-rejected/40",
  MAINTENANCE: "bg-pending/15 text-pending border-pending/40",
};

const classroomTone: Record<ClassroomStatus, string> = {
  AVAILABLE: "bg-routine/15 text-routine border-routine/40",
  PENDING_INSPECTION: "bg-pending/15 text-pending border-pending/40",
  RESERVED: "bg-booked/15 text-booked border-booked/40",
  MAINTENANCE: "bg-pending/15 text-pending border-pending/40",
};

const issueTone: Record<IssueStatus, string> = {
  OPEN: "bg-rejected/15 text-rejected border-rejected/40",
  IN_PROGRESS: "bg-pending/15 text-pending border-pending/40",
  RESOLVED: "bg-routine/15 text-routine border-routine/40",
  CLOSED: "bg-cancelled/15 text-cancelled border-cancelled/40",
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
        bookingTone[status],
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

export function ResourceStatusBadge({ status }: { status: ResourceStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
        resourceTone[status],
      )}
    >
      {displayEnum(status)}
    </span>
  );
}

export function ClassroomStatusBadge({ status }: { status: ClassroomStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
        classroomTone[status],
      )}
    >
      {displayEnum(status)}
    </span>
  );
}

export function IssueStatusBadge({ status }: { status: IssueStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
        issueTone[status],
      )}
    >
      {status === "OPEN" ? "Pending inspection" : displayEnum(status)}
    </span>
  );
}

function displayEnum(status: string) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase());
}
