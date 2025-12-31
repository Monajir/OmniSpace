package com.bookingapp.routine;

import com.bookingapp.routine.dto.RoutineDtos.CreateRoutineRequest;
import com.bookingapp.routine.dto.RoutineDtos.RoutineResponse;
import com.bookingapp.routine.dto.RoutineDtos.PersonalScheduleResponse;
import com.bookingapp.routine.dto.RoutineDtos.UpdateRoutineRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/routines")
@RequiredArgsConstructor
public class RoutineController {

    private final RoutineService routineService;

    @GetMapping
    public List<RoutineResponse> search(@RequestParam(required = false) Long classroomId,
                                         @RequestParam(required = false) Long facultyId,
                                         @RequestParam(required = false) String department,
                                         @RequestParam(required = false) String program) {
        return routineService.search(classroomId, facultyId, department, program);
    }

    @GetMapping("/mine")
    public PersonalScheduleResponse findMine() {
        return routineService.findMine();
    }

    @GetMapping("/{id}")
    public RoutineResponse findById(@PathVariable Long id) {
        return routineService.findById(id);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('FACULTY', 'ADMIN')")
    public ResponseEntity<RoutineResponse> create(@Valid @RequestBody CreateRoutineRequest request) {
        return ResponseEntity.ok(routineService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('FACULTY', 'ADMIN')")
    public RoutineResponse update(@PathVariable Long id, @Valid @RequestBody UpdateRoutineRequest request) {
        return routineService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('FACULTY', 'ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        routineService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
