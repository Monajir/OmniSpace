import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, CheckCheck, Clock3, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useAppStore } from "@/lib/app-store";
import { formatDateTime, formatTimeRange } from "@/utils/weekHelpers";
import type { Booking } from "@/types";

export function ApprovalQueue({
  bookings,
  emptyMessage,
  title,
}: {
  bookings: Booking[];
  emptyMessage: string;
  title: string;
}) {
  const queryClient = useQueryClient();
  const { approveBooking, rejectBooking, resources, classrooms } = useAppStore();
  const [workingId, setWorkingId] = useState<number | null>(null);

  async function decide(booking: Booking, decision: "APPROVE" | "REJECT", reason?: string) {
    setWorkingId(booking.id);
    try {
      if (decision === "APPROVE") await approveBooking(booking.id);
      else await rejectBooking(booking.id, reason ?? "");
      await queryClient.invalidateQueries({ queryKey: ["classroom-availability"] });
      toast.success(decision === "APPROVE" ? "Booking approved" : "Booking rejected");
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : `Unable to ${decision.toLowerCase()} booking`,
      );
      return false;
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <section className="panel p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg">{title}</h2>
        <span className="label-mono">{bookings.length} pending</span>
      </div>
      <div className="mt-4 space-y-3">
        {bookings.length === 0 && (
          <EmptyState message={emptyMessage} icon={<CheckCheck className="size-6" />} />
        )}
        {bookings.map((booking) => {
          const place = booking.classroomId
            ? classrooms.find((room) => room.id === booking.classroomId)
            : resources.find((resource) => resource.id === booking.resourceId);
          const placeName = booking.classroomId
            ? place && "roomCode" in place
              ? `${place.roomCode} · ${place.name}`
              : "Classroom"
            : (place?.name ?? "Resource");
          const working = workingId === booking.id;

          return (
            <div
              key={booking.id}
              className="rounded-lg border border-pending/40 bg-pending/5 px-4 py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{booking.purpose}</span>
                    <span className="rounded border border-pending/40 px-1.5 py-0.5 font-mono text-[9px] text-pending">
                      {booking.bookingType}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{booking.requesterDisplayName}</span>
                    <span className="font-medium text-foreground/80">{placeName}</span>
                    <span className="flex items-center gap-1">
                      <Clock3 className="size-3.5" /> {formatDateTime(booking.startTime)} ·{" "}
                      {formatTimeRange(booking.startTime, booking.endTime)}
                    </span>
                  </div>
                  {booking.targetProgram && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="size-3.5" /> {booking.targetProgram}
                      {booking.targetBatch ? ` · Batch ${booking.targetBatch}` : ""}
                      {booking.targetSection ? ` · Section ${booking.targetSection}` : ""}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={working}
                    onClick={() => void decide(booking, "APPROVE")}
                  >
                    <Check className="size-4" /> {working ? "Working…" : "Approve"}
                  </Button>
                  <RejectBookingDialog
                    booking={booking}
                    placeName={placeName}
                    disabled={working}
                    onReject={(reason) => decide(booking, "REJECT", reason)}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RejectBookingDialog({
  booking,
  placeName,
  disabled,
  onReject,
}: {
  booking: Booking;
  placeName: string;
  disabled: boolean;
  onReject: (reason: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function reject() {
    const normalized = reason.trim();
    if (!normalized) return;
    setSubmitting(true);
    try {
      if (await onReject(normalized)) {
        setReason("");
        setOpen(false);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled}>
          <X className="size-4" /> Reject
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reject this booking request?</AlertDialogTitle>
          <AlertDialogDescription>
            Explain why {booking.purpose} at {placeName} cannot be approved. The requester will see
            this reason in their booking history.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor={`rejection-reason-${booking.id}`}>Rejection reason</Label>
            <span className="font-mono text-[10px] text-muted-foreground">{reason.length}/500</span>
          </div>
          <Textarea
            id={`rejection-reason-${booking.id}`}
            value={reason}
            maxLength={500}
            rows={4}
            placeholder="Example: The room is reserved for an examination during this period."
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Keep pending</AlertDialogCancel>
          <AlertDialogAction
            disabled={submitting || !reason.trim()}
            onClick={(event) => {
              event.preventDefault();
              void reject();
            }}
          >
            {submitting ? "Rejecting…" : "Reject request"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
