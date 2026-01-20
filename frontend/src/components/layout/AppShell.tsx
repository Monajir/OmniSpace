import { Link, useRouterState } from "@tanstack/react-router";
import {
  CalendarDays,
  LayoutGrid,
  ClipboardList,
  CheckCheck,
  Boxes,
  Hexagon,
  LogOut,
  ShieldAlert,
  RefreshCw,
  Building2,
  BookOpenCheck,
  UserRoundCog,
  UsersRound,
  Menu,
} from "lucide-react";
import { useAppStore } from "@/lib/app-store";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState, type ReactNode } from "react";
import type { UserRole } from "@/types";

const NAV = [
  {
    to: "/",
    label: "Dashboard",
    icon: CalendarDays,
    roles: ["STUDENT", "CR", "FACULTY", "RESOURCE_MANAGER", "MAINTENANCE_STAFF", "ADMIN"],
  },
  {
    to: "/calendar",
    label: "Rooms & Resources",
    icon: LayoutGrid,
    roles: ["STUDENT", "CR", "FACULTY", "RESOURCE_MANAGER", "MAINTENANCE_STAFF", "ADMIN"],
  },
  {
    to: "/bookings",
    label: "Bookings",
    icon: ClipboardList,
    roles: ["STUDENT", "CR", "FACULTY", "RESOURCE_MANAGER", "ADMIN"],
  },
  {
    to: "/approvals",
    label: "Approvals",
    icon: CheckCheck,
    roles: ["FACULTY", "RESOURCE_MANAGER", "ADMIN"],
  },
  {
    to: "/resources",
    label: "Resource Desk",
    icon: Boxes,
    roles: ["RESOURCE_MANAGER", "MAINTENANCE_STAFF", "ADMIN"],
  },
  {
    to: "/classrooms",
    label: "Classroom Admin",
    icon: Building2,
    roles: ["MAINTENANCE_STAFF", "ADMIN"],
  },
  {
    to: "/routines",
    label: "Routine Management",
    icon: BookOpenCheck,
    roles: ["FACULTY", "ADMIN"],
  },
  {
    to: "/issues",
    label: "Maintenance",
    icon: ShieldAlert,
    roles: ["RESOURCE_MANAGER", "MAINTENANCE_STAFF", "ADMIN"],
  },
  {
    to: "/profile",
    label: "Profile Settings",
    icon: UserRoundCog,
    roles: ["STUDENT", "CR", "FACULTY", "RESOURCE_MANAGER", "MAINTENANCE_STAFF", "ADMIN"],
  },
  {
    to: "/users",
    label: "User Roles",
    icon: UsersRound,
    roles: ["ADMIN"],
  },
] as const;

const ROLE_LABEL: Record<UserRole, string> = {
  STUDENT: "Student",
  CR: "Class Representative",
  FACULTY: "Faculty",
  RESOURCE_MANAGER: "Resource Manager",
  MAINTENANCE_STAFF: "Maintenance Staff",
  ADMIN: "Administrator",
};

