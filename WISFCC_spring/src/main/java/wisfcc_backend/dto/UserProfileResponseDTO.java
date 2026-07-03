package wisfcc_backend.dto;

public record UserProfileResponseDTO(
        String username,
        String role,
        String clearance,
        String joinedDate
) {}