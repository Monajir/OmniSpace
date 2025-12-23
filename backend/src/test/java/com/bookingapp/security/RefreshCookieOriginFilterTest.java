package com.bookingapp.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RefreshCookieOriginFilterTest {

    private final RefreshCookieOriginFilter filter =
            new RefreshCookieOriginFilter("http://localhost:3000,http://localhost:8081");

    @Test
    void rejectsUntrustedBrowserOriginForRefresh() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/refresh");
        request.addHeader("Origin", "https://evil.example");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getContentAsString()).contains("Untrusted request origin");
    }

    @Test
    void allowsTrustedBrowserOriginForRefresh() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/refresh");
        request.addHeader("Origin", "http://localhost:3000");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    void rejectsWildcardConfiguration() {
        assertThatThrownBy(() -> new RefreshCookieOriginFilter("*"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("exact origins");
    }
}
