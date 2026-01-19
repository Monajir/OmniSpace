import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, Save } from "lucide-react";
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
import { api, type AdminUpdateAcademicProfileRequest } from "@/services/api";
import type { Profile, User } from "@/types";

type Fields = Record<keyof AdminUpdateAcademicProfileRequest, string>;

const EMPTY: Fields = {
  department: "",
  studentId: "",
  facultyId: "",
  designation: "",
  academicYear: "",
  program: "",
  batch: "",
  section: "",
};

export function EditAcademicProfileDialog({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState<Fields>(EMPTY);
  const profileQuery = useQuery({
    queryKey: ["user-profile", user.id],
    queryFn: () => api.getProfile(user.id),
    enabled: open,
  });

  useEffect(() => {
    const profile = profileQuery.data;
    if (!profile) return;
    setFields({
      department: profile.department ?? "",
      studentId: profile.studentId ?? "",
      facultyId: profile.facultyId ?? "",
      designation: profile.designation ?? "",
      academicYear: profile.academicYear ?? "",
      program: profile.program ?? "",
      batch: profile.batch ?? "",
      section: profile.section ?? "",
    });
  }, [profileQuery.data]);

  function set(field: keyof Fields, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
  }

  async function save() {
    const clean = (value: string) => value.trim() || null;
    setSaving(true);
    try {
      const updated = await api.updateAcademicProfile(user.id, {
        department: clean(fields.department),
        studentId: clean(fields.studentId),
        facultyId: clean(fields.facultyId),
        designation: clean(fields.designation),
        academicYear: clean(fields.academicYear),
        program: clean(fields.program),
        batch: clean(fields.batch),
        section: clean(fields.section),
      });
      queryClient.setQueryData<Profile>(["user-profile", user.id], updated);
      toast.success(`Institutional assignments updated for ${user.displayName}`);
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update assignments");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <GraduationCap className="size-4" />
          Academic profile
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">Institutional assignments</DialogTitle>
          <DialogDescription>
            {user.displayName} · {user.email}. These verified values control cohort and department
            access.
          </DialogDescription>
        </DialogHeader>

        {profileQuery.isLoading ? (
          <p className="py-6 text-sm text-muted-foreground">Loading profile…</p>
        ) : profileQuery.isError ? (
          <div className="space-y-3 py-4">
            <p className="text-sm text-destructive">
              {profileQuery.error instanceof Error
                ? profileQuery.error.message
                : "Unable to load profile"}
            </p>
            <Button variant="outline" onClick={() => void profileQuery.refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <ProfileField
              label="Department"
              value={fields.department}
              onChange={(value) => set("department", value)}
              maxLength={255}
            />
            <ProfileField
              label="Designation"
              value={fields.designation}
              onChange={(value) => set("designation", value)}
              maxLength={255}
            />
            <ProfileField
              label="Student ID"
              value={fields.studentId}
              onChange={(value) => set("studentId", value)}
              maxLength={64}
            />
            <ProfileField
              label="Faculty ID"
              value={fields.facultyId}
              onChange={(value) => set("facultyId", value)}
              maxLength={64}
            />
            <ProfileField
              label="Academic year"
              value={fields.academicYear}
              onChange={(value) => set("academicYear", value)}
              maxLength={32}
            />
            <ProfileField
              label="Program"
              value={fields.program}
              onChange={(value) => set("program", value)}
              maxLength={255}
            />
            <ProfileField
              label="Batch / intake"
              value={fields.batch}
              onChange={(value) => set("batch", value)}
              maxLength={32}
            />
            <ProfileField
              label="Section"
              value={fields.section}
              onChange={(value) => set("section", value)}
              maxLength={16}
            />
          </div>
        )}

        <DialogFooter>
          <Button onClick={save} disabled={saving || !profileQuery.data}>
            <Save className="size-4" />
            {saving ? "Saving…" : "Save assignments"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProfileField({
  label,
  value,
  onChange,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={maxLength}
      />
    </div>
  );
}
