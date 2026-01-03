package com.bookingapp.booking;

import com.bookingapp.academicterm.AcademicTermService;
import com.bookingapp.booking.dto.BookingDtos.CreateBookingRequest;
import com.bookingapp.booking.dto.BookingDtos.RejectRequest;
import com.bookingapp.classroom.ClassroomRepository;
import com.bookingapp.classroom.Classroom;
import com.bookingapp.classroom.ClassroomStatus;
import com.bookingapp.common.exception.BookingConflictException;
import com.bookingapp.common.exception.InvalidRequestException;
import com.bookingapp.common.exception.UnauthorizedAccessException;
import com.bookingapp.profile.Profile;
import com.bookingapp.profile.ProfileRepository;
import com.bookingapp.resource.ResourceRepository;
import com.bookingapp.resource.Resource;
import com.bookingapp.resource.ResourceStatus;
import com.bookingapp.routine.RoutineRepository;
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
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock BookingRepository bookingRepository;
    @Mock ResourceRepository resourceRepository;
    @Mock ClassroomRepository classroomRepository;
    @Mock ProfileRepository profileRepository;
    @Mock RoutineRepository routineRepository;
    @Mock UserRepository userRepository;
    @Mock AcademicTermService academicTermService;

    private BookingService service;

    @BeforeEach
    void setUp() {
        service = new BookingService(bookingRepository, resourceRepository, classroomRepository,
                profileRepository, routineRepository, userRepository, academicTermService);
        ReflectionTestUtils.setField(service, "maxDurationHours", 4L);
    }

    @Test
    void rejectsDurationsEvenSlightlyOverConfiguredLimit() {
        Instant start = Instant.parse("2026-08-24T08:00:00Z");
        var request = new CreateBookingRequest(1L, null, start,
                start.plusSeconds(4 * 60 * 60 + 60), "Workshop", BookingType.RESOURCE,
                null, null, null);

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage("Booking duration may not exceed 4 hours");
    }

    @Test
    void cannotApproveAlreadyConfirmedBooking() {
        Booking booking = Booking.builder().id(10L).status(BookingStatus.CONFIRMED).build();
        when(bookingRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> service.approve(10L))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage("Only pending bookings can be approved");
    }

    @Test
    void cannotRejectCancelledBooking() {
        Booking booking = Booking.builder().id(11L).status(BookingStatus.CANCELLED).build();
        when(bookingRepository.findByIdForUpdate(11L)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> service.reject(11L, new RejectRequest(null)))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage("Only pending bookings can be rejected");
    }

    @Test
    void rejectionReasonIsTrimmedPersistedAndReturned() {
        User admin = user(1L, UserRole.ADMIN);
        User requester = user(7L, UserRole.STUDENT);
        authenticate(admin);
        Booking booking = Booking.builder().id(13L).resource(Resource.builder().id(3L).build())
                .user(requester).startTime(Instant.parse("2026-08-28T08:00:00Z"))
                .endTime(Instant.parse("2026-08-28T09:00:00Z")).purpose("Presentation")
                .bookingType(BookingType.RESOURCE).status(BookingStatus.PENDING_APPROVAL).build();
        when(bookingRepository.findByIdForUpdate(13L)).thenReturn(Optional.of(booking));
        when(userRepository.findById(1L)).thenReturn(Optional.of(admin));

        var response = service.reject(13L, new RejectRequest("  Equipment is reserved for exams.  "));

        assertThat(booking.getRejectionReason()).isEqualTo("Equipment is reserved for exams.");
        assertThat(response.rejectionReason()).isEqualTo("Equipment is reserved for exams.");
    }

    @Test
    void cannotCancelCompletedBooking() {
        Booking booking = Booking.builder().id(12L).status(BookingStatus.COMPLETED).build();
        when(bookingRepository.findByIdForUpdate(12L)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> service.cancel(12L))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage("Only pending or confirmed bookings can be cancelled");
    }

    @Test
    void ordinaryStudentCannotSearchDetailedBookings() {
        authenticate(user(7L, UserRole.STUDENT));
        when(bookingRepository.findAllByOrderByStartTimeDesc()).thenReturn(List.of());

        assertThatThrownBy(() -> service.search(null, null))
                .isInstanceOf(UnauthorizedAccessException.class)
                .hasMessage("Not permitted to search detailed bookings");
    }

    @Test
    void facultyDetailedSearchIsLimitedToOwnDepartmentClassrooms() {
        User faculty = user(8L, UserRole.FACULTY);
        authenticate(faculty);
        when(profileRepository.findByUser_Id(8L)).thenReturn(Optional.of(
                Profile.builder().user(faculty).department("CSE").build()));
        User requester = user(10L, UserRole.CR);
        var cse = com.bookingapp.classroom.Classroom.builder().id(1L).departmentOwned("CSE").build();
        var eee = com.bookingapp.classroom.Classroom.builder().id(2L).departmentOwned("EEE").build();
        Booking visible = Booking.builder().id(1L).classroom(cse).user(requester)
                .purpose("CSE event").status(BookingStatus.CONFIRMED).build();
        Booking hidden = Booking.builder().id(2L).classroom(eee).user(requester)
                .purpose("EEE event").status(BookingStatus.CONFIRMED).build();
        when(bookingRepository.findAllByOrderByStartTimeDesc()).thenReturn(List.of(visible, hidden));

        var result = service.search(null, null);

        assertThat(result).extracting(response -> response.id()).containsExactly(1L);
    }

    @Test
    void unavailableResourceIsRejectedAfterTakingTargetLock() {
        User student = user(7L, UserRole.STUDENT);
        authenticate(student);
        Instant start = Instant.parse("2026-08-28T08:00:00Z");
        Resource resource = Resource.builder().id(3L).status(ResourceStatus.MAINTENANCE).build();
        when(resourceRepository.findByIdForUpdate(3L)).thenReturn(Optional.of(resource));

        var request = new CreateBookingRequest(3L, null, start, start.plusSeconds(3600),
                "Presentation", BookingType.RESOURCE, null, null, null);

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(BookingConflictException.class)
                .hasMessage("Resource is currently unavailable");
    }

    @Test
    void approvalRechecksCurrentClassroomStatusUnderLock() {
        User admin = user(1L, UserRole.ADMIN);
        authenticate(admin);
        Classroom original = Classroom.builder().id(4L).status(ClassroomStatus.AVAILABLE).build();
        Booking booking = Booking.builder().id(20L).classroom(original).user(user(9L, UserRole.CR))
                .status(BookingStatus.PENDING_APPROVAL).build();
        Classroom locked = Classroom.builder().id(4L).status(ClassroomStatus.MAINTENANCE).build();
        when(bookingRepository.findByIdForUpdate(20L)).thenReturn(Optional.of(booking));
        when(classroomRepository.findByIdForUpdate(4L)).thenReturn(Optional.of(locked));

        assertThatThrownBy(() -> service.approve(20L))
                .isInstanceOf(BookingConflictException.class)
                .hasMessage("Classroom is currently unavailable");
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
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
