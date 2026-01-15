import { createFileRoute } from "@tanstack/react-router";
import { ApprovalQueue } from "@/components/approvals/ApprovalQueue";
import { ResourceManagement } from "@/components/resources/ResourceManagement";
import { useAppStore } from "@/lib/app-store";

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [
      { title: "Resource Desk — OmniSpace" },
      {
        name: "description",
        content:
          "Manage campus resource availability, maintenance status and incoming booking requests.",
      },
      { property: "og:title", content: "Resource Desk — OmniSpace" },
      {
        property: "og:description",
        content: "Manage resource status and approve resource booking requests.",
      },
    ],
  }),
  component: ResourcesPage,
});

function ResourcesPage() {
  const { currentUser, pendingBookings, resources } = useAppStore();
  const managed =
    currentUser.role === "RESOURCE_MANAGER"
      ? resources.filter((resource) => resource.managedByUserId === currentUser.id)
      : resources;
  const pending = pendingBookings.filter((booking) => booking.resourceId !== null);

  return (
    <>
      <section className="panel p-6">
        <span className="label-mono">Resource desk</span>
        <h1 className="mt-2 font-display text-4xl">
          Manage <span className="text-primary">Resources</span>
        </h1>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Stat label="Managed" value={String(managed.length)} />
          <Stat
            label="Available"
            value={String(managed.filter((r) => r.status === "AVAILABLE").length)}
          />
          <Stat label="Pending requests" value={String(pending.length)} />
        </div>
      </section>

      <ResourceManagement />

      {currentUser.role !== "MAINTENANCE_STAFF" && (
        <ApprovalQueue
          title="Resource requests"
          bookings={pending}
          emptyMessage="No pending approvals for your resources"
        />
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-4">
      <div className="label-mono">{label}</div>
      <div className="mt-1 font-display text-3xl">{value}</div>
    </div>
  );
}
