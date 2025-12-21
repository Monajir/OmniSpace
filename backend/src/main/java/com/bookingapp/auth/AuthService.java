package com.bookingapp.auth;

import com.bookingapp.auth.dto.AuthDtos.AuthResponse;
import com.bookingapp.auth.dto.AuthDtos.LoginRequest;
import com.bookingapp.auth.dto.AuthDtos.RegisterRequest;
import com.bookingapp.auth.dto.AuthDtos.UserSummary;
import com.bookingapp.common.exception.AuthException;
import com.bookingapp.common.exception.RefreshConflictException;
import com.bookingapp.security.JwtTokenProvider;
import com.bookingapp.user.User;
import com.bookingapp.user.UserRepository;
import com.bookingapp.user.UserRole;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Locale;
import java.util.Optional;

/**
 * Handles authentication end to end: registration, login, refresh-token
 * rotation (with reuse/compromise detection), and logout.
 *
 * Access tokens are stateless JWTs returned in the response body.
 * Refresh tokens are opaque random strings; only their SHA-256 hash is
 * stored, and the raw value is set as an HttpOnly cookie — never returned
 * in a JSON body.
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    @Value("${app.jwt.access-token-ttl-minutes}")
    private long accessTokenTtlMinutes;

    @Value("${app.jwt.refresh-token-ttl-days}")
    private long refreshTokenTtlDays;

    @Value("${app.jwt.refresh-cookie-name}")
    private String refreshCookieName;

    @Value("${app.jwt.refresh-cookie-secure}")
    private boolean refreshCookieSecure;

    @Value("${app.jwt.refresh-concurrency-window-seconds}")
    private long refreshConcurrencyWindowSeconds;

    @Value("${app.jwt.refresh-cookie-same-site}")
    private String refreshCookieSameSite;

    @Transactional
    public AuthResponse register(RegisterRequest request, HttpServletResponse response) {
        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new AuthException("An account with this email already exists");
        }
        User user = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(request.password()))
                .displayName(request.displayName())
                .role(UserRole.STUDENT)
                .build();
        user = userRepository.save(user);
        return issueTokens(user, response);
    }

    @Transactional
    public AuthResponse login(LoginRequest request, HttpServletResponse response) {
        User user = userRepository.findByEmailIgnoreCase(normalizeEmail(request.email()))
                .orElseThrow(() -> new AuthException("Invalid email or password"));
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new AuthException("Invalid email or password");
        }
        return issueTokens(user, response);
    }

    /**
     * Rotation logic:
     *  1. Look up the presented refresh token by its hash.
     *  2. If it's already revoked -> reuse detected -> revoke ALL tokens for
     *     that user (compromise response) and reject the request.
     *  3. Otherwise revoke it, issue a new refresh token row pointing back
     *     via replacedById, and return a fresh access token.
     */
    @Transactional
    public AuthResponse refresh(String rawRefreshToken, HttpServletResponse response) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new AuthException("Missing refresh token");
        }
        String hash = hash(rawRefreshToken);
        RefreshToken existing = refreshTokenRepository.findByTokenHashForUpdate(hash)
                .orElseThrow(() -> new AuthException("Invalid refresh token"));

        if (existing.isRevoked()) {
            Instant now = Instant.now();
            if (existing.getReplacedById() != null
                    && existing.getRevokedAt() != null
                    && existing.getRevokedAt().isAfter(now.minusSeconds(refreshConcurrencyWindowSeconds))) {
                throw new RefreshConflictException(
                        "Refresh token was already rotated by another request; retry with the latest cookie");
            }
            // Reuse of an already-rotated token = compromise. Nuke every
            // active session for this user and force a fresh login.
            refreshTokenRepository.revokeAllForUser(existing.getUserId(), Instant.now());
            clearRefreshCookie(response);
            throw new AuthException("Refresh token reuse detected — all sessions revoked, please log in again");
        }
        if (existing.isExpired()) {
            throw new AuthException("Refresh token expired, please log in again");
        }

        User user = userRepository.findById(existing.getUserId())
                .orElseThrow(() -> new AuthException("User no longer exists"));

        existing.setRevokedAt(Instant.now());
        RefreshToken rotated = createRefreshTokenRow(user.getId());
        rotated = refreshTokenRepository.saveAndFlush(rotated);
        existing.setReplacedById(rotated.getId());
        refreshTokenRepository.save(existing);

        setRefreshCookie(response, rotated.rawValueForCookieOnly);
        String accessToken = jwtTokenProvider.createAccessToken(user.getId(), user.getEmail(), user.getRole().name());
        return new AuthResponse(accessToken, accessTokenTtlMinutes * 60, toSummary(user));
    }

    @Transactional
    public void logout(String rawRefreshToken, HttpServletResponse response) {
        if (rawRefreshToken != null && !rawRefreshToken.isBlank()) {
            String hash = hash(rawRefreshToken);
            refreshTokenRepository.findByTokenHashForUpdate(hash).ifPresent(token -> {
                token.setRevokedAt(Instant.now());
                refreshTokenRepository.save(token);
            });
        }
        clearRefreshCookie(response);
    }

    // ---------------------------------------------------------------------

    private AuthResponse issueTokens(User user, HttpServletResponse response) {
        RefreshToken token = createRefreshTokenRow(user.getId());
        refreshTokenRepository.save(token);
        setRefreshCookie(response, token.rawValueForCookieOnly);
        String accessToken = jwtTokenProvider.createAccessToken(user.getId(), user.getEmail(), user.getRole().name());
        return new AuthResponse(accessToken, accessTokenTtlMinutes * 60, toSummary(user));
    }

    private RefreshToken createRefreshTokenRow(Long userId) {
        String raw = generateOpaqueToken();
        RefreshToken token = RefreshToken.builder()
                .userId(userId)
                .tokenHash(hash(raw))
                .expiresAt(Instant.now().plus(refreshTokenTtlDays, ChronoUnit.DAYS))
                .build();
        token.rawValueForCookieOnly = raw;
        return token;
    }

    private void setRefreshCookie(HttpServletResponse response, String rawValue) {
        Cookie cookie = new Cookie(refreshCookieName, rawValue);
        cookie.setHttpOnly(true);
        cookie.setSecure(refreshCookieSecure);
        cookie.setPath("/api/auth");
        cookie.setAttribute("SameSite", validatedSameSite());
        cookie.setMaxAge((int) (refreshTokenTtlDays * 24 * 60 * 60));
        response.addCookie(cookie);
    }

    private void clearRefreshCookie(HttpServletResponse response) {
        Cookie cookie = new Cookie(refreshCookieName, "");
        cookie.setHttpOnly(true);
        cookie.setSecure(refreshCookieSecure);
        cookie.setPath("/api/auth");
        cookie.setAttribute("SameSite", validatedSameSite());
        cookie.setMaxAge(0);
        response.addCookie(cookie);
    }

    private static String generateOpaqueToken() {
        byte[] bytes = new byte[64];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String hash(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hashed);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    private String validatedSameSite() {
        String value = refreshCookieSameSite == null ? "Lax" : refreshCookieSameSite.trim();
        if (!value.equalsIgnoreCase("Lax") && !value.equalsIgnoreCase("Strict")) {
            throw new IllegalStateException(
                    "REFRESH_COOKIE_SAME_SITE must be Lax or Strict; cross-site cookies require explicit CSRF protection");
        }
        return value;
    }

    private UserSummary toSummary(User user) {
        return new UserSummary(user.getId(), user.getEmail(), user.getDisplayName(), user.getRole(),
                user.isMustChangePassword());
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
