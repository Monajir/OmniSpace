package com.bookingapp.user;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.List;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);
    List<User> findAllByRoleOrderByDisplayNameAsc(UserRole role);
    List<User> findAllByOrderByDisplayNameAsc();
}
