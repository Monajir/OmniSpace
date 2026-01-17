import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Clock3 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAppStore } from "@/lib/app-store";
import { SLOTS, SLOT_ORDER, isValidSlotPair, slotRangeTimes } from "@/utils/slots";
import { toDateKey, toIso } from "@/utils/weekHelpers";
import type { BookingType, ClassroomTimeSlot } from "@/types";
import { cn } from "@/lib/utils";

const CLASSROOM_TYPES: BookingType[] = ["ACADEMIC", "EVENT", "EXAM"];
const RESOURCE_TYPES: BookingType[] = ["RESOURCE", "EVENT", "EXAM"];

export function BookingForm({
  trigger,
  lockTarget,
}: {
  trigger: React.ReactNode;
  lockTarget?: "CLASSROOM" | "RESOURCE" | undefined;
}) {
  const queryClient = useQueryClient();
  const { currentUser, profile, resources, classrooms, routines, createBooking } = useAppStore();
  const today = toDateKey(new Date());
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [target, setTarget] = useState<"CLASSROOM" | "RESOURCE">(lockTarget ?? "CLASSROOM");
  const [classroomId, setClassroomId] = useState("");
  const [resourceId, setResourceId] = useState("");
  const [date, setDate] = useState(today);
  const [slots, setSlots] = useState<ClassroomTimeSlot[]>(["SLOT_1"]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("11:00");
  const [purpose, setPurpose] = useState("");
  const [bookingType, setBookingType] = useState<BookingType>(
    lockTarget === "RESOURCE" ? "RESOURCE" : "ACADEMIC",
  );
  const [targetProgram, setTargetProgram] = useState("");
  const [targetBatch, setTargetBatch] = useState("");
  const [targetSection, setTargetSection] = useState("");

  const isCR = currentUser.role === "CR";
  const selectedClassroom = classrooms.find((room) => room.id === Number(classroomId));
  const selectedResource = resources.find((resource) => resource.id === Number(resourceId));
  const bookingTypes = target === "CLASSROOM" ? CLASSROOM_TYPES : RESOURCE_TYPES;
  const programSuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          routines.map((routine) => routine.program).filter((value): value is string => !!value),
        ),
      ).sort(),
    [routines],
  );
  const sectionSuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          routines
            .filter(
              (routine) =>
                (!targetProgram || routine.program === targetProgram) &&
                (!targetBatch || routine.batch === targetBatch),
            )
            .map((routine) => routine.section)
            .filter((value): value is string => !!value),
        ),
      ).sort(),
    [routines, targetBatch, targetProgram],
  );
  const batchSuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          routines
            .filter((routine) => !targetProgram || routine.program === targetProgram)
            .map((routine) => routine.batch)
            .filter((value): value is string => !!value),
        ),
      ).sort(),
    [routines, targetProgram],
  );

  useEffect(() => {
    if (!classroomId && classrooms[0]) setClassroomId(String(classrooms[0].id));
    if (!resourceId && resources[0]) setResourceId(String(resources[0].id));
  }, [classroomId, classrooms, resourceId, resources]);

  useEffect(() => {
    if (isCR) {
      setTargetProgram(profile?.program ?? "");
      setTargetBatch(profile?.batch ?? "");
      setTargetSection(profile?.section ?? "");
    }
  }, [isCR, profile?.batch, profile?.program, profile?.section]);

  function changeTarget(nextTarget: "CLASSROOM" | "RESOURCE") {
    setTarget(nextTarget);
    setBookingType(nextTarget === "RESOURCE" ? "RESOURCE" : "ACADEMIC");
  }

  function toggleSlot(slot: ClassroomTimeSlot) {
    setSlots((previous) => {
      if (previous.includes(slot)) {
        return previous.length === 1 ? previous : previous.filter((item) => item !== slot);
      }
      if (previous.length === 1 && isValidSlotPair(previous[0]!, slot)) {
        return [previous[0]!, slot];
      }
      return [slot];
    });
  }

  function slotDisabled(slot: ClassroomTimeSlot) {
    if (slots.length !== 1 || slots[0] === slot) return false;
    return !isValidSlotPair(slots[0]!, slot);
  }

  const approvalMessage = useMemo(() => {
    if (target === "RESOURCE") {
      return selectedResource?.requiresApproval
        ? "This resource requires manager approval."
        : "This resource is confirmed immediately when the time is free.";
    }
    if (currentUser.role === "ADMIN") return "Administrator bookings are confirmed immediately.";
    if (
      currentUser.role === "FACULTY" &&
      profile?.department &&
      profile.department === selectedClassroom?.departmentOwned
    ) {
      return "This room belongs to your department, so the booking is confirmed immediately.";
    }
    return "This classroom request will enter the approval queue.";
  }, [currentUser.role, profile?.department, selectedClassroom, selectedResource, target]);

  async function submit(): Promise<void> {
    if (!purpose.trim()) {
      toast.error("Add a purpose for this booking");
      return;
    }
    if (!date) {
      toast.error("Choose a booking date");
      return;
    }
    if (date < today) {
      toast.error("Bookings cannot be created in the past");
      return;
    }
    if ((target === "CLASSROOM" && !classroomId) || (target === "RESOURCE" && !resourceId)) {
      toast.error(`Choose a ${target.toLowerCase()}`);
      return;
    }
    if (target === "CLASSROOM" && isCR && (!targetProgram || !targetBatch || !targetSection)) {
      toast.error("Complete your program, batch, and section in Profile Settings before booking");
      return;
    }
    if (
      target === "CLASSROOM" &&
      (targetProgram || targetBatch || targetSection) &&
      (!targetProgram || !targetBatch)
    ) {
      toast.error("Choose a target program and batch before specifying a cohort");
      return;
    }

    const times =
      target === "CLASSROOM"
        ? slotRangeTimes(slots)
        : { startTime: `${startTime}:00`, endTime: `${endTime}:00` };
    const start = new Date(toIso(date, times.startTime));
    const end = new Date(toIso(date, times.endTime));
    if (end <= start) {
      toast.error("End time must be after start time");
      return;
    }
    if (start.getTime() < Date.now()) {
      toast.error("The selected start time has already passed");
      return;
    }
    if (target === "RESOURCE" && end.getTime() - start.getTime() > 4 * 60 * 60 * 1000) {
      toast.error("Resource bookings may not exceed 4 hours");
      return;
    }

    setSubmitting(true);
    try {
      const created = await createBooking({
        resourceId: target === "RESOURCE" ? Number(resourceId) : null,
        classroomId: target === "CLASSROOM" ? Number(classroomId) : null,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        purpose: purpose.trim(),
        bookingType,
        targetProgram: target === "CLASSROOM" && targetProgram ? targetProgram.trim() : null,
        targetBatch: target === "CLASSROOM" && targetBatch ? targetBatch.trim() : null,
        targetSection: target === "CLASSROOM" && targetSection ? targetSection.trim() : null,
      });
      await queryClient.invalidateQueries({ queryKey: ["classroom-availability"] });
      toast.success(
        created.status === "CONFIRMED" ? "Booking confirmed" : "Booking request submitted",
      );
      setPurpose("");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create booking");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display">New booking request</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {!lockTarget && (
            <div className="grid grid-cols-2 gap-2">
              {(["CLASSROOM", "RESOURCE"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => changeTarget(item)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm transition-colors",
                    target === item
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-border text-muted-foreground hover:bg-accent",
                  )}
                >
                  {item === "CLASSROOM" ? "Classroom" : "Resource"}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label>{target === "CLASSROOM" ? "Classroom" : "Resource"}</Label>
            <Select
              value={target === "CLASSROOM" ? classroomId : resourceId}
              onValueChange={target === "CLASSROOM" ? setClassroomId : setResourceId}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Choose a ${target.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {target === "CLASSROOM"
                  ? classrooms.map((room) => (
                      <SelectItem
                        key={room.id}
                        value={String(room.id)}
                        disabled={room.status !== "AVAILABLE"}
                      >
                        {room.roomCode} · {room.name}
                        {room.status !== "AVAILABLE"
                          ? ` (${formatStatus(room.status).toLowerCase()})`
                          : ""}
                      </SelectItem>
                    ))
                  : resources.map((resource) => (
                      <SelectItem
                        key={resource.id}
                        value={String(resource.id)}
                        disabled={resource.status !== "AVAILABLE"}
                      >
                        {resource.name}
                        {resource.status !== "AVAILABLE"
                          ? ` (${formatStatus(resource.status).toLowerCase()})`
                          : ""}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              min={today}
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>

          {target === "CLASSROOM" ? (
            <div className="space-y-2">
              <Label>Time slot(s) — up to two consecutive slots</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {SLOT_ORDER.map((slot) => {
                  const selected = slots.includes(slot);
                  const disabled = slotDisabled(slot);
                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleSlot(slot)}
                      className={cn(
                        "rounded-lg border px-2 py-2 text-xs transition-colors",
                        selected
                          ? "border-primary bg-primary/20 text-foreground"
                          : "border-border text-muted-foreground hover:bg-accent",
                        disabled && "cursor-not-allowed opacity-35 hover:bg-transparent",
                      )}
                    >
                      <div className="font-mono">{slot.replace("SLOT_", "Slot ")}</div>
                      <div>{SLOTS[slot].label}</div>
                    </button>
                  );
                })}
              </div>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock3 className="size-3.5" /> The 1:00–2:30 PM lunch/prayer break cannot be
                spanned.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                />
              </div>
              <p className="col-span-2 text-xs text-muted-foreground">Maximum duration: 4 hours.</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Booking type</Label>
            <Select
              value={bookingType}
              onValueChange={(value) => setBookingType(value as BookingType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {bookingTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {target === "CLASSROOM" && (
            <div className="space-y-2">
              <Label>
                Target cohort <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              {isCR ? (
                <Input
                  readOnly
                  value={`${targetProgram || "Program missing"} · Batch ${targetBatch || "missing"} · Section ${targetSection || "missing"}`}
                />
              ) : (
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px_100px]">
                  <div>
                    <Input
                      list="booking-programs"
                      value={targetProgram}
                      onChange={(event) => setTargetProgram(event.target.value)}
                      placeholder="Program"
                    />
                    <datalist id="booking-programs">
                      {programSuggestions.map((program) => (
                        <option key={program} value={program} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <Input
                      list="booking-batches"
                      value={targetBatch}
                      onChange={(event) => setTargetBatch(event.target.value)}
                      placeholder="Batch"
                      maxLength={32}
                    />
                    <datalist id="booking-batches">
                      {batchSuggestions.map((batch) => (
                        <option key={batch} value={batch} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <Input
                      list="booking-sections"
                      value={targetSection}
                      onChange={(event) => setTargetSection(event.target.value)}
                      placeholder="Section"
                      maxLength={16}
                    />
                    <datalist id="booking-sections">
                      {sectionSuggestions.map((section) => (
                        <option key={section} value={section} />
                      ))}
                    </datalist>
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                A program and batch without a section targets every section in that batch.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Purpose</Label>
            <Textarea
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              placeholder="e.g. CSE-201 makeup class"
              maxLength={1000}
              rows={2}
            />
            <div className="text-right font-mono text-[10px] text-muted-foreground">
              {purpose.length}/1000
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            {approvalMessage.includes("confirmed immediately") ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
            ) : (
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-500" />
            )}
            <span>{approvalMessage}</span>
          </div>

          <Button className="w-full" onClick={() => void submit()} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit booking"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
