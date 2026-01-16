import { CalendarDays, Clock3, Eye, GraduationCap, MapPin, Repeat2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatTimeLabel } from "@/utils/slots";
import type { Classroom, Routine, User } from "@/types";

export function RoutineDetailsDialog({
  routine,
  classroom,
  faculty,
}: {
  routine: Routine;
  classroom?: Classroom | undefined;
  faculty?: User | undefined;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Eye className="size-4" />
          Details
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">
            {routine.courseCode} · {routine.courseName}
          </DialogTitle>
          <DialogDescription>
            {routine.program ?? "Program not specified"}
            {routine.batch ? ` · Batch ${routine.batch}` : ""}
            {routine.section ? ` · Section ${routine.section}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2 sm:grid-cols-2">
          <Detail icon={<CalendarDays />} label="Day" value={titleCase(routine.dayOfWeek)} />
          <Detail
            icon={<Clock3 />}
            label="Time"
            value={`${formatTimeLabel(routine.startTime)}–${formatTimeLabel(routine.endTime)}`}
          />
          <Detail
            icon={<MapPin />}
            label="Classroom"
            value={
              classroom
                ? `${classroom.roomCode} · ${classroom.name}`
                : `Classroom #${routine.classroomId}`
            }
          />
          <Detail
            icon={<UserRound />}
            label="Faculty"
            value={faculty?.displayName ?? `User #${routine.facultyId}`}
          />
          <Detail
            icon={<GraduationCap />}
            label="Academic term"
            value={`${routine.semester ?? "No semester"} · ${routine.academicYear}`}
          />
          <Detail
            icon={<Repeat2 />}
            label="Schedule type"
            value={routine.isRecurring ? "Recurring weekly" : "Non-recurring"}
          />
        </div>
        <div className="border-t border-border/60 pt-3 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Routine ID {routine.id} · Updated {new Date(routine.updatedAt).toLocaleDateString()}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/50 p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="[&_svg]:size-4">{icon}</span>
        <span className="font-mono text-[10px] uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-2 text-sm">{value}</div>
    </div>
  );
}

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}
