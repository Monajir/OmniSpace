import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarClock, ClipboardList, Search, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useAppStore } from "@/lib/app-store";
import { canCancel } from "@/services/api";
import { formatDateTime, formatTimeRange } from "@/utils/weekHelpers";
import { cn } from "@/lib/utils";
import type { Booking, BookingStatus } from "@/types";

type TimeScope = "UPCOMING" | "HISTORY" | "ALL";
type StatusFilter = BookingStatus | "ALL";

export function MyBookingsList({ title = "My bookings" }: { title?: string }) {
  const { bookings, resources, classrooms } = useAppStore();
  const [scope, setScope] = useState<TimeScope>("UPCOMING");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [query, setQuery] = useState("");
  const now = Date.now();

  const upcomingCount = bookings.filter(
    (booking) =>
      new Date(booking.endTime).getTime() >= now &&
      ["PENDING_APPROVAL", "CONFIRMED"].includes(booking.status),
  ).length;
  const pendingCount = bookings.filter((booking) => booking.status === "PENDING_APPROVAL").length;
  const completedCount = bookings.filter((booking) => booking.status === "COMPLETED").length;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return bookings
      .filter((booking) => {
        const isPast = new Date(booking.endTime).getTime() < now;
        if (scope === "UPCOMING" && (isPast || !canCancelOrTrack(booking))) return false;
        if (scope === "HISTORY" && !isPast && canCancelOrTrack(booking)) return false;
        if (status !== "ALL" && booking.status !== status) return false;
        const place = booking.classroomId
          ? classrooms.find((room) => room.id === booking.classroomId)?.roomCode
          : resources.find((resource) => resource.id === booking.resourceId)?.name;
        return (
          !needle ||
          `${booking.purpose} ${place ?? ""} ${booking.bookingType}`.toLowerCase().includes(needle)
        );
      })
      .sort((left, right) =>
        scope === "UPCOMING"
          ? left.startTime.localeCompare(right.startTime)
          : right.startTime.localeCompare(left.startTime),
      );
  }, [bookings, classrooms, now, query, resources, scope, status]);

  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Track requests, approvals and booking history.
          </p>
        </div>
        <div className="flex gap-4 text-right">
          <BookingMetric label="Upcoming" value={upcomingCount} />
          <BookingMetric label="Pending" value={pendingCount} />
          <BookingMetric label="Completed" value={completedCount} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-b border-border/60 pb-4">
        {(["UPCOMING", "HISTORY", "ALL"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setScope(item)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition-colors",
              scope === item
                ? "border-primary bg-primary/15 text-foreground"
                : "border-border text-muted-foreground hover:bg-accent",
            )}
          >
            {item === "HISTORY" ? "History" : item[0] + item.slice(1).toLowerCase()}
          </button>
        ))}
        <div className="relative min-w-48 flex-1 sm:ml-auto sm:max-w-64">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search bookings…"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="PENDING_APPROVAL">Pending</SelectItem>
            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 space-y-2">
        {filtered.length === 0 && (
          <EmptyState
            message={
              bookings.length === 0
                ? "You haven't made any bookings yet"
                : "No bookings match these filters"
            }
            icon={<ClipboardList className="size-6" />}
            action={
              bookings.length > 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQuery("");
                    setStatus("ALL");
                    setScope("ALL");
                  }}
                >
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        )}
        {filtered.map((booking) => (
          <BookingRow key={booking.id} booking={booking} />
        ))}
      </div>
    </section>
  );
}

function BookingMetric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-display text-xl leading-none">{value}</div>
      <div className="mt-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function BookingRow({ booking }: { booking: Booking }) {
  const { resources, classrooms } = useAppStore();
  const place = booking.classroomId
    ? classrooms.find((room) => room.id === booking.classroomId)
    : resources.find((resource) => resource.id === booking.resourceId);
  const placeName = booking.classroomId
    ? place && "roomCode" in place
      ? `${place.roomCode} · ${place.name}`
      : "Classroom"
    : (place?.name ?? "Resource");

  return (
    <div className="rounded-lg border border-border/60 bg-card/60 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{booking.purpose}</span>
            <StatusBadge status={booking.status} />
            <span className="rounded border border-border/60 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
              {booking.bookingType}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/80">{placeName}</span>
            <span className="flex items-center gap-1">
              <CalendarClock className="size-3.5" /> {formatDateTime(booking.startTime)}
            </span>
            <span className="font-mono">{formatTimeRange(booking.startTime, booking.endTime)}</span>
          </div>
          {booking.targetProgram && (
            <div className="mt-2 text-xs text-muted-foreground">
              Cohort: {booking.targetProgram}
              {booking.targetBatch ? ` · Batch ${booking.targetBatch}` : ""}
              {booking.targetSection ? ` · Section ${booking.targetSection}` : ""}
            </div>
          )}
          {booking.status === "REJECTED" && booking.rejectionReason && (
            <div className="mt-2 rounded-md border border-rejected/35 bg-rejected/8 px-3 py-2 text-xs text-rejected">
              <span className="font-semibold">Reason:</span> {booking.rejectionReason}
            </div>
          )}
        </div>
        {canCancel(booking) && <CancelBookingDialog booking={booking} placeName={placeName} />}
      </div>
    </div>
  );
}

function CancelBookingDialog({ booking, placeName }: { booking: Booking; placeName: string }) {
  const queryClient = useQueryClient();
  const { cancelBooking } = useAppStore();
  const [cancelling, setCancelling] = useState(false);

  async function cancel() {
    setCancelling(true);
    try {
      await cancelBooking(booking.id);
      await queryClient.invalidateQueries({ queryKey: ["classroom-availability"] });
      toast.success("Booking cancelled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to cancel booking");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <XCircle className="size-4" /> Cancel
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
          <AlertDialogDescription>
            {booking.purpose} at {placeName} will be marked as cancelled and the time will become
            available again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep booking</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              void cancel();
            }}
            disabled={cancelling}
          >
            {cancelling ? "Cancelling…" : "Cancel booking"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function canCancelOrTrack(booking: Booking) {
  return booking.status === "PENDING_APPROVAL" || booking.status === "CONFIRMED";
}
