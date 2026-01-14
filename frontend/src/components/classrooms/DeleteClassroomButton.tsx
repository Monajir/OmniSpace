import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import type { Classroom } from "@/types";

export function DeleteClassroomButton({ classroom }: { classroom: Classroom }) {
  const { deleteClassroom } = useAppStore();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    setDeleting(true);
    try {
      await deleteClassroom(classroom.id);
      toast.success(`${classroom.roomCode} deleted`);
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete classroom");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" aria-label={`Delete ${classroom.roomCode}`}>
          <Trash2 className="size-4" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {classroom.roomCode}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the classroom and its recurring routines. PostgreSQL will block
            the deletion while bookings or issue reports still reference this room.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Keep classroom</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleting}
            onClick={(event) => {
              event.preventDefault();
              void remove();
            }}
          >
            {deleting ? "Deleting…" : "Delete classroom"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
