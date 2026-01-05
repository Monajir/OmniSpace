package com.bookingapp.issue;

import com.bookingapp.classroom.Classroom;
import com.bookingapp.classroom.ClassroomRepository;
import com.bookingapp.classroom.ClassroomStatus;
import com.bookingapp.common.exception.InvalidRequestException;
import com.bookingapp.common.exception.ResourceNotFoundException;
import com.bookingapp.common.exception.UnauthorizedAccessException;
import com.bookingapp.common.util.SecurityUtils;
import com.bookingapp.issue.dto.IssueDtos.CreateIssueRequest;
import com.bookingapp.issue.dto.IssueDtos.IssueResponse;
import com.bookingapp.resource.Resource;
import com.bookingapp.resource.ResourceRepository;
import com.bookingapp.resource.ResourceStatus;
import com.bookingapp.user.User;
import com.bookingapp.user.UserRepository;
import com.bookingapp.user.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * Issue inspection workflow. A report temporarily suspends an available asset,
 * maintenance confirms or dismisses it, and confirmed work must be resolved.
 * Automatic restoration happens only while the issue workflow still owns the
 * target status, so a later manual staff decision is never overwritten.
 */
@Service
@RequiredArgsConstructor
public class IssueService {

    private static final List<IssueStatus> CLOSED_STATUSES = List.of(IssueStatus.RESOLVED, IssueStatus.CLOSED);

    private final IssueReportRepository issueReportRepository;
    private final ResourceRepository resourceRepository;
    private final ClassroomRepository classroomRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<IssueResponse> search(Long resourceId, Long classroomId, IssueStatus status) {
        assertCanView(resourceId);
        List<IssueReport> issues;
        if (resourceId != null) {
            issues = status != null
                    ? issueReportRepository.findByResource_IdAndStatus(resourceId, status)
                    : issueReportRepository.findByResource_Id(resourceId);
        } else if (classroomId != null) {
            issues = status != null
                    ? issueReportRepository.findByClassroom_IdAndStatus(classroomId, status)
                    : issueReportRepository.findByClassroom_Id(classroomId);
        } else {
            // MAINTENANCE_STAFF/ADMIN only when no filter is given (enforced via @PreAuthorize on controller).
            issues = issueReportRepository.findAll();
            if (status != null) {
                issues = issues.stream().filter(i -> i.getStatus() == status).toList();
            }
        }
        return issues.stream().map(this::toResponse).toList();
    }

    @Caching(evict = {
            @CacheEvict(cacheNames = "resources", allEntries = true),
            @CacheEvict(cacheNames = "classrooms", allEntries = true)
    })
    @Transactional
    public IssueResponse reportForResource(Long resourceId, CreateIssueRequest request) {
        Resource resource = resourceRepository.findByIdForUpdate(resourceId)
                .orElseThrow(() -> ResourceNotFoundException.of("Resource", resourceId));

        IssueReport report = IssueReport.builder()
                .resource(resource)
                .reporter(getUser(SecurityUtils.currentUserId()))
                .description(request.description())
                .status(IssueStatus.OPEN)
                .build();
        issueReportRepository.save(report);

        suspendForInspection(resource);
        return toResponse(report);
    }

    @Caching(evict = {
            @CacheEvict(cacheNames = "resources", allEntries = true),
            @CacheEvict(cacheNames = "classrooms", allEntries = true)
    })
    @Transactional
    public IssueResponse reportForClassroom(Long classroomId, CreateIssueRequest request) {
        Classroom classroom = classroomRepository.findByIdForUpdate(classroomId)
                .orElseThrow(() -> ResourceNotFoundException.of("Classroom", classroomId));

        IssueReport report = IssueReport.builder()
                .classroom(classroom)
                .reporter(getUser(SecurityUtils.currentUserId()))
                .description(request.description())
                .status(IssueStatus.OPEN)
                .build();
        issueReportRepository.save(report);

        suspendForInspection(classroom);
        return toResponse(report);
    }

    @Caching(evict = {
            @CacheEvict(cacheNames = "resources", allEntries = true),
            @CacheEvict(cacheNames = "classrooms", allEntries = true)
    })
    @Transactional
    public IssueResponse confirm(Long id) {
        IssueReport report = getForUpdate(id);
        if (report.getStatus() != IssueStatus.OPEN) {
            throw new InvalidRequestException("Only an open issue can be confirmed for maintenance");
        }

        User reviewer = getUser(SecurityUtils.currentUserId());
        Instant now = Instant.now();
        report.setStatus(IssueStatus.IN_PROGRESS);
        report.setReviewedBy(reviewer);
        report.setReviewedAt(now);

        if (report.getResource() != null) {
            Resource resource = lockResource(report.getResource().getId());
            if (resource.isStatusManagedByIssue()) {
                resource.setStatus(ResourceStatus.MAINTENANCE);
            }
        } else {
            Classroom classroom = lockClassroom(report.getClassroom().getId());
            if (classroom.isStatusManagedByIssue()) {
                classroom.setStatus(ClassroomStatus.MAINTENANCE);
            }
        }
        return toResponse(report);
    }

