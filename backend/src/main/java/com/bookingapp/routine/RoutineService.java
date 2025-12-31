package com.bookingapp.routine;

import com.bookingapp.academicterm.AcademicTermService;
import com.bookingapp.academicterm.AcademicTermService.AcademicTermKey;
import com.bookingapp.booking.Booking;
import com.bookingapp.booking.BookingRepository;
import com.bookingapp.classroom.Classroom;
import com.bookingapp.classroom.ClassroomRepository;
import com.bookingapp.classroom.ClassroomSlotValidator;
import com.bookingapp.common.exception.InvalidRequestException;
import com.bookingapp.common.exception.ResourceNotFoundException;
import com.bookingapp.common.exception.UnauthorizedAccessException;
import com.bookingapp.common.util.SecurityUtils;
import com.bookingapp.profile.ProfileRepository;
import com.bookingapp.profile.Profile;
import com.bookingapp.routine.dto.RoutineDtos.CreateRoutineRequest;
import com.bookingapp.routine.dto.RoutineDtos.PersonalScheduleEntry;
import com.bookingapp.routine.dto.RoutineDtos.PersonalScheduleResponse;
import com.bookingapp.routine.dto.RoutineDtos.RoutineResponse;
import com.bookingapp.routine.dto.RoutineDtos.UpdateRoutineRequest;
import com.bookingapp.user.User;
import com.bookingapp.user.UserRepository;
import com.bookingapp.user.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneOffset;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Routines can be browsed by classroom, faculty, department, and cohort.
 */
@Service
@RequiredArgsConstructor
public class RoutineService {

    private static final String CACHE = "routines";

    private final RoutineRepository routineRepository;
    private final ClassroomRepository classroomRepository;
    private final ProfileRepository profileRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final AcademicTermService academicTermService;

