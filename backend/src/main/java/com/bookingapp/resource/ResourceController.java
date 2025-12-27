package com.bookingapp.resource;

import com.bookingapp.resource.dto.ResourceDtos.CreateResourceRequest;
import com.bookingapp.resource.dto.ResourceDtos.ResourceAvailabilityResponse;
import com.bookingapp.resource.dto.ResourceDtos.ResourceResponse;
import com.bookingapp.resource.dto.ResourceDtos.UpdateResourceRequest;
import com.bookingapp.resource.dto.ResourceDtos.UpdateStatusRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.time.Instant;

@RestController
@RequestMapping("/api/resources")
@RequiredArgsConstructor
public class ResourceController {

    private final ResourceService resourceService;

    @GetMapping
    public List<ResourceResponse> findAll() {
        return resourceService.findAll();
    }

    @GetMapping("/{id}")
    public ResourceResponse findById(@PathVariable Long id) {
        return resourceService.findById(id);
    }

    @GetMapping("/{id}/availability")
    public ResourceAvailabilityResponse availability(
            @PathVariable Long id,
            @RequestParam Instant from,
            @RequestParam Instant to) {
        return resourceService.getAvailability(id, from, to);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('RESOURCE_MANAGER', 'ADMIN')")
    public ResponseEntity<ResourceResponse> create(@Valid @RequestBody CreateResourceRequest request) {
        return ResponseEntity.ok(resourceService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('RESOURCE_MANAGER', 'ADMIN')")
    public ResourceResponse update(@PathVariable Long id, @Valid @RequestBody UpdateResourceRequest request) {
        return resourceService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('RESOURCE_MANAGER', 'ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        resourceService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('RESOURCE_MANAGER', 'MAINTENANCE_STAFF', 'ADMIN')")
    public ResourceResponse updateStatus(@PathVariable Long id, @Valid @RequestBody UpdateStatusRequest request) {
        return resourceService.updateStatus(id, request);
    }
}
