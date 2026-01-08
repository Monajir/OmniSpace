package com.bookingapp;

import com.bookingapp.auth.AuthService;
import com.bookingapp.auth.RefreshTokenRepository;
import com.bookingapp.auth.dto.AuthDtos.LoginRequest;
import com.bookingapp.auth.dto.AuthDtos.RegisterRequest;
import com.bookingapp.booking.Booking;
import com.bookingapp.booking.BookingRepository;
import com.bookingapp.booking.BookingService;
import com.bookingapp.booking.BookingStatus;
import com.bookingapp.booking.BookingType;
import com.bookingapp.booking.dto.BookingDtos.CreateBookingRequest;
import com.bookingapp.classroom.Classroom;
import com.bookingapp.classroom.ClassroomRepository;
import com.bookingapp.classroom.ClassroomStatus;
import com.bookingapp.common.exception.BookingConflictException;
import com.bookingapp.common.exception.InvalidRequestException;
import com.bookingapp.common.exception.UnauthorizedAccessException;
import com.bookingapp.profile.Profile;
import com.bookingapp.profile.ProfileRepository;
import com.bookingapp.profile.ProfileService;
import com.bookingapp.profile.dto.ProfileDtos.UpdateMyProfileRequest;
import com.bookingapp.resource.Resource;
import com.bookingapp.resource.ResourceRepository;
import com.bookingapp.resource.ResourceService;
import com.bookingapp.resource.ResourceStatus;
import com.bookingapp.resource.dto.ResourceDtos.CreateResourceRequest;
import com.bookingapp.routine.RoutineDayOfWeek;
import com.bookingapp.routine.RoutineRepository;
import com.bookingapp.routine.RoutineService;
import com.bookingapp.routine.dto.RoutineDtos.CreateRoutineRequest;
import com.bookingapp.security.CustomUserDetails;
import com.bookingapp.user.User;
import com.bookingapp.user.UserRepository;
import com.bookingapp.user.UserRole;
import com.bookingapp.user.UserService;
import com.bookingapp.user.dto.UserDtos.ChangePasswordRequest;
import com.bookingapp.user.dto.UserDtos.ChangeRoleRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Phase 5 regression suite. These tests deliberately use PostgreSQL rather
 * than H2 because row locking and Flyway/Hibernate compatibility are part of
 * the behavior being protected.
 */
