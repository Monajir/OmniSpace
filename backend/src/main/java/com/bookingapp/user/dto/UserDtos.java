package com.bookingapp.user.dto;

import com.bookingapp.user.UserRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public class UserDtos {

    public record UserResponse(
            Long id,
            String email,
            String displayName,
            UserRole role,
            boolean mustChangePassword,
            Instant createdAt
    ) {}

    public record UpdateMeRequest(
            @NotBlank(message = "displayName must not be blank") String displayName
    ) {}

    public record ChangeRoleRequest(
            @NotNull(message = "role is required") UserRole role
    ) {}

    public record ChangePasswordRequest(
            @NotBlank(message = "currentPassword must not be blank") String currentPassword,
            @NotBlank(message = "newPassword must not be blank")
            @Size(min = 8, max = 128, message = "newPassword must be between 8 and 128 characters")
            String newPassword
    ) {}
}
