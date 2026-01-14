import { createFileRoute } from "@tanstack/react-router";
import { Building2, FlaskConical, Presentation, Users } from "lucide-react";
import { ClassroomManagement } from "@/components/classrooms/ClassroomManagement";
import { useAppStore } from "@/lib/app-store";

export const Route = createFileRoute("/classrooms")({
  head: () => ({
    meta: [
      { title: "Classroom Administration — OmniSpace" },
      {
        name: "description",
        content:
          "Administer campus classrooms, facilities, capacity, ownership, and operational status.",
      },
    ],
  }),
  component: ClassroomsPage,
});

function ClassroomsPage() {
  const { classrooms } = useAppStore();
  const capacity = classrooms.reduce((total, classroom) => total + (classroom.capacity ?? 0), 0);

  return (
    <>
      <section className="panel overflow-hidden p-6">
        <span className="label-mono">Facilities directory</span>
        <h1 className="mt-2 font-display text-4xl">
          Classroom <span className="text-primary">Administration</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Manage the authoritative classroom catalog and keep operational availability current.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total rooms" value={classrooms.length} icon={<Building2 />} />
          <Stat
            label="Available"
            value={classrooms.filter((room) => room.status === "AVAILABLE").length}
            icon={<Presentation />}
          />
          <Stat
            label="Laboratories"
            value={classrooms.filter((room) => room.isLab).length}
            icon={<FlaskConical />}
          />
          <Stat label="Total capacity" value={capacity} icon={<Users />} />
        </div>
      </section>
      <ClassroomManagement />
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
