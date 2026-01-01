package com.bookingapp.booking;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.time.Instant;
import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM Booking b WHERE b.id = :id")
    java.util.Optional<Booking> findByIdForUpdate(@Param("id") Long id);

    List<Booking> findByUser_Id(Long userId);

    List<Booking> findByUser_IdOrderByStartTimeDesc(Long userId);

    List<Booking> findByResource_Id(Long resourceId);

    List<Booking> findByResource_IdOrderByStartTimeDesc(Long resourceId);

    List<Booking> findByClassroom_Id(Long classroomId);

    List<Booking> findByClassroom_IdOrderByStartTimeDesc(Long classroomId);

    List<Booking> findAllByOrderByStartTimeDesc();

    List<Booking> findByStatusOrderByStartTimeAsc(BookingStatus status);

    @Query("""
           SELECT b FROM Booking b
           WHERE b.status = 'CONFIRMED'
             AND b.classroom IS NOT NULL
             AND b.targetProgram = :program
             AND b.targetBatch = :batch
             AND (b.targetSection = :section OR b.targetSection IS NULL)
           """)
    List<Booking> findConfirmedForCohort(@Param("program") String program,
                                          @Param("batch") String batch,
                                          @Param("section") String section);

    /**
     * Overlap check against existing CONFIRMED/PENDING_APPROVAL bookings for
     * either a resource or a classroom (exactly one of the two id params is
     * non-null, matching the caller's booking target).
     */
    @Query("""
           SELECT b FROM Booking b
           WHERE ((:resourceId IS NOT NULL AND b.resource.id = :resourceId)
                  OR (:classroomId IS NOT NULL AND b.classroom.id = :classroomId))
             AND b.status IN ('CONFIRMED', 'PENDING_APPROVAL')
             AND b.startTime < :requestedEnd
             AND b.endTime > :requestedStart
             AND (:excludeId IS NULL OR b.id <> :excludeId)
           """)
    List<Booking> findOverlapping(@Param("resourceId") Long resourceId,
                                   @Param("classroomId") Long classroomId,
                                   @Param("requestedStart") Instant requestedStart,
                                   @Param("requestedEnd") Instant requestedEnd,
                                   @Param("excludeId") Long excludeId);

    /** Used by the daily cleanup job to archive/complete past confirmed bookings. */
    List<Booking> findByStatusAndEndTimeBefore(BookingStatus status, Instant cutoff);

    /** Bookings within a window on a classroom, used by the availability endpoint. */
    @Query("""
           SELECT b FROM Booking b
           WHERE b.classroom.id = :classroomId
             AND b.status IN ('CONFIRMED', 'PENDING_APPROVAL')
             AND b.startTime < :to
             AND b.endTime > :from
           """)
    List<Booking> findWindowForClassroom(@Param("classroomId") Long classroomId,
                                          @Param("from") Instant from,
                                          @Param("to") Instant to);

    /** Privacy-safe resource availability is projected from these occupied windows. */
    @Query("""
           SELECT b FROM Booking b
           WHERE b.resource.id = :resourceId
             AND b.status IN ('CONFIRMED', 'PENDING_APPROVAL')
             AND b.startTime < :to
             AND b.endTime > :from
           ORDER BY b.startTime
           """)
    List<Booking> findWindowForResource(@Param("resourceId") Long resourceId,
                                         @Param("from") Instant from,
                                         @Param("to") Instant to);
}
