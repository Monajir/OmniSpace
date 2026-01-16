import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpenCheck, CalendarDays, CalendarPlus, Pencil, Search } from "lucide-react";
import { AcademicTermManagementDialog } from "@/components/routines/AcademicTermManagementDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { DeleteRoutineButton } from "@/components/routines/DeleteRoutineButton";
import { RoutineDetailsDialog } from "@/components/routines/RoutineDetailsDialog";
import { RoutineFormDialog } from "@/components/routines/RoutineFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/lib/app-store";
import { api } from "@/services/api";
import { formatTimeLabel } from "@/utils/slots";
import type { RoutineDayOfWeek, User } from "@/types";

const DAYS: RoutineDayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];
type DayFilter = "ALL" | RoutineDayOfWeek;

export function RoutineManagement() {
  const { currentUser, routines, classrooms } = useAppStore();
  const [search, setSearch] = useState("");
  const [day, setDay] = useState<DayFilter>("ALL");
  const [classroomFilter, setClassroomFilter] = useState("ALL");
  const isAdmin = currentUser.role === "ADMIN";
  const facultyQuery = useQuery({
    queryKey: ["users", "FACULTY"],
    queryFn: () => api.getUsers("FACULTY"),
    enabled: isAdmin,
  });
  const termsQuery = useQuery({
    queryKey: ["academic-terms"],
    queryFn: api.getAcademicTerms,
  });
  const academicTerms = termsQuery.data ?? [];
  const faculty = useMemo(
    () => (isAdmin ? (facultyQuery.data ?? []) : [currentUser]),
    [currentUser, facultyQuery.data, isAdmin],
  );
  const facultyById = useMemo(
    () => new Map<number, User>(faculty.map((member) => [member.id, member])),
    [faculty],
  );
  const classroomById = useMemo(
    () => new Map(classrooms.map((room) => [room.id, room])),
    [classrooms],
  );
  const manageable =
    currentUser.role === "FACULTY"
      ? routines.filter((routine) => routine.facultyId === currentUser.id)
      : routines;
  const filtered = manageable.filter((routine) => {
    if (day !== "ALL" && routine.dayOfWeek !== day) return false;
    if (classroomFilter !== "ALL" && routine.classroomId !== Number(classroomFilter)) return false;
    const room = classroomById.get(routine.classroomId);
    const needle = search.trim().toLowerCase();
    return (
      !needle ||
      `${routine.courseCode} ${routine.courseName} ${routine.program ?? ""} ${routine.batch ?? ""} ${routine.section ?? ""} ${room?.roomCode ?? ""}`
        .toLowerCase()
        .includes(needle)
    );
  });

  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg">
            {isAdmin ? "Academic routine catalog" : "Your teaching routines"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {isAdmin
              ? "Coordinate courses, classrooms, teaching faculty, cohorts, and weekly slots."
              : "Create and maintain the classroom timetable entries assigned to you."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <AcademicTermManagementDialog
              trigger={
                <Button variant="outline">
                  <CalendarDays className="size-4" />
                  Academic terms
                </Button>
              }
            />
          )}
          <RoutineFormDialog
            faculty={faculty}
            academicTerms={academicTerms}
            trigger={
              <Button>
                <CalendarPlus className="size-4" />
                Add routine
              </Button>
            }
          />
        </div>
      </div>
      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_230px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search course, program, batch, section, or room…"
          />
        </div>
        <Select value={day} onValueChange={(value) => setDay(value as DayFilter)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All days</SelectItem>
            {DAYS.map((item) => (
              <SelectItem key={item} value={item}>
                {titleCase(item)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={classroomFilter} onValueChange={setClassroomFilter}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All classrooms</SelectItem>
            {classrooms.map((room) => (
              <SelectItem key={room.id} value={String(room.id)}>
                {room.roomCode} · {room.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="label-mono">{filtered.length} shown</span>
        {facultyQuery.isError && isAdmin && (
          <span className="text-xs text-destructive">Faculty names could not be loaded</span>
        )}
      </div>
      <div className="mt-3">
        {filtered.length === 0 ? (
          <EmptyState
            message={
              manageable.length === 0
                ? "No routines are assigned yet"
                : "No routines match these filters"
            }
            icon={<BookOpenCheck className="size-6" />}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((routine) => {
              const room = classroomById.get(routine.classroomId);
              const member = facultyById.get(routine.facultyId);
              return (
                <article
                  key={routine.id}
                  className="rounded-xl border border-border/60 bg-card/60 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="label-mono">{routine.courseCode}</span>
                        {routine.isRecurring && (
                          <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                            Weekly
                          </span>
                        )}
                      </div>
                      <h3 className="mt-1 font-display text-base">{routine.courseName}</h3>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{titleCase(routine.dayOfWeek)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatTimeLabel(routine.startTime)}–{formatTimeLabel(routine.endTime)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                    <div>
                      <span className="label-mono">Room</span>
                      <div className="mt-1 text-foreground/75">
                        {room
                          ? `${room.roomCode} · ${room.name}`
                          : `Classroom #${routine.classroomId}`}
                      </div>
                    </div>
                    <div>
                      <span className="label-mono">Cohort</span>
                      <div className="mt-1 text-foreground/75">
                        {routine.program ?? "Unassigned cohort"}
                        {routine.batch ? ` · Batch ${routine.batch}` : ""}
                        {routine.section ? ` · Section ${routine.section}` : ""}
                      </div>
                    </div>
                    <div>
                      <span className="label-mono">Faculty</span>
                      <div className="mt-1 text-foreground/75">
                        {member?.displayName ?? `User #${routine.facultyId}`}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-border/50 pt-3">
                    <RoutineDetailsDialog routine={routine} classroom={room} faculty={member} />
                    <RoutineFormDialog
                      routine={routine}
                      faculty={faculty}
                      academicTerms={academicTerms}
                      trigger={
                        <Button size="sm" variant="outline">
                          <Pencil className="size-4" />
                          Edit
                        </Button>
                      }
                    />
                    <DeleteRoutineButton routine={routine} />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}
