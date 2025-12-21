package com.bookingapp.auth.dto;

import com.bookingapp.user.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AuthDtos {

    /**
     * Self-registration always creates a STUDENT — role is not caller-supplied.
     * Elevating to CR/FACULTY/RESOURCE_MANAGER/MAINTENANCE_STAFF/ADMIN requires
     * an ADMIN to call PATCH /api/users/{id}/role afterwards (see permission
     * matrix: "no self-request flow" for CR, and by extension no self-elevation
     * for any other role either).
     */
    public record RegisterRequest(
            @NotBlank @Email String email,
            @NotBlank @Size(min = 8, message = "password must be at least 8 characters") String password,
            @NotBlank String displayName
    ) {}

    public record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank String password
    ) {}

    public record AuthResponse(
            String accessToken,
            long expiresInSeconds,
            UserSummary user
    ) {}

    public record UserSummary(
            Long id,
            String email,
            String displayName,
            UserRole role,
            boolean mustChangePassword
    ) {}
}
