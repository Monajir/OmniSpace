import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, ShieldCheck, UserRoundSearch } from "lucide-react";
import { ChangeUserRoleDialog } from "@/components/users/ChangeUserRoleDialog";
import { EditAcademicProfileDialog } from "@/components/users/EditAcademicProfileDialog";
import { ROLE_LABEL, UserRoleBadge } from "@/components/users/UserRoleBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/lib/app-store";
import { api } from "@/services/api";
import type { User, UserRole } from "@/types";

const ROLES: UserRole[] = [
  "STUDENT",
  "CR",
  "FACULTY",
  "RESOURCE_MANAGER",
  "MAINTENANCE_STAFF",
  "ADMIN",
];
type RoleFilter = "ALL" | UserRole;

export function UserRoleManagement() {
  const { currentUser } = useAppStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<RoleFilter>("ALL");
  const usersQuery = useQuery({ queryKey: ["users"], queryFn: () => api.getUsers() });
  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return users.filter((user) => {
      if (role !== "ALL" && user.role !== role) return false;
      return !needle || `${user.displayName} ${user.email}`.toLowerCase().includes(needle);
    });
  }, [role, search, users]);

  function updateUser(updated: User) {
    queryClient.setQueryData<User[]>(["users"], (current = []) =>
      current.map((user) => (user.id === updated.id ? updated : user)),
    );
  }

  return (
    <section className="panel p-5">
      <div>
        <h2 className="font-display text-lg">User access directory</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Assign one campus role to each account. Changes are enforced by the backend immediately.
        </p>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_230px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or email…"
          />
        </div>
        <Select value={role} onValueChange={(value) => setRole(value as RoleFilter)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All roles</SelectItem>
            {ROLES.map((item) => (
              <SelectItem key={item} value={item}>
                {ROLE_LABEL[item]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="mt-4">
        <span className="label-mono">{filtered.length} shown</span>
      </div>
      <div className="mt-3 space-y-3">
        {usersQuery.isLoading ? (
          <EmptyState
            message="Loading user accounts…"
            icon={<UserRoundSearch className="size-6" />}
          />
        ) : usersQuery.isError ? (
          <EmptyState
            message={
              usersQuery.error instanceof Error ? usersQuery.error.message : "Unable to load users"
            }
            icon={<UserRoundSearch className="size-6" />}
            action={
              <Button size="sm" variant="outline" onClick={() => void usersQuery.refetch()}>
                Try again
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            message="No users match these filters"
            icon={<UserRoundSearch className="size-6" />}
          />
        ) : (
          filtered.map((user) => {
            const isCurrent = user.id === currentUser.id;
            return (
              <article
                key={user.id}
                className="flex flex-wrap items-center gap-4 rounded-xl border border-border/60 bg-card/60 p-4"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/10 font-display text-sm text-primary">
                  {initials(user.displayName)}
                </div>
                <div className="min-w-48 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{user.displayName}</h3>
                    {isCurrent && <span className="label-mono">You</span>}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</div>
                </div>
                <div className="min-w-36">
                  <UserRoleBadge role={user.role} />
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    Joined {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex min-w-44 flex-wrap justify-end gap-2 text-right">
                  <EditAcademicProfileDialog user={user} />
                  {isCurrent ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <ShieldCheck className="size-4 text-primary" />
                      Current session
                    </span>
                  ) : (
                    <ChangeUserRoleDialog user={user} onChanged={updateUser} />
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "OS"
  );
}
