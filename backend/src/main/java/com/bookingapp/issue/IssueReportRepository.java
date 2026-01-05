package com.bookingapp.issue;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

public interface IssueReportRepository extends JpaRepository<IssueReport, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM IssueReport i WHERE i.id = :id")
    Optional<IssueReport> findByIdForUpdate(@Param("id") Long id);

    List<IssueReport> findByResource_Id(Long resourceId);

    List<IssueReport> findByClassroom_Id(Long classroomId);

    List<IssueReport> findByResource_IdAndStatus(Long resourceId, IssueStatus status);

    List<IssueReport> findByClassroom_IdAndStatus(Long classroomId, IssueStatus status);

    long countByResource_IdAndStatusNotIn(Long resourceId, List<IssueStatus> statuses);

    long countByClassroom_IdAndStatusNotIn(Long classroomId, List<IssueStatus> statuses);
}
