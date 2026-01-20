import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  Boxes,
  Building2,
  CalendarCheck2,
  CalendarClock,
  CalendarPlus,
  CheckCheck,
  CircleUserRound,
  ClipboardList,
  GraduationCap,
  ShieldCheck,
  UsersRound,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { BookingForm } from "@/components/bookings/BookingForm";
import { EmptyState } from "@/components/common/EmptyState";
import {
  ClassroomStatusBadge,
  IssueStatusBadge,
  ResourceStatusBadge,
  StatusBadge,
} from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { SchedulePanel } from "@/components/dashboard/SchedulePanel";
import { useAppStore } from "@/lib/app-store";
import { api } from "@/services/api";
import { formatDateTime } from "@/utils/weekHelpers";
import type { Booking, Issue, UserRole } from "@/types";

const ROLE_NAMES: Record<UserRole, string> = {
  STUDENT: "Student",
  CR: "Class Representative",
  FACULTY: "Faculty",
  RESOURCE_MANAGER: "Resource Manager",
  MAINTENANCE_STAFF: "Maintenance Staff",
  ADMIN: "Administrator",
};

export function RoleDashboard() {
  const { currentUser, resources } = useAppStore();
  const managedResources = useMemo(
    () => resources.filter((resource) => resource.managedByUserId === currentUser.id),
    [currentUser.id, resources],
  );
  const issueAccess = ["RESOURCE_MANAGER", "MAINTENANCE_STAFF", "ADMIN"].includes(currentUser.role);
  const issuesQuery = useQuery({
    queryKey: [
      "dashboard-issues",
      currentUser.role,
      managedResources.map((item) => item.id).join(","),
    ],
    enabled: issueAccess,
    queryFn: async () => {
      if (currentUser.role !== "RESOURCE_MANAGER") return api.getIssues();
      const groups = await Promise.all(
        managedResources.map((resource) => api.getIssues({ resourceId: resource.id })),
      );
      return groups.flat();
    },
  });
  const usersQuery = useQuery({
    queryKey: ["users"],
    enabled: currentUser.role === "ADMIN",
    queryFn: () => api.getUsers(),
  });
  const issues = issuesQuery.data ?? [];

  switch (currentUser.role) {
    case "STUDENT":
      return <StudentDashboard />;
    case "CR":
      return <CrDashboard />;
    case "FACULTY":
      return <FacultyDashboard />;
    case "RESOURCE_MANAGER":
      return <ResourceManagerDashboard managedResources={managedResources} issues={issues} />;
    case "MAINTENANCE_STAFF":
      return <MaintenanceDashboard issues={issues} />;
    case "ADMIN":
      return <AdminDashboard issues={issues} userCount={usersQuery.data?.length ?? 0} />;
  }
}

function StudentDashboard() {
  const { currentUser, profile, schedule, bookings } = useAppStore();
  const activeBookings = active(bookings);
  const todayEntries = entriesToday(schedule?.entries ?? []);
  const profileFields = [
    profile?.department,
    profile?.studentId,
    profile?.contactNumber,
    profile?.academicYear,
    profile?.program,
    profile?.batch,
    profile?.section,
  ];
  const profileCompletion = Math.round(
    (profileFields.filter((field) => Boolean(field)).length / profileFields.length) * 100,
  );

  return (
    <>
      <DashboardHeader
        role={currentUser.role}
        title={`Good day, ${firstName(currentUser.displayName)}`}
        description={`${profile?.program ?? "Complete your academic profile"}${profile?.batch ? ` · Batch ${profile.batch}` : ""}${profile?.section ? ` · Section ${profile.section}` : ""}`}
        action={
          <BookingForm
            lockTarget="RESOURCE"
            trigger={
              <Button>
                <CalendarPlus className="size-4" /> Book a resource
              </Button>
            }
          />
        }
      />
      <StatsGrid>
        <DashboardStat label="Classes today" value={todayEntries.length} icon={GraduationCap} />
        <DashboardStat
          label="Weekly sessions"
          value={schedule?.entries.length ?? 0}
          icon={CalendarClock}
        />
        <DashboardStat
          label="Active bookings"
          value={activeBookings.length}
          icon={CalendarCheck2}
        />
        <DashboardStat
          label="Profile complete"
          value={`${profileCompletion}%`}
          icon={CircleUserRound}
        />
      </StatsGrid>
      <SchedulePanel />
      <div className="grid gap-6 lg:grid-cols-2">
        <CompactBookings title="My upcoming resource bookings" bookings={activeBookings} />
        <QuickLinks
          title="Student essentials"
          links={[
            { to: "/calendar", label: "Explore rooms and resources", icon: CalendarClock },
            { to: "/bookings", label: "Manage my bookings", icon: ClipboardList },
            { to: "/profile", label: "Complete academic profile", icon: CircleUserRound },
          ]}
        />
      </div>
    </>
  );
}

