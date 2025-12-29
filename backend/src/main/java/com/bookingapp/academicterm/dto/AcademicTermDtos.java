package com.bookingapp.academicterm.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.time.LocalDate;

public class AcademicTermDtos {

    public record AcademicTermResponse(
            Long id,
            String academicYear,
            String semester,
            LocalDate startDate,
            LocalDate endDate,
            Instant createdAt,
            Instant updatedAt
    ) {}

    public record SaveAcademicTermRequest(
            @NotBlank @Size(max = 32) String academicYear,
            @NotBlank @Size(max = 64) String semester,
            @NotNull LocalDate startDate,
            @NotNull LocalDate endDate
    ) {
        @AssertTrue(message = "startDate must be on or before endDate")
        public boolean isValidDateRange() {
            return startDate == null || endDate == null || !startDate.isAfter(endDate);
        }
    }
}
