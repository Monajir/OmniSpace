package com.bookingapp.profile;

import com.bookingapp.user.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Profile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    /** Used for FACULTY/CR department-scope checks against Classroom.departmentOwned. */
    private String department;

    @Column(name = "student_id", unique = true)
    private String studentId;

    @Column(name = "faculty_id", unique = true)
    private String facultyId;

    private String designation;

    @Column(name = "contact_number")
    private String contactNumber;

    @Column(name = "academic_year")
    private String academicYear;

    private String program;

    @Column(length = 32)
    private String batch;

    @Column(length = 16)
    private String section;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
