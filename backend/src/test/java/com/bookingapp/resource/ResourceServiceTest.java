package com.bookingapp.resource;

import com.bookingapp.booking.Booking;
import com.bookingapp.booking.BookingRepository;
import com.bookingapp.common.exception.InvalidRequestException;
import com.bookingapp.resource.dto.ResourceDtos.CreateResourceRequest;
import com.bookingapp.resource.dto.ResourceDtos.UpdateStatusRequest;
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

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ResourceServiceTest {

    @Mock ResourceRepository resourceRepository;
    @Mock UserRepository userRepository;
    @Mock BookingRepository bookingRepository;

    private ResourceService service;

    @BeforeEach
    void setUp() {
        service = new ResourceService(resourceRepository, userRepository, bookingRepository);
        authenticate(user(99L, UserRole.ADMIN));
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void rejectsManagerAssignmentToUserWithWrongRole() {
        when(userRepository.findById(5L)).thenReturn(Optional.of(user(5L, UserRole.FACULTY)));
        var request = new CreateResourceRequest("Projector", "AV", "Store", 1, true, 5L);

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage("Assigned user must have the RESOURCE_MANAGER role");
    }

    @Test
    void availabilityContainsOnlyOccupiedTimeWindows() {
        Resource resource = Resource.builder().id(3L).build();
        Instant start = Instant.parse("2026-08-28T08:00:00Z");
        Instant end = Instant.parse("2026-08-28T10:00:00Z");
        Booking booking = Booking.builder().resource(resource).startTime(start).endTime(end)
                .purpose("Private meeting description").build();
        when(resourceRepository.findById(3L)).thenReturn(Optional.of(resource));
        when(bookingRepository.findWindowForResource(3L, start.minusSeconds(60), end.plusSeconds(60)))
                .thenReturn(List.of(booking));

        var response = service.getAvailability(3L, start.minusSeconds(60), end.plusSeconds(60));

        assertThat(response.busy()).containsExactly(new com.bookingapp.resource.dto.ResourceDtos.BusyWindow(start, end));
    }

    @Test
    void manualStatusChangeReleasesIssueWorkflowOwnership() {
        Resource resource = Resource.builder().id(3L).status(ResourceStatus.MAINTENANCE)
                .statusManagedByIssue(true).build();
        when(resourceRepository.findByIdForUpdate(3L)).thenReturn(Optional.of(resource));

        service.updateStatus(3L, new UpdateStatusRequest(ResourceStatus.UNAVAILABLE));

        assertThat(resource.getStatus()).isEqualTo(ResourceStatus.UNAVAILABLE);
        assertThat(resource.isStatusManagedByIssue()).isFalse();
    }

    @Test
    void manualStatusCannotImpersonateIssueWorkflow() {
        Resource resource = Resource.builder().id(3L).status(ResourceStatus.AVAILABLE).build();
        when(resourceRepository.findByIdForUpdate(3L)).thenReturn(Optional.of(resource));

        assertThatThrownBy(() -> service.updateStatus(
                3L, new UpdateStatusRequest(ResourceStatus.PENDING_INSPECTION)))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessageContaining("controlled by the issue workflow");
    }

    private User user(Long id, UserRole role) {
        return User.builder().id(id).email("user" + id + "@example.com")
                .passwordHash("hash").displayName("User " + id).role(role).build();
    }

    private void authenticate(User user) {
        CustomUserDetails details = new CustomUserDetails(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities()));
    }
}