function CrDashboard() {
  const { currentUser, profile, schedule, bookings } = useAppStore();
  const pending = bookings.filter((booking) => booking.status === "PENDING_APPROVAL");
  const confirmed = active(bookings).filter((booking) => booking.status === "CONFIRMED");
  return (
    <>
      <DashboardHeader
        role={currentUser.role}
        title={`${profile?.program ?? "Cohort"} command desk`}
        description={`Representing Batch ${profile?.batch ?? "—"} · Section ${profile?.section ?? "—"}${profile?.department ? ` · ${profile.department}` : ""}`}
        action={
          <BookingForm
            lockTarget="CLASSROOM"
            trigger={
              <Button>
                <CalendarPlus className="size-4" /> Book for my section
              </Button>
            }
          />
        }
      />
      <StatsGrid>
        <DashboardStat
          label="Weekly sessions"
          value={schedule?.entries.length ?? 0}
          icon={GraduationCap}
        />
        <DashboardStat
          label="Pending requests"
          value={pending.length}
          icon={CalendarClock}
          tone="pending"
        />
        <DashboardStat
          label="Confirmed bookings"
          value={confirmed.length}
          icon={CheckCheck}
          tone="success"
        />
        <DashboardStat label="Cohort section" value={profile?.section ?? "—"} icon={UsersRound} />
      </StatsGrid>
      <SchedulePanel />
      <div className="grid gap-6 lg:grid-cols-2">
        <CompactBookings title="My section requests" bookings={[...pending, ...confirmed]} />
        <QuickLinks
          title="Class representative tools"
          links={[
            { to: "/bookings", label: "Review all booking requests", icon: ClipboardList },
            { to: "/calendar", label: "Check classroom availability", icon: CalendarClock },
            { to: "/profile", label: "Verify cohort details", icon: CircleUserRound },
          ]}
        />
      </div>
    </>
  );
}

function FacultyDashboard() {
  const { currentUser, profile, routines, bookings, pendingBookings, classrooms } = useAppStore();
  const teaching = routines.filter((routine) => routine.facultyId === currentUser.id);
  const departmentRooms = classrooms.filter(
    (room) => profile?.department && room.departmentOwned === profile.department,
  );
  return (
    <>
      <DashboardHeader
        role={currentUser.role}
        title="Teaching & approvals"
        description={`${profile?.designation ?? "Faculty member"}${profile?.department ? ` · ${profile.department}` : ""}`}
        action={
          <BookingForm
            trigger={
              <Button>
                <CalendarPlus className="size-4" /> New booking
              </Button>
            }
          />
        }
      />
      <StatsGrid>
        <DashboardStat label="Teaching sessions" value={teaching.length} icon={BookOpenCheck} />
        <DashboardStat
          label="Awaiting approval"
          value={pendingBookings.length}
          icon={CalendarClock}
          tone="pending"
        />
        <DashboardStat
          label="My active bookings"
          value={active(bookings).length}
          icon={CalendarCheck2}
        />
        <DashboardStat label="Department rooms" value={departmentRooms.length} icon={Building2} />
      </StatsGrid>
      <SchedulePanel />
      <div className="grid gap-6 lg:grid-cols-2">
        <CompactBookings
          title="Department approval queue"
          bookings={pendingBookings}
          viewTo="/approvals"
        />
        <QuickLinks
          title="Faculty workspace"
          links={[
            { to: "/approvals", label: "Review classroom requests", icon: CheckCheck },
            { to: "/routines", label: "Manage academic routines", icon: BookOpenCheck },
            { to: "/calendar", label: "Check room availability", icon: CalendarClock },
          ]}
        />
      </div>
    </>
  );
}

