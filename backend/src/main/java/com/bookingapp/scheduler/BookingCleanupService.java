package com.bookingapp.scheduler;

import com.bookingapp.booking.Booking;
import com.bookingapp.booking.BookingRepository;
import com.bookingapp.booking.BookingStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * Daily job: any CONFIRMED booking whose end_time has already passed is
 * marked COMPLETED. This is the "archive" step referenced in the spec —
 * we don't move rows to a separate table (no such table was specified),
 * just flip status so they drop out of active/overlap-check queries.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BookingCleanupService {

    private final BookingRepository bookingRepository;

    /** Runs once a day at 02:00 server time. */
    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void archiveCompletedBookings() {
        List<Booking> toComplete = bookingRepository.findByStatusAndEndTimeBefore(
                BookingStatus.CONFIRMED, Instant.now());
        for (Booking booking : toComplete) {
            booking.setStatus(BookingStatus.COMPLETED);
        }
        if (!toComplete.isEmpty()) {
            log.info("BookingCleanupService: marked {} bookings COMPLETED", toComplete.size());
        }
    }
}
