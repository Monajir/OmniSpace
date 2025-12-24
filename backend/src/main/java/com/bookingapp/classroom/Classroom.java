package com.bookingapp.classroom;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "classrooms")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Classroom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "room_code", nullable = false, unique = true)
    private String roomCode;

    @Column(nullable = false)
    private String name;

    private String building;

    private Integer floor;

    private Integer capacity;

    @Column(name = "has_projector", nullable = false)
    @Builder.Default
    private boolean hasProjector = false;

    @Column(name = "has_whiteboard", nullable = false)
    @Builder.Default
    private boolean hasWhiteboard = false;

    @Column(name = "is_lab", nullable = false)
    @Builder.Default
    private boolean isLab = false;

    /** Compared against Profile.department for booking department-scope checks. */
    @Column(name = "department_owned")
    private String departmentOwned;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private ClassroomStatus status = ClassroomStatus.AVAILABLE;

    @Column(name = "status_managed_by_issue", nullable = false)
    @Builder.Default
    private boolean statusManagedByIssue = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
        if (status == null) status = ClassroomStatus.AVAILABLE;
    }
}
