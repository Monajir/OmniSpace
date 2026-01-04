package com.bookingapp.scheduler;

import com.bookingapp.routine.Routine;
import com.bookingapp.routine.RoutineRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Semester-boundary cleanup: non-recurring routines tagged with an
 * academic_year other than the currently configured one are removed, since
 * they belong to a past semester and would otherwise keep occupying the
 * classroom's weekly grid in overlap checks. Recurring routines are left
 * alone — an admin/faculty member re-confirms or edits them each semester
 * via the normal PUT/DELETE endpoints, this job only clears out the
 * one-off, expired kind automatically.
 *
 * "Current" academic year/semester is a configured value (app.academic.*)
 * rather than derived, since the spec doesn't define a semester-calendar
 * table — wire this to an admin-editable setting if you want it dynamic.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RoutineSchedulerService {

    private final RoutineRepository routineRepository;

    @Value("${app.academic.current-academic-year}")
    private String currentAcademicYear;

    /** Runs weekly, Monday 03:00 server time — comfortably off booking-hours. */
    @Scheduled(cron = "0 0 3 * * MON")
    @Transactional
    public void cleanupExpiredRoutines() {
        List<Routine> expired = routineRepository.findByAcademicYearNot(currentAcademicYear).stream()
                .filter(r -> !r.isRecurring())
                .toList();
        if (!expired.isEmpty()) {
            routineRepository.deleteAll(expired);
            log.info("RoutineSchedulerService: removed {} expired non-recurring routines "
                    + "(current academic year = {})", expired.size(), currentAcademicYear);
        }
    }
}
