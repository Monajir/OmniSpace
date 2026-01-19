import { useState } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/lib/app-store";

export function PasswordChangeForm() {
  const { currentUser, changePassword } = useAppStore();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmation) {
      toast.error("New passwords do not match");
      return;
    }
    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success("Password changed. Sign in again with your new password.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to change password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={`panel p-5 ${currentUser.mustChangePassword ? "border-primary/60" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/15 text-primary">
          <KeyRound className="size-5" />
        </div>
        <div>
          <h2 className="font-display text-lg">Change password</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {currentUser.mustChangePassword
              ? "Your temporary password must be replaced before you continue."
              : "Changing your password signs out all active sessions."}
          </p>
        </div>
      </div>
      <form className="mt-5 space-y-4" onSubmit={submit}>
        <PasswordField
          id="current-password"
          label="Current password"
          value={currentPassword}
          onChange={setCurrentPassword}
          autoComplete="current-password"
        />
        <PasswordField
          id="new-password"
          label="New password"
          value={newPassword}
          onChange={setNewPassword}
          autoComplete="new-password"
        />
        <PasswordField
          id="confirm-password"
          label="Confirm new password"
          value={confirmation}
          onChange={setConfirmation}
          autoComplete="new-password"
        />
        <Button
          type="submit"
          disabled={saving || !currentPassword || !newPassword || !confirmation}
        >
          <KeyRound className="size-4" />
          {saving ? "Changing…" : "Change password"}
        </Button>
      </form>
    </section>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="password"
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={128}
      />
    </div>
  );
}
