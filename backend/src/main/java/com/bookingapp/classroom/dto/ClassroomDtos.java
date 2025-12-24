package com.bookingapp.classroom.dto;

import com.bookingapp.classroom.ClassroomStatus;
import com.bookingapp.classroom.ClassroomTimeSlot;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public class ClassroomDtos {

    public record ClassroomResponse(
            Long id,
            String roomCode,
            String name,
            String building,
            Integer floor,
            Integer capacity,
            boolean hasProjector,
            boolean hasWhiteboard,
            boolean isLab,
            String departmentOwned,
            ClassroomStatus status,
            Instant createdAt
    ) {}

    public record CreateClassroomRequest(
            @NotBlank String roomCode,
            @NotBlank String name,
            String building,
            @PositiveOrZero Integer floor,
            @Positive Integer capacity,
            boolean hasProjector,
            boolean hasWhiteboard,
            boolean isLab,
            String departmentOwned
    ) {}

    public record UpdateClassroomRequest(
            @NotBlank String name,
            String building,
            @PositiveOrZero Integer floor,
            @Positive Integer capacity,
            boolean hasProjector,
            boolean hasWhiteboard,
            boolean isLab,
            String departmentOwned
    ) {}

    public record UpdateStatusRequest(
            @NotNull ClassroomStatus status
    ) {}

    public enum SlotStatus { AVAILABLE, BOOKED }

    public record SlotAvailability(
            ClassroomTimeSlot slot,
            String label,
            SlotStatus status,
            String source,
            String detail
    ) {}

    public record DaySlots(
            LocalDate date,
            String dayOfWeek,
            List<SlotAvailability> slots
    ) {}

    public record WeeklyAvailabilityResponse(
            Long classroomId,
            LocalDate weekStart,
            LocalDate weekEnd,
            List<DaySlots> days
    ) {}
}
