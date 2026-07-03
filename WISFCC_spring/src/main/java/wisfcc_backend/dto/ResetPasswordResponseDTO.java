package wisfcc_backend.dto;

public record ResetPasswordResponseDTO(
        String message,
        String temporaryPassword
) {}