package com.bookingapp.resource;

import com.bookingapp.booking.BookingRepository;
import com.bookingapp.common.exception.InvalidRequestException;
import com.bookingapp.common.exception.ResourceNotFoundException;
import com.bookingapp.common.exception.UnauthorizedAccessException;
import com.bookingapp.common.util.SecurityUtils;
import com.bookingapp.resource.dto.ResourceDtos.CreateResourceRequest;
import com.bookingapp.resource.dto.ResourceDtos.BusyWindow;
import com.bookingapp.resource.dto.ResourceDtos.ResourceAvailabilityResponse;
import com.bookingapp.resource.dto.ResourceDtos.ResourceResponse;
import com.bookingapp.resource.dto.ResourceDtos.UpdateResourceRequest;
import com.bookingapp.resource.dto.ResourceDtos.UpdateStatusRequest;
import com.bookingapp.user.User;
import com.bookingapp.user.UserRepository;
import com.bookingapp.user.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ResourceService {

    private static final String CACHE = "resources";

    private final ResourceRepository resourceRepository;
    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;

    @Cacheable(cacheNames = CACHE, key = "'all'")
    @Transactional(readOnly = true)
    public List<ResourceResponse> findAll() {
        return resourceRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Cacheable(cacheNames = CACHE, key = "#id")
    @Transactional(readOnly = true)
    public ResourceResponse findById(Long id) {
        return toResponse(getEntity(id));
    }

    @Transactional(readOnly = true)
    public ResourceAvailabilityResponse getAvailability(Long id, Instant from, Instant to) {
        getEntity(id);
        if (from == null || to == null || !from.isBefore(to)) {
            throw new InvalidRequestException("from must be before to");
        }
        if (Duration.between(from, to).toDays() > 31) {
            throw new InvalidRequestException("Availability range may not exceed 31 days");
        }
        List<BusyWindow> busy = bookingRepository.findWindowForResource(id, from, to).stream()
                .map(booking -> new BusyWindow(booking.getStartTime(), booking.getEndTime()))
                .toList();
        return new ResourceAvailabilityResponse(id, from, to, busy);
    }

    @CacheEvict(cacheNames = CACHE, allEntries = true)
    @Transactional
    public ResourceResponse create(CreateResourceRequest request) {
        Resource resource = Resource.builder()
                .name(request.name())
                .category(request.category())
                .location(request.location())
                .capacity(request.capacity())
                .requiresApproval(Boolean.TRUE.equals(request.requiresApproval()))
                .managedBy(managerForRequest(request.managedByUserId()))
                .status(ResourceStatus.AVAILABLE)
                .build();
        return toResponse(resourceRepository.save(resource));
    }

    @CacheEvict(cacheNames = CACHE, allEntries = true)
    @Transactional
    public ResourceResponse update(Long id, UpdateResourceRequest request) {
        Resource resource = getEntity(id);
        assertManages(resource);
        resource.setName(request.name());
        resource.setCategory(request.category());
        resource.setLocation(request.location());
        resource.setCapacity(request.capacity());
        resource.setRequiresApproval(Boolean.TRUE.equals(request.requiresApproval()));
        resource.setManagedBy(managerForRequest(request.managedByUserId()));
        return toResponse(resource);
    }

    @CacheEvict(cacheNames = CACHE, allEntries = true)
    @Transactional
    public void delete(Long id) {
        Resource resource = getEntity(id);
        assertManages(resource);
        resourceRepository.delete(resource);
    }

    @CacheEvict(cacheNames = CACHE, allEntries = true)
    @Transactional
    public ResourceResponse updateStatus(Long id, UpdateStatusRequest request) {
        Resource resource = resourceRepository.findByIdForUpdate(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Resource", id));
        // RESOURCE_MANAGER must own the resource; MAINTENANCE_STAFF and ADMIN may act on any.
        if (SecurityUtils.hasRole(UserRole.RESOURCE_MANAGER)) {
            assertManages(resource);
        }
        if (request.status() == ResourceStatus.PENDING_INSPECTION) {
            throw new InvalidRequestException("PENDING_INSPECTION is controlled by the issue workflow");
        }
        resource.setStatus(request.status());
        resource.setStatusManagedByIssue(false);
        return toResponse(resource);
    }

    Resource getEntity(Long id) {
        return resourceRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Resource", id));
    }

    private void assertManages(Resource resource) {
        if (SecurityUtils.hasRole(UserRole.ADMIN)) {
            return;
        }
        Long callerId = SecurityUtils.currentUserId();
        if (resource.getManagedBy() == null || !resource.getManagedBy().getId().equals(callerId)) {
            throw new UnauthorizedAccessException("You do not manage this resource");
        }
    }

    private ResourceResponse toResponse(Resource r) {
        Long managerId = r.getManagedBy() != null ? r.getManagedBy().getId() : null;
        return new ResourceResponse(r.getId(), r.getName(), r.getCategory(), r.getLocation(),
                r.getCapacity(), r.getStatus(), r.isRequiresApproval(), managerId,
                r.getCreatedAt());
    }

    private User findManager(Long id) {
        if (id == null) return null;
        User manager = userRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("User", id));
        if (manager.getRole() != UserRole.RESOURCE_MANAGER) {
            throw new InvalidRequestException("Assigned user must have the RESOURCE_MANAGER role");
        }
        return manager;
    }

    private User managerForRequest(Long requestedManagerId) {
        if (SecurityUtils.hasRole(UserRole.RESOURCE_MANAGER)) {
            return findManager(SecurityUtils.currentUserId());
        }
        return findManager(requestedManagerId);
    }
}
