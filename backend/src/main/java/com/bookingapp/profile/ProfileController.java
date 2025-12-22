package com.bookingapp.profile;

import com.bookingapp.profile.dto.ProfileDtos.AdminUpdateAcademicProfileRequest;
import com.bookingapp.profile.dto.ProfileDtos.ProfileResponse;
import com.bookingapp.profile.dto.ProfileDtos.UpdateMyProfileRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;

    @GetMapping("/{id}/profile")
    public ProfileResponse getProfile(@PathVariable("id") Long userId) {
        return profileService.getProfile(userId);
    }

    @PutMapping("/me/profile")
    public ProfileResponse updateMyProfile(@Valid @RequestBody UpdateMyProfileRequest request) {
        return profileService.updateMyProfile(request);
    }

    @PutMapping("/{id}/profile/academic")
    @PreAuthorize("hasRole('ADMIN')")
    public ProfileResponse updateAcademicProfile(
            @PathVariable("id") Long userId,
            @Valid @RequestBody AdminUpdateAcademicProfileRequest request) {
        return profileService.updateAcademicProfile(userId, request);
    }
}
