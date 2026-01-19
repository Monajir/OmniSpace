import { useEffect, useState } from "react";
import { ShieldAlert, UserCog } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/services/api";
import { ROLE_LABEL } from "@/components/users/UserRoleBadge";
import type { User, UserRole } from "@/types";

const ROLES: UserRole[] = [
  "STUDENT",
  "CR",
  "FACULTY",
  "RESOURCE_MANAGER",
  "MAINTENANCE_STAFF",
  "ADMIN",
];
const ROLE_ACCESS: Record<UserRole, string> = {
  STUDENT: "Personal schedules and general campus availability.",
  CR: "Student access plus classroom booking for cohort activities.",
  FACULTY: "Teaching routines, classroom bookings, and academic approvals.",
  RESOURCE_MANAGER: "Resource catalog ownership and resource request approvals.",
  MAINTENANCE_STAFF: "Issue resolution and operational classroom/resource statuses.",
  ADMIN: "Full campus administration, including users, routines, rooms, and resources.",
};

export function ChangeUserRoleDialog({
  user,
  onChanged,
}: {
  user: User;
  onChanged: (user: User) => void;
}) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<UserRole>(user.role);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) setRole(user.role);
  }, [open, user.role]);

  async function changeRole() {
    setSaving(true);
    try {
      const updated = await api.changeUserRole(user.id, role);
      onChanged(updated);
      toast.success(`${user.displayName} is now ${ROLE_LABEL[role]}`);
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to change role");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserCog className="size-4" />
          Manage role
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Change role for {user.displayName}</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Assigned role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {ROLE_LABEL[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-lg border border-primary/25 bg-primary/10 p-3 text-sm">
            <div className="font-medium">{ROLE_LABEL[role]} access</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{ROLE_ACCESS[role]}</p>
          </div>
          {role !== user.role && (
            <div className="flex gap-2 rounded-lg border border-pending/35 bg-pending/10 p-3 text-xs leading-5 text-muted-foreground">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-pending" />
              <span>
                The change takes effect immediately. A Resource Manager must have all managed
                resources reassigned before moving to another role.
              </span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={changeRole} disabled={saving || role === user.role}>
            {saving ? "Updating…" : "Confirm role change"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
