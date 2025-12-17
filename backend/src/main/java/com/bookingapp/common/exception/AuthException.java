package com.bookingapp.common.exception;

/**
 * Thrown for authentication failures: bad credentials, expired/invalid/reused
 * refresh tokens, duplicate email on register, etc. Maps to HTTP 401.
 */
public class AuthException extends RuntimeException {
    public AuthException(String message) {
        super(message);
    }
}
