package com.bookingapp.user;

import com.bookingapp.common.exception.ResourceNotFoundException;
import com.bookingapp.common.exception.InvalidRequestException;
import com.bookingapp.common.exception.AuthException;
import com.bookingapp.auth.RefreshTokenRepository;
import com.bookingapp.common.util.SecurityUtils;
import com.bookingapp.resource.ResourceRepository;
import com.bookingapp.user.dto.UserDtos.ChangeRoleRequest;
import com.bookingapp.user.dto.UserDtos.ChangePasswordRequest;
import com.bookingapp.user.dto.UserDtos.UpdateMeRequest;
import com.bookingapp.user.dto.UserDtos.UserResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final ResourceRepository resourceRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public UserResponse getMe() {
        User user = getById(SecurityUtils.currentUserId());
        return toResponse(user);
    }

    @Transactional(readOnly = true)
    public List<UserResponse> findAll(UserRole role) {
        List<User> users = role == null
                ? userRepository.findAllByOrderByDisplayNameAsc()
                : userRepository.findAllByRoleOrderByDisplayNameAsc(role);
        return users.stream().map(this::toResponse).toList();
    }

    @Transactional
    public UserResponse updateMe(UpdateMeRequest request) {
        User user = getById(SecurityUtils.currentUserId());
        user.setDisplayName(request.displayName());
        return toResponse(user);
    }

    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        User user = getById(SecurityUtils.currentUserId());
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new AuthException("Current password is incorrect");
        }
        if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
            throw new InvalidRequestException("New password must be different from the current password");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setMustChangePassword(false);
        refreshTokenRepository.revokeAllForUser(user.getId(), Instant.now());
    }

    /** ADMIN only — enforced at the controller layer via @PreAuthorize. */
    @Transactional
    public UserResponse changeRole(Long userId, ChangeRoleRequest request) {
        User user = getById(userId);
        if (user.getRole() == request.role()) {
            return toResponse(user);
        }
        if (userId.equals(SecurityUtils.currentUserId())) {
            throw new InvalidRequestException("Administrators cannot change their own role");
        }
        if (user.getRole() == UserRole.RESOURCE_MANAGER && request.role() != UserRole.RESOURCE_MANAGER) {
            long managedResourceCount = resourceRepository.countByManagedBy_Id(userId);
            if (managedResourceCount > 0) {
                throw new InvalidRequestException("User currently manages " + managedResourceCount
                        + " resource(s). Reassign them before changing the user's role");
            }
        }
        user.setRole(request.role());
        return toResponse(user);
    }

    User getById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("User", id));
    }

    private UserResponse toResponse(User user) {
        return new UserResponse(user.getId(), user.getEmail(), user.getDisplayName(),
                user.getRole(), user.isMustChangePassword(), user.getCreatedAt());
    }
}
