import { useEffect, useState } from "react";
import { AtSign, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/lib/app-store";

export function AccountSettingsForm() {
  const { currentUser, updateDisplayName } = useAppStore();
  const [displayName, setDisplayName] = useState(currentUser.displayName);
  const [saving, setSaving] = useState(false);

  useEffect(() => setDisplayName(currentUser.displayName), [currentUser.displayName]);

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    const name = displayName.trim();
    if (!name) {
      toast.error("Display name is required");
      return;
    }
    setSaving(true);
    try {
      await updateDisplayName(name);
      toast.success("Account identity updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update account");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/15 text-primary">
          <AtSign className="size-5" />
        </div>
        <div>
          <h2 className="font-display text-lg">Account identity</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            The name shown across approvals, bookings, and campus records.
          </p>
        </div>
      </div>
      <form className="mt-5 space-y-4" onSubmit={submit}>
        <div className="space-y-2">
          <Label htmlFor="profile-display-name">Display name</Label>
          <Input
            id="profile-display-name"
            autoComplete="name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-email">Email</Label>
          <Input id="profile-email" value={currentUser.email} disabled />
          <p className="text-xs text-muted-foreground">
            Email is your sign-in identifier and cannot be changed here.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/25 px-3 py-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 text-primary" />
          <span>Your role is managed by an administrator.</span>
        </div>
        <Button type="submit" disabled={saving || displayName.trim() === currentUser.displayName}>
          <Save className="size-4" />
          {saving ? "Saving…" : "Save identity"}
        </Button>
      </form>
    </section>
  );
}
