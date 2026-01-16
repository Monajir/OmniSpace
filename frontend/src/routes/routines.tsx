import { createFileRoute } from "@tanstack/react-router";
import { BookOpenCheck, CalendarDays, GraduationCap, MapPin } from "lucide-react";
import { RoutineManagement } from "@/components/routines/RoutineManagement";
import { useAppStore } from "@/lib/app-store";

export const Route = createFileRoute("/routines")({
  head: () => ({
    meta: [
      { title: "Routine Management — OmniSpace" },
      {
        name: "description",
        content:
          "Manage recurring academic courses, faculty, cohorts, classrooms, and weekly teaching slots.",
      },
    ],
  }),
  component: RoutinesPage,
});

function RoutinesPage() {
  const { currentUser, routines } = useAppStore();
  const visible =
    currentUser.role === "FACULTY"
      ? routines.filter((routine) => routine.facultyId === currentUser.id)
      : routines;
  return (
    <>
      <section className="panel overflow-hidden p-6">
        <span className="label-mono">Academic timetable</span>
        <h1 className="mt-2 font-display text-4xl">
          Routine <span className="text-primary">Management</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Maintain the fixed weekly teaching grid that powers classroom availability and personal
          schedules.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Routine entries" value={visible.length} icon={<CalendarDays />} />
          <Stat
            label="Courses"
            value={new Set(visible.map((routine) => routine.courseCode)).size}
            icon={<BookOpenCheck />}
          />
          <Stat
            label="Classrooms"
            value={new Set(visible.map((routine) => routine.classroomId)).size}
            icon={<MapPin />}
          />
          <Stat
            label="Programs"
            value={new Set(visible.map((routine) => routine.program).filter(Boolean)).size}
            icon={<GraduationCap />}
          />
        </div>
      </section>
      <RoutineManagement />
    </>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/55 p-4">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="label-mono">{label}</span>
        <span className="[&_svg]:size-4">{icon}</span>
      </div>
      <div className="mt-2 font-display text-3xl">{value}</div>
    </div>
  );
}
