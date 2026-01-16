import { useEffect, useState, type ReactNode } from "react";
import { CalendarPlus, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAppStore } from "@/lib/app-store";
import type { AcademicTerm, Routine, RoutineDayOfWeek, User } from "@/types";

const DAYS: RoutineDayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];
const WINDOWS = [
  { start: "08:00:00", end: "09:15:00", label: "8:00–9:15 AM" },
  { start: "09:15:00", end: "10:30:00", label: "9:15–10:30 AM" },
  { start: "10:30:00", end: "11:45:00", label: "10:30–11:45 AM" },
  { start: "11:45:00", end: "13:00:00", label: "11:45 AM–1:00 PM" },
  { start: "14:30:00", end: "15:45:00", label: "2:30–3:45 PM" },
  { start: "15:45:00", end: "17:00:00", label: "3:45–5:00 PM" },
  { start: "08:00:00", end: "10:30:00", label: "8:00–10:30 AM · double slot" },
  { start: "09:15:00", end: "11:45:00", label: "9:15–11:45 AM · double slot" },
  { start: "10:30:00", end: "13:00:00", label: "10:30 AM–1:00 PM · double slot" },
  { start: "14:30:00", end: "17:00:00", label: "2:30–5:00 PM · double slot" },
] as const;

export function RoutineFormDialog({
  routine,
  faculty,
  academicTerms,
  trigger,
}: {
  routine?: Routine;
  faculty: User[];
  academicTerms: AcademicTerm[];
  trigger?: ReactNode;
}) {
  const { currentUser, schedule, classrooms, createRoutine, updateRoutine } = useAppStore();
  const [open, setOpen] = useState(false);
  const [classroomId, setClassroomId] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [courseName, setCourseName] = useState("");
  const [day, setDay] = useState<RoutineDayOfWeek>("MONDAY");
  const [timeWindow, setTimeWindow] = useState("");
  const [semester, setSemester] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [program, setProgram] = useState("");
  const [batch, setBatch] = useState("");
  const [section, setSection] = useState("");
  const [recurring, setRecurring] = useState(true);
  const [saving, setSaving] = useState(false);
  const isAdmin = currentUser.role === "ADMIN";
  const selectedTerm = academicTerms.find(
    (term) => term.academicYear === academicYear && term.semester === semester,
  );

  useEffect(() => {
    if (!open) return;
    setClassroomId(String(routine?.classroomId ?? classrooms[0]?.id ?? ""));
    setFacultyId(String(routine?.facultyId ?? (isAdmin ? (faculty[0]?.id ?? "") : currentUser.id)));
    setCourseCode(routine?.courseCode ?? "");
    setCourseName(routine?.courseName ?? "");
    setDay(routine?.dayOfWeek ?? "MONDAY");
    setTimeWindow(
      routine ? `${normalizeTime(routine.startTime)}|${normalizeTime(routine.endTime)}` : "",
    );
    setSemester(routine?.semester ?? schedule?.semester ?? "");
    setAcademicYear(routine?.academicYear ?? schedule?.academicYear ?? "");
    setProgram(routine?.program ?? "");
    setBatch(routine?.batch ?? schedule?.batch ?? "");
    setSection(routine?.section ?? "");
    setRecurring(routine?.isRecurring ?? true);
  }, [classrooms, currentUser.id, faculty, isAdmin, open, routine, schedule]);

  async function submit(): Promise<void> {
    const [startTime, endTime] = timeWindow.split("|");
    if (!classroomId) {
      toast.error("Classroom is required");
      return;
    }
    if (isAdmin && !facultyId) {
      toast.error("Faculty member is required");
      return;
    }
    if (!courseCode.trim()) {
      toast.error("Course code is required");
      return;
    }
    if (!courseName.trim()) {
      toast.error("Course name is required");
      return;
    }
    if (!startTime || !endTime) {
      toast.error("Teaching time is required");
      return;
    }
    if (!academicYear.trim()) {
      toast.error("Academic year is required");
      return;
    }
    if (!semester.trim()) {
      toast.error("Semester is required");
      return;
    }
    if ((program.trim() || batch.trim() || section.trim()) && (!program.trim() || !batch.trim())) {
      toast.error("Program and batch are required for a cohort routine");
      return;
    }
    if (batch.trim().length > 32) {
      toast.error("Batch must be 32 characters or fewer");
      return;
    }
    if (section.trim().length > 16) {
      toast.error("Section must be 16 characters or fewer");
      return;
    }

    const data = {
      classroomId: Number(classroomId),
      courseCode: courseCode.trim().toUpperCase(),
      courseName: courseName.trim(),
      facultyId: isAdmin ? Number(facultyId) : currentUser.id,
      dayOfWeek: day,
      startTime,
      endTime,
      semester: semester.trim(),
      academicYear: academicYear.trim(),
      program: program.trim() || null,
      batch: batch.trim() || null,
      section: section.trim() || null,
      isRecurring: recurring,
    };
    setSaving(true);
    try {
      if (routine) await updateRoutine(routine.id, data);
      else await createRoutine(data);
      toast.success(routine ? "Routine updated" : "Routine created");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save routine");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <CalendarPlus className="size-4" />
            Add routine
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">
            {routine ? "Edit routine" : "Create routine"}
          </DialogTitle>
          <DialogDescription>
            Schedule a course into one or two valid classroom teaching slots.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <Field label="Course code">
            <Input
              value={courseCode}
              onChange={(event) => setCourseCode(event.target.value)}
              placeholder="CSE-321"
            />
          </Field>
          <Field label="Course name">
            <Input
              value={courseName}
              onChange={(event) => setCourseName(event.target.value)}
              placeholder="Computer Networks"
            />
          </Field>
          <Field label="Classroom">
            <Select value={classroomId} onValueChange={setClassroomId}>
              <SelectTrigger>
                <SelectValue placeholder="Select classroom" />
              </SelectTrigger>
              <SelectContent>
                {classrooms.map((room) => (
                  <SelectItem key={room.id} value={String(room.id)}>
                    {room.roomCode} · {room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Teaching faculty">
            {isAdmin ? (
              <Select value={facultyId} onValueChange={setFacultyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select faculty" />
                </SelectTrigger>
                <SelectContent>
                  {faculty.map((member) => (
                    <SelectItem key={member.id} value={String(member.id)}>
                      {member.displayName} · {member.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="rounded-md border border-input bg-muted/35 px-3 py-2 text-sm">
                {currentUser.displayName} · assigned to you
              </div>
            )}
          </Field>
          <Field label="Day">
            <Select value={day} onValueChange={(value) => setDay(value as RoutineDayOfWeek)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {titleCase(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Teaching time">
            <Select value={timeWindow} onValueChange={setTimeWindow}>
              <SelectTrigger>
                <SelectValue placeholder="Select a slot" />
              </SelectTrigger>
              <SelectContent>
                {WINDOWS.map((window) => (
                  <SelectItem
                    key={`${window.start}-${window.end}`}
                    value={`${window.start}|${window.end}`}
                  >
                    {window.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {academicTerms.length > 0 ? (
            <Field label="Academic term">
              <Select
                value={selectedTerm ? String(selectedTerm.id) : ""}
                onValueChange={(value) => {
                  const term = academicTerms.find((item) => item.id === Number(value));
                  if (term) {
                    setAcademicYear(term.academicYear);
                    setSemester(term.semester);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select academic term" />
                </SelectTrigger>
                <SelectContent>
                  {academicTerms.map((term) => (
                    <SelectItem key={term.id} value={String(term.id)}>
                      {term.academicYear} · {term.semester}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : (
            <>
              <Field label="Academic year">
                <Input
                  value={academicYear}
                  onChange={(event) => setAcademicYear(event.target.value)}
                  placeholder="2025-2026"
                />
              </Field>
              <Field label="Semester">
                <Input
                  value={semester}
                  onChange={(event) => setSemester(event.target.value)}
                  placeholder="Fall"
                />
              </Field>
            </>
          )}
          <Field label="Program">
            <Input
              value={program}
              onChange={(event) => setProgram(event.target.value)}
              placeholder="BSc in Computer Science and Engineering"
            />
          </Field>
          <Field label="Batch / intake">
            <Input
              value={batch}
              maxLength={32}
              onChange={(event) => setBatch(event.target.value)}
              placeholder="2025"
            />
          </Field>
          <Field label="Section">
            <Input
              value={section}
              maxLength={16}
              onChange={(event) => setSection(event.target.value)}
              placeholder="A"
            />
          </Field>
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/50 p-3 sm:col-span-2">
            <div>
              <Label>Recurring weekly routine</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Include this course in the weekly academic timetable.
              </p>
            </div>
            <Switch checked={recurring} onCheckedChange={setRecurring} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={saving}>
            <Save className="size-4" />
            {saving ? "Saving…" : routine ? "Save changes" : "Create routine"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function normalizeTime(time: string) {
  return time.length === 5 ? `${time}:00` : time;
}

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}
