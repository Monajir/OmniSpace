package com.bookingapp.academicterm;

import com.bookingapp.academicterm.dto.AcademicTermDtos.AcademicTermResponse;
import com.bookingapp.academicterm.dto.AcademicTermDtos.SaveAcademicTermRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/academic-terms")
@RequiredArgsConstructor
public class AcademicTermController {

    private final AcademicTermService academicTermService;

    @GetMapping
    public List<AcademicTermResponse> findAll() {
        return academicTermService.findAll();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AcademicTermResponse> create(
            @Valid @RequestBody SaveAcademicTermRequest request) {
        return ResponseEntity.ok(academicTermService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public AcademicTermResponse update(@PathVariable Long id,
                                       @Valid @RequestBody SaveAcademicTermRequest request) {
        return academicTermService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        academicTermService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
