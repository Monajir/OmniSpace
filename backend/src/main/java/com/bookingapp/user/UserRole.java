package com.bookingapp.user;

/**
 * Single flat role per user — no scoped/time-bounded role assignments.
 * Ordered roughly by increasing privilege for readability only; Spring
 * Security authorities are checked by name, not ordinal.
 */
public enum UserRole {
    STUDENT,
    CR,
    FACULTY,
    RESOURCE_MANAGER,
    MAINTENANCE_STAFF,
    ADMIN
}
