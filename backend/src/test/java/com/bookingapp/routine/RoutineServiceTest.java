package com.bookingapp.routine;

import com.bookingapp.academicterm.AcademicTermService;
import com.bookingapp.academicterm.AcademicTermService.AcademicTermKey;
import com.bookingapp.booking.Booking;
import com.bookingapp.booking.BookingRepository;
import com.bookingapp.booking.BookingStatus;
import com.bookingapp.classroom.Classroom;
import com.bookingapp.classroom.ClassroomRepository;
import com.bookingapp.common.exception.BookingConflictException;
import com.bookingapp.profile.ProfileRepository;
import com.bookingapp.profile.Profile;
import com.bookingapp.routine.dto.RoutineDtos.CreateRoutineRequest;
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
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RoutineServiceTest {

    @Mock RoutineRepository routineRepository;
    @Mock ClassroomRepository classroomRepository;
    @Mock ProfileRepository profileRepository;
    @Mock BookingRepository bookingRepository;
    @Mock UserRepository userRepository;
    @Mock AcademicTermService academicTermService;

    private RoutineService service;
    private User faculty;

    @BeforeEach
    void setUp() {
        service = new RoutineService(routineRepository, classroomRepository, profileRepository,
                bookingRepository, userRepository, academicTermService);
        faculty = User.builder().id(5L).email("faculty@example.com").passwordHash("hash")
                .displayName("Faculty").role(UserRole.FACULTY).build();
        CustomUserDetails details = new CustomUserDetails(faculty);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities()));
    }

    @Test
    void routineOverlapQueryIncludesAcademicYearAndSemester() {
        CreateRoutineRequest request = request();
        Classroom classroom = Classroom.builder().id(2L).build();
        when(userRepository.findById(5L)).thenReturn(Optional.of(faculty));
        when(academicTermService.requireConfigured("2026-2027", "Fall"))
                .thenReturn(new AcademicTermKey("2026-2027", "Fall", null, null));
        when(classroomRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(classroom));
        when(routineRepository.findOverlapping(2L, RoutineDayOfWeek.MONDAY,
                LocalTime.of(8, 0), LocalTime.of(9, 15), "2026-2027", "Fall", null))
                .thenReturn(List.of());
        when(routineRepository.save(any(Routine.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.create(request);

        verify(classroomRepository).findByIdForUpdate(2L);
        verify(routineRepository).findOverlapping(2L, RoutineDayOfWeek.MONDAY,
                LocalTime.of(8, 0), LocalTime.of(9, 15), "2026-2027", "Fall", null);
    }

    @Test
    void existingBookingInTermBlocksRoutineUnderSameClassroomLock() {
        CreateRoutineRequest request = request();
        Classroom classroom = Classroom.builder().id(2L).build();
        AcademicTermKey term = new AcademicTermKey("2026-2027", "Fall",
                LocalDate.parse("2026-07-01"), LocalDate.parse("2026-12-31"));
        Booking booking = Booking.builder()
                .classroom(classroom)
                .startTime(Instant.parse("2026-09-07T08:30:00Z"))
                .endTime(Instant.parse("2026-09-07T09:00:00Z"))
                .status(BookingStatus.PENDING_APPROVAL)
                .build();
        when(userRepository.findById(5L)).thenReturn(Optional.of(faculty));
        when(academicTermService.requireConfigured("2026-2027", "Fall")).thenReturn(term);
        when(classroomRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(classroom));
        when(routineRepository.findOverlapping(any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(List.of());
        when(bookingRepository.findWindowForClassroom(eq(2L), any(), any())).thenReturn(List.of(booking));

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(BookingConflictException.class)
                .hasMessage("Classroom already has a booking overlapping this routine slot during the academic term");
    }

    @Test
    void personalScheduleUsesTermContainingTodaysDate() {
        when(profileRepository.findByUser_Id(5L)).thenReturn(Optional.of(
                Profile.builder().user(faculty).department("CSE").build()));
        when(academicTermService.resolveForDate(LocalDate.now(java.time.ZoneOffset.UTC)))
                .thenReturn(new AcademicTermKey("2026-2027", "Fall",
                        LocalDate.parse("2026-07-01"), LocalDate.parse("2026-12-31")));

        var response = service.findMine();

        assertThat(response.academicYear()).isEqualTo("2026-2027");
        assertThat(response.semester()).isEqualTo("Fall");
        assertThat(response.entries()).isEmpty();
    }

    private CreateRoutineRequest request() {
        return new CreateRoutineRequest(2L, "CSE-401", "Distributed Systems",
                RoutineDayOfWeek.MONDAY, LocalTime.of(8, 0), LocalTime.of(9, 15),
                "Fall", "2026-2027", "BSc CSE", "2026", "A", true, null);
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }
}
