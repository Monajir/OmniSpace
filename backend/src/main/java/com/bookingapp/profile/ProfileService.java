package com.bookingapp.profile;

import com.bookingapp.common.exception.ResourceNotFoundException;
import com.bookingapp.common.exception.UnauthorizedAccessException;
import com.bookingapp.common.util.SecurityUtils;
import com.bookingapp.profile.dto.ProfileDtos.AdminUpdateAcademicProfileRequest;
import com.bookingapp.profile.dto.ProfileDtos.ProfileResponse;
import com.bookingapp.profile.dto.ProfileDtos.UpdateMyProfileRequest;
import com.bookingapp.user.User;
import com.bookingapp.user.UserRepository;
import com.bookingapp.user.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProfileService {

    private final ProfileRepository profileRepository;
    private final UserRepository userRepository;

    // A first profile read lazily creates the user's blank profile, so this
    // transaction must remain writable for newly registered accounts.
    @Transactional
    public ProfileResponse getProfile(Long targetUserId) {
        assertCanView(targetUserId);
        return toResponse(getOrCreate(targetUserId));
    }

    @Transactional
    public ProfileResponse updateMyProfile(UpdateMyProfileRequest request) {
        Profile profile = getOrCreate(SecurityUtils.currentUserId());
        profile.setContactNumber(clean(request.contactNumber()));
        return toResponse(profile);
    }

    @Transactional
    public ProfileResponse updateAcademicProfile(Long targetUserId, AdminUpdateAcademicProfileRequest request) {
        if (!SecurityUtils.hasRole(UserRole.ADMIN)) {
            throw new UnauthorizedAccessException("Only ADMIN may edit institutional assignments");
        }
        Profile profile = getOrCreate(targetUserId);
        profile.setDepartment(clean(request.department()));
        profile.setStudentId(clean(request.studentId()));
        profile.setFacultyId(clean(request.facultyId()));
        profile.setDesignation(clean(request.designation()));
        profile.setAcademicYear(clean(request.academicYear()));
        profile.setProgram(clean(request.program()));
        profile.setBatch(clean(request.batch()));
        profile.setSection(clean(request.section()));
        return toResponse(profile);
    }

    /** Used internally by booking/routine services for department-scope checks. */
    @Transactional(readOnly = true)
    public Profile getRawProfile(Long userId) {
        return profileRepository.findByUser_Id(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No profile exists for user " + userId));
    }

    private Profile getOrCreate(Long userId) {
        return profileRepository.findByUser_Id(userId).orElseGet(() -> {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> ResourceNotFoundException.of("User", userId));
            Profile p = Profile.builder().user(user).build();
            return profileRepository.save(p);
        });
    }

    private void assertCanView(Long targetUserId) {
        Long callerId = SecurityUtils.currentUserId();
        UserRole callerRole = SecurityUtils.currentUserRole();

        if (callerRole == UserRole.ADMIN || callerId.equals(targetUserId)) {
            return;
        }
        if (callerRole == UserRole.FACULTY) {
            User target = userRepository.findById(targetUserId)
                    .orElseThrow(() -> ResourceNotFoundException.of("User", targetUserId));
            if (target.getRole() != UserRole.STUDENT && target.getRole() != UserRole.CR) {
                throw new UnauthorizedAccessException(
                        "FACULTY may only view student/CR profiles in their own department");
            }
            String callerDept = profileRepository.findByUser_Id(callerId)
                    .map(Profile::getDepartment).orElse(null);
            String targetDept = profileRepository.findByUser_Id(targetUserId)
                    .map(Profile::getDepartment).orElse(null);
            if (callerDept == null || !callerDept.equals(targetDept)) {
                throw new UnauthorizedAccessException(
                        "FACULTY may only view profiles within their own department");
            }
            return;
        }
        throw new UnauthorizedAccessException("Not permitted to view this profile");
    }

    private ProfileResponse toResponse(Profile p) {
        return new ProfileResponse(p.getId(), p.getUser().getId(), p.getDepartment(), p.getStudentId(),
                p.getFacultyId(), p.getDesignation(), p.getContactNumber(), p.getAcademicYear(),
                p.getProgram(), p.getBatch(), p.getSection(), p.getCreatedAt(), p.getUpdatedAt());
    }

    private String clean(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
