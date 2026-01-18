import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Search, Wrench } from "lucide-react";
import { useAppStore } from "@/lib/app-store";
import { api } from "@/services/api";
import { EmptyState } from "@/components/common/EmptyState";
import { IssueStatusBadge } from "@/components/common/StatusBadge";
import { ReportIssueDialog, type IssueTarget } from "@/components/issues/ReportIssueDialog";
import { IssueWorkflowActions } from "@/components/issues/IssueWorkflowActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime } from "@/utils/weekHelpers";
import type { Issue, IssueStatus } from "@/types";

export const Route = createFileRoute("/issues")({
  head: () => ({
    meta: [
      { title: "Maintenance & Issues — OmniSpace" },
      {
        name: "description",
        content: "Track reported classroom and resource problems through resolution.",
      },
    ],
  }),
  component: IssuesPage,
});

type StatusFilter = "ALL" | IssueStatus;
type TargetFilter = "ALL" | `RESOURCE:${number}` | `CLASSROOM:${number}`;

function IssuesPage() {
  const { currentUser, resources, classrooms } = useAppStore();
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [target, setTarget] = useState<TargetFilter>("ALL");
  const [search, setSearch] = useState("");

  const isResourceManager = currentUser.role === "RESOURCE_MANAGER";
  const canManageWorkflow =
    currentUser.role === "MAINTENANCE_STAFF" || currentUser.role === "ADMIN";
  const canReport = currentUser.role !== "MAINTENANCE_STAFF";
  const managedResources = useMemo(
    () =>
      isResourceManager
        ? resources.filter((resource) => resource.managedByUserId === currentUser.id)
        : resources,
    [currentUser.id, isResourceManager, resources],
  );
  const managedIds = managedResources.map((resource) => resource.id).sort((a, b) => a - b);

  const issuesQuery = useQuery({
    queryKey: ["issues", currentUser.role, managedIds.join(",")],
    queryFn: async () => {
      if (!isResourceManager) return api.getIssues();
      const groups = await Promise.all(
        managedIds.map((resourceId) => api.getIssues({ resourceId })),
      );
      return groups.flat();
    },
  });

  const reportTargets: IssueTarget[] = [
    ...managedResources.map((resource) => ({
      kind: "RESOURCE" as const,
      id: resource.id,
      label: resource.name,
    })),
    ...(currentUser.role === "ADMIN"
      ? classrooms.map((classroom) => ({
          kind: "CLASSROOM" as const,
          id: classroom.id,
          label: `${classroom.roomCode} · ${classroom.name}`,
        }))
      : []),
  ];

  const issues = issuesQuery.data ?? [];
  const filtered = issues.filter((issue) => {
    if (status !== "ALL" && issue.status !== status) return false;
    if (target !== "ALL") {
      const [kind, rawId] = target.split(":");
      const id = Number(rawId);
      if (kind === "RESOURCE" && issue.resourceId !== id) return false;
      if (kind === "CLASSROOM" && issue.classroomId !== id) return false;
    }
    if (search.trim()) {
      const label = targetLabel(issue, resources, classrooms);
      const haystack = `${issue.description} ${label}`.toLowerCase();
      if (!haystack.includes(search.trim().toLowerCase())) return false;
    }
    return true;
  });

  const openCount = issues.filter((issue) => issue.status === "OPEN").length;
  const inProgressCount = issues.filter((issue) => issue.status === "IN_PROGRESS").length;
  const resolvedCount = issues.filter(
    (issue) => issue.status === "RESOLVED" || issue.status === "CLOSED",
  ).length;

  return (
    <>
      <section className="panel overflow-hidden p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="label-mono">Operations desk</span>
            <h1 className="mt-2 font-display text-4xl">
              Maintenance <span className="text-primary">&amp; Issues</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {isResourceManager
                ? "Track problems reported against the resources assigned to you."
                : "Review campus equipment and classroom problems from report through resolution."}
            </p>
          </div>
          {canReport && reportTargets.length > 0 && (
            <ReportIssueDialog
              targets={reportTargets}
              trigger={
                <Button>
                  <AlertTriangle className="size-4" />
                  Report issue
                </Button>
              }
            />
          )}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <IssueStat
            label="Pending inspection"
            value={openCount}
            icon={<AlertTriangle />}
            tone="text-rejected"
          />
          <IssueStat
            label="In progress"
            value={inProgressCount}
            icon={<Wrench />}
            tone="text-pending"
          />
          <IssueStat
            label="Resolved"
            value={resolvedCount}
            icon={<CheckCircle2 />}
            tone="text-routine"
          />
        </div>
      </section>

      <section className="panel p-5">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_190px_230px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search issue or location…"
            />
          </div>
          <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="OPEN">Pending inspection</SelectItem>
              <SelectItem value="IN_PROGRESS">In progress</SelectItem>
              <SelectItem value="RESOLVED">Resolved</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={target} onValueChange={(value) => setTarget(value as TargetFilter)}>
            <SelectTrigger>
              <SelectValue placeholder="All locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All locations</SelectItem>
              {managedResources.map((resource) => (
                <SelectItem key={`resource-${resource.id}`} value={`RESOURCE:${resource.id}`}>
                  Resource · {resource.name}
                </SelectItem>
              ))}
              {!isResourceManager &&
                classrooms.map((classroom) => (
                  <SelectItem key={`classroom-${classroom.id}`} value={`CLASSROOM:${classroom.id}`}>
                    Room · {classroom.roomCode}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg">Issue queue</h2>
          <span className="label-mono">{filtered.length} shown</span>
        </div>

        <div className="mt-3 space-y-3">
          {issuesQuery.isLoading ? (
            <EmptyState message="Loading issue reports…" icon={<Wrench className="size-6" />} />
          ) : issuesQuery.isError ? (
            <EmptyState
              message={
                issuesQuery.error instanceof Error
                  ? issuesQuery.error.message
                  : "Unable to load issues"
              }
              icon={<AlertTriangle className="size-6" />}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              message="No issues match these filters"
              icon={<ClipboardCheck className="size-6" />}
            />
          ) : (
            filtered.map((issue) => {
              const label = targetLabel(issue, resources, classrooms);
              const active = issue.status === "OPEN" || issue.status === "IN_PROGRESS";
              return (
                <article
                  key={issue.id}
                  className="rounded-xl border border-border/60 bg-card/55 p-4 transition-colors hover:border-border"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <IssueStatusBadge status={issue.status} />
                        <span className="font-mono text-[11px] text-muted-foreground">
                          Issue #{issue.id}
                        </span>
                      </div>
                      <h3 className="mt-3 font-display text-base">{label}</h3>
                      <p className="mt-1 text-sm leading-6 text-foreground/85">
                        {issue.description}
                      </p>
                    </div>
                    {canManageWorkflow && active && (
                      <IssueWorkflowActions
                        issueId={issue.id}
                        status={issue.status}
                        targetLabel={label}
                      />
                    )}
                  </div>
                  <div className="mt-4 grid gap-2 border-t border-border/50 pt-3 text-xs text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-wide">
                        Inspection
                      </span>
                      <div className="mt-0.5 text-foreground/75">
                        {issue.reviewedAt
                          ? `${issue.reviewerDisplayName ?? "Unknown reviewer"} · ${formatDateTime(issue.reviewedAt)}`
                          : "Awaiting inspection"}
                      </div>
                    </div>
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-wide">
                        Reported by
                      </span>
                      <div className="mt-0.5 text-foreground/75">{issue.reporterDisplayName}</div>
                    </div>
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-wide">
                        Reported
                      </span>
                      <div className="mt-0.5 text-foreground/75">
                        {formatDateTime(issue.createdAt)}
                      </div>
                    </div>
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-wide">
                        Resolution
                      </span>
                      <div className="mt-0.5 text-foreground/75">
                        {issue.resolvedAt
                          ? `${issue.resolverDisplayName ?? "Unknown resolver"} · ${formatDateTime(issue.resolvedAt)}`
                          : "Awaiting maintenance"}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </>
  );
}

function IssueStat({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/55 p-4">
      <div className="flex items-center justify-between">
        <span className="label-mono">{label}</span>
        <span className={tone}>{icon}</span>
      </div>
      <div className="mt-2 font-display text-3xl">{value}</div>
    </div>
  );
}

function targetLabel(
  issue: Issue,
  resources: ReturnType<typeof useAppStore>["resources"],
  classrooms: ReturnType<typeof useAppStore>["classrooms"],
) {
  if (issue.resourceId !== null) {
    return (
      resources.find((resource) => resource.id === issue.resourceId)?.name ??
      `Resource #${issue.resourceId}`
    );
  }
  const classroom = classrooms.find((room) => room.id === issue.classroomId);
  return classroom
    ? `${classroom.roomCode} · ${classroom.name}`
    : `Classroom #${issue.classroomId}`;
}
