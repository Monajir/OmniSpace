import { useState } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { Legend } from "@/components/calendar/Legend";
import { WeekGrid, type GridCell } from "@/components/calendar/WeekGrid";
import { WeekNavigator } from "@/components/calendar/WeekNavigator";
import { useAppStore } from "@/lib/app-store";
import type { PersonalScheduleEntry } from "@/services/api";
import { getSlotsInRange } from "@/utils/slots";
import { mondayOf } from "@/utils/weekHelpers";
import type { ClassroomTimeSlot, RoutineDayOfWeek } from "@/types";

export function SchedulePanel() {
  const { currentUser, schedule, classrooms, bookings, routines } = useAppStore();
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const usesCohortSchedule = currentUser.role === "STUDENT" || currentUser.role === "CR";
  const entries: PersonalScheduleEntry[] = usesCohortSchedule
    ? (schedule?.entries ?? [])
    : [
        ...routines
          .filter((routine) => routine.facultyId === currentUser.id)
          .map((routine) => ({
            type: "ROUTINE" as const,
            routineId: routine.id,
            bookingId: null,
            classroomId: routine.classroomId,
            date: null,
            dayOfWeek: routine.dayOfWeek,
            startTime: routine.startTime,
            endTime: routine.endTime,
            courseCode: routine.courseCode,
            purpose: routine.courseName,
          })),
        ...bookings
          .filter((booking) => booking.classroomId !== null && booking.status === "CONFIRMED")
          .map((booking) => ({
            type: "BOOKING" as const,
            routineId: null,
            bookingId: booking.id,
            classroomId: booking.classroomId!,
            date: booking.startTime.slice(0, 10),
            dayOfWeek: "MONDAY" as const,
            startTime: booking.startTime.slice(11, 19),
            endTime: booking.endTime.slice(11, 19),
            courseCode: null,
            purpose: booking.purpose,
          })),
      ];

  function getCell(
    dateKey: string,
    day: RoutineDayOfWeek,
    slot: ClassroomTimeSlot,
  ): GridCell | null {
    const entry = entries.find((item) => {
      const matchesDate = item.type === "ROUTINE" ? item.dayOfWeek === day : item.date === dateKey;
      return matchesDate && getSlotsInRange(item.startTime, item.endTime).includes(slot);
    });
    if (!entry) return null;
    const classroom = classrooms.find((room) => room.id === entry.classroomId);
    const booking = entry.bookingId
      ? bookings.find((item) => item.id === entry.bookingId)
      : undefined;
    const title =
      entry.type === "ROUTINE" ? entry.courseCode || "Class" : entry.purpose || "Booking";
    return {
      title,
      subtitle: classroom?.roomCode ?? "Classroom",
      tone:
        entry.type === "ROUTINE"
          ? "routine"
          : booking?.bookingType === "EXAM"
            ? "exam"
            : booking?.bookingType === "EVENT"
              ? "event"
              : "booked",
      badge:
        entry.type === "ROUTINE" ? "Routine" : booking?.bookingType === "EXAM" ? "Exam" : "One-off",
      detail: (
        <>
          <div>{title}</div>
          <div className="text-muted-foreground">
            {classroom ? `${classroom.roomCode} — ${classroom.name}` : "Classroom"}
          </div>
          <div className="text-muted-foreground">
            {entry.startTime.slice(0, 5)}–{entry.endTime.slice(0, 5)}
          </div>
        </>
      ),
    };
  }

  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="label-mono">Weekly timetable</span>
          <h2 className="mt-1 font-display text-xl">
            {usesCohortSchedule ? "My classes" : "Teaching schedule"}
          </h2>
        </div>
        <WeekNavigator weekStart={weekStart} onChange={setWeekStart} />
      </div>
      <div className="mt-5">
        {entries.length > 0 ? (
          <WeekGrid weekStart={weekStart} getCell={getCell} />
        ) : (
          <EmptyState message="No classes scheduled for this week" />
        )}
      </div>
      <div className="mt-5 border-t border-border/60 pt-4">
        <Legend />
      </div>
    </section>
  );
}
