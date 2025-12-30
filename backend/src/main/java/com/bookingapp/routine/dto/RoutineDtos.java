package com.bookingapp.routine.dto;

import com.bookingapp.routine.RoutineDayOfWeek;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public class RoutineDtos {

    public record RoutineResponse(
            Long id,
            Long classroomId,
            String courseCode,
            String courseName,
            Long facultyId,
            RoutineDayOfWeek dayOfWeek,
            LocalTime startTime,
            LocalTime endTime,
            @NotBlank String semester,
            String academicYear,
            String program,
            String batch,
            String section,
            boolean isRecurring,
            Instant createdAt,
            Instant updatedAt
    ) {}

    public record CreateRoutineRequest(
            @NotNull Long classroomId,
            @NotBlank String courseCode,
            @NotBlank String courseName,
            @NotNull RoutineDayOfWeek dayOfWeek,
            @NotNull LocalTime startTime,
            @NotNull LocalTime endTime,
            @NotBlank String semester,
            @NotBlank String academicYear,
            String program,
            @Size(max = 32) String batch,
            @Size(max = 16) String section,
            boolean isRecurring,
            /** Ignored unless the caller is ADMIN; FACULTY always creates for themselves. */
            Long facultyId
    ) {}

    public record UpdateRoutineRequest(
            Long classroomId,
            @NotBlank String courseCode,
            @NotBlank String courseName,
            @NotNull RoutineDayOfWeek dayOfWeek,
            @NotNull LocalTime startTime,
            @NotNull LocalTime endTime,
            String semester,
            @NotBlank String academicYear,
            String program,
            @Size(max = 32) String batch,
            @Size(max = 16) String section,
            boolean isRecurring,
            /** Ignored for FACULTY callers; ADMIN may reassign the routine. */
            Long facultyId
    ) {}

    public record PersonalScheduleEntry(
            String type,
            Long routineId,
            Long bookingId,
            Long classroomId,
            LocalDate date,
            RoutineDayOfWeek dayOfWeek,
            LocalTime startTime,
            LocalTime endTime,
            String courseCode,
            String purpose
    ) {}

    public record PersonalScheduleResponse(
            String program,
            String batch,
            String section,
            String department,
            String academicYear,
            String semester,
            List<PersonalScheduleEntry> entries
    ) {}
}
