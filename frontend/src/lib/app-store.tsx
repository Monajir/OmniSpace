import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type {
  Booking,
  Classroom,
  ClassroomStatus,
  Profile,
  Resource,
  ResourceStatus,
  Routine,
  User,
} from "@/types";
import {
  api,
  type CreateClassroomRequest,
  type CreateBookingRequest,
  type PersonalSchedule,
  type ResourceWriteRequest,
  type RoutineWriteRequest,
  type UpdateClassroomRequest,
  type UpdateMyProfileRequest,
} from "@/services/api";

type AuthStatus = "loading" | "anonymous" | "authenticated";

const ANONYMOUS_USER: User = {
  id: 0,
  email: "",
  displayName: "",
  role: "STUDENT",
  mustChangePassword: false,
  createdAt: "",
};

interface AppStore {
  authStatus: AuthStatus;
  currentUser: User;
  profile: Profile | undefined;
  schedule: PersonalSchedule | undefined;
  routines: Routine[];
  classrooms: Classroom[];
  bookings: Booking[];
  visibleBookings: Booking[];
  pendingBookings: Booking[];
  resources: Resource[];
  dataLoading: boolean;
  dataError: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (displayName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshData: () => Promise<void>;
  createBooking: (data: CreateBookingRequest) => Promise<Booking>;
  approveBooking: (id: number) => Promise<void>;
  rejectBooking: (id: number, reason: string) => Promise<void>;
  cancelBooking: (id: number) => Promise<void>;
  updateResourceStatus: (id: number, status: ResourceStatus) => Promise<void>;
  createResource: (data: ResourceWriteRequest) => Promise<Resource>;
  updateResource: (id: number, data: ResourceWriteRequest) => Promise<Resource>;
  deleteResource: (id: number) => Promise<void>;
  createClassroom: (data: CreateClassroomRequest) => Promise<Classroom>;
  updateClassroom: (id: number, data: UpdateClassroomRequest) => Promise<Classroom>;
  updateClassroomStatus: (id: number, status: ClassroomStatus) => Promise<void>;
  deleteClassroom: (id: number) => Promise<void>;
  createRoutine: (data: RoutineWriteRequest) => Promise<Routine>;
  updateRoutine: (id: number, data: RoutineWriteRequest) => Promise<Routine>;
  deleteRoutine: (id: number) => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<User>;
  updateProfile: (data: UpdateMyProfileRequest) => Promise<Profile>;
  getUserName: (id: number | null) => string;
}

const StoreContext = createContext<AppStore | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const started = useRef(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const [currentUser, setCurrentUser] = useState<User>(ANONYMOUS_USER);
  const [profile, setProfile] = useState<Profile>();
  const [schedule, setSchedule] = useState<PersonalSchedule>();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [visibleBookings, setVisibleBookings] = useState<Booking[]>([]);
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const clearData = useCallback(() => {
    setCurrentUser(ANONYMOUS_USER);
    setProfile(undefined);
    setSchedule(undefined);
    setRoutines([]);
    setClassrooms([]);
    setBookings([]);
    setVisibleBookings([]);
    setPendingBookings([]);
    setResources([]);
    setDataError(null);
  }, []);

  const hydrate = useCallback(async () => {
    setDataLoading(true);
    setDataError(null);

    let user: User;
    try {
      user = await api.getMe();
      setCurrentUser(user);
      setAuthStatus("authenticated");
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Unable to restore your session");
      setDataLoading(false);
      throw error;
    }

    if (user.mustChangePassword) {
      setDataLoading(false);
      return;
    }

    try {
      const canApprove = ["FACULTY", "RESOURCE_MANAGER", "ADMIN"].includes(user.role);
      const [
        ownProfile,
        nextClassrooms,
        nextResources,
        mine,
        all,
        nextSchedule,
        nextRoutines,
        pending,
      ] = await Promise.all([
        api.getProfile(user.id),
        api.getClassrooms(),
        api.getResources(),
        api.getMyBookings(),
        user.role === "ADMIN" ? api.getBookings() : Promise.resolve([]),
        api.getMySchedule(),
        api.getRoutines(),
        canApprove ? api.getPendingBookings() : Promise.resolve([]),
      ]);
      setProfile(ownProfile);
      setClassrooms(nextClassrooms);
      setResources(nextResources);
      setBookings(mine);
      setVisibleBookings(all);
      setSchedule(nextSchedule);
      setRoutines(nextRoutines);
      setPendingBookings(pending);
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Unable to load OmniSpace data");
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    api
      .restoreSession()
      .then((session) => (session ? hydrate() : setAuthStatus("anonymous")))
      .catch(() => setAuthStatus("anonymous"));
  }, [hydrate]);

  const login = useCallback(
    async (email: string, password: string) => {
      await api.login(email, password);
      await hydrate();
    },
    [hydrate],
  );

  const register = useCallback(
    async (displayName: string, email: string, password: string) => {
      await api.register(displayName, email, password);
      await hydrate();
    },
    [hydrate],
  );

  const logout = useCallback(async () => {
    await api.logout();
    clearData();
    setAuthStatus("anonymous");
  }, [clearData]);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      await api.changePassword(currentPassword, newPassword);
      await api.logout();
      clearData();
      setAuthStatus("anonymous");
    },
    [clearData],
  );

