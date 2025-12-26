package com.bookingapp.classroom;

import com.bookingapp.academicterm.AcademicTermService;
import com.bookingapp.academicterm.AcademicTermService.AcademicTermKey;
import com.bookingapp.booking.Booking;
import com.bookingapp.booking.BookingRepository;
import com.bookingapp.booking.BookingStatus;
import com.bookingapp.classroom.dto.ClassroomDtos.SlotStatus;
import com.bookingapp.classroom.dto.ClassroomDtos.CreateClassroomRequest;
import com.bookingapp.classroom.dto.ClassroomDtos.UpdateStatusRequest;
import com.bookingapp.common.exception.InvalidRequestException;
import com.bookingapp.routine.Routine;
import com.bookingapp.routine.RoutineDayOfWeek;
import com.bookingapp.routine.RoutineRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClassroomServiceTest {

    @Mock ClassroomRepository classroomRepository;
    @Mock RoutineRepository routineRepository;
    @Mock BookingRepository bookingRepository;
    @Mock AcademicTermService academicTermService;

    private ClassroomService service;

    @BeforeEach
    void setUp() {
        service = new ClassroomService(classroomRepository, routineRepository, bookingRepository,
                academicTermService);
    }

    @Test
    void normalizesWeekAndBucketsEveryCoveredSlot() {
        Classroom classroom = Classroom.builder().id(12L).build();
        when(classroomRepository.findById(12L)).thenReturn(Optional.of(classroom));
        Routine lab = Routine.builder()
                .classroom(classroom)
                .courseCode("CS201")
                .dayOfWeek(RoutineDayOfWeek.MONDAY)
                .startTime(LocalTime.of(8, 0))
                .endTime(LocalTime.of(10, 30))
                .academicYear("2026-2027")
                .semester("Fall")
                .build();
        Booking quiz = Booking.builder()
                .classroom(classroom)
                .startTime(Instant.parse("2026-08-19T14:30:00Z"))
                .endTime(Instant.parse("2026-08-19T15:45:00Z"))
                .purpose("Quiz")
                .status(BookingStatus.PENDING_APPROVAL)
                .build();
        when(routineRepository.findByClassroom_Id(12L)).thenReturn(List.of(lab));
        when(bookingRepository.findWindowForClassroom(eq(12L), any(), any())).thenReturn(List.of(quiz));
        when(academicTermService.resolveForAvailabilityDate(any(LocalDate.class)))
                .thenReturn(new AcademicTermKey("2026-2027", "Fall",
                        LocalDate.parse("2026-07-01"), LocalDate.parse("2026-12-31")));

        var response = service.getAvailability(12L, LocalDate.parse("2026-08-23"));

        assertThat(response.weekStart()).isEqualTo(LocalDate.parse("2026-08-17"));
        assertThat(response.weekEnd()).isEqualTo(LocalDate.parse("2026-08-23"));
        assertThat(response.days()).hasSize(7);
        assertThat(response.days().getFirst().slots().get(0).status()).isEqualTo(SlotStatus.BOOKED);
        assertThat(response.days().getFirst().slots().get(1).status()).isEqualTo(SlotStatus.BOOKED);
        assertThat(response.days().getFirst().slots().get(2).status()).isEqualTo(SlotStatus.AVAILABLE);
        assertThat(response.days().get(2).slots().get(4).source()).isEqualTo("BOOKING");
        assertThat(response.days().get(2).slots().get(4).detail()).isEqualTo("Reserved");
    }

    @Test
    void rejectsDuplicateRoomCodeIgnoringCase() {
        when(classroomRepository.existsByRoomCodeIgnoreCase("CSE-401")).thenReturn(true);
        var request = new CreateClassroomRequest(
                "cse-401", "Networks Lab", "Engineering", 4, 40,
                true, true, true, "CSE");

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage("Room code CSE-401 is already in use");
    }

    @Test
    void manualStatusChangeClearsIssueWorkflowOwnership() {
        Classroom classroom = Classroom.builder().id(12L).status(ClassroomStatus.MAINTENANCE)
                .statusManagedByIssue(true).build();
        when(classroomRepository.findByIdForUpdate(12L)).thenReturn(Optional.of(classroom));

        service.updateStatus(12L, new UpdateStatusRequest(ClassroomStatus.RESERVED));

        assertThat(classroom.getStatus()).isEqualTo(ClassroomStatus.RESERVED);
        assertThat(classroom.isStatusManagedByIssue()).isFalse();
    }

    @Test
    void pendingInspectionCannotBeSelectedManually() {
        Classroom classroom = Classroom.builder().id(12L).status(ClassroomStatus.AVAILABLE).build();
        when(classroomRepository.findByIdForUpdate(12L)).thenReturn(Optional.of(classroom));

        assertThatThrownBy(() -> service.updateStatus(
                12L, new UpdateStatusRequest(ClassroomStatus.PENDING_INSPECTION)))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage("PENDING_INSPECTION is controlled by the issue workflow");
    }
}
