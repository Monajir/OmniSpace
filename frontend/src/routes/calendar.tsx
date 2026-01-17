import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { addDays, format, parseISO } from "date-fns";
import { WeekGrid, type GridCell } from "@/components/calendar/WeekGrid";
import { WeekNavigator } from "@/components/calendar/WeekNavigator";
import { Legend } from "@/components/calendar/Legend";
import { EmptyState } from "@/components/common/EmptyState";
import { ReportIssueDialog } from "@/components/issues/ReportIssueDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/app-store";
import { api } from "@/services/api";
import { mondayOf, toDateKey, weekDates } from "@/utils/weekHelpers";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Rooms & Resources — OmniSpace" },
      {
        name: "description",
        content:
          "Browse weekly classroom availability by slot and see resource busy windows across campus.",
      },
      { property: "og:title", content: "Rooms & Resources — OmniSpace" },
      {
        property: "og:description",
        content: "Weekly classroom slot availability and resource timelines.",
      },
    ],
  }),
  component: CalendarPage,
});

type Selection = { kind: "CLASSROOM" | "RESOURCE"; id: number };

function CalendarPage() {
  const { currentUser, resources, classrooms } = useAppStore();
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [selection, setSelection] = useState<Selection>(() => ({
    kind: "CLASSROOM",
    id: classrooms[0]?.id ?? 0,
  }));
  const [query, setQuery] = useState("");

  const filteredClassrooms = classrooms.filter((c) =>
    `${c.roomCode} ${c.name} ${c.building ?? ""}`.toLowerCase().includes(query.toLowerCase()),
  );
  const filteredResources = resources.filter((r) =>
    `${r.name} ${r.category ?? ""}`.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    if (selection.id === 0 && classrooms[0])
      setSelection({ kind: "CLASSROOM", id: classrooms[0].id });
    else if (selection.id === 0 && resources[0])
      setSelection({ kind: "RESOURCE", id: resources[0].id });
  }, [selection.id, classrooms, resources]);

  const weekKey = toDateKey(weekStart);
  const availabilityQuery = useQuery({
    queryKey: ["classroom-availability", selection.id, weekKey],
    queryFn: () => api.getClassroomAvailability(selection.id, weekKey),
    enabled: selection.kind === "CLASSROOM" && selection.id > 0,
  });
  const availability = availabilityQuery.data;
  const resourceFrom = new Date(`${weekKey}T00:00:00Z`).toISOString();
  const resourceTo = new Date(`${toDateKey(addDays(weekStart, 7))}T00:00:00Z`).toISOString();
  const resourceAvailabilityQuery = useQuery({
    queryKey: ["resource-availability", selection.id, weekKey],
    queryFn: () => api.getResourceAvailability(selection.id, resourceFrom, resourceTo),
    enabled: selection.kind === "RESOURCE" && selection.id > 0,
  });
  const selectedClassroom =
    selection.kind === "CLASSROOM"
      ? classrooms.find((classroom) => classroom.id === selection.id)
      : undefined;
  const selectedResource =
    selection.kind === "RESOURCE"
      ? resources.find((resource) => resource.id === selection.id)
      : undefined;
  const issueTargets = selectedClassroom
    ? [
        {
          kind: "CLASSROOM" as const,
          id: selectedClassroom.id,
          label: `${selectedClassroom.roomCode} · ${selectedClassroom.name}`,
        },
      ]
    : selectedResource
      ? [{ kind: "RESOURCE" as const, id: selectedResource.id, label: selectedResource.name }]
      : [];

  const resourceAvailability = resourceAvailabilityQuery.data;

  function getCell(dateKey: string, _day: string, slot: string): GridCell | null {
    const day = availability?.days.find((d) => d.date === dateKey);
    const cell = day?.slots.find((s) => s.slot === slot);
    if (!cell || cell.status === "AVAILABLE" || !cell.detail) return null;
    return {
      title: cell.detail.split(" — ")[0] ?? cell.detail,
      subtitle: cell.detail.split(" — ")[1] ?? cell.detail.split(" – ")[1] ?? "",
      tone: cell.source === "ROUTINE" ? "routine" : "booked",
      badge: cell.source === "ROUTINE" ? "Routine" : "Booked",
      detail: (
        <>
          <div>{cell.detail}</div>
          <div className="text-muted-foreground">
            {cell.source === "ROUTINE" ? "Recurring routine" : "Occupied booking window"}
          </div>
        </>
      ),
    };
  }

  const hasWeekContent = availability?.days.some((d) => d.slots.some((s) => s.status === "BOOKED"));

  return (
    <section className="panel p-6">
      <span className="label-mono">Availability</span>
      <h1 className="mt-2 font-display text-4xl">
        Rooms &amp; <span className="text-primary">Resources</span>
      </h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div>
          <Input
            placeholder="Search rooms or resources…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="mt-4 space-y-4">
            <div>
              <div className="label-mono mb-2">Classrooms</div>
              <div className="space-y-1">
                {filteredClassrooms.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelection({ kind: "CLASSROOM", id: c.id })}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      selection.kind === "CLASSROOM" && selection.id === c.id
                        ? "border-primary bg-primary/15"
                        : "border-border/60 hover:bg-accent",
                    )}
                  >
                    <div className="font-mono text-xs text-muted-foreground">{c.roomCode}</div>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="label-mono mb-2">Resources</div>
              <div className="space-y-1">
                {filteredResources.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelection({ kind: "RESOURCE", id: r.id })}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      selection.kind === "RESOURCE" && selection.id === r.id
                        ? "border-primary bg-primary/15"
                        : "border-border/60 hover:bg-accent",
                    )}
                  >
                    <div className="font-mono text-xs text-muted-foreground">
                      {r.category ?? "Resource"}
                    </div>
                    {r.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl">
              {selection.kind === "CLASSROOM"
                ? (classrooms.find((c) => c.id === selection.id)?.name ?? "Classroom")
                : (resources.find((r) => r.id === selection.id)?.name ?? "Resource")}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {currentUser.role !== "MAINTENANCE_STAFF" && issueTargets.length > 0 && (
                <ReportIssueDialog
                  targets={issueTargets}
                  trigger={<Button variant="outline">Report issue</Button>}
                />
              )}
              <WeekNavigator weekStart={weekStart} onChange={setWeekStart} />
            </div>
          </div>

          <div className="mt-5">
            {selection.kind === "CLASSROOM" ? (
              availabilityQuery.isLoading ? (
                <EmptyState message="Loading classroom availability…" />
              ) : availabilityQuery.isError ? (
                <EmptyState
                  message={
                    availabilityQuery.error instanceof Error
                      ? availabilityQuery.error.message
                      : "Unable to load availability"
                  }
                />
              ) : hasWeekContent ? (
                <WeekGrid weekStart={weekStart} getCell={(k, d, s) => getCell(k, d, s)} />
              ) : (
                <EmptyState message="No bookings for this classroom this week" />
              )
            ) : resourceAvailabilityQuery.isLoading ? (
              <EmptyState message="Loading resource availability…" />
            ) : resourceAvailabilityQuery.isError ? (
              <EmptyState
                message={
                  resourceAvailabilityQuery.error instanceof Error
                    ? resourceAvailabilityQuery.error.message
                    : "Unable to load availability"
                }
              />
            ) : resourceAvailability && resourceAvailability.busy.length > 0 ? (
              <ResourceTimeline weekStart={weekStart} busy={resourceAvailability.busy} />
            ) : (
              <EmptyState message="No bookings for this resource in this time range" />
            )}
          </div>

          <div className="mt-5 border-t border-border/60 pt-4">
            <Legend />
          </div>
        </div>
      </div>
    </section>
  );
}

