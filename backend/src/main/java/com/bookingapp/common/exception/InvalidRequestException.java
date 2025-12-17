package com.bookingapp.common.exception;

/**
 * Thrown for semantic validation failures that aren't simple bean-validation
 * annotation failures (e.g. "exactly one of resourceId/classroomId must be
 * set", "start must be before end", booking duration too long, etc.).
 * Maps to HTTP 400.
 */
public class InvalidRequestException extends RuntimeException {
    public InvalidRequestException(String message) {
        super(message);
    }
}