function ResourceManagerDashboard({
  managedResources,
  issues,
}: {
  managedResources: ReturnType<typeof useAppStore>["resources"];
  issues: Issue[];
}) {
  const { currentUser, pendingBookings } = useAppStore();
  const healthy = managedResources.filter((resource) => resource.status === "AVAILABLE");
  const openIssues = issues.filter(
    (issue) => issue.status === "OPEN" || issue.status === "IN_PROGRESS",
  );
  return (
    <>
      <DashboardHeader
        role={currentUser.role}
        title="Resource operations"
        description="Monitor assigned assets, booking approvals and reported faults."
        action={
          <BookingForm
            trigger={
              <Button>
                <CalendarPlus className="size-4" /> New booking
              </Button>
            }
          />
        }
      />
      <StatsGrid>
        <DashboardStat label="Managed resources" value={managedResources.length} icon={Boxes} />
        <DashboardStat
          label="Available now"
          value={healthy.length}
          icon={ShieldCheck}
          tone="success"
        />
        <DashboardStat
          label="Pending approvals"
          value={pendingBookings.length}
          icon={CalendarClock}
          tone="pending"
        />
        <DashboardStat
          label="Active issues"
          value={openIssues.length}
          icon={AlertTriangle}
          tone="danger"
        />
      </StatsGrid>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <AssetPanel title="Assigned resource health">
          {managedResources.length === 0 ? (
            <EmptyState
              message="No resources are assigned to this account"
              icon={<Boxes className="size-6" />}
            />
          ) : (
            managedResources.map((resource) => (
              <AssetRow
                key={resource.id}
                label={resource.name}
                meta={resource.location ?? resource.category ?? "Campus resource"}
                badge={<ResourceStatusBadge status={resource.status} />}
              />
            ))
          )}
        </AssetPanel>
        <CompactBookings
          title="Resource approval queue"
          bookings={pendingBookings}
          viewTo="/approvals"
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <CompactIssues title="Issues on managed resources" issues={openIssues} />
        <QuickLinks
          title="Operations shortcuts"
          links={[
            { to: "/approvals", label: "Process booking approvals", icon: CheckCheck },
            { to: "/resources", label: "Manage resource inventory", icon: Boxes },
            { to: "/issues", label: "Review reported issues", icon: Wrench },
          ]}
        />
      </div>
    </>
  );
}

function MaintenanceDashboard({ issues }: { issues: Issue[] }) {
  const { currentUser, resources, classrooms } = useAppStore();
  const activeIssues = issues.filter(
    (issue) => issue.status === "OPEN" || issue.status === "IN_PROGRESS",
  );
  const roomsDown = classrooms.filter((room) => room.status !== "AVAILABLE");
  const resourcesDown = resources.filter((resource) => resource.status !== "AVAILABLE");
  return (
    <>
      <DashboardHeader
        role={currentUser.role}
        title="Maintenance control room"
        description="Prioritize active faults and return campus spaces and equipment to service."
        action={
          <Button asChild>
            <Link to="/issues">
              <Wrench className="size-4" /> Open work queue
            </Link>
          </Button>
        }
      />
      <StatsGrid>
        <DashboardStat
          label="Open work orders"
          value={issues.filter((issue) => issue.status === "OPEN").length}
          icon={AlertTriangle}
          tone="danger"
        />
        <DashboardStat
          label="In progress"
          value={issues.filter((issue) => issue.status === "IN_PROGRESS").length}
          icon={Wrench}
          tone="pending"
        />
        <DashboardStat label="Rooms offline" value={roomsDown.length} icon={Building2} />
        <DashboardStat label="Resources offline" value={resourcesDown.length} icon={Boxes} />
      </StatsGrid>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <CompactIssues title="Priority work queue" issues={activeIssues} />
        <AssetPanel title="Assets requiring attention">
          {roomsDown.length === 0 && resourcesDown.length === 0 ? (
            <EmptyState
              message="All tracked assets are operational"
              icon={<ShieldCheck className="size-6" />}
            />
          ) : (
            <>
              {roomsDown.map((room) => (
                <AssetRow
                  key={`room-${room.id}`}
                  label={`${room.roomCode} · ${room.name}`}
                  meta={room.building ?? "Classroom"}
                  badge={<ClassroomStatusBadge status={room.status} />}
                />
              ))}
              {resourcesDown.map((resource) => (
                <AssetRow
                  key={`resource-${resource.id}`}
                  label={resource.name}
                  meta={resource.location ?? "Resource"}
                  badge={<ResourceStatusBadge status={resource.status} />}
                />
              ))}
            </>
          )}
        </AssetPanel>
      </div>
      <QuickLinks
        title="Maintenance workspace"
        links={[
          { to: "/issues", label: "Resolve issue reports", icon: Wrench },
          { to: "/classrooms", label: "Update classroom status", icon: Building2 },
          { to: "/resources", label: "Update resource status", icon: Boxes },
        ]}
      />
    </>
  );
}