function ResourceTimeline({
  weekStart,
  busy,
}: {
  weekStart: Date;
  busy: Array<{ start: string; end: string }>;
}) {
  const days = weekDates(weekStart);
  const dayStart = 7;
  const dayEnd = 20;
  const span = dayEnd - dayStart;

  return (
    <div className="space-y-2">
      {days.map((d) => {
        const items = busy.filter((b) => b.start.slice(0, 10) === d.key);
        return (
          <div key={d.key} className="flex items-center gap-3">
            <div className="w-24 shrink-0">
              <div className="label-mono">{format(d.date, "EEE")}</div>
              <div className="text-sm">{format(d.date, "MMM d")}</div>
            </div>
            <div className="relative h-11 flex-1 overflow-hidden rounded-lg border border-border/60 bg-available/60">
              {items.map((b, i) => {
                const s = parseISO(b.start);
                const e = parseISO(b.end);
                const left = ((s.getUTCHours() + s.getUTCMinutes() / 60 - dayStart) / span) * 100;
                const width = ((e.getTime() - s.getTime()) / 3600000 / span) * 100;
                return (
                  <div
                    key={i}
                    className="absolute top-1 bottom-1 truncate rounded-md border border-booked/60 bg-booked/25 px-2 py-1 text-[11px]"
                    style={{
                      left: `${Math.max(0, left)}%`,
                      width: `${Math.max(6, width)}%`,
                    }}
                    title="Reserved"
                  >
                    {new Intl.DateTimeFormat("en", {
                      hour: "numeric",
                      minute: "2-digit",
                      timeZone: "UTC",
                    }).format(s)}{" "}
                    · Reserved
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <div className="flex justify-between pl-27 font-mono text-[10px] text-muted-foreground">
        <span>7 AM</span>
        <span>1 PM</span>
        <span>8 PM</span>
      </div>
    </div>
  );
}
