package wisfcc_backend.dto;

public record PasswordChangeRequestDTO(
        String oldPassword,
        String newPassword
) {}