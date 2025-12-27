package com.bookingapp.resource.dto;

import com.bookingapp.resource.ResourceStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.time.Instant;
import java.util.List;

public class ResourceDtos {

    public record ResourceResponse(
            Long id,
            String name,
            String category,
            String location,
            Integer capacity,
            ResourceStatus status,
            boolean requiresApproval,
            Long managedByUserId,
            Instant createdAt
    ) {}

    public record CreateResourceRequest(
            @NotBlank String name,
            String category,
            String location,
            @Positive Integer capacity,
            @NotNull Boolean requiresApproval,
            Long managedByUserId
    ) {}

    public record UpdateResourceRequest(
            @NotBlank String name,
            String category,
            String location,
            @Positive Integer capacity,
            @NotNull Boolean requiresApproval,
            Long managedByUserId
    ) {}

    public record UpdateStatusRequest(
            @NotNull ResourceStatus status
    ) {}

    public record BusyWindow(
            Instant start,
            Instant end
    ) {}

    public record ResourceAvailabilityResponse(
            Long resourceId,
            Instant from,
            Instant to,
            List<BusyWindow> busy
    ) {}
}
