package wisfcc_backend.dto;

public record UserResponseDTO(
        String id, 
        String username,
        String role,
        String clearance,
        String status,
        String lastLogin 
) {}