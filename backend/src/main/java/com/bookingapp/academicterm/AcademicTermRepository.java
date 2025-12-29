package com.bookingapp.academicterm;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AcademicTermRepository extends JpaRepository<AcademicTerm, Long> {

    Optional<AcademicTerm> findByAcademicYearAndSemesterIgnoreCase(String academicYear, String semester);

    @Query("""
           SELECT t FROM AcademicTerm t
           WHERE t.startDate <= :date AND t.endDate >= :date
           ORDER BY t.startDate DESC
           """)
    List<AcademicTerm> findContaining(@Param("date") LocalDate date);

    @Query("""
           SELECT COUNT(t) FROM AcademicTerm t
           WHERE t.startDate <= :endDate AND t.endDate >= :startDate
             AND (:excludeId IS NULL OR t.id <> :excludeId)
           """)
    long countDateOverlaps(@Param("startDate") LocalDate startDate,
                           @Param("endDate") LocalDate endDate,
                           @Param("excludeId") Long excludeId);

    @Query("""
           SELECT COUNT(r) FROM Routine r
           WHERE r.academicYear = :academicYear AND LOWER(r.semester) = LOWER(:semester)
           """)
    long countRoutinesForTerm(@Param("academicYear") String academicYear,
                              @Param("semester") String semester);
}
