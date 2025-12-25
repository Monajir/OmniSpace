package com.bookingapp.classroom;

import com.bookingapp.classroom.dto.ClassroomDtos.WeeklyAvailabilityResponse;
import com.bookingapp.classroom.dto.ClassroomDtos.ClassroomResponse;
import com.bookingapp.classroom.dto.ClassroomDtos.CreateClassroomRequest;
import com.bookingapp.classroom.dto.ClassroomDtos.UpdateClassroomRequest;
import com.bookingapp.classroom.dto.ClassroomDtos.UpdateStatusRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/classrooms")
@RequiredArgsConstructor
public class ClassroomController {

    private final ClassroomService classroomService;

    @GetMapping
    public List<ClassroomResponse> findAll() {
        return classroomService.findAll();
    }

    @GetMapping("/{id}")
    public ClassroomResponse findById(@PathVariable Long id) {
        return classroomService.findById(id);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ClassroomResponse> create(@Valid @RequestBody CreateClassroomRequest request) {
        return ResponseEntity.ok(classroomService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ClassroomResponse update(@PathVariable Long id, @Valid @RequestBody UpdateClassroomRequest request) {
        return classroomService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        classroomService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('MAINTENANCE_STAFF', 'ADMIN')")
    public ClassroomResponse updateStatus(@PathVariable Long id, @Valid @RequestBody UpdateStatusRequest request) {
        return classroomService.updateStatus(id, request);
    }

    @GetMapping("/{id}/availability")
    public WeeklyAvailabilityResponse availability(
            @PathVariable Long id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart) {
        return classroomService.getAvailability(id, weekStart);
    }
}