  const createBooking = useCallback(
    async (data: CreateBookingRequest) => {
      const created = await api.createBooking(data);
      setBookings((prev) => [created, ...prev]);
      if (currentUser.role === "ADMIN") {
        setVisibleBookings((prev) => [created, ...prev]);
      }

      if (["FACULTY", "RESOURCE_MANAGER", "ADMIN"].includes(currentUser.role)) {
        try {
          setPendingBookings(await api.getPendingBookings());
        } catch (error) {
          setDataError(
            error instanceof Error
              ? error.message
              : "Booking created, but the approval queue could not refresh",
          );
        }
      }

      return created;
    },
    [currentUser.role],
  );

  const cancelBooking = useCallback(async (id: number) => {
    await api.cancelBooking(id);
    const patch = (items: Booking[]) =>
      items.map((b) => (b.id === id ? { ...b, status: "CANCELLED" as const } : b));
    setBookings(patch);
    setVisibleBookings(patch);
    setPendingBookings((prev) => prev.filter((booking) => booking.id !== id));
  }, []);

  const approveBooking = useCallback(async (id: number) => {
    const updated = await api.approveBooking(id);
    setPendingBookings((prev) => prev.filter((b) => b.id !== id));
    setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
    setVisibleBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
  }, []);

  const rejectBooking = useCallback(async (id: number, reason: string) => {
    const updated = await api.rejectBooking(id, reason);
    setPendingBookings((prev) => prev.filter((b) => b.id !== id));
    setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
    setVisibleBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
  }, []);

  const updateResourceStatus = useCallback(async (id: number, status: ResourceStatus) => {
    const updated = await api.updateResourceStatus(id, status);
    setResources((prev) => prev.map((r) => (r.id === id ? updated : r)));
  }, []);

