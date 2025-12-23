package com.bookingapp.user;

import com.bookingapp.common.exception.InvalidRequestException;
import com.bookingapp.resource.ResourceRepository;
import com.bookingapp.auth.RefreshTokenRepository;
import com.bookingapp.security.CustomUserDetails;
import com.bookingapp.user.dto.UserDtos.ChangeRoleRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.ArgumentMatchers.any;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock UserRepository userRepository;
    @Mock ResourceRepository resourceRepository;
    @Mock RefreshTokenRepository refreshTokenRepository;
    @Mock PasswordEncoder passwordEncoder;

    private UserService service;

    @BeforeEach
    void setUp() {
        service = new UserService(userRepository, resourceRepository, refreshTokenRepository, passwordEncoder);
        authenticate(user(99L, UserRole.ADMIN));
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void blocksRoleChangeWhileResourceManagerStillOwnsResources() {
        User manager = user(5L, UserRole.RESOURCE_MANAGER);
        when(userRepository.findById(5L)).thenReturn(Optional.of(manager));
        when(resourceRepository.countByManagedBy_Id(5L)).thenReturn(2L);

        assertThatThrownBy(() -> service.changeRole(5L, new ChangeRoleRequest(UserRole.FACULTY)))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage("User currently manages 2 resource(s). Reassign them before changing the user's role");
    }

    @Test
    void allowsRoleChangeAfterResourcesAreReassigned() {
        User manager = user(5L, UserRole.RESOURCE_MANAGER);
        when(userRepository.findById(5L)).thenReturn(Optional.of(manager));
        when(resourceRepository.countByManagedBy_Id(5L)).thenReturn(0L);

        var response = service.changeRole(5L, new ChangeRoleRequest(UserRole.FACULTY));

        assertThat(response.role()).isEqualTo(UserRole.FACULTY);
    }

    @Test
    void changesPasswordClearsBootstrapFlagAndRevokesAllSessions() {
        User current = user(99L, UserRole.ADMIN);
        current.setMustChangePassword(true);
        when(userRepository.findById(99L)).thenReturn(Optional.of(current));
        when(passwordEncoder.matches("old-password", "hash")).thenReturn(true);
        when(passwordEncoder.matches("new-password", "hash")).thenReturn(false);
        when(passwordEncoder.encode("new-password")).thenReturn("new-hash");

        service.changePassword(new com.bookingapp.user.dto.UserDtos.ChangePasswordRequest(
                "old-password", "new-password"));

        assertThat(current.getPasswordHash()).isEqualTo("new-hash");
        assertThat(current.isMustChangePassword()).isFalse();
        verify(refreshTokenRepository).revokeAllForUser(org.mockito.ArgumentMatchers.eq(99L), any());
    }

    @Test
    void rejectsIncorrectCurrentPassword() {
        User current = user(99L, UserRole.ADMIN);
        when(userRepository.findById(99L)).thenReturn(Optional.of(current));
        when(passwordEncoder.matches("wrong-password", "hash")).thenReturn(false);

        assertThatThrownBy(() -> service.changePassword(
                new com.bookingapp.user.dto.UserDtos.ChangePasswordRequest("wrong-password", "new-password")))
                .isInstanceOf(com.bookingapp.common.exception.AuthException.class)
                .hasMessage("Current password is incorrect");
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