function AdminDashboard({ issues, userCount }: { issues: Issue[]; userCount: number }) {
  const { currentUser, classrooms, resources, routines, visibleBookings, pendingBookings } =
    useAppStore();
  const activeIssues = issues.filter(
    (issue) => issue.status === "OPEN" || issue.status === "IN_PROGRESS",
  );
  const operationalAssets =
    classrooms.filter((room) => room.status === "AVAILABLE").length +
    resources.filter((resource) => resource.status === "AVAILABLE").length;
  return (
    <>
      <DashboardHeader
        role={currentUser.role}
        title="Campus command center"
        description="A live overview of people, spaces, schedules and operational queues."
        action={
          <BookingForm
            trigger={
              <Button>
                <CalendarPlus className="size-4" /> Create booking
              </Button>
            }
          />
        }
      />
      <StatsGrid>
        <DashboardStat label="Registered users" value={userCount} icon={UsersRound} />
        <DashboardStat
          label="Operational assets"
          value={operationalAssets}
          icon={ShieldCheck}
          tone="success"
        />
        <DashboardStat
          label="Pending approvals"
          value={pendingBookings.length}
          icon={CalendarClock}
          tone="pending"
        />
        <DashboardStat
          label="Active issues"
          value={activeIssues.length}
          icon={AlertTriangle}
          tone="danger"
        />
      </StatsGrid>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <CompactBookings
          title="Campus approval queue"
          bookings={pendingBookings}
          viewTo="/approvals"
        />
        <CompactIssues title="Operational attention" issues={activeIssues} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel p-5">
          <span className="label-mono">Campus footprint</span>
          <h2 className="mt-1 font-display text-xl">System inventory</h2>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <InventoryCount label="Classrooms" value={classrooms.length} />
            <InventoryCount label="Resources" value={resources.length} />
            <InventoryCount label="Routines" value={routines.length} />
            <InventoryCount label="Bookings" value={visibleBookings.length} />
          </div>
        </section>
        <QuickLinks
          title="Administration"
          links={[
            { to: "/users", label: "Manage user roles", icon: UsersRound },
            { to: "/classrooms", label: "Administer classrooms", icon: Building2 },
            { to: "/resources", label: "Administer resources", icon: Boxes },
            { to: "/routines", label: "Manage academic routines", icon: BookOpenCheck },
          ]}
        />
      </div>
    </>
  );
}

function DashboardHeader({
  role,
  title,
  description,
  action,
}: {
  role: UserRole;
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <section className="panel overflow-hidden p-6">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <span className="label-mono">{ROLE_NAMES[role]} dashboard</span>
          <h1 className="mt-2 font-display text-4xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
      </div>
    </section>
  );
}

function StatsGrid({ children }: { children: React.ReactNode }) {
  return <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</section>;
}

function DashboardStat({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "default" | "success" | "pending" | "danger";
}) {
  const tones = {
    default: "text-primary",
    success: "text-routine",
    pending: "text-pending",
    danger: "text-rejected",
  };
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <span className="label-mono">{label}</span>
        <Icon className={`size-5 ${tones[tone]}`} />
      </div>
      <div className="mt-3 font-display text-3xl">{value}</div>
    </div>
  );
}

