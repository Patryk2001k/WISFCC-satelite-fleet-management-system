package wisfcc_backend.dto;

public record UserRegisterRequestDTO(
        String username,
        String role,
        String clearance,
        String tempPassword
) {}