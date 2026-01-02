package com.bookingapp.booking;

import com.bookingapp.academicterm.AcademicTermService;
import com.bookingapp.academicterm.AcademicTermService.AcademicTermKey;
import com.bookingapp.booking.dto.BookingDtos.BookingResponse;
import com.bookingapp.booking.dto.BookingDtos.CreateBookingRequest;
import com.bookingapp.booking.dto.BookingDtos.RejectRequest;
import com.bookingapp.classroom.Classroom;
import com.bookingapp.classroom.ClassroomRepository;
import com.bookingapp.classroom.ClassroomSlotValidator;
import com.bookingapp.classroom.ClassroomStatus;
import com.bookingapp.common.exception.BookingConflictException;
import com.bookingapp.common.exception.InvalidRequestException;
import com.bookingapp.common.exception.ResourceNotFoundException;
import com.bookingapp.common.exception.UnauthorizedAccessException;
import com.bookingapp.common.util.SecurityUtils;
import com.bookingapp.profile.Profile;
import com.bookingapp.profile.ProfileRepository;
import com.bookingapp.resource.Resource;
import com.bookingapp.resource.ResourceRepository;
import com.bookingapp.resource.ResourceStatus;
import com.bookingapp.routine.Routine;
import com.bookingapp.routine.RoutineDayOfWeek;
import com.bookingapp.routine.RoutineRepository;
import com.bookingapp.user.User;
import com.bookingapp.user.UserRepository;
import com.bookingapp.user.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.List;

/**
 * Core booking business logic:
 *  - Resource bookings vs. classroom bookings, inferred from which FK is set.
 *  - Overlap checking against other bookings, plus (for classrooms) the
 *    fixed weekly routine grid.
 *  - Approval routing: resource.requiresApproval flag for resources;
 *    department-scope comparison for classrooms.
 */
