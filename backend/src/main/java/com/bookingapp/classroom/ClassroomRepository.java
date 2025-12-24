package com.bookingapp.classroom;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.util.Optional;

public interface ClassroomRepository extends JpaRepository<Classroom, Long> {
    boolean existsByRoomCodeIgnoreCase(String roomCode);

    /** Shared serialization point for bookings, routines, and status changes. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Classroom c WHERE c.id = :id")
    Optional<Classroom> findByIdForUpdate(@Param("id") Long id);
}
