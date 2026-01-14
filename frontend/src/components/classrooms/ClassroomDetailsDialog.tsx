import { Beaker, Building2, Eye, Presentation, School, Users, Warehouse } from "lucide-react";
import { ClassroomStatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Classroom } from "@/types";

export function ClassroomDetailsDialog({ classroom }: { classroom: Classroom }) {
  const location = [
    classroom.building,
    classroom.floor === null ? null : `Floor ${classroom.floor}`,
  ]
    .filter(Boolean)
    .join(" · ");
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
          <div className="flex items-center gap-3 pr-8">
            <DialogTitle className="font-display">
              {classroom.roomCode} · {classroom.name}
            </DialogTitle>
            <ClassroomStatusBadge status={classroom.status} />
          </div>
          <DialogDescription>{location || "Campus location not specified"}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2 sm:grid-cols-2">
          <Detail icon={<Building2 />} label="Location" value={location || "Not specified"} />
          <Detail
            icon={<Users />}
            label="Capacity"
            value={classroom.capacity ? `${classroom.capacity} people` : "Not specified"}
          />
          <Detail
            icon={<School />}
            label="Department"
            value={classroom.departmentOwned ?? "Shared campus room"}
          />
          <Detail
            icon={<Warehouse />}
            label="Room type"
            value={classroom.isLab ? "Laboratory" : "Classroom"}
          />
          <Detail
            icon={<Presentation />}
            label="Projector"
            value={classroom.hasProjector ? "Available" : "Not available"}
          />
          <Detail
            icon={<Beaker />}
            label="Whiteboard"
            value={classroom.hasWhiteboard ? "Available" : "Not available"}
          />
        </div>
        <div className="border-t border-border/60 pt-3 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Classroom ID {classroom.id} · Added {new Date(classroom.createdAt).toLocaleDateString()}
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
