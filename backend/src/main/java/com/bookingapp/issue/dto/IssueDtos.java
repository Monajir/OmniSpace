package com.bookingapp.issue.dto;

import com.bookingapp.issue.IssueStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public class IssueDtos {

    public record IssueResponse(
            Long id,
            Long resourceId,
            Long classroomId,
            Long reporterId,
            String reporterDisplayName,
            String description,
            IssueStatus status,
            Long reviewedBy,
            String reviewerDisplayName,
            Instant reviewedAt,
            Long resolvedBy,
            String resolverDisplayName,
            Instant resolvedAt,
            Instant createdAt
    ) {}

    public record CreateIssueRequest(
            @NotBlank @Size(max = 1000) String description
    ) {}
}
