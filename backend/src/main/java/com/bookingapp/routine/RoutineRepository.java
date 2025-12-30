package com.bookingapp.routine;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalTime;
import java.util.List;

public interface RoutineRepository extends JpaRepository<Routine, Long> {

    List<Routine> findByClassroom_Id(Long classroomId);

    List<Routine> findByFaculty_Id(Long facultyId);

    @Query("""
           SELECT r FROM Routine r
           WHERE r.program = :program
             AND r.batch = :batch
             AND (r.section = :section OR r.section IS NULL)
             AND r.academicYear = :academicYear
             AND r.semester = :semester
           """)
    List<Routine> findForCohort(@Param("program") String program,
                                 @Param("batch") String batch,
                                 @Param("section") String section,
                                 @Param("academicYear") String academicYear,
                                 @Param("semester") String semester);

    /**
     * Fixed weekly-grid overlap check: does this classroom already have a
     * routine slot on the given day that overlaps the requested time window?
     * Used both when creating/editing a routine and when validating a
     * classroom booking against the routine grid. Terms are part of the
     * identity so an old semester cannot block the same slot in a new one.
     */
    @Query("""
           SELECT r FROM Routine r
           WHERE r.classroom.id = :classroomId
             AND r.dayOfWeek = :dayOfWeek
             AND r.startTime < :endTime
             AND r.endTime > :startTime
             AND r.academicYear = :academicYear
             AND r.semester = :semester
             AND (:excludeId IS NULL OR r.id <> :excludeId)
           """)
    List<Routine> findOverlapping(@Param("classroomId") Long classroomId,
                                   @Param("dayOfWeek") RoutineDayOfWeek dayOfWeek,
                                   @Param("startTime") LocalTime startTime,
                                   @Param("endTime") LocalTime endTime,
                                   @Param("academicYear") String academicYear,
                                   @Param("semester") String semester,
                                   @Param("excludeId") Long excludeId);

    /** Used by the semester-transition cleanup job. */
    List<Routine> findByAcademicYearNot(String currentAcademicYear);
}
