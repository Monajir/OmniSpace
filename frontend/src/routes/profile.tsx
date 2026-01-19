import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, CalendarClock, IdCard, UserRoundCog } from "lucide-react";
import { AccountSettingsForm } from "@/components/profile/AccountSettingsForm";
import { ProfileDetailsForm } from "@/components/profile/ProfileDetailsForm";
import { PasswordChangeForm } from "@/components/profile/PasswordChangeForm";
import { useAppStore } from "@/lib/app-store";
import type { UserRole } from "@/types";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile Settings — OmniSpace" },
      {
        name: "description",
        content: "Manage your OmniSpace account identity and institutional profile.",
      },
    ],
  }),
  component: ProfilePage,
});

const ROLE_LABEL: Record<UserRole, string> = {
  STUDENT: "Student",
  CR: "Class Representative",
  FACULTY: "Faculty",
  RESOURCE_MANAGER: "Resource Manager",
  MAINTENANCE_STAFF: "Maintenance Staff",
  ADMIN: "Administrator",
};

function ProfilePage() {
  const { currentUser, profile } = useAppStore();
  const initials =
    currentUser.displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "OS";
  const filled = [
    profile?.department,
    profile?.contactNumber,
    profile?.studentId,
    profile?.facultyId,
    profile?.designation,
    profile?.academicYear,
    profile?.program,
    profile?.batch,
    profile?.section,
  ].filter(Boolean).length;
  return (
    <>
      {currentUser.mustChangePassword && (
        <div className="rounded-xl border border-primary/50 bg-primary/10 px-4 py-3 text-sm">
          This account uses a temporary password. Change it now to unlock the rest of OmniSpace.
        </div>
      )}
      <section className="panel overflow-hidden p-6">
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex size-20 items-center justify-center rounded-2xl border border-primary/35 bg-primary/15 font-display text-2xl text-primary">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <span className="label-mono">Profile settings</span>
            <h1 className="mt-2 truncate font-display text-4xl">{currentUser.displayName}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{currentUser.email}</span>
              <span>·</span>
              <span>{ROLE_LABEL[currentUser.role]}</span>
            </div>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat icon={<BadgeCheck />} label="Account role" value={ROLE_LABEL[currentUser.role]} />
          <Stat icon={<IdCard />} label="Profile fields" value={`${filled} completed`} />
          <Stat
            icon={<CalendarClock />}
            label="Member since"
            value={new Date(currentUser.createdAt).toLocaleDateString()}
          />
        </div>
      </section>
      <div className="grid gap-6 lg:grid-cols-3">
        {!currentUser.mustChangePassword && <AccountSettingsForm />}
        {!currentUser.mustChangePassword && <ProfileDetailsForm />}
        <PasswordChangeForm />
      </div>
    </>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/55 p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="[&_svg]:size-4">{icon}</span>
        <span className="label-mono">{label}</span>
      </div>
      <div className="mt-2 text-sm font-medium">{value}</div>
    </div>
  );
}
