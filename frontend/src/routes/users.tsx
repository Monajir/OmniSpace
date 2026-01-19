import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, UserCog, UsersRound } from "lucide-react";
import { UserRoleManagement } from "@/components/users/UserRoleManagement";
import { ROLE_LABEL } from "@/components/users/UserRoleBadge";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";

export const Route = createFileRoute("/users")({
  head: () => ({
    meta: [
      { title: "User Roles — OmniSpace" },
      { name: "description", content: "Administer OmniSpace user roles and campus permissions." },
    ],
  }),
  component: UsersPage,
});

function UsersPage() {
  const usersQuery = useQuery({ queryKey: ["users"], queryFn: () => api.getUsers() });
  const users = usersQuery.data ?? [];
  return (
    <>
      <section className="panel overflow-hidden p-6">
        <span className="label-mono">Access administration</span>
        <h1 className="mt-2 font-display text-4xl">
          User–Role <span className="text-primary">Management</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Control who can book, approve, maintain, and administer campus spaces from one protected
          directory.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat icon={<UsersRound />} label="Total users" value={users.length} />
          <Stat
            icon={<ShieldCheck />}
            label="Administrators"
            value={users.filter((user) => user.role === "ADMIN").length}
          />
          <Stat
            icon={<UserCog />}
            label="Operational staff"
            value={
              users.filter((user) =>
                ["FACULTY", "RESOURCE_MANAGER", "MAINTENANCE_STAFF"].includes(user.role),
              ).length
            }
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-border/50 pt-4 text-[11px] text-muted-foreground">
          {Object.entries(ROLE_LABEL).map(([role, label]) => (
            <span key={role}>
              {label}: {users.filter((user) => user.role === role).length}
            </span>
          ))}
        </div>
      </section>
      <UserRoleManagement />
    </>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/55 p-4">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="label-mono">{label}</span>
        <span className="[&_svg]:size-4">{icon}</span>
      </div>
      <div className="mt-2 font-display text-3xl">{value}</div>
    </div>
  );
}