function CompactBookings({
  title,
  bookings,
  viewTo = "/bookings",
}: {
  title: string;
  bookings: Booking[];
  viewTo?: "/bookings" | "/approvals";
}) {
  const { classrooms, resources } = useAppStore();
  const shown = [...bookings].sort((a, b) => a.startTime.localeCompare(b.startTime)).slice(0, 4);
  return (
    <section className="panel p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl">{title}</h2>
        <Button asChild variant="ghost" size="sm">
          <Link to={viewTo}>
            View all <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
      <div className="mt-4 space-y-2">
        {shown.length === 0 ? (
          <EmptyState message="Nothing waiting here" icon={<CalendarCheck2 className="size-6" />} />
        ) : (
          shown.map((booking) => {
            const place = booking.classroomId
              ? classrooms.find((room) => room.id === booking.classroomId)?.roomCode
              : resources.find((resource) => resource.id === booking.resourceId)?.name;
            return (
              <div
                key={booking.id}
                className="rounded-lg border border-border/60 bg-card/50 px-3 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{booking.purpose}</span>
                  <StatusBadge status={booking.status} />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {place ?? "Campus booking"} · {formatDateTime(booking.startTime)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function CompactIssues({ title, issues }: { title: string; issues: Issue[] }) {
  const { classrooms, resources } = useAppStore();
  const shown = issues.slice(0, 4);
  return (
    <section className="panel p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl">{title}</h2>
        <Button asChild variant="ghost" size="sm">
          <Link to="/issues">
            View queue <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
      <div className="mt-4 space-y-2">
        {shown.length === 0 ? (
          <EmptyState message="No active issues" icon={<ShieldCheck className="size-6" />} />
        ) : (
          shown.map((issue) => {
            const target = issue.resourceId
              ? resources.find((resource) => resource.id === issue.resourceId)?.name
              : classrooms.find((room) => room.id === issue.classroomId)?.roomCode;
            return (
              <div
                key={issue.id}
                className="rounded-lg border border-border/60 bg-card/50 px-3 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">
                    {target ?? `Issue #${issue.id}`}
                  </span>
                  <IssueStatusBadge status={issue.status} />
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {issue.description}
                </p>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function QuickLinks({
  title,
  links,
}: {
  title: string;
  links: Array<{ to: string; label: string; icon: LucideIcon }>;
}) {
  return (
    <section className="panel p-5">
      <h2 className="font-display text-xl">{title}</h2>
      <div className="mt-4 grid gap-2">
        {links.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center justify-between rounded-lg border border-border/60 bg-card/45 px-4 py-3 text-sm transition-colors hover:border-primary/50 hover:bg-primary/5"
          >
            <span className="flex items-center gap-3">
              <Icon className="size-4 text-primary" /> {label}
            </span>
            <ArrowRight className="size-4 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function AssetPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel p-5">
      <h2 className="font-display text-xl">{title}</h2>
      <div className="mt-4 space-y-2">{children}</div>
    </section>
  );
}

function AssetRow({ label, meta, badge }: { label: string; meta: string; badge: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/50 px-3 py-3">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{label}</div>
        <div className="truncate text-xs text-muted-foreground">{meta}</div>
      </div>
      {badge}
    </div>
  );
}

function InventoryCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/45 p-4">
      <div className="font-display text-2xl">{value}</div>
      <div className="mt-1 label-mono">{label}</div>
    </div>
  );
}

function active(bookings: Booking[]) {
  const now = Date.now();
  return bookings.filter(
    (booking) =>
      ["PENDING_APPROVAL", "CONFIRMED"].includes(booking.status) &&
      new Date(booking.endTime).getTime() >= now,
  );
}

function entriesToday(
  entries: Array<{ type: "ROUTINE" | "BOOKING"; dayOfWeek: string; date: string | null }>,
) {
  const now = new Date();
  const day = now.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }).toUpperCase();
  const date = now.toISOString().slice(0, 10);
  return entries.filter((entry) =>
    entry.type === "ROUTINE" ? entry.dayOfWeek === day : entry.date === date,
  );
}

function firstName(displayName: string) {
  return displayName.trim().split(/\s+/)[0] || "there";
}
