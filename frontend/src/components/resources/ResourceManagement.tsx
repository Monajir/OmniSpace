import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Boxes, Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/EmptyState";
import { ResourceStatusBadge } from "@/components/common/StatusBadge";
import { DeleteResourceButton } from "@/components/resources/DeleteResourceButton";
import { ResourceDetailsDialog } from "@/components/resources/ResourceDetailsDialog";
import { ResourceFormDialog } from "@/components/resources/ResourceFormDialog";
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
import type { ResourceStatus, User } from "@/types";

const STATUSES: ResourceStatus[] = [
  "AVAILABLE",
  "PENDING_INSPECTION",
  "UNAVAILABLE",
  "MAINTENANCE",
];
const MANUAL_STATUSES = STATUSES.filter((status) => status !== "PENDING_INSPECTION");
type StatusFilter = "ALL" | ResourceStatus;

export function ResourceManagement() {
  const { currentUser, resources, updateResourceStatus } = useAppStore();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const isAdmin = currentUser.role === "ADMIN";
  const canManageCatalog = isAdmin || currentUser.role === "RESOURCE_MANAGER";

  const managersQuery = useQuery({
    queryKey: ["users", "RESOURCE_MANAGER"],
    queryFn: () => api.getUsers("RESOURCE_MANAGER"),
    enabled: isAdmin,
  });
  const managers = useMemo(
    () => (currentUser.role === "RESOURCE_MANAGER" ? [currentUser] : (managersQuery.data ?? [])),
    [currentUser, managersQuery.data],
  );
  const managerById = useMemo(
    () => new Map<number, User>(managers.map((manager) => [manager.id, manager])),
    [managers],
  );
  const managed = useMemo(
    () =>
      currentUser.role === "RESOURCE_MANAGER"
        ? resources.filter((resource) => resource.managedByUserId === currentUser.id)
        : resources,
    [currentUser.id, currentUser.role, resources],
  );
  const filtered = managed.filter((resource) => {
    if (status !== "ALL" && resource.status !== status) return false;
    const needle = search.trim().toLowerCase();
    return (
      !needle ||
      `${resource.name} ${resource.category ?? ""} ${resource.location ?? ""}`
        .toLowerCase()
        .includes(needle)
    );
  });

  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg">
            {currentUser.role === "RESOURCE_MANAGER" ? "Resources you manage" : "Resource catalog"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {currentUser.role === "MAINTENANCE_STAFF"
              ? "Keep operational availability accurate while maintenance work is completed."
              : "Maintain catalog details, availability, booking policy, and ownership."}
          </p>
        </div>
        {canManageCatalog && (
          <ResourceFormDialog
            managers={managers}
            trigger={
              <Button>
                <Plus className="size-4" />
                Add resource
              </Button>
            }
          />
        )}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_210px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, category, or location…"
          />
        </div>
        <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {STATUSES.map((item) => (
              <SelectItem key={item} value={item}>
                {displayStatus(item)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="label-mono">{filtered.length} shown</span>
        {managersQuery.isError && isAdmin && (
          <span className="text-xs text-destructive">Manager names could not be loaded</span>
        )}
      </div>

      <div className="mt-3">
        {filtered.length === 0 ? (
          <EmptyState
            message={
              managed.length === 0
                ? "No resources are assigned yet"
                : "No resources match these filters"
            }
            icon={<Boxes className="size-6" />}
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map((resource) => {
              const manager =
                resource.managedByUserId === null
                  ? undefined
                  : managerById.get(resource.managedByUserId);
              return (
                <article
                  key={resource.id}
                  className="rounded-xl border border-border/60 bg-card/60 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-display text-base">{resource.name}</h3>
                      <div className="label-mono mt-1">{resource.category ?? "Uncategorised"}</div>
                    </div>
                    <ResourceStatusBadge status={resource.status} />
                  </div>
                  <div className="mt-3 text-xs leading-5 text-muted-foreground">
                    <div>
                      {resource.location ?? "No location"}
                      {resource.capacity ? ` · capacity ${resource.capacity}` : ""}
                    </div>
                    <div>
                      {resource.requiresApproval ? "Approval required" : "Instant booking"}
                      {isAdmin &&
                        ` · ${manager?.displayName ?? (resource.managedByUserId ? `User #${resource.managedByUserId}` : "Unassigned")}`}
                    </div>
                  </div>
                  <div className="mt-4">
                    <Select
                      value={resource.status}
                      onValueChange={async (value) => {
                        try {
                          await updateResourceStatus(resource.id, value as ResourceStatus);
                          toast.success(
                            `${resource.name} set to ${displayStatus(value as ResourceStatus).toLowerCase()}`,
                          );
                        } catch (error) {
                          toast.error(
                            error instanceof Error ? error.message : "Unable to update resource",
                          );
                        }
                      }}
                    >
                      <SelectTrigger className="h-9" aria-label={`Status for ${resource.name}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {resource.status === "PENDING_INSPECTION" && (
                          <SelectItem value="PENDING_INSPECTION" disabled>
                            Pending inspection · use issue queue
                          </SelectItem>
                        )}
                        {MANUAL_STATUSES.map((item) => (
                          <SelectItem key={item} value={item}>
                            {displayStatus(item)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-border/50 pt-3">
                    <ResourceDetailsDialog resource={resource} manager={manager} />
                    {canManageCatalog && (
                      <>
                        <ResourceFormDialog
                          resource={resource}
                          managers={managers}
                          trigger={
                            <Button size="sm" variant="outline">
                              <Pencil className="size-4" />
                              Edit
                            </Button>
                          }
                        />
                        <DeleteResourceButton resource={resource} />
                      </>
                    )}
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

function displayStatus(status: ResourceStatus) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase());
}