  const createResource = useCallback(async (data: ResourceWriteRequest) => {
    const created = await api.createResource(data);
    setResources((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    return created;
  }, []);

  const updateResource = useCallback(async (id: number, data: ResourceWriteRequest) => {
    const updated = await api.updateResource(id, data);
    setResources((prev) => prev.map((resource) => (resource.id === id ? updated : resource)));
    return updated;
  }, []);

  const deleteResource = useCallback(async (id: number) => {
    await api.deleteResource(id);
    setResources((prev) => prev.filter((resource) => resource.id !== id));
  }, []);

  const createClassroom = useCallback(async (data: CreateClassroomRequest) => {
    const created = await api.createClassroom(data);
    setClassrooms((prev) =>
      [...prev, created].sort((a, b) => a.roomCode.localeCompare(b.roomCode)),
    );
    return created;
  }, []);

  const updateClassroom = useCallback(async (id: number, data: UpdateClassroomRequest) => {
    const updated = await api.updateClassroom(id, data);
    setClassrooms((prev) => prev.map((room) => (room.id === id ? updated : room)));
    return updated;
  }, []);

  const updateClassroomStatus = useCallback(async (id: number, status: ClassroomStatus) => {
    const updated = await api.updateClassroomStatus(id, status);
    setClassrooms((prev) => prev.map((room) => (room.id === id ? updated : room)));
  }, []);

  const deleteClassroom = useCallback(async (id: number) => {
    await api.deleteClassroom(id);
    setClassrooms((prev) => prev.filter((room) => room.id !== id));
  }, []);

  const createRoutine = useCallback(async (data: RoutineWriteRequest) => {
    const created = await api.createRoutine(data);
    setRoutines((prev) => sortRoutines([...prev, created]));
    return created;
  }, []);

  const updateRoutine = useCallback(async (id: number, data: RoutineWriteRequest) => {
    const updated = await api.updateRoutine(id, data);
    setRoutines((prev) =>
      sortRoutines(prev.map((routine) => (routine.id === id ? updated : routine))),
    );
    return updated;
  }, []);

  const deleteRoutine = useCallback(async (id: number) => {
    await api.deleteRoutine(id);
    setRoutines((prev) => prev.filter((routine) => routine.id !== id));
  }, []);

  const updateDisplayName = useCallback(async (displayName: string) => {
    const updated = await api.updateMe(displayName);
    setCurrentUser(updated);
    return updated;
  }, []);

  const updateProfile = useCallback(async (data: UpdateMyProfileRequest) => {
    const updated = await api.updateMyProfile(data);
    setProfile(updated);
    return updated;
  }, []);

  const getUserName = useCallback(
    (id: number | null) => {
      if (id === null) return "—";
      return id === currentUser.id ? currentUser.displayName : `User #${id}`;
    },
    [currentUser],
  );

  const value = useMemo<AppStore>(
    () => ({
      authStatus,
      currentUser,
      profile,
      schedule,
      routines,
      classrooms,
      bookings,
      visibleBookings,
      pendingBookings,
      resources,
      dataLoading,
      dataError,
      login,
      register,
      logout,
      changePassword,
      refreshData: hydrate,
      createBooking,
      approveBooking,
      rejectBooking,
      cancelBooking,
      updateResourceStatus,
      createResource,
      updateResource,
      deleteResource,
      createClassroom,
      updateClassroom,
      updateClassroomStatus,
      deleteClassroom,
      createRoutine,
      updateRoutine,
      deleteRoutine,
      updateDisplayName,
      updateProfile,
      getUserName,
    }),
    [
      authStatus,
      currentUser,
      profile,
      schedule,
      routines,
      classrooms,
      bookings,
      visibleBookings,
      pendingBookings,
      resources,
      dataLoading,
      dataError,
      login,
      register,
      logout,
      changePassword,
      hydrate,
      createBooking,
      approveBooking,
      rejectBooking,
      cancelBooking,
      updateResourceStatus,
      createResource,
      updateResource,
      deleteResource,
      createClassroom,
      updateClassroom,
      updateClassroomStatus,
      deleteClassroom,
      createRoutine,
      updateRoutine,
      deleteRoutine,
      updateDisplayName,
      updateProfile,
      getUserName,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useAppStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useAppStore must be used inside AppStoreProvider");
  return ctx;
}

const ROUTINE_DAY_ORDER = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

function sortRoutines(items: Routine[]) {
  return [...items].sort(
    (a, b) =>
      ROUTINE_DAY_ORDER.indexOf(a.dayOfWeek) - ROUTINE_DAY_ORDER.indexOf(b.dayOfWeek) ||
      a.startTime.localeCompare(b.startTime) ||
      a.courseCode.localeCompare(b.courseCode),
  );
}
