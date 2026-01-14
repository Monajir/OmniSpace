import { useEffect, useState, type ReactNode } from "react";
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
import { Switch } from "@/components/ui/switch";
import type { Classroom } from "@/types";

export function ClassroomFormDialog({
  classroom,
  trigger,
}: {
  classroom?: Classroom;
  trigger?: ReactNode;
}) {
  const { createClassroom, updateClassroom } = useAppStore();
  const [open, setOpen] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [name, setName] = useState("");
  const [building, setBuilding] = useState("");
  const [floor, setFloor] = useState("");
  const [capacity, setCapacity] = useState("");
  const [department, setDepartment] = useState("");
  const [hasProjector, setHasProjector] = useState(false);
  const [hasWhiteboard, setHasWhiteboard] = useState(false);
  const [isLab, setIsLab] = useState(false);
  const [saving, setSaving] = useState(false);
  const editing = classroom !== undefined;

  useEffect(() => {
    if (!open) return;
    setRoomCode(classroom?.roomCode ?? "");
    setName(classroom?.name ?? "");
    setBuilding(classroom?.building ?? "");
    setFloor(
      classroom?.floor === null || classroom?.floor === undefined ? "" : String(classroom.floor),
    );
    setCapacity(classroom?.capacity ? String(classroom.capacity) : "");
    setDepartment(classroom?.departmentOwned ?? "");
    setHasProjector(classroom?.hasProjector ?? false);
    setHasWhiteboard(classroom?.hasWhiteboard ?? false);
    setIsLab(classroom?.isLab ?? false);
  }, [classroom, open]);

  async function submit() {
    const code = roomCode.trim().toUpperCase();
    const trimmedName = name.trim();
    const parsedFloor = floor.trim() ? Number(floor) : null;
    const parsedCapacity = capacity.trim() ? Number(capacity) : null;
    if (!editing && !code) {
      toast.error("Room code is required");
      return;
    }
    if (!trimmedName) {
      toast.error("Classroom name is required");
      return;
    }
    if (parsedFloor !== null && (!Number.isInteger(parsedFloor) || parsedFloor < 0)) {
      toast.error("Floor must be zero or a positive whole number");
      return;
    }
    if (parsedCapacity !== null && (!Number.isInteger(parsedCapacity) || parsedCapacity <= 0)) {
      toast.error("Capacity must be a positive whole number");
      return;
    }

    const details = {
      name: trimmedName,
      building: building.trim() || null,
      floor: parsedFloor,
      capacity: parsedCapacity,
      hasProjector,
      hasWhiteboard,
      isLab,
      departmentOwned: department.trim() || null,
    };
    setSaving(true);
    try {
      if (classroom) await updateClassroom(classroom.id, details);
      else await createClassroom({ roomCode: code, ...details });
      toast.success(classroom ? "Classroom updated" : "Classroom created");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save classroom");
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
            Add classroom
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">
            {editing ? "Edit classroom" : "Create classroom"}
          </DialogTitle>
          <DialogDescription>
            Maintain the room directory, physical location, capacity, and teaching facilities.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <Field label="Room code">
            <Input
              value={roomCode}
              disabled={editing}
              onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
              placeholder="CSE-401"
            />
            {editing && (
              <p className="text-xs text-muted-foreground">Room codes are permanent identifiers.</p>
            )}
          </Field>
          <Field label="Classroom name">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Networks Lab"
            />
          </Field>
          <Field label="Building">
            <Input
              value={building}
              onChange={(event) => setBuilding(event.target.value)}
              placeholder="Engineering Building"
            />
          </Field>
          <Field label="Floor">
            <Input
              type="number"
              min={0}
              step={1}
              value={floor}
              onChange={(event) => setFloor(event.target.value)}
              placeholder="4"
            />
          </Field>
          <Field label="Capacity">
            <Input
              type="number"
              min={1}
              step={1}
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
              placeholder="40"
            />
          </Field>
          <Field label="Owning department">
            <Input
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              placeholder="CSE"
            />
          </Field>

          <div className="grid gap-3 sm:col-span-2 sm:grid-cols-3">
            <FacilitySwitch label="Projector" checked={hasProjector} onChange={setHasProjector} />
            <FacilitySwitch
              label="Whiteboard"
              checked={hasWhiteboard}
              onChange={setHasWhiteboard}
            />
            <FacilitySwitch label="Laboratory" checked={isLab} onChange={setIsLab} />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={submit} disabled={saving}>
            <Save className="size-4" />
            {saving ? "Saving…" : editing ? "Save changes" : "Create classroom"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function FacilitySwitch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/50 p-3">
      <Label>{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}
