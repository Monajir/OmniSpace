package com.bookingapp.auth;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "refresh_tokens")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** SHA-256 hash of the opaque token value — the raw value is never persisted. */
    @Column(name = "token_hash", nullable = false)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "replaced_by_id")
    private Long replacedById;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /**
     * Holds the raw (unhashed) token value transiently, in-memory only, so
     * the service layer can set it as the HttpOnly cookie right after
     * creation. Never persisted — only tokenHash is written to the DB.
     */
    @Transient
    public String rawValueForCookieOnly;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }

    @Transient
    public boolean isRevoked() {
        return revokedAt != null;
    }

    @Transient
    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }
}
