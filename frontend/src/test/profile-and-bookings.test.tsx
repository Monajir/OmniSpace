import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApprovalQueue } from "@/components/approvals/ApprovalQueue";
import { MyBookingsList } from "@/components/bookings/MyBookingsList";
import { ProfileDetailsForm } from "@/components/profile/ProfileDetailsForm";
import type { Booking } from "@/types";

let store: Record<string, unknown>;
vi.mock("@/lib/app-store", () => ({ useAppStore: () => store }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const rejected: Booking = {
  id: 14,
  resourceId: 3,
  classroomId: null,
  userId: 1,
  requesterDisplayName: "Leo",
  startTime: "2026-09-01T08:00:00Z",
  endTime: "2026-09-01T09:00:00Z",
  purpose: "Project presentation",
  bookingType: "RESOURCE",
  status: "REJECTED",
  approvedBy: 2,
  approvedAt: "2026-08-27T10:00:00Z",
  rejectionReason: "Projector is under maintenance.",
  createdAt: "2026-08-27T09:00:00Z",
  targetProgram: null,
  targetBatch: null,
  targetSection: null,
};

const pending: Booking = { ...rejected, status: "PENDING_APPROVAL", rejectionReason: null };

function withQueryClient(ui: React.ReactNode) {
  return render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  store = {
    currentUser: {
      id: 1,
      email: "leo@example.com",
      displayName: "Leo",
      role: "CR",
      mustChangePassword: false,
    },
    profile: {
      department: "CSE",
      studentId: "CSE-25-001",
      facultyId: null,
      designation: null,
      contactNumber: "01700000000",
      academicYear: "2025-2026",
      program: "BSc CSE",
      batch: "2025",
      section: "A",
    },
    bookings: [],
    resources: [{ id: 3, name: "Projector" }],
    classrooms: [],
    updateProfile: vi.fn(),
    approveBooking: vi.fn(),
    rejectBooking: vi.fn().mockResolvedValue(undefined),
  };
});

describe("trusted profile and booking feedback", () => {
  it("renders academic assignments read-only while contact remains editable", () => {
    render(<ProfileDetailsForm />);

    expect(screen.getByDisplayValue("CSE")).toBeDisabled();
    expect(screen.getByDisplayValue("BSc CSE")).toBeDisabled();
    expect(screen.getByDisplayValue("2025")).toBeDisabled();
    expect(screen.getByDisplayValue("01700000000")).toBeEnabled();
  });

  it("shows a persisted rejection reason in booking history", () => {
    store["bookings"] = [rejected];
    withQueryClient(<MyBookingsList />);

    fireEvent.click(screen.getByRole("button", { name: "History" }));
    expect(screen.getByText("Projector is under maintenance.")).toBeVisible();
  });

  it("requires a rejection reason and sends the trimmed explanation", async () => {
    const user = userEvent.setup();
    withQueryClient(
      <ApprovalQueue bookings={[pending]} emptyMessage="No requests" title="Approvals" />,
    );

    await user.click(screen.getByRole("button", { name: "Reject" }));
    const submit = screen.getByRole("button", { name: "Reject request" });
    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText("Rejection reason"), "  Room reserved for exams.  ");
    await user.click(submit);

    expect(store["rejectBooking"]).toHaveBeenCalledWith(14, "Room reserved for exams.");
  });
});
