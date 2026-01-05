package com.bookingapp.issue;

import com.bookingapp.classroom.ClassroomRepository;
import com.bookingapp.classroom.Classroom;
import com.bookingapp.classroom.ClassroomStatus;
import com.bookingapp.common.exception.InvalidRequestException;
import com.bookingapp.issue.dto.IssueDtos.CreateIssueRequest;
import com.bookingapp.resource.Resource;
import com.bookingapp.resource.ResourceRepository;
import com.bookingapp.resource.ResourceStatus;
import com.bookingapp.security.CustomUserDetails;
import com.bookingapp.user.User;
import com.bookingapp.user.UserRepository;
import com.bookingapp.user.UserRole;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IssueServiceTest {

    @Mock IssueReportRepository issueReportRepository;
    @Mock ResourceRepository resourceRepository;
    @Mock ClassroomRepository classroomRepository;
    @Mock UserRepository userRepository;

    private IssueService service;
    private User operator;

    @BeforeEach
    void setUp() {
        service = new IssueService(issueReportRepository, resourceRepository,
                classroomRepository, userRepository);
        operator = user(9L, UserRole.MAINTENANCE_STAFF);
        authenticate(operator);
        lenient().when(userRepository.findById(9L)).thenReturn(Optional.of(operator));
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void reportTemporarilySuspendsAnAvailableResource() {
        Resource resource = resource(ResourceStatus.AVAILABLE, false);
        when(resourceRepository.findByIdForUpdate(3L)).thenReturn(Optional.of(resource));

        var response = service.reportForResource(3L, new CreateIssueRequest("Electrical sparks"));

        assertThat(response.status()).isEqualTo(IssueStatus.OPEN);
        assertThat(response.reporterDisplayName()).isEqualTo("User 9");
        assertThat(resource.getStatus()).isEqualTo(ResourceStatus.PENDING_INSPECTION);
        assertThat(resource.isStatusManagedByIssue()).isTrue();
    }

    @Test
    void reportPreservesAnExistingManualStatus() {
        Resource resource = resource(ResourceStatus.UNAVAILABLE, false);
        when(resourceRepository.findByIdForUpdate(3L)).thenReturn(Optional.of(resource));

        service.reportForResource(3L, new CreateIssueRequest("Still damaged"));

        assertThat(resource.getStatus()).isEqualTo(ResourceStatus.UNAVAILABLE);
        assertThat(resource.isStatusManagedByIssue()).isFalse();
    }

    @Test
    void classroomReportUsesTheSameInspectionWorkflow() {
        Classroom classroom = Classroom.builder().id(7L).roomCode("CSE-301")
                .status(ClassroomStatus.AVAILABLE).statusManagedByIssue(false).build();
        when(classroomRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(classroom));

        var response = service.reportForClassroom(7L, new CreateIssueRequest("Projector flickers"));

        assertThat(response.status()).isEqualTo(IssueStatus.OPEN);
        assertThat(classroom.getStatus()).isEqualTo(ClassroomStatus.PENDING_INSPECTION);
        assertThat(classroom.isStatusManagedByIssue()).isTrue();
    }

    @Test
    void confirmationMovesPendingInspectionIntoMaintenance() {
        Resource resource = resource(ResourceStatus.PENDING_INSPECTION, true);
        IssueReport issue = issue(IssueStatus.OPEN, resource);
        when(issueReportRepository.findByIdForUpdate(20L)).thenReturn(Optional.of(issue));
        when(resourceRepository.findByIdForUpdate(3L)).thenReturn(Optional.of(resource));

        var response = service.confirm(20L);

        assertThat(response.status()).isEqualTo(IssueStatus.IN_PROGRESS);
        assertThat(response.reviewedBy()).isEqualTo(9L);
        assertThat(response.reviewerDisplayName()).isEqualTo("User 9");
        assertThat(response.reviewedAt()).isNotNull();
        assertThat(resource.getStatus()).isEqualTo(ResourceStatus.MAINTENANCE);
    }

    @Test
    void dismissalRestoresIssueOwnedStatusWhenItIsTheLastActiveIssue() {
        Resource resource = resource(ResourceStatus.PENDING_INSPECTION, true);
        IssueReport issue = issue(IssueStatus.OPEN, resource);
        when(issueReportRepository.findByIdForUpdate(20L)).thenReturn(Optional.of(issue));
        when(resourceRepository.findByIdForUpdate(3L)).thenReturn(Optional.of(resource));
        when(issueReportRepository.countByResource_IdAndStatusNotIn(org.mockito.ArgumentMatchers.eq(3L), anyList()))
                .thenReturn(0L);

        var response = service.dismiss(20L);

        assertThat(response.status()).isEqualTo(IssueStatus.CLOSED);
        assertThat(resource.getStatus()).isEqualTo(ResourceStatus.AVAILABLE);
        assertThat(resource.isStatusManagedByIssue()).isFalse();
    }

    @Test
    void resolutionDoesNotOverwriteManualStatusOverride() {
        Resource resource = resource(ResourceStatus.UNAVAILABLE, false);
        IssueReport issue = issue(IssueStatus.IN_PROGRESS, resource);
        when(issueReportRepository.findByIdForUpdate(20L)).thenReturn(Optional.of(issue));
        when(resourceRepository.findByIdForUpdate(3L)).thenReturn(Optional.of(resource));
        when(issueReportRepository.countByResource_IdAndStatusNotIn(org.mockito.ArgumentMatchers.eq(3L), anyList()))
                .thenReturn(0L);

        var response = service.resolve(20L);

        assertThat(response.resolverDisplayName()).isEqualTo("User 9");
        assertThat(resource.getStatus()).isEqualTo(ResourceStatus.UNAVAILABLE);
    }

    @Test
    void openIssueCannotSkipInspectionAndBeResolvedDirectly() {
        when(issueReportRepository.findByIdForUpdate(20L))
                .thenReturn(Optional.of(issue(IssueStatus.OPEN, resource(ResourceStatus.PENDING_INSPECTION, true))));

        assertThatThrownBy(() -> service.resolve(20L))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage("Only a confirmed issue in progress can be resolved");
    }

    private IssueReport issue(IssueStatus status, Resource resource) {
        return IssueReport.builder().id(20L).resource(resource).reporter(user(4L, UserRole.STUDENT))
                .description("Problem").status(status).build();
    }

    private Resource resource(ResourceStatus status, boolean managed) {
        return Resource.builder().id(3L).name("Projector").status(status)
                .statusManagedByIssue(managed).build();
    }

    private User user(Long id, UserRole role) {
        return User.builder().id(id).email("user" + id + "@example.com").passwordHash("hash")
                .displayName("User " + id).role(role).build();
    }

    private void authenticate(User user) {
        CustomUserDetails details = new CustomUserDetails(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities()));
    }
}