    @Caching(evict = {
            @CacheEvict(cacheNames = "resources", allEntries = true),
            @CacheEvict(cacheNames = "classrooms", allEntries = true)
    })
    @Transactional
    public IssueResponse dismiss(Long id) {
        IssueReport report = getForUpdate(id);
        if (report.getStatus() != IssueStatus.OPEN) {
            throw new InvalidRequestException("Only an open issue can be dismissed");
        }

        User reviewer = getUser(SecurityUtils.currentUserId());
        Instant now = Instant.now();
        report.setStatus(IssueStatus.CLOSED);
        report.setReviewedBy(reviewer);
        report.setReviewedAt(now);
        report.setResolvedBy(reviewer);
        report.setResolvedAt(now);
        restoreIfLastActive(report);
        return toResponse(report);
    }

    @Caching(evict = {
            @CacheEvict(cacheNames = "resources", allEntries = true),
            @CacheEvict(cacheNames = "classrooms", allEntries = true)
    })
    @Transactional
    public IssueResponse resolve(Long id) {
        IssueReport report = getForUpdate(id);
        if (report.getStatus() != IssueStatus.IN_PROGRESS) {
            throw new InvalidRequestException("Only a confirmed issue in progress can be resolved");
        }

        report.setStatus(IssueStatus.RESOLVED);
        report.setResolvedBy(getUser(SecurityUtils.currentUserId()));
        report.setResolvedAt(Instant.now());

        restoreIfLastActive(report);
        return toResponse(report);
    }

    private void suspendForInspection(Resource resource) {
        if (resource.getStatus() == ResourceStatus.AVAILABLE) {
            resource.setStatus(ResourceStatus.PENDING_INSPECTION);
            resource.setStatusManagedByIssue(true);
        }
    }

    private void suspendForInspection(Classroom classroom) {
        if (classroom.getStatus() == ClassroomStatus.AVAILABLE) {
            classroom.setStatus(ClassroomStatus.PENDING_INSPECTION);
            classroom.setStatusManagedByIssue(true);
        }
    }

    private void restoreIfLastActive(IssueReport report) {
        if (report.getResource() != null) {
            Long resourceId = report.getResource().getId();
            Resource resource = lockResource(resourceId);
            long active = issueReportRepository.countByResource_IdAndStatusNotIn(resourceId, CLOSED_STATUSES);
            if (active == 0 && resource.isStatusManagedByIssue()) {
                resource.setStatus(ResourceStatus.AVAILABLE);
                resource.setStatusManagedByIssue(false);
            }
        } else {
            Long classroomId = report.getClassroom().getId();
            Classroom classroom = lockClassroom(classroomId);
            long active = issueReportRepository.countByClassroom_IdAndStatusNotIn(classroomId, CLOSED_STATUSES);
            if (active == 0 && classroom.isStatusManagedByIssue()) {
                classroom.setStatus(ClassroomStatus.AVAILABLE);
                classroom.setStatusManagedByIssue(false);
            }
        }
    }

    private IssueReport getForUpdate(Long id) {
        return issueReportRepository.findByIdForUpdate(id)
                .orElseThrow(() -> ResourceNotFoundException.of("IssueReport", id));
    }

    private Resource lockResource(Long id) {
        return resourceRepository.findByIdForUpdate(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Resource", id));
    }

    private Classroom lockClassroom(Long id) {
        return classroomRepository.findByIdForUpdate(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Classroom", id));
    }

    private void assertCanView(Long resourceId) {
        UserRole role = SecurityUtils.currentUserRole();
        if (role == UserRole.MAINTENANCE_STAFF || role == UserRole.ADMIN) return;
        if (role == UserRole.RESOURCE_MANAGER && resourceId != null) {
            boolean managesIt = resourceRepository.findById(resourceId)
                    .map(Resource::getManagedBy)
                    .map(User::getId)
                    .map(SecurityUtils.currentUserId()::equals)
                    .orElse(false);
            if (managesIt) return;
        }
        throw new UnauthorizedAccessException("Not permitted to view issue reports");
    }

    private IssueResponse toResponse(IssueReport i) {
        Long resourceId = i.getResource() != null ? i.getResource().getId() : null;
        Long classroomId = i.getClassroom() != null ? i.getClassroom().getId() : null;
        Long reviewedById = i.getReviewedBy() != null ? i.getReviewedBy().getId() : null;
        String reviewerName = i.getReviewedBy() != null ? i.getReviewedBy().getDisplayName() : null;
        Long resolvedById = i.getResolvedBy() != null ? i.getResolvedBy().getId() : null;
        String resolverName = i.getResolvedBy() != null ? i.getResolvedBy().getDisplayName() : null;
        return new IssueResponse(i.getId(), resourceId, classroomId, i.getReporter().getId(),
                i.getReporter().getDisplayName(), i.getDescription(), i.getStatus(),
                reviewedById, reviewerName, i.getReviewedAt(), resolvedById, resolverName,
                i.getResolvedAt(), i.getCreatedAt());
    }

    private User getUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("User", id));
    }
}
