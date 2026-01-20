import { createFileRoute } from "@tanstack/react-router";
import { RoleDashboard } from "@/components/dashboard/RoleDashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — OmniSpace" },
      {
        name: "description",
        content: "A role-specific overview of schedules, bookings and campus operations.",
      },
    ],
  }),
  component: RoleDashboard,
});
