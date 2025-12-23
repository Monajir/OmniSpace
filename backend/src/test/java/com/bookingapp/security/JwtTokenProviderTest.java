package com.bookingapp.security;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtTokenProviderTest {

    @Test
    void rejectsSecretsShorterThan256Bits() {
        assertThatThrownBy(() -> new JwtTokenProvider("too-short", 15))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("at least 32");
    }

    @Test
    void createsAndValidatesTokenWithStrongSecret() {
        JwtTokenProvider provider = new JwtTokenProvider(
                "test-only-secret-with-at-least-thirty-two-bytes", 15);
        String token = provider.createAccessToken(42L, "leo@example.com", "STUDENT");

        assertThat(provider.isValid(token)).isTrue();
        assertThat(provider.getUserId(token)).isEqualTo(42L);
        assertThat(provider.getRole(token)).isEqualTo("STUDENT");
    }
}
