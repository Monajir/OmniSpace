import { useMemo, useState } from "react";
import { Building2, Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { ClassroomStatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { ClassroomDetailsDialog } from "@/components/classrooms/ClassroomDetailsDialog";
import { ClassroomFormDialog } from "@/components/classrooms/ClassroomFormDialog";
import { DeleteClassroomButton } from "@/components/classrooms/DeleteClassroomButton";
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
import type { ClassroomStatus } from "@/types";

const STATUSES: ClassroomStatus[] = ["AVAILABLE", "PENDING_INSPECTION", "RESERVED", "MAINTENANCE"];
const MANUAL_STATUSES = STATUSES.filter((status) => status !== "PENDING_INSPECTION");
type StatusFilter = "ALL" | ClassroomStatus;
type TypeFilter = "ALL" | "CLASSROOM" | "LAB";

export function ClassroomManagement() {
  const { currentUser, classrooms, updateClassroomStatus } = useAppStore();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [roomType, setRoomType] = useState<TypeFilter>("ALL");
  const isAdmin = currentUser.role === "ADMIN";

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return classrooms.filter((classroom) => {
      if (status !== "ALL" && classroom.status !== status) return false;
      if (roomType === "LAB" && !classroom.isLab) return false;
      if (roomType === "CLASSROOM" && classroom.isLab) return false;
      return (
        !needle ||
        `${classroom.roomCode} ${classroom.name} ${classroom.building ?? ""} ${classroom.departmentOwned ?? ""}`
          .toLowerCase()
          .includes(needle)
      );
    });
  }, [classrooms, roomType, search, status]);

  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg">Classroom inventory</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {isAdmin
              ? "Maintain room identity, location, facilities, department ownership, and status."
              : "Keep classroom availability aligned with current maintenance conditions."}
          </p>
        </div>
        {isAdmin && (
          <ClassroomFormDialog
            trigger={
              <Button>
                <Plus className="size-4" />
                Add classroom
              </Button>
            }
          />
        )}
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px_190px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search code, name, building, or department…"
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
        <Select value={roomType} onValueChange={(value) => setRoomType(value as TypeFilter)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All room types</SelectItem>
            <SelectItem value="CLASSROOM">Classrooms</SelectItem>
            <SelectItem value="LAB">Laboratories</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4">
        <span className="label-mono">{filtered.length} shown</span>
      </div>
      <div className="mt-3">
        {filtered.length === 0 ? (
          <EmptyState
            message={
              classrooms.length === 0
                ? "No classrooms have been added"
                : "No classrooms match these filters"
            }
            icon={<Building2 className="size-6" />}
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map((classroom) => {
              const location = [
                classroom.building,
                classroom.floor === null ? null : `Floor ${classroom.floor}`,
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <article
                  key={classroom.id}
                  className="rounded-xl border border-border/60 bg-card/60 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="label-mono">{classroom.roomCode}</div>
                      <h3 className="mt-1 truncate font-display text-base">{classroom.name}</h3>
                    </div>
                    <ClassroomStatusBadge status={classroom.status} />
                  </div>
                  <div className="mt-3 text-xs leading-5 text-muted-foreground">
                    <div>
                      {location || "No location specified"}
                      {classroom.capacity ? ` · capacity ${classroom.capacity}` : ""}
                    </div>
                    <div>
                      {classroom.isLab ? "Laboratory" : "Classroom"} ·{" "}
                      {classroom.departmentOwned ?? "Shared"}
                    </div>
                    <div>
                      {[
                        classroom.hasProjector && "Projector",
                        classroom.hasWhiteboard && "Whiteboard",
                      ]
                        .filter(Boolean)
                        .join(" · ") || "No facilities listed"}
                    </div>
                  </div>
                  <div className="mt-4">
                    <Select
                      value={classroom.status}
                      onValueChange={async (value) => {
                        try {
                          await updateClassroomStatus(classroom.id, value as ClassroomStatus);
                          toast.success(
                            `${classroom.roomCode} set to ${displayStatus(value as ClassroomStatus).toLowerCase()}`,
                          );
                        } catch (error) {
                          toast.error(
                            error instanceof Error
                              ? error.message
                              : "Unable to update classroom status",
                          );
                        }
                      }}
                    >
                      <SelectTrigger
                        className="h-9"
                        aria-label={`Status for ${classroom.roomCode}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {classroom.status === "PENDING_INSPECTION" && (
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
                    <ClassroomDetailsDialog classroom={classroom} />
                    {isAdmin && (
                      <>
                        <ClassroomFormDialog
                          classroom={classroom}
                          trigger={
                            <Button size="sm" variant="outline">
                              <Pencil className="size-4" />
                              Edit
                            </Button>
                          }
                        />
                        <DeleteClassroomButton classroom={classroom} />
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

function displayStatus(status: ClassroomStatus) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase());
}
