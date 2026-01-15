import { useEffect, useState } from "react";
import { Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/app-store";
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
import type { Resource, User } from "@/types";

export function ResourceFormDialog({
  resource,
  managers,
  trigger,
}: {
  resource?: Resource;
  managers: User[];
  trigger?: React.ReactNode;
}) {
  const { currentUser, createResource, updateResource } = useAppStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [managerId, setManagerId] = useState("UNASSIGNED");
  const [saving, setSaving] = useState(false);
  const editing = resource !== undefined;
  const isAdmin = currentUser.role === "ADMIN";

  useEffect(() => {
    if (!open) return;
    setName(resource?.name ?? "");
    setCategory(resource?.category ?? "");
    setLocation(resource?.location ?? "");
    setCapacity(resource?.capacity ? String(resource.capacity) : "");
    setRequiresApproval(resource?.requiresApproval ?? false);
    setManagerId(
      String(
        resource?.managedByUserId ??
          (currentUser.role === "RESOURCE_MANAGER" ? currentUser.id : "UNASSIGNED"),
      ),
    );
  }, [currentUser.id, currentUser.role, open, resource]);

  async function submit() {
    const trimmedName = name.trim();
    const parsedCapacity = capacity.trim() ? Number(capacity) : null;
    if (!trimmedName) {
      toast.error("Resource name is required");
      return;
    }
    if (parsedCapacity !== null && (!Number.isInteger(parsedCapacity) || parsedCapacity <= 0)) {
      toast.error("Capacity must be a positive whole number");
      return;
    }

    setSaving(true);
    try {
      const data = {
        name: trimmedName,
        category: category.trim() || null,
        location: location.trim() || null,
        capacity: parsedCapacity,
        requiresApproval,
        managedByUserId:
          currentUser.role === "RESOURCE_MANAGER"
            ? currentUser.id
            : managerId === "UNASSIGNED"
              ? null
              : Number(managerId),
      };
      if (resource) await updateResource(resource.id, data);
      else await createResource(data);
      toast.success(resource ? "Resource updated" : "Resource created");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save resource");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="size-4" />
            Add resource
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display">
            {editing ? "Edit resource" : "Create resource"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the catalog information, ownership, and booking policy."
              : "Add bookable equipment or a shared facility to the campus catalog."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <Field label="Name" className="sm:col-span-2">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Portable projector"
            />
          </Field>
          <Field label="Category">
            <Input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="Audio Visual"
            />
          </Field>
          <Field label="Location">
            <Input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Equipment Desk"
            />
          </Field>
          <Field label="Capacity">
            <Input
              type="number"
              min={1}
              step={1}
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
              placeholder="Optional"
            />
          </Field>
          <Field label="Responsible manager">
            {isAdmin ? (
              <Select value={managerId} onValueChange={setManagerId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
                  {managers.map((manager) => (
                    <SelectItem key={manager.id} value={String(manager.id)}>
                      {manager.displayName} · {manager.email}
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
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-card/50 p-3 sm:col-span-2">
            <div>
              <Label htmlFor="requires-approval">Require booking approval</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Requests remain pending until the responsible manager or Admin approves them.
              </p>
            </div>
            <Switch
              id="requires-approval"
              checked={requiresApproval}
              onCheckedChange={setRequiresApproval}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={submit} disabled={saving}>
            <Save className="size-4" />
            {saving ? "Saving…" : editing ? "Save changes" : "Create resource"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
