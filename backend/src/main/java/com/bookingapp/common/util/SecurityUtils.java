package com.bookingapp.common.util;

import com.bookingapp.common.exception.AuthException;
import com.bookingapp.security.CustomUserDetails;
import com.bookingapp.user.UserRole;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/** Small helper for pulling the authenticated user off the SecurityContext. */
public final class SecurityUtils {

    private SecurityUtils() {}

    public static CustomUserDetails currentUserDetails() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof CustomUserDetails details)) {
            throw new AuthException("No authenticated user in context");
        }
        return details;
    }

    public static Long currentUserId() {
        return currentUserDetails().getId();
    }

    public static UserRole currentUserRole() {
        return currentUserDetails().getUser().getRole();
    }

    public static boolean hasRole(UserRole role) {
        return currentUserRole() == role;
    }

    public static boolean hasAnyRole(UserRole... roles) {
        UserRole current = currentUserRole();
        for (UserRole r : roles) {
            if (r == current) return true;
        }
        return false;
    }
}