@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final ResourceRepository resourceRepository;
    private final ClassroomRepository classroomRepository;
    private final ProfileRepository profileRepository;
    private final RoutineRepository routineRepository;
    private final UserRepository userRepository;
    private final AcademicTermService academicTermService;

    @Value("${app.booking.max-duration-hours}")
    private long maxDurationHours;

    @Transactional(readOnly = true)
    public List<BookingResponse> findMine() {
        Long userId = SecurityUtils.currentUserId();
        return bookingRepository.findByUser_IdOrderByStartTimeDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> search(Long resourceId, Long classroomId) {
        List<Booking> bookings;
        if (resourceId != null) {
            bookings = bookingRepository.findByResource_IdOrderByStartTimeDesc(resourceId);
        } else if (classroomId != null) {
            bookings = bookingRepository.findByClassroom_IdOrderByStartTimeDesc(classroomId);
        } else {
            bookings = bookingRepository.findAllByOrderByStartTimeDesc();
        }
        UserRole role = SecurityUtils.currentUserRole();
        if (role == UserRole.ADMIN) {
            return bookings.stream().map(this::toResponse).toList();
        }
        if (role == UserRole.FACULTY) {
            String department = currentDepartment();
            return bookings.stream()
                    .filter(booking -> booking.getClassroom() != null
                            && department != null
                            && department.equals(booking.getClassroom().getDepartmentOwned()))
                    .map(this::toResponse)
                    .toList();
        }
        if (role == UserRole.RESOURCE_MANAGER) {
            Long callerId = SecurityUtils.currentUserId();
            return bookings.stream()
                    .filter(booking -> booking.getResource() != null
                            && booking.getResource().getManagedBy() != null
                            && callerId.equals(booking.getResource().getManagedBy().getId()))
                    .map(this::toResponse)
                    .toList();
        }
        throw new UnauthorizedAccessException("Not permitted to search detailed bookings");
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> findPending() {
        UserRole role = SecurityUtils.currentUserRole();
        List<Booking> pending = bookingRepository.findByStatusOrderByStartTimeAsc(
                BookingStatus.PENDING_APPROVAL);

        if (role == UserRole.ADMIN) {
            return pending.stream().map(this::toResponse).toList();
        }
        if (role == UserRole.FACULTY) {
            String department = currentDepartment();
            return pending.stream()
                    .filter(b -> b.getClassroom() != null
                            && isSameDepartment(b.getClassroom().getId(), department))
                    .map(this::toResponse).toList();
        }
        if (role == UserRole.RESOURCE_MANAGER) {
            Long callerId = SecurityUtils.currentUserId();
            return pending.stream()
                    .filter(b -> b.getResource() != null && managesResource(b.getResource().getId(), callerId))
                    .map(this::toResponse).toList();
        }
        throw new UnauthorizedAccessException("Not permitted to view pending bookings");
    }

    @Transactional
    public BookingResponse create(CreateBookingRequest request) {
        validateWindow(request.startTime(), request.endTime());

        if (request.resourceId() != null) {
            return createResourceBooking(request);
        } else {
            return createClassroomBooking(request);
        }
    }

    @Transactional
    public void cancel(Long id) {
        Booking booking = getEntity(id);
        assertPendingOrConfirmed(booking);
        boolean isOwner = booking.getUser().getId().equals(SecurityUtils.currentUserId());
        boolean isAdmin = SecurityUtils.hasRole(UserRole.ADMIN);
        if (!isOwner && !isAdmin) {
            throw new UnauthorizedAccessException("You may only cancel your own bookings");
        }
        booking.setStatus(BookingStatus.CANCELLED);
    }

    @Transactional
    public BookingResponse approve(Long id) {
        Booking booking = getEntity(id);
        assertPending(booking, "approved");
        assertCanApprove(booking);
        lockAndRevalidateForApproval(booking);
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setApprovedBy(getUser(SecurityUtils.currentUserId()));
        booking.setApprovedAt(Instant.now());
        return toResponse(booking);
    }

    @Transactional
    public BookingResponse reject(Long id, RejectRequest request) {
        Booking booking = getEntity(id);
        assertPending(booking, "rejected");
        assertCanApprove(booking);
        booking.setStatus(BookingStatus.REJECTED);
        booking.setApprovedBy(getUser(SecurityUtils.currentUserId()));
        booking.setApprovedAt(Instant.now());
        booking.setRejectionReason(request.reason().trim());
        return toResponse(booking);
    }

    // ---------------------------------------------------------------------
    // Resource booking flow
    // ---------------------------------------------------------------------

    private BookingResponse createResourceBooking(CreateBookingRequest request) {
        Resource resource = resourceRepository.findByIdForUpdate(request.resourceId())
                .orElseThrow(() -> ResourceNotFoundException.of("Resource", request.resourceId()));

        // All roles except MAINTENANCE_STAFF may book resources (STUDENT..ADMIN); enforce explicitly.
        if (SecurityUtils.hasRole(UserRole.MAINTENANCE_STAFF)) {
            throw new UnauthorizedAccessException("MAINTENANCE_STAFF may not book resources");
        }

        assertResourceAvailable(resource);
        assertNoBookingOverlap(request.resourceId(), null, request.startTime(), request.endTime(), null);

        BookingStatus status = resource.isRequiresApproval() ? BookingStatus.PENDING_APPROVAL : BookingStatus.CONFIRMED;

        Booking booking = Booking.builder()
                .resource(resource)
                .user(getUser(SecurityUtils.currentUserId()))
                .startTime(request.startTime())
                .endTime(request.endTime())
                .purpose(request.purpose())
                .bookingType(request.bookingType() != null ? request.bookingType() : BookingType.RESOURCE)
                .status(status)
                .build();
        if (status == BookingStatus.CONFIRMED) {
            booking.setApprovedAt(Instant.now());
        }
        return toResponse(bookingRepository.save(booking));
    }

    // ---------------------------------------------------------------------
    // Classroom booking flow
    // ---------------------------------------------------------------------

    private BookingResponse createClassroomBooking(CreateBookingRequest request) {
        Classroom classroom = classroomRepository.findByIdForUpdate(request.classroomId())
                .orElseThrow(() -> ResourceNotFoundException.of("Classroom", request.classroomId()));

        UserRole role = SecurityUtils.currentUserRole();
        // Plain STUDENT can never book a classroom — role check only, nothing scoped.
        if (role == UserRole.STUDENT) {
            throw new UnauthorizedAccessException("Students may not book classrooms");
        }
        if (role == UserRole.MAINTENANCE_STAFF) {
            throw new UnauthorizedAccessException("MAINTENANCE_STAFF may not book classrooms");
        }

        LocalTime startTime = request.startTime().atZone(ZoneOffset.UTC).toLocalTime();
        LocalTime endTime = request.endTime().atZone(ZoneOffset.UTC).toLocalTime();
        ClassroomSlotValidator.validate(startTime, endTime);
        assertCanTargetCohort(request, role, classroom);

        assertClassroomAvailable(classroom);
        assertNoBookingOverlap(null, request.classroomId(), request.startTime(), request.endTime(), null);
        assertNoRoutineOverlap(request.classroomId(), request.startTime(), request.endTime());

        BookingStatus status;
        if (role == UserRole.ADMIN) {
            status = BookingStatus.CONFIRMED;
        } else if (role == UserRole.FACULTY) {
            String department = currentDepartment();
            boolean ownDept = department != null && department.equals(classroom.getDepartmentOwned());
            status = ownDept ? BookingStatus.CONFIRMED : BookingStatus.PENDING_APPROVAL;
        } else {
            // CR, RESOURCE_MANAGER
            status = BookingStatus.PENDING_APPROVAL;
        }

        Booking booking = Booking.builder()
                .classroom(classroom)
                .user(getUser(SecurityUtils.currentUserId()))
                .startTime(request.startTime())
                .endTime(request.endTime())
                .purpose(request.purpose())
                .bookingType(request.bookingType() != null ? request.bookingType() : BookingType.ACADEMIC)
                .targetProgram(request.targetProgram())
                .targetBatch(request.targetBatch())
                .targetSection(request.targetSection())
                .status(status)
                .build();
        if (status == BookingStatus.CONFIRMED) {
            booking.setApprovedAt(Instant.now());
            if (role == UserRole.ADMIN || role == UserRole.FACULTY) {
                booking.setApprovedBy(getUser(SecurityUtils.currentUserId()));
            }
        }
        return toResponse(bookingRepository.save(booking));
    }

    // ---------------------------------------------------------------------
    // Approval permission checks
    // ---------------------------------------------------------------------

    private void assertCanApprove(Booking booking) {
        UserRole role = SecurityUtils.currentUserRole();
        if (role == UserRole.ADMIN) return;

        if (booking.getClassroom() != null && role == UserRole.FACULTY) {
            String department = currentDepartment();
            if (isSameDepartment(booking.getClassroom().getId(), department)) {
                return;
            }
        }
        if (booking.getResource() != null && role == UserRole.RESOURCE_MANAGER) {
            if (managesResource(booking.getResource().getId(), SecurityUtils.currentUserId())) {
                return;
            }
        }
        throw new UnauthorizedAccessException("Not permitted to approve/reject this booking");
    }

    private void assertCanTargetCohort(CreateBookingRequest request, UserRole role, Classroom classroom) {
        if (isBlank(request.targetProgram())
                && isBlank(request.targetBatch())
                && isBlank(request.targetSection())) {
            return;
        }
        if (isBlank(request.targetProgram()) || isBlank(request.targetBatch())) {
            throw new InvalidRequestException(
                    "targetProgram and targetBatch are required when targeting a cohort");
        }
        if (role == UserRole.CR) {
            Profile profile = currentProfile();
            if (!request.targetProgram().equals(profile.getProgram())
                    || !request.targetBatch().equals(profile.getBatch())
                    || request.targetSection() == null
                    || !request.targetSection().equals(profile.getSection())) {
                throw new UnauthorizedAccessException(
                        "CR may only target their own program, batch, and section");
            }
            return;
        }

        if (role == UserRole.FACULTY) {
            String department = currentProfile().getDepartment();
            if (department == null || !department.equals(classroom.getDepartmentOwned())) {
                throw new UnauthorizedAccessException("FACULTY may only target cohorts in their own department");
            }
        }
        // ADMIN and RESOURCE_MANAGER may target any cohort.
    }

    // ---------------------------------------------------------------------
    // Overlap checks
    // ---------------------------------------------------------------------

    private void assertNoBookingOverlap(Long resourceId, Long classroomId, Instant start, Instant end, Long excludeId) {
        List<Booking> overlaps = bookingRepository.findOverlapping(resourceId, classroomId, start, end, excludeId);
        if (!overlaps.isEmpty()) {
            throw new BookingConflictException("Requested time overlaps with an existing booking");
        }
    }

    private void assertNoRoutineOverlap(Long classroomId, Instant start, Instant end) {
        // A booking may span multiple calendar days in theory, but classrooms
        // are checked against the fixed weekly grid per day-of-week/time-of-day.
        // For the common case (single-day booking) this checks that one day;
        // multi-day spans are rejected outright since routines repeat weekly
        // and a >24h classroom booking is not a sensible use case anyway.
        RoutineDayOfWeek day = toRoutineDay(start);
        LocalTime startTime = start.atZone(ZoneOffset.UTC).toLocalTime();
        LocalTime endTime = end.atZone(ZoneOffset.UTC).toLocalTime();
        AcademicTermKey term = academicTermService.resolveForDate(start.atZone(ZoneOffset.UTC).toLocalDate());
        List<Routine> overlaps = routineRepository.findOverlapping(classroomId, day, startTime, endTime,
                term.academicYear(), term.semester(), null);
        if (!overlaps.isEmpty()) {
            throw new BookingConflictException("Requested time overlaps with a fixed routine slot for this classroom");
        }
    }

    /** Repeats state and overlap validation when a pending request is approved. */
    private void lockAndRevalidateForApproval(Booking booking) {
        if (booking.getResource() != null) {
            Resource resource = resourceRepository.findByIdForUpdate(booking.getResource().getId())
                    .orElseThrow(() -> ResourceNotFoundException.of("Resource", booking.getResource().getId()));
            assertResourceAvailable(resource);
            assertNoBookingOverlap(resource.getId(), null, booking.getStartTime(), booking.getEndTime(), booking.getId());
            return;
        }

        Classroom classroom = classroomRepository.findByIdForUpdate(booking.getClassroom().getId())
                .orElseThrow(() -> ResourceNotFoundException.of("Classroom", booking.getClassroom().getId()));
        assertClassroomAvailable(classroom);
        assertNoBookingOverlap(null, classroom.getId(), booking.getStartTime(), booking.getEndTime(), booking.getId());
        assertNoRoutineOverlap(classroom.getId(), booking.getStartTime(), booking.getEndTime());
    }

    private void assertResourceAvailable(Resource resource) {
        if (resource.getStatus() != ResourceStatus.AVAILABLE) {
            throw new BookingConflictException("Resource is currently unavailable");
        }
    }

    private void assertClassroomAvailable(Classroom classroom) {
        if (classroom.getStatus() != ClassroomStatus.AVAILABLE) {
            throw new BookingConflictException("Classroom is currently unavailable");
        }
    }

    private RoutineDayOfWeek toRoutineDay(Instant instant) {
        java.time.DayOfWeek javaDay = instant.atZone(ZoneOffset.UTC).getDayOfWeek();
        return RoutineDayOfWeek.valueOf(javaDay.name());
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    private void validateWindow(Instant start, Instant end) {
        if (start == null || end == null || !start.isBefore(end)) {
            throw new InvalidRequestException("startTime must be before endTime");
        }
        Duration duration = Duration.between(start, end);
        if (duration.compareTo(Duration.ofHours(maxDurationHours)) > 0) {
            throw new InvalidRequestException("Booking duration may not exceed " + maxDurationHours + " hours");
        }
    }

    private void assertPending(Booking booking, String resultingState) {
        if (booking.getStatus() != BookingStatus.PENDING_APPROVAL) {
            throw new InvalidRequestException("Only pending bookings can be " + resultingState);
        }
    }

    private void assertPendingOrConfirmed(Booking booking) {
        if (booking.getStatus() != BookingStatus.PENDING_APPROVAL
                && booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new InvalidRequestException("Only pending or confirmed bookings can be cancelled");
        }
    }

    private String currentDepartment() {
        return profileRepository.findByUser_Id(SecurityUtils.currentUserId()).map(Profile::getDepartment).orElse(null);
    }

    private Profile currentProfile() {
        return profileRepository.findByUser_Id(SecurityUtils.currentUserId())
                .orElseThrow(() -> new ResourceNotFoundException("No profile exists for the current user"));
    }

    private boolean isSameDepartment(Long classroomId, String department) {
        if (department == null) return false;
        return classroomRepository.findById(classroomId)
                .map(Classroom::getDepartmentOwned)
                .map(department::equals)
                .orElse(false);
    }

    private boolean managesResource(Long resourceId, Long callerId) {
        return resourceRepository.findById(resourceId)
                .map(Resource::getManagedBy)
                .map(User::getId)
                .map(callerId::equals)
                .orElse(false);
    }

    Booking getEntity(Long id) {
        return bookingRepository.findByIdForUpdate(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Booking", id));
    }

    private User getUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("User", id));
    }

    private BookingResponse toResponse(Booking b) {
        Long resourceId = b.getResource() != null ? b.getResource().getId() : null;
        Long classroomId = b.getClassroom() != null ? b.getClassroom().getId() : null;
        Long approvedById = b.getApprovedBy() != null ? b.getApprovedBy().getId() : null;
        return new BookingResponse(b.getId(), resourceId, classroomId, b.getUser().getId(),
                b.getUser().getDisplayName(),
                b.getStartTime(), b.getEndTime(), b.getPurpose(), b.getBookingType(), b.getTargetProgram(),
                b.getTargetBatch(), b.getTargetSection(), b.getStatus(), approvedById,
                b.getApprovedAt(), b.getRejectionReason(), b.getCreatedAt());
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
