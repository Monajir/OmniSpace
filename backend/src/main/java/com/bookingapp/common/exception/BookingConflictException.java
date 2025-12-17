package com.bookingapp.common.exception;

/**
 * Thrown when a requested booking overlaps with an existing confirmed/pending
 * booking, or with a fixed routine slot on a classroom. Maps to HTTP 409.
 */
public class BookingConflictException extends RuntimeException {
    public BookingConflictException(String message) {
        super(message);
    }
}