@SpringBootTest(properties = {
        "spring.cache.type=none",
        "spring.task.scheduling.enabled=false",
        "app.jwt.secret=phase-five-integration-secret-that-is-at-least-32-bytes"
})
@Testcontainers
class Phase5PostgresIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("omnispace_phase5")
            .withUsername("omnispace")
            .withPassword("omnispace");

    @DynamicPropertySource
    static void postgresProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired JdbcTemplate jdbc;
    @Autowired UserRepository userRepository;
    @Autowired ProfileRepository profileRepository;
    @Autowired ResourceRepository resourceRepository;
    @Autowired ClassroomRepository classroomRepository;
    @Autowired BookingRepository bookingRepository;
    @Autowired RoutineRepository routineRepository;
    @Autowired RefreshTokenRepository refreshTokenRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired AuthService authService;
    @Autowired UserService userService;
    @Autowired ProfileService profileService;
    @Autowired ResourceService resourceService;
    @Autowired BookingService bookingService;
    @Autowired RoutineService routineService;

    @BeforeEach
    void cleanDatabase() {
        SecurityContextHolder.clearContext();
        jdbc.execute("TRUNCATE TABLE issue_reports, bookings, routines, profiles, refresh_tokens, "
                + "resources, classrooms, academic_terms, users RESTART IDENTITY CASCADE");
    }

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void selfServiceProfileUpdateCannotChangeTrustedAcademicAssignment() {
        User student = user("student@example.com", UserRole.CR);
        profileRepository.save(Profile.builder().user(student).department("CSE")
                .program("BSc CSE").batch("2025").section("A").build());
        authenticate(student);

        var response = profileService.updateMyProfile(new UpdateMyProfileRequest(" 01700000000 "));

        assertThat(response.contactNumber()).isEqualTo("01700000000");
        assertThat(response.department()).isEqualTo("CSE");
        assertThat(response.program()).isEqualTo("BSc CSE");
        assertThat(response.batch()).isEqualTo("2025");
        assertThat(response.section()).isEqualTo("A");

        User faculty = user("faculty@example.com", UserRole.FACULTY);
        profileRepository.save(Profile.builder().user(faculty).department("EEE").build());
        authenticate(faculty);
        var facultyResponse = profileService.updateMyProfile(new UpdateMyProfileRequest("01800000000"));
        assertThat(facultyResponse.department()).isEqualTo("EEE");
    }

    @Test
    void ordinaryUsersCannotSearchDetailedBookingsAndManagersOnlySeeTheirResources() {
        User student = user("student@example.com", UserRole.STUDENT);
        User owner = user("owner@example.com", UserRole.RESOURCE_MANAGER);
        User otherManager = user("other@example.com", UserRole.RESOURCE_MANAGER);
        Resource owned = resource("Owned projector", ResourceStatus.AVAILABLE, owner, true);
        Resource other = resource("Other projector", ResourceStatus.AVAILABLE, otherManager, true);
        bookingRepository.saveAll(List.of(
                booking(student, owned, Instant.now().plus(1, ChronoUnit.DAYS)),
                booking(student, other, Instant.now().plus(2, ChronoUnit.DAYS))));

        authenticate(student);
        assertThatThrownBy(() -> bookingService.search(null, null))
                .isInstanceOf(UnauthorizedAccessException.class);

        authenticate(owner);
        var visible = bookingService.search(null, null);
        assertThat(visible).hasSize(1);
        assertThat(visible.getFirst().resourceId()).isEqualTo(owned.getId());
    }

    @Test
    void unavailableAssetsAndInvalidManagerAssignmentsAreRejected() {
        User student = user("student@example.com", UserRole.STUDENT);
        User admin = user("admin@example.com", UserRole.ADMIN);
        Resource unavailable = resource("Broken projector", ResourceStatus.UNAVAILABLE, null, false);

        authenticate(student);
        Instant start = Instant.now().plus(1, ChronoUnit.DAYS).truncatedTo(ChronoUnit.MINUTES);
        assertThatThrownBy(() -> bookingService.create(resourceRequest(unavailable.getId(), start)))
                .isInstanceOf(BookingConflictException.class)
                .hasMessageContaining("unavailable");

        authenticate(admin);
        assertThatThrownBy(() -> resourceService.create(
                new CreateResourceRequest("Camera", "AV", "Lab", 1, true, student.getId())))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessageContaining("RESOURCE_MANAGER");
    }

    @Test
    void roleChangeIsBlockedWhileResourcesRemainAssigned() {
        User admin = user("admin@example.com", UserRole.ADMIN);
        User manager = user("manager@example.com", UserRole.RESOURCE_MANAGER);
        resource("Projector", ResourceStatus.AVAILABLE, manager, true);
        authenticate(admin);

        assertThatThrownBy(() -> userService.changeRole(
                manager.getId(), new ChangeRoleRequest(UserRole.STUDENT)))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessageContaining("Reassign");
    }

    @Test
    void mixedCaseEmailRegistrationAndLoginUseOneCanonicalAccount() {
        MockHttpServletResponse registerResponse = new MockHttpServletResponse();
        var registered = authService.register(
                new RegisterRequest("  Leo@GMail.COM  ", "12345678", "Leo"), registerResponse);

        assertThat(registered.user().email()).isEqualTo("leo@gmail.com");
        assertThat(userRepository.count()).isEqualTo(1);

        var loggedIn = authService.login(
                new LoginRequest("LEO@gmail.com", "12345678"), new MockHttpServletResponse());
        assertThat(loggedIn.user().id()).isEqualTo(registered.user().id());
        assertThat(userRepository.count()).isEqualTo(1);
    }

    @Test
    void passwordChangeRevokesEveryActiveRefreshSession() {
        MockHttpServletResponse first = new MockHttpServletResponse();
        var registration = authService.register(
                new RegisterRequest("leo@example.com", "12345678", "Leo"), first);
        authService.login(new LoginRequest("leo@example.com", "12345678"), new MockHttpServletResponse());
        User leo = userRepository.findById(registration.user().id()).orElseThrow();
        assertThat(refreshTokenRepository.findAllByUserIdAndRevokedAtIsNull(leo.getId())).hasSize(2);

        authenticate(leo);
        userService.changePassword(new ChangePasswordRequest("12345678", "new-password-123"));

        assertThat(refreshTokenRepository.findAllByUserIdAndRevokedAtIsNull(leo.getId())).isEmpty();
        assertThat(first.getCookie("refresh_token")).isNotNull();
    }

    @Test
    void simultaneousResourceBookingsAllowOnlyOneWinner() throws Exception {
        User firstStudent = user("first@example.com", UserRole.STUDENT);
        User secondStudent = user("second@example.com", UserRole.STUDENT);
        Resource resource = resource("Projector", ResourceStatus.AVAILABLE, null, false);
        Instant start = Instant.now().plus(2, ChronoUnit.DAYS).truncatedTo(ChronoUnit.MINUTES);

        List<Throwable> failures = race(
                () -> as(firstStudent, () -> bookingService.create(resourceRequest(resource.getId(), start))),
                () -> as(secondStudent, () -> bookingService.create(resourceRequest(resource.getId(), start))));

        assertThat(bookingRepository.findByResource_Id(resource.getId())).hasSize(1);
        assertThat(failures).hasSize(1);
        assertThat(failures.getFirst()).isInstanceOf(BookingConflictException.class);
    }

    @Test
    void simultaneousApprovalAttemptsAllowOnlyOneStateTransition() throws Exception {
        User student = user("student@example.com", UserRole.STUDENT);
        User firstAdmin = user("admin1@example.com", UserRole.ADMIN);
        User secondAdmin = user("admin2@example.com", UserRole.ADMIN);
        Resource resource = resource("Projector", ResourceStatus.AVAILABLE, null, true);
        Booking pending = bookingRepository.save(booking(
                student, resource, Instant.now().plus(3, ChronoUnit.DAYS)));

        List<Throwable> failures = race(
                () -> as(firstAdmin, () -> bookingService.approve(pending.getId())),
                () -> as(secondAdmin, () -> bookingService.approve(pending.getId())));

        assertThat(failures).hasSize(1);
        assertThat(failures.getFirst()).isInstanceOf(InvalidRequestException.class);
        Booking saved = bookingRepository.findById(pending.getId()).orElseThrow();
        assertThat(saved.getStatus()).isEqualTo(BookingStatus.CONFIRMED);
        assertThat(saved.getApprovedBy()).isNotNull();
    }

    @Test
    void simultaneousClassroomBookingsAllowOnlyOneWinner() throws Exception {
        User firstCr = cohortUser("cr1@example.com", UserRole.CR);
        User secondCr = cohortUser("cr2@example.com", UserRole.CR);
        Classroom classroom = classroomRepository.save(Classroom.builder().roomCode("CSE-401")
                .name("Seminar room").departmentOwned("CSE").status(ClassroomStatus.AVAILABLE).build());
        Instant start = nextWeekdayAtEight();
        CreateBookingRequest request = classroomRequest(classroom.getId(), start);

        List<Throwable> failures = race(
                () -> as(firstCr, () -> bookingService.create(request)),
                () -> as(secondCr, () -> bookingService.create(request)));

        assertThat(bookingRepository.findByClassroom_Id(classroom.getId())).hasSize(1);
        assertThat(failures).hasSize(1);
        assertThat(failures.getFirst()).isInstanceOf(BookingConflictException.class);
    }

    @Test
    void routineAndClassroomBookingShareOneSerializationPoint() throws Exception {
        User admin = user("admin@example.com", UserRole.ADMIN);
        User faculty = cohortUser("faculty@example.com", UserRole.FACULTY);
        Classroom classroom = classroomRepository.save(Classroom.builder().roomCode("CSE-402")
                .name("Concurrency room").departmentOwned("CSE").status(ClassroomStatus.AVAILABLE).build());
        Instant start = nextWeekdayAtEight();
        RoutineDayOfWeek day = RoutineDayOfWeek.valueOf(
                start.atZone(ZoneOffset.UTC).getDayOfWeek().name());
        CreateRoutineRequest routine = new CreateRoutineRequest(classroom.getId(), "CSE499",
                "Concurrency Lab", day, LocalTime.of(8, 0), LocalTime.of(9, 15), "Fall",
                "2025-2026", "BSc CSE", "2025", "A", true, null);

        List<Throwable> failures = race(
                () -> as(faculty, () -> routineService.create(routine)),
                () -> as(admin, () -> bookingService.create(classroomRequest(classroom.getId(), start))));

        assertThat(routineRepository.findByClassroom_Id(classroom.getId()).size()
                + bookingRepository.findByClassroom_Id(classroom.getId()).size()).isEqualTo(1);
        assertThat(failures).hasSize(1);
        assertThat(failures.getFirst()).isInstanceOf(BookingConflictException.class);
    }

    private User user(String email, UserRole role) {
        return userRepository.save(User.builder().email(email).passwordHash(passwordEncoder.encode("12345678"))
                .displayName(email.substring(0, email.indexOf('@'))).role(role).build());
    }

    private User cohortUser(String email, UserRole role) {
        User user = user(email, role);
        profileRepository.save(Profile.builder().user(user).department("CSE")
                .program("BSc CSE").batch("2025").section("A").build());
        return user;
    }

    private Resource resource(String name, ResourceStatus status, User manager, boolean approval) {
        return resourceRepository.save(Resource.builder().name(name).status(status).managedBy(manager)
                .requiresApproval(approval).build());
    }

    private Booking booking(User user, Resource resource, Instant start) {
        return Booking.builder().user(user).resource(resource).startTime(start)
                .endTime(start.plus(1, ChronoUnit.HOURS)).purpose("Phase 5 test")
                .bookingType(BookingType.RESOURCE).status(BookingStatus.PENDING_APPROVAL).build();
    }

    private CreateBookingRequest resourceRequest(Long resourceId, Instant start) {
        return new CreateBookingRequest(resourceId, null, start, start.plus(1, ChronoUnit.HOURS),
                "Phase 5 concurrent booking", BookingType.RESOURCE, null, null, null);
    }

    private CreateBookingRequest classroomRequest(Long classroomId, Instant start) {
        return new CreateBookingRequest(null, classroomId, start, start.plus(75, ChronoUnit.MINUTES),
                "Phase 5 classroom concurrency", BookingType.ACADEMIC, "BSc CSE", "2025", "A");
    }

    private Instant nextWeekdayAtEight() {
        LocalDate date = LocalDate.now(ZoneOffset.UTC).plusDays(14);
        while (date.getDayOfWeek().getValue() > 5) date = date.plusDays(1);
        return date.atTime(8, 0).toInstant(ZoneOffset.UTC);
    }

    private void authenticate(User user) {
        CustomUserDetails details = new CustomUserDetails(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities()));
    }

    private void as(User user, ThrowingAction action) throws Exception {
        try {
            authenticate(user);
            action.run();
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private List<Throwable> race(ThrowingAction first, ThrowingAction second) throws Exception {
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<Throwable> one = pool.submit(() -> runRacer(ready, start, first));
            Future<Throwable> two = pool.submit(() -> runRacer(ready, start, second));
            ready.await();
            start.countDown();
            return java.util.stream.Stream.of(one.get(), two.get())
                    .filter(java.util.Objects::nonNull)
                    .toList();
        } finally {
            pool.shutdownNow();
        }
    }

    private Throwable runRacer(CountDownLatch ready, CountDownLatch start, ThrowingAction action) {
        ready.countDown();
        try {
            start.await();
            action.run();
            return null;
        } catch (Throwable error) {
            return error;
        }
    }

    @FunctionalInterface
    private interface ThrowingAction {
        void run() throws Exception;
    }
}