    @Cacheable(cacheNames = CACHE, key = "{#classroomId, #facultyId, #department, #program}")
    @Transactional(readOnly = true)
    public List<RoutineResponse> search(Long classroomId, Long facultyId, String department, String program) {
        List<Routine> routines;
        if (classroomId != null) {
            routines = routineRepository.findByClassroom_Id(classroomId);
        } else if (facultyId != null) {
            routines = routineRepository.findByFaculty_Id(facultyId);
        } else {
            routines = routineRepository.findAll();
        }

        if (department != null && !department.isBlank()) {
            routines = routines.stream().filter(r -> matchesDepartment(r, department)).toList();
        }
        if (program != null && !program.isBlank()) {
            routines = routines.stream().filter(r -> program.equals(r.getProgram())).toList();
        }

        return routines.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public RoutineResponse findById(Long id) {
        return toResponse(getEntity(id));
    }

    @Transactional(readOnly = true)
    public PersonalScheduleResponse findMine() {
        Profile profile = profileRepository.findByUser_Id(SecurityUtils.currentUserId())
                .orElseThrow(() -> new ResourceNotFoundException("No profile exists for the current user"));
        AcademicTermKey currentTerm = academicTermService.resolveForDate(
                java.time.LocalDate.now(ZoneOffset.UTC));

        if (isBlank(profile.getProgram()) || isBlank(profile.getBatch())
                || isBlank(profile.getSection()) || isBlank(profile.getDepartment())) {
            return new PersonalScheduleResponse(profile.getProgram(), profile.getBatch(), profile.getSection(), profile.getDepartment(),
                    currentTerm.academicYear(), currentTerm.semester(), List.of());
        }

        List<PersonalScheduleEntry> entries = new ArrayList<>();
        routineRepository.findForCohort(profile.getProgram(), profile.getBatch(), profile.getSection(),
                        currentTerm.academicYear(), currentTerm.semester()).stream()
                .filter(routine -> matchesDepartment(routine, profile.getDepartment()))
                .map(this::toPersonalEntry)
                .forEach(entries::add);

        bookingRepository.findConfirmedForCohort(
                        profile.getProgram(), profile.getBatch(), profile.getSection()).stream()
                .map(this::toPersonalEntry)
                .forEach(entries::add);

        return new PersonalScheduleResponse(profile.getProgram(), profile.getBatch(), profile.getSection(), profile.getDepartment(),
                currentTerm.academicYear(), currentTerm.semester(), List.copyOf(entries));
    }

    private boolean matchesDepartment(Routine r, String department) {
        boolean classroomMatch = department.equals(r.getClassroom().getDepartmentOwned());
        boolean facultyMatch = profileRepository.findByUser_Id(r.getFaculty().getId())
                .map(p -> department.equals(p.getDepartment()))
                .orElse(false);
        return classroomMatch || facultyMatch;
    }

    @CacheEvict(cacheNames = CACHE, allEntries = true)
    @Transactional
    public RoutineResponse create(CreateRoutineRequest request) {
        ClassroomSlotValidator.validate(request.startTime(), request.endTime());
        validateCohort(request.program(), request.batch(), request.section());

        if (!SecurityUtils.hasAnyRole(UserRole.FACULTY, UserRole.ADMIN)) {
            throw new UnauthorizedAccessException("Only FACULTY (own courses) or ADMIN may create routines");
        }
        Long callerId = SecurityUtils.currentUserId();
        // FACULTY may only create routines for their own courses (i.e. as the
        // teaching faculty). ADMIN must assign the routine to a FACULTY user
        // via request.facultyId().
        if (SecurityUtils.hasRole(UserRole.ADMIN) && request.facultyId() == null) {
            throw new InvalidRequestException("facultyId is required when an Admin creates a routine");
        }
        Long facultyId = SecurityUtils.hasRole(UserRole.ADMIN) ? request.facultyId() : callerId;
        User faculty = findFaculty(facultyId);
        AcademicTermKey term = academicTermService.requireConfigured(request.academicYear(), request.semester());
        Classroom classroom = classroomRepository.findByIdForUpdate(request.classroomId())
                .orElseThrow(() -> ResourceNotFoundException.of("Classroom", request.classroomId()));

        assertNoOverlap(request.classroomId(), request.dayOfWeek(), request.startTime(), request.endTime(),
                term.academicYear(), term.semester(), null);
        assertNoBookingOverlap(request.classroomId(), request.dayOfWeek(), request.startTime(), request.endTime(), term);

        Routine routine = Routine.builder()
                .classroom(classroom)
                .courseCode(request.courseCode())
                .courseName(request.courseName())
                .faculty(faculty)
                .dayOfWeek(request.dayOfWeek())
                .startTime(request.startTime())
                .endTime(request.endTime())
                .semester(request.semester())
                .academicYear(request.academicYear())
                .program(request.program())
                .batch(request.batch())
                .section(request.section())
                .isRecurring(request.isRecurring())
                .build();
        return toResponse(routineRepository.save(routine));
    }

    @CacheEvict(cacheNames = CACHE, allEntries = true)
    @Transactional
    public RoutineResponse update(Long id, UpdateRoutineRequest request) {
        Routine routine = getEntity(id);
        assertOwnsOrAdmin(routine);
        ClassroomSlotValidator.validate(request.startTime(), request.endTime());
        validateCohort(request.program(), request.batch(), request.section());
        AcademicTermKey term = academicTermService.requireConfigured(request.academicYear(), request.semester());

        Long classroomId = request.classroomId() != null ? request.classroomId() : routine.getClassroom().getId();
        Classroom classroom = classroomRepository.findByIdForUpdate(classroomId)
                .orElseThrow(() -> ResourceNotFoundException.of("Classroom", classroomId));
        assertNoOverlap(classroomId, request.dayOfWeek(), request.startTime(), request.endTime(),
                term.academicYear(), term.semester(), id);
        assertNoBookingOverlap(classroomId, request.dayOfWeek(), request.startTime(), request.endTime(), term);

        routine.setClassroom(classroom);
        routine.setCourseCode(request.courseCode());
        routine.setCourseName(request.courseName());
        routine.setDayOfWeek(request.dayOfWeek());
        routine.setStartTime(request.startTime());
        routine.setEndTime(request.endTime());
        routine.setSemester(request.semester());
        routine.setAcademicYear(request.academicYear());
        routine.setProgram(request.program());
        routine.setBatch(request.batch());
        routine.setSection(request.section());
        routine.setRecurring(request.isRecurring());
        if (SecurityUtils.hasRole(UserRole.ADMIN) && request.facultyId() != null) {
            routine.setFaculty(findFaculty(request.facultyId()));
        }
        return toResponse(routine);
    }

    @CacheEvict(cacheNames = CACHE, allEntries = true)
    @Transactional
    public void delete(Long id) {
        Routine routine = getEntity(id);
        assertOwnsOrAdmin(routine);
        routineRepository.delete(routine);
    }

    Routine getEntity(Long id) {
        return routineRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Routine", id));
    }

    private void assertOwnsOrAdmin(Routine routine) {
        if (SecurityUtils.hasRole(UserRole.ADMIN)) return;
        if (SecurityUtils.hasRole(UserRole.FACULTY)
                && routine.getFaculty().getId().equals(SecurityUtils.currentUserId())) {
            return;
        }
        throw new UnauthorizedAccessException("You may only edit/delete routines for your own courses");
    }

    private User findFaculty(Long id) {
        User faculty = userRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("User", id));
        if (faculty.getRole() != UserRole.FACULTY) {
            throw new InvalidRequestException("Assigned user must have the FACULTY role");
        }
        return faculty;
    }

