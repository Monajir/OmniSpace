package com.bookingapp.security;

import com.bookingapp.user.User;
import com.bookingapp.user.UserRole;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.assertj.core.api.Assertions.assertThat;

class MustChangePasswordFilterTest {

    private final MustChangePasswordFilter filter = new MustChangePasswordFilter();

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void blocksNormalApiForTemporaryPasswordAccount() throws Exception {
        authenticateTemporaryUser();
        MockHttpServletResponse response = apply("GET", "/api/classrooms");

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getContentAsString()).contains("Password change required");
    }

    @Test
    void allowsPasswordChangeEndpoint() throws Exception {
        authenticateTemporaryUser();
        MockHttpServletResponse response = apply("PUT", "/api/users/me/password");

        assertThat(response.getStatus()).isEqualTo(200);
    }

    private MockHttpServletResponse apply(String method, String path) throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(new MockHttpServletRequest(method, path), response, new MockFilterChain());
        return response;
    }

    private void authenticateTemporaryUser() {
        User user = User.builder().id(1L).email("admin@example.com").passwordHash("hash")
                .displayName("Admin").role(UserRole.ADMIN).mustChangePassword(true).build();
        CustomUserDetails details = new CustomUserDetails(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities()));
    }
}
