package wisfcc_backend.dto;

import java.time.Instant;

public record UserDTO(
        Long userId,
        String username,
        String role,
        String accountStatus,
        Instant lastLoginUtc
) {}