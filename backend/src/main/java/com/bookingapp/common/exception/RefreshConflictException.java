package com.bookingapp.common.exception;

/**
 * A second browser context presented a token that another request rotated only
 * moments ago. The caller may retry with the newly propagated cookie without
 * treating the session family as compromised.
 */
public class RefreshConflictException extends RuntimeException {
    public RefreshConflictException(String message) {
        super(message);
    }
}
