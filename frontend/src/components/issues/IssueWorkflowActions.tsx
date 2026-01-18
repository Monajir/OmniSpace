import { useState, type ReactNode } from "react";
import { CheckCircle2, ClipboardCheck, XCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/services/api";
import { useAppStore } from "@/lib/app-store";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { IssueStatus } from "@/types";

export function IssueWorkflowActions({
  issueId,
  status,
  targetLabel,
}: {
  issueId: number;
  status: IssueStatus;
  targetLabel: string;
}) {
  if (status === "OPEN") {
    return (
      <div className="flex flex-wrap gap-2">
        <WorkflowAction
          label="Dismiss"
          title="Dismiss this report?"
          description={`Close the report for ${targetLabel} as not requiring maintenance. The asset returns to available only if this workflow still controls its status and no other active issues remain.`}
          success="Issue dismissed"
          icon={<XCircle className="size-4" />}
          variant="outline"
          run={() => api.dismissIssue(issueId)}
        />
        <WorkflowAction
          label="Confirm issue"
          title="Confirm maintenance is required?"
          description={`Confirm the report for ${targetLabel} and move it into active maintenance work.`}
          success="Issue confirmed for maintenance"
          icon={<ClipboardCheck className="size-4" />}
          run={() => api.confirmIssue(issueId)}
        />
      </div>
    );
  }

  if (status === "IN_PROGRESS") {
    return (
      <WorkflowAction
        label="Resolve"
        title="Confirm the repair?"
        description={`Mark the confirmed issue for ${targetLabel} as resolved. Automatic availability is restored only when no other active issues remain and staff have not manually overridden the asset status.`}
        success="Issue marked as resolved"
        icon={<CheckCircle2 className="size-4" />}
        run={() => api.resolveIssue(issueId)}
      />
    );
  }

  return null;
}

function WorkflowAction({
  label,
  title,
  description,
  success,
  icon,
  variant = "default",
  run,
}: {
  label: string;
  title: string;
  description: string;
  success: string;
  icon: ReactNode;
  variant?: "default" | "outline";
  run: () => Promise<unknown>;
}) {
  const queryClient = useQueryClient();
  const { refreshData } = useAppStore();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      await run();
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["issues"] }), refreshData()]);
      toast.success(success);
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update issue");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant={variant}>
          {icon}
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={saving}
            onClick={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            {saving ? "Saving…" : label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
