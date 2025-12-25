package com.bookingapp.classroom;

import com.bookingapp.academicterm.AcademicTermService;
import com.bookingapp.academicterm.AcademicTermService.AcademicTermKey;
import com.bookingapp.booking.Booking;
import com.bookingapp.booking.BookingRepository;
import com.bookingapp.classroom.dto.ClassroomDtos.ClassroomResponse;
import com.bookingapp.classroom.dto.ClassroomDtos.CreateClassroomRequest;
import com.bookingapp.classroom.dto.ClassroomDtos.UpdateClassroomRequest;
import com.bookingapp.classroom.dto.ClassroomDtos.UpdateStatusRequest;
import com.bookingapp.classroom.dto.ClassroomDtos.DaySlots;
import com.bookingapp.classroom.dto.ClassroomDtos.SlotAvailability;
import com.bookingapp.classroom.dto.ClassroomDtos.SlotStatus;
import com.bookingapp.classroom.dto.ClassroomDtos.WeeklyAvailabilityResponse;
import com.bookingapp.common.exception.ResourceNotFoundException;
import com.bookingapp.common.exception.InvalidRequestException;
import com.bookingapp.routine.Routine;
import com.bookingapp.routine.RoutineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ClassroomService {

    private static final String CACHE = "classrooms";

    private final ClassroomRepository classroomRepository;
    private final RoutineRepository routineRepository;
    private final BookingRepository bookingRepository;
    private final AcademicTermService academicTermService;

    @Cacheable(cacheNames = CACHE, key = "'all'")
    @Transactional(readOnly = true)
    public List<ClassroomResponse> findAll() {
        return classroomRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Cacheable(cacheNames = CACHE, key = "#id")
    @Transactional(readOnly = true)
    public ClassroomResponse findById(Long id) {
        return toResponse(getEntity(id));
    }

    @CacheEvict(cacheNames = CACHE, allEntries = true)
    @Transactional
    public ClassroomResponse create(CreateClassroomRequest request) {
        String roomCode = request.roomCode().trim().toUpperCase();
        if (classroomRepository.existsByRoomCodeIgnoreCase(roomCode)) {
            throw new InvalidRequestException("Room code " + roomCode + " is already in use");
        }
        Classroom classroom = Classroom.builder()
                .roomCode(roomCode)
                .name(request.name())
                .building(request.building())
                .floor(request.floor())
                .capacity(request.capacity())
                .hasProjector(request.hasProjector())
                .hasWhiteboard(request.hasWhiteboard())
                .isLab(request.isLab())
                .departmentOwned(request.departmentOwned())
                .status(ClassroomStatus.AVAILABLE)
                .build();
        return toResponse(classroomRepository.save(classroom));
    }

    @CacheEvict(cacheNames = CACHE, allEntries = true)
    @Transactional
    public ClassroomResponse update(Long id, UpdateClassroomRequest request) {
        Classroom classroom = getEntity(id);
        classroom.setName(request.name());
        classroom.setBuilding(request.building());
        classroom.setFloor(request.floor());
        classroom.setCapacity(request.capacity());
        classroom.setHasProjector(request.hasProjector());
        classroom.setHasWhiteboard(request.hasWhiteboard());
        classroom.setLab(request.isLab());
        classroom.setDepartmentOwned(request.departmentOwned());
        return toResponse(classroom);
    }

    @CacheEvict(cacheNames = CACHE, allEntries = true)
    @Transactional
    public void delete(Long id) {
        Classroom classroom = getEntity(id);
        classroomRepository.delete(classroom);
    }

    @CacheEvict(cacheNames = CACHE, allEntries = true)
    @Transactional
    public ClassroomResponse updateStatus(Long id, UpdateStatusRequest request) {
        Classroom classroom = classroomRepository.findByIdForUpdate(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Classroom", id));
        if (request.status() == ClassroomStatus.PENDING_INSPECTION) {
            throw new InvalidRequestException("PENDING_INSPECTION is controlled by the issue workflow");
        }
        classroom.setStatus(request.status());
        classroom.setStatusManagedByIssue(false);
        return toResponse(classroom);
    }

    @Transactional(readOnly = true)
    public WeeklyAvailabilityResponse getAvailability(Long classroomId, LocalDate requestedWeekStart) {
        getEntity(classroomId); // 404 if missing
        LocalDate anchor = requestedWeekStart != null ? requestedWeekStart : LocalDate.now(ZoneOffset.UTC);
        LocalDate weekStart = anchor.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate weekEnd = weekStart.plusDays(6);
        Instant from = weekStart.atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant to = weekEnd.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();

        List<Booking> bookings = bookingRepository.findWindowForClassroom(classroomId, from, to);
        List<Routine> routines = routineRepository.findByClassroom_Id(classroomId);
        List<DaySlots> days = new ArrayList<>();

        for (int dayOffset = 0; dayOffset < 7; dayOffset++) {
            LocalDate date = weekStart.plusDays(dayOffset);
            List<SlotAvailability> slots = availableSlots();
            AcademicTermKey term = academicTermService.resolveForAvailabilityDate(date);

            for (Routine r : routines) {
                if (term != null
                        && term.academicYear().equals(r.getAcademicYear())
                        && term.semester().equalsIgnoreCase(r.getSemester())
                        && r.getDayOfWeek().name().equals(date.getDayOfWeek().name())) {
                    markBusy(slots, r.getStartTime(), r.getEndTime(), "ROUTINE", r.getCourseCode());
                }
            }

            for (Booking booking : bookings) {
                var bookingStart = booking.getStartTime().atZone(ZoneOffset.UTC);
                if (bookingStart.toLocalDate().equals(date)) {
                    markBusy(slots, bookingStart.toLocalTime(),
                            booking.getEndTime().atZone(ZoneOffset.UTC).toLocalTime(),
                            "BOOKING", "Reserved");
                }
            }

            days.add(new DaySlots(date, date.getDayOfWeek().name(), List.copyOf(slots)));
        }

        return new WeeklyAvailabilityResponse(classroomId, weekStart, weekEnd, List.copyOf(days));
    }

    private List<SlotAvailability> availableSlots() {
        List<SlotAvailability> slots = new ArrayList<>();
        for (ClassroomTimeSlot slot : ClassroomTimeSlot.values()) {
            slots.add(new SlotAvailability(slot, slot.getLabel(), SlotStatus.AVAILABLE, null, null));
        }
        return slots;
    }

    private void markBusy(List<SlotAvailability> slots, java.time.LocalTime start, java.time.LocalTime end,
                          String source, String detail) {
        for (ClassroomTimeSlot covered : ClassroomSlotValidator.coveredSlots(start, end)) {
            int index = covered.ordinal();
            slots.set(index, new SlotAvailability(covered, covered.getLabel(), SlotStatus.BOOKED,
                    source, detail));
        }
    }

    Classroom getEntity(Long id) {
        return classroomRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Classroom", id));
    }

    private ClassroomResponse toResponse(Classroom c) {
        return new ClassroomResponse(c.getId(), c.getRoomCode(), c.getName(), c.getBuilding(), c.getFloor(),
                c.getCapacity(), c.isHasProjector(), c.isHasWhiteboard(), c.isLab(), c.getDepartmentOwned(),
                c.getStatus(), c.getCreatedAt());
    }
}
