export type UserRole =
  "STUDENT" | "CR" | "FACULTY" | "RESOURCE_MANAGER" | "MAINTENANCE_STAFF" | "ADMIN";

export type ResourceStatus = "AVAILABLE" | "PENDING_INSPECTION" | "UNAVAILABLE" | "MAINTENANCE";
export type ClassroomStatus = "AVAILABLE" | "PENDING_INSPECTION" | "MAINTENANCE" | "RESERVED";
export type RoutineDayOfWeek =
  "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
export type BookingType = "ACADEMIC" | "RESOURCE" | "EVENT" | "EXAM";
export type BookingStatus =
  "PENDING_APPROVAL" | "CONFIRMED" | "REJECTED" | "CANCELLED" | "COMPLETED";
export type ClassroomTimeSlot = "SLOT_1" | "SLOT_2" | "SLOT_3" | "SLOT_4" | "SLOT_5" | "SLOT_6";
export type SlotStatus = "AVAILABLE" | "BOOKED";
export type IssueStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export interface User {
  id: number;
  email: string;
  displayName: string;
  role: UserRole;
  mustChangePassword: boolean;
  createdAt: string;
}

export interface Profile {
  id: number;
  userId: number;
  department: string | null;
  studentId: string | null;
  facultyId: string | null;
  designation: string | null;
  contactNumber: string | null;
  academicYear: string | null;
  program: string | null;
  batch: string | null;
  section: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Classroom {
  id: number;
  roomCode: string;
  name: string;
  building: string | null;
  floor: number | null;
  capacity: number | null;
  hasProjector: boolean;
  hasWhiteboard: boolean;
  isLab: boolean;
  departmentOwned: string | null;
  status: ClassroomStatus;
  createdAt: string;
}

export interface Resource {
  id: number;
  name: string;
  category: string | null;
  location: string | null;
  capacity: number | null;
  status: ResourceStatus;
  requiresApproval: boolean;
  managedByUserId: number | null;
  createdAt: string;
}

export interface Routine {
  id: number;
  classroomId: number;
  courseCode: string;
  courseName: string;
  facultyId: number;
  dayOfWeek: RoutineDayOfWeek;
  startTime: string;
  endTime: string;
  semester: string;
  academicYear: string;
  isRecurring: boolean;
  program: string | null;
  batch: string | null;
  section: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicTerm {
  id: number;
  academicYear: string;
  semester: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: number;
  resourceId: number | null;
  classroomId: number | null;
  userId: number;
  requesterDisplayName: string;
  startTime: string;
  endTime: string;
  purpose: string;
  bookingType: BookingType;
  status: BookingStatus;
  approvedBy: number | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  targetProgram: string | null;
  targetBatch: string | null;
  targetSection: string | null;
}

export interface ClassroomWeeklyAvailability {
  classroomId: number;
  weekStart: string;
  weekEnd: string;
  days: Array<{
    date: string;
    dayOfWeek: RoutineDayOfWeek;
    slots: Array<{
      slot: ClassroomTimeSlot;
      label: string;
      status: SlotStatus;
      source: "ROUTINE" | "BOOKING" | null;
      detail: string | null;
    }>;
  }>;
}

export interface ResourceAvailability {
  resourceId: number;
  from: string;
  to: string;
  busy: Array<{ start: string; end: string }>;
}

export interface Issue {
  id: number;
  resourceId: number | null;
  classroomId: number | null;
  reporterId: number;
  reporterDisplayName: string;
  description: string;
  status: IssueStatus;
  reviewedBy: number | null;
  reviewerDisplayName: string | null;
  reviewedAt: string | null;
  resolvedBy: number | null;
  resolverDisplayName: string | null;
  resolvedAt: string | null;
  createdAt: string;
}
