import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface IssueTarget {
  kind: "RESOURCE" | "CLASSROOM";
  id: number;
  label: string;
}

export function ReportIssueDialog({
  targets,
  trigger,
}: {
  targets: IssueTarget[];
  trigger?: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const { refreshData } = useAppStore();
  const [open, setOpen] = useState(false);
  const [targetKey, setTargetKey] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!targets.some((target) => keyOf(target) === targetKey)) {
      setTargetKey(targets[0] ? keyOf(targets[0]) : "");
    }
  }, [targetKey, targets]);

  const target = targets.find((candidate) => keyOf(candidate) === targetKey);

  async function submit() {
    if (!target || !description.trim()) return;
    setSubmitting(true);
    try {
      if (target.kind === "RESOURCE") {
        await api.reportResourceIssue(target.id, description.trim());
      } else {
        await api.reportClassroomIssue(target.id, description.trim());
      }
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["issues"] }), refreshData()]);
      toast.success(`Issue reported for ${target.label}`);
      setDescription("");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to report issue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline">
            <AlertTriangle className="size-4" />
            Report issue
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Report an issue</DialogTitle>
          <DialogDescription>
            Describe the problem clearly so the maintenance team can identify and resolve it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Location or resource</Label>
            {targets.length === 1 && target ? (
              <div className="rounded-lg border border-border/60 bg-card/60 px-3 py-2 text-sm">
                <span className="font-mono text-xs text-muted-foreground">
                  {target.kind === "CLASSROOM" ? "Classroom" : "Resource"}
                </span>
                <div>{target.label}</div>
              </div>
            ) : (
              <Select value={targetKey} onValueChange={setTargetKey}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a classroom or resource" />
                </SelectTrigger>
                <SelectContent>
                  {targets.map((option) => (
                    <SelectItem key={keyOf(option)} value={keyOf(option)}>
                      {option.kind === "CLASSROOM" ? "Room" : "Resource"} · {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="issue-description">Problem description</Label>
              <span className="font-mono text-[10px] text-muted-foreground">
                {description.length}/1000
              </span>
            </div>
            <Textarea
              id="issue-description"
              value={description}
              maxLength={1000}
              rows={5}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Example: The projector powers on, but no HDMI signal is detected."
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={submit} disabled={!target || !description.trim() || submitting}>
            {submitting ? "Submitting…" : "Submit report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function keyOf(target: IssueTarget) {
  return `${target.kind}:${target.id}`;
}
