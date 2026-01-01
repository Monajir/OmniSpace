package com.bookingapp.booking.dto;

import com.bookingapp.booking.BookingStatus;
import com.bookingapp.booking.BookingType;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public class BookingDtos {

    public record BookingResponse(
            Long id,
            Long resourceId,
            Long classroomId,
            Long userId,
            String requesterDisplayName,
            Instant startTime,
            Instant endTime,
            String purpose,
            BookingType bookingType,
            String targetProgram,
            String targetBatch,
            String targetSection,
            BookingStatus status,
            Long approvedBy,
            Instant approvedAt,
            String rejectionReason,
            Instant createdAt
    ) {}

    public record CreateBookingRequest(
            Long resourceId,
            Long classroomId,
            @NotNull Instant startTime,
            @NotNull Instant endTime,
            @NotBlank String purpose,
            /** EVENT/EXAM require this to be set explicitly; ACADEMIC/RESOURCE are inferred if omitted. */
            BookingType bookingType,
            String targetProgram,
            @Size(max = 32) String targetBatch,
            @Size(max = 16) String targetSection
    ) {
        @AssertTrue(message = "Exactly one of resourceId or classroomId must be set")
        public boolean isExactlyOneTarget() {
            return (resourceId != null) ^ (classroomId != null);
        }
    }

    public record RejectRequest(
            @NotBlank(message = "rejection reason is required")
            @Size(max = 500, message = "rejection reason must not exceed 500 characters")
            String reason
    ) {}
}
