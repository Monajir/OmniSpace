import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Pencil, Plus, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, type AcademicTermWriteRequest } from "@/services/api";
import type { AcademicTerm } from "@/types";

const EMPTY: AcademicTermWriteRequest = {
  academicYear: "",
  semester: "",
  startDate: "",
  endDate: "",
};

export function AcademicTermManagementDialog({ trigger }: { trigger: ReactNode }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<AcademicTermWriteRequest>(EMPTY);
  const termsQuery = useQuery({
    queryKey: ["academic-terms"],
    queryFn: api.getAcademicTerms,
    enabled: open,
  });
  const save = useMutation({
    mutationFn: () =>
      editingId === null ? api.createAcademicTerm(form) : api.updateAcademicTerm(editingId, form),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["academic-terms"] });
      toast.success(editingId === null ? "Academic term created" : "Academic term updated");
      resetForm();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to save term"),
  });
  const remove = useMutation({
    mutationFn: api.deleteAcademicTerm,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["academic-terms"] });
      toast.success("Academic term removed");
      resetForm();
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Unable to remove term"),
  });

  useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY);
  }

  function edit(term: AcademicTerm) {
    setEditingId(term.id);
    setForm({
      academicYear: term.academicYear,
      semester: term.semester,
      startDate: term.startDate,
      endDate: term.endDate,
    });
  }

  function submit() {
    if (!form.academicYear.trim() || !form.semester.trim() || !form.startDate || !form.endDate) {
      toast.error("All academic term fields are required");
      return;
    }
    if (form.startDate > form.endDate) {
      toast.error("Start date must be on or before end date");
      return;
    }
    save.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <CalendarDays className="size-5 text-primary" /> Academic terms
          </DialogTitle>
          <DialogDescription>
            Date ranges determine which routine timetable applies to each classroom booking.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 rounded-xl border border-border/60 p-4 sm:grid-cols-2">
          <TermField label="Academic year">
            <Input
              value={form.academicYear}
              onChange={(event) =>
                setForm((value) => ({ ...value, academicYear: event.target.value }))
              }
              placeholder="2026-2027"
            />
          </TermField>
          <TermField label="Semester">
            <Input
              value={form.semester}
              onChange={(event) => setForm((value) => ({ ...value, semester: event.target.value }))}
              placeholder="Fall"
            />
          </TermField>
          <TermField label="Start date">
            <Input
              type="date"
              value={form.startDate}
              onChange={(event) =>
                setForm((value) => ({ ...value, startDate: event.target.value }))
              }
            />
          </TermField>
          <TermField label="End date">
            <Input
              type="date"
              value={form.endDate}
              onChange={(event) => setForm((value) => ({ ...value, endDate: event.target.value }))}
            />
          </TermField>
          <div className="flex gap-2 sm:col-span-2">
            <Button onClick={submit} disabled={save.isPending}>
              <Plus className="size-4" /> {editingId === null ? "Add term" : "Save changes"}
            </Button>
            {editingId !== null && (
              <Button variant="outline" onClick={resetForm}>
                Cancel edit
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {termsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading terms…</p>}
          {termsQuery.data?.map((term) => (
            <div
              key={term.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 p-3"
            >
              <div>
                <div className="font-medium">
                  {term.academicYear} · {term.semester}
                </div>
                <div className="text-xs text-muted-foreground">
                  {term.startDate} to {term.endDate}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => edit(term)}>
                  <Pencil className="size-4" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm(`Delete ${term.academicYear} · ${term.semester}?`)) {
                      remove.mutate(term.id);
                    }
                  }}
                >
                  <Trash2 className="size-4" /> Delete
                </Button>
              </div>
            </div>
          ))}
          {termsQuery.data?.length === 0 && (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No explicit terms exist yet. Until the first is added, the backend uses its configured
              current term.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TermField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
