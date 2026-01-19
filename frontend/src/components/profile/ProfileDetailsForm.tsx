import { useEffect, useState } from "react";
import { ContactRound, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/lib/app-store";

type Fields = {
  contactNumber: string;
};

const EMPTY: Fields = {
  contactNumber: "",
};

export function ProfileDetailsForm() {
  const { currentUser, profile, updateProfile } = useAppStore();
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [saving, setSaving] = useState(false);
  const learner = currentUser.role === "STUDENT" || currentUser.role === "CR";
  const faculty = currentUser.role === "FACULTY";
  const academicContext = learner || faculty;
  const showDesignation = !learner;
  const showFacultyId = faculty || currentUser.role === "ADMIN";

  useEffect(() => {
    setFields({
      contactNumber: profile?.contactNumber ?? "",
    });
  }, [profile]);

  function set(field: keyof Fields, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (fields.contactNumber.length > 32) {
      toast.error("Contact number must be 32 characters or fewer");
      return;
    }
    const clean = (value: string) => value.trim() || null;
    setSaving(true);
    try {
      await updateProfile({
        contactNumber: clean(fields.contactNumber),
      });
      toast.success("Contact details updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel p-5 lg:col-span-2">
      <div className="flex items-start gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/15 text-primary">
          <ContactRound className="size-5" />
        </div>
        <div>
          <h2 className="font-display text-lg">Institutional profile</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Institutional assignments are verified and managed by an administrator.
          </p>
        </div>
      </div>
      <form className="mt-5" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <ReadOnlyField label="Department" value={profile?.department} />
          <Field label="Contact number">
            <Input
              type="tel"
              autoComplete="tel"
              maxLength={32}
              value={fields.contactNumber}
              onChange={(event) => set("contactNumber", event.target.value)}
              placeholder="+8801…"
            />
          </Field>
          {learner && <ReadOnlyField label="Student ID" value={profile?.studentId} />}
          {showFacultyId && <ReadOnlyField label="Faculty ID" value={profile?.facultyId} />}
          {showDesignation && <ReadOnlyField label="Designation" value={profile?.designation} />}
          {academicContext && (
            <>
              <ReadOnlyField label="Academic year" value={profile?.academicYear} />
              <ReadOnlyField label="Program" value={profile?.program} />
              <ReadOnlyField label="Batch / intake" value={profile?.batch} />
              <ReadOnlyField label="Section" value={profile?.section} />
            </>
          )}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
          <p className="text-xs text-muted-foreground">
            Contact support or an administrator if an institutional assignment is incorrect.
          </p>
          <Button type="submit" disabled={saving}>
            <Save className="size-4" />
            {saving ? "Saving…" : "Save contact"}
          </Button>
        </div>
      </form>
    </section>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <Field label={label}>
      <Input value={value || "Not assigned"} disabled />
    </Field>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
