package wisfcc_backend.entity;

import jakarta.persistence.*;
import lombok.*;
import wisfcc_backend.enums.UserRole;
import wisfcc_backend.enums.AccountStatus;
import java.time.Instant;

@Entity
@Table(name = "users")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class UserEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    private UserRole role;

    private String clearance;

    @Enumerated(EnumType.STRING)
    private AccountStatus accountStatus;

    @Builder.Default
    private Boolean showDebrisEnabled = false;
    
    @Builder.Default
    private Boolean audioAlertsEnabled = true;

    @Builder.Default
    private Boolean desktopNotificationsEnabled = false;

    private Instant lastLoginUtc;

    @Column(updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }
}