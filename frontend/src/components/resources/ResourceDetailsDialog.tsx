import { Eye, MapPin, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ResourceStatusBadge } from "@/components/common/StatusBadge";
import type { Resource, User } from "@/types";

export function ResourceDetailsDialog({
  resource,
  manager,
}: {
  resource: Resource;
  manager?: User | undefined;
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
          <div className="flex items-center gap-3 pr-8">
            <DialogTitle className="font-display">{resource.name}</DialogTitle>
            <ResourceStatusBadge status={resource.status} />
          </div>
          <DialogDescription>
            {resource.category ?? "Uncategorised campus resource"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2 sm:grid-cols-2">
          <Detail icon={<MapPin />} label="Location" value={resource.location ?? "Not specified"} />
          <Detail
            icon={<Users />}
            label="Capacity"
            value={resource.capacity ? String(resource.capacity) : "Not specified"}
          />
          <Detail
            icon={<ShieldCheck />}
            label="Booking policy"
            value={resource.requiresApproval ? "Manager approval required" : "Instant confirmation"}
          />
          <Detail
            icon={<Users />}
            label="Responsible manager"
            value={
              manager
                ? `${manager.displayName} · ${manager.email}`
                : resource.managedByUserId
                  ? `User #${resource.managedByUserId}`
                  : "Unassigned"
            }
          />
        </div>
        <div className="border-t border-border/60 pt-3 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Catalog ID {resource.id} · Added {new Date(resource.createdAt).toLocaleDateString()}
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
