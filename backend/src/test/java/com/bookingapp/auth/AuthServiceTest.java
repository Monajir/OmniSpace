package com.bookingapp.auth;

import com.bookingapp.auth.dto.AuthDtos.LoginRequest;
import com.bookingapp.common.exception.AuthException;
import com.bookingapp.common.exception.RefreshConflictException;
import com.bookingapp.security.JwtTokenProvider;
import com.bookingapp.user.User;
import com.bookingapp.user.UserRepository;
import com.bookingapp.user.UserRole;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock UserRepository userRepository;
    @Mock RefreshTokenRepository refreshTokenRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock JwtTokenProvider jwtTokenProvider;
    @Mock HttpServletResponse response;

    private AuthService service;

    @BeforeEach
    void setUp() {
        service = new AuthService(userRepository, refreshTokenRepository, passwordEncoder, jwtTokenProvider);
        ReflectionTestUtils.setField(service, "refreshConcurrencyWindowSeconds", 5L);
        ReflectionTestUtils.setField(service, "refreshCookieName", "refresh_token");
        ReflectionTestUtils.setField(service, "refreshCookieSameSite", "Lax");
    }

    @Test
    void loginUsesCanonicalCaseInsensitiveEmail() {
        User user = User.builder().id(1L).email("leo@gmail.com").passwordHash("hash")
                .displayName("Leo").role(UserRole.STUDENT).build();
        when(userRepository.findByEmailIgnoreCase("leo@gmail.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("12345678", "hash")).thenReturn(false);

        assertThatThrownBy(() -> service.login(new LoginRequest("  LEO@GMAIL.COM  ", "12345678"), response))
                .isInstanceOf(AuthException.class);
        verify(userRepository).findByEmailIgnoreCase("leo@gmail.com");
    }

    @Test
    void recentParallelReuseReturnsConflictWithoutRevokingTheFamily() throws Exception {
        String raw = "same-browser-token";
        RefreshToken token = RefreshToken.builder().id(10L).userId(7L).tokenHash(hash(raw))
                .expiresAt(Instant.now().plusSeconds(60)).revokedAt(Instant.now())
                .replacedById(11L).build();
        when(refreshTokenRepository.findByTokenHashForUpdate(hash(raw))).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> service.refresh(raw, response))
                .isInstanceOf(RefreshConflictException.class);
        verify(refreshTokenRepository, never()).revokeAllForUser(anyLong(), any());
    }

    @Test
    void oldRotatedTokenReuseRevokesAllSessions() throws Exception {
        String raw = "stolen-old-token";
        RefreshToken token = RefreshToken.builder().id(10L).userId(7L).tokenHash(hash(raw))
                .expiresAt(Instant.now().plusSeconds(60)).revokedAt(Instant.now().minusSeconds(10))
                .replacedById(11L).build();
        when(refreshTokenRepository.findByTokenHashForUpdate(hash(raw))).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> service.refresh(raw, response)).isInstanceOf(AuthException.class);
        verify(refreshTokenRepository).revokeAllForUser(eq(7L), any());
    }

    private static String hash(String raw) throws Exception {
        byte[] digest = MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8));
        return Base64.getEncoder().encodeToString(digest);
    }
}
