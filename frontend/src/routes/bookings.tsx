import { createFileRoute } from "@tanstack/react-router";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookingForm } from "@/components/bookings/BookingForm";
import { MyBookingsList } from "@/components/bookings/MyBookingsList";
import { useAppStore } from "@/lib/app-store";

export const Route = createFileRoute("/bookings")({
  head: () => ({
    meta: [
      { title: "Bookings — OmniSpace" },
      {
        name: "description",
        content: "Create classroom or resource booking requests and track their approval status.",
      },
      { property: "og:title", content: "Bookings — OmniSpace" },
      {
        property: "og:description",
        content: "Request classrooms or resources and track approvals.",
      },
    ],
  }),
  component: BookingsPage,
});

function BookingsPage() {
  const { currentUser } = useAppStore();
  const lockTarget = currentUser.role === "STUDENT" ? "RESOURCE" : undefined;

  return (
    <>
      <section className="panel flex flex-wrap items-end justify-between gap-4 p-6">
        <div>
          <span className="label-mono">Booking desk</span>
          <h1 className="mt-2 font-display text-4xl">
            Create a <span className="text-primary">Booking</span>
          </h1>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            Classroom bookings use the six fixed slots (max two consecutive, never across the lunch
            break). Resources are freeform start/end times.
          </p>
        </div>
        <BookingForm
          lockTarget={lockTarget}
          trigger={
            <Button size="lg">
              <CalendarPlus className="size-4" />
              New booking
            </Button>
          }
        />
      </section>

      <MyBookingsList />
    </>
  );
}
