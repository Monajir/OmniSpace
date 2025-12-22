package com.bookingapp.user;

import com.bookingapp.user.dto.UserDtos.ChangeRoleRequest;
import com.bookingapp.user.dto.UserDtos.ChangePasswordRequest;
import com.bookingapp.user.dto.UserDtos.UpdateMeRequest;
import com.bookingapp.user.dto.UserDtos.UserResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<UserResponse> findAll(@RequestParam(required = false) UserRole role) {
        return userService.findAll(role);
    }

    @GetMapping("/me")
    public UserResponse getMe() {
        return userService.getMe();
    }

    @PutMapping("/me")
    public UserResponse updateMe(@Valid @RequestBody UpdateMeRequest request) {
        return userService.updateMe(request);
    }

    @PutMapping("/me/password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        userService.changePassword(request);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse changeRole(@PathVariable Long id, @Valid @RequestBody ChangeRoleRequest request) {
        return userService.changeRole(id, request);
    }
}
