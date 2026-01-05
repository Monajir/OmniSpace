package com.bookingapp.issue;

import com.bookingapp.issue.dto.IssueDtos.CreateIssueRequest;
import com.bookingapp.issue.dto.IssueDtos.IssueResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class IssueController {

    private final IssueService issueService;

    @GetMapping("/api/issues")
    public List<IssueResponse> search(@RequestParam(required = false) Long resourceId,
                                       @RequestParam(required = false) Long classroomId,
                                       @RequestParam(required = false) IssueStatus status) {
        return issueService.search(resourceId, classroomId, status);
    }

    @PostMapping("/api/resources/{id}/issues")
    @PreAuthorize("!hasRole('MAINTENANCE_STAFF')")
    public ResponseEntity<IssueResponse> reportForResource(@PathVariable("id") Long resourceId,
                                                             @Valid @RequestBody CreateIssueRequest request) {
        return ResponseEntity.ok(issueService.reportForResource(resourceId, request));
    }

    @PostMapping("/api/classrooms/{id}/issues")
    @PreAuthorize("!hasRole('MAINTENANCE_STAFF')")
    public ResponseEntity<IssueResponse> reportForClassroom(@PathVariable("id") Long classroomId,
                                                              @Valid @RequestBody CreateIssueRequest request) {
        return ResponseEntity.ok(issueService.reportForClassroom(classroomId, request));
    }

    @PatchMapping("/api/issues/{id}/resolve")
    @PreAuthorize("hasAnyRole('MAINTENANCE_STAFF', 'ADMIN')")
    public IssueResponse resolve(@PathVariable Long id) {
        return issueService.resolve(id);
    }

    @PatchMapping("/api/issues/{id}/confirm")
    @PreAuthorize("hasAnyRole('MAINTENANCE_STAFF', 'ADMIN')")
    public IssueResponse confirm(@PathVariable Long id) {
        return issueService.confirm(id);
    }

    @PatchMapping("/api/issues/{id}/dismiss")
    @PreAuthorize("hasAnyRole('MAINTENANCE_STAFF', 'ADMIN')")
    public IssueResponse dismiss(@PathVariable Long id) {
        return issueService.dismiss(id);
    }
}
