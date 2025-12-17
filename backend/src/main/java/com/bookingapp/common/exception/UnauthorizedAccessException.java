package com.bookingapp.common.exception;

/**
 * Thrown when an authenticated user is not permitted to perform an action
 * (role check, ownership check, or department-scope check failure).
 * Maps to HTTP 403.
 */
public class UnauthorizedAccessException extends RuntimeException {
    public UnauthorizedAccessException(String message) {
        super(message);
    }
}
