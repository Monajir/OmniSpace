import { createFileRoute } from "@tanstack/react-router";
import { ApprovalQueue } from "@/components/approvals/ApprovalQueue";
import { useAppStore } from "@/lib/app-store";

export const Route = createFileRoute("/approvals")({
  head: () => ({
    meta: [
      { title: "Approvals — OmniSpace" },
      {
        name: "description",
        content:
          "Review and approve pending classroom and resource booking requests for your department.",
      },
      { property: "og:title", content: "Approvals — OmniSpace" },
      {
        property: "og:description",
        content: "Approve or reject pending booking requests.",
      },
    ],
  }),
  component: ApprovalsPage,
});

function ApprovalsPage() {
  const { currentUser, profile, pendingBookings } = useAppStore();
  const isFaculty = currentUser.role === "FACULTY";
  const isAdmin = currentUser.role === "ADMIN";

  return (
    <>
      <section className="panel p-6">
        <span className="label-mono">Approval queue</span>
        <h1 className="mt-2 font-display text-4xl">
          Pending <span className="text-primary">Requests</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isFaculty
            ? `Classroom requests for rooms owned by ${profile?.department ?? "your department"}.`
            : isAdmin
              ? "All pending requests across campus."
              : "Requests on the resources you manage."}
        </p>
      </section>

      <ApprovalQueue
        title={
          isFaculty
            ? "Department classroom requests"
            : isAdmin
              ? "Campus requests"
              : "Resource requests"
        }
        bookings={pendingBookings}
        emptyMessage={
          isFaculty ? "No pending approvals right now" : "No pending approvals for your resources"
        }
      />
    </>
  );
}
