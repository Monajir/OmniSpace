import type {
  AcademicTerm,
  Booking,
  BookingType,
  Classroom,
  ClassroomWeeklyAvailability,
  Issue,
  IssueStatus,
  Profile,
  Resource,
  ResourceAvailability,
  Routine,
  User,
} from "@/types";

const API_BASE = (import.meta.env["VITE_API_URL"] ?? "http://localhost:8081").replace(/\/$/, "");
let accessToken: string | null = null;
let refreshPromise: Promise<AuthResponse | null> | null = null;

export interface AuthResponse {
  accessToken: string;
  expiresInSeconds: number;
  user: Pick<User, "id" | "email" | "displayName" | "role" | "mustChangePassword">;
}

export interface ApiErrorBody {
  message?: string;
  fieldErrors?: Array<{ field: string; message: string }>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: ApiErrorBody,
  ) {
    super(message);
  }
}

async function parseError(response: Response): Promise<ApiError> {
  let body: ApiErrorBody | undefined;
  try {
    body = (await response.json()) as ApiErrorBody;
  } catch {
    /* use fallback */
  }
  const fieldMessage = body?.fieldErrors?.map((e) => e.message).join(" · ");
  return new ApiError(
    fieldMessage || body?.message || `Request failed (${response.status})`,
    response.status,
    body,
  );
}

async function rawRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: "include" });
  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

