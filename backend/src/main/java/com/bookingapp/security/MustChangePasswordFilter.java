package com.bookingapp.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/** Restricts bootstrap accounts until their known initial password is replaced. */
@Component
public class MustChangePasswordFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof CustomUserDetails details
                && details.getUser().isMustChangePassword() && !isAllowedRecoveryRequest(request)) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("{\"status\":403,\"error\":\"Forbidden\","
                    + "\"message\":\"Password change required\"}");
            return;
        }
        filterChain.doFilter(request, response);
    }

    private boolean isAllowedRecoveryRequest(HttpServletRequest request) {
        String path = request.getRequestURI();
        String method = request.getMethod();
        return (path.equals("/api/users/me") && method.equalsIgnoreCase("GET"))
                || (path.equals("/api/users/me/password") && method.equalsIgnoreCase("PUT"))
                || path.equals("/api/auth/refresh")
                || path.equals("/api/auth/logout");
    }
}