// eslint-disable-next-line react-refresh/only-export-components
export function navigationForRole(role: UserRole, mustChangePassword = false) {
  return NAV.filter(
    (item) =>
      (item.roles as readonly string[]).includes(role) &&
      (!mustChangePassword || item.to === "/profile"),
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { currentUser, profile, logout, dataError, refreshData } = useAppStore();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const allowedNav = navigationForRole(currentUser.role, currentUser.mustChangePassword);
  const currentRoute = NAV.find((item) => item.to === pathname);
  const allowed =
    (!currentUser.mustChangePassword || pathname === "/profile") &&
    (!currentRoute || (currentRoute.roles as readonly string[]).includes(currentUser.role));

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1500px] gap-0 px-3 py-4 lg:px-6">
      <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-60 shrink-0 flex-col rounded-2xl border border-sidebar-border bg-sidebar/80 p-4 backdrop-blur lg:flex">
        <div className="flex items-center gap-2 px-2 py-1">
          <Hexagon className="size-5 text-primary" />
          <span className="font-display text-lg tracking-tight">OmniSpace</span>
        </div>
        <div className="mt-7 space-y-1">
          <div className="label-mono px-2 pb-2">Navigation</div>
          {allowedNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[status=active]:bg-primary/18 data-[status=active]:text-foreground"
            >
              <item.icon className="size-4" /> {item.label}
            </Link>
          ))}
        </div>
        <div className="mt-auto rounded-xl border border-sidebar-border bg-background/40 p-3">
          <div className="label-mono">Signed in as</div>
          <div className="mt-1 truncate text-sm font-medium">{currentUser.displayName}</div>
          <div className="truncate text-xs text-muted-foreground">
            {ROLE_LABEL[currentUser.role]}
          </div>
          <div className="mt-3 border-t border-sidebar-border pt-3">
            <button
              onClick={() => void logout()}
              className="flex w-full items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <LogOut className="size-3.5" /> Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1 lg:pl-6">
        <header className="flex items-center pb-6">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
                aria-label="Open navigation"
              >
                <Hexagon className="size-5 text-primary" />
                <span className="font-display text-lg">OmniSpace</span>
                <Menu className="ml-1 size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="flex w-[min(88vw,22rem)] flex-col border-sidebar-border bg-sidebar p-4"
            >
              <SheetHeader className="px-2 py-1 text-left">
                <SheetTitle className="flex items-center gap-2 font-display text-lg font-normal tracking-tight">
                  <Hexagon className="size-5 text-primary" />
                  OmniSpace
                </SheetTitle>
              </SheetHeader>

              <nav className="mt-7 min-h-0 flex-1 space-y-1 overflow-y-auto">
                <div className="label-mono px-2 pb-2">Navigation</div>
                {allowedNav.map((item) => (
                  <SheetClose key={item.to} asChild>
                    <Link
                      to={item.to}
                      activeOptions={{ exact: item.to === "/" }}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[status=active]:bg-primary/18 data-[status=active]:text-foreground"
                    >
                      <item.icon className="size-4" /> {item.label}
                    </Link>
                  </SheetClose>
                ))}
              </nav>

              <div className="mt-4 rounded-xl border border-sidebar-border bg-background/40 p-3">
                <div className="label-mono">Signed in as</div>
                <div className="mt-1 truncate text-sm font-medium">{currentUser.displayName}</div>
                <div className="truncate text-xs text-muted-foreground">{currentUser.email}</div>
                <div className="mt-1 truncate text-xs text-muted-foreground">
                  {profile?.department
                    ? `${ROLE_LABEL[currentUser.role]} · ${profile.department}`
                    : ROLE_LABEL[currentUser.role]}
                </div>
                <div className="mt-3 border-t border-sidebar-border pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileNavOpen(false);
                      void logout();
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <LogOut className="size-3.5" /> Sign out
                  </button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <div className="hidden lg:block">
            <span className="label-mono">Campus booking &amp; schedule</span>
          </div>
        </header>

        {dataError && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
            <span>{dataError}</span>
            <Button size="sm" variant="outline" onClick={() => void refreshData()}>
              <RefreshCw className="size-4" /> Try again
            </Button>
          </div>
        )}

        <main className="space-y-6 pb-16">
          {allowed ? (
            children
          ) : (
            <section className="panel flex min-h-[420px] flex-col items-center justify-center p-8 text-center">
              <ShieldAlert className="size-10 text-primary" />
              <h1 className="mt-5 font-display text-3xl">Access restricted</h1>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                {currentUser.mustChangePassword
                  ? "Change the temporary password before continuing to OmniSpace."
                  : `Your ${ROLE_LABEL[currentUser.role].toLowerCase()} account does not have access to this page.`}
              </p>
              <Button className="mt-6" asChild>
                <Link to={currentUser.mustChangePassword ? "/profile" : "/"}>
                  {currentUser.mustChangePassword ? "Change password" : "Return to dashboard"}
                </Link>
              </Button>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
