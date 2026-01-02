package com.bookingapp.booking;

import com.bookingapp.booking.dto.BookingDtos.BookingResponse;
import com.bookingapp.booking.dto.BookingDtos.CreateBookingRequest;
import com.bookingapp.booking.dto.BookingDtos.RejectRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    @GetMapping("/mine")
    public List<BookingResponse> findMine() {
        return bookingService.findMine();
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('FACULTY', 'RESOURCE_MANAGER', 'ADMIN')")
    public List<BookingResponse> search(@RequestParam(required = false) Long resourceId,
                                         @RequestParam(required = false) Long classroomId) {
        return bookingService.search(resourceId, classroomId);
    }

    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('FACULTY', 'RESOURCE_MANAGER', 'ADMIN')")
    public List<BookingResponse> findPending() {
        return bookingService.findPending();
    }

    @PostMapping
    public ResponseEntity<BookingResponse> create(@Valid @RequestBody CreateBookingRequest request) {
        return ResponseEntity.ok(bookingService.create(request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancel(@PathVariable Long id) {
        bookingService.cancel(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('FACULTY', 'RESOURCE_MANAGER', 'ADMIN')")
    public BookingResponse approve(@PathVariable Long id) {
        return bookingService.approve(id);
    }

    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('FACULTY', 'RESOURCE_MANAGER', 'ADMIN')")
    public BookingResponse reject(@PathVariable Long id, @Valid @RequestBody RejectRequest request) {
        return bookingService.reject(id, request);
    }
}