async function refreshSession(): Promise<AuthResponse | null> {
  if (!refreshPromise) {
    refreshPromise = refreshWithConcurrentRetry()
      .then((auth) => {
        accessToken = auth.accessToken;
        return auth;
      })
      .catch(() => {
        accessToken = null;
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function refreshWithConcurrentRetry(): Promise<AuthResponse> {
  try {
    return await rawRequest<AuthResponse>("/api/auth/refresh", { method: "POST" });
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 409) throw error;
    await new Promise((resolve) => setTimeout(resolve, 150));
    return rawRequest<AuthResponse>("/api/auth/refresh", { method: "POST" });
  }
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  try {
    return await rawRequest<T>(path, init);
  } catch (error) {
    if (
      retry &&
      error instanceof ApiError &&
      error.status === 401 &&
      !path.startsWith("/api/auth/")
    ) {
      const session = await refreshSession();
      if (session) return request<T>(path, init, false);
    }
    throw error;
  }
}

function authRequest(path: string, body: unknown): Promise<AuthResponse> {
  return rawRequest<AuthResponse>(path, { method: "POST", body: JSON.stringify(body) }).then(
    (auth) => {
      accessToken = auth.accessToken;
      return auth;
    },
  );
}

export const api = {
  restoreSession: refreshSession,
  login: (email: string, password: string) => authRequest("/api/auth/login", { email, password }),
  register: (displayName: string, email: string, password: string) =>
    authRequest("/api/auth/register", { displayName, email, password }),
  logout: async () => {
    try {
      await rawRequest<void>("/api/auth/logout", { method: "POST" });
    } finally {
      accessToken = null;
    }
  },
  getMe: () => request<User>("/api/users/me"),
  updateMe: (displayName: string) =>
    request<User>("/api/users/me", {
      method: "PUT",
      body: JSON.stringify({ displayName }),
    }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<void>("/api/users/me/password", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  getUsers: (role?: User["role"]) =>
    request<User[]>(`/api/users${role ? `?role=${encodeURIComponent(role)}` : ""}`),
  changeUserRole: (id: number, role: User["role"]) =>
    request<User>(`/api/users/${id}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),
  getProfile: (userId: number) => request<Profile>(`/api/users/${userId}/profile`),
  updateMyProfile: (data: UpdateMyProfileRequest) =>
    request<Profile>("/api/users/me/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  updateAcademicProfile: (userId: number, data: AdminUpdateAcademicProfileRequest) =>
    request<Profile>(`/api/users/${userId}/profile/academic`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  getClassrooms: () => request<Classroom[]>("/api/classrooms"),
  getClassroom: (id: number) => request<Classroom>(`/api/classrooms/${id}`),
  createClassroom: (data: CreateClassroomRequest) =>
    request<Classroom>("/api/classrooms", { method: "POST", body: JSON.stringify(data) }),
  updateClassroom: (id: number, data: UpdateClassroomRequest) =>
    request<Classroom>(`/api/classrooms/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteClassroom: (id: number) => request<void>(`/api/classrooms/${id}`, { method: "DELETE" }),
  updateClassroomStatus: (id: number, status: Classroom["status"]) =>
    request<Classroom>(`/api/classrooms/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  getClassroomAvailability: (id: number, weekStart: string) =>
    request<ClassroomWeeklyAvailability>(
      `/api/classrooms/${id}/availability?weekStart=${encodeURIComponent(weekStart)}`,
    ),
  getResources: () => request<Resource[]>("/api/resources"),
  getResource: (id: number) => request<Resource>(`/api/resources/${id}`),
  getResourceAvailability: (id: number, from: string, to: string) =>
    request<ResourceAvailability>(
      `/api/resources/${id}/availability?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    ),
  createResource: (data: ResourceWriteRequest) =>
    request<Resource>("/api/resources", { method: "POST", body: JSON.stringify(data) }),
  updateResource: (id: number, data: ResourceWriteRequest) =>
    request<Resource>(`/api/resources/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteResource: (id: number) => request<void>(`/api/resources/${id}`, { method: "DELETE" }),
  getRoutines: (query = "") => request<Routine[]>(`/api/routines${query}`),
  getAcademicTerms: () => request<AcademicTerm[]>("/api/academic-terms"),
  createAcademicTerm: (data: AcademicTermWriteRequest) =>
    request<AcademicTerm>("/api/academic-terms", { method: "POST", body: JSON.stringify(data) }),
  updateAcademicTerm: (id: number, data: AcademicTermWriteRequest) =>
    request<AcademicTerm>(`/api/academic-terms/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteAcademicTerm: (id: number) =>
    request<void>(`/api/academic-terms/${id}`, { method: "DELETE" }),
  getRoutine: (id: number) => request<Routine>(`/api/routines/${id}`),
  createRoutine: (data: RoutineWriteRequest) =>
    request<Routine>("/api/routines", { method: "POST", body: JSON.stringify(data) }),
  updateRoutine: (id: number, data: RoutineWriteRequest) =>
    request<Routine>(`/api/routines/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteRoutine: (id: number) => request<void>(`/api/routines/${id}`, { method: "DELETE" }),
  getMySchedule: () => request<PersonalSchedule>("/api/routines/mine"),
  getMyBookings: () => request<Booking[]>("/api/bookings/mine"),
  getBookings: (query = "") => request<Booking[]>(`/api/bookings${query}`),
  getPendingBookings: () => request<Booking[]>("/api/bookings/pending"),
  createBooking: (data: CreateBookingRequest) =>
    request<Booking>("/api/bookings", { method: "POST", body: JSON.stringify(data) }),
  cancelBooking: (id: number) => request<void>(`/api/bookings/${id}`, { method: "DELETE" }),
  approveBooking: (id: number) =>
    request<Booking>(`/api/bookings/${id}/approve`, { method: "PATCH" }),
  rejectBooking: (id: number, reason: string) =>
    request<Booking>(`/api/bookings/${id}/reject`, {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    }),
  updateResourceStatus: (id: number, status: Resource["status"]) =>
    request<Resource>(`/api/resources/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  getIssues: (
    filters: { resourceId?: number; classroomId?: number; status?: IssueStatus } = {},
  ) => {
    const params = new URLSearchParams();
    if (filters.resourceId !== undefined) params.set("resourceId", String(filters.resourceId));
    if (filters.classroomId !== undefined) params.set("classroomId", String(filters.classroomId));
    if (filters.status !== undefined) params.set("status", filters.status);
    const query = params.size > 0 ? `?${params.toString()}` : "";
    return request<Issue[]>(`/api/issues${query}`);
  },
  reportResourceIssue: (resourceId: number, description: string) =>
    request<Issue>(`/api/resources/${resourceId}/issues`, {
      method: "POST",
      body: JSON.stringify({ description }),
    }),
  reportClassroomIssue: (classroomId: number, description: string) =>
    request<Issue>(`/api/classrooms/${classroomId}/issues`, {
      method: "POST",
      body: JSON.stringify({ description }),
    }),
  resolveIssue: (id: number) => request<Issue>(`/api/issues/${id}/resolve`, { method: "PATCH" }),
  confirmIssue: (id: number) => request<Issue>(`/api/issues/${id}/confirm`, { method: "PATCH" }),
  dismissIssue: (id: number) => request<Issue>(`/api/issues/${id}/dismiss`, { method: "PATCH" }),
};

export interface CreateBookingRequest {
  resourceId: number | null;
  classroomId: number | null;
  startTime: string;
  endTime: string;
  purpose: string;
  bookingType: BookingType;
  targetProgram: string | null;
  targetBatch: string | null;
  targetSection: string | null;
}

export interface ResourceWriteRequest {
  name: string;
  category: string | null;
  location: string | null;
  capacity: number | null;
  requiresApproval: boolean;
  managedByUserId: number | null;
}

export interface CreateClassroomRequest {
  roomCode: string;
  name: string;
  building: string | null;
  floor: number | null;
  capacity: number | null;
  hasProjector: boolean;
  hasWhiteboard: boolean;
  isLab: boolean;
  departmentOwned: string | null;
}

export type UpdateClassroomRequest = Omit<CreateClassroomRequest, "roomCode">;

export interface UpdateMyProfileRequest {
  contactNumber: string | null;
}

export interface AdminUpdateAcademicProfileRequest {
  department: string | null;
  studentId: string | null;
  facultyId: string | null;
  designation: string | null;
  academicYear: string | null;
  program: string | null;
  batch: string | null;
  section: string | null;
}

export interface RoutineWriteRequest {
  classroomId: number;
  courseCode: string;
  courseName: string;
  facultyId: number | null;
  dayOfWeek: Routine["dayOfWeek"];
  startTime: string;
  endTime: string;
  semester: string;
  academicYear: string;
  program: string | null;
  batch: string | null;
  section: string | null;
  isRecurring: boolean;
}

export interface AcademicTermWriteRequest {
  academicYear: string;
  semester: string;
  startDate: string;
  endDate: string;
}

export interface PersonalScheduleEntry {
  type: "ROUTINE" | "BOOKING";
  routineId: number | null;
  bookingId: number | null;
  classroomId: number;
  date: string | null;
  dayOfWeek: Routine["dayOfWeek"];
  startTime: string;
  endTime: string;
  courseCode: string | null;
  purpose: string | null;
}

export interface PersonalSchedule {
  program: string | null;
  batch: string | null;
  section: string | null;
  department: string | null;
  academicYear: string;
  semester: string;
  entries: PersonalScheduleEntry[];
}

export function canCancel(booking: Booking): boolean {
  return booking.status === "PENDING_APPROVAL" || booking.status === "CONFIRMED";
}

export function statusLabel(status: Booking["status"]): string {
  return {
    PENDING_APPROVAL: "Pending",
    CONFIRMED: "Confirmed",
    REJECTED: "Rejected",
    CANCELLED: "Cancelled",
    COMPLETED: "Completed",
  }[status];
}
