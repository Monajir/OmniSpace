package com.bookingapp.profile.dto;

import jakarta.validation.constraints.Size;

import java.time.Instant;

public class ProfileDtos {

    public record ProfileResponse(
            Long id,
            Long userId,
            String department,
            String studentId,
            String facultyId,
            String designation,
            String contactNumber,
            String academicYear,
            String program,
            String batch,
            String section,
            Instant createdAt,
            Instant updatedAt
    ) {}

    public record UpdateMyProfileRequest(
            @Size(max = 32) String contactNumber
    ) {}

    public record AdminUpdateAcademicProfileRequest(
            @Size(max = 255) String department,
            @Size(max = 64) String studentId,
            @Size(max = 64) String facultyId,
            @Size(max = 255) String designation,
            @Size(max = 32) String academicYear,
            @Size(max = 255) String program,
            @Size(max = 32) String batch,
            @Size(max = 16) String section
    ) {}
}