    private void assertNoOverlap(Long classroomId, RoutineDayOfWeek day, LocalTime start,
                                 LocalTime end, String academicYear, String semester, Long excludeId) {
        List<Routine> overlapping = routineRepository.findOverlapping(classroomId, day, start, end,
                academicYear, semester, excludeId);
        if (!overlapping.isEmpty()) {
            throw new com.bookingapp.common.exception.BookingConflictException(
                    "Classroom already has a routine slot overlapping this time in "
                            + academicYear + " · " + semester + " on " + day);
        }
    }

    private void assertNoBookingOverlap(Long classroomId, RoutineDayOfWeek day, LocalTime start,
                                        LocalTime end, AcademicTermKey term) {
        if (term.startDate() == null || term.endDate() == null) {
            // Legacy installations may intentionally rely on the configured
            // fallback term before creating explicit academic-term rows. In
            // that mode there is no date range to query, but the shared
            // classroom lock still requires us to examine active bookings;
            // otherwise a booking that commits first can race past a routine.
            boolean overlaps = bookingRepository.findByClassroom_Id(classroomId).stream()
                    .filter(booking -> booking.getStatus() == com.bookingapp.booking.BookingStatus.CONFIRMED
                            || booking.getStatus() == com.bookingapp.booking.BookingStatus.PENDING_APPROVAL)
                    .anyMatch(booking -> bookingOverlapsWeeklySlot(booking, day, start, end));
            if (overlaps) {
                throw new com.bookingapp.common.exception.BookingConflictException(
                        "Classroom already has a booking overlapping this routine slot");
            }
            return;
        }
        var windowStart = term.startDate().atStartOfDay(ZoneOffset.UTC).toInstant();
        var windowEnd = term.endDate().plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
        boolean overlaps = bookingRepository.findWindowForClassroom(classroomId, windowStart, windowEnd).stream()
                .anyMatch(booking -> bookingOverlapsWeeklySlot(booking, day, start, end));
        if (overlaps) {
            throw new com.bookingapp.common.exception.BookingConflictException(
                    "Classroom already has a booking overlapping this routine slot during the academic term");
        }
    }

    private boolean bookingOverlapsWeeklySlot(Booking booking, RoutineDayOfWeek day,
                                              LocalTime start, LocalTime end) {
        var bookingStart = booking.getStartTime().atZone(ZoneOffset.UTC);
        var bookingEnd = booking.getEndTime().atZone(ZoneOffset.UTC);
        return RoutineDayOfWeek.valueOf(bookingStart.getDayOfWeek().name()) == day
                && bookingStart.toLocalTime().isBefore(end)
                && bookingEnd.toLocalTime().isAfter(start);
    }

    private RoutineResponse toResponse(Routine r) {
        return new RoutineResponse(r.getId(), r.getClassroom().getId(), r.getCourseCode(), r.getCourseName(),
                r.getFaculty().getId(), r.getDayOfWeek(), r.getStartTime(), r.getEndTime(), r.getSemester(),
                r.getAcademicYear(), r.getProgram(), r.getBatch(), r.getSection(), r.isRecurring(), r.getCreatedAt(),
                r.getUpdatedAt());
    }

    private PersonalScheduleEntry toPersonalEntry(Routine routine) {
        return new PersonalScheduleEntry("ROUTINE", routine.getId(), null, routine.getClassroom().getId(), null,
                routine.getDayOfWeek(), routine.getStartTime(), routine.getEndTime(), routine.getCourseCode(), null);
    }

    private PersonalScheduleEntry toPersonalEntry(Booking booking) {
        var start = booking.getStartTime().atZone(ZoneOffset.UTC);
        var end = booking.getEndTime().atZone(ZoneOffset.UTC);
        Long classroomId = booking.getClassroom() != null ? booking.getClassroom().getId() : null;
        return new PersonalScheduleEntry("BOOKING", null, booking.getId(), classroomId,
                start.toLocalDate(), RoutineDayOfWeek.valueOf(start.getDayOfWeek().name()),
                start.toLocalTime(), end.toLocalTime(), null, booking.getPurpose());
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private void validateCohort(String program, String batch, String section) {
        boolean hasCohortValue = !isBlank(program) || !isBlank(batch) || !isBlank(section);
        if (!hasCohortValue) return;
        if (isBlank(program) || isBlank(batch)) {
            throw new InvalidRequestException(
                    "program and batch are required when assigning a routine to a cohort");
        }
    }
}
