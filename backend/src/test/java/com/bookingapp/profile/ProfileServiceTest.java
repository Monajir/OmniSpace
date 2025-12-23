package com.bookingapp.profile;

import com.bookingapp.common.exception.UnauthorizedAccessException;
import com.bookingapp.profile.dto.ProfileDtos.AdminUpdateAcademicProfileRequest;
import com.bookingapp.profile.dto.ProfileDtos.UpdateMyProfileRequest;
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
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.lang.reflect.Method;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProfileServiceTest {

    @Mock ProfileRepository profileRepository;
    @Mock UserRepository userRepository;

    private ProfileService service;

    @BeforeEach
    void setUp() {
        service = new ProfileService(profileRepository, userRepository);
    }

    @Test
    void getProfileUsesWritableTransactionBecauseItMayCreateProfile() throws Exception {
        Method method = service.getClass().getMethod("getProfile", Long.class);
        Transactional transactional = method.getAnnotation(Transactional.class);

        assertThat(transactional).isNotNull();
        assertThat(transactional.readOnly()).isFalse();
    }

    @Test
    void selfUpdateOnlyChangesContactInformation() {
        User user = user(7L, UserRole.CR);
        authenticate(user);
        Profile profile = Profile.builder()
                .user(user)
                .department("CSE")
                .program("BSc CSE")
                .batch("2025")
                .section("A")
                .contactNumber("old")
                .build();
        when(profileRepository.findByUser_Id(7L)).thenReturn(java.util.Optional.of(profile));

        var response = service.updateMyProfile(new UpdateMyProfileRequest("  +8801700000000  "));

        assertThat(response.contactNumber()).isEqualTo("+8801700000000");
        assertThat(response.department()).isEqualTo("CSE");
        assertThat(response.program()).isEqualTo("BSc CSE");
        assertThat(response.batch()).isEqualTo("2025");
        assertThat(response.section()).isEqualTo("A");
    }

    @Test
    void adminCanUpdateTrustedAcademicAssignments() {
        authenticate(user(99L, UserRole.ADMIN));
        User target = user(7L, UserRole.CR);
        Profile profile = Profile.builder().user(target).contactNumber("unchanged").build();
        when(profileRepository.findByUser_Id(7L)).thenReturn(java.util.Optional.of(profile));

        var response = service.updateAcademicProfile(7L, new AdminUpdateAcademicProfileRequest(
                " CSE ", " 2025-001 ", null, null, " 2025-2026 ",
                " BSc CSE ", " 2025 ", " A "));

        assertThat(response.department()).isEqualTo("CSE");
        assertThat(response.studentId()).isEqualTo("2025-001");
        assertThat(response.program()).isEqualTo("BSc CSE");
        assertThat(response.contactNumber()).isEqualTo("unchanged");
    }

    @Test
    void nonAdminCannotUpdateTrustedAcademicAssignments() {
        authenticate(user(7L, UserRole.CR));

        assertThatThrownBy(() -> service.updateAcademicProfile(7L,
                new AdminUpdateAcademicProfileRequest(null, null, null, null,
                        null, null, null, null)))
                .isInstanceOf(UnauthorizedAccessException.class)
                .hasMessage("Only ADMIN may edit institutional assignments");
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
